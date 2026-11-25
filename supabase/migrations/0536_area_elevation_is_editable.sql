-- 0536: an AREA's ELEVATION is a field climbers can add (owner note, 2026-11-25).
--
-- "For area facts ... It should show all even if there's no data for it so that we can allow users to add that
-- information via the edit." The area page's AREA FACTS card now lists every fact it knows -- Rock, Faces,
-- Elevation, Walk-in, Parking, Season -- whether or not it is on file, and each missing one opens the area editor
-- at that field. Elevation was the one fact the editor could not take, so it joins the eight 0378 listed as a
-- ninth, 'elevation_ft': held for review like the rest (0319), checked when it is sent (0530
-- _field_value_problem: a whole number of feet, -300 to 29,100), written by apply_approved_area_field when
-- approved, and put back by withdraw_approval when an approval is taken back.
--
-- Every function below is the NEWEST migration's body (0378 for the applier and the label, 0530 for the rest)
-- with only the elevation_ft additions; check:area-edit-fields holds the four lists to lib/areaFields.js.

begin;

-- ── 1. the constraint takes the new field ──
alter table public.contributions drop constraint if exists contributions_area_field_ck;
alter table public.contributions add constraint contributions_area_field_ck check (
  not (area_id is not null and route_id is null and kind = 'field')
  or field in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months','elevation_ft')
);

-- ── 2. the applier writes it ──
create or replace function public.apply_approved_area_field(p_area_id text, p_field text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a record; raw jsonb; txt text; num numeric; months smallint[]; plat double precision; plng double precision; pname text;
begin
  if p_field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months','elevation_ft') then return; end if;
  select * into a from areas where id = p_area_id;
  if not found then return; end if;

  -- The latest approved row for this area and field; the owner's adjusted value wins over the
  -- climber's when one was given.
  select coalesce(c.applied_value, c.value) into raw
    from contributions c
   where c.area_id = p_area_id and c.route_id is null and c.kind = 'field' and c.field = p_field
     and c.status = 'approved'
   order by c.reviewed_at desc nulls last, c.created_at desc
   limit 1;
  if raw is null then return; end if;

  -- Validate against the column's own rules and write. A value the column would refuse is left
  -- alone rather than raised: the approval stands in the ledger, the page is unchanged, and the
  -- owner can see the row in Your contributions / the queue history.
  if p_field in ('blurb','approach','parking_note','rock','aspect') then
    if jsonb_typeof(raw) <> 'string' then return; end if;
    txt := btrim(raw #>> '{}');
    if p_field = 'blurb'        and char_length(txt) not between 20 and 1500 then return; end if;
    if p_field = 'approach'     and char_length(txt) not between 1 and 600 then return; end if;
    if p_field = 'parking_note' and char_length(txt) not between 5 and 400 then return; end if;
    if p_field = 'rock'         and char_length(txt) not between 1 and 40 then return; end if;
    if p_field = 'aspect'       and txt not in ('N','NE','E','SE','S','SW','W','NW','varies') then return; end if;
    if p_field = 'blurb'        then update areas set blurb = txt where id = p_area_id and blurb is distinct from txt; end if;
    if p_field = 'approach'     then update areas set approach = txt where id = p_area_id and approach is distinct from txt; end if;
    if p_field = 'parking_note' then update areas set parking_note = txt where id = p_area_id and parking_note is distinct from txt; end if;
    if p_field = 'rock'         then update areas set rock = txt, rock_basis = 'stated' where id = p_area_id and rock is distinct from txt; end if;
    if p_field = 'aspect'       then update areas set aspect = txt where id = p_area_id and aspect is distinct from txt; end if;
  elsif p_field = 'parking_pin' then
    if jsonb_typeof(raw) <> 'object' or jsonb_typeof(raw->'lat') <> 'number' or jsonb_typeof(raw->'lng') <> 'number' then return; end if;
    plat := (raw->>'lat')::double precision;
    plng := (raw->>'lng')::double precision;
    if plat not between -90 and 90 or plng not between -180 and 180 or plat = 0 or plng = 0 then return; end if;
    pname := case when jsonb_typeof(raw->'name') = 'string' then nullif(btrim(raw->>'name'), '') end;
    if pname is not null and char_length(pname) > 60 then return; end if;
    pname := coalesce(pname, a.parking_name, 'Parking');
    update areas set parking_lat = plat, parking_lng = plng, parking_name = pname
     where id = p_area_id
       and (parking_lat is distinct from plat or parking_lng is distinct from plng or parking_name is distinct from pname);
  elsif p_field = 'approach_min' then
    if jsonb_typeof(raw) = 'number' then num := (raw #>> '{}')::numeric;
    elsif jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') ~ '^\d{1,4}$' then num := (btrim(raw #>> '{}'))::numeric;
    else return; end if;
    if num < 1 or num > 600 then return; end if;
    update areas set approach_min = num::int where id = p_area_id and approach_min is distinct from num::int;
  elsif p_field = 'elevation_ft' then
    -- whole feet, below sea level to just over Everest (the sheet converts metres first)
    if jsonb_typeof(raw) = 'number' then num := (raw #>> '{}')::numeric;
    elsif jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') ~ '^-?\d{1,5}$' then num := (btrim(raw #>> '{}'))::numeric;
    else return; end if;
    if num < -300 or num > 29100 then return; end if;
    update areas set elevation_ft = round(num)::int where id = p_area_id and elevation_ft is distinct from round(num)::int;
  elsif p_field = 'season_months' then
    if jsonb_typeof(raw) <> 'array' then return; end if;
    select array_agg(x order by x) into months
      from (select distinct (e #>> '{}')::smallint as x from jsonb_array_elements(raw) e where jsonb_typeof(e) = 'number') s;
    if months is null or not months_ok(months) then return; end if;
    update areas set season_months = months where id = p_area_id and season_months is distinct from months;
  end if;
end;
$$;
revoke all on function public.apply_approved_area_field(text, text) from public, anon, authenticated;

-- ── 3. the notice names it ──
create or replace function public.area_field_label(p_field text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case p_field
    when 'blurb' then 'About this area' when 'approach' then 'Walk in' when 'approach_min' then 'Walk-in time'
    when 'parking_note' then 'Drive & park' when 'parking_pin' then 'Parking pin' when 'rock' then 'Rock' when 'aspect' then 'Faces'
    when 'season_months' then 'Season' when 'elevation_ft' then 'Elevation' else p_field end;
$$;

-- ── 4. the value an approval replaces is captured ──
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
    when 'elevation_ft'  then to_jsonb(a.elevation_ft)
    when 'parking_pin'   then case when a.parking_lat is null then null
                              else jsonb_build_object('lat', a.parking_lat, 'lng', a.parking_lng, 'name', a.parking_name) end
  end
  from areas a where a.id = p_area_id;
$$;
revoke all on function public._area_field_value(text, text) from public, anon, authenticated;

-- ── 5. it is checked when it is sent ──
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
    ('bolts', 0, 300, 'bolts'), ('pads', 0, 20, 'pads'), ('approach_min', 1, 600, 'minutes'), ('elevation_ft', -300, 29100, 'ft')
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

-- ── 6. taking an approval back restores it ──
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
        elevation_ft  = case when c.field = 'elevation_ft'  then (prior #>> '{}')::int else elevation_ft end,
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

-- ── 7. the reviewer can approve it ──
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
    if c.field not in ('blurb','approach','approach_min','parking_note','parking_pin','rock','aspect','season_months','elevation_ft') then raise exception 'unknown area field: %', c.field; end if;
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

commit;
