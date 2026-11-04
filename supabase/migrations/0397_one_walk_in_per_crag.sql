-- 0397 — ONE WALK-IN PER CRAG, and a queue the owner can approve it from (owner's note: "a way to
-- mark on the map the trail line to get to the crags ... where they need to park and then what trail
-- they need to take to get to the base", sport, trad and bouldering).
--
-- #2532 let a climber trace the walk in from the parking pin to the crag, or upload a recording, and
-- sent it to gps_submissions for review. Three things kept it from ever reaching a climber:
--
--   1. Nothing in the app could approve it. The only approver was the approve-gps-submission edge
--      function, which no screen calls, and gps_submissions' RLS hid pending rows from the owner.
--   2. An approved trail was saved to the ONE climb it was sent from, so the other routes on the
--      same crag (one walk in) still said "No trail to the crag yet". theCrag attaches an approach
--      path to the crag, and every climb there shows it; this does the same.
--   3. A second approved line was APPENDED to the first (`[...existing, ...new]`), so the map drew
--      both walks joined by a straight jump from one's end to the other's start.
--
-- Here:
--   areas.walkin_gpx            the crag's walk in, [[lat,lng],...] from the parking toward the base.
--                               Every crag route on the area that has no recorded line of its own draws it.
--   areas.walkin_kind           'recorded' (a phone or watch track) or 'traced' (tapped on the map),
--                               so the crag map can say which it is.
--   areas.walkin_submission_id  the approved submission it came from.
--   gps_submissions.area_id     the crag an approval wrote to (null: it went to the route).
--   gps_submissions.replaced_gpx the line an approval REPLACED, so any approval can be undone by hand.
--
-- gps_submission_queue()          admin-only: pending submissions, oldest first, with the route, its
--                                 crag, the parking pin and what the approval would replace.
-- review_gps_submission(...)      admin-only: approve (REPLACES the crag's walk in, or the route's
--                                 line) or reject. A line under 10 points is refused: the map draws
--                                 nothing under MIN_RECORDED_PTS (lib/track.js), so approving one
--                                 would tell the climber it went live when no screen shows it.
--
-- ON DELETE SET NULL on both new keys: deleting an area or a submission never deletes the other.

begin;

alter table public.areas add column if not exists walkin_gpx jsonb;
alter table public.areas add column if not exists walkin_kind text;
alter table public.areas add column if not exists walkin_submission_id uuid references public.gps_submissions(id) on delete set null;
alter table public.areas drop constraint if exists areas_walkin_gpx_check;
alter table public.areas add constraint areas_walkin_gpx_check check (
  walkin_gpx is null or (jsonb_typeof(walkin_gpx) = 'array' and jsonb_array_length(walkin_gpx) between 10 and 20000));
alter table public.areas drop constraint if exists areas_walkin_kind_check;
alter table public.areas add constraint areas_walkin_kind_check check (
  (walkin_gpx is null and walkin_kind is null) or (walkin_gpx is not null and walkin_kind in ('recorded', 'traced')));

comment on column public.areas.walkin_gpx is
  'The crag''s walk in from the parking toward the base, [[lat,lng],...] (0397). Written only by review_gps_submission; every crag route on this area with no recorded line of its own draws it on its CRAG MAP.';
comment on column public.areas.walkin_kind is
  'recorded (a phone or watch track) or traced (tapped on the map in Add the trail), 0397.';

alter table public.gps_submissions add column if not exists area_id text references public.areas(id) on delete set null;
alter table public.gps_submissions add column if not exists replaced_gpx jsonb;
create index if not exists gps_submissions_pending_idx on public.gps_submissions (submitted_at) where status = 'pending';

-- The owner counts the queue for the Review badge (useAdminQueueCounts reads gps_submissions directly).
drop policy if exists "admin reads gps submissions" on public.gps_submissions;
create policy "admin reads gps submissions" on public.gps_submissions for select
  using (is_admin((select auth.uid())));

create or replace function public.gps_submission_queue()
returns table (id uuid, submitted_at timestamptz, route_id text, route_name text, discipline text,
               area_id text, area_name text, area_type text, crag_lat double precision, crag_lng double precision,
               parking_lat double precision, parking_lng double precision,
               gpx_data jsonb, points int, device_type text, climber_name text, climb_date date, notes text,
               quality_score int, issues jsonb, area_has_walkin boolean, route_has_gpx boolean)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select s.id, s.submitted_at, s.route_id, r.name, r.discipline,
           r.area_id, a.name, a.area_type, coalesce(r.lat, a.lat), coalesce(r.lng, a.lng),
           a.parking_lat, a.parking_lng,
           s.gpx_data, jsonb_array_length(s.gpx_data), s.device_type, s.climber_name, s.climb_date, s.notes,
           s.quality_score, s.issues, (a.walkin_gpx is not null), (r.gpx is not null and jsonb_typeof(r.gpx) = 'array' and jsonb_array_length(r.gpx) > 0)
      from gps_submissions s
      join routes r on r.id = s.route_id
      left join areas a on a.id = r.area_id
     where s.status = 'pending'
     order by s.submitted_at asc
     limit 100;
end;
$$;
revoke all on function public.gps_submission_queue() from public, anon;
grant execute on function public.gps_submission_queue() to authenticated;
comment on function public.gps_submission_queue() is
  'Admin-only: pending GPS submissions (recorded tracks and traced crag trails), oldest first, with the route, its crag and what an approval would replace (0397).';

create or replace function public.review_gps_submission(p_id uuid, p_action text, p_to_area boolean default false, p_notes text default null)
returns text
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  s gps_submissions%rowtype;
  v_area text;
  v_old jsonb;
  v_by text := nullif(left(coalesce((select email::text from auth.users where id = auth.uid()), ''), 254), '');
  v_notes text := nullif(left(btrim(coalesce(p_notes, '')), 2000), '');
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'Unknown action.' using errcode = 'P0001';
  end if;
  select * into s from gps_submissions where id = p_id for update;
  if not found then
    raise exception 'That submission no longer exists.' using errcode = 'P0001';
  end if;
  if s.status is distinct from 'pending' then
    raise exception 'That submission was already reviewed.' using errcode = 'P0001';
  end if;

  if p_action = 'reject' then
    update gps_submissions set status = 'rejected', admin_notes = coalesce(v_notes, 'Rejected by admin'), updated_at = now() where id = p_id;
    return 'rejected';
  end if;

  if jsonb_typeof(s.gpx_data) <> 'array' or jsonb_array_length(s.gpx_data) < 10 then
    raise exception 'This line has fewer than 10 points, and the map draws nothing under 10. Reject it and ask for a fuller trace.' using errcode = 'P0001';
  end if;

  if p_to_area then
    select area_id into v_area from routes where id = s.route_id;
    if v_area is null then
      raise exception 'This climb is not filed under a crag, so there is nowhere to save the walk in.' using errcode = 'P0001';
    end if;
    select walkin_gpx into v_old from areas where id = v_area for update;
    update areas set walkin_gpx = s.gpx_data,
                     walkin_kind = case when s.device_type = 'Traced on the map' then 'traced' else 'recorded' end,
                     walkin_submission_id = s.id
     where id = v_area;
    update gps_submissions set status = 'approved', approved_at = now(), approved_by = v_by, admin_notes = v_notes,
                               area_id = v_area, replaced_gpx = v_old, updated_at = now()
     where id = p_id;
    return 'approved:area:' || v_area;
  end if;

  select gpx into v_old from routes where id = s.route_id for update;
  -- elev_pts was sampled along the OLD line, so it goes with it; the profile is rebuilt from a new one.
  update routes set gpx = s.gpx_data, elev_pts = null, gps_contributor_name = left(s.climber_name, 80) where id = s.route_id;
  update gps_submissions set status = 'approved', approved_at = now(), approved_by = v_by, admin_notes = v_notes,
                             replaced_gpx = v_old, updated_at = now()
   where id = p_id;
  return 'approved:route:' || s.route_id;
end;
$$;
revoke all on function public.review_gps_submission(uuid, text, boolean, text) from public, anon;
grant execute on function public.review_gps_submission(uuid, text, boolean, text) to authenticated;
comment on function public.review_gps_submission(uuid, text, boolean, text) is
  'Admin-only: approve a GPS submission (REPLACES the crag''s walk in when p_to_area, else the route''s line; the old line is kept in replaced_gpx) or reject it (0397).';

commit;
