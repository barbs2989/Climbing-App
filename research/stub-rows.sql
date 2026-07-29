-- Remove 8 empty stub rows on Rainier, Baker and Glacier Peak.
--
-- Every one of these holds exactly five values: id, area_id, name, auto_generated=false,
-- classic=false. No discipline, grade, distance, gain, hazards, gear, track, approach or
-- overview. They render as a route entry that opens a page with nothing on it — a broken
-- promise rather than thin data. All share the "Peak - Route" naming that
-- wa_mount_adams_south_side had, so they look like one bad import.
--
-- Three duplicate a richer row that already exists:
--
--   wa_mount_rainier_camp_muir_standard   "Camp Muir Standard"
--        Camp Muir is the CAMP on the Disappointment Cleaver route, not a route.
--        wa_mount_rainier_disappointment_cleaver already covers it (11/12 fields).
--   wa_mount_rainier_gibraltar_ledge      "Gibraltar Ledge"   (singular)
--        wa_mount_rainier_gibraltar_ledges "Gibraltar Ledges" exists at 12/12.
--   wa_mount_rainier_winthrop_glacier     "Winthrop Glacier"
--        Emmons-Winthrop is one route; wa_mount_rainier_emmons_glacier is named
--        "Emmons-Winthrop Glacier" and sits at 11/12.
--
-- One names a glacier that does not exist:
--
--   wa_mount_baker_crevasse_glacier_route "Crevasse Glacier Route"
--        Baker's glaciers are Coleman, Deming, Easton, Squak, Boulder, Park, Rainbow,
--        Mazama, Roosevelt, Talum and Sherman. There is no Crevasse Glacier.
--
-- Four correspond to real terrain but add nothing while empty. Their names are recorded in
-- stub-rows-notes.md so the genuine routes can be added properly with data, which is the
-- actual fix — not leaving a shell in place:
--
--   wa_mount_baker_southwest_ridge      Baker's southwest aspect is the Easton and Squak
--                                       glacier terrain, both already present as rich rows;
--                                       "Southwest Ridge" is not a route in the guide listings.
--   wa_mount_rainier_nisqually_glacier   The named lines on that glacier are the Nisqually
--                                       Icefall (present, 11/12), Cleaver and Chute.
--                                       "Nisqually Glacier" alone isn't one of them.
--   wa_mount_rainier_puyallup_glacier    The Puyallup Cleaver is a real, rarely-climbed west-
--                                       side route with no other row. Worth ADDING properly.
--   wa_glacier_peak_white_chuck          The White Chuck Glacier route is real and has no
--                                       other row. Worth ADDING properly.
--
-- Left for a human, like the other dedup files.

-- 1. LOOK BEFORE YOU CUT. Expect 8 rows, each with almost every column null. If any of them
--    has real content, stop — the import may have been backfilled since this was written.
select id, name, discipline, grade, dist_km, gain_ft,
       array_length(hazards, 1) as hazards,
       jsonb_array_length(to_jsonb(gpx)) as gpx_points,
       (overview is not null) as has_overview,
       (approach is not null) as has_approach
from routes
where id in (
  'wa_mount_rainier_camp_muir_standard','wa_mount_rainier_gibraltar_ledge',
  'wa_mount_rainier_nisqually_glacier','wa_mount_rainier_puyallup_glacier',
  'wa_mount_rainier_winthrop_glacier','wa_glacier_peak_white_chuck',
  'wa_mount_baker_crevasse_glacier_route','wa_mount_baker_southwest_ridge'
)
order by id;

-- 2. PRE-FLIGHT GUARD, then the deletes, in one transaction. Same guard as the other dedup
--    files: contributions, topo_lines and gps_submissions CASCADE off routes(id) and would be
--    destroyed silently, while objectives, crews and climb_logs hold route_id as loose text
--    and would be left pointing at nothing.
--
--    These are empty rows, so references are unlikely — but "unlikely" is what the guard is
--    for. Someone may have tapped save on Gibraltar Ledge before noticing it was blank.
begin;

do $$
declare
  n_contrib int; n_topo int; n_gps int; n_obj int; n_crew int; n_logs int; n_total int;
  doomed text[] := array[
    'wa_mount_rainier_camp_muir_standard','wa_mount_rainier_gibraltar_ledge',
    'wa_mount_rainier_nisqually_glacier','wa_mount_rainier_puyallup_glacier',
    'wa_mount_rainier_winthrop_glacier','wa_glacier_peak_white_chuck',
    'wa_mount_baker_crevasse_glacier_route','wa_mount_baker_southwest_ridge'];
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
      'ABORTED — % row(s) reference these stubs. Would be DESTROYED: contributions=%, topo_lines=%, gps_submissions=%. Would be ORPHANED: objectives=%, crews=%, climb_logs=%. Re-point or remove them first.',
      n_total, n_contrib, n_topo, n_gps, n_obj, n_crew, n_logs;
  end if;

  raise notice 'Pre-flight OK — nothing references the 8 stub rows.';
end $$;

delete from routes where id in (
  'wa_mount_rainier_camp_muir_standard','wa_mount_rainier_gibraltar_ledge',
  'wa_mount_rainier_nisqually_glacier','wa_mount_rainier_puyallup_glacier',
  'wa_mount_rainier_winthrop_glacier','wa_glacier_peak_white_chuck',
  'wa_mount_baker_crevasse_glacier_route','wa_mount_baker_southwest_ridge'
);

-- 3. Recompute the three affected areas' cached counts.
update areas a
set route_count = (select count(*) from routes r where r.area_id = a.id)
where a.id in ('wa_mount_rainier','wa_mount_baker','wa_glacier_peak');

commit;

-- 4. VERIFY: expect 0 rows from the first query, and Rainier 20 / Baker 9 / Glacier Peak 7.
-- If these result tables don't appear, your paste was truncated.
select id from routes where id in (
  'wa_mount_rainier_camp_muir_standard','wa_mount_rainier_gibraltar_ledge',
  'wa_mount_rainier_nisqually_glacier','wa_mount_rainier_puyallup_glacier',
  'wa_mount_rainier_winthrop_glacier','wa_glacier_peak_white_chuck',
  'wa_mount_baker_crevasse_glacier_route','wa_mount_baker_southwest_ridge'
);

select a.id, a.name, a.route_count,
       (select count(*) from routes r where r.area_id = a.id) as actual
from areas a
where a.id in ('wa_mount_rainier','wa_mount_baker','wa_glacier_peak')
order by a.id;
