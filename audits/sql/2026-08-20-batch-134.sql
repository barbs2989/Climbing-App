-- WA alpine route audit — batch 134 (2026-08-20)
-- Pass 3. Routes audited:
--   wa_jack_mountain_nohokomeen_headwall, wa_jack_mountain_northeast_glacier,
--   wa_jack_mountain_south_face, wa_johannesburg_mountain_cj_couloir,
--   wa_johannesburg_mountain_northeast_buttress, wa_kimtah_peak_scramble,
--   wa_king_kong_gorillas_direct_direct, wa_klawatti_peak_southeast_face
--
-- Confirmed errors below. Everything else in the batch verified clean or flagged
-- in the log for human review (no auto-fix).

-- wa_jack_mountain_south_face: access.seasonal names the WRONG access road.
-- It says "Cascade River Road (the access road for these trailheads)", but this route
-- is approached from the Canyon Creek Trailhead on SR-20 (Jackita Ridge / Crater Mtn /
-- Jerry Lakes) — confirmed by the row's own waypoints, road block (road.name =
-- "State Route 20 / North Cascades Highway"), access.landManager (names Canyon Creek TH),
-- and SummitPost/Beckey. Cascade River Road is a different drainage (Marblemount ->
-- Cascade Pass, serving Boston Basin/Eldorado). The stray line is boilerplate copied from
-- a Cascade Pass-area route. Corrected to SR-20, re-homing the accurate closure info from
-- this row's own road block.
UPDATE routes
SET access = jsonb_set(
  access,
  '{seasonal}',
  '"State Route 20 (the North Cascades Highway) — the access road for the Canyon Creek Trailhead — has a seasonal winter closure between roughly MP 134 (Ross Dam) and MP 171 (Silver Star), typically early December through mid-April/May. It is not on Cascade River Road. Check the WSDOT North Cascades Highway pass report each season."'::jsonb
)
WHERE id = 'wa_jack_mountain_south_face' AND area_id = 'wa_jack_mountain';

-- wa_kimtah_peak_scramble: same stray "Cascade River Road (the access road for these
-- trailheads)" line in access.seasonal. Kimtah is approached from the Easy Pass Trailhead
-- on SR-20 near milepost 151 (confirmed by the row's own waypoints, road.name =
-- "North Cascades Highway (SR 20)", road.driveNote, and WTA/SummitPost). Not Cascade River
-- Road. Corrected to SR-20, re-homing this row's own road-block closure info.
UPDATE routes
SET access = jsonb_set(
  access,
  '{seasonal}',
  '"State Route 20 (the North Cascades Highway) — the access road for the Easy Pass Trailhead — has a seasonal winter closure, with gates typically near Ross Dam (MP 134) and Silver Star (MP 171), roughly December through April/May. It is not on Cascade River Road. Check the WSDOT North Cascades Highway pass report each season."'::jsonb
)
WHERE id = 'wa_kimtah_peak_scramble' AND area_id = 'wa_kimtah_peak';
