-- WA alpine audit, pass 4, batch 203 (2026-09-05)
-- Routes covered: wa_magic_mountain_northeast_couloir, wa_magic_mountain_south_ridge,
-- wa_magic_mountain_west_ridge, wa_martin_peak_west_ridge, wa_marvin_s_ear,
-- wa_mcmillan_spire_west_southwest_ridge, wa_mcmillan_spire_west_west_ridge,
-- wa_mesahchie_peak_west_ridge

-- wa_martin_peak_west_ridge: fa credited "Everett Darr and Ida Zacher, July 1936" as a
-- joint ascent. Multiple independent sources (Wikipedia's Martin Peak (Washington)
-- article; a 2025 Mazama Bulletin profile, "She Climbs High!") agree that Ida Zacher
-- soloed the first ascent in July 1936 after leaving camp during a Bonanza Peak
-- scouting trip -- Everett Darr was not on the summit with her. She married Everett
-- Darr that same year and later climbed under the name Ida Zacher Darr, which is
-- likely the source of the conflation into a joint credit.
UPDATE routes
SET fa = 'Ida Zacher, solo, July 1936 — she left camp during a Bonanza Peak scouting trip to make the solo first ascent. Not a joint climb with Everett Darr, whom she married later that year (she later climbed as Ida Zacher Darr).'
WHERE id = 'wa_martin_peak_west_ridge'
  AND fa = 'Everett Darr and Ida Zacher, July 1936';

-- wa_mcmillan_spire_west_southwest_ridge and wa_mcmillan_spire_west_west_ridge both
-- store an identical road.name/road.status describing the Ross Lake water
-- taxi / Big Beaver / Access Creek approach -- this is the standard approach to the
-- NORTHERN Pickets (Mount Fury, Luna Peak, Mount Challenger), not to West McMillan
-- Spire, which is in the Southern Pickets. Multiple independent trip-report and
-- guidebook-style sources (WTA, The Mountaineers, Outbound, climberkyle.com) agree the
-- standard approach to West McMillan Spire is via the Goodell Creek trailhead at
-- Newhalem and the unmaintained climbers' trail to Terror Basin -- which is exactly
-- what this app's own approach_logistics.trailhead field and (on the southwest-ridge
-- row) road.driveNote already say for these same two routes. road.driveNote on the
-- west-ridge row was also contaminated with the wrong (Ross Dam/water-taxi) approach,
-- so it is replaced with the correct text already stored, uncontaminated, on its own
-- southwest-ridge sibling at the same trailhead. road.seasonalGate on both rows is left
-- untouched -- it correctly describes SR-20's winter closure east of Newhalem and does
-- not claim a specific (wrong) approach.
UPDATE routes
SET road = road || jsonb_build_object(
  'name', 'Goodell Creek Trailhead / climbers'' path (SR-20 at Newhalem)',
  'status', 'SR-20 to Newhalem is paved and normally open year-round, subject to occasional storm-damage closures further east. From the Goodell Creek group-camp trailhead a long, unmaintained climbers'' path leads to Terror Basin. This is the standard Southern Pickets approach — it does not use the Ross Lake water taxi or the Big Beaver/Access Creek route, which serves the Northern Pickets (Mount Fury, Luna Peak) instead.'
)
WHERE id = 'wa_mcmillan_spire_west_southwest_ridge'
  AND road->>'name' = 'Ross Lake water taxi (from Ross Dam TH off SR-20) to Big Beaver/Access Creek, Southern Pickets';

UPDATE routes
SET road = road || jsonb_build_object(
  'name', 'Goodell Creek Trailhead / climbers'' path (SR-20 at Newhalem)',
  'status', 'SR-20 to Newhalem is paved and normally open year-round, subject to occasional storm-damage closures further east. From the Goodell Creek group-camp trailhead a long, unmaintained climbers'' path leads to Terror Basin. This is the standard Southern Pickets approach — it does not use the Ross Lake water taxi or the Big Beaver/Access Creek route, which serves the Northern Pickets (Mount Fury, Luna Peak) instead.',
  'driveNote', 'From Marblemount, drive east on SR-20 about 14 miles to Newhalem, cross the Skagit River at Goodell Creek, turn onto the paved road at the T, pass the state maintenance facility, then continue on gravel to a fork — the right fork reaches the group campground/trailhead where the climbers'' trail begins on an overgrown former logging grade.'
)
WHERE id = 'wa_mcmillan_spire_west_west_ridge'
  AND road->>'name' = 'Ross Lake water taxi (from Ross Dam TH off SR-20) to Big Beaver/Access Creek, Southern Pickets';
