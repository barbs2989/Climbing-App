-- WA alpine audit, pass 2, batch 73 (2026-08-08)
-- Routes: Liberty Bell Mountain (Thin Red Line, Liberty Crack, Liberty Crack
-- (Free), Liberty Traverse), Liberty Cap (Liberty Ridge Finish, Ptarmigan
-- Ridge Finish), Lincoln Peak (North Ridge / "Wilkes-Booth", Standard / "X
-- Couloir"), Little Big Chief Mountain (Northeast Face). Liberty Bell
-- continues batch 72's east-face-approach-contamination cleanup on that
-- peak. Lichtenberg Mountain (West Face/West Rib), also in this batch,
-- audited clean -- no SQL for it.

-- === wa_liberty_bell_thin_red_line ===

-- Thin Red Line is this row's own East Face route (face='East Face',
-- aspect='E', overview: "steep East Face of Liberty Bell"), but its
-- waypoints array held the *entire* west-side Beckey Route approach
-- (Blue Lake Trailhead -> "west face base / sloping bench" -> "west-side
-- bench") -- the same wrong-side-of-the-mountain contamination fixed for
-- three sibling East Face routes on this peak in batch 72. Replaced with
-- the two points this row's own approach text and approach_logistics field
-- (see next fix) actually describe.
UPDATE routes SET waypoints = '[{"lat":48.51454,"lng":-120.64332,"elev":5100,"name":"SR-20 Hairpin / Pond Pullout","note":"Roadside pullout on SR-20 at the hairpin curve east of Washington Pass -- this route''s own approach text and approach_logistics field; the correct East Face trailhead, not the Blue Lake Trailhead/west-side approach previously stored here.","type":"Trailhead","distMi":0},{"lat":48.515435,"lng":-120.658365,"elev":7720,"name":"Liberty Bell summit","note":"Tops out via the East Face; most parties rappel back down the East Face from M&M Ledge (four double-rope rappels) rather than descending the west-side Beckey gully.","type":"Summit","distMi":1}]'::jsonb
WHERE id = 'wa_liberty_bell_thin_red_line';

-- approach_logistics.trailheadLat/Lng (48.5245,-120.6581) don't match the
-- East Face trailhead coordinate this same peak's other East Face routes
-- all converge on in this table (48.51454,-120.64332 -- Liberty Crack,
-- Liberty Crack (Free), and batch 72's East Face/Independence Route fixes),
-- despite this row's own trailhead label/direction text describing the same
-- hairpin-curve/pond pullout.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '48.51454'), '{trailheadLng}', '-120.64332')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- hazards[1] said "high exposure on the west face", contradicting this same
-- row's own face='East Face', aspect='E', and overview text.
UPDATE routes SET hazards = jsonb_set(hazards, '{1}', '"high exposure on the east face"')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- seasonal_hazards.exposure repeated the same "west face" contamination.
UPDATE routes SET seasonal_hazards = jsonb_set(seasonal_hazards, '{exposure}', '"Very high consequence - sustained thin crack climbing at 5.12 with high exposure on the east face and a long, complex rappel descent"')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- partner_requirements.fitnessSpec.hiking said "Blue Lake Trailhead approach
-- to the west face" -- same contamination as the waypoints/approach_logistics
-- fixes above.
UPDATE routes SET partner_requirements = jsonb_set(partner_requirements, '{fitnessSpec,hiking}', '"Short East Face approach via the SR-20 hairpin/pond pullout (not the Blue Lake Trailhead, which serves the west-side Beckey Route)"')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- partner_requirements.approachTime said "1.5-2 hours from the Blue Lake
-- Trailhead" -- contradicts this row's own on-file timing.approachTimeHrs=1
-- and the corrected East Face approach above.
UPDATE routes SET partner_requirements = jsonb_set(partner_requirements, '{approachTime}', '"Roughly 45 minutes to 1 hour via the East Face climbers'' path from the SR-20 hairpin/pond pullout (matches this route''s own on-file approach time; not the Blue Lake Trailhead, which serves the west-side Beckey Route)"')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- timing.sectionBreakdown[0].note and itinerary.days[0].note both open with
-- "Approach from Blue Lake TH..." and itinerary.days[0].note closes with
-- "...standard Beckey-side descent back to the car" -- both contradict this
-- row's own East Face approach/descent (four East-Face rappels via M&M
-- Ledge, per descent_text/rappel_detail/rappel_count_note).
UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"Approach from the SR-20 hairpin/pond pullout to the base (about 45 min-1 hr on the climbers'' trail/talus), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the East Face via M&M Ledge (four double-rope rappels) back to the car."')
WHERE id = 'wa_liberty_bell_thin_red_line';

UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,note}', '"Approach from the SR-20 hairpin/pond pullout to the base (about 45 min-1 hr on the climbers'' trail/talus), climb the sustained free line (5.10-5.12, crux by pitch 9), then rappel the East Face via M&M Ledge (four double-rope rappels) back to the car."')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- Top-level "descent" summary field said "Descend the standard Beckey Route
-- rappels/downclimb on the southwest side back to the gully" -- contradicts
-- this row's own rappel_detail (4 East Face rappels) and descent_text, which
-- states the East Face M&M-Ledge line is "the faster option" that "returns
-- you directly to your pack/the East Face approach," while the SW/notch
-- option explicitly leaves you "on the opposite (west) side of the mountain
-- from your car."
UPDATE routes SET descent = 'Rappel the East Face via M&M Ledge (four double-rope rappels back to the base), per this route''s own descent_text/rappel_detail -- not the southwest-side Beckey Route descent, which leaves you on the opposite side of the mountain from the East Face pullout.'
WHERE id = 'wa_liberty_bell_thin_red_line';

-- gain_ft=1312 contradicts this same row's own loss_ft=2400 and its own
-- itinerary.days[0].gainFt=2400 for a single car-to-car round-trip day
-- (gain must equal loss on an out-and-back). 1312 ft is also well short of
-- the ~2,400-2,600 ft rise from the ~5,100-5,200 ft trailhead to the
-- 7,720 ft summit implied by this row's own high_point_ft.
UPDATE routes SET gain_ft = 2400 WHERE id = 'wa_liberty_bell_thin_red_line';

-- emergency.county trimmed to "Chelan" alone, contradicting this same row's
-- own emergency.notes ("Washington Pass straddles the Chelan/Okanogan county
-- boundary") -- same defect already fixed for siblings Overexposure and
-- Serpentine Crack in batch 72.
UPDATE routes SET emergency = jsonb_set(emergency, '{county}', '"Chelan / Okanogan (summit straddles county line)"')
WHERE id = 'wa_liberty_bell_thin_red_line';

-- gpx is byte-identical to the west-side Beckey/Blue Lake TH track shared
-- (via the same CalTopo source, per data_quality.gaps) by every route on
-- this peak -- physically impossible for an East Face route with a
-- completely different trailhead. No verified East Face GPS track is
-- available to substitute, so this clears the actively-misleading track
-- rather than leaving a route line that points climbers to the wrong side
-- of the mountain; needs a real GPS recording of the East Face approach.
UPDATE routes SET gpx = NULL WHERE id = 'wa_liberty_bell_thin_red_line';

-- === wa_liberty_crack ===

-- waypoints[0] labeled "Blue Lake Trailhead" (west-side coords), directly
-- contradicting this row's own approach text ("does NOT start from the Blue
-- Lake Trailhead -- that's the trailhead for the west-side Beckey Route")
-- and its own approach_logistics field (SR-20 Hairpin/Pond Pullout,
-- 48.51454,-120.64332). Same pattern as batch 72's East
-- Face/Independence Route fixes.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}', '{"lat":48.51454,"lng":-120.64332,"name":"SR-20 Hairpin / Pond Pullout","type":"Trailhead","distMi":0,"elevFt":5100}')
WHERE id = 'wa_liberty_crack';

-- rappels="4" contradicts this same row's own rappel_detail (2 entries) and
-- its own rappel_count_note, which explicitly states the standard descent is
-- two ~25-30m rappels into Beckey Gully and that "the four-rap M&M
-- Ledge/East-Face line is real but belongs to Thin Red Line."
UPDATE routes SET rappels = '2' WHERE id = 'wa_liberty_crack';

-- Same shared west-side gpx track as Thin Red Line, same fix rationale.
UPDATE routes SET gpx = NULL WHERE id = 'wa_liberty_crack';

-- partner_requirements.approachTime says "Roughly 1.5-2 hours to the base of
-- the east face," contradicting this SAME row's own, much more detailed
-- approach text, which gives an explicit "roughly 0.5 mile and 600-800 ft of
-- gain from the car... about 20-30 minutes total."
UPDATE routes SET partner_requirements = jsonb_set(partner_requirements, '{approachTime}', '"Roughly 20-30 minutes to the base of the East Face (about 0.5 mile, 600-800 ft gain from the car)"')
WHERE id = 'wa_liberty_crack';

-- === wa_liberty_crack_free ===

-- waypoints[0] labeled "Blue Lake Trailhead" (west-side coords), directly
-- contradicting this row's own approach text ("this is a different
-- trailhead than the Blue Lake TH used for the SW/NW Face routes").
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0}', '{"lat":48.51454,"lng":-120.64332,"elev":5100,"name":"SR-20 Hairpin / Pond Pullout","note":"Roadside pullout on SR-20 at the hairpin curve east of Washington Pass -- this route''s own approach text states this is a different trailhead than the Blue Lake TH used for the SW/NW Face routes.","type":"Trailhead","distMi":0}')
WHERE id = 'wa_liberty_crack_free';

-- loss_ft is null while gain_ft=2546 and this same row's own
-- itinerary.days[0].lossFt=2546 -- a round-trip car-to-car day should show
-- matching gain/loss, and the itinerary already has the value on file.
UPDATE routes SET loss_ft = 2546 WHERE id = 'wa_liberty_crack_free';

-- Same shared west-side gpx track as the two routes above, same fix rationale.
UPDATE routes SET gpx = NULL WHERE id = 'wa_liberty_crack_free';

-- === wa_liberty_traverse ===

-- approach_logistics.trailheadLat/Lng (48.53,-120.668) both claim to be
-- "Blue Lake Trailhead" but don't match this SAME row's own waypoints[0]
-- Blue Lake Trailhead coordinate (48.5191,-120.6742) -- which is also the
-- coordinate every other Blue-Lake-TH reference in this peak's route table
-- uses. Corrected to match.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '48.5191'), '{trailheadLng}', '-120.6742')
WHERE id = 'wa_liberty_traverse';

-- waypoints[1].note said the traverse "finish[es] at Liberty Bell's true
-- summit" after linking Concord/Lexington Towers -- backwards from this same
-- row's own overview/beta/descent_text, which all agree the traverse STARTS
-- up Liberty Bell via the Beckey Route, then continues over Concord Tower,
-- Lexington Tower and North Early Winter Spire, finishing on South Early
-- Winter Spire's Southwest Rib.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,note}', '"First summit of the traverse, reached via the Beckey Route; the link-up continues on over Concord Tower, Lexington Tower and North Early Winter Spire before finishing on South Early Winter Spire''s Southwest Rib."')
WHERE id = 'wa_liberty_traverse';

-- gain_ft=2001 / loss_ft=null contradict this same row's own
-- itinerary.days[0].gainFt/lossFt=3500/3500 for the identical single-day
-- round trip. 2001 also equals length_m(610)*3.281 almost to the foot,
-- consistent with a unit-conversion mixup (roped-route length substituted
-- for actual trip elevation gain) rather than an independently researched
-- figure -- the itinerary's 3500/3500 already reflects the up-and-down
-- profile of a 5-summit linkup.
UPDATE routes SET gain_ft = 3500, loss_ft = 3500 WHERE id = 'wa_liberty_traverse';

-- === wa_liberty_cap_liberty_ridge_finish ===

-- high_point_ft=14112 contradicts this row's own overview text ("Liberty
-- Cap (14,097 ft; an August 2025 GPS survey puts it closer to 14,095 ft...)")
-- and the parent area row (wa_liberty_cap.elevation_ft=14097, whose own
-- blurb cites the same August 2025 GPS survey). 14112 is a stale/legacy
-- figure this row's own descriptive text doesn't endorse. The row's own
-- Liberty Cap summit waypoint (index 7 of 8) carries the same stale value.
UPDATE routes SET high_point_ft = 14097 WHERE id = 'wa_liberty_cap_liberty_ridge_finish';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '14097') WHERE id = 'wa_liberty_cap_liberty_ridge_finish';

-- === wa_liberty_cap_ptarmigan_ridge_finish ===

-- Same high_point_ft=14112 defect, this time contradicting this row's own
-- waypoints[0] ("Liberty Cap", elevFt: "14097") -- high_point_ft is the
-- outlier within the row itself.
UPDATE routes SET high_point_ft = 14097 WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

-- SR-165's Fairfax Bridge -- the sole public road to Mowich Lake -- was
-- permanently closed to all vehicle/bike/pedestrian traffic on April 22,
-- 2025 after inspectors found deteriorated steel supports (confirmed via
-- WSDOT's official announcements: wsdot.wa.gov/about/news/2025/sr-165-
-- carbon-river-fairfax-bridge-closed-until-further-notice and .../103-year-
-- old-sr-165-carbon-river-fairfax-bridge-permanently-closed). No public
-- detour exists; WSDOT has no funded repair and does not expect restored
-- access before 2031. This row's road/access/approach/waypoint fields still
-- describe ordinary seasonal gating ("often not opening until early-mid
-- July"), which now materially misleads a climber planning this approach.
-- The White River/St. Elmo Pass alternative (already documented in this
-- row) is unaffected and remains viable.
UPDATE routes SET road = jsonb_set(road, '{status}',
  '"Closed indefinitely, not merely seasonal -- SR-165''s Fairfax Bridge (the only public route to Mowich Lake) was permanently closed to all vehicle/bike/foot traffic in April 2025 after inspectors found deteriorated steel supports; WSDOT has no funded repair and does not expect restored access before 2031."'::jsonb)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET road = jsonb_set(road, '{driveNote}',
  '"Mowich Lake is NOT currently reachable by road: SR-165''s Fairfax Bridge, the sole public route in from Carbon River Road near Buckley, has been closed to all traffic (including bikes and pedestrians) since April 2025 and WSDOT has no funded timeline to reopen it. Use the White River approach (St. Elmo Pass) instead -- it is unaffected by this closure."'::jsonb)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET road = jsonb_set(road, '{seasonalGate}',
  '"N/A while the Fairfax Bridge closure persists (see status) -- prior to the April 2025 bridge failure, the gate typically opened early-mid July and closed for winter with the first significant snow (~October)."'::jsonb)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET access = jsonb_set(access, '{closures}',
  '"Mowich Lake Road is not just gated seasonally -- SR-165''s Fairfax Bridge, its only public access point, was permanently closed to all vehicle/bike/foot traffic in April 2025 (structural failure; no WSDOT funding/timeline to reopen as of 2026), so Mowich Lake is currently unreachable by road at all. Use the White River/St. Elmo Pass approach instead. Solo climbing still requires special NPS authorization."'::jsonb)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET approach = replace(approach,
  'reached by gravel road off Carbon River Road near Buckley, often not opening until early-mid July',
  'normally reached by gravel road off Carbon River Road near Buckley -- but SR-165''s Fairfax Bridge, the only public route in, has been closed to all vehicle/bike/foot traffic since April 2025 (structural failure, no funded repair timeline as of 2026), so this approach is not currently usable')
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET approach = replace(approach,
  'longer, but on a road that typically opens earlier than Mowich Lake.',
  'longer, but currently the only viable driving approach while the Fairfax Bridge closure persists.')
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

UPDATE routes SET waypoints = jsonb_set(waypoints, '{3,note}',
  '"Not currently reachable by road -- SR-165''s Fairfax Bridge, the sole public access route, has been closed since April 2025; see the road/access fields."'::jsonb)
WHERE id = 'wa_liberty_cap_ptarmigan_ridge_finish';

-- === wa_lincoln_peak_north_ridge ===

-- name="North Ridge / Standard" doesn't describe this route at all -- this
-- row's own overview states outright that "this slot corresponds to
-- 'Wilkes-Booth,' a ~2,000-ft ice/mixed line on Lincoln Peak's NW Face."
-- Confirmed real via AAC Publications ("Lincoln Peak, Northwest Face,
-- Wilkes-Booth") and a CascadeClimbers.com trip report dated 3/13/2015, FA
-- Michal Rynkiewicz & Daniel Coltrane -- matching this row's own fa field
-- exactly. "Standard" is doubly wrong since the real standard route is the
-- sibling row wa_lincoln_peak_standard (X Couloir).
UPDATE routes SET name = 'Wilkes-Booth (Northwest Face)' WHERE id = 'wa_lincoln_peak_north_ridge';

-- approach text claimed "a route first climbed in May 1958 (Cooper and
-- O'Conner) that 'demanded ice screws'" -- directly contradicting this same
-- row's own fa field (2015, Rynkiewicz/Coltrane), overview, and its own
-- data_quality.gaps note ("Only one clearly documented ascent -- the March
-- 2015 FA -- was found"). The 1958 Cooper/O'Conner ice-screw ascent is real
-- but belongs to the neighboring Black Butte, Colfax Peak (whose north face
-- carries the same Lincoln-assassination-themed route-naming convention,
-- e.g. "Ford's Theatre") -- cross-peak contamination, removed in favor of
-- this row's own FA/overview/data_quality fields.
UPDATE routes SET approach = REPLACE(
  approach,
  ', a route first climbed in May 1958 (Cooper and O''Conner) that ''demanded ice screws'' according to the historical record — meaning it''s genuinely an ice/mixed objective, not a snow scramble, and conditions (rime, verglas, bare ice) vary a lot by season and year',
  ' — the Wilkes-Booth route, first climbed March 13, 2015 by Michal Rynkiewicz and Daniel Coltrane, a genuine ice/mixed objective, not a snow scramble; conditions (rime, verglas, bare ice) vary a lot by season and year'
) WHERE id = 'wa_lincoln_peak_north_ridge';

-- rock_grade=5.4 is stale -- this row's own data_quality.gaps already flags
-- it: "The file's existing rock_grade field (5.4) predates this correction
-- and is inconsistent with the newly-sourced WI4 ice grade... should be
-- reviewed/cleared separately." Acting on the row's own documented
-- recommendation.
UPDATE routes SET rock_grade = NULL WHERE id = 'wa_lincoln_peak_north_ridge';

-- === wa_lincoln_peak_standard ===

-- commitment="VI" contradicts this same row's own grade field ("III-IV",
-- the NCCS commitment grade). VI (multi-day/expedition-style) doesn't match
-- this route's own itinerary (a single long day of technical climbing
-- within a 2-day trip, ~15.5 summit-day hours). Sibling
-- wa_lincoln_peak_north_ridge correctly keeps alpine_grade/commitment
-- aligned at "IV" -- fixing this row's commitment to match its own grade
-- field.
UPDATE routes SET commitment = 'III-IV' WHERE id = 'wa_lincoln_peak_standard';

-- === areas: wa_lincoln_peak ===

-- parent_peak="Colfax Peak" names the wrong peak -- Colfax is a sibling
-- Black Butte, not Lincoln Peak's parent. Confirmed by checking sibling
-- area wa_colfax_peak directly: it carries parent_peak="Mount Baker",
-- establishing that this subtree's parent_peak field correctly names the
-- parent volcano (a display string, matching the existing local convention
-- -- not an id-vs-name bug). Lincoln Peak, like Colfax, is a Black Buttes
-- satellite of Mount Baker, not of Colfax.
UPDATE areas SET parent_peak = 'Mount Baker' WHERE id = 'wa_lincoln_peak';

-- === wa_little_big_chief_mountain_northeast_face ===

-- fa field carries a hedged FA attribution (Beckey/Swift/Barto/Brooks, Aug
-- 1939), directly contradicting this same row's own corrections field,
-- which explains that Mountain Project lists this specific route's FA as
-- "unrecorded" and that no source confirms the 1939 party's line matched
-- today's named Northeast Face route, concluding "route-level 'fa' is left
-- null rather than assumed." Peak-level 1939 FA is independently confirmed
-- (Wikipedia); attributing it to this specific route is exactly what the
-- row's own reasoning says not to do.
UPDATE routes SET fa = NULL WHERE id = 'wa_little_big_chief_mountain_northeast_face';

-- beta's opening line says "Approached via the PCT to Dutch Miller Gap,"
-- contradicting this same row's own approach field, which describes the
-- standard access as Dutch Miller Gap Trail 1030 from the Middle Fork
-- Snoqualmie/Dingford Creek Trailhead the entire way (no PCT segment) --
-- matches the USFS Dutch Miller Gap Trail 1030 page and WTA's Middle Fork
-- Snoqualmie/Dutch Miller Gap trail description; the PCT junction is well
-- past the gap, not on the way to it.
UPDATE routes SET beta = replace(beta, 'Approached via the PCT to Dutch Miller Gap, the route climbs', 'Approached via the Middle Fork Snoqualmie / Dutch Miller Gap Trail (1030), the route climbs') WHERE id = 'wa_little_big_chief_mountain_northeast_face';
