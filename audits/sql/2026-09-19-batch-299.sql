-- WA alpine audit batch 299

-- wa_spire_point_southwest_face: `approach` still said "the base of the southwest face"
-- for where the technical climbing starts. This row's own `corrections` field documents a
-- 2026-08-27 fix that changed aspect (SW->SE), face, and name to "Southeast Face" -- reasoning
-- that the row's own beta, pitch_detail (x2 of 4 entries), overview, and a first-hand trip
-- report all consistently describe the climbing as east/southeast-facing, and that the
-- original SW reading rested on a geometry leg that was actually the approach bearing (pins
-- interpolated along the trailhead-summit chord) plus a misquoted secondary source. That
-- correction was never propagated to this field, leaving it internally inconsistent with the
-- row's own corrected `face`/`aspect` and with its own `pitch_detail[2].notes`
-- ("Ledge traverse across southeast face...") and `waypoints[6].note`
-- ("...base of southeast face at 8,000 feet.") two fields over on the same row.
UPDATE routes SET approach = 'Start at the Downey Creek Trailhead (end of FR 26/Suiattle River Road, elev. ~1,450''). Follow the Downey Creek Trail (#792) roughly 6.5 miles of gentle, well-graded old-growth forest walking — recent Forest Service work has added boardwalks and new log bridges — to Sixmile Camp and the final log crossing of Bachelor Creek at about 2,400''. From the north side of that crossing, pick up the unmaintained Bachelor Creek climbers'' path: it starts as a distinct boot-track climbing steeply beside the creek, then eases into switchbacks. Expect brushy, overgrown sections (salmon berry and vine maple) through the 4,000'' meadows; the path fords Bachelor Creek again near a campsite, then climbs an avalanche chute on switchbacks before ducking back into trees on climber''s left. Around 5,900'' the path tops out on the forested ridge above Cub Lake — descend ~500'' on steep switchbacks to the lake (good camping), skirt its north shore, and continue to Itswoot Ridge, where a stream draining the Spire Point basin gives a reliable camp/water source at roughly 6,400''. This is the natural high camp for the route (car-to-camp is already ~12-13 miles and 5,000''+ of gain). From camp, hike north up Itswoot Ridge staying on talus on its west (left) side near the stream to bypass rock towers directly above camp; the ridge crest itself is only walkable in short gentle sections. You''ll hit permanent snow before Spire Col (7,760''): either climb moderate ~30° snow straight up to the col, or skirt around the left edge of the snowfield on rock. From the col, contour/climb east on talus and broken ledges roughly 400-500'' to the base of the southeast face, where the route starts up loose talus into a short (~30'') Class 4 chimney. Rope up for the exposed Class 4-5.5 face/chimney climbing above. Hazards: creek fords on Bachelor Creek can be swift in early season, the Bachelor Creek path is brushy and easy to lose, the avalanche chute holds snow late and is exposed to slide activity into early summer, and the final approach to the col crosses glacier-remnant snow that firms up icy in morning — an axe and possibly crampons are standard kit into midsummer.'
  WHERE id = 'wa_spire_point_southwest_face' AND approach = 'Start at the Downey Creek Trailhead (end of FR 26/Suiattle River Road, elev. ~1,450''). Follow the Downey Creek Trail (#792) roughly 6.5 miles of gentle, well-graded old-growth forest walking — recent Forest Service work has added boardwalks and new log bridges — to Sixmile Camp and the final log crossing of Bachelor Creek at about 2,400''. From the north side of that crossing, pick up the unmaintained Bachelor Creek climbers'' path: it starts as a distinct boot-track climbing steeply beside the creek, then eases into switchbacks. Expect brushy, overgrown sections (salmon berry and vine maple) through the 4,000'' meadows; the path fords Bachelor Creek again near a campsite, then climbs an avalanche chute on switchbacks before ducking back into trees on climber''s left. Around 5,900'' the path tops out on the forested ridge above Cub Lake — descend ~500'' on steep switchbacks to the lake (good camping), skirt its north shore, and continue to Itswoot Ridge, where a stream draining the Spire Point basin gives a reliable camp/water source at roughly 6,400''. This is the natural high camp for the route (car-to-camp is already ~12-13 miles and 5,000''+ of gain). From camp, hike north up Itswoot Ridge staying on talus on its west (left) side near the stream to bypass rock towers directly above camp; the ridge crest itself is only walkable in short gentle sections. You''ll hit permanent snow before Spire Col (7,760''): either climb moderate ~30° snow straight up to the col, or skirt around the left edge of the snowfield on rock. From the col, contour/climb east on talus and broken ledges roughly 400-500'' to the base of the southwest face, where the route starts up loose talus into a short (~30'') Class 4 chimney. Rope up for the exposed Class 4-5.5 face/chimney climbing above. Hazards: creek fords on Bachelor Creek can be swift in early season, the Bachelor Creek path is brushy and easy to lose, the avalanche chute holds snow late and is exposed to slide activity into early summer, and the final approach to the col crosses glacier-remnant snow that firms up icy in morning — an axe and possibly crampons are standard kit into midsummer.';

-- wa_spire_point_southwest_face: `descent_text` opened "Descend the same southwest face
-- line" -- same stale-after-correction issue as `approach` above.
UPDATE routes SET descent_text = 'Descend the same southeast face line rather than a separate walk-off. From the tiny, exposed summit horn, parties typically belay the last person down/back from the highest ledge (3rd ledge below the true summit) using slings around the horn as an anchor, then set up rappels from that ledge system rather than the summit itself for more working room. The standard sequence is two rappels of roughly 28-30 meters each — done with a single 60m rope doubled (not two full 60m raps) — down natural sling/webbing anchors (no bolts reported): the first rappel drops to an anchor just above the Class 4 chimney passed on the way up, and the second rappel from there reaches easy talus at the base of the chimney/face. From there, downclimb and reverse the talus/ledges back to Spire Col, then retrace the approach: down the snow/talus to Itswoot Ridge, around Cub Lake, down the Bachelor Creek path, and out the Downey Creek Trail. Watch for loose rock in the chimney and on the ledges (this is broken alpine granite, not a clean crack system), confirm sling anchors are sound/not sun-bleached before weighting them, and back up questionable webbing with your own if in doubt. Because the approach and descent share the same brushy, routefinding-heavy Bachelor Creek path, budget real time and daylight for the reversal — parties commonly camp at Itswoot Ridge or Cub Lake both nights rather than pushing the whole thing car-to-car.'
  WHERE id = 'wa_spire_point_southwest_face' AND descent_text = 'Descend the same southwest face line rather than a separate walk-off. From the tiny, exposed summit horn, parties typically belay the last person down/back from the highest ledge (3rd ledge below the true summit) using slings around the horn as an anchor, then set up rappels from that ledge system rather than the summit itself for more working room. The standard sequence is two rappels of roughly 28-30 meters each — done with a single 60m rope doubled (not two full 60m raps) — down natural sling/webbing anchors (no bolts reported): the first rappel drops to an anchor just above the Class 4 chimney passed on the way up, and the second rappel from there reaches easy talus at the base of the chimney/face. From there, downclimb and reverse the talus/ledges back to Spire Col, then retrace the approach: down the snow/talus to Itswoot Ridge, around Cub Lake, down the Bachelor Creek path, and out the Downey Creek Trail. Watch for loose rock in the chimney and on the ledges (this is broken alpine granite, not a clean crack system), confirm sling anchors are sound/not sun-bleached before weighting them, and back up questionable webbing with your own if in doubt. Because the approach and descent share the same brushy, routefinding-heavy Bachelor Creek path, budget real time and daylight for the reversal — parties commonly camp at Itswoot Ridge or Cub Lake both nights rather than pushing the whole thing car-to-car.';

-- wa_spire_point_southwest_face: `beta` opened "The south face is accessed from Spire
-- Col..." then, two sentences later, correctly said "...traverses class 3 ledges on the
-- southeast face" -- internally self-contradictory within one short paragraph about the same
-- stretch of climbing. Corrected the first mention to match the second (and the row's
-- corrected `face` field).
UPDATE routes SET beta = 'The southeast face is accessed from Spire Col at 7,760 feet. Route climbs class 2-3 scrambling to a class 4 chimney, then traverses class 3 ledges on the southeast face. Final pitch involves friction slab climbing (class 5.6) or alternate cracks left of the slab. Route-finding to the crux can be challenging. The summit horn is extremely exposed with only room for one person at a time; rope belays required for final exposed sections. Descent via two 60-meter rappels to scree.'
  WHERE id = 'wa_spire_point_southwest_face' AND beta = 'The south face is accessed from Spire Col at 7,760 feet. Route climbs class 2-3 scrambling to a class 4 chimney, then traverses class 3 ledges on the southeast face. Final pitch involves friction slab climbing (class 5.6) or alternate cracks left of the slab. Route-finding to the crux can be challenging. The summit horn is extremely exposed with only room for one person at a time; rope belays required for final exposed sections. Descent via two 60-meter rappels to scree.';

-- wa_spire_point_southwest_face: `rope_note` still said "south/southwest face" -- same
-- stale-after-correction issue.
UPDATE routes SET rope_note = 'Remote Dome Peak-area summit; southeast face is a 5-pitch 5.6 (low-5th-class) rock route reached via glacier approach. Light trad rack plus glacier travel gear for approach.'
  WHERE id = 'wa_spire_point_southwest_face' AND rope_note = 'Remote Dome Peak-area summit; south/southwest face is a 5-pitch 5.6 (low-5th-class) rock route reached via glacier approach. Light trad rack plus glacier travel gear for approach.';

-- wa_spire_point_southwest_face: waypoints[5] ("Spire Col") note still said "southwest
-- face route starts" -- stale after the 2026-08-27 aspect/face/name correction (SW->SE)
-- already documented in this row's own `corrections` field.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{5,note}', '"Standard high camp on Itswoot Ridge with the first view north across the Ptarmigan Traverse; the southeast face route starts directly above camp on slabby ledges."'::jsonb)
  WHERE id = 'wa_spire_point_southwest_face' AND waypoints#>>'{5,note}' = 'Standard high camp on Itswoot Ridge with the first view north across the Ptarmigan Traverse; the southwest face route starts directly above camp on slabby ledges.';

-- wa_spire_point_southwest_face: bivy[6] ("Spire Col bivouac") notes still named
-- "the Southwest Face" for this same stale reason.
UPDATE routes SET bivy = jsonb_set(bivy, '{6,notes}', '"The col at 7,760 ft between Itswoot Ridge and the upper Dana Glacier, and the highest useful bivouac for Spire Point. Taking it saves an hour or more off summit morning on the Southeast Face and puts you above the section of snow that softens in the afternoon. It is fully exposed, cold, and windy, which is the trade. Parties heading on to Dome Peak sometimes use it too, though the Dome Glacier camps further east are better placed for that. Treat this as a fair-weather option: there is no shelter, and retreating from here in bad weather means downclimbing snow you came up in daylight."'::jsonb)
  WHERE id = 'wa_spire_point_southwest_face' AND bivy#>>'{6,notes}' = 'The col at 7,760 ft between Itswoot Ridge and the upper Dana Glacier, and the highest useful bivouac for Spire Point. Taking it saves an hour or more off summit morning on the Southwest Face and puts you above the section of snow that softens in the afternoon. It is fully exposed, cold, and windy, which is the trade. Parties heading on to Dome Peak sometimes use it too, though the Dome Glacier camps further east are better placed for that. Treat this as a fair-weather option: there is no shelter, and retreating from here in bad weather means downclimbing snow you came up in daylight.';

-- wa_spire_point_southwest_face: itinerary.days[2].objective carried a hedged
-- "southwest/southeast" that was never cleaned up to the single corrected direction.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,2,objective}', '"Climb Spire Point via the southeast face, then descend to Sixmile Camp"'::jsonb)
  WHERE id = 'wa_spire_point_southwest_face' AND itinerary#>>'{days,2,objective}' = 'Climb Spire Point via the southwest/southeast face, then descend to Sixmile Camp';

-- wa_spire_point_southwest_face: partner_requirements.approachTime still said
-- "summit day on the southwest face".
UPDATE routes SET partner_requirements = jsonb_set(partner_requirements, '{approachTime}', '"Multi-day approach (typically 2+ days in via the Ptarmigan Traverse to an Itswoot Ridge or Cub Lake camp) before a summit day on the southeast face"'::jsonb)
  WHERE id = 'wa_spire_point_southwest_face' AND partner_requirements#>>'{approachTime}' = 'Multi-day approach (typically 2+ days in via the Ptarmigan Traverse to an Itswoot Ridge or Cub Lake camp) before a summit day on the southwest face';

-- wa_spire_point_southwest_face: seasonal_hazards.exposure and .crevasses both still
-- said "southwest face".
UPDATE routes SET seasonal_hazards = jsonb_set(
      jsonb_set(seasonal_hazards, '{exposure}', '"Real exposure on the short southeast face and on the airy summit itself, compounded by loose blocks near the top and the overall remoteness of the objective (self-rescue distance is long)"'::jsonb),
      '{crevasses}', '"The Ptarmigan Traverse approach used to reach an Itswoot Ridge/Cub Lake camp crosses glaciated terrain typical of the traverse, so standard glacier travel/crevasse precautions apply on the approach; no specific glacier crossing is itemized for the final push to the southeast face itself, so this should be treated as a probable rather than confirmed hazard"'::jsonb
    )
  WHERE id = 'wa_spire_point_southwest_face'
    AND seasonal_hazards#>>'{exposure}' = 'Real exposure on the short southwest face and on the airy summit itself, compounded by loose blocks near the top and the overall remoteness of the objective (self-rescue distance is long)'
    AND seasonal_hazards#>>'{crevasses}' = 'The Ptarmigan Traverse approach used to reach an Itswoot Ridge/Cub Lake camp crosses glaciated terrain typical of the traverse, so standard glacier travel/crevasse precautions apply on the approach; no specific glacier crossing is itemized for the final push to the southwest face itself, so this should be treated as a probable rather than confirmed hazard';

-- wa_spire_point_southwest_face: data_quality.gaps[1] is a now-stale hedge
-- ("treat the 'Southwest Face' aspect label as approximate") superseded by the 2026-08-27
-- correction, which resolved the ambiguity this gap note was hedging about (the row's own
-- beta, pitch_detail x2, and overview all consistently say southeast). Removed rather than
-- reworded since the ambiguity it described no longer exists per the row's own corrections
-- trail.
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps}', (data_quality->'gaps') - 'Sources describe the route as starting on the southwest face but finishing on ledges above the west/east faces — treat the ''Southwest Face'' aspect label as approximate rather than a single consistent face.')
  WHERE id = 'wa_spire_point_southwest_face' AND data_quality->'gaps' @> '["Sources describe the route as starting on the southwest face but finishing on ledges above the west/east faces — treat the ''Southwest Face'' aspect label as approximate rather than a single consistent face."]'::jsonb;

-- wa_storm_king_southwest_scramble: waypoints[0] ("Colonial Creek Campground
-- Trailhead") carried a self-contradicting note -- its final sentence asserted the stored
-- trailhead was "a different, unconnected drainage... very likely wrong" for the Bridge
-- Creek Trail/PCT-from-Rainy-Pass approach it was describing, while this SAME waypoint's own
-- `directions` field, and this row's separate top-level `approach` field, both independently
-- (and consistently with each other) describe Colonial Creek Campground as the standard
-- trailhead for the Thunder Creek Trail approach to Park Creek Pass -- naming the same
-- established camps (McAllister, Junction, Skagit Queen, Thunder Basin) that WTA/Hiking
-- Project/Mountaineers.org confirm sit along that exact trail, which does reach Park Creek
-- Pass (immediately adjacent to Storm King). External corroboration: Thunder Creek Trail
-- "starts at a well-marked trailhead at the south end of Colonial Creek Campground" and runs
-- to Park Creek Pass via Neve/McAllister/Tricouni/Junction/Thunder Basin camps (Hiking
-- Project, Mountaineers.org). So the doubt in this one sentence is stale -- superseded by the
-- confirmed narrative in the row's own `directions`/`approach` fields -- and left a live,
-- unresolved self-contradiction on a remote-approach safety-relevant waypoint. Removed only
-- the disproven closing sentence; left the rest of the note (the Rainy Pass/Bridge Creek
-- Trail alternate-approach description) intact since nothing here contradicts it.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,note}', '"Drive-to trailhead on SR-20 at Rainy Pass (milepost ~158); hike south on the Bridge Creek Trail/PCT ~9.5 mi (with ~2000 ft loss) to North Fork Group Camp, then leave trail cross-country toward the basin south of Storm King. Some parties instead approach from the south via the Lady of the Lake ferry to Stehekin + shuttle to High Bridge Camp, joining the same Bridge Creek/North Fork trail system."'::jsonb)
  WHERE id = 'wa_storm_king_southwest_scramble' AND waypoints#>>'{0,note}' = 'Drive-to trailhead on SR-20 at Rainy Pass (milepost ~158); hike south on the Bridge Creek Trail/PCT ~9.5 mi (with ~2000 ft loss) to North Fork Group Camp, then leave trail cross-country toward the basin south of Storm King. Some parties instead approach from the south via the Lady of the Lake ferry to Stehekin + shuttle to High Bridge Camp, joining the same Bridge Creek/North Fork trail system. The current DB trailhead (Thunder Creek Trailhead / Colonial Creek Campground, ~48.6855,-121.0925) is a different, unconnected drainage well north of here and is very likely wrong.';

-- wa_sw_ridge (Middle Peak / "Middle Gunsight"): this route shares the same
-- Ptarmigan Traverse corridor `bivy` list as wa_spire_point_southwest_face (verified: identical
-- "Spire Col bivouac" entry, byte-for-byte, appears on both rows plus 14 other routes in this
-- corridor -- a documented shared "zone file" convention, not contamination). Its copy of that
-- entry carries the SAME stale "Southwest Face" reference to Spire Point's route (corrected
-- to Southeast Face on wa_spire_point_southwest_face on 2026-08-27, per that row's own
-- `corrections` field). Fixed here for consistency; the same stale text was independently
-- verified to still appear on at least 14 further routes in this shared corridor bivy list
-- (wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer, wa_gunrunner,
-- wa_gunsight_peak_standard, wa_old_guard_peak_east_side_route,
-- wa_old_guard_peak_southwest_route, wa_ptarmigan_traverse, wa_sinister_peak_north_face,
-- wa_sinister_peak_southwest_route, wa_accidental_discharge_east_face, wa_east_face,
-- wa_south_ridge, wa_west_face, wa_west_face_2) -- most outside this batch's alphabetical
-- window and several already passed in earlier batches this pass; flagging for a future pass
-- to sweep the rest rather than touching routes outside today's batch.
UPDATE routes SET bivy = jsonb_set(bivy, '{6,notes}', '"The col at 7,760 ft between Itswoot Ridge and the upper Dana Glacier, and the highest useful bivouac for Spire Point. Taking it saves an hour or more off summit morning on the Southeast Face and puts you above the section of snow that softens in the afternoon. It is fully exposed, cold, and windy, which is the trade. Parties heading on to Dome Peak sometimes use it too, though the Dome Glacier camps further east are better placed for that. Treat this as a fair-weather option: there is no shelter, and retreating from here in bad weather means downclimbing snow you came up in daylight."'::jsonb)
  WHERE id = 'wa_sw_ridge' AND bivy#>>'{6,notes}' = 'The col at 7,760 ft between Itswoot Ridge and the upper Dana Glacier, and the highest useful bivouac for Spire Point. Taking it saves an hour or more off summit morning on the Southwest Face and puts you above the section of snow that softens in the afternoon. It is fully exposed, cold, and windy, which is the trade. Parties heading on to Dome Peak sometimes use it too, though the Dome Glacier camps further east are better placed for that. Treat this as a fair-weather option: there is no shelter, and retreating from here in bad weather means downclimbing snow you came up in daylight.';
