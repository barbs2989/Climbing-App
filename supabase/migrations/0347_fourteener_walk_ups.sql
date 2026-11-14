-- A walk-up on four Colorado fourteeners that had none, so a hiker's climb can tick them.
--
-- FOUND (2026-10-22) while checking that every Colorado Centennials peak can be ticked: Handies, Bierstadt,
-- Mount Blue Sky (Evans) and Quandary hold only bouldering, ice, snow couloirs and technical lines in
-- their whole subtree. Each is a CONTAINER (its climbs sit on sub-areas), so trg_areas_leaf_xor forbids a
-- route on the peak itself; the walk-up goes on a sub-area of its own, as 0345 did for Half Dome.
--
-- Each is the peak's standard route, the most-climbed line on the mountain: Handies from American Basin,
-- Bierstadt from Guanella Pass, Blue Sky from Summit Lake, Quandary's east ridge. (Pikes was checked too:
-- its East Slopes is already filed under Pike's Peak Routes, which the roster's `also` now counts.)
-- The sub-area carries the summit coordinate, so 0216's trigger can tell two "Standard Route" sub-areas
-- apart by distance rather than reading them as one place. Class -> discipline as in 0137.
--
-- The 14ers roster in lib/lists.js lists each peak's sub-areas in `also`, so a climb on any of them ticks
-- the peak. Re-runnable: ON CONFLICT DO NOTHING. REPLAY: returns early on an empty database.

do $replay$ begin
if not exists (select 1 from areas where id = 'co_quandary_peak') then
  raise notice '0347: catalog not loaded, nothing to add'; return;
end if;

insert into areas (id, name, parent_id, area_type, lat, lng) values
  ('co_handies_peak_standard_route', 'Standard Route', 'co_handies_peak', 'crag', 37.913, -107.5044),
  ('co_mt_bierstadt_standard_route', 'Standard Route', 'co_mt_bierstadt', 'crag', 39.5826, -105.6689),
  ('co_mt_evans_standard_route', 'Standard Route', 'co_mt_evans', 'crag', 39.5883, -105.6436),
  ('co_quandary_peak_standard_route', 'Standard Route', 'co_quandary_peak', 'crag', 39.3973, -106.1064)
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, grade_system, description) values
  ('co_handies_peak_standard_route_southwest_slopes', 'co_handies_peak_standard_route', 'Southwest Slopes', 'scrambling', 'Class 1', 'class',
   'A trail from American Basin past Sloan Lake to the summit ridge; the shortest way up a San Juan fourteener.'),
  ('co_mt_bierstadt_standard_route_west_slopes', 'co_mt_bierstadt_standard_route', 'West Slopes', 'scrambling', 'Class 2', 'class',
   'A trail from Guanella Pass across the willows and up the west slopes, with easy talus at the top.'),
  ('co_mt_evans_standard_route_west_ridge', 'co_mt_evans_standard_route', 'West Ridge', 'scrambling', 'Class 2', 'class',
   'From Summit Lake over Mount Spalding and along the west ridge, with talus scrambling near the top.'),
  ('co_quandary_peak_standard_route_east_ridge', 'co_quandary_peak_standard_route', 'East Ridge', 'scrambling', 'Class 1', 'class',
   'A trail up the broad east ridge from the Blue Lakes road; one of the most-climbed fourteeners.')
on conflict (id) do nothing;

end $replay$;
