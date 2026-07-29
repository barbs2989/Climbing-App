-- Mount Adams — remove two duplicate rows for the standard South Climb.
--
-- Run this AFTER the merge, which has already been applied (scripts/adams-merge-south.mjs).
-- The merge copied south_spur's 18 unique fields onto south_climb and unioned hazards and
-- gear, so nothing below is still needed by the surviving row.
--
-- WHY: the live catalogue had three rows for Mount Adams' one standard route.
--
--   wa_mount_adams_south_climb   "South Climb (South Spur)"    19.3 km  6700 ft   <- KEEP
--   wa_mount_adams_south_spur    "South Spur Route"             9.2 km  6676 ft   <- delete
--   wa_mount_adams_south_side    "Mount Adams - South Side"      null    null     <- delete
--
-- south_spur's own overview reads "The South Spur (also called the South Climb) is Mount
-- Adams' standard, non-technical route", so it is the same line under its other name.
-- south_climb survives because it carries a genuine 166-point GPX track against south_spur's
-- 5, and because the merge moved south_spur's 18 unique fields onto it.
--
-- NOT because of its distance. An earlier version of this comment claimed 19.3 km was the
-- right figure "because it matches the real ~12.5 mi round trip". That is backwards:
-- dist_km IS the one-way distance, and the route page doubles it (roundTripKm = distKm * 2,
-- ClimbMatch.jsx). 9.2 km one-way renders as 11.4 mi round trip, correct for a climb quoted
-- at 12.5-14 mi. 19.3 would render as 24 mi round trip. dist_km on the keeper is 9.2 and
-- belongs there. south_side had 3 of 22 fields populated and no discipline, grade,
-- distance, gain, hazards or track — a stub.
--
-- These DELETEs are deliberately left for a human. A wrong DELETE in this table destroyed
-- Triple Couloirs once already; the SELECT below is here so you can eyeball the rows first.

-- 1. LOOK BEFORE YOU CUT: expect exactly the two rows named above, and confirm the keeper
--    still holds the merged content. If this doesn't match, stop.
select id, name, dist_km, gain_ft,
       array_length(hazards, 1) as hazards,
       array_length(gear, 1)    as gear,
       jsonb_array_length(to_jsonb(gpx)) as gpx_points,
       grade
from routes
where id in ('wa_mount_adams_south_climb','wa_mount_adams_south_spur','wa_mount_adams_south_side')
order by id;

-- 2. PRE-FLIGHT GUARD, then the deletes — one transaction, so a failed guard rolls the
--    whole thing back.
--
--    Deleting a route is not confined to the routes table. Three tables cascade off
--    routes(id), so their rows are DESTROYED silently:
--
--      contributions.route_id     on delete cascade   -- user-submitted fixes
--      topo_lines.route_id        on delete cascade   -- user-drawn topo lines
--      gps_submissions.route_id   on delete cascade   -- submitted GPS tracks
--
--    Three more hold route_id as a loose text column with no FK (deliberately — see
--    0031/0036/0037), so their rows SURVIVE but are left pointing at an id that no longer
--    exists:
--
--      objectives.route_id        -- someone's saved objective
--      crews.route_id             -- a trip party organised around this route
--      climb_logs.route_id        -- a logged ascent
--
--    All six were 0 when this was written, so the deletes were safe then. That is a
--    point-in-time fact, not a property of the data: one wishlist tap or GPS submission
--    against south_spur between then and now changes it, and step 4's verify inspects only
--    routes and route_count, so it would pass either way. Hence a guard that checks at run
--    time rather than a note trusting that someone checked once.
--
--    The guard runs INSIDE the transaction on purpose: raising in there aborts it, every
--    statement after it fails, and COMMIT becomes a rollback. Outside, a SQL editor that
--    autocommits per statement would happily run the deletes after the guard complained.
begin;

do $$
declare
  n_contrib int; n_topo int; n_gps int; n_obj int; n_crew int; n_logs int; n_total int;
  doomed text[] := array['wa_mount_adams_south_spur','wa_mount_adams_south_side'];
begin
  select count(*) into n_contrib from contributions   where route_id = any(doomed);
  select count(*) into n_topo    from topo_lines      where route_id = any(doomed);
  select count(*) into n_gps     from gps_submissions where route_id = any(doomed);
  select count(*) into n_obj     from objectives      where route_id = any(doomed);
  select count(*) into n_crew    from crews           where route_id = any(doomed);
  select count(*) into n_logs    from climb_logs      where route_id = any(doomed);
  n_total := n_contrib + n_topo + n_gps + n_obj + n_crew + n_logs;

  if n_total > 0 then
    raise exception
      'ABORTED — % row(s) still reference the duplicates. Would be DESTROYED: contributions=%, topo_lines=%, gps_submissions=%. Would be ORPHANED: objectives=%, crews=%, climb_logs=%. Re-point these at wa_mount_adams_south_climb (or remove them) before deleting.',
      n_total, n_contrib, n_topo, n_gps, n_obj, n_crew, n_logs;
  end if;

  raise notice 'Pre-flight OK — nothing references the duplicate rows.';
end $$;

delete from routes where id = 'wa_mount_adams_south_spur';
delete from routes where id = 'wa_mount_adams_south_side';

-- 3. Fix the cached count on the area. It read 12 and the peak really has 10 routes after
--    this; recompute rather than hardcoding, so it stays right if other rows changed.
update areas a
set route_count = (select count(*) from routes r where r.area_id = a.id)
where a.id = 'wa_mount_adams';

commit;

-- 4. VERIFY: expect one row (the keeper), and route_count = 10.
-- If these result tables don't appear, your paste was truncated.
select id, name, dist_km, gain_ft, grade,
       array_length(hazards, 1) as hazards
from routes
where area_id = 'wa_mount_adams' and lower(name) like '%south%'
order by id;

select id, name, route_count from areas where id = 'wa_mount_adams';
