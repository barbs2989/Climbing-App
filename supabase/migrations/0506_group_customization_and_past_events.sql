-- 0506: what a group's organizers can customize, and a past event takes no RSVP or invite (owner 2026-11-23, "do all").
--
-- 1. FOUR NEW GROUP SETTINGS, written under 0090's manager-only update policy like every other setting:
--    welcome_text  shown to a member once they are in (up to 600 characters)
--    announcement  a banner at the top of the group's page (up to 300)
--    links         up to 4 {label, url}: the group's website, Instagram and the like; https only
--    mod_title     what the roster calls a moderator instead of "Moderator" / MOD (up to 24)
--    And `accent` (0090), the group's colour, which the app now lets an organizer pick: it was free text,
--    and it reaches a style, so it is held to #rrggbb. Production held only that shape or null on 2026-11-23.
--
-- 2. THE NEW TEXT IS SCREENED like the name and About text: the 'group' line of screening_text gains it,
--    so screen_should_run (which compares that text before and after) runs on an edit to any of them.
--
-- 3. A PAST EVENT TAKES NO RSVP AND NO INVITE. The app stops offering both from the day after an
--    event's date (the climber's own day). The database refuses them one day later than that, on the
--    UTC date, so it never refuses what the app offers to a climber anywhere: a climber's day is at most
--    a day behind UTC's. Cancelling an RSVP stays allowed.

-- ── 1. settings ─────────────────────────────────────────────────────────────────────────────────

create or replace function group_links_valid(r jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare e jsonb;
begin
  if r is null or jsonb_typeof(r) <> 'array' or jsonb_array_length(r) > 4 then return false; end if;
  for e in select value from jsonb_array_elements(r) loop
    if coalesce(jsonb_typeof(e), '') <> 'object' then return false; end if;
    if coalesce(jsonb_typeof(e -> 'label'), '') <> 'string' or coalesce(jsonb_typeof(e -> 'url'), '') <> 'string' then return false; end if;
    if coalesce(length(btrim(e ->> 'label')), 0) not between 1 and 40 then return false; end if;
    if coalesce(length(e ->> 'url'), 0) > 300 or (e ->> 'url') !~ '^https://[^[:space:]<>"]+\.[^[:space:]<>"]+$' then return false; end if;
  end loop;
  return true;
end $$;

alter table groups add column if not exists welcome_text text;
alter table groups add column if not exists announcement text;
alter table groups add column if not exists links jsonb not null default '[]'::jsonb;
alter table groups add column if not exists mod_title text;

alter table groups drop constraint if exists groups_welcome_text_len;
alter table groups add constraint groups_welcome_text_len check (welcome_text is null or length(welcome_text) <= 600);
alter table groups drop constraint if exists groups_announcement_len;
alter table groups add constraint groups_announcement_len check (announcement is null or length(announcement) <= 300);
alter table groups drop constraint if exists groups_links_valid;
alter table groups add constraint groups_links_valid check (group_links_valid(links));
alter table groups drop constraint if exists groups_mod_title_len;
alter table groups add constraint groups_mod_title_len check (mod_title is null or length(btrim(mod_title)) between 1 and 24);
alter table groups drop constraint if exists groups_accent_hex;
alter table groups add constraint groups_accent_hex check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$');

comment on column groups.welcome_text is 'A welcome note the organizers write, shown to a member once they are in (0506).';
comment on column groups.announcement is 'A banner at the top of the group''s page, set by its organizers (0506).';
comment on column groups.links is 'Up to 4 [{label, url}] links (https only) on the group''s About tab (0506).';
comment on column groups.mod_title is 'What the roster calls a moderator, in place of Moderator / MOD; null for the default (0506).';
comment on column groups.accent is 'The group''s colour, #rrggbb, or null for one drawn from its name (0090; held to hex since 0506).';

-- ── 2. screening ────────────────────────────────────────────────────────────────────────────────
-- 0492's function with the 'group' line extended; every other kind is unchanged.
create or replace function screening_text(p_kind text, r jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'message'      then r->>'body'
    when 'crew_message' then r->>'body'
    when 'group_post'   then r->>'body'
    when 'group_event'  then concat_ws(E'\n', r->>'title', r->>'descr', r->>'location')
    when 'comment'      then r->>'text'
    when 'trip_report'  then concat_ws(E'\n', r->>'notes', r->>'beta', r->>'gear_beta', r->>'road_note', r->>'outcome_note', r->>'sun_note')
    when 'group'        then concat_ws(E'\n', r->>'name', r->>'blurb', r->>'location', r->>'welcome_text', r->>'announcement', r->>'mod_title',
                               (select string_agg(l->>'label', E'\n') from jsonb_array_elements(case when jsonb_typeof(r->'links') = 'array' then r->'links' else '[]'::jsonb end) l))
    when 'topo'         then concat_ws(E'\n', r->>'alt', r->>'photographer', r->>'caption')
    when 'topo_line'    then nullif(concat_ws(E'\n', r->>'label',
                               (select string_agg(v, E'\n') from jsonb_array_elements_text(case when jsonb_typeof(r->'variant_labels') = 'array' then r->'variant_labels' else '[]'::jsonb end) v where v <> ''),
                               (select string_agg(p->>'note', E'\n') from jsonb_array_elements(case when jsonb_typeof(r->'pins') = 'array' then r->'pins' else '[]'::jsonb end) p where coalesce(p->>'note', '') <> '')), '')
    when 'list'         then concat_ws(E'\n', r->>'name', r->>'description')
  end;
$$;

-- ── 3. past events ──────────────────────────────────────────────────────────────────────────────
create or replace function guard_group_event_not_past() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare d date;
begin
  select event_date into d from group_events where id = new.event_id;
  if d is not null and d < (now() at time zone 'utc')::date - 1 then
    raise exception 'This event has ended' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_group_event_rsvp_not_past on group_event_rsvps;
create trigger trg_group_event_rsvp_not_past before insert on group_event_rsvps
  for each row execute function guard_group_event_not_past();
drop trigger if exists trg_group_event_invite_not_past on group_event_invites;
create trigger trg_group_event_invite_not_past before insert on group_event_invites
  for each row execute function guard_group_event_not_past();
