-- 0530: route edits are private until approved, checked when sent, and an approval can be taken back.
--
-- Owner, 2026-11-24 ("Audit the quality control of people editing route fields … do all"). The audit that
-- day (14/17 live probes held) found:
--   A. `contributions public read using (true)`: anyone, signed out included, could read every PENDING and
--      REJECTED edit through the API — the value, who sent it, their "why" and the owner's turn-down reason.
--      The app hid them; the database did not.
--   B. Nothing checked a value when it was sent: a high point of 999,999 ft and prose carrying a link were
--      accepted into the owner's queue.
--   C. Route-field text was never run past the screening word list that comments, posts and topos get (0265).
--   D. An approval could not be undone, and an approval LOCKS the field (high), so a wrong one stayed locked.
--   E. A flag note of "no" was accepted (the 5-character floor lived only in the app's form).
-- And the owner asked for a second reviewer role that can approve but cannot ban (item 9), and a worklist
-- the data audits can feed (item 7).
--
-- 1. profiles.is_reviewer + can_review(uid): an admin, or an active account an admin made a reviewer.
--    Only an admin can grant or take it (prevent_self_admin now guards both flags). A reviewer can approve,
--    turn down and take back FIELD edits, and resolve flags. Standing, bans, locks, appeals and proposals
--    stay admin-only.
-- 2. contributions read: approved rows, the live-at-insert kinds (photo, pair, sun), your own rows, or a reviewer.
-- 3. contributions.prior_value: the page's value just before an approval, captured by trigger, so taking
--    the approval back can restore exactly what was there (grade and area fields are written to their table).
-- 4. _field_value_problem(): the checks guard_field_contribution now runs on every field edit (B, C).
-- 5. withdraw_approval(id, reason): takes an approved field edit back (no strike), restores the page value,
--    drops the "Approved by ClimbMatch" lock when nothing approved is left, tells the climber.
-- 6. file_route_flag: the note needs 5 characters (E).
-- 7. review_worklist: findings the data audits write (service key) for the Review desk to work through.
-- Every function re-created here is the LIVE definition read on 2026-11-24, with only the marked change.

begin;

-- ── 1. the reviewer role ──────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_reviewer boolean not null default false;

create or replace function public.can_review(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select uid is not null and (
    coalesce(is_admin(uid), false)
    or (coalesce((select p.is_reviewer from profiles p where p.id = uid), false) and coalesce(is_active_user(uid), false))
  );
$$;
revoke all on function public.can_review(uuid) from public;
grant execute on function public.can_review(uuid) to anon, authenticated, service_role;

create or replace function public.prevent_self_admin() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    if (new.is_admin or coalesce(new.is_reviewer, false)) and not is_admin(auth.uid()) then
      raise exception 'only an admin can change is_admin or is_reviewer' using errcode = '42501';
    end if;
  elsif new.is_admin is distinct from old.is_admin or new.is_reviewer is distinct from old.is_reviewer then
    if not is_admin(auth.uid()) then
      raise exception 'only an admin can change is_admin or is_reviewer';
    end if;
  end if;
  return new;
end; $$;

alter table public.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check check (action = any (array[
  'remove','hold','restore','auto_hold','suspend','ban','reinstate','remove_all','approve_contribution','reject_contribution',
  'contrib_warn','contrib_restrict','contrib_ban','contrib_reinstate','lock_field','unlock_field','flag_fixed','flag_dismissed',
  'withdraw_approval','grant_reviewer','revoke_reviewer']));

alter table public.user_notices drop constraint if exists user_notices_kind_check;
alter table public.user_notices add constraint user_notices_kind_check check (kind = any (array[
  'contribution_approved','contribution_rejected','contribution_warning','contribution_restricted','contribution_banned',
  'contribution_reinstated','flag_resolved','contribution_withdrawn']));

create or replace function public.set_reviewer(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if not is_admin(uid) then raise exception 'only an admin can make someone a reviewer' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'no climber with id %', p_user; end if;
  update profiles set is_reviewer = coalesce(p_on, false) where id = p_user;
  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (uid, case when p_on then 'grant_reviewer' else 'revoke_reviewer' end, 'profile', p_user::text, p_user, null);
end; $$;
revoke all on function public.set_reviewer(uuid, boolean) from public, anon;
grant execute on function public.set_reviewer(uuid, boolean) to authenticated;

-- A reviewer reads what the desk shows: field edits and flags in the action log, open flags, the AI's verdicts.
drop policy if exists "reviewers read edit and flag actions" on public.moderation_actions;
create policy "reviewers read edit and flag actions" on public.moderation_actions for select
  using (target_kind in ('contribution', 'route_flag') and can_review((select auth.uid())));
drop policy if exists "reviewers read flags" on public.route_flags;
create policy "reviewers read flags" on public.route_flags for select using (can_review((select auth.uid())));
drop policy if exists "reviewers read ai verdicts" on public.review_ai_verdicts;
create policy "reviewers read ai verdicts" on public.review_ai_verdicts for select using (can_review((select auth.uid())));

-- ── 2. a waiting or turned-down edit is not public ────────────────────────────────────────────────────
drop policy if exists "contributions public read" on public.contributions;
drop policy if exists "contributions read: live, own, or a reviewer" on public.contributions;
create policy "contributions read: live, own, or a reviewer" on public.contributions for select using (
  status = 'approved'
  or kind in ('photo', 'pair', 'sun')
  or contributor = ((select auth.uid()))::text
  or can_review((select auth.uid()))
);

create or replace function public.guard_contribution_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.prior_value := null;                                   -- 0530: never the submitter's to set
    return new;
  end if;
  -- 0530: a reviewer moves field edits; everything else still needs an admin.
  if new.status is distinct from old.status
     and not (is_admin(auth.uid()) or (old.kind = 'field' and can_review(auth.uid()))) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

-- ── 3. the value an approval replaced ─────────────────────────────────────────────────────────────────
alter table public.contributions add column if not exists prior_value jsonb;
comment on column public.contributions.prior_value is
  'The page''s value of this field just before this edit was approved (0530), so withdraw_approval can put it back. Null on approvals made before 0530.';

create or replace function public._area_field_value(p_area_id text, p_field text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select case p_field
    when 'blurb'         then to_jsonb(a.blurb)
    when 'approach'      then to_jsonb(a.approach)
    when 'approach_min'  then to_jsonb(a.approach_min)
    when 'parking_note'  then to_jsonb(a.parking_note)
    when 'rock'          then to_jsonb(a.rock)
    when 'aspect'        then to_jsonb(a.aspect)
    when 'season_months' then to_jsonb(a.season_months)
    when 'parking_pin'   then case when a.parking_lat is null then null
                              else jsonb_build_object('lat', a.parking_lat, 'lng', a.parking_lng, 'name', a.parking_name) end
  end
  from areas a where a.id = p_area_id;
$$;
revoke all on function public._area_field_value(text, text) from public, anon, authenticated;

create or replace function public.trg_capture_prior_value() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind = 'field' and old.status = 'pending' and new.status = 'approved' and new.field is not null then
    if new.route_id is not null then
      new.prior_value := jsonb_build_object('v', route_field_page_value(new.route_id, new.field));
    elsif new.area_id is not null then
      new.prior_value := jsonb_build_object('v', _area_field_value(new.area_id, new.field));
    end if;
  end if;
  return new;
end $$;
revoke all on function public.trg_capture_prior_value() from public, anon, authenticated;
drop trigger if exists trg_contribution_prior_value on public.contributions;
-- Named to sort after trg_contribution_status, which allows the move first.
create trigger trg_contribution_prior_value before update of status on public.contributions
  for each row execute function public.trg_capture_prior_value();

-- ── 4. checks a field edit must pass when it is sent ──────────────────────────────────────────────────
create or replace function public._km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371.0 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
       + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

create or replace function public._jnum(v jsonb) returns numeric
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then null
    when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric
    when jsonb_typeof(v) = 'string' and btrim(v #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then btrim(v #>> '{}')::numeric
  end;
$$;

-- Returns the sentence the climber is shown, or null when the value may go to review.
create or replace function public._field_value_problem(p_route_id text, p_area_id text, p_field text, p_value jsonb)
returns text language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  n numeric; lo numeric; hi numeric; unit text; txt text; rlat double precision; rlng double precision;
  e jsonb; plat double precision; plng double precision; prose boolean;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then return null; end if;   -- a removal; 0351 handles those
  txt := case when jsonb_typeof(p_value) = 'string' then btrim(p_value #>> '{}') else p_value::text end;

  -- C: the screening floor every other climber-written text passes (0265).
  if screening_match(txt) is not null then
    return 'That wording can''t go on a route page. Please rephrase it.';
  end if;

  -- Numbers, in the units the edit sheet SENDS (SuggestFix CANON): feet for length and high point, metres for
  -- gain/loss, km. Ranges cover every value the live catalog held on 2026-11-24 except 11 impossible lengths
  -- (one 99,999,999 ft), which the worklist carries: angle 95° and a 170-pitch route are real.
  select r.lo, r.hi, r.unit into lo, hi, unit from (values
    ('highPointFt', -300::numeric, 20400::numeric, 'ft'), ('length', 1, 15000, 'ft'), ('dist', 0, 300, 'km'),
    ('gain', 0, 6500, 'm'), ('loss', 0, 6500, 'm'), ('angle', 0, 180, '°'), ('pitchCount', 1, 200, 'pitches'),
    ('draws', 0, 80, 'draws'), ('alpineDraws', 0, 40, 'draws'), ('screws', 0, 40, 'screws'),
    ('bolts', 0, 300, 'bolts'), ('pads', 0, 20, 'pads'), ('approach_min', 1, 600, 'minutes')
  ) as r(field, lo, hi, unit) where r.field = p_field;
  if found then
    n := _jnum(p_value);
    if n is null then
      if txt = '' then return null; end if;
      return 'That should be a number.';
    end if;
    if n < lo or n > hi then
      return 'That number is outside what is possible here (' || lo || '–' || hi || ' ' || unit || '). Check the units.';
    end if;
    return null;
  end if;

  -- Grades: short, and shaped like a grade. (Free text is allowed where the picker has no scale.)
  if p_field in ('grade', 'rockGrade') then
    if jsonb_typeof(p_value) <> 'string' then return 'A grade is a short piece of text, like 5.9 or WI3.'; end if;
    if char_length(txt) > 30 then return 'A grade is short, like 5.10a or Class 3 — put the explanation in a note.'; end if;
    if txt <> '' and (picker_grade_num(txt)).sys is null
       and txt !~* '^(class|easy|mod|steep|difficult|grade|[0-9]|5\.|v[0-9b?-]|b[0-9]|wi|ai|m[0-9]|a[0-9]|c[0-9]|[ivx]+( |$)|f\+?$|f |pd|ad|td|ed|d[+-]?$|d |s\.?$)' then  -- (a Postgres regex has no \b)
      return 'That doesn''t look like a grade. Use the picker, or a grade like 5.9, V4, WI3, M5, A2 or Class 3.';
    end if;
    return null;
  end if;

  -- Pins: a real coordinate, near the climb.
  if p_field in ('waypoints', 'parking_pin') then
    if p_route_id is not null then select r.lat, r.lng into rlat, rlng from routes r where r.id = p_route_id;
    elsif p_area_id is not null then select a.lat, a.lng into rlat, rlng from areas a where a.id = p_area_id; end if;
    for e in select x from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else jsonb_build_array(p_value) end) x loop
      if jsonb_typeof(e) = 'object' and e ? 'lat' and e ? 'lng' then
        plat := _jnum(e -> 'lat'); plng := _jnum(e -> 'lng');
        if plat is null or plng is null or plat not between -90 and 90 or plng not between -180 and 180 or (plat = 0 and plng = 0) then
          return 'One of the pins has no real coordinate.';
        end if;
        if rlat is not null and rlng is not null and _km(rlat, rlng, plat, plng) > 40 then
          return 'One of the pins is ' || round(_km(rlat, rlng, plat, plng)::numeric) || ' km from this climb. Check where it was dropped.';
        end if;
      end if;
    end loop;
    return null;
  end if;

  if p_field = 'permitUrl' then
    if txt <> '' and txt !~* '^https?://[^\s]+$' then return 'A permit link starts with https:// and has no spaces.'; end if;
    return null;
  end if;

  -- Prose: no links or email addresses (the page never names a source). Fields made for contacts keep them.
  select coalesce(cf.is_prose, false) into prose from contribution_fields cf where cf.form_key = p_field;
  if (coalesce(prose, false) or jsonb_typeof(p_value) = 'string')
     and p_field not in ('permit', 'access', 'emergency', 'road', 'approachLogistics') then
    if txt ~* '(https?://|www\.[a-z0-9-]+\.)' then return 'Links can''t go in route text. Describe it in your own words.'; end if;
    if txt ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then return 'Email addresses can''t go in route text.'; end if;
  end if;
  return null;
end;
$$;
revoke all on function public._field_value_problem(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.guard_field_contribution() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid   uuid := auth.uid();
  n     int;
  cap   int;
  young boolean;
  why   text;
begin
  if new.kind in ('new_route', 'new_area') then
    if uid is null or is_admin(uid) then return new; end if;
    if not coalesce(can_contribute_fields(uid), false) then
      raise exception 'Adding climbs and areas is paused on your account. You can appeal from the form.';
    end if;
    select created_at > now() - interval '7 days' into young from profiles where id = uid;
    cap := case when coalesce(young, true) then 2 else 5 end;
    select count(*) into n from contributions
     where contributor = uid::text and kind in ('new_route', 'new_area') and created_at > now() - interval '24 hours';
    if n >= cap then
      raise exception 'You’ve added a lot of climbs and areas today — try again tomorrow.';
    end if;
    -- 0530: the proposal's text passes the same screening floor.
    if screening_match(coalesce(new.value::text, '')) is not null then
      raise exception 'That wording can''t go on a route page. Please rephrase it.';
    end if;
    return new;
  end if;

  if new.kind <> 'field' then return new; end if;
  new.applied_value := null;

  if uid is not null and not is_admin(uid) and not coalesce(can_contribute_fields(uid), false) then
    raise exception 'Editing is paused on your account. You can still flag something that looks wrong, and you can appeal from the edit sheet.';
  end if;

  if new.route_id is not null and new.field is not null and not is_admin(uid)
     and route_field_level(new.route_id, new.field) = 'high' then
    raise exception 'This detail is locked at high confidence; flag it instead if it has changed.';
  end if;

  -- 0530: the value itself (admins included — a typo in the owner's own value is still a typo).
  why := _field_value_problem(new.route_id, new.area_id, new.field, new.value);
  if why is not null then raise exception '%', why using errcode = 'P0001'; end if;

  if not is_admin(uid) then
    select created_at > now() - interval '7 days' into young from profiles where id = uid;
    cap := case when coalesce(young, true) then 5 else 20 end;
    select count(*) into n from contributions
     where contributor = uid::text and kind = 'field' and created_at > now() - interval '24 hours';
    if n >= cap then
      raise exception 'You’ve suggested a lot of edits today — try again tomorrow.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_field_contribution() from public, anon, authenticated;

-- ── 5. a reviewer at the approve / turn-down / flag gates, and taking an approval back ──────────────
-- approve_field_contribution, reject_field_contribution and resolve_route_flag: LIVE bodies, gate only.
-- (They are re-created at the end of this file from their LIVE bodies.)


create or replace function public.withdraw_approval(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c contributions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  is_area boolean;
  left_approved boolean;
  prior jsonb;
  conv record;
  place text; flabel text;
begin
  if not can_review(uid) then raise exception 'only ClimbMatch can take back an approval' using errcode = '42501'; end if;
  if v_reason is null or char_length(v_reason) < 10 then
    raise exception 'give the reason the climber will be shown (at least 10 characters)';
  end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  if c.kind <> 'field' or c.field is null then raise exception 'only a field edit can be taken back (this is %)', c.kind; end if;
  if c.status <> 'approved' then raise exception 'contribution % is %, not approved', p_id, c.status; end if;
  is_area := c.area_id is not null and c.route_id is null;

  select exists (select 1 from contributions x
                  where x.id <> c.id and x.kind = 'field' and x.status = 'approved' and x.field = c.field
                    and x.route_id is not distinct from c.route_id and x.area_id is not distinct from c.area_id)
    into left_approved;

  -- Fields written to their table need the earlier value when nothing approved is left to fall back on.
  if not left_approved and (is_area or c.field = 'grade') and c.prior_value is null then
    raise exception 'This approval was made before ClimbMatch kept the earlier value, so it can''t be undone automatically. Use Edit value to set the right one.';
  end if;

  update contributions
     set status = 'rejected', reviewed_by = uid, reviewed_at = now(),
         review_note = left('Approval taken back: ' || v_reason, 2000)
   where id = c.id;

  if is_area then
    if left_approved then
      perform apply_approved_area_field(c.area_id, c.field);
    else
      prior := c.prior_value -> 'v';
      update areas set
        blurb         = case when c.field = 'blurb'         then prior #>> '{}' else blurb end,
        approach      = case when c.field = 'approach'      then prior #>> '{}' else approach end,
        approach_min  = case when c.field = 'approach_min'  then (prior #>> '{}')::int else approach_min end,
        parking_note  = case when c.field = 'parking_note'  then prior #>> '{}' else parking_note end,
        rock          = case when c.field = 'rock'          then prior #>> '{}' else rock end,
        aspect        = case when c.field = 'aspect'        then prior #>> '{}' else aspect end,
        season_months = case when c.field = 'season_months' then
                          (select array_agg((x #>> '{}')::smallint order by (x #>> '{}')::smallint) from jsonb_array_elements(coalesce(prior, '[]'::jsonb)) x)
                        else season_months end,
        parking_lat   = case when c.field = 'parking_pin' then (prior ->> 'lat')::double precision else parking_lat end,
        parking_lng   = case when c.field = 'parking_pin' then (prior ->> 'lng')::double precision else parking_lng end,
        parking_name  = case when c.field = 'parking_pin' then prior ->> 'name' else parking_name end
      where id = c.area_id;
    end if;
  else
    if c.field = 'grade' then
      if left_approved then
        perform apply_agreed_grade(c.route_id);
      else
        prior := c.prior_value -> 'v';
        if jsonb_typeof(prior) = 'string' then
          select * into conv from picker_grade_num(prior #>> '{}');
          update routes set grade = prior #>> '{}',
                 grade_system = coalesce(conv.sys, grade_system), grade_num = coalesce(conv.num, grade_num)
           where id = c.route_id;
        end if;
      end if;
    end if;
    -- The page overlays the latest approved edit, else the column: nothing more to write. Drop the lock
    -- the approval set when no approved edit of this field is left.
    if not left_approved then
      delete from route_field_confidence
       where route_id = c.route_id and field = c.field and reason = 'Approved by ClimbMatch';
    end if;
  end if;

  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (uid, 'withdraw_approval', 'contribution', c.id::text, _contributor_uuid(c.contributor),
          coalesce(c.route_id, c.area_id, '') || '/' || c.field || ': ' || v_reason);

  place  := case when is_area then coalesce((select name from areas where id = c.area_id), 'an area')
                 else coalesce((select name from routes where id = c.route_id), 'a route') end;
  flabel := case when is_area then area_field_label(c.field)
                 else coalesce((select label from contribution_fields where form_key = c.field), c.field) end;
  perform _notify(_contributor_uuid(c.contributor), 'contribution_withdrawn', 'An edit of yours was taken back',
    'Your edit to ' || flabel || ' on ' || place || ' was taken off the page after another look. This is not a strike. Reason: ' || v_reason,
    case when is_area then jsonb_build_object('area', c.area_id, 'field', c.field, 'contribution', c.id)
         else jsonb_build_object('route', c.route_id, 'field', c.field, 'contribution', c.id) end);
end;
$$;
revoke all on function public.withdraw_approval(uuid, text) from public, anon;
grant execute on function public.withdraw_approval(uuid, text) to authenticated;

-- ── 6. a flag says something ───────────────────────────────────────────────────────────────────────────
-- file_route_flag: LIVE body with the 5-character floor; generated with the gates below.

-- ── 7. the audit worklist ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.review_worklist (
  id          uuid primary key default gen_random_uuid(),
  audit       text not null,                       -- the audit's npm name, e.g. 'audit:expiring-closures'
  item_key    text not null,                       -- stable per finding, so a re-run updates instead of duplicating
  route_id    text references public.routes(id) on delete cascade,
  area_id     text references public.areas(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 300),
  detail      text check (detail is null or char_length(detail) <= 4000),
  found_at    timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  status      text not null default 'open' check (status in ('open', 'done', 'ignored')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  note        text check (note is null or char_length(note) <= 1000),
  unique (audit, item_key)
);
alter table public.review_worklist enable row level security;
drop policy if exists "admins read the worklist" on public.review_worklist;
create policy "admins read the worklist" on public.review_worklist for select using (is_admin((select auth.uid())));
revoke insert, update, delete on public.review_worklist from anon, authenticated;

create or replace function public.resolve_worklist_item(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if not is_admin(uid) then raise exception 'only an admin can close a worklist item' using errcode = '42501'; end if;
  if p_status not in ('open', 'done', 'ignored') then raise exception 'unknown status: %', p_status; end if;
  update review_worklist
     set status = p_status, note = left(nullif(btrim(coalesce(p_note, '')), ''), 1000),
         resolved_by = case when p_status = 'open' then null else uid end,
         resolved_at = case when p_status = 'open' then null else now() end
   where id = p_id;
  if not found then raise exception 'no worklist item with id %', p_id; end if;
end; $$;
revoke all on function public.resolve_worklist_item(uuid, text, text) from public, anon;
grant execute on function public.resolve_worklist_item(uuid, text, text) to authenticated;

-- ── generated: LIVE bodies with the 0530 edit marked ─────────────────────────────────────────────

create or replace function approve_field_contribution(p_id uuid, p_value jsonb default null, p_also uuid[] default '{}')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  ids uuid[];
  who uuid;
  r   record;
  is_area boolean;
  place text;
  flabel text;
begin
  if not can_review(uid) then raise exception 'only ClimbMatch Safety can approve a route edit' using errcode = '42501'; end if;  -- 0530: a reviewer too
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  is_area := c.area_id is not null and c.route_id is null;
  if c.kind <> 'field' or c.field is null or (c.route_id is null and not is_area) then raise exception 'contribution % is not a field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;
  if is_area then
    if c.field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months') then raise exception 'unknown area field: %', c.field; end if;
  else
    if not exists (select 1 from contribution_fields where form_key = c.field) then raise exception 'unknown field: %', c.field; end if;
  end if;
  if p_value is not null and length(p_value::text) > 20000 then raise exception 'the approved value is too long'; end if;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id is not distinct from c.route_id and x.area_id is not distinct from c.area_id and x.field = c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'approved', reviewed_by = uid, reviewed_at = now(), review_note = null,
         applied_value = case when p_value is not null and p_value is distinct from value then p_value end
   where id = any (ids);

  if not is_area then
    insert into route_field_confidence (route_id, field, level, reason, set_by, set_at)
    values (c.route_id, c.field, 'high', 'Approved by ClimbMatch', uid, now())
    on conflict (route_id, field) do update
      set level = 'high', reason = excluded.reason, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;

  place  := case when is_area then coalesce((select name from areas where id = c.area_id), 'an area')
                 else coalesce((select name from routes where id = c.route_id), 'a route') end;
  flabel := case when is_area then area_field_label(c.field)
                 else coalesce((select label from contribution_fields where form_key = c.field), c.field) end;

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    who := _contributor_uuid(r.contributor);
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'approve_contribution', 'contribution', r.id::text, who,
            coalesce(c.route_id, c.area_id) || '/' || c.field || case when p_value is not null then ' (edited)' else '' end);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_approved', case when is_area then 'Your area edit is live' else 'Your route edit is live' end,
      'Thanks — your edit to ' || flabel || ' on ' || place ||
      case when p_value is not null then ' was applied with a small adjustment.' else ' was checked and applied.' end,
      case when is_area then jsonb_build_object('area', c.area_id, 'field', c.field)
           else jsonb_build_object('route', c.route_id, 'field', c.field) end);
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
  is_area boolean;
  place text;
  flabel text;
begin
  if not can_review(uid) then raise exception 'only ClimbMatch Safety can turn down a route edit' using errcode = '42501'; end if;  -- 0530: a reviewer too
  if v_reason is null or length(v_reason) < 10 then raise exception 'give the reason the climber will be shown (at least 10 characters)'; end if;
  select * into c from contributions where id = p_id for update;
  if not found then raise exception 'no contribution with id %', p_id; end if;
  if c.kind <> 'field' then raise exception 'contribution % is not a field edit', p_id; end if;
  if c.status <> 'pending' then raise exception 'contribution % is already %', p_id, c.status; end if;
  is_area := c.area_id is not null and c.route_id is null;

  select coalesce(array_agg(x.id), '{}') into ids
    from contributions x
   where x.id = any (coalesce(p_also, '{}')) and x.id <> c.id and x.status = 'pending'
     and x.kind = 'field' and x.route_id is not distinct from c.route_id and x.area_id is not distinct from c.area_id and x.field is not distinct from c.field;
  ids := array_prepend(c.id, ids);

  update contributions
     set status = 'rejected', reviewed_by = uid, reviewed_at = now(), review_note = left(v_reason, 2000)
   where id = any (ids);

  place  := case when is_area then coalesce((select name from areas where id = c.area_id), 'an area')
                 else coalesce((select name from routes where id = c.route_id), 'a route') end;
  flabel := case when is_area then area_field_label(c.field)
                 else coalesce((select label from contribution_fields where form_key = c.field), c.field) end;

  for r in select x.id, x.contributor from contributions x where x.id = any (ids) loop
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, 'reject_contribution', 'contribution', r.id::text, _contributor_uuid(r.contributor),
            coalesce(c.route_id, c.area_id, '') || '/' || coalesce(c.field, '') || ': ' || v_reason);
  end loop;
  for who in select distinct _contributor_uuid(x.contributor) from contributions x where x.id = any (ids) loop
    perform _notify(who, 'contribution_rejected', case when is_area then 'An area edit of yours was turned down' else 'A route edit of yours was turned down' end,
      'Your edit to ' || flabel || ' on ' || place || ' was checked and not applied. Reason: ' || v_reason,
      case when is_area then jsonb_build_object('area', c.area_id, 'field', c.field, 'contribution', c.id)
           else jsonb_build_object('route', c.route_id, 'field', c.field, 'contribution', c.id) end);
    if p_strike then perform _add_contribution_strike(who, v_reason, c.id); end if;
  end loop;
end;
$$;
revoke all on function reject_field_contribution(uuid, text, uuid[], boolean) from public, anon;
grant execute on function reject_field_contribution(uuid, text, uuid[], boolean) to authenticated;

create or replace function resolve_route_flag(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  f   route_flags%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not can_review(uid) then raise exception 'only ClimbMatch Safety can resolve a flag' using errcode = '42501'; end if;  -- 0530: a reviewer too
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

create or replace function file_route_flag(p_route_id text, p_field text, p_note text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if uid is null then raise exception 'sign in to flag route information' using errcode = '42501'; end if;
  if not is_active_user(uid) or not can_flag(uid) then raise exception 'Your account cannot flag route information right now.' using errcode = '42501'; end if;
  if v_note is null or char_length(v_note) < 5 then raise exception 'Say what looks wrong (at least 5 characters).'; end if;  -- 0530
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


commit;
