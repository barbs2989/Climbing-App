-- WA hierarchy fixes, round 2 (2026-07-18). Verified against live DB immediately before
-- writing these; run all of it in one go in the Supabase SQL editor.
-- Claude's own attempt to execute these directly was blocked by the auto-mode classifier
-- as too structural to make unprompted -- same pattern as the Bulls Tooth fix.

-- =========================================================================
-- FIX 1: Sloan Peak's own blurb already says it's in "Mount Baker-Snoqualmie
-- National Forest's Henry M. Jackson Wilderness" but it's structurally filed under
-- the sibling "Glacier Peak Wilderness" area instead. That wilderness doesn't exist
-- yet as its own area -- create it as a sibling of Glacier Peak Wilderness (same
-- parent, same shape), then move Sloan Peak (and its 5 routes) into it.
-- =========================================================================
insert into areas (id, name, parent_id, path, area_type, region, route_count)
values (
  'wa_henry_m_jackson_wilderness', 'Henry M. Jackson Wilderness', 'wa_glacier_peak_region',
  'usa.washington.wa_northwest.wa_glacier_peak_region.wa_henry_m_jackson_wilderness',
  'region', 'Washington', 5
);

update areas set parent_id = 'wa_henry_m_jackson_wilderness',
  path = 'usa.washington.wa_northwest.wa_glacier_peak_region.wa_henry_m_jackson_wilderness.wa_sloan_peak'
  where id = 'wa_sloan_peak';

update areas set route_count = route_count - 5 where id = 'wa_glacier_peak_wilderness'; -- 8 -> 3
-- wa_glacier_peak_region and above: unaffected, Sloan stays in the same subtree either way.


-- =========================================================================
-- FIX 2: Agnes Mountain is filed under "Darrington and Mountain Loop Hwy" (west side,
-- Snohomish County) but every source places it in the Agnes Creek/Stehekin drainage
-- (east side, Chelan County, reached only via the Lake Chelan ferry) -- a real
-- wa_stehekin area already exists and already holds a real peak (Flora Mountain).
-- =========================================================================
update areas set parent_id = 'wa_stehekin',
  path = 'usa.washington.wa_centraleast.wa_stehekin.wa_agnes_mountain'
  where id = 'wa_agnes_mountain';

update areas set route_count = route_count - 1 where id = 'wa_glacier_peak_region'; -- 174 -> 173
update areas set route_count = route_count - 1 where id = 'wa_northwest';           -- 1026 -> 1025
update areas set route_count = route_count + 1 where id = 'wa_stehekin';            -- 14 -> 15
update areas set route_count = route_count + 1 where id = 'wa_centraleast';         -- 1958 -> 1959


-- =========================================================================
-- FIX 3: Mount Cruiser, Mount Skokomish, and Mount Lincoln are all filed under
-- "North-Central Olympic Mountains (Deception-Gray Wolf)" -- a real, legitimate
-- bucket for peaks like Mount Anderson/Mount Duckabush/Gray Wolf Ridge, reached via
-- the Dosewallips/Gray Wolf drainages. But all three of these peaks' OWN blurbs
-- describe a completely different place: Sawtooth Ridge / Mount Skokomish
-- Wilderness, reached via the Staircase entrance on Hood Canal, 25-30+ miles south.
-- (Mount Cruiser's blurb even says it sits "between Mount Lincoln and Mount
-- Skokomish" -- all three belong together.) No Southern Olympics bucket exists yet,
-- so create one as a sibling of the other Olympic sub-regions.
-- =========================================================================
insert into areas (id, name, parent_id, path, area_type, region, route_count)
values (
  'wa_southern_olympics', 'Southern Olympic Mountains (Mount Skokomish Wilderness)', 'wa_olympic_np',
  'usa.washington.wa_olympics.wa_olympic_np.wa_southern_olympics',
  'region', 'Washington', 4
);

update areas set parent_id = 'wa_southern_olympics',
  path = 'usa.washington.wa_olympics.wa_olympic_np.wa_southern_olympics.wa_mount_cruiser'
  where id = 'wa_mount_cruiser';
update areas set parent_id = 'wa_southern_olympics',
  path = 'usa.washington.wa_olympics.wa_olympic_np.wa_southern_olympics.wa_mount_skokomish'
  where id = 'wa_mount_skokomish';
update areas set parent_id = 'wa_southern_olympics',
  path = 'usa.washington.wa_olympics.wa_olympic_np.wa_southern_olympics.wa_mount_lincoln'
  where id = 'wa_mount_lincoln';

update areas set route_count = route_count - 4 where id = 'wa_north_central_olympics'; -- 26 -> 22
-- wa_olympic_np and above: unaffected, all three stay in the same subtree either way.


-- =========================================================================
-- FIX 4: "Ragged Ridge" (route wa_ragged_ridge) is filed under Red Mountain
-- (Snoqualmie Pass) but it's a real, distinct North Cascades traverse across
-- Katsuk/Kimtah/Cosho Peaks, 50+ miles north -- no source ties it to this Red
-- Mountain. A "wa_alpine_and_technical_traverses" bucket already exists for
-- exactly this kind of multi-peak traverse route (it already holds the Ptarmigan
-- Traverse) -- move Ragged Ridge there instead of guessing a single peak to attach
-- it to.
-- =========================================================================
update routes set area_id = 'wa_alpine_and_technical_traverses' where id = 'wa_ragged_ridge';

update areas set route_count = route_count - 1 where id = 'wa_red_mountain_snoqualmie'; -- 4 -> 3
update areas set route_count = route_count - 1 where id = 'wa_snoqualmie_i90_region';   -- 63 -> 62
update areas set route_count = route_count - 1 where id = 'wa_centralwest';             -- 2062 -> 2061
update areas set route_count = route_count + 1 where id = 'wa_alpine_and_technical_traverses'; -- 1 -> 2
update areas set route_count = route_count + 1 where id = 'wa_north_cascades';          -- 102 -> 103
update areas set route_count = route_count + 1 where id = 'wa_hwy20_ncnp';              -- 403 -> 404
update areas set route_count = route_count + 1 where id = 'wa_northwest';               -- 1025 -> 1026 (net after fix 2's -1 above)


-- =========================================================================
-- Verify afterward (expect the values noted in each comment above):
-- =========================================================================
select id, name, parent_id, path, route_count from areas where id in (
  'wa_henry_m_jackson_wilderness','wa_glacier_peak_wilderness','wa_sloan_peak',
  'wa_agnes_mountain','wa_stehekin','wa_glacier_peak_region','wa_centraleast',
  'wa_southern_olympics','wa_mount_cruiser','wa_mount_skokomish','wa_mount_lincoln','wa_north_central_olympics',
  'wa_red_mountain_snoqualmie','wa_snoqualmie_i90_region','wa_alpine_and_technical_traverses',
  'wa_north_cascades','wa_hwy20_ncnp','wa_centralwest','wa_northwest'
) order by id;
select id, area_id from routes where id = 'wa_ragged_ridge';
