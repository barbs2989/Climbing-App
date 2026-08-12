-- WA alpine audit -- pass 2, batch 7 (batch #58 overall) -- 2026-08-06
-- Routes: wa_chiwawa_mountain_southwest (Chiwawa Mountain),
--         wa_chockstone_route (North Early Winters Spire),
--         wa_clark_mountain_west_ridge (Clark Mountain, Dakobed Range),
--         wa_classic_route_2 (Unicorn Peak), wa_classic_route_3 (Lane Peak),
--         wa_colchuck_peak_colchuck_glacier, wa_colchuck_peak_east_ridge,
--         wa_colchuck_peak_holsten_hilden, wa_colchuck_peak_north_buttress_couloir,
--         wa_colchuck_peak_northeast_couloir (Colchuck Peak)
-- Researched via 6 parallel agents (one per peak group; Colchuck Peak's 5 routes audited
-- together as a sibling-contamination check). See audits/wa-alpine-audit-log.md for the
-- full writeup. Every confirmed fix's current value was re-verified against a fresh live
-- Supabase read immediately before this file was written. All WHERE clauses include the
-- current (wrong) value as a safety check per project convention.

-- =========================================================================
-- CHIWAWA MOUNTAIN
-- =========================================================================

-- Southwest Route / Standard (wa_chiwawa_mountain_southwest) -- grade said "Class 3-4 +
-- glacier", contradicted by this same row's own pro_needs/watch_out/seasonal_hazards.crevasses,
-- which explicitly state the standard SW line has no glacier travel (that belongs to the
-- separate NE/Lyman Glacier line). "+ glacier" looks like bleed-over from that other route.
UPDATE routes
SET grade = 'Class 3-4'
WHERE id = 'wa_chiwawa_mountain_southwest' AND grade = 'Class 3-4 + glacier';

-- (Not fixed, flagged instead: this route's crowds/partner_requirements/seasonal_guidance/
-- seasonal_hazards fields describe a roped, glaciated Lyman-Glacier-style climb wholesale,
-- contradicting the row's own overview/approach/pitch_detail/itinerary, which all describe a
-- non-technical, non-glaciated Class 2-4 scramble via the Trinity Trailhead. No replacement
-- text sourced this pass -- needs a human rewrite, not a single-field patch. See audit log.)

-- =========================================================================
-- NORTH EARLY WINTERS SPIRE
-- =========================================================================

-- Chockstone Route (wa_chockstone_route) -- waypoints[0]/gpx[0] ("Blue Lake TH") carried the
-- same stale, contaminated coordinate (48.5168,-120.6573 / 5,200 ft) already found and fixed
-- on sibling routes on this peak in an earlier pass; the real Blue Lake Trailhead (USFS/WTA:
-- 48.51901,-120.6742, 5,400 ft) is already correctly recorded on this same row's own
-- approach_logistics.trailheadLat/Lng/elev -- just never applied to waypoints/gpx. Also
-- tightened the "North Early Winters Spire" summit waypoint (was 48.514,-120.655, a ~100m
-- rounding-off value) to the row's own precise approach_logistics.peakLat/peakLng, which
-- matches the areas table and sibling routes' summit points exactly.
UPDATE routes
SET waypoints = '[{"lat": 48.518965, "lng": -120.67436, "elev": 5400, "name": "Blue Lake TH", "note": "SR-20 pullout ~1.5 mi west of Washington Pass, 5,400 ft.", "type": "Trailhead", "distMi": 0}, {"lat": 48.512935, "lng": -120.655465, "elev": 7760, "name": "North Early Winters Spire", "type": "Summit", "distMi": 1}, {"lat": 48.51291, "lng": -120.65557, "elev": 6900, "name": "Spire col (gully base)", "note": "Base of the gully between North and South Early Winters Spires, below the giant chockstones.", "type": "Junction", "distMi": 0.6}, {"lat": 48.5133, "lng": -120.6553, "elev": 7300, "name": "Chockstone crux", "note": "5.7 pitch bypassing the first giant chockstone on the left.", "type": "Hazard", "distMi": 0.8}]'::jsonb,
    gpx = '[[48.518965, -120.67436], [48.512935, -120.655465], [48.51291, -120.65557], [48.5133, -120.6553]]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-06: waypoints[0]/gpx[0] Blue Lake TH coordinate was the same stale/contaminated value already fixed on sibling North Early Winters Spire routes in an earlier pass (real TH per USFS/WTA and this row''s own approach_logistics: 48.518965,-120.67436, 5,400 ft), also tightened the summit waypoint to this row''s own precise peakLat/peakLng.'
WHERE id = 'wa_chockstone_route'
  AND waypoints = '[{"lat": 48.5168, "lng": -120.6573, "elev": 5200, "name": "Blue Lake TH", "note": "SR 20 pullout 1.5 mi west of Washington Pass.", "type": "Trailhead", "distMi": 0}, {"lat": 48.514, "lng": -120.655, "elev": 7760, "name": "North Early Winters Spire", "type": "Summit", "distMi": 1}, {"lat": 48.51291, "lng": -120.65557, "elev": 6900, "name": "Spire col (gully base)", "note": "Base of the gully between North and South Early Winters Spires, below the giant chockstones.", "type": "Junction", "distMi": 0.6}, {"lat": 48.5133, "lng": -120.6553, "elev": 7300, "name": "Chockstone crux", "note": "5.7 pitch bypassing the first giant chockstone on the left.", "type": "Hazard", "distMi": 0.8}]'::jsonb
  AND gpx = '[[48.5168, -120.6573], [48.514, -120.655], [48.51291, -120.65557], [48.5133, -120.6553]]'::jsonb;

-- Chockstone Route (wa_chockstone_route) -- rack/detailed_rack both said "Cams 0.5-3in",
-- contradicted by this row's own gear field and corrections field, which already quote
-- Mountain Project's "single rack to 2 inches" -- the correction was applied to gear/corrections
-- but never propagated to rack/detailed_rack.
UPDATE routes
SET rack = '["Cams 0.5–2in (single set, doubles of 0.5 & 0.75in)","Nut set","8 quickdraws (for fixed pins/bolts)","2x 60cm slings (tree-rap backup)","Single 60m rope"]'::jsonb,
    detailed_rack = 'A single cam rack from 0.5-2in (with doubles of the 0.5 and 0.75in sizes) plus a nut set covers the route, bring extra quickdraws for the fixed pins and bolts on the crux and upper pitches.'
WHERE id = 'wa_chockstone_route'
  AND detailed_rack = 'A single cam rack from 0.5-3in (with doubles of the 0.5 and 0.75in sizes) plus a nut set covers the route; bring extra quickdraws for the fixed pins and bolts on the crux and upper pitches.';

-- Chockstone Route (wa_chockstone_route) -- watch_out was stored as one newline-joined
-- string instead of a JSON array, unlike every other array field on this row. Per CLAUDE.md,
-- lib/db.js's toArr() only splits on commas, not newlines, so this rendered as one run-on
-- blob instead of a bulleted hazard list.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_chockstone_route'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = 'Chockstone features create technical and exposed sections
Route-finding through chockstone terrain can be confusing
Weather exposure on exposed terrain
Loose rock hazard throughout approach and mixed sections
Descent route-finding critical in variable terrain';

-- =========================================================================
-- CLARK MOUNTAIN (Dakobed Range)
-- =========================================================================

-- West Ridge / Walrus Glacier (wa_clark_mountain_west_ridge) -- top-level lat/lng were null
-- despite the identical, mutually-consistent coordinate already present three other places on
-- this same row/parent (areas.lat/lng, the "Clark Mountain summit" waypoint, and
-- approach_logistics.peakLat/peakLng), all matching Wikipedia's published coordinates.
UPDATE routes
SET lat = 48.0500478, lng = -120.9686139
WHERE id = 'wa_clark_mountain_west_ridge' AND lat IS NULL AND lng IS NULL;

-- West Ridge / Walrus Glacier (wa_clark_mountain_west_ridge) -- itinerary.days[0]/[2].miles
-- (approach/hike-out) were each stored as 7.5, undercounting this row's own waypoints (the
-- Boulder Basin camp waypoint sits at distMi=9 from the trailhead, not 7.5) and making the
-- itinerary's day-sum (20 mi) disagree with its own totalNote (26 mi) and this row's own
-- approach prose (~22-23 mi round trip). Corrected both to 9 miles and rewrote totalNote's
-- mileage/elevation summary to match the corrected day sum (23 mi) and this row's own
-- top-level gain_ft (6500, itself matching Mountaineers.org/Wenatchee Outdoors' cited
-- ~6,500 ft gain for the Walrus Glacier route) instead of the previous unsupported 7,300 ft.
UPDATE routes
SET itinerary = jsonb_set(
  jsonb_set(
    jsonb_set(itinerary, '{days,0,miles}', '9'),
    '{days,2,miles}', '9'
  ),
  '{totalNote}',
  '"A 3-day backpack trip: ~9 mi/~3,100 ft up to Boulder Basin camp on day 1, an ~5-mile, ~11.5-hour round-trip summit push via the Walrus Glacier on day 2, and the ~9-mile hike out on day 3, roughly 23 miles and ~6,500 ft gained/lost total (matching this route''s own top-level gain_ft/dist_km and external Mountaineers.org/Wenatchee Outdoors sourcing of ~11.5 mi one-way / ~6,500 ft gain)."'
)
WHERE id = 'wa_clark_mountain_west_ridge'
  AND itinerary->'days'->0->>'miles' = '7.5'
  AND itinerary->'days'->2->>'miles' = '7.5'
  AND itinerary->>'totalNote' = 'A 3-day backpack trip: ~8 mi/~3,100 ft up to Boulder Basin camp on day 1, an ~5-mile, ~11.5-hour round-trip summit push via the Walrus Glacier on day 2, and the ~8-mile hike out on day 3 — roughly 26 miles and 7,300 ft gained/lost total.';

-- (Not fixed, flagged instead: waypoints[1] "Boulder Creek Trail #1562 junction" sits ~0.85 mi
-- off this row's own gpx track -- clearly an outlier vs. every other waypoint (0.006-0.21 mi
-- off-track) -- but no source pins down its exact correct coordinate, only an approximate
-- ~48.011,-120.963 estimate from nearest-gpx-point matching. Left unpatched rather than write a
-- guessed coordinate; also flagged the route's own name/face ("West Ridge") vs. every source
-- documenting this line only as "Walrus Glacier" -- possible id/name conflation, human call.)

-- =========================================================================
-- UNICORN PEAK
-- =========================================================================

-- Classic Route (wa_classic_route_2) -- rappels, pitch_detail[0].notes, and watch_out[0] all
-- still described the rappel anchor as the "bleached snag" on the summit block. This row's own
-- descent_text field already correctly documents that anchor is no longer sound and that the
-- current, trip-report-corroborated anchor is a rock horn on the south side -- these three
-- fields were never updated to match. Safety-relevant: an old, known-unsound wooden anchor is
-- a rappel hazard, not just a stale fact.
UPDATE routes
SET rappels = 'One rappel of about 40-50 ft (12-15 m) from the rock horn anchor on the south side of the summit block (backed with slings/webbing, sometimes rappel rings), the bleached/dead snag mentioned in older reports is no longer sound and should not be trusted. A 30m rope is generally enough to lead and rappel, though at least one report found a 30m rope fell just short and recommended 37-40m to be safe. There are effectively two rappel lines from the top (one to the notch/ground below the horn, one onto the glacier/snow-patch side), so confirm which station and its exact length before committing. Some parties downclimb the easier east side of the block instead and skip the rappel entirely.',
    corrections = COALESCE(corrections, '') || ' 2026-08-06: rappels/pitch_detail[0].notes/watch_out[0] still described the deprecated "bleached snag" rappel anchor, this row''s own descent_text already documents it is no longer sound and the current anchor is a rock horn, propagated that correction to the three lagging fields (safety-relevant).'
WHERE id = 'wa_classic_route_2'
  AND rappels = 'One rappel of about 50 ft (15 m) from the bleached snag on top of the summit block. A 30 m rope is stated as sufficient by Mountain Project; a trip report recommends 60 m because a 30 m rappel may not reach the ground where the moat is open. Some parties downclimb the easier east side of the block instead and skip the rappel entirely.';

UPDATE routes
SET pitch_detail = jsonb_set(
  pitch_detail,
  '{0,notes}',
  '"Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay, the rappel anchor is a rock horn on the south side (the old bleached snag once used here is no longer sound and should not be trusted), one fixed piton mid-pitch."'
)
WHERE id = 'wa_classic_route_2'
  AND pitch_detail->0->>'notes' = 'Blocky low-5th-class climbing up the south-southeast face of the summit block to the belay/rappel anchor (old bleached snag); one fixed piton mid-pitch.';

UPDATE routes
SET watch_out = jsonb_set(
  watch_out,
  '{0}',
  '"The old wooden-snag rappel anchor is no longer sound, do not use it. The current anchor is a rock horn on the south side of the summit block."'
)
WHERE id = 'wa_classic_route_2'
  AND watch_out->>0 = 'Aging wooden-snag rappel anchor - inspect before trusting it';

-- Classic Route (wa_classic_route_2) -- detailed_rack said "no cams needed", directly
-- contradicting this same row's own gear/rack/sling_rack/pro_needs fields (all list cams) and
-- SummitPost's route description (cams 0.3-1in cited).
UPDATE routes
SET detailed_rack = 'One fixed piton mid-pitch, bring a small set of nuts plus a few small-to-mid cams (e.g. Camalot #1-#3 or equivalent hexes) for natural pro.'
WHERE id = 'wa_classic_route_2'
  AND detailed_rack = 'One fixed piton mid-pitch plus a single set of nuts is sufficient; no cams needed.';

-- Classic Route (wa_classic_route_2) -- length_m (122, ~400 ft) is wildly inconsistent with
-- this same row's own pitches=1 and pitch_detail[0].lengthM=15 (m) for a one-pitch summit-block
-- scramble with a ~40-50 ft rappel.
UPDATE routes SET length_m = 15 WHERE id = 'wa_classic_route_2' AND length_m = 122;

-- =========================================================================
-- LANE PEAK
-- =========================================================================

-- Classic Route (wa_classic_route_3) -- approach text said round trip is "a bit over 3 miles",
-- contradicted by this same row's own dist_km (6.44 km = 4.00 mi), itinerary.days[0].miles (4),
-- and itinerary.totalNote (also ~4 mi) -- three internally-consistent fields outvote the one
-- outlier prose sentence. Independently corroborated (willhiteweb.com: 2 mi one-way).
UPDATE routes
SET approach = replace(
  approach,
  'Round trip from the road is a bit over 3 miles with roughly 1,400-1,500 ft of gain',
  'Round trip from the road is roughly 4 miles with roughly 1,400-1,500 ft of gain'
)
WHERE id = 'wa_classic_route_3'
  AND approach LIKE '%Round trip from the road is a bit over 3 miles with roughly 1,400-1,500 ft of gain%';

-- =========================================================================
-- COLCHUCK PEAK
-- =========================================================================
-- wa_colchuck_peak_colchuck_glacier audited fully clean -- no changes.

-- East Ridge (Non-Technical) (wa_colchuck_peak_east_ridge) -- gain_ft/loss_ft (2800/2800)
-- don't reconcile with this row's own waypoints (trailhead 3,400 ft -> summit 8,705 ft implies
-- ~5,305 ft), and sibling wa_colchuck_peak_colchuck_glacier -- climbing the same trailhead-to-
-- summit profile -- already correctly stores 5300/5300.
UPDATE routes
SET gain_ft = 5300, loss_ft = 5300
WHERE id = 'wa_colchuck_peak_east_ridge' AND gain_ft = 2800 AND loss_ft = 2800;

-- (Not fixed, flagged instead: this route's own `corrections` field already says it should
-- carry a source-backed name change (MP: "Colchuck Glacier", SummitPost: "East Route") but the
-- `name` column ("East Ridge (Non-Technical)") was never updated -- however both of those
-- source-backed names exactly match sibling wa_colchuck_peak_colchuck_glacier, which documents
-- the same 1948 FA party and a near-identical profile, and this row's own `beta` field
-- describes a genuinely different ridge scramble than its approach/pitch_detail/descent_text.
-- This looks like the same possible-duplicate-route pattern flagged repeatedly elsewhere in
-- this DB (Dragontail r4/triple_couloirs, Cutthroat r1/south_buttress) -- a human merge/rename
-- decision, not a name patch. Also flagged: alpine_grade holds a Roman-numeral commitment grade
-- ("Grade II (Alpine)") instead of the schema's French adjectival scale; waypoints byte-
-- identical to sibling holsten_hilden's, looks copy-pasted.)

-- (Not fixed, flagged instead: wa_colchuck_peak_holsten_hilden's alpine_grade holds a Roman-
-- numeral commitment grade ("Grade III (Alpine); FA account graded Grade IV") instead of the
-- schema's French adjectival scale -- no source found for the correct French letter, so left
-- unfixed rather than guessed. Also flagged: its own `corrections` field describes a grade
-- value that doesn't match what's actually stored (stale narrative); loss_ft is null despite
-- gain_ft being populated; pitches is null despite pitch_detail enumerating ~8 pitches.)

-- (Not fixed, flagged instead: wa_colchuck_peak_north_buttress_couloir's top-level `grade` is
-- null despite alpine_grade/rock_grade/ice_grade/commitment all being populated -- but
-- rock_grade ("5.5 (harder direct-start variation)") and ice_grade ("AI2 (variation)") are both
-- explicitly qualified as belonging to a variation, not the main line, so composing a top-level
-- grade string from them risks misstating the base route's difficulty. Left null rather than
-- guess. Also flagged: commitment ('III') vs. at least one external trip-report title citing
-- Grade II for the same route -- sources conflict; gain_ft/loss_ft (6600/6600) run ~1,100-1,300
-- ft higher than the trailhead-to-summit profile plus described approach would suggest, no
-- external figure found to confirm a specific correct value.)

-- Northeast Couloir (wa_colchuck_peak_northeast_couloir) -- watch_out was stored as one
-- newline-joined string (8 sentences) instead of a JSON array, unlike this same row's own
-- hazards/obj_haz/pro_tips fields and unlike all 4 sibling Colchuck Peak routes' watch_out
-- fields. Per CLAUDE.md, lib/db.js's toArr() only splits on commas, not newlines -- this
-- rendered as one run-on block instead of a bulleted hazard list.
UPDATE routes
SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
WHERE id = 'wa_colchuck_peak_northeast_couloir'
  AND jsonb_typeof(watch_out) = 'string'
  AND watch_out #>> '{}' = 'CRITICAL AVALANCHE TERRAIN: Slope angle of 35-45 degrees with extensive vertical relief and frequent terrain traps—couloir is prime avalanche slope with multiple fatal accidents (3 deaths in Feb 2023); only climb in ideal snow conditions with confirmed low/minimal avalanche hazard
Entry and exit of steep couloir can be technical with snow or ice up to 60 degrees—difficult down-climbing if route-finding error occurs; requires excellent snow/ice judgment
Rock and ice fall from walls above couloir—stay alert and compact party; position out of direct fall line; watch for ice/rock loosening due to solar warming
Bergschrund crossing at glacier base—may be significant obstacle early/mid-season with potential fall hazard; probe and belay crossing if uncertain
Late-season glacier becomes bare ice (July+)—surface becomes extremely difficult and icy; crampons and ice tools essential; increased rockfall risk from warming
Crevasses in upper Colchuck Glacier approach (though fewer than on other glacier routes)—travel roped; probe continuously
Limited escape options once committed to upper couloir—retreat can be hazardous in poor conditions; plan to turn back early if conditions deteriorate
Navigation difficulty in whiteout conditions—few visual landmarks; GPS/map essential; descending in low visibility is particularly risky';

-- (Not fixed, flagged instead: wa_colchuck_peak_northeast_couloir's "Colchuck Lake" waypoint
-- sits ~600m east of where every sibling route's "Colchuck Lake" waypoint clusters -- possibly
-- an intentional east-shore boot-path point, possibly a coordinate slip; no primary GPS source
-- found to confirm either way.)

-- Cross-cutting note (all 5 Colchuck Peak routes): explicitly checked for the "day trip wrongly
-- requires the Enchantments overnight lottery permit" bug found elsewhere in this DB -- not
-- present here. All 5 rows correctly state day climbs need only a free self-issue wilderness
-- permit, with the Recreation.gov lottery applying solely to overnight camping.
