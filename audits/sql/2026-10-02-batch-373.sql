-- WA alpine audit batch 373 (pass 6)
-- Routes: wa_the_monk_west_cracks_right_crack, wa_the_needle_neve_glacier,
-- wa_the_pleiades_scramble, wa_the_pyramid_picket_east_ridge,
-- wa_the_pyramid_picket_south_route, wa_the_rake_traverse_route, wa_the_roof,
-- wa_the_scoop_2, wa_the_temple_south_ridge, wa_the_tipping_point
--
-- This batch found an unusual concentration of SILENT REVERSIONS: four
-- separately-researched fixes from earlier passes (batch 107 on 2026-08-13,
-- batch 236 on 2026-09-08) have reappeared on the live rows exactly as they
-- read before those fixes, with no intervening log entry recording anyone
-- changing them back. Re-applying the same already-cited sourcing rather
-- than re-deriving it. This is the same class of drift CLAUDE.md and this
-- log already document for Dorado Needle's dist_km and The Brothers'
-- elevation_ft -- worth a human checking whether something is restoring
-- `routes`/`areas` from a stale snapshot.

-- wa_the_monk_west_cracks_right_crack: high_point_ft reverted to 8606
-- (Cathedral Peak's own summit elevation) from the 8300 batch 107
-- (2026-08-13) corrected it to, sourced from this exact row's own "The Monk
-- (tower top)" Topout waypoint (elev 8300) and its own approach text ("The
-- Monk is a distinct, smaller detached tower/buttress leaning against
-- Cathedral Peak's south/east flank, not part of the main South Face wall").
-- The waypoint still reads 8300, confirming the summit-collision defect
-- batch 107 found has resurfaced on high_point_ft alone. Re-applying that
-- fix verbatim.
UPDATE routes SET high_point_ft = 8300
WHERE id = 'wa_the_monk_west_cracks_right_crack' AND high_point_ft = 8606;

-- wa_the_pleiades_scramble: access.land_manager reverted to the pre-batch-107
-- text claiming "some upper routes cross into North Cascades National Park."
-- Mount Larrabee (whose east ridge carries the Pleiades) sits west of the
-- NCNP boundary; this same row's own `permit` field and the sibling
-- `access.landManager` (camelCase) key both already correctly describe this
-- as entirely Mount Baker Wilderness / USFS land. Re-applying batch 107's
-- correction verbatim.
UPDATE routes SET access = jsonb_set(access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness; entirely National Forest land, does not cross into North Cascades National Park."'::jsonb)
WHERE id = 'wa_the_pleiades_scramble'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park';

-- wa_the_rake_traverse_route: high_point_ft reverted to 7869 from the 7840
-- batch 236 (2026-09-08) corrected it to. This row's own "The Rake" Summit
-- waypoint still reads elevFt 7840 and matches the wa_the_rake area row's
-- lat/lng exactly; batch 236 additionally cited Peakbagger, StephAbegg's
-- Pickets trip-report index, and a Wikipedia Picket Range peak list all
-- independently giving 7,840 ft, with no source found for 7,869.
UPDATE routes SET high_point_ft = 7840
WHERE id = 'wa_the_rake_traverse_route' AND high_point_ft = 7869;

-- Same route: dist_km reverted to 25.7 (a round-trip figure under the app's
-- one-way*2 display convention -- would render as a false 31.9 mi round
-- trip) from the 13.0 batch 236 corrected it to, matching this row's own
-- "The Rake" summit waypoint distMi (8.07 mi one-way = 12.99 km) and its own
-- itinerary.totalNote ("roughly 16 miles ... round trip").
UPDATE routes SET dist_km = 13.0
WHERE id = 'wa_the_rake_traverse_route' AND dist_km = 25.7;

-- wa_the_rake (area row): elevation_ft has never been corrected to match the
-- 7840 ft figure batch 236 already established for this same peak (via this
-- route's own waypoint plus Peakbagger/StephAbegg/Wikipedia agreement) --
-- only the route row was fixed at the time. Bringing the area row into
-- agreement with its own route and the external sourcing already cited.
UPDATE areas SET elevation_ft = 7840
WHERE id = 'wa_the_rake' AND elevation_ft = 7869;

-- wa_the_roof: gain_ft/loss_ft reverted to 2397/2397 from the 2571/2571
-- batch 236 corrected them to. This row's own waypoints still give trailhead
-- 4400 ft and summit (Unicorn Peak) 6971 ft -- a net rise of 2571 ft, which
-- 2397 falls 174 ft short of (an impossible-gain violation). Batch 236 also
-- found 2397 is exactly 6971 minus 4574, the trailhead elevation of a
-- *different* sibling route on the same peak (wa_unicorn_peak_r1), and cited
-- external search giving ~2,667 ft for the standard approach, comfortably
-- above the corrected floor.
UPDATE routes SET gain_ft = 2571, loss_ft = 2571
WHERE id = 'wa_the_roof' AND gain_ft = 2397 AND loss_ft = 2397;

-- wa_the_pyramid_picket_east_ridge: permit is NULL. This route only ever
-- existed as a documented leg of the 2003 Southern Pickets Enchainment
-- (Wallace/Haley/Bunker) up the same peak -- The Pyramid -- as its sibling
-- wa_the_pyramid_picket_south_route, which already carries the researched
-- permit text for this exact zone (walk-up-only NPS backcountry permit,
-- Marblemount Wilderness Information Center). Filled with that sibling's
-- already-established wording rather than inventing new phrasing, matching
-- the access.landManager value this row already independently carries
-- (North Cascades National Park Service Complex / Stephen Mather
-- Wilderness, same zone).
UPDATE routes SET permit = 'NPS wilderness/backcountry permit required for any overnight stay in Terror Basin or Crescent Creek Basin; both are walk-up-only cross-country zones, so pick the permit up in person at the Marblemount Wilderness Information Center the day of or the day before your trip.'
WHERE id = 'wa_the_pyramid_picket_east_ridge' AND permit IS NULL;

-- Same route: high_point_ft is NULL. The route's own overview states it was
-- climbed "as the 5th of 14 summits" of the Southern Pickets Enchainment,
-- i.e. it tops out on The Pyramid's own summit -- the same summit its
-- sibling wa_the_pyramid_picket_south_route and the wa_the_pyramid_picket
-- area row both already give as 7,920 ft. Filled from that already-verified
-- shared summit elevation rather than inventing a route-specific figure.
UPDATE routes SET high_point_ft = 7920
WHERE id = 'wa_the_pyramid_picket_east_ridge' AND high_point_ft IS NULL;

-- wa_the_scoop_2: permit is NULL, the same gap batch 337 (2026-09-25) found
-- and fixed on this exact peak's wa_milk_n_honey (both climb Colchuck
-- Balanced Rock via the Stuart Lake/Colchuck Lake Trailhead, the same
-- Enchantment Permit Area trailhead this row's own access.permit field
-- already describes). Batch 337 separately flagged a dozen other
-- Colchuck-Balanced-Rock routes sharing this gap as out of that pass's scope
-- (discipline='rock' at the time); wa_the_scoop_2 is tagged alpine in the
-- live schema now, bringing it into this audit's scope. Filled with the
-- app's own established wording for this permit zone.
UPDATE routes SET permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.'
WHERE id = 'wa_the_scoop_2' AND permit IS NULL;

-- wa_the_tipping_point: same NULL-permit gap as wa_the_scoop_2 above, same
-- peak (Colchuck Balanced Rock), same fix.
UPDATE routes SET permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.'
WHERE id = 'wa_the_tipping_point' AND permit IS NULL;
