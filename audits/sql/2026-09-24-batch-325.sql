-- WA alpine audit batch 325 (pass 6)
-- Routes: wa_glacier_peak_cool_glacier_gerdine, wa_glacier_peak_disappointment_peak_cleaver,
--         wa_glacier_peak_frostbite_ridge, wa_glacier_peak_kennedy_glacier,
--         wa_glacier_peak_sitkum_glacier, wa_goat_mountain_south_ridge,
--         wa_golden_horn_north_face, wa_goode_mountain_megalodon_ridge

-- =========================================================================
-- Glacier Peak, Disappointment Peak Cleaver (Cool Glacier) -- wa_glacier_peak_disappointment_peak_cleaver
-- =========================================================================
-- This row's `waypoints` and `itinerary` describe a completely different, unrelated
-- approach (Trinity Trailhead -> Buck Creek Pass -> "Cool/Gerdine Basin Camp" on the
-- Chiwawa River side) than every other field on the same row (`approach`, `road`,
-- `descent`, `descent_text`, `hazards`), which consistently and correctly describe the
-- real approach: North Fork Sauk River Trailhead (2,050 ft, FR 49/Sloan Creek Rd) ->
-- Mackinaw Shelter -> White Pass -> the White Chuck Glacier/Glacier Gap basin -> the
-- Cool Glacier -- matching the sibling wa_glacier_peak_cool_glacier_gerdine route's
-- nearly-identical, independently-corroborated approach, and matching externally (The
-- Mountaineers' route page confirms the ascent goes via the White Chuck/Gerdine/Cool
-- glaciers to a col above Disappointment Peak at 9,100-9,600 ft, exactly the range this
-- row's own `corrections` field already documents; WTA/Mountaineers trip-report sources
-- confirm the North Fork Sauk Trail's own mileposts -- Red Creek ford at 3.5 mi,
-- Mackinaw Shelter at 5 mi, White Pass at ~9 mi -- matching this row's `approach` text
-- word for word). Buck Creek Pass is a real trailhead/pass, but it accesses the
-- Chiwawa River/Trinity drainage on the far east side of the Cascade crest (Fortress
-- Mountain, Flora Mountain, Liberty Cap country) and is not a documented approach to
-- Glacier Peak at all -- it does not connect to the Cool Glacier or Disappointment Peak.
-- waypoints[0]'s own "note" field is a garbled half-correction that names the
-- contamination (it says the coordinate/elevation are actually Trinity Trailhead's, not
-- North Fork Sauk's) without fixing it, and treats the wrong itinerary as authoritative.
--
-- Fix: waypoints[0] (the trailhead) keeps its real North Fork Sauk coordinates -- which
-- do match every sibling Glacier Peak route's trailhead pin -- corrected to the 2,050 ft
-- elevation this row's own `approach` text states, with the confused note removed.
-- waypoints[1] ("Buck Creek Pass") and [2] ("Cool/Gerdine Basin Camp" at the wrong,
-- Trinity-area coordinates) are removed outright -- they belong to a different
-- drainage/route entirely and there is no way to "correct" them into this route's real
-- Glacier Gap/Cool Glacier waypoints without inventing coordinates this row has no
-- record of. waypoints[3] (the summit) is untouched -- it already matches
-- high_point_ft, the sibling routes, and its own coordinates are correct.
--
-- `itinerary` is nulled rather than rewritten: it is built entirely around the false
-- Buck Creek Pass narrative (day 1 "Trailhead to Buck Creek Pass", day 2 "eastern high
-- camp... near the Cool Glacier moraine", etc.) and there is no source on this row for a
-- day-by-day/hour-by-hour breakdown of the real North Fork Sauk approach -- composing
-- one would mean inventing schedule/hour figures this route does not have on record.
UPDATE routes
SET waypoints = '[
  {"lat": 48.05832, "lng": -121.28793, "elev": 2050, "name": "North Fork Sauk River Trailhead", "type": "Trailhead", "distMi": 0},
  {"lat": 48.1112273, "lng": -121.1139922, "elev": 10541, "name": "Glacier Peak summit", "type": "Summit", "elevFt": 10541}
]'::jsonb,
    itinerary = NULL
WHERE id = 'wa_glacier_peak_disappointment_peak_cleaver'
  AND waypoints @> '[{"name": "Buck Creek Pass"}]'::jsonb
  AND itinerary IS NOT NULL;

-- =========================================================================
-- Glacier Peak, Sitkum Glacier -- wa_glacier_peak_sitkum_glacier
-- =========================================================================
-- Internal self-contradiction: dist_km (14.5 km = 9.01 mi one-way) is far short of the
-- one-way trailhead-to-summit distance this row's OWN waypoints array states --
-- North Fork Sauk River Trailhead (distMi 0) -> White Pass (distMi 8) -> Boulder Basin
-- Camp (distMi 12) -> Glacier Peak Summit (distMi 14). 14 mi = 22.53 km. The sibling
-- wa_glacier_peak_cool_glacier_gerdine route's dist_km (27.4 km = 17.03 mi) correctly
-- matches ITS OWN approach text's stated one-way distance to the summit, confirming
-- dist_km is meant to be the one-way trailhead-to-summit figure on these rows, not a
-- shorter partial-approach distance. Corrected to match this row's own waypoint chain.
UPDATE routes
SET dist_km = 22.53
WHERE id = 'wa_glacier_peak_sitkum_glacier'
  AND dist_km = 14.5;

-- =========================================================================
-- Glacier Peak, Frostbite Ridge -- wa_glacier_peak_frostbite_ridge
-- =========================================================================
-- `approach` and `road` describe the wrong trailheads (White Chuck River Trailhead /
-- FST 643-639, or North Fork Sauk Trailhead via White Pass -- both belonging to
-- Glacier Peak's OTHER routes) for the actual approach this route's own `itinerary`
-- field already correctly describes: Suiattle River Road (FR 26) to its end at Sulfur
-- Creek Campground, the Suiattle Pass Trail (~7 mi) to a bridge over the Suiattle
-- River, then the PCT south (~9 mi) to a base camp in the East Fork Milk Creek basin
-- (~5,600 ft) on the peak's north/northwest side. This matches The Mountaineers' own
-- published route description for Glacier Peak/Frostbite Ridge (Suiattle River Road to
-- Sulfur Creek Campground -> Suiattle Pass Trail ~7 mi -> PCT south ~9 mi -> East Fork
-- Milk Creek basin PCT camp at 5,600 ft) word for word, and this row's own itinerary.cal
-- note ("The Suiattle River Road (FR 26) has had washout closures in recent years and
-- the Milk Creek Trail itself has been in disrepair for a decade-plus -- verify both
-- before planning this approach") already correctly names this same road/trail.
-- Everything in `approach` from "From high camp, the route proper begins..." onward
-- (the Ptarmigan Glacier traverse, Kennedy Glacier, Rabbit Ears, ice pitch, summit) is
-- unaffected and already matches the itinerary's day-3 description -- only the
-- trailhead/approach-to-camp portion is replaced. `road` is rewritten the same way,
-- reusing this row's own itinerary.cal hedge about washout history rather than making a
-- new, unverifiable claim about current road status.
UPDATE routes
SET approach = replace(
  approach,
  'Two approaches are used, both longer and more involved than the standard Sitkum route. (1) Via White Chuck River Trailhead (2,300 ft): follow the White Chuck River Trail (FST 643) about 6 miles to the Kennedy Ridge Trail (FST 639) junction, then Kennedy Ridge Trail 1.7 miles up to the PCT. Head north on the PCT about 3 miles (roughly 0.7 miles past the Kennedy Creek crossing, a water source) to an unmarked climbers'' path leaving the PCT, which climbs snow and pumice to the standard high camp near 7,200 ft on the Kennedy Ridge shoulder. (2) Via North Fork Sauk Trailhead: North Fork Sauk Trail to White Pass (~9 miles, ~5,900 ft), then a long traverse north on/near the PCT to the same Kennedy Ridge camp area — a 20-mile-plus approach day used by some parties. From high camp,',
  'The standard approach is via the Suiattle River Road (FR 26): drive to its end at Sulfur Creek Campground, then follow the Suiattle Pass Trail about 7 miles to a bridge crossing the Suiattle River, and pick up the Pacific Crest Trail (PCT) south for about 9 miles to a base camp in the East Fork Milk Creek basin (~5,600 ft) on the peak''s north/northwest side, the standard camp for this route and distinct from the White Chuck or North Fork Sauk trailheads used by Glacier Peak''s other routes. From high camp,'
)
WHERE id = 'wa_glacier_peak_frostbite_ridge'
  AND approach LIKE 'Two approaches are used, both longer and more involved than the standard Sitkum route.%';

UPDATE routes
SET road = '{
  "name": "Suiattle River Road (FR 26) to Sulfur Creek Campground",
  "status": "Gravel forest road that has a history of storm-washout closures, so check current Mt. Baker-Snoqualmie NF conditions before relying on it, as it is the only realistic approach to this route''s Milk Creek trailhead.",
  "driveNote": "From Darrington, drive SR 530 north about 7 miles, then the Suiattle River Road (FR 26) about 22 miles to its end at Sulfur Creek Campground, where the Suiattle Pass Trail begins.",
  "seasonalGate": "Not a simple winter gate closure, but the road has been shut for extended periods by storm/washout damage in past years. This is a different road and trailhead than the North Fork Sauk (Sloan Creek Rd/FR 49) or White Chuck (FR 23) approaches used by Glacier Peak''s other routes."
}'::jsonb
WHERE id = 'wa_glacier_peak_frostbite_ridge'
  AND road->>'name' = 'North Fork Sauk Road / Sloan Creek Road (FR 49)';

-- =========================================================================
-- Goat Mountain, South Ridge / Standard Scramble -- wa_goat_mountain_south_ridge
-- =========================================================================
-- Internal self-contradiction: `beta` correctly states the false (west) summit's
-- elevation as 6,721 ft, matching SummitPost's cross-checked figure for Goat Mountain's
-- West Peak (6,721 ft; Wikipedia gives a very close 6,725 ft). Three other fields on
-- the same row -- `descent`, `watch_out[0]`, `hazards[5]` -- instead call the same
-- false/west summit "6,600 ft", a value found nowhere else and unsupported by any
-- source checked. Corrected all three to match the externally-corroborated 6,721 ft
-- figure already used in this row's own `beta` field.
UPDATE routes
SET descent = replace(descent, '6,600 ft false (west) summit', '6,721 ft false (west) summit')
WHERE id = 'wa_goat_mountain_south_ridge'
  AND descent LIKE '%6,600 ft false (west) summit%';

UPDATE routes
SET watch_out = (
  SELECT jsonb_agg(to_jsonb(replace(elem, '~6,600 ft', '~6,721 ft')))
  FROM jsonb_array_elements_text(watch_out) elem
)
WHERE id = 'wa_goat_mountain_south_ridge'
  AND watch_out::text LIKE '%~6,600 ft%';

UPDATE routes
SET hazards = array_replace(
  hazards,
  'easy to mistake the 6,600 ft false (west) summit for the true 6,891 ft east summit, which lies farther along an exposed ridge',
  'easy to mistake the 6,721 ft false (west) summit for the true 6,891 ft east summit, which lies farther along an exposed ridge'
)
WHERE id = 'wa_goat_mountain_south_ridge';

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_glacier_peak_kennedy_glacier: dist_km (12.4 km = 7.7 mi) matches only this row's
-- own "Kennedy Ridge Trail / PCT junction" waypoint (distMi 7.7), an intermediate point
-- roughly halfway up the approach, not a trailhead-to-summit distance -- the waypoint
-- chain continues at least to a distMi-13.5 "Kennedy Glacier crevasse band" waypoint,
-- with the true summit further still. Unlike the Sitkum Glacier fix above, this route's
-- own waypoints do not give an explicit distMi value for the summit itself, so a
-- corrected dist_km would have to be extrapolated (roughly 14.5-15 mi / 23.3-24.1 km)
-- rather than read directly off the row -- flagging rather than writing an estimated
-- figure with no stated basis on this row.
--
-- wa_glacier_peak_sitkum_glacier: separately from the dist_km fix above, this row's own
-- `approach` text describes the White Chuck River Trailhead (matching the White Chuck
-- Trail/Kennedy Hot Springs mileposts confirmed via an external trip-report search) as
-- the primary access, while `waypoints` instead starts from the North Fork Sauk River
-- Trailhead (matching 4 of the other 5 Glacier Peak routes in this dataset). Both are
-- real, documented approaches to this general area, but this dataset's own sibling
-- routes (Kennedy Glacier, Disappointment Peak Cleaver) establish that the White Chuck
-- Trail has been effectively closed/impassable since a 2003 flood and is additionally
-- under a currently-active FS-23 road closure order -- meaning the North Fork Sauk
-- approach in `waypoints` may now be the more accurate/current one, but rewriting the
-- multi-paragraph `approach` prose to match would require composing new approach detail
-- (how the North Fork Sauk/White Pass access actually reaches Boulder Basin) that is not
-- otherwise present on this row or independently confirmed here. Flagging for a future
-- pass rather than guessing at the connecting detail.
