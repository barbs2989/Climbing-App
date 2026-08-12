-- WA alpine audit — pass 2, batch 62 (2026-08-07)
-- Peaks: Dragontail Peak, Chimney Rock, East McMillan Spire, Witches Tower,
--        Middle Peak (Gunsight Range), Snowking Mountain, Silver Star Mountain
--        (Okanogan), Inspiration Peak.
-- Routes audited: wa_dragontail_peak_r3, wa_dragontail_peak_r4,
--   wa_dragontail_peak_serpentine_arete, wa_e_se_face, wa_east_face,
--   wa_east_face_6, wa_east_mcmillan_spire_west_ridge, wa_east_ridge_2,
--   wa_east_ridge_3, wa_east_ridge_4.
-- Review each statement before running. See audits/wa-alpine-audit-log.md
-- for the full rationale, sources, and open flags for items NOT included here.

-- Triple Couloirs (wa_dragontail_peak_r4): batch 9 (2026-07-28) recorded fixing
-- "Asgard Pass" -> "Aasgard Pass" in descent/descent_text/bail/turnaround, but the
-- live row still had the misspelling in all four fields — the batch-9 SQL for
-- these quote-heavy text UPDATEs apparently never actually landed on the live
-- DB (its alpine_grade IV->D fix on the same route did land). Re-applying here.
UPDATE routes SET turnaround = 'This is a long, committing route (10-12+ hours round trip is typical) with a serious descent; set a turnaround time that ensures the Runnels are cleared and the summit/Aasgard Pass descent can be completed with a margin of daylight, given deteriorating snow/spindrift conditions later in the day.' WHERE id = 'wa_dragontail_peak_r4';
UPDATE routes SET descent = 'Traverse right (skier''s/climber''s right) toward the true summit, then descend via Aasgard Pass back to Colchuck Lake.' WHERE id = 'wa_dragontail_peak_r4';
UPDATE routes SET descent_text = 'From the top of the third couloir, a short snow scramble reaches the summit. Traverse to the true summit, then make a long descending traverse across the upper snowfields toward Aasgard Pass, and descend the pass''s gully back to the frozen/open lake and the approach trail.' WHERE id = 'wa_dragontail_peak_r4';
UPDATE routes SET bail = 'Below the Runnels, retreat down the Hidden Couloir is possible in good snow conditions; above the Runnels, bailing is difficult and continuing to the summit and Aasgard Pass descent is usually the safer option.' WHERE id = 'wa_dragontail_peak_r4';

-- Triple Couloirs (wa_dragontail_peak_r4): high_point_ft was NULL despite the
-- route's own descent_text stating it reaches the true summit, and every
-- sibling Dragontail route plus the parent area row agreeing on 8,840 ft.
UPDATE routes SET high_point_ft = 8840 WHERE id = 'wa_dragontail_peak_r4';

-- Serpentine Arête (wa_dragontail_peak_serpentine_arete): waypoints array carries
-- two entries named "Colchuck Lake" — index 1 (5,574 ft, matching this row's own
-- approach text verbatim) and index 4 (5,561 ft, a 13 ft outlier matching neither
-- the route's own approach text nor any external source). Same self-consistency
-- bug family as the Aasgard Pass duplicate already fixed on this row in batch 9
-- (that fix only touched the Aasgard Pass pair, not this Colchuck Lake pair).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{4,elevFt}', '5574'::jsonb, false) WHERE id = 'wa_dragontail_peak_serpentine_arete';

-- East McMillan Spire, West Ridge/Southwest Face (wa_east_mcmillan_spire_west_ridge):
-- approach_logistics.trailheadLat/trailheadLng is stale (48.68664, -121.27121).
-- The row's own waypoints[5] ("Goodell Creek Trail Trailhead") already carries a
-- corrected coordinate (48.6828, -121.2693), corroborated by Trailforks and the
-- route's own recorded GPS track start point — approach_logistics was simply
-- never updated to match after that waypoint-level fix (same propagation gap as
-- the Dorado Needle case in batch 61).
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '48.6828'), '{trailheadLng}', '-121.2693')
WHERE id = 'wa_east_mcmillan_spire_west_ridge' AND approach_logistics->>'trailheadLat' = '48.68664' AND approach_logistics->>'trailheadLng' = '-121.27121';

-- Middle Peak, East Face (wa_east_face — Middle Gunsight, Gunsight Range):
-- top-level gain_ft (5,000) undercounts the route's own itinerary day-by-day
-- gains (3,100 + 2,600 + 600 = 6,300 ft); corrected to match the record's own
-- numbers.
UPDATE routes SET gain_ft = 6300 WHERE id = 'wa_east_face';

-- Middle Peak, East Face: rappels field said "roughly 2 rappels... to the Blue
-- Glacier," contradicting the row's own descent_text and 4-entry rappel_detail
-- array (both agree: 3-4 rappels down the south face to the Chickamin Glacier).
-- Blue Glacier is the east-side approach glacier the route is viewed from, not
-- the descent glacier (confirmed: Blue Glacier flows east from Gunsight Peak,
-- Chickamin lies west where this route's own approach places base camp).
UPDATE routes SET rappels = '3-4 rappels on 50-60m lines down the south face to the Chickamin Glacier (base camp), matching this route''s own descent_text and rappel_detail fields' WHERE id = 'wa_east_face';

-- Middle Peak, East Face: access.parking_pass named "Sunrise Mine TH for Vesper
-- Peak" — an unrelated Mountain Loop Highway trailhead for a different peak
-- entirely (cross-route contamination, same family as the documented "Mount Tom"
-- boilerplate pattern). This route's own road/approach_logistics fields say
-- Downey Creek Trailhead via Suiattle River Road (FR 26). Also tightened
-- access.passRequired from "recommended" to "required," per the USFS Downey
-- Creek Trailhead recreation page.
UPDATE routes SET access = jsonb_set(
  jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass required at Downey Creek Trailhead -- $5/day or $30/annual."'::jsonb),
  '{passRequired}', '"Northwest Forest Pass required at Downey Creek Trailhead (per USFS recreation site page)"'::jsonb
) WHERE id = 'wa_east_face';

-- Middle Peak, East Face: emergency.rangerStation named Chelan Ranger District
-- (Okanogan-Wenatchee NF, east-side) — wrong forest/district, contradicting this
-- row's own land_manager/access.landManager fields (both correctly say
-- Darrington Ranger District, Mt. Baker-Snoqualmie NF) and the route's Suiattle
-- River Road/Downey Creek TH approach.
UPDATE routes SET emergency = jsonb_set(emergency, '{rangerStation}', '"Darrington Ranger Station, 1405 Emens Avenue North, Darrington, WA 98241 -- (360) 436-1155"'::jsonb) WHERE id = 'wa_east_face';

-- Middle Peak, East Face: emergency.nearestHospital named two facilities that
-- don't check out: "Cascade Medical Center, Concrete, WA" (Cascade Medical
-- Center is real but is actually in Leavenworth, Chelan County -- the opposite
-- side of the state, and matches the *Witches Tower* route's own correct
-- nearestHospital value almost verbatim) and "Skykomish Valley Hospital,
-- Skykomish, WA" (no such hospital exists). Corrected to the real hospitals
-- serving the Darrington/Suiattle River access side.
UPDATE routes SET emergency = jsonb_set(emergency, '{nearestHospital}', '"Skagit Valley Hospital, Mount Vernon (Level III ER) or Cascade Valley Hospital, Arlington -- both serve the Darrington/Suiattle River access side; serious trauma flown to Harborview (Seattle)."'::jsonb) WHERE id = 'wa_east_face';

-- Inspiration Peak, East Ridge (wa_east_ridge_4): access.notes gave the 2026 NPS
-- North Cascades early-access lottery window as "Mar 2-13" -- stale by one day.
-- NPS's published 2026 schedule is Mar 3-14; this exact off-by-one-day error was
-- already found and fixed on this same lottery on two sibling NCNP routes
-- (Buckner Mountain, Crooked Thumb Peak) in earlier batches, but this route's
-- copy was never updated.
UPDATE routes SET access = jsonb_set(access, '{notes}', '"60% of sites are reservable in advance via Recreation.gov (2026 lottery Mar 3–14); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount."') WHERE id = 'wa_east_ridge_4';
