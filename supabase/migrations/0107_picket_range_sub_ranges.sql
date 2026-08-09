-- 0107: the Northern and Southern Pickets were hollow shells, exactly as the three
-- Washington Pass groups were in 0106 — same mechanism, larger blast radius.
--
-- ── WHAT WAS WRONG ───────────────────────────────────────────────────────────
-- `wa_northern_pickets` had route_count 0 and held two rows, both empty. Its sibling
-- `wa_southern_pickets` held one real buttress and two empty rows. Meanwhile ALL 33 real
-- Picket summits — every one of them, carrying 69 routes — were flat children of
-- `wa_picket_range`. So the two most famous sub-ranges in the North Cascades named
-- nothing, and Mount Terror, Inspiration Peak, Fury and Challenger sat in an undivided
-- list beside satellites 20 km away.
--
-- Same two-load mechanism as 0106: an OpenBeta-derived crag tree supplied the sub-range
-- rows plus hollow `crag` stubs, and a separate alpine peak list attached every summit
-- flat to the range above. Four of those stubs duplicate a peak that exists properly:
--
--   wa_crooked_thumb                      0 rt  ->  wa_crooked_thumb_peak (2 rt)   21 m
--   wa_mt_fury (region) + wa_east_peak    0 rt  ->  wa_mount_fury_east    (3 rt)  370 m
--   wa_rake_the                           0 rt  ->  wa_the_rake           (1 rt)
--   wa_chopping_block_pinnacle_peak_the   0 rt  ->  wa_the_chopping_block (3 rt)
--
-- ── WHERE THE LINE IS DRAWN, AND WHY IT IS NOT COORDINATES ───────────────────
-- The range divides at Picket Pass. There is a clean latitude gap in the data — the
-- northern crest sits 48.810–48.858 N, the southern 48.755–48.777 N, with nothing
-- between 48.7766 and 48.7976 — but latitude is NOT the authority here and must not be
-- used as one: FIVE Southern Picket peaks share the identical placeholder coordinate
-- 48.76800 / -121.28800, and Swiss Peak has no coordinates at all. Membership below is
-- the standard guidebook division of the range; the gap is only a sanity check that
-- nothing in the list is on the wrong side of the pass.
--
-- Swiss Peak (no coordinates) is placed on our OWN prior research, not on geometry:
-- 0097's prominence audit already records it as "Swiss Peak (7,988 ft, Northern
-- Pickets)".
--
-- ── EIGHT PEAKS DELIBERATELY LEFT ON THE RANGE ───────────────────────────────
-- Mount Crowder, Mount Prophet, Elephant Butte, Indian Mountain, Mount Triumph, Mount
-- Despair, Davis Peak, Berdeen Peak. These are satellites in the wider Picket region, not
-- on either crest — Prophet, Elephant Butte and Davis sit 6–10 km EAST of the crest line,
-- Berdeen 8 km west, Triumph and Despair well south. Mount Crowder is the genuinely
-- arguable one: it falls in the latitude gap at 48.7976, across McMillan Creek from both
-- crests, and sources put it with the Northern Pickets or in neither. It is left on the
-- range because a wrong confident answer is worse than an honest undivided one, and
-- because nothing renders differently for a peak that is a direct child of the range.
--
-- ── WHY EACH MOVE IS SAFE ────────────────────────────────────────────────────
-- Verified against the live DB immediately before writing this: all 25 moved rows are
-- childless leaves, and wa_northern_pickets / wa_southern_pickets / wa_picket_range each
-- hold ZERO direct routes — so trg_areas_leaf_xor (0001) passes and no ltree cascade is
-- needed (contrast 0097). Every move stays inside wa_picket_range, so only the two
-- sub-range rows change subtree membership.
--
-- Ed Wood Memorial Buttress is KEPT where it is: it is a real buttress with a real route
-- ("Plan 9 from Outer Space"), not a stub.

-- ── 1. Northern Pickets (11 summits, 24 routes) ──────────────────────────────
update areas set parent_id = 'wa_northern_pickets'
 where id in ('wa_whatcom_peak','wa_mount_challenger','wa_luna_peak','wa_crooked_thumb_peak',
              'wa_poltergeist_pinnacle','wa_spectre_peak','wa_ghost_peak','wa_phantom_peak',
              'wa_mount_fury_west','wa_mount_fury_east','wa_swiss_peak');

-- ── 2. Southern Pickets (14 summits, 30 routes) ──────────────────────────────
update areas set parent_id = 'wa_southern_pickets'
 where id in ('wa_mount_terror','wa_the_rake','wa_himmelhorn','wa_ottohorn','wa_frenzel_spitz',
              'wa_west_twin_needle','wa_east_twin_needle','wa_inspiration_peak',
              'wa_mcmillan_spire_west','wa_east_mcmillan_spire','wa_mount_degenhardt',
              'wa_little_mac_spire','wa_the_pyramid_picket','wa_the_chopping_block');

-- ── 3. Drop the four hollow duplicates ───────────────────────────────────────
-- Each guarded on its populated twin existing, per 0102 — a duplicate flag is a
-- hypothesis, and the last unguarded one destroyed the only copy of Triple Couloirs. Each
-- also asserts the row it removes holds no routes, so a stub that has since gained one is
-- left alone rather than silently deleted.
--
-- wa_east_peak goes BEFORE wa_mt_fury: it is that region's only child, and areas.parent_id
-- is a foreign key, so deleting the parent first would fail.
delete from areas where id = 'wa_east_peak'
  and not exists (select 1 from routes where area_id = 'wa_east_peak')
  and not exists (select 1 from areas where parent_id = 'wa_east_peak')
  and exists (select 1 from areas k where k.id = 'wa_mount_fury_east' and k.route_count > 0);

delete from areas where id = 'wa_mt_fury'
  and not exists (select 1 from routes where area_id = 'wa_mt_fury')
  and not exists (select 1 from areas where parent_id = 'wa_mt_fury')
  and exists (select 1 from areas k where k.id = 'wa_mount_fury_west' and k.route_count > 0);

delete from areas where id = 'wa_crooked_thumb'
  and not exists (select 1 from routes where area_id = 'wa_crooked_thumb')
  and not exists (select 1 from areas where parent_id = 'wa_crooked_thumb')
  and exists (select 1 from areas k where k.id = 'wa_crooked_thumb_peak' and k.route_count > 0);

delete from areas where id = 'wa_rake_the'
  and not exists (select 1 from routes where area_id = 'wa_rake_the')
  and not exists (select 1 from areas where parent_id = 'wa_rake_the')
  and exists (select 1 from areas k where k.id = 'wa_the_rake' and k.route_count > 0);

delete from areas where id = 'wa_chopping_block_pinnacle_peak_the'
  and not exists (select 1 from routes where area_id = 'wa_chopping_block_pinnacle_peak_the')
  and not exists (select 1 from areas where parent_id = 'wa_chopping_block_pinnacle_peak_the')
  and exists (select 1 from areas k where k.id = 'wa_the_chopping_block' and k.route_count > 0);

-- ── 4. Recount the two sub-ranges ────────────────────────────────────────────
-- route_count is trigger-maintained on the ROUTES table (0001) and does NOT recompute when
-- an AREA's parent_id changes. Recount, never arithmetic: 0097 predicted 106 from two
-- cached numbers and the truth was 103.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_northern_pickets','wa_southern_pickets');

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- Do not append these to the paste above. The SQL Editor runs a pasted script as ONE
-- transaction, and an error in a read-only SELECT rolls back the writes before it — that
-- is how 0097's six correct UPDATEs were undone. Cast path to text; there is no ltree form
-- of the `!~` regex operator and it raises 42883.
--
--   select name, route_count from areas where parent_id = 'wa_northern_pickets' order by name;
--   -- expect 11 rows, no crag stubs among them
--
--   select name, route_count from areas where parent_id = 'wa_southern_pickets' order by name;
--   -- expect 15 rows: 14 summits + Ed Wood Memorial Buttress
--
--   select id from areas where id in ('wa_crooked_thumb','wa_rake_the','wa_mt_fury',
--                                     'wa_east_peak','wa_chopping_block_pinnacle_peak_the');
--   -- expect 0 rows
--
--   select id, route_count from areas
--     where id in ('wa_northern_pickets','wa_southern_pickets','wa_picket_range') order by id;
--   -- expect roughly northern 24, southern 31, and wa_picket_range UNCHANGED at 69.
--   -- The recounts are authoritative if they disagree. picket_range moving at all would
--   -- mean a route left the subtree and is a real problem.
--
--   select count(*) from areas where parent_id = 'wa_picket_range';
--   -- expect 10: 8 satellite peaks + the two sub-range rows
--
--   -- then, from the repo:  npm run check:counts   and   npm run audit:area-parents
