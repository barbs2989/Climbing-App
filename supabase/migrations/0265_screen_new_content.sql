-- New content is SCREENED before other climbers see it (phase 3 of docs/SAFETY-AND-MODERATION-PLAN.md).
--
-- App Review 1.2 asks for "a method for filtering objectionable material from being posted". Until
-- now the only filter was a 17-word list applied, client-side, to a username. Two layers:
--
--   1. THE FLOOR -- runs inside the INSERT, so no client can skip it. An editable list of terms
--      (screening_terms; admin-only) is matched with word boundaries against the text of every new
--      message, crew-chat message, group post and event, comment, trip report, group, topo and list.
--      A match lands the row as 'held' (0263's moderation): its author sees it marked "hidden while
--      ClimbMatch Safety reviews it", nobody else sees it, and the review queue gets a report filed by
--      "Automatic screening" with a copy of the text. Deliberately a SHORT list of unambiguous terms
--      -- a long one would hold "crux" beta and "this pitch is a killer" and teach climbers to ignore it.
--   2. THE MODEL -- after the insert commits, pg_net asks the screen-content edge function to classify
--      it (Claude Haiku 5.5 for text, a moderation model for images). It can only HOLD content and
--      queue it for a person; it never deletes and never bans. It runs only once ANTHROPIC_API_KEY is
--      set and app_settings.screen_hook_url points at the function; until then it is inert and the
--      floor is the whole filter. pg_net failing must never fail the post, so every call is wrapped.
--
-- A person decides everything that matters: removal, restore, suspension. Screening only holds.

-- ---------------------------------------------------------------------------------------------
-- 0. pg_net, if this database has it (production does; a local PGlite replay does not, and the
--    trigger below degrades to the floor alone there).
-- ---------------------------------------------------------------------------------------------
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net is not available here; model screening will be skipped: %', sqlerrm;
end $$;

-- Settings that differ per environment and must NOT be baked into a replayed migration (a preview
-- branch must not call production's function). Admin-readable; written by hand with the SQL editor.
create table if not exists app_settings (
  key   text primary key,
  value text not null
);
alter table app_settings enable row level security;
drop policy if exists "admins read app settings" on app_settings;
create policy "admins read app settings" on app_settings for select using (is_admin(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 1. The floor.
-- ---------------------------------------------------------------------------------------------
create table if not exists screening_terms (
  term     text primary key check (term = lower(term) and length(term) between 2 and 60),
  category text not null check (category in ('hate', 'sexual', 'threat', 'self_harm', 'spam'))
);
alter table screening_terms enable row level security;
drop policy if exists "admins manage screening terms" on screening_terms;
create policy "admins manage screening terms" on screening_terms for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- A starting list: unambiguous slurs, explicit sexual solicitation, and direct self-harm incitement.
-- Phrases match as phrases. Nothing here is a word a climber would use about a route.
insert into screening_terms (term, category) values
  ('nigger', 'hate'), ('niggers', 'hate'), ('faggot', 'hate'), ('faggots', 'hate'), ('fag', 'hate'),
  ('kike', 'hate'), ('kikes', 'hate'), ('spic', 'hate'), ('spics', 'hate'), ('chink', 'hate'),
  ('chinks', 'hate'), ('wetback', 'hate'), ('tranny', 'hate'), ('trannies', 'hate'), ('raghead', 'hate'),
  ('gook', 'hate'), ('retard', 'hate'), ('retards', 'hate'),
  ('send nudes', 'sexual'), ('nudes', 'sexual'), ('dick pic', 'sexual'), ('blowjob', 'sexual'),
  ('pussy', 'sexual'), ('cumshot', 'sexual'), ('onlyfans', 'spam'),
  ('kill yourself', 'self_harm'), ('kys', 'self_harm'), ('go die', 'threat'),
  ('i will kill you', 'threat'), ('i''ll kill you', 'threat'), ('rape you', 'threat')
on conflict (term) do nothing;

-- True when `t` contains a screening term as a whole word or phrase. SECURITY DEFINER because the
-- author performing the insert cannot read the (admin-only) list.
create or replace function screening_match(t text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select st.category from screening_terms st
   where t is not null
     and lower(t) ~ ('(^|[^a-z0-9])' || regexp_replace(st.term, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '($|[^a-z0-9])')
   order by case st.category when 'threat' then 0 when 'self_harm' then 1 when 'hate' then 2 when 'sexual' then 3 else 4 end
   limit 1;
$$;
revoke all on function screening_match(text) from public, anon, authenticated;

-- The words of a row, per table, for the floor and for the queue's snapshot.
create or replace function screening_text(p_kind text, r jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'message'      then r->>'body'
    when 'crew_message' then r->>'body'
    when 'group_post'   then r->>'body'
    when 'group_event'  then concat_ws(E'\n', r->>'title', r->>'descr', r->>'location')
    when 'comment'      then r->>'text'
    when 'trip_report'  then concat_ws(E'\n', r->>'notes', r->>'beta', r->>'gear_beta', r->>'road_note', r->>'outcome_note', r->>'sun_note')
    when 'group'        then concat_ws(E'\n', r->>'name', r->>'blurb', r->>'location')
    when 'topo'         then concat_ws(E'\n', r->>'alt', r->>'photographer')
    when 'list'         then concat_ws(E'\n', r->>'name', r->>'description')
  end;
$$;

-- Does this write need screening? Every INSERT; an UPDATE only when the words changed (post benign,
-- then edit -- the obvious way round a filter that only looks at inserts). A PRIVATE trip report is
-- never screened: nobody else can read it, and queueing it would hand a reviewer notes that were
-- written for no one; it is screened the moment it stops being private.
create or replace function screen_should_run(p_kind text, p_op text, o jsonb, n jsonb) returns boolean
language sql immutable as $$
  select case
    when p_kind = 'trip_report' and coalesce(n->>'trip_report_visibility', 'crew') = 'private' then false
    when p_op = 'INSERT' then true
    else screening_text(p_kind, n) is distinct from screening_text(p_kind, o)
         or (p_kind = 'trip_report' and coalesce(o->>'trip_report_visibility', 'crew') = 'private')
  end;
$$;

-- BEFORE INSERT: hold on a floor match. Named "*_screen_floor" so it fires AFTER
-- "*_guard_moderation" (triggers fire in name order), which has already forced 'visible'.
create or replace function screen_floor() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.moderation = 'visible'
     and screen_should_run(tg_argv[0], tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new))
     and screening_match(screening_text(tg_argv[0], to_jsonb(new))) is not null then
    new.moderation := 'held';
  end if;
  return new;
end;
$$;

-- AFTER INSERT OR UPDATE: a new floor hold gets its queue entry; anything else is handed to the model, if wired.
create or replace function screen_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_kind   text := tg_argv[0];
  v_author uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_text   text := screening_text(tg_argv[0], to_jsonb(new));
  v_cat    text;
  v_url    text;
begin
  if not screen_should_run(v_kind, tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new)) then
    return null;
  end if;
  if new.moderation = 'held' and (tg_op = 'INSERT' or old.moderation = 'visible') then
    v_cat := screening_match(v_text);
    insert into user_reports (reporter, reporter_label, reported_id, reported_name, reason, detail, status,
                              target_kind, target_id, snapshot, snapshot_at)
    values (null, 'Automatic screening', v_author::text,
            (select case when pr.show_name and coalesce(pr.name, '') <> '' then pr.name
                         when coalesce(pr.username, '') <> '' then '@' || pr.username else 'A climber' end
               from profiles pr where pr.id = v_author),
            'Automatic screening: ' || coalesce(v_cat, 'flagged term'), 'Held before anyone else saw it.', 'open',
            v_kind, new.id::text, left(v_text, 8000), now());
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (null, 'auto_hold', v_kind, new.id::text, v_author, 'screening term: ' || coalesce(v_cat, '?'));
    return null;
  end if;
  select value into v_url from app_settings where key = 'screen_hook_url';
  if v_url is not null and new.moderation = 'visible' then
    begin
      perform net.http_post(url := v_url,
                            body := jsonb_build_object('kind', v_kind, 'id', new.id),
                            headers := '{"Content-Type": "application/json"}'::jsonb);
    exception when others then
      -- Screening must never cost a climber their post.
      raise notice 'screen hook skipped: %', sqlerrm;
    end;
  end if;
  return null;
end;
$$;

drop trigger if exists messages_screen_floor on messages;
create trigger messages_screen_floor before insert or update on messages for each row execute function screen_floor('message');
drop trigger if exists messages_screen_after on messages;
create trigger messages_screen_after after insert or update on messages for each row execute function screen_after_insert('message', 'sender_id');

drop trigger if exists crews_messages_screen_floor on crews_messages;
create trigger crews_messages_screen_floor before insert or update on crews_messages for each row execute function screen_floor('crew_message');
drop trigger if exists crews_messages_screen_after on crews_messages;
create trigger crews_messages_screen_after after insert or update on crews_messages for each row execute function screen_after_insert('crew_message', 'user_id');

drop trigger if exists group_posts_screen_floor on group_posts;
create trigger group_posts_screen_floor before insert or update on group_posts for each row execute function screen_floor('group_post');
drop trigger if exists group_posts_screen_after on group_posts;
create trigger group_posts_screen_after after insert or update on group_posts for each row execute function screen_after_insert('group_post', 'author');

drop trigger if exists group_events_screen_floor on group_events;
create trigger group_events_screen_floor before insert or update on group_events for each row execute function screen_floor('group_event');
drop trigger if exists group_events_screen_after on group_events;
create trigger group_events_screen_after after insert or update on group_events for each row execute function screen_after_insert('group_event', 'host');

drop trigger if exists comments_screen_floor on comments;
create trigger comments_screen_floor before insert or update on comments for each row execute function screen_floor('comment');
drop trigger if exists comments_screen_after on comments;
create trigger comments_screen_after after insert or update on comments for each row execute function screen_after_insert('comment', 'user_id');

drop trigger if exists climb_logs_screen_floor on climb_logs;
create trigger climb_logs_screen_floor before insert or update on climb_logs for each row execute function screen_floor('trip_report');
drop trigger if exists climb_logs_screen_after on climb_logs;
create trigger climb_logs_screen_after after insert or update on climb_logs for each row execute function screen_after_insert('trip_report', 'user_id');

drop trigger if exists groups_screen_floor on groups;
create trigger groups_screen_floor before insert or update on groups for each row execute function screen_floor('group');
drop trigger if exists groups_screen_after on groups;
create trigger groups_screen_after after insert or update on groups for each row execute function screen_after_insert('group', 'created_by');

drop trigger if exists topos_screen_floor on topos;
create trigger topos_screen_floor before insert or update on topos for each row execute function screen_floor('topo');
drop trigger if exists topos_screen_after on topos;
create trigger topos_screen_after after insert or update on topos for each row execute function screen_after_insert('topo', 'created_by');

drop trigger if exists user_lists_screen_floor on user_lists;
create trigger user_lists_screen_floor before insert or update on user_lists for each row execute function screen_floor('list');
drop trigger if exists user_lists_screen_after on user_lists;
create trigger user_lists_screen_after after insert or update on user_lists for each row execute function screen_after_insert('list', 'user_id');

-- ---------------------------------------------------------------------------------------------
-- 2. What the model may do: HOLD and queue. Called only by screen-content with the service role.
-- ---------------------------------------------------------------------------------------------
create or replace function screening_hold(p_kind text, p_id text, p_category text, p_reason text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid; v_text text; v_row jsonb;
begin
  v_row := case p_kind
    when 'message'      then (select to_jsonb(x) from messages x       where id::text = p_id and moderation = 'visible')
    when 'crew_message' then (select to_jsonb(x) from crews_messages x where id::text = p_id and moderation = 'visible')
    when 'group_post'   then (select to_jsonb(x) from group_posts x    where id::text = p_id and moderation = 'visible')
    when 'group_event'  then (select to_jsonb(x) from group_events x   where id::text = p_id and moderation = 'visible')
    when 'comment'      then (select to_jsonb(x) from comments x       where id::text = p_id and moderation = 'visible')
    when 'trip_report'  then (select to_jsonb(x) from climb_logs x     where id::text = p_id and moderation = 'visible')
    when 'group'        then (select to_jsonb(x) from groups x         where id::text = p_id and moderation = 'visible')
    when 'topo'         then (select to_jsonb(x) from topos x          where id::text = p_id and moderation = 'visible')
    when 'list'         then (select to_jsonb(x) from user_lists x     where id::text = p_id and moderation = 'visible')
  end;
  if v_row is null then return false; end if;     -- gone, or already held/removed
  v_text := screening_text(p_kind, v_row);
  v_owner := _set_content_moderation(p_kind, p_id, 'held');
  insert into user_reports (reporter, reporter_label, reported_id, reported_name, reason, detail, status,
                            target_kind, target_id, snapshot, snapshot_media, snapshot_at)
  values (null, 'Automatic screening', v_owner::text,
          (select case when pr.show_name and coalesce(pr.name, '') <> '' then pr.name
                       when coalesce(pr.username, '') <> '' then '@' || pr.username else 'A climber' end
             from profiles pr where pr.id = v_owner),
          'Automatic screening: ' || left(coalesce(p_category, 'flagged'), 60),
          nullif(left(coalesce(p_reason, ''), 500), ''), 'open',
          p_kind, p_id, left(v_text, 8000),
          case when p_kind = 'message' and coalesce(v_row->>'image_url', '') <> '' then jsonb_build_array(v_row->>'image_url')
               when p_kind in ('group_post', 'trip_report') then v_row->'photos' else null end,
          now());
  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (null, 'auto_hold', p_kind, p_id, v_owner, 'model: ' || left(coalesce(p_category, '?'), 60));
  return true;
end;
$$;
revoke all on function screening_hold(text, text, text, text) from public, anon, authenticated;
grant execute on function screening_hold(text, text, text, text) to service_role;

-- Confirm:
--   node scripts/oneoff/probe-screen-new-content.mjs     (real accounts; must end 0 failed)
--   select value from app_settings where key = 'screen_hook_url';   -- set by hand in production
