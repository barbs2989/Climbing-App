-- WA alpine audit batch 316 (pass 6)
-- Routes: wa_colfax_peak_polish_route, wa_colonial_peak_west_ridge,
--         wa_complete_south_buttress, wa_concord_tower_north_face,
--         wa_copper_peak_south_route, wa_corteo_peak_southwest_ridge,
--         wa_crater_mountain_standard_route, wa_crooked_thumb_peak_east_face

-- =========================================================================
-- Colfax Peak, Polish Route -- wa_colfax_peak_polish_route
-- =========================================================================
-- Internal self-contradiction on this row: `descent` claimed the primary
-- descent method is rappelling/downclimbing the route itself on V-thread
-- anchors (with the walk-off framed as a mere alternative), while this
-- row's own `rappels` field already says "No rappel descent is on record"
-- and `descent_text` independently says the same -- both correct, but
-- `descent` disagreed with them. Confirmed via WebSearch against two
-- independent first-hand trip reports (Colin Haley and Sarah Hart's
-- repeat ascent, colinhaley.com; Jeff Hebert's ascent, jeffreyjhebert.com)
-- plus general SummitPost/area-page descriptions: the standard/consensus
-- descent is the walk-off via the Colfax-Baker saddle and the
-- Coleman-Deming route, not a rappel of the ice line. Rewrote `descent`
-- to match `rappels`/`descent_text`, folding in the one sourced nuance
-- (Haley/Hart's two short summit-area rappels before downclimbing)
-- rather than leaving the flatly wrong "most parties rappel the route"
-- claim standing.
UPDATE routes SET descent = 'No rappel descent down the ice route itself is on record. Parties who top out descend on foot via the Colfax-Baker saddle and the standard Coleman-Deming route back to Hogsback Camp and the trailhead, the same walk-off used by this face''s other lines rather than a reversal of the climb. One recorded repeat ascent (Haley and Hart, 2015) made two short rappels near the summit block before downclimbing to the saddle. Ropes are otherwise carried for the climb and for V-thread retreat below the crux, not for a rappel line down the route.'
  WHERE id = 'wa_colfax_peak_polish_route'
    AND descent = 'Most parties rappel/downclimb the route itself using V-thread anchors, reversing the bergschrund crossing; alternatively, traverse to the Colfax-Baker saddle and descend the standard Coleman-Deming route back to Hogsback Camp and the trailhead.';

-- =========================================================================
-- Copper Peak, South Route -- wa_copper_peak_south_route
-- =========================================================================
-- The row's own `corrections` field flagged a peak-identity ambiguity
-- ("Olympics Copper Mountain" vs "North Cascades Copper Peak") and then
-- resolved it INCORRECTLY, concluding the route should be treated as the
-- non-technical Olympics peak -- while every other stored field on this
-- very row (glaciated Southeast Glacier crossing, roped travel, Class
-- 3-4, Holden Village/Railroad Creek/Copper Creek Trail approach, Bulger
-- List #19, "0.88 mile north of Mount Fernow") already describes the
-- Entiat Mountains Copper Peak, not the Olympics one. Confirmed via
-- WebSearch (Wikipedia's "Copper Peak (Washington)" article, Peakbagger,
-- The Mountaineers' route page, and Wikipedia's separate "Copper Mountain
-- (Mason County, Washington)" article for the distinct Olympics peak):
-- the stored area coordinates match Peakbagger's Entiat Copper Peak
-- coordinates to within normal survey variance, and the 1937 FA
-- (Bennet/Courtwright/Hagman) matches Wikipedia exactly. Rewrote
-- `corrections` to record the resolution rather than leave a stale,
-- self-contradicting ambiguity flag on a row whose own content already
-- answers the question.
UPDATE routes SET corrections = 'RESOLVED (2026-09-20 audit): confirmed via WebSearch cross-reference of the stored area coordinates (48.1746, -120.8040) against Wikipedia and Peakbagger (48.1749, -120.8035, a match within normal survey-point variance) that this is the Entiat Mountains Copper Peak (8,965 ft, Chelan County, Bulger List #19, 0.88 mi from Mount Fernow, Holden Village/Railroad Creek access), NOT the separate, non-technical Olympic Mountains Copper Mountain (Mason County, 5,425 ft, Class 2) that the original research pass mistakenly flagged as a possible match. The stored South Route, a glaciated Southeast Glacier crossing with roped travel, Class 3-4, via Holden Village and the Copper Creek Trail, correctly describes the Entiat peak. The 1937 Bennet/Courtwright/Hagman first ascent is independently confirmed via Wikipedia.'
  WHERE id = 'wa_copper_peak_south_route'
    AND corrections = 'Search results were ambiguous between multiple Washington peaks named ''Copper'' (Olympics Copper Mountain Class 2-3 vs. North Cascades Copper Peak SE Glacier route, which is glaciated and roped). Given the route name and Class 2-3 grade matching the Olympics Copper Mountain, treated as non-technical; flagging peak-identity ambiguity for verification against the DB''s area coordinates.';

-- =========================================================================
-- Crooked Thumb Peak, East Face -- wa_crooked_thumb_peak_east_face
-- =========================================================================
-- `fa` gave only bare surnames. Confirmed via the American Alpine Journal
-- ("New Climbs in the Northern Pickets", AAC Publications, covering the
-- 1963 Mountaineers Northern Pickets expedition based at Challenger Arm):
-- on July 31, 1963, Roger Jackson, Stan Jensen, Steve Marts, and Don
-- Schmechel climbed directly up Crooked Thumb's east face from the
-- glacier -- matching this row's beta almost verbatim (rope of four,
-- east face, class 3-4, same day as the peak's other new route).
-- Expanded to full first names from that primary source. Note: this is
-- the FA of this specific east-face LINE, not of the peak overall --
-- Wikipedia gives the peak's first ascent as 1940 (Fred and Helmy
-- Beckey), which this row's `fa`/`beta` never claimed to contradict, so
-- no change needed there.
UPDATE routes SET fa = 'Roger Jackson, Stan Jensen, Steve Marts, Don Schmechel (The Mountaineers) — July 31, 1963'
  WHERE id = 'wa_crooked_thumb_peak_east_face'
    AND fa = 'Jackson, Jensen, Marts, Schmechel (The Mountaineers) — July 31, 1963';

-- =========================================================================
-- Complete South Buttress (Cutthroat Peak) -- wa_complete_south_buttress
-- =========================================================================
-- Two defects on one sentence, duplicated across `timing` and `itinerary`:
-- (1) `timing.sectionBreakdown[0].note` was truncated mid-word in storage,
--     literally ending "...making it a l…" -- a data-pipeline truncation,
--     not a display artifact (confirmed by reading the raw stored string).
--     The `itinerary.days[0].note` field on the same row carries the same
--     sentence in full, so the intended text is recoverable without
--     inventing anything.
-- (2) Both notes claimed the standard/regular South Buttress is
--     "commonly-linked" to ~12 pitches. Confirmed via WebSearch (Mountain
--     Project's route page/comments citing the Supertopo guide, and
--     Beckey's Cascade Alpine Guide: "as many as sixteen pitches if you
--     belay everything, about half that otherwise") that the commonly
--     cited figure for the standard route is 16 pitches (or ~8 when
--     linked/simul-climbed) -- no source supports 12. This row's own
--     `itinerary.days[0].schedule[2].detail` already independently says
--     "Up to ~16 pitches", so the fix also resolves an internal
--     disagreement within the row rather than introducing a new claim.
-- Restored the truncated `timing` note to the itinerary's full wording
-- and corrected "~12-pitch" to "16-pitch" in both.
UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"The ''Complete'' South Buttress follows the full original line low on the buttress (Supertopo shows up to 22 pitches) rather than the commonly-cited 16-pitch standard version, making it a longer day of rope work than the standard South Buttress before the same long descent."'::jsonb, true)
  WHERE id = 'wa_complete_south_buttress'
    AND timing->'sectionBreakdown'->0->>'note' = 'The ''Complete'' South Buttress follows the full original line low on the buttress (Supertopo shows up to 22 pitches) rather than the commonly-linked ~12-pitch version, making it a l…';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,note}', '"The ''Complete'' South Buttress follows the full original line low on the buttress (published topos show up to 22 pitches) rather than the commonly-cited 16-pitch standard version, making it a longer day of rope work than the standard South Buttress before the same long descent."'::jsonb, true)
  WHERE id = 'wa_complete_south_buttress'
    AND itinerary->'days'->0->>'note' = 'The ''Complete'' South Buttress follows the full original line low on the buttress (published topos show up to 22 pitches) rather than the commonly-linked ~12-pitch version, making it a longer day of rope work than the standard South Buttress before the same long descent.';
