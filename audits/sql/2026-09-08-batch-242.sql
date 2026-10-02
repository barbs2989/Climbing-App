-- WA alpine audit batch 242 (pass 5)
-- Routes: wa_amphitheater_mountain_middle_finger_buttress_left_side,
-- wa_amphitheater_mountain_middle_finger_buttress_right_side,
-- wa_amphitheater_mountain_north_ridge, wa_amphitheater_mountain_pilgrimage_to_mecca,
-- wa_amphitheater_mountain_west_route, wa_andersons_thumb_standard,
-- wa_argonaut_peak_east_ridge, wa_argonaut_peak_northeast_couloir

-- wa_amphitheater_mountain_west_route ("West Route", the standard walk-up): gain_ft is
-- stored as 3000 and loss_ft is NULL. This route's own two waypoints give trailhead
-- elevation 3,050 ft (Andrews Creek Trailhead) and summit elevation 8,358 ft -- a net rise
-- of 5,308 ft -- and the route carries no pitches/technical climbing to credit any of that
-- rise away (its own detailed_rack/pro_needs/rope_note all say "no technical rock rack is
-- needed... it's a walk"). A stored gain of 3,000 ft is therefore below the floor implied by
-- the route's own start/end elevations, which is impossible for a route that reaches the
-- summit. This is independently corroborated two ways: (1) all four SIBLING technical routes
-- on this same peak, using this same Andrews Creek approach, store gain_ft=4800 -- each of
-- which, per this route's own established convention of crediting ~35m per roped pitch
-- against a shared walking-gain baseline, backs out to a baseline of ~5,260-5,600 ft, matching
-- the net rise almost exactly; and (2) external sources (WTA-cited hike descriptions of the
-- Andrews Creek approach to Cathedral Lakes) put the approach-to-the-lakes gain alone at
-- roughly 4,200-4,600 ft, before any of the additional ~750-1,000 ft gained on summit day from
-- the lake (7,380-7,400 ft) to the 8,358 ft summit -- consistent with a total in the same
-- ~5,300-5,900 ft range. Corrected to the row's own directly-derivable floor (net rise,
-- 5,308 ft) for both gain_ft and loss_ft (a round-trip route returning to the same trailhead,
-- matching the pattern already used on this route's own siblings, all of which store
-- gain_ft = loss_ft).
UPDATE routes SET gain_ft = 5308, loss_ft = 5308
WHERE id = 'wa_amphitheater_mountain_west_route' AND gain_ft = 3000 AND loss_ft IS NULL;


-- wa_andersons_thumb_standard (Anderson's Thumb, central Olympics): the `corrections` field
-- (from an earlier research pass) claims exhaustive searching "turned up no trip report,
-- route description, or database entry for a Washington North Cascades peak/route named
-- 'Anderson's Thumb'" and recommends flagging the route's very existence/location for
-- verification. Two things are wrong with this note. First, it searches for a "North
-- Cascades" feature -- but this route is in the central OLYMPICS (its own area path is
-- wa_olympics.wa_olympic_np.wa_central_olympics), a different range entirely, which likely
-- explains why the earlier search came up empty. Second, and more importantly, a public
-- source for this exact feature does exist: a Mount Anderson trip report by Jim Brisbine
-- (trailcatjim.com) independently describes a party tempted to scramble "Anderson's Thumb"
-- near the Eel Glacier/Flypaper Pass, calling it "a fun rock climb on good sandstone," and
-- records their attempt being turned back when rain started -- both details already match
-- this row's own `hazards` ("good sandstone") and `watch_out` ("a trip report records a
-- summit bid aborted by sudden rain") text closely enough that this is very likely the
-- source those fields were built from. So this row's own overview/beta/approach content is
-- externally corroborated rather than unverifiable. The underlying data gaps this note was
-- trying to flag (no confirmed technical grade, no first-ascent record, no exact GPS track)
-- remain real and are separately and correctly recorded in this row's own data_quality.gaps
-- -- only the "existence/location could not be verified, flag before further enrichment"
-- claim in `corrections` was wrong, and is replaced below.
UPDATE routes
SET corrections = 'An earlier pass flagged this route''s existence/location as unverifiable, having searched for a "Washington North Cascades" peak/route named ''Anderson''s Thumb'' and found nothing -- but this route is in the central OLYMPICS, a different range, which is the likely reason that search came up empty. A public source does exist: a Mount Anderson trip report by Jim Brisbine (trailcatjim.com) independently describes this exact spire near Flypaper Pass/the Eel Glacier as "a fun rock climb on good sandstone," and records a summit attempt turned back by sudden rain -- both details already match this row''s own hazards/watch_out text closely, so the route''s existence and general location are corroborated. The remaining gaps (no confirmed technical grade, no first-ascent record, no exact rack list or GPS track) are real and are recorded separately in data_quality.gaps; gear/detailedRack/proNeeds here remain a conservative inference from the "Class 4 / low 5th" grade, not a sourced rack list.'
WHERE id = 'wa_andersons_thumb_standard'
  AND corrections = 'The existing gear/detailedRack/proNeeds text for this route is flagged as AI-generated placeholder (autoGenerated=true) and could not be verified: exhaustive searching across Mountain Project, SummitPost, CascadeClimbers, Peakbagger, WTA, NWHikers.net, AAC/AAJ, StephAbegg, and ClimberKyle turned up no trip report, route description, or database entry for a Washington North Cascades peak/route named ''Anderson''s Thumb'' at ~6,785 ft. All fields above are a conservative inference from the stated ''Class 4 / low 5th'' grade only — recommend flagging this peak/route for verification of its name, location, and existence before further gear enrichment, since it may be a very obscure/locally-named feature with no public documentation, or a naming/data-entry issue.';

-- Same route: waypoints[0] ("Dosewallips Road washout parking (FR-2610)", the Trailhead
-- waypoint) carries two disagreeing elevation fields on the same point -- elev: 700 and
-- elevFt: 1600. Public sources for the Dosewallips Road washout/parking area put it at
-- roughly 520-600 ft, which is in the same ballpark as the stored elev (700) and nowhere
-- near the stored elevFt (1600, which is closer to figures reported for trailheads/camps much
-- further up the valley). Regardless of the small remaining gap to the externally-reported
-- figure, elev and elevFt describing the same lat/lng cannot both be right when they disagree
-- by 900+ ft; every other waypoint in this route's own array that carries both fields (e.g.
-- the Mount Anderson summit waypoint, elev 7330 / elevFt 7330) has them agree. Corrected
-- elevFt to match this waypoint's own elev.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '700')
WHERE id = 'wa_andersons_thumb_standard'
  AND waypoints->0->>'elev' = '700'
  AND waypoints->0->>'elevFt' = '1600'
  AND waypoints->0->>'name' = 'Dosewallips Road washout parking (FR-2610)';


-- wa_argonaut_peak_east_ridge -- FLAGGED FOR HUMAN REVIEW, NOT AUTO-FIXED. This row's own
-- data_quality.gaps already records that on 2026-07-15 it was renamed away from a previously
-- stored "East Ridge, Grade III, 6 pitches" (said to have "no corroborating source") to the
-- real, documented "Southeast Ridge, Grade II, 5.6, 8 pitches" per Mountaineers.org/
-- SummitPost. But that rename appears to have only updated the top-level name/grade/pitches
-- columns (and one nested field, partner_requirements, which does say "8-pitch") -- every
-- other body field still describes the OLD route:
--   * approach/beta/pitch_detail/descent_text/rappel_detail all describe climbing FROM THE
--     ARGONAUT-COLCHUCK COL (reached via Mountaineer Creek/Stuart Lake trailhead, the NORTH
--     side of the peak), not from Beverly Turnpike/Ingalls Creek/Porcupine Creek (the SOUTH
--     side, which this row's own approach text also separately describes as the actual GPS
--     track: "Matches this route's own recorded GPS track almost exactly" on the Beverly
--     Turnpike waypoint note).
--   * pitch_detail only lists 6 pitches (not 8), ending "to the TRUE summit" -- but
--     data_quality.gaps separately notes the real Southeast Ridge "tops out on the SE spire
--     (a false summit) before continuing to the true summit," a structure this pitch_detail
--     does not reflect at all.
--   * detailed_rack literally describes the old route as a rappel DESCENT off a DIFFERENT
--     climb ("most commonly encountered as the standard rappel descent off the Northwest
--     Arete... in 4 rappels"), not as a primary 8-pitch ascent route.
--   * seasonal_hazards.exposure again says "6 pitches," directly contradicting
--     partner_requirements' "8-pitch" language two fields over, within this same row.
--   * this row's OWN bivy list (shared verbatim with the Northeast Couloir route) states that
--     the Argonaut-Colchuck col camp "serves only Argonaut's north side; the South Face and
--     Southeast Ridge are approached from Ingalls Creek and there is no reasonable way to link
--     the two in a day" -- i.e. the row's own bivy data says the approach its own
--     beta/pitch_detail describe is not how the Southeast Ridge is reached at all.
-- This is the same "half-corrected row" shape already documented in this audit's history
-- (batch 4's wa_cascade_peak_east_ridge: identifying fields updated to a real route, body
-- text left describing the previously-conflated one) and needs a human/researcher rewrite of
-- the body fields to actually describe the 8-pitch Southeast Ridge (topping the SE spire,
-- approached via Beverly Turnpike/Porcupine Creek) rather than a piecemeal patch -- there is
-- no source-backed pitch-by-pitch description of the real route available to this pass to
-- safely fabricate the missing content. dist_km (8) is also worth a second look in the same
-- pass: it implies a ~5 mi one-way distance, well under the ~9 mi one-way this row's own
-- itinerary.days totals (9 mi approach day + 9 mi climb-and-exit day) suggest, but resolving
-- that cleanly depends on first settling which approach/route this row is actually
-- describing.
-- No UPDATE for this route this batch.
