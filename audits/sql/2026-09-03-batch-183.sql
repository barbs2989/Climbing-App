-- WA alpine audit — batch 183 (pass 4)
-- Routes: wa_chair_peak_northwest_ridge, wa_chalangin_peak_little_giant_pass_luahna_col,
-- wa_chianti_spire_east_face, wa_chimney_rock_east_face_direct, wa_chimney_rock_west_face,
-- wa_chiwawa_mountain_southwest, wa_chockstone_route, wa_clark_mountain_west_ridge,
-- wa_classic_route_2, wa_classic_route_3

-- wa_chianti_spire_east_face: `approach` opens with "This is the same East Face/Rebel
-- Yell line as wa_east_face_rebel_yell, so the hike-in is identical." — a raw internal
-- route id leaked into rendered prose, and it is a BROKEN reference: no route with id
-- `wa_east_face_rebel_yell` exists anywhere in the catalog (verified against the live
-- routes table — 0 rows). "Rebel Yell" is not a separately-catalogued route on this
-- peak or any other WA peak either (only this row's own name mentions it). The clause
-- adds nothing a climber can act on and cites a route that does not exist, so it is
-- removed; the rest of the approach text (which already stands on its own) is untouched.
UPDATE routes
SET approach = 'From the SR-20 pullout near milepost ~166 (~0.7 mile past the Cutthroat Lake Road turnoff), a steep, faint climber''s trail descends to Early Winters Creek; cross the creek and follow the climber''s path/talus benches switchbacking up the far side, gaining about 3,500 ft over just under 5 miles to Burgundy Col — roughly 3-4 hours car-to-col with an overnight pack. Stay climber''s-left toward the obvious col notch where the boot-path braids through timber and boulders lower down. A snow patch at/near the col is the last dependable water source but is unreliable by late summer, so carry water up from the creek if climbing after midsummer. From Burgundy Col, drop a short snow/rock step and traverse south below Burgundy Spire''s East Face, across a small snowy rib, onto the upper Silver Star Glacier, and around to Chianti Spire''s obvious east side and the base of the route (~7,900 ft) — under an hour from a col or Larch Bench camp. Carry an ice axe for this traverse through midsummer; the snow rib and glacier margin can be firm or icy in the morning.'
WHERE id = 'wa_chianti_spire_east_face'
  AND approach = 'This is the same East Face/Rebel Yell line as wa_east_face_rebel_yell, so the hike-in is identical. From the SR-20 pullout near milepost ~166 (~0.7 mile past the Cutthroat Lake Road turnoff), a steep, faint climber''s trail descends to Early Winters Creek; cross the creek and follow the climber''s path/talus benches switchbacking up the far side, gaining about 3,500 ft over just under 5 miles to Burgundy Col — roughly 3-4 hours car-to-col with an overnight pack. Stay climber''s-left toward the obvious col notch where the boot-path braids through timber and boulders lower down. A snow patch at/near the col is the last dependable water source but is unreliable by late summer, so carry water up from the creek if climbing after midsummer. From Burgundy Col, drop a short snow/rock step and traverse south below Burgundy Spire''s East Face, across a small snowy rib, onto the upper Silver Star Glacier, and around to Chianti Spire''s obvious east side and the base of the route (~7,900 ft) — under an hour from a col or Larch Bench camp. Carry an ice axe for this traverse through midsummer; the snow rib and glacier margin can be firm or icy in the morning.';

-- Chianti Spire summit elevation: all three routes on this peak (east_face, north_face,
-- lichen_bouquet) store high_point_ft = 8459, with no source found for that figure.
-- ListsOfJohn (the specific-elevation source this catalog relies on elsewhere for
-- unofficial/unsurveyed peaks) gives 8,420 ft; other sources describe it more loosely
-- as "roughly equal to Burgundy Spire (~8,400 ft)". Corrected to the most specific
-- sourced figure and the discrepancy noted as a gap on the audited (alpine) route —
-- north_face/lichen_bouquet are trad-discipline siblings on the same summit, updated
-- only for the shared elevation fact so the peak does not disagree with itself.
UPDATE routes
SET high_point_ft = 8420
WHERE area_id = 'wa_chianti_spire'
  AND high_point_ft = 8459;

UPDATE routes
SET data_quality = jsonb_set(
      data_quality,
      '{gaps}',
      (COALESCE(data_quality->'gaps', '[]'::jsonb)) || '["Summit elevation (8,420 ft) follows ListsOfJohn; this is an unofficial/unsurveyed spire and other sources describe it more loosely as roughly equal to Burgundy Spire (~8,400 ft) rather than giving a precise figure."]'::jsonb
    )
WHERE id = 'wa_chianti_spire_east_face'
  AND data_quality = '{"gaps": [], "confidence": "MEDIUM", "lastVerified": "2026-07-01"}'::jsonb;

-- wa_chockstone_route: `watch_out` stored as a single string joined with literal "\n"
-- characters instead of a JSON array of strings — the recurring array-shape bug this
-- audit has fixed on other routes (e.g. Sharkfin Tower, Mount Shuksan SE Ridge).
-- Content unchanged, only the shape.
UPDATE routes
SET watch_out = '["Chockstone features create technical and exposed sections", "Route-finding through chockstone terrain can be confusing", "Weather exposure on exposed terrain", "Loose rock hazard throughout approach and mixed sections", "Descent route-finding critical in variable terrain"]'::jsonb
WHERE id = 'wa_chockstone_route'
  AND watch_out = '"Chockstone features create technical and exposed sections\nRoute-finding through chockstone terrain can be confusing\nWeather exposure on exposed terrain\nLoose rock hazard throughout approach and mixed sections\nDescent route-finding critical in variable terrain"'::jsonb;

-- wa_classic_route_3 (Lane Peak, "Classic Route" / standard SE-face scramble):
-- `descent_text` flatly states "This is a walk-off/downclimb — no rappelling," which
-- contradicts the row's own `gear` field ("short rope or sling useful for the
-- optional/fixed rappel near the summit") and independent sources. Multiple trip
-- reports (willhiteweb.com and others) describe a short rappel from a large tree near
-- the summit as a standard part of the descent, used instead of downclimbing that
-- step. Corrected to reflect that rather than denying it; the rest of the descent
-- narrative (reversing the ascent line back to the trailhead) is unchanged.
UPDATE routes
SET descent_text = 'Many parties make a short rappel from a large tree near the summit rather than downclimbing that step. From there, reverse the ascent line: downclimb the summit scramble and the southeast-face gully back to the 5,440 ft Lane–Denman saddle, then drop east back through the timber (staying right of the cliff band on the way down, mirroring the ascent line) to the top of the talus slope. Descend the talus to Tatoosh Creek, re-cross, and climb back up to Stevens Canyon Road, then walk back to the Narada Falls or Reflection Lake pullout. Watch for loose rock and inconsistent glissade conditions in the gully (plunge-stepping is fine on consolidated snow but the gully holds loose rock once it melts out), and take care not to cliff yourself out in the timber band by drifting off the ascent line.'
WHERE id = 'wa_classic_route_3'
  AND descent_text = 'This is a walk-off/downclimb — no rappelling. Reverse the ascent line: downclimb the summit scramble and the southeast-face gully back to the 5,440 ft Lane–Denman saddle, then drop east back through the timber (staying right of the cliff band on the way down, mirroring the ascent line) to the top of the talus slope. Descend the talus to Tatoosh Creek, re-cross, and climb back up to Stevens Canyon Road, then walk back to the Narada Falls or Reflection Lake pullout. Watch for loose rock and inconsistent glissade conditions in the gully (plunge-stepping is fine on consolidated snow but the gully holds loose rock once it melts out), and take care not to cliff yourself out in the timber band by drifting off the ascent line.';

-- verify
SELECT id, high_point_ft FROM routes WHERE area_id = 'wa_chianti_spire';
SELECT id, approach FROM routes WHERE id = 'wa_chianti_spire_east_face';
SELECT id, watch_out FROM routes WHERE id = 'wa_chockstone_route';
SELECT id, descent_text FROM routes WHERE id = 'wa_classic_route_3';
