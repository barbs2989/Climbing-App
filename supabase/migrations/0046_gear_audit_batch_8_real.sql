-- Gear audit batch 8 (real route IDs verified against live DB): 50 routes across 41 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes Liberty Bell Mountain (6 routes, 2 cross-verified against prior research), Mount Adams
-- (5 distinct routes spanning easy walk-up to serious glacier headwalls), Luna Peak (Picket Range),
-- Morning Star Peak sport-alpine routes, plus a large set of Class 2-4 scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none/optional',
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found for a route named ''Classic Route'' on Lane Peak; likely the south-side 3rd-4th class walk-up scramble. Typically climbed unroped by competent parties; a short rope/handline is a reasonable option for the class 4 sections.',
  ascender = NULL,
  corrections = 'Could not find a source using this exact route name; inferred from Lane Peak''s general south-side 3rd-4th class scramble description.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_classic_route_3';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"small-medium, up to 2 in","count":"small rack","note":"placed along rock margins of the couloir; couloir itself takes minimal gear"}],"nuts":{"size":"small-medium","count":"a few"},"other":"tricams and occasional pitons useful; 1-2 ice screws in early season; 2-3 pickets for snow anchors"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = '30m sufficient if comfortable with running belays/simul-climbing on the couloir; many parties still bring a standard 60m single for flexibility.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_lane_peak_r1';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"0.5-2 in (Camalot)","count":2,"note":"doubles, primary size"},{"size":"3 in (Camalot)","count":1}],"nuts":{"size":"small set + spare purple TCU/small cam","count":1}}',
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Not explicitly stated on MP; 9-pitch Grade IV route, standard practice is 60m single with double-rope rappel for descent.',
  ascender = NULL,
  corrections = 'Emphasize small gear, especially pitch 6 (thin cracks with compact placements).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_first_amendment';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"to #3","count":"1 set"},{"size":"#1","count":2,"note":"doubles"}],"nuts":{"size":"standard set","count":1},"other":"extendable runners recommended for rope drag on ridge"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '60m used for rappel descent.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spontaneity_arete';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"standard rack to 2 in","count":1},"nuts":{"size":"standard set","count":1},"other":"mostly bolted face pitches; runners help with rope drag"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'One 70m rope is sufficient to rappel the entire route.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spontaneous_distraction';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"small","count":"a few, for the class 5.0 summit block move"},"nuts":{"size":"small","count":"a few"}}',
  alpine_draws = 2,
  rope_type = 'light glacier rope',
  rope_length_m = 30,
  rope_note = 'Rope for glacier travel and the short class 4-5.0 summit block move; not a pitch-by-pitch rock route.',
  ascender = NULL,
  corrections = 'No pitch-specific rack list found; based on general mountaineering route description. Crampons and ice axe are mandatory.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lemah_mountain_east_route';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"small","count":"a couple, optional"},"nuts":{"size":"small","count":"optional"}}',
  alpine_draws = 0,
  rope_type = 'light glacier/scramble rope (optional)',
  rope_length_m = 30,
  rope_note = 'Optional rope for the glacier crossing/col approach shared with Lemah Main; crux Class 4 moves are typically unroped.',
  ascender = NULL,
  corrections = 'No route-specific source for ''Lemah Two Standard Scramble''; inferred from shared approach terrain with Lemah Mountain''s East Route.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lemah_two_scramble';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"standard rack to 3 in","count":1,"note":"some parties instead bring single #4 + doubles to #3"},"nuts":{"size":"standard set","count":1}}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '60m standard for this 3-pitch route.',
  ascender = NULL,
  corrections = 'Ice axe/crampons useful in early season for the approach gully.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_face_3';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"to 0.75 in","count":2,"note":"doubles"},{"size":"#1, #2, #3","count":1,"note":"singles"}],"nuts":{"size":"small set","count":1}}',
  alpine_draws = 8,
  rope_type = 'single + tagline',
  rope_length_m = 70,
  rope_note = '70m lead rope + 70m tagline ideal, allows rappelling from the very top.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_tooth_and_claw';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"#0 C3 to 0.75 in","count":2},{"size":"#1 to #3","count":1}],"nuts":{"size":"small-medium","count":1}}',
  alpine_draws = 8,
  rope_type = 'single (2 ropes for rappel descent)',
  rope_length_m = 60,
  rope_note = '11 pitches, 1400ft; two-rope rappel descent.',
  ascender = NULL,
  corrections = '8 quickdraws + 6 shoulder-length slings per MP; pitch 7 (165ft, 14-bolt mega-slab) needs a 0.75in cam after the 2nd bolt; pitch 9 needs a #3 cam after the last bolt.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_a_servant_to_liberty';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"small camming units","count":"1 set"},"nuts":{"size":"a few stoppers","count":1},"other":"old 3/16in bolts from a historic aid route (Liberty Loop) visible along the way"}',
  alpine_draws = 14,
  rope_type = 'single (two ropes for rappel)',
  rope_length_m = 60,
  rope_note = 'Rappel with two ropes from top of pitch 3; 5 pitches, ~200m/650ft, Grade IV.',
  ascender = NULL,
  corrections = '14 draws + long slings primarily needed for pitch 1.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_liberty_and_injustice_for_all';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"purple C3 to #3 BD","count":1,"note":"single rack, primary sizes"},{"size":"tips/fingers extras (red C3 to 0.4 BD)","count":"a few extra"}],"nuts":{"size":"stoppers incl. micro/offsets","count":1},"other":"8 long slings + 1 triple-length sling; an alternate account from the free ascent (Herrington) lists doubles TCU/C3 #00-3, doubles cams 0.5-3in, one optional #4, 3x48in slings, and 12-16 trad draws — treat as the upper-bound rack for a more sustained day"}',
  alpine_draws = 14,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '60m sufficient for a 1-day ascent (12 pitches, 1200ft, Grade V). Verify current topo if planning a multi-day rap strategy.',
  ascender = NULL,
  corrections = 'Confirms/refines the prior batch''s cam breakdown; adds rope length (60m), confirmed pitch count (12) and length (1200ft), and sling counts. Two slightly different gear lists exist (guidebook-standard vs. FA account) — reconciled above, use the wider FA list if in doubt.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_liberty_crack_free';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"standard alpine rack","count":1,"note":"plus a couple bigger pieces (to 3-4in) specifically for North Early Winter Spire"},"nuts":{"size":"standard set","count":1}}',
  alpine_draws = 10,
  rope_type = 'single (two ropes recommended for multi-tower rappels)',
  rope_length_m = 60,
  rope_note = 'Not explicit on MP; inferred standard for the area given the traverse links 5 summits (Liberty Bell Beckey Route + Concord N Face + Lexington N Face + North Early Winter Spire NW Corner + South Early Winter Spire SW Rib), 26 pitches total.',
  ascender = NULL,
  corrections = 'Gear demand is broad since the route crosses 5 distinct named routes in one push.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_liberty_traverse';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"gear to 2 in","count":1},"nuts":{"size":"standard set","count":1},"other":"2 bolts protect the crux slab near the top; final 40ft of the crux pitch is bolt-protected with no gear placements"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Not explicit on MP; inferred standard 60m for a 5-pitch Washington Pass alpine rock route.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_nw_face_var_remsberg_variation';

UPDATE routes SET
  sling_rack = '{"cams":[{"size":"#1-2","count":3,"note":"hand-crack primary geometry"},{"size":"#2.5-3","count":1}],"nuts":{"size":"small-medium","count":2},"other":"fresh MP source broadens this to ''pro to 4 inches'' — retain the #1-3 structured list as primary, add one #4 as optional; no pitons needed"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Standard 60m for Washington Pass rappels.',
  ascender = NULL,
  corrections = 'Prior batch listed route length as ~900ft; theCrag lists this route as 120m (~394ft), 4 pitches, 5.8 II — flagging this length discrepancy for DB reconciliation.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_rapple_grapple';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No rope needed; Class 2 non-exposed scramble, 7mi/2100ft gain.',
  ascender = NULL,
  corrections = 'Standard hiking gear plus helmet recommended; no technical rack needed.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_lichtenberg_mountain_se_route';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"small","count":4},"nuts":{"size":"small set","count":1},"other":"2 ice tools per climber, crampons, 6 pickets, snowshoes for approach; crux is 70-85 degree snow/ice over a bergschrund near 7,600ft (AI3+)"}',
  alpine_draws = 2,
  rope_type = 'two ropes (glacier travel + rappel)',
  rope_length_m = 60,
  rope_note = 'Descent requires roughly 10 double-rope rappels.',
  ascender = NULL,
  corrections = 'Source describes Lincoln Peak''s east-face/standard line via FS Road 38 and Seward Peak basin; exact correspondence to DB''s ''Southeast Approach (Standard)'' route name isn''t 100% certain. Only 17 recorded ascents since 1956.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lincoln_peak_standard';

UPDATE routes SET
  sling_rack = '{"other":"no rack typically carried; standard route ascends to the north ridge via a short Class 3 section with a minimum Class 5 move reported at an exposed rock notch"}',
  alpine_draws = 0,
  rope_type = 'optional handline',
  rope_length_m = 30,
  rope_note = 'No rope typically needed except optionally at the exposed notch move.',
  ascender = NULL,
  corrections = 'Based on Beckey guide description via SummitPost; no route-specific gear list found.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_little_big_chief_mountain_west_route';

UPDATE routes SET
  sling_rack = '{"cams":{"size":"small-medium to 2 in","count":"light rack"},"nuts":{"size":"small set","count":1}}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 40,
  rope_note = 'Short technical route; a shorter rope (30-50m) with simul-climbing on easier ground is plausible for Grade II-III.',
  ascender = NULL,
  corrections = 'No route-specific beta found for Little Mac Spire itself; located near Mac Peak in the Deception Lakes area. Grade II-III, 5.4 rating used to infer a light rack over 2-3 short pitches.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_little_mac_spire_southwest_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No rope typically needed for Class 3-4 scrambling on this rock type.',
  ascender = NULL,
  corrections = 'Twin Sisters Range is dunite/olivine — extremely grippy rock. Specific Little Sister trip reports were not found; North Twin Sister (same range, comparable terrain) used as basis for this inference.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_little_sister_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No route-specific trip report found for this remote Chelan County peak near Dome Peak; gear inferred from the Class 3 rating — standard talus/rock scrambling, ice axe recommended if snow lingers on approach slopes.',
  ascender = NULL,
  corrections = 'Could not locate a published trip report specifically describing the South Route on Lizard Mountain; gear list inferred entirely from the Class 3 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lizard_mountain_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Trip reports describe Lost Peak as a talus/scree scramble reached via long cross-country travel in the remote Pasayten Wilderness; no technical gear or roping described in available trip reports.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_lost_peak_pasayten_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (glacier crevasse-rescue rope recommended for the Richardson Glacier crossing)',
  rope_length_m = 30,
  rope_note = 'East Slopes/East Ridge route crosses the Richardson Glacier before the summit pyramid; trip reports describe donning crampons for an icy glacier surface. The Class 2-3 ridge/slope scrambling itself is unroped, but a rope for crevasse rescue is prudent on the glacier crossing.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_luahna_peak_east_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = '30m optional (glacier/snow travel, not typically used on rock)',
  rope_length_m = 30,
  rope_note = 'Standard SE approach ascends scree/rubble climber''s right to a steep snow-filled chute onto Luna''s SE shoulder and Luna Col (7,200 ft); ice axe and microspikes/aluminum crampons needed year-round for the snow chute. The route itself is usually unroped, but some parties carry a short rope for the glaciated approach snowfields and the Class 3-4 summit block shared with the South Ridge route.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_luna_peak_southeast_slopes';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":2,"double_length_slings":2,"cordelette":false}',
  alpine_draws = 0,
  rope_type = '40m single (carried by some parties)',
  rope_length_m = 40,
  rope_note = 'From Luna Col, Class 2 talus for 1,100 ft to the false (south) summit, then a ~50 ft downclimb and a short 5 ft step down to the notch (crux) before the true (north) summit. Some parties bring a 40m rope and a light alpine rack for this final class 3-4 section; without snow the whole route has reportedly been done unroped in approach shoes.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_ridge_2';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":4,"cordelette":true}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Confirmed as Eldorado Peak''s Main Peak North Ridge: climbs ''the path of least resistance on clean solid rock,'' mostly the east side of the ridge, ending below the summit pinnacle; protection listed only as ''standard alpine pro.'' Steep snow on the NE Face means glacier travel gear is needed for the approach/upper mountain in addition to the rock rack.',
  ascender = NULL,
  corrections = 'Route/location confirmed via Mountain Project, but no pitch-by-pitch gear list was published beyond ''standard alpine pro''; specific rack composition and rope length are inferred from typical Cascades 5.7 alpine granite practice.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_ridge_5';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":3,"double_length_slings":2,"cordelette":false}',
  alpine_draws = 0,
  rope_type = 'single dynamic (for rappels)',
  rope_length_m = 60,
  rope_note = 'Confirmed as Mount Index''s Main Peak, Hourglass Gully (Winter), Grade III/1,900 ft. Class 4/low 5th rock plus a short section of 60+ degree snow/ice/tree climbing on the East Ridge, which is often rappelled on descent. Protection note: ''pickets, slings for trees'' — snow pickets and tree slings are the primary protection, not a rock rack. Ice tools/crampons required.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_hourglass_gully_winter';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Trip reports describe a North Ridge-up/Southeast Slopes-down loop with Class 3 exposed scrambling on loose rock in the Chelan-Sawtooth Wilderness; no roping or technical rock gear described.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_martin_peak_southeast_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No route-specific trip report found for Massie Peak''s West Route; gear inferred from the Class 2-3 rating typical of scree/talus scrambles in this part of the North Cascades.',
  ascender = NULL,
  corrections = 'Could not locate a published trip report describing this specific route; gear list inferred entirely from the Class 2-3 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_massie_peak_west_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":2,"double_length_slings":1,"cordelette":false}',
  alpine_draws = 0,
  rope_type = 'optional handline',
  rope_length_m = 30,
  rope_note = 'The final ~1-mile summit scramble above the maintained Stehekin-side trail climbs loose Class 3 rock marked by faded red/orange arrows, passing through a notch left of the summit. Multiple trip reports describe ''serious exposure in several places'' — a short handline is prudent for less-experienced parties, though most scramblers go unroped.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mcgregor_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'South Gully-South Slope-East Ridge route''s crux is a jammed-boulder chimney (~15-20 ft, vertical) in the main canyon, climbed via chimney technique, not roped. Rock is notoriously loose throughout the canyon — helmet strongly advised.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_merchant_peak_south_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":3,"double_length_slings":2,"cordelette":false}',
  alpine_draws = 0,
  rope_type = 'optional handline / short rope',
  rope_length_m = 30,
  rope_note = 'The West Ridge gully is steep Class 3/4 at its base, broadens above cairns, then a narrower branch has a Class 4 chockstone; near the ridge crest climbers cross an exposed slab before a crux ~150 ft Class 4 blocky headwall to the false summit. Some parties carry a short rope/handline for the chockstone and headwall crux.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mesahchie_peak_west_ridge';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"double set 0.3-3in, single to #4","slings":"6-8 (extra for loose-rock anchors and tat replacement)","cordelette":true}',
  alpine_draws = 6,
  rope_type = 'single dynamic (second rope recommended for rappel retreat)',
  rope_length_m = 60,
  rope_note = 'East Face of the Middle Peak, Mount Index — one of the Cascades'' most notoriously loose and serious big alpine walls; the 5.10d grade given implies a freed line. No modern route-specific rope-length/rack beta was found online; sizing follows typical remote Cascades granite/gneiss big-wall practice.',
  ascender = NULL,
  corrections = 'Found AAC Publications historical FA context, but no current trip report gives a pitch-by-pitch rack for the 5.10d line specifically. Gear inferred from the route''s known seriousness/looseness and comparable remote Cascades big walls; flag for expert review.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_east_face';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.3-3in, doubles in crack-climbing sizes","slings":"5-6, plus tat/webbing for sparse fixed anchors"}',
  alpine_draws = 5,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Part of the Gunsight Peaks Traverse (IV 5.10 A1) crossing all four Gunsight summits; encounters three pitches of 5.10 crack climbing on remote, rarely-visited rock. Confirmed via CascadeClimbers.com trip report (FA by Blake Herrington and Dan Hilden).',
  ascender = NULL,
  corrections = 'Grade and character confirmed via trip report; exact rack sizing not published, so inferred from grade and crack-climbing emphasis.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_gunrunner';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":2,"tat_webbing":"bring extra for anchor replacement","cordelette":true}',
  alpine_draws = 2,
  rope_type = 'single rope',
  rope_length_m = 30,
  rope_note = 'Molar Tooth North Ridge/West Side: low 5th class terrain with complex route-finding and exposure; ''if you were to lead this you may not find much pro.'' Descent via 3 rappels off the north ridge — some fixed anchors present but sparse traffic means bring gear to replace old tat.',
  ascender = NULL,
  corrections = 'Confirmed via Mountaineers.org route page: ''light alpine rack including slings for pro and possibly tat,'' 3 rappels for descent.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_ridge_west_side';

UPDATE routes SET
  sling_rack = '{"slings":"2-3 for a gully belay/rappel anchor","light_rack":"a few small cams/nuts optional for the belayed step"}',
  alpine_draws = 0,
  rope_type = 'single rope',
  rope_length_m = 30,
  rope_note = 'North Col standard route: steep talus/snow to the North Col, then a ~75ft gully (a belay may be needed crossing the moat/steep step) with Class 2-3 ledges near the top. Descent retraces the route; one ~75ft rappel may be necessary.',
  ascender = NULL,
  corrections = 'SummitPost route description explicitly calls for a possible belay on the gully and a ~75ft rappel on descent; this is Class 2-3 scrambling with one short technical/roped section, not a pure walk-up.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_monte_cristo_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Remote Pasayten scramble via Pistol Pass/Lake of the Woods approach: left-angling ramp to the south ridge, then long talus slopes with Class 3 scrambling. No rope or fixed protection mentioned in any trip report; the crux is remoteness/route-finding and water availability, not technical terrain.',
  ascender = NULL,
  corrections = 'No source describes any technical gear beyond standard scrambling kit; inferred non-technical from consistent Class 3 characterization.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_monument_peak_pasayten_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 5,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'West Face of Vega North Tower, IV 5.10+, 11 pitches (8 at 5.10). Fully bolted; descend by topping out and rappelling the adjacent Mile High Club line with a single 60m rope rather than rapping this route directly.',
  ascender = NULL,
  corrections = 'Mountain Project route page confirms: ''60 meter rope,'' ''17 quickdraws,'' and ''3-6 alpine draws to reduce rope drag''; a 70m rope is a helpful-but-not-mandatory retreat option.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_beyond_redlining';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = '800ft, Grade III 5.10b on Vega Tower. Fully bolted sport-style protection, 4-10 bolts/pitch across 7 pitches; bolts spaced further apart on easier terrain, cruxes well protected.',
  ascender = NULL,
  corrections = 'Mountain Project route page confirms: ''70M rope'' recommended for descent, and ''quick draws and a few alpine draws'' as the full rack.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_marvin_s_ear';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '700ft, III 5.10a, 7 pitches on the Mile High buttress. Fully bolted face climbing; rappel the route on a single 60m or two 60s.',
  ascender = NULL,
  corrections = 'Mountain Project route page confirms: ''a 60m rope'' is sufficient, ''draws and a 60m rope, a couple alpine draws could be nice to cut back on drag.''',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mile_high_club';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.4-2.5in single set","slings":"3-4 shoulder-length"}',
  alpine_draws = 3,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No route-specific beta found for ''Mossy Loaf'' or this route under any name on Mountain Project, OpenBeta, or SummitPost. Gear inferred from the 5.7 alpine grade and the crag''s ''mossy'' naming convention, comparable to other low-to-mid 5th class, lichen/moss-covered Cascades alpine rock.',
  ascender = NULL,
  corrections = 'Could not locate this route or the ''Mossy Loaf'' area by name in any climbing database searched; entire gear list is grade-based inference, not confirmed beta. Flag for expert/local review.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_moss_out_for_harambe';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.5-2in single set","slings":"2-3 shoulder-length"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No route-specific beta found (same unresolved ''Mossy Loaf'' area as Moss Out For Harambe). Gear inferred from the easier 5.5 grade — lighter rack than its 5.7 neighbor.',
  ascender = NULL,
  corrections = 'Could not locate this route or the ''Mossy Loaf'' area by name in any climbing database searched; gear list is grade-based inference only. Flag for expert/local review.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_you_moss_be_joking';

UPDATE routes SET
  sling_rack = '{"ice_screws":"4-6","pickets":"2-3","cordelette":true,"note":"second ice tool recommended given steep, icy early-season terrain"}',
  alpine_draws = 0,
  rope_type = 'single glacier/ice rope',
  rope_length_m = 60,
  rope_note = 'Grade D (Mazamas), III-IV, forms a triangle between the North Ridge and Lava Ridge; best done early season to avoid icy conditions and rockfall — most Mount Adams headwall routes remain rarely repeated due to rockfall danger. No detailed pitch-by-pitch gear list published; Mazamas defers to the Beckey Cascade Alpine Guide.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Mazamas activity page confirms grade/season/hazard character but gives no explicit rope length or screw/picket count; gear sized by analogy to the better-documented Lyman Glacier and Adams Glacier headwall routes on the same mountain.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_adams_lava_glacier_headwall';

UPDATE routes SET
  sling_rack = '{"ice_screws":"4-5 long screws","pickets":2,"second_tool":"ice hammer","cordelette":"for crevasse rescue anchors"}',
  alpine_draws = 0,
  rope_type = 'single glacier rope',
  rope_length_m = 60,
  rope_note = 'North Lyman Glacier, Grade II ice route. Traverse from high camp across lava fields/Lava Glacier to the base of the Lyman Glacier (8,000ft), climb diagonally through a crux chute at 10,000ft (45-65 degrees for ~50ft, variable by year), then moderate open slopes with crevasses/bergschrunds to the summit plateau.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Mountaineers.org intermediate alpine climb listing gives an explicit, specific gear list: helmet, ice axe, ice hammer, crampons, rope, 4-5 long ice screws, 2 pickets, harness, crevasse rescue gear.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_adams_lyman_glacier';

UPDATE routes SET
  sling_rack = '{"ice_screws":"3-5","pickets":"2-3","flukes":"optional","second_tool":"possibly, depending on conditions","cordelette":"for crevasse rescue anchors"}',
  alpine_draws = 0,
  rope_type = 'single glacier rope',
  rope_length_m = 60,
  rope_note = 'North Face of Northwest Ridge, Grade II-III. Base is usually inaccessible directly due to a large bergschrund, so climbers ascend the Adams Glacier and traverse onto the North Face after crossing crevasses on its west side. Best in June-July; route-finding through crevasses can become tricky-to-impossible later in July.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Wildsnow.com and SummitPost corroborate: ''ice ax, crampons, possibly a second tool, screws, flukes, and pickets'' plus significant glacier/crevasse hazard on the shared Adams Glacier approach.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_adams_northwest_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Standard/easiest route on Mount Adams — non-technical walk-up via Suksdorf Ridge through Lunch Counter (9,250ft). Ice axe and crampons (or microspikes/trekking poles depending on season) are the essentials; crevasses do not typically appear on this route below the summit. Multiple sources confirm ''climbing gear is optional.''',
  ascender = NULL,
  corrections = 'Cross-confirmed via Oregon Hikers forum, WanderlustHiker, and Alpine Ascents gear list: this is Grade I non-technical, no rope typically carried.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_adams_south_spur';

UPDATE routes SET
  sling_rack = '{"pickets":"3-4","ice_screws":"2-3","rock_gear":"small rack (nuts/cams) for 5th-class rock bands near the top","cordelette":true}',
  alpine_draws = 2,
  rope_type = 'single glacier/ice rope',
  rope_length_m = 60,
  rope_note = 'Extremely serious, rarely-repeated III-IV headwall route above the Wilson Glacier. Access from the Yakama Nation (Tract D) side requires a tribal-use permit, restricting the season to July 1-October 1 for non-tribal climbers. Route climbs 30-50 degree slopes staying left of a central rock buttress; rock bands near the top may require 5th-class moves and protection.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Sourcing is thin and partly ambiguous. Given the extreme rarity of ascents and rockfall danger, treat this as a low-confidence, expert-review-required entry.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_adams_wilson_glacier_headwall';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Standard scramble via Klahhane Ridge or the shorter Switchback Trail (Olympic NP): exposed ridge-walking and a Class 3 rock scramble through loose scree/fractured rock requiring route-finding but no rope or fixed protection. Snow and rotten cornices can linger near the summit into July/August.',
  ascender = NULL,
  corrections = 'Consistently described as Class 3, non-technical scrambling across WTA, Earthtrekkers, and SummitPost climber''s log sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_angeles_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Lake Ann Trail approach (Mount Baker Highway) to a saddle, then ridge scrambling to the Mount Ann summit. Described as steep, fun scrambling requiring cairn route-finding, non-technical. Snowfields can persist on the approach into August.',
  ascender = NULL,
  corrections = 'Mountaineers.org and SummitPost both describe this as a straightforward off-trail ridge scramble with no rope or technical rock gear used.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_ann_scramble';

UPDATE routes SET
  sling_rack = '{"slings":"1-2 optional, for a handline at the exposed gendarme bypass"}',
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'South Ridge scramble via Appleton Pass/Boulder Lake approach (Olympic NP). Involves Class 3 scrambling on chossy sandstone/slate; a narrow ramp bypasses a gendarme on the ridge, and exposure requires concentration in more than one spot. No rope reported, though a short sling/handline at the gendarme bypass would be a reasonable precaution.',
  ascender = NULL,
  corrections = 'SummitPost confirms Class 3 exposure and terrain character but does not explicitly state whether any party has used a rope; treated as standard non-technical scrambling kit with an optional sling.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_appleton_standard';
COMMIT;
