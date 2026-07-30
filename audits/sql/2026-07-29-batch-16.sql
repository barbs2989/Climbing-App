-- WA Alpine Audit — Pass 1, Batch 16 — 2026-07-29
-- Peaks: Ingalls Peak (East Peak + South Ridge), Inner Constance, Inspiration Peak,
--        Jack Mountain, Johannesburg Mountain (CJ Couloir + Northeast Buttress),
--        Mount Stuart (King Kong), Klawatti Peak

-- wa_ingalls_peak_east_route: fa surname "Butcharc" is a typo for Stan Butchart. The
-- row's own `overview` field already correctly spells it "Stan Butchart" — this is a
-- one-field self-contradiction. Corroborated externally (SummitPost/Mountain
-- Project/Wikipedia aggregate on the Ingalls Peak East Peak first ascent, Nov 1952).
UPDATE routes SET fa = 'Gene Prater, Bill Prater & Stan Butchart, Nov 1952'
WHERE id = 'wa_ingalls_peak_east_route';

-- wa_ingalls_peak_east_route: grade_num stored as 5 for grade "5.3 (low 5th class)".
-- Checked the DB-wide YDS grade_num convention across dozens of other routes (5.4->4,
-- 5.7->7, 5.8->8, 5.10a->10.25, etc.) -- grade_num is consistently the YDS decimal
-- digit, so "5.3" should be grade_num=3, not 5. The sibling South Ridge route below
-- correctly stores grade_num=4 for its "5.4" grade, confirming the convention.
UPDATE routes SET grade_num = 3
WHERE id = 'wa_ingalls_peak_east_route';

-- wa_ingalls_peak_east_route: gain_ft/loss_ft stored as 4200/4200, contradicting this
-- row's own waypoint elevation profile (trailhead 4,269 ft -> summit 7,480 ft, net gain
-- ~3,200 ft for a short car-to-car day route) and this row's own itinerary.days[0]
-- (gainFt/lossFt: 3300/3300), whose sourceNote states the 3,300 figure was already
-- computed from the row's own trailhead/pass/summit elevations. Applying the
-- correction the row itself already recorded but never propagated to the top-level
-- columns.
UPDATE routes SET gain_ft = 3300, loss_ft = 3300
WHERE id = 'wa_ingalls_peak_east_route';

-- wa_ingalls_peak_south_ridge: fa's second climber is stored as "Ken Colbert" --
-- multiple independent sources (SummitPost, Wikipedia's Ingalls Peak article,
-- Mountain Madness route notes) consistently name the 1941 FA party as "Keith Rankin
-- and Ken Solberg."
UPDATE routes SET fa = 'Keith Rankin & Ken Solberg, May 30, 1941'
WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_ingalls_peak_south_ridge: loss_ft is null while gain_ft=3500 for a car-to-car day
-- climb that returns to the same trailhead (per this row's own itinerary, which
-- records gainFt/lossFt: 3600/3600 for its single day) -- gain and loss should match,
-- not be missing. Filling from the row's own gain figure.
UPDATE routes SET loss_ft = 3500
WHERE id = 'wa_ingalls_peak_south_ridge';

-- wa_inner_constance_northwest_buttress: high_point_ft stored as 7670, a systematic
-- offset from the area's own elevation_ft (7672). The sibling wa_inner_constance_standard
-- route's own overview text cites "Inner Constance (7,672 ft, Peakbagger LiDAR)" and its
-- own summit waypoint is explicitly labeled "True summit (7,672 ft)" -- treating 7,672
-- (the modern LiDAR remeasurement cited by the routes' own content) as correct, over the
-- older 7,670 ft legacy USGS-topo figure that Wikipedia still carries.
UPDATE routes SET high_point_ft = 7672
WHERE id = 'wa_inner_constance_northwest_buttress';

-- wa_inner_constance_standard: same 7670->7672 elevation fix as above, for the same
-- reason (matches the area row and this route's own summit-waypoint citation).
UPDATE routes SET high_point_ft = 7672
WHERE id = 'wa_inner_constance_standard';

-- wa_johannesburg_mountain_northeast_buttress: high_point_ft stored as 9220, wildly
-- wrong for a mountain whose summit is 8,200 ft -- confirmed by the area's own
-- elevation_ft (8200), by Wikipedia, and by this SAME row's own waypoints array, which
-- lists "Johannesburg summit" at elevFt 8200. All other routes on this peak (CJ
-- Couloir, Northeast Ridge 1963, Northeast Rib 1951) also read 8200.
--
-- pitches stored as 30, contradicted by this SAME row's own overview ("a sustained,
-- roughly twenty-pitch line"), watch_out ("running out of daylight on a 20-pitch
-- route"), and itinerary.cal ("a fully committing 20-pitch route") -- three separate
-- internal citations agree on ~20 pitches, and the row's own pitch_detail array only
-- enumerates 12 discrete pitches. No external source gave a firm exact modern pitch
-- count, so 20 is applied as the value the row's own narrative already repeatedly
-- states; a human with a firmer guidebook count should prefer that over 20 if found.
UPDATE routes SET high_point_ft = 8200, pitches = 20
WHERE id = 'wa_johannesburg_mountain_northeast_buttress';

-- wa_king_kong_gorillas_direct_direct: `approach` describes the Stuart Lake
-- Trailhead/Icicle Creek Road approach to Mount Stuart's NORTH side -- but this route's
-- own waypoints list the Esmeralda Basin Trailhead and Ingalls Pass (the SOUTH side),
-- and this row's own `face` field ("West Face Wall, between Goat Pass and Stuart
-- Pass") matches the sibling wa_gorillas_direct route on the exact same wall, whose
-- approach (Esmeralda/Ingalls Way Trail -> Stuart Pass -> Goat Pass) is used here as
-- the corrected text. Clear copy-paste contamination from a different (north-side)
-- Mount Stuart route.
UPDATE routes SET approach = 'From the Esmeralda/Lake Ingalls Trailhead at the end of FS-9737, hike the Ingalls Way Trail up switchbacks past several waterfalls to Longs Pass (6,200 ft) at about mile 2.5, then continue past Ingalls Lake toward Stuart Pass, follow the climbers'' trail onto the talus shoulder below Stuart''s West Ridge, and contour northwest to Goat Pass (7,600 ft). The West Face Wall, home to the Gorillas routes (Gorillas in the Mist / Gorillas Direct / King Kong), sits in the amphitheater roughly midway between Stuart Pass and Goat Pass. Camping is common near Goat Pass or down at Ingalls Creek.'
WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: high_point_ft is null despite this row's own
-- waypoints already recording a "Mount Stuart summit area" point at elev 9415, matching
-- the area's own elevation_ft (9415) and every other Mount Stuart summit-topping
-- sibling route in the DB. Safe fill from the row's own verified subfield.
UPDATE routes SET high_point_ft = 9415
WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_jack_mountain_northeast_glacier: high_point_ft (9075) matches all five other
--    Jack Mountain routes in the DB, but the area's own elevation_ft reads 9069 -- a
--    real cross-source datum conflict (Wikipedia/AllTrails/FKT cite 9,075 ft NAVD88;
--    peakery.com and the Hozameen Range Wikipedia page cite ~9,066-9,069 ft, an older
--    NGVD29 figure). This affects the whole peak's area row plus all 6 of its routes,
--    5 of which are outside this batch's scope -- needs a human to pick one datum/
--    value and apply it consistently, not a single-row patch here.
--  - wa_johannesburg_mountain_northeast_buttress: the row's own `fa`/`beta` fields name
--    Tom Miller (1951) but disagree on his unnamed partner (implied "David Harrah" per
--    beta), and a separate sibling row, wa_johannesburg_mountain_northeast_rib_1951_route,
--    also carries an undated/unattributed "1951" FA -- these may be the same historical
--    climb split across two DB rows (duplicate-route-identity pattern seen repeatedly in
--    prior batches) rather than two distinct lines. AAC archive text confirms Tom
--    Miller's 1951 involvement in "determin[ing] the feasibility of the Northeast
--    Buttress route" but not the partner's name or the "1957 Western Rib variation"
--    attribution. Needs a human with Beckey's Cascade Alpine Guide or the full AAC
--    account to resolve whether these are one route or two.
--  - wa_king_kong_gorillas_direct_direct: `fa` says "Sol Wertkin & Tyree Johnson, 2016
--    (freed by Sol Wertkin)" while `beta` says "First ascent: September 9, 2016 by Sol
--    Wertkin and Jon Gleason" -- likely an FA-vs-FFA (first free ascent) distinction
--    (Wertkin/Johnson first climbed the headwall crack in early September 2016; Wertkin
--    returned with Gleason about a week later to lead it clean), but neither field
--    states which event it documents and exact dates for each sub-event couldn't be
--    pinned from available sources. Needs a human with the original account to sort
--    FA from FFA correctly.
--  - wa_klawatti_peak_southeast_face: the "Bergschrund below the southeast face"
--    waypoint (lat 48.4976) sits roughly 6.3 km (two orders of magnitude too far) from
--    the very next waypoint, the summit at lat 48.554293 -- despite the row's own
--    distMi values implying they're only ~0.2 mi apart. Almost certainly a coordinate
--    transcription error (e.g. a digit slip, perhaps 48.5476), but no GPS track or
--    authoritative source was found to confirm the intended value -- flagging rather
--    than guessing a replacement.
--  - wa_inner_constance_standard: this row's own `corrections` field already documents
--    an unresolved route-identity problem -- the stored name ("Standard Route
--    (Northeast summit via Crystal Pass)") and the approach/descent_text/itinerary
--    fields describe the long Dosewallips Road -> Constance Pass -> Crystal Pass ->
--    Avalanche Canyon approach, while the row's own `overview` states the actual
--    commonly-documented standard line instead goes via a South Gully/South Defile to
--    the East Ridge ("guidebook Route 2A") out of Avalanche Canyon -- a different,
--    shorter approach that the `waypoints` array documents instead. This also produces
--    a secondary numeric contradiction (approach text claims dist_km "~25.75 km"
--    matching the Crystal Pass route, but the stored dist_km is 12.9, closer to the
--    Route 2A approach; gain_ft/loss_ft 7300/7300 don't reconcile with the itinerary's
--    own ~6,000 ft day-sum). A single-field patch would just create a different
--    internal contradiction -- needs a human to pick which approach this row actually
--    documents and rewrite the losing half to match.
--  - wa_inner_constance_seans_route: same stale 7670-vs-7672 elevation slip as the two
--    routes fixed above (same area, same offset), but this route is tagged discipline
--    'trad', outside this audit's alpine/mountaineering scope -- left untouched and
--    flagged here per the established out-of-scope-sibling precedent (cf. batch 14's
--    wa_gunsight_peak_east_face note).
-- =========================================================================

-- Verify afterward:
SELECT id, fa, grade_num, gain_ft, loss_ft FROM routes WHERE id = 'wa_ingalls_peak_east_route';
SELECT id, fa, loss_ft FROM routes WHERE id = 'wa_ingalls_peak_south_ridge';
SELECT id, high_point_ft FROM routes WHERE id IN ('wa_inner_constance_northwest_buttress', 'wa_inner_constance_standard');
SELECT id, high_point_ft, pitches FROM routes WHERE id = 'wa_johannesburg_mountain_northeast_buttress';
SELECT id, approach, high_point_ft FROM routes WHERE id = 'wa_king_kong_gorillas_direct_direct';
