-- Route quality control, part 3 of 3: what the owner does with a held edit, a flag and a
-- contributor's standing — and how the climber is told.
--
-- Every function here is admin-only unless stated, re-checks is_admin() in SQL (the client gate is
-- cosmetic, as 0127's header says), writes moderation_actions so there is ONE ledger, and tells the
-- climber through user_notices (0307). Refusals are plain English with errcode P0001 so the queue
-- can show them verbatim.
--
-- THE STRIKE LADDER (owner, 2026-10-15): a strike is an OWNER REJECTION, never a flag by another
-- climber. 1st strike -> 'warned' and a notice with the reason; 3rd -> 'restricted' for 90 days
-- (no field edits; flags still allowed); 5th -> 'banned' from contributing (no edits, no flags);
-- an appeal of kind 'contributing' reaches decide_appeal, and a reversal resets the standing.
--
-- apply_agreed_grade (0210) is REWRITTEN: a grade now reaches routes.grade when the owner approves
-- it, not when three climbers agree on insert. The picker-only and scale-per-discipline rules stay.

-- ---------------------------------------------------------------------------------------------
-- 0. Helpers: a notice, and a contributor id as uuid (contributions.contributor is text; 'anon'
--    rows predate 0165 and get no notice and no strike).
-- ---------------------------------------------------------------------------------------------
create or replace function _contributor_uuid(p text) returns uuid
language sql immutable set search_path = public, pg_temp as $$
  select case when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then p::uuid end;
$$;
revoke all on function _contributor_uuid(text) from public, anon, authenticated;

create or replace function _notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link jsonb default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_user is null then return; end if;
  insert into user_notices (user_id, kind, title, body, link)
  values (p_user, p_kind, left(p_title, 200), left(p_body, 2000), p_link);
end;
$$;
revoke all on function _notify(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 1. The grade write-back, now on approval.
-- ---------------------------------------------------------------------------------------------
create or replace function public.apply_agreed_grade(p_route_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record; raw text; conv record; allowed text[];
begin
  select id, discipline, grade into r from routes where id = p_route_id;
  if not found then return; end if;

  allowed := case r.discipline
    when 'sport' then array['yds'] when 'trad' then array['yds'] when 'toprope' then array['yds']
    when 'bouldering' then array['v'] when 'ice' then array['wi', 'yds']
    when 'mixed' then array['m', 'yds'] when 'aid' then array['aid', 'yds']
    when 'scrambling' then array['class'] when 'hiking' then array['class']
    else array[]::text[] end;
  if cardinality(allowed) = 0 then return; end if;

  -- The most recently APPROVED grade, as the owner approved it.
  select btrim(coalesce(c.applied_value, c.value) #>> '{}') into raw
    from contributions c
   where c.route_id = p_route_id and c.kind = 'field' and c.field = 'grade' and c.status = 'approved'
     and jsonb_typeof(coalesce(c.applied_value, c.value)) = 'string'
   order by c.reviewed_at desc nulls last, c.created_at desc
   limit 1;
  if raw is null or raw = '' then return; end if;

  select * into conv from picker_grade_num(raw);
  if conv.sys is null or conv.num is null or not (conv.sys = any (allowed)) then return; end if;
  if r.grade is not distinct from raw then return; end if;

  update routes set
    grade = raw, grade_system = conv.sys, grade_num = conv.num,
    ice_grade_num   = case when conv.sys = 'wi'  then conv.num else ice_grade_num end,
    mixed_grade_num = case when conv.sys = 'm'   then conv.num else mixed_grade_num end,
    aid_grade_num   = case when conv.sys = 'aid' then conv.num else aid_grade_num end
  where id = p_route_id;
end;
$$;
revoke all on function public.apply_agreed_grade(text) from public, anon, authenticated;

create or replace function public.trg_apply_agreed_grade()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and new.field = 'grade' and new.route_id is not null and new.status = 'approved' then
    perform apply_agreed_grade(new.route_id);
  end if;
  return new;
end;
$$;
revoke all on function public.trg_apply_agreed_grade() from public, anon, authenticated;
drop trigger if exists trg_contribution_applies_agreed_grade on contributions;
create trigger trg_contribution_applies_agreed_grade
  after update of status on contributions
  for each row when (new.status = 'approved') execute function trg_apply_agreed_grade();

-- ---------------------------------------------------------------------------------------------
-- 2. Strikes and standing.
-- ---------------------------------------------------------------------------------------------
create or replace function _add_contribution_strike(p_user uuid, p_reason text, p_contribution uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  s   contribution_standing%rowtype;
  n   int;
  new_status text;
  v_until timestamptz;
begin
  if p_user is null or is_admin(p_user) then return; end if;
  insert into contribution_standing (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into s from contribution_standing where user_id = p_user for update;
  n := s.strikes + 1;
  -- A standing the owner raised by hand is never lowered by a strike count.
  new_status := case
    when n >= 5 or s.status = 'banned' then 'banned'
    when n >= 3 or s.status = 'restricted' then 'restricted'
    else 'warned' end;
  v_until := case when new_status = 'restricted' then greatest(coalesce(s.until, now()), now() + interval '90 days') else null end;
  update contribution_standing
     set strikes = n, status = new_status, until = v_until, reason = p_reason, last_strike_at = now(),
         set_by = uid, set_at = now()
   where user_id = p_user;

  if new_status <> s.status then
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, case new_status when 'banned' then 'contrib_ban' when 'restricted' then 'contrib_restrict' else 'contrib_warn' end,
            'contributor', p_user::text, p_user, 'strike ' || n || ': ' || p_reason);
    if new_status = 'warned' then
      perform _notify(p_user, 'contribution_warning', 'A route edit of yours was turned down',
        'Reason: ' || p_reason || '. Edits that are checked and turned down count against your account; after three, editing is paused for 90 days.',
        jsonb_build_object('contribution', p_contribution));
    elsif new_status = 'restricted' then
      perform _notify(p_user, 'contribution_restricted', 'Route editing is paused for 90 days',
        'Three of your route edits were checked and turned down. You can still flag something that looks wrong, and you can appeal from the edit sheet.',
        jsonb_build_object('contribution', p_contribution));
    else
      perform _notify(p_user, 'contribution_banned', 'Route editing is closed for your account',
        'Five of your route edits were checked and turned down. You can appeal from the edit sheet.',
        jsonb_build_object('contribution', p_contribution));
    end if;
  end if;
end;
$$;
revoke all on function _add_contribution_strike(uuid, text, uuid) from public, anon, authenticated;

-- set_contribution_standing(user, status, strikes, days, reason): the owner's override — reset
-- strikes, restrict, ban from contributing, or reinstate. Mirrors set_account_standing (0264).
create or replace function set_contribution_standing(p_user uuid, p_status text, p_strikes int default null,
                                                     p_days int default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  v_until timestamptz;
  v_strikes int;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can change contribution standing' using errcode = '42501'; end if;
  if p_user is null or p_user = uid then raise exception 'choose another climber'; end if;
  if is_admin(p_user) then raise exception 'an admin account cannot be restricted from here'; end if;
  if p_status not in ('ok', 'warned', 'restricted', 'banned') then raise exception 'unknown status: %', p_status; end if;
  if p_status <> 'ok' and (p_reason is null or length(btrim(p_reason)) = 0) then
    raise exception 'give the reason the climber will be shown';
  end if;
  if p_status = 'restricted' then
    if p_days is not null and (p_days < 1 or p_days > 365) then raise exception 'a restriction lasts 1 to 365 days'; end if;
    v_until := now() + make_interval(days => coalesce(p_days, 90));
  end if;
  v_strikes := coalesce(p_strikes, case when p_status = 'ok' then 0 end);

  insert into contribution_standing (user_id, status, strikes, until, reason, set_by, set_at)
  values (p_user, p_status, coalesce(v_strikes, 0), v_until, coalesce(nullif(btrim(p_reason), ''), 'Reinstated'), uid, now())
  on conflict (user_id) do update
    set status = excluded.status, strikes = coalesce(v_strikes, contribution_standing.strikes),
        until = excluded.until, reason = excluded.reason, set_by = excluded.set_by, set_at = excluded.set_at;

  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (uid, case p_status when 'banned' then 'contrib_ban' when 'restricted' then 'contrib_restrict'
                             when 'warned' then 'contrib_warn' else 'contrib_reinstate' end,
          'contributor', p_user::text, p_user,
          coalesce(nullif(btrim(p_reason), ''), 'Reinstated') || case when p_status = 'restricted' then ' (' || coalesce(p_days, 90) || ' days)' else '' end);

  if p_status = 'ok' then
    perform _notify(p_user, 'contribution_reinstated', 'You can edit route pages again',
      coalesce(nullif(btrim(p_reason), ''), 'Your contribution standing was reset.'), null);
  elsif p_status = 'restricted' then
    perform _notify(p_user, 'contribution_restricted', 'Route editing is paused for ' || coalesce(p_days, 90) || ' days',
      'Reason: ' || btrim(p_reason) || '. You can still flag something that looks wrong, and you can appeal from the edit sheet.', null);
  elsif p_status = 'banned' then
    perform _notify(p_user, 'contribution_banned', 'Route editing is closed for your account',
      'Reason: ' || btrim(p_reason) || '. You can appeal from the edit sheet.', null);
  else
    perform _notify(p_user, 'contribution_warning', 'A note about your route edits', 'Reason: ' || btrim(p_reason), null);
  end if;
end;
$$;
revoke all on function set_contribution_standing(uuid, text, int, int, text) from public, anon;
grant execute on function set_contribution_standing(uuid, text, int, int, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Lock / unlock a field by hand. p_level null = back to the computed level.
-- ---------------------------------------------------------------------------------------------
create or replace function set_route_field_confidence(p_route_id text, p_field text, p_level text, p_reason text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can set a confidence level' using errcode = '42501'; end if;
  if not exists (select 1 from routes where id = p_route_id) then raise exception 'no route with id %', p_route_id; end if;
  if not exists (select 1 from contribution_fields where form_key = p_field) then raise exception 'unknown field: %', p_field; end if;
  if p_level is null then
    delete from route_field_confidence where route_id = p_route_id and field = p_field;
  else
    if p_level not in ('high', 'medium', 'low') then raise exception 'unknown level: %', p_level; end if;
    insert into route_field_confidence (route_id, field, level, reason, set_by, set_at)
    values (p_route_id, p_field, p_level, nullif(btrim(coalesce(p_reason, '')), ''), uid, now())
    on conflict (route_id, field) do update
      set level = excluded.level, reason = excluded.reason, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;
  insert into moderation_actions (actor, action, target_kind, target_id, note)
  values (uid, case when p_level = 'high' then 'lock_field' else 'unlock_field' end, 'route_field',
          p_route_id || '/' || p_field, coalesce(p_level, 'computed') || coalesce(': ' || nullif(btrim(p_reason), ''), ''));
end;
$$;
revoke all on function set_route_field_confidence(text, text, text, text) from public, anon;
grant execute on function set_route_field_confidence(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Approve / reject a held field edit. `p_also` carries the ids of the other pending rows the
--    queue clustered with it (same route and field, a value sameEditValue() calls equal — that
--    comparison is JavaScript, guarded by check:consensus-clustering, and is not re-derived here);
--    the server only checks they are pending rows of the same route and field.
-- ---------------------------------------------------------------------------------------------
create or replace function approve_field_contribution(p_id uuid, p_value jsonb default null, p_also uuid[] default '{}')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  ids uuid[];
  who uuid;
  r   record;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can approve a route edit' using errcode = '42501'; end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  if c.kind <> 'field' or c.field is null or c.route_id is null then raise exception 'contribution % is not a route field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;
  if not exists (select 1 from contribution_fields where form_key = c.field) then raise exception 'unknown field: %', c.field; end if;
  if p_value is not null and length(p_value::text) > 20000 then raise exception 'the approved value is too long'; end if;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id = c.route_id and x.field = c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'approved', reviewed_by = uid, reviewed_at = now(), review_note = null,
         applied_value = case when p_value is not null and p_value is distinct from value then p_value end
   where id = any (ids);

  insert into route_field_confidence (route_id, field, level, reason, set_by, set_at)
  values (c.route_id, c.field, 'high', 'Approved by ClimbMatch', uid, now())
  on conflict (route_id, field) do update
    set level = 'high', reason = excluded.reason, set_by = excluded.set_by, set_at = excluded.set_at;

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    who := _contributor_uuid(r.contributor);
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'approve_contribution', 'contribution', r.id::text, who,
            c.route_id || '/' || c.field || case when p_value is not null then ' (edited)' else '' end);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_approved', 'Your route edit is live',
      'Thanks — your edit to ' || (select label from contribution_fields where form_key = c.field) ||
      ' on ' || coalesce((select name from routes where id = c.route_id), 'a route') ||
      case when p_value is not null then ' was applied with a small adjustment.' else ' was checked and applied.' end,
      jsonb_build_object('route', c.route_id, 'field', c.field));
  end loop;
end;
$$;
revoke all on function approve_field_contribution(uuid, jsonb, uuid[]) from public, anon;
grant execute on function approve_field_contribution(uuid, jsonb, uuid[]) to authenticated;

create or replace function reject_field_contribution(p_id uuid, p_reason text, p_also uuid[] default '{}', p_strike boolean default true)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  ids uuid[];
  who uuid;
  r   record;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can turn down a route edit' using errcode = '42501'; end if;
  if v_reason is null or length(v_reason) < 10 then raise exception 'give the reason the climber will be shown (at least 10 characters)'; end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  if c.kind <> 'field' then raise exception 'contribution % is not a route field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id is not distinct from c.route_id and x.field is not distinct from c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'rejected', reviewed_by = uid, reviewed_at = now(), review_note = left(v_reason, 2000)
   where id = any (ids);

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'reject_contribution', 'contribution', r.id::text, _contributor_uuid(r.contributor),
            coalesce(c.route_id, '') || '/' || coalesce(c.field, '') || ': ' || v_reason);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_rejected', 'A route edit of yours was turned down',
      'Your edit to ' || coalesce((select label from contribution_fields where form_key = c.field), c.field) ||
      ' on ' || coalesce((select name from routes where id = c.route_id), 'a route') || ' was checked and not applied. Reason: ' || v_reason,
      jsonb_build_object('route', c.route_id, 'field', c.field, 'contribution', c.id));
    if p_strike then perform _add_contribution_strike(who, v_reason, c.id); end if;
  end loop;
end;
$$;
revoke all on function reject_field_contribution(uuid, text, uuid[], boolean) from public, anon;
grant execute on function reject_field_contribution(uuid, text, uuid[], boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. Flags. Any signed-in, active, not-banned-from-contributing climber may file one; the owner
--    resolves it. A flag on a field at medium drops it to low until resolved (0308); it never
--    changes a high field and never applies a value.
-- ---------------------------------------------------------------------------------------------
create or replace function file_route_flag(p_route_id text, p_field text, p_note text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if uid is null then raise exception 'sign in to flag route information' using errcode = '42501'; end if;
  if not is_active_user(uid) or not can_flag(uid) then raise exception 'Your account cannot flag route information right now.' using errcode = '42501'; end if;
  if v_note is null then raise exception 'say what looks wrong'; end if;
  if not exists (select 1 from routes where id = p_route_id) then raise exception 'no route with id %', p_route_id; end if;
  if p_field is not null and not exists (select 1 from contribution_fields where form_key = p_field) then
    raise exception 'unknown field: %', p_field;
  end if;
  if not is_admin(uid) and (select count(*) from route_flags where reporter = uid and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'You’ve flagged a lot today — try again tomorrow.';
  end if;
  insert into route_flags (route_id, field, note, reporter)
  values (p_route_id, p_field, left(v_note, 1000), uid)
  on conflict (reporter, route_id, coalesce(field, '')) where status = 'open'
  do update set note = excluded.note, created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function file_route_flag(text, text, text) from public, anon;
grant execute on function file_route_flag(text, text, text) to authenticated;

create or replace function resolve_route_flag(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  f   route_flags%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety can resolve a flag' using errcode = '42501'; end if;
  if p_status not in ('fixed', 'dismissed') then raise exception 'unknown status: %', p_status; end if;
  select * into f from route_flags where id = p_id and status = 'open' for update;
  if not found then raise exception 'that flag is not open' using errcode = 'P0002'; end if;
  update route_flags set status = p_status, resolved_at = now(), resolved_by = uid, resolution_note = v_note where id = p_id;
  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (uid, case p_status when 'fixed' then 'flag_fixed' else 'flag_dismissed' end, 'route_flag', p_id::text, f.reporter,
          f.route_id || '/' || coalesce(f.field, '*') || coalesce(': ' || v_note, ''));
  perform _notify(f.reporter, 'flag_resolved',
    case p_status when 'fixed' then 'Thanks — the route page was fixed' else 'Your flag was reviewed' end,
    'On ' || coalesce((select name from routes where id = f.route_id), 'a route') ||
    case when f.field is not null then ' (' || coalesce((select label from contribution_fields where form_key = f.field), f.field) || ')' else '' end ||
    case p_status when 'fixed' then ': fixed.' else ': no change was needed.' end || coalesce(' ' || v_note, ''),
    jsonb_build_object('route', f.route_id, 'field', f.field, 'flag', f.id));
end;
$$;
revoke all on function resolve_route_flag(uuid, text, text) from public, anon;
grant execute on function resolve_route_flag(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Appeals learn the kind 'contributing' (0264's bodies, plus one branch each).
-- ---------------------------------------------------------------------------------------------
create or replace function file_appeal(p_kind text, p_id text, p_message text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid  uuid := auth.uid();
  ok   boolean := false;
  v_id uuid;
begin
  if uid is null then raise exception 'sign in to appeal' using errcode = '42501'; end if;
  if p_message is null or length(btrim(p_message)) = 0 then raise exception 'say why it should be looked at again'; end if;
  if p_kind = 'account' then
    ok := not is_active_user(uid);
    p_id := uid::text;
  elsif p_kind = 'contributing' then
    ok := not can_contribute_fields(uid) or not can_flag(uid);
    p_id := uid::text;
  elsif p_kind = 'message'      then ok := exists (select 1 from messages       where id::text = p_id and sender_id  = uid and moderation <> 'visible');
  elsif p_kind = 'crew_message' then ok := exists (select 1 from crews_messages where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group_post'   then ok := exists (select 1 from group_posts    where id::text = p_id and author     = uid and moderation <> 'visible');
  elsif p_kind = 'group_event'  then ok := exists (select 1 from group_events   where id::text = p_id and host       = uid and moderation <> 'visible');
  elsif p_kind = 'comment'      then ok := exists (select 1 from comments       where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'trip_report'  then ok := exists (select 1 from climb_logs     where id::text = p_id and user_id    = uid and moderation <> 'visible');
  elsif p_kind = 'group'        then ok := exists (select 1 from groups         where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'topo'         then ok := exists (select 1 from topos          where id::text = p_id and created_by = uid and moderation <> 'visible');
  elsif p_kind = 'list'         then ok := exists (select 1 from user_lists     where id::text = p_id and user_id    = uid and moderation <> 'visible');
  end if;
  if not ok then raise exception 'there is nothing of yours to appeal there' using errcode = 'P0002'; end if;
  insert into moderation_appeals (appellant, target_kind, target_id, message)
  values (uid, p_kind, p_id, left(btrim(p_message), 2000))
  on conflict (appellant, target_kind, target_id) where status = 'open'
  do update set message = excluded.message, created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function file_appeal(text, text, text) from public, anon;
grant execute on function file_appeal(text, text, text) to authenticated;

create or replace function decide_appeal(p_appeal uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  a   moderation_appeals%rowtype;
begin
  if not is_admin(uid) then raise exception 'only ClimbMatch Safety decides appeals' using errcode = '42501'; end if;
  if p_decision not in ('upheld', 'reversed') then raise exception 'unknown decision: %', p_decision; end if;
  select * into a from moderation_appeals where id = p_appeal and status = 'open' for update;
  if not found then raise exception 'that appeal is not open' using errcode = 'P0002'; end if;
  if p_decision = 'reversed' then
    if a.target_kind = 'account' then
      perform set_account_standing(a.appellant, 'active', null, 'Appeal granted', false, null);
    elsif a.target_kind = 'contributing' then
      perform set_contribution_standing(a.appellant, 'ok', 0, null, 'Appeal granted');
    else
      perform moderate_content(a.target_kind, a.target_id, 'restore', null, 'Appeal granted');
    end if;
  end if;
  update moderation_appeals
     set status = p_decision, decided_by = uid, decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_appeal;
end;
$$;
revoke all on function decide_appeal(uuid, text, text) from public, anon;
grant execute on function decide_appeal(uuid, text, text) to authenticated;

-- Confirm:
--   node scripts/oneoff/probe-route-quality-control.mjs   (real accounts; must end 0 failed)
