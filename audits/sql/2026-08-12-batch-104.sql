-- === wa_southwest_buttress (Dorado Needle) ===

-- dist_km reverted to a stale/halved value. This row's own `corrections` log
-- already documents fixing dist_km from 9.7 to 12.88 (one-way, matching the
-- app's distKm*2 round-trip display convention) on 2026-08-05, but the live
-- value is 6.44 -- exactly half of the logged correction. This also
-- contradicts the row's own approach text ("~25.75 km round trip") and
-- itinerary.totalNote ("~16 mi round trip" ~= 25.8 km): 6.44*2 = 12.88 km,
-- well short of both. The fix restores the value the corrections log already
-- says should be here.
UPDATE routes
SET dist_km = 12.88
WHERE id = 'wa_southwest_buttress';

-- access.group_limit (6) and access.rules text misstate the Eldorado/Dorado
-- Needle cross-country zone as a 6-person zone. Multiple independent sources
-- describe Type I (high-occupancy) cross-country zones -- which explicitly
-- include Boston Basin and Eldorado -- as allowing groups up to 12; all
-- other zones cap at 6. This row's own access._raw.group_size_limit already
-- says "Maximum 12 people per party", directly contradicting the derived
-- group_limit/rules fields that render it. Fixed to match the row's own raw
-- source field and the external sourcing.
UPDATE routes
SET access = jsonb_set(access, '{group_limit}', '12', false)
WHERE id = 'wa_southwest_buttress';

UPDATE routes
SET access = jsonb_set(
  access,
  '{rules}',
  '"Group size capped at 12 in high-occupancy cross-country zones (includes Boston Basin/Eldorado approaches); 6 in standard cross-country zones. Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices."',
  false
)
WHERE id = 'wa_southwest_buttress';

-- === wa_pinnacle_peak_tatoosh (area) ===

-- Area prominence is wrong. Independent sources (Wikipedia infobox,
-- PeakVisor, peakbagger.com-derived figures) agree Pinnacle Peak's
-- prominence is 562 ft (171 m); nothing supports 581 ft.
UPDATE areas
SET prominence_ft = 562
WHERE id = 'wa_pinnacle_peak_tatoosh';

-- === wa_southwest_scramble (Pinnacle Peak) ===

-- access.fees omits the mandatory Mount Rainier National Park entrance fee
-- -- the fee-park-vs-fee-free confusion this audit was specifically told to
-- watch for. "N/A" reads as "no fee to visit", which is wrong for an NPS
-- unit: entering Mount Rainier NP costs $30/vehicle (7-day) or $15/
-- pedestrian-or-cyclist (or an $80 America the Beautiful annual pass),
-- separate from the per-person overnight wilderness-camping permit fee
-- already documented elsewhere in this row's access fields.
UPDATE routes
SET access = jsonb_set(
  access,
  '{fees}',
  '"$30/vehicle (7-day) NPS entrance fee required to enter Mount Rainier National Park (or $15 pedestrian/cyclist, or America the Beautiful annual pass); separate from the per-person wilderness camping permit fee noted above."',
  false
)
WHERE id = 'wa_southwest_scramble';

-- === wa_spectre_peak_south_route (Spectre Peak, South Ridge / "Spirited Away") ===

-- best_season's closing clause has the snow direction backwards. It
-- currently reads "...the 2022 party specifically noted favorable low-snow
-- conditions that made their descent easier," which contradicts this same
-- row's climate.summer ("useful lingering snowpack easing travel"),
-- itinerary.days[3].note ("fat snowpack made the upper descent quick"), and
-- descent_text ("heavy-snow-year, early-season conditions... continuous
-- glissade-friendly steep snow"). A search-snippet source corroborates:
-- good/abundant snow coverage let the FA party avoid loose scree and talus
-- on descent -- the opposite of "low-snow".
UPDATE routes
SET best_season = replace(
  best_season,
  'the 2022 party specifically noted favorable low-snow conditions that made their descent easier.',
  'the 2022 party specifically noted favorable (abundant, lingering) snowpack that let them glissade the descent rather than face loose scree/talus.'
)
WHERE id = 'wa_spectre_peak_south_route';

-- approach carries a stale parenthetical from the 2026-08-05 dist_km
-- correction: "(matching the on-file 74 km distance)". That correction
-- changed dist_km from 74.03 to 37.02 (one-way) the same day, but this
-- prose sentence was never updated and now contradicts the current column.
UPDATE routes
SET approach = replace(
  approach,
  '(matching the on-file 74 km distance)',
  '(consistent with the on-file one-way dist_km of 37.02 km, doubled for the round trip)'
)
WHERE id = 'wa_spectre_peak_south_route';

-- itinerary.totalNote's hour total doesn't match this row's own
-- timing.totalHrs (49) or the sum of itinerary.days[].hours (10+8+15+16=49).
-- "~46 hrs" appears to be an accidental reuse of the 46-mile distance figure
-- that appears earlier in the same sentence.
UPDATE routes
SET itinerary = jsonb_set(
  itinerary,
  '{totalNote}',
  to_jsonb(replace(itinerary->>'totalNote', '~46 hrs of moving time', '~49 hrs of moving time'))
)
WHERE id = 'wa_spectre_peak_south_route';

-- waypoints[0] (Hannegan Pass) elev is 5100, but this row's own approach
-- text states "5,050 ft Hannegan Pass" (twice), and USFS/WTA sources
-- consistently give the pass at ~5,050 ft (trail max 5,076 ft).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '5050')
WHERE id = 'wa_spectre_peak_south_route'
  AND waypoints->0->>'name' = 'Hannegan Pass';

-- === wa_spider_mountain_north_face (Spider Mountain, North Face / Kloke-Tindall) ===

-- fa conflates two different lines on Spider Mountain's north face.
-- Independent sources (skisickness.com's own route page, corroborated by a
-- CascadeClimbers forum thread) describe Martin Volken and Peter Avolio's
-- June 17, 2003 ski descent as being of a separate, nearby 1976 north-face
-- line ("Arachnophobia"), not the 1972 Kloke/Tindall route this row
-- describes. The same source describes the Kloke/Tindall line's own ski
-- descent as a distinct, later project (attempts from December 2004,
-- succeeding on the seventh try) with no confirmed date -- so the
-- misattributed clause is removed rather than replaced with an unconfirmed
-- one.
UPDATE routes
SET fa = 'Dallas Kloke and Reed Tindall, 1972 (reported in the American Alpine Journal, 1973, as ''the hook-shaped snow finger leading directly to the summit''). Note: the June 17, 2003 ski descent by Martin Volken and Peter Avolio widely cited for Spider''s north face was of a separate, nearby 1976 line, not this route; first ski descent of the Kloke/Tindall line itself needs verification.'
WHERE id = 'wa_spider_mountain_north_face';

-- approach_logistics.trailheadDirection gives the Cascade Pass Trailhead as
-- "~3,660 ft", an outlier against NPS/WTA sources (3,600 ft) and against
-- this dataset's own sibling route wa_spider_mountain_north_ridge, whose
-- approach text says "(3,600 ft)" and whose gain_ft (4717) is exactly
-- 8317 - 3600 -- i.e. the rest of this dataset already assumes 3,600 ft.
UPDATE routes
SET approach_logistics = jsonb_set(
  approach_logistics,
  '{trailheadDirection}',
  '"From the Cascade Pass Trailhead at the end of Cascade River Road (3,600 ft)"'
)
WHERE id = 'wa_spider_mountain_north_face';

-- === wa_spire_point_southwest_face (Spire Point, Southwest Face) ===

-- approach names the wrong trail number for the Downey Creek Trail. USFS
-- (Mt. Baker-Snoqualmie NF trail page "Downey Creek Trail 768") and other
-- sources confirm it is Trail #768; no Trail #792 exists in this area. This
-- row's own waypoints[1].note and approach_logistics.trailhead already say
-- "768" -- approach is the sole outlier.
UPDATE routes
SET approach = replace(approach, 'Downey Creek Trail (#792)', 'Downey Creek Trail (#768)')
WHERE id = 'wa_spire_point_southwest_face';

-- waypoints[5] ("Spire Col") elev is 7000, but every other mention of this
-- same location's elevation in this row says 7,760 ft -- beta ("Spire Col
-- at 7,760 feet"), approach ("permanent snow before Spire Col (7,760')"),
-- pitch_detail[0].notes ("from Spire Col at 7,760 feet"), and
-- itinerary.days[1] (twice: "Spire Col saddle at ~7,760 ft"). Externally
-- corroborated by a WTA trip report ("the 7,760 foot Spire Col"). The
-- waypoint is the sole outlier.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{5,elev}', '7760')
WHERE id = 'wa_spire_point_southwest_face'
  AND waypoints->5->>'name' = 'Spire Col';

-- === wa_stanley_burgner (Prusik Peak, Stanley-Burgner) ===

-- waypoints[0] (Stuart Lake Trailhead) elev is 1300, roughly 2,100 ft too
-- low -- USFS's Stuart Lake Trailhead page and Mountaineers.org both place
-- it at ~3,000-3,400 ft (Hiking Project: 3,423 ft), and this row's own
-- approach text implies a start elevation of ~3,570 ft ("Colchuck Lake,
-- 5,570 ft, ~4.1 mi/2,000 ft gain" from the trailhead). 1,300 ft is closer
-- to the Leavenworth valley floor than to the trailhead up Icicle Creek/
-- FR-7601.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '3400')
WHERE id = 'wa_stanley_burgner'
  AND waypoints->0->>'name' = '"Stuart Lake Trailhead"';

-- itinerary.days[1].schedule[4].detail describes the descent as
-- "Downclimb/rappel the West Ridge back toward the notch", but this row's
-- own descent/descent_text/rappel_detail/bail fields all consistently
-- describe a north-face rappel descent on slung/natural anchors (4 raps),
-- independently reconfirmed via climbing.com, Mountaineers.org, and a
-- StephAbegg trip report. The West Ridge is a distinct, separate 5.7 route
-- on Prusik Peak and plays no part in Stanley-Burgner's descent -- this
-- looks like a copy/paste mix-up between the two routes.
UPDATE routes
SET itinerary = jsonb_set(
  itinerary,
  '{days,1,schedule,4,detail}',
  '"Rappel the north face (4 raps on slung anchors) back toward camp"'
)
WHERE id = 'wa_stanley_burgner';
