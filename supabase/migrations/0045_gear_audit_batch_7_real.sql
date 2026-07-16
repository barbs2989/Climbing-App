-- Gear audit batch 7 (real route IDs verified against live DB): 50 routes across 41 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes major North Cascades alpine objectives: Forbidden Peak (East Ridge Direct), Johannesburg
-- Mountain (NE Ridge 1963 Route), Himmelhorn, Inspiration Peak, Jotnar (Grade VI big wall), Juno Tower,
-- Half Moon Crag, Kangaroo Temple, plus a large set of Class 2-4 scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":4,"cordelette":true}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No route-specific rope beta found; standard 60m single is typical for multi-pitch 5.9 alpine granite in the Central Cascades/Leavenworth area.',
  ascender = NULL,
  corrections = 'Could not locate any trip report or route page specifically for ''Plan 9 from Outer Space'' at Ed Wood Memorial Buttress; gear list inferred from typical 5.9 alpine granite routes in the region, not confirmed beta.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_plan_9_from_outer_space';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (optional short glacier-travel rope for approach)',
  rope_length_m = NULL,
  rope_note = 'Standard route is an off-trail ridge/talus approach via Sourdough/Stetattle Ridge with short class 3 rock steps and snowfield crossings; no technical rock rope needed.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; classified as mountaineering/scramble based on trip reports describing steep trail, wide-open ridge, class 3 rock steps, and snowfields rather than roped rock climbing.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_elephant_butte_standard_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble; hands-on-rock but no rope typically carried. Ice axe recommended early season.',
  ascender = NULL,
  corrections = 'No Southeast Ridge-specific trip report found; sources describe class 3 scrambling on Emerald Peak via other aspects. Gear inferred from Class 2-3 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_emerald_peak_se_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 scree/talus scramble from De Roux Creek/Esmeralda Basin; no technical gear needed. Ice axe recommended if snow present early season.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_esmeralda_peaks_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Inferred as a straightforward Class 2 talus/scree walk-up; no rope or rack needed.',
  ascender = NULL,
  corrections = 'No published trip reports found specifically for Fifth of July Mountain; gear list inferred entirely from the Class 2 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_fifth_of_july_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":2,"double_length_slings":1,"cordelette":false}',
  alpine_draws = 0,
  rope_type = 'optional handline',
  rope_length_m = 30,
  rope_note = 'Class 3-4 scramble; general Cascades guidance recommends a short rope/handline for class 4 sections, though not always used.',
  ascender = NULL,
  corrections = 'No route-specific data found; gear inferred from the Class 3-4 rating and general Cascades scrambling guidance.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_foggy_peak_scramble';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":6,"double_length_slings":6,"cordelette":false}',
  alpine_draws = 4,
  rope_type = 'half/twin rope doubled (single rope + single rack also works)',
  rope_length_m = 60,
  rope_note = 'Multiple independent sources agree a 60m half/twin rope folded doubled is the standard system for Forbidden''s ridge routes, giving ~30m strands for simul-climbing and rappels off the descent. A single 60m rope with a single rack is also commonly used.',
  ascender = NULL,
  corrections = 'Route is 6 pitches (Grade III): simul-climbing up to 5.6, a 5.7 pitch to a gendarme, one rappel, the 5.8 crux, then simul-climbing to the summit. Slinging horns is the dominant protection style — carry at least 6 double-length slings.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_ridge_direct';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble; hands required but roping up is atypical at this grade.',
  ascender = NULL,
  corrections = 'Searches returned data for ''The Brothers'' (Olympics) and ''Three Brothers'' (Teanaway) but not this specific ''Four Brothers'' peak; gear inferred from the Class 3 rating alone.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_four_brothers_southwest_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":5,"double_length_slings":4,"cordelette":true}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No route-specific gear beta located online. Inferred standard Grade III alpine rock rack for a remote 5.6 multi-pitch Southern Pickets route.',
  ascender = NULL,
  corrections = 'This is a very remote, rarely-visited Southern Pickets objective; only approach/location beta was found, no pitch-by-pitch gear list. Full glacier/approach gear should be added on top of the rock rack for the approach through the Pickets.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_frenzel_spitz_south_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":2,"double_length_slings":2,"cordelette":false}',
  alpine_draws = 12,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = 'Mountain Project lists this as an 8-pitch Sport/Alpine route at Tyler Peak Crags (The Full Montey); a 70m rope suits typical Olympic Peninsula sport-alpine pitch lengths, though exact pitch lengths weren''t published.',
  ascender = NULL,
  corrections = 'Confirmed via Mountain Project: 8 pitches, Sport/Alpine, listed top difficulty 5.9 (user-provided grade is 5.8+; worth cross-checking current guidebook/topo). No published rack list found beyond the sport/alpine classification.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_junior_s_farm';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'West Ridge/Saddle Traverse is Class 3-4 depending on line/conditions; snow-covered sections call for an ice axe rather than a rope.',
  ascender = NULL,
  corrections = 'Sources describe the ''Gardner Traverse'' saddle section as YDS Class 3-4 with a lower bypass around cliff bands/pinnacles recommended when conditions are bad; no report described roped travel.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_gardner_mountain_west_ridge';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":2,"double_length_slings":1,"cordelette":false}',
  alpine_draws = 0,
  rope_type = 'optional handline',
  rope_length_m = 30,
  rope_note = 'Garfield is a multi-summit massif; the standard multi-summit scramble stays around Class 3 while some subsidiary summits require technical 5th-class moves. A short rope/handline is prudent for exposed ridge connections between summits.',
  ascender = NULL,
  corrections = 'Trip reports describe inter-summit ridge travel as loose/''pretty horrible'' and note other peaks on the massif require technical climbing, but none described roping up for the standard Class 3 multi-summit scramble itself.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_garfield_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":3,"cordelette":true}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No route-specific trip report found. Inferred rope/rack for a Grade III, Class 4 route in the remote North Cascades National Park (Picket Range vicinity): a rope for the Class 4 climbing and any rappels, plus a light rack for occasional protection/anchors.',
  ascender = NULL,
  corrections = 'Ghost Peak''s Mountain Project area page has no established route entries; other sources gave only location context, not a South Route description. Treat this as a conservative Grade III/Class 4 estimate, not confirmed beta.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ghost_peak_south_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":4,"cordelette":true}',
  alpine_draws = 6,
  rope_type = '60m single (two ropes sometimes carried for descent options)',
  rope_length_m = 60,
  rope_note = 'Sources describe using two separate 60m ropes on this route (useful for rappel descent options), though a single 60m rope with the walk-off is also viable.',
  ascender = NULL,
  corrections = 'Pitch count varies slightly by source: one trip report lists 6-7 pitches, another cites 7 pitches with ''gear to 3", draws for bolted sections,'' a trad anchor at pitch 5''s notch, and a sparsely-protected ''Jenga Traverse'' final pitch. Rack to 3in cams plus nuts/tricams.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_dirty_sanchez';

UPDATE routes SET
  sling_rack = '{"shoulder_slings":4,"double_length_slings":3,"cordelette":false}',
  alpine_draws = 12,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Mountain Project: ''Single rack and a dozen draws and some longer slings should do it.'' Bolted belays on the lower 4-5 pitches with trad protection needed through crack sections higher up.',
  ascender = NULL,
  corrections = '7 pitches, Grade III, ~500ft, mixed bolts/trad. Pitch 5 crack noted as flaky/hollow — avoid weighting gear there. Descent is a walk-off climber''s left with one short rappel.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ride_the_lightning_2';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 scree/talus walk-up; no rope needed on the standard route. Early-season snowfields may warrant an ice axe.',
  ascender = NULL,
  corrections = 'No route-specific technical beta found; grade-based inference from Class 2 scrambling norms and Mountaineers trip reports.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_gray_wolf_ridge_se_slopes';

UPDATE routes SET
  sling_rack = '{"cams":"small set to ~2in","nuts":"small stopper set","runners":"2-3 shoulder-length slings + webbing for anchors"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'Trip reports describe a Class 4 step near the summit col; parties have carried and used a rope plus webbing/slings for protection or a short rappel.',
  ascender = NULL,
  corrections = 'Listed grade is Class 3 but multiple trip reports describe a Class 4 scramble step near the summit; flagging discrepancy for review.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_grotto_mountain_e_route';

UPDATE routes SET
  sling_rack = '{"runners":"1-2 slings for optional hand line/rappel anchor"}',
  alpine_draws = 0,
  rope_type = 'single dynamic (optional)',
  rope_length_m = 30,
  rope_note = 'Standard route is unroped Class 3-4 for competent scramblers; a hand line is sometimes rigged on the exposed ''hidden ramp'' descent, and the narrow summit ledge is consequential if wet/icy.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_gunn_peak_southeast_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Listed as 3rd class in the same area as Gunn Peak''s standard route; no route-specific beta found under this exact name (a similarly-named ''Lewis Creek'' elsewhere in WA is an unrelated canyoneering rappel route). Treated as an easy 3rd-class scramble consistent with Gunn Peak-area terrain.',
  ascender = NULL,
  corrections = 'Could not verify this as a distinct documented named route on Gunn Peak; recommend spot-checking this route_id against source data.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lewis_creek_route';

UPDATE routes SET
  sling_rack = '{"cams":"small set to ~2in","nuts":"small stopper set","runners":"2-3 shoulder-length slings"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'SummitPost: ''standard glacier gear and a small rock climbing rack'' for the final Class 3 slabs to the summit after the glacier approach.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_hagan_mountain_south';

UPDATE routes SET
  sling_rack = '{"runners":"2-3 slings","nuts":"small stopper set (optional)"}',
  alpine_draws = 0,
  rope_type = 'single dynamic (optional)',
  rope_length_m = 30,
  rope_note = 'Half Moon is a rock fin on Kangaroo Ridge surrounded by 5.6-5.10 routes; the ''standard scramble'' approach crosses Class 3-4 terrain with short exposed steps where a rope is commonly carried for protection/rappel.',
  ascender = NULL,
  corrections = 'No dedicated trip report found describing this exact scramble line; inferred from the peak''s known rock character and adjacent route grades.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_half_moon_southwest_slopes';

UPDATE routes SET
  sling_rack = '{"cams":"small-to-mid rack to ~3in","nuts":"stopper set","runners":"4-6 shoulder-length slings"}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Trad, single-pitch (~85ft or less per MP area page); one 60m rope covers the climb and lower/rappel.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_artic_rose';

UPDATE routes SET
  sling_rack = '{"cams":"rack to ~3in with doubles in finger/hand sizes","nuts":"stopper set","runners":"4-6 slings"}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Trad, single-pitch; 60m rope covers the climb and descent.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_astral_projection';

UPDATE routes SET
  sling_rack = '{"cams":"rack to ~3in","nuts":"stopper set","runners":"4-6 slings"}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Trad, single-pitch; 60m rope covers the climb and descent.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_astroglide';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Bolted sport, single-pitch (~85ft or less); quickdraws only, no trad rack needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_asymptotic';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Bolted sport, single-pitch; quickdraws only.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_half_fast';

UPDATE routes SET
  sling_rack = '{"cams":"rack to ~3in, doubles in common finger/hand sizes","nuts":"full stopper set","runners":"6-8 shoulder/double-length slings"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Remote Grade IV alpine rock route in the Southern Pickets; glacier approach then multi-pitch rock to a rappel descent (rap/scramble to a false-summit notch, then rap the route). Bring extra tat — anchors are minimal in this range.',
  ascender = NULL,
  corrections = 'Exact SE-route beta not found (Beckey''s description mentions only an ''awkward 5.7 step-around''); the better-documented Himmelhorn line is the East Ridge/North Face (II 5.10+). Rack/rope sized from comparable Southern Pickets Grade IV rock routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_himmelhorn_southeast_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 boulder scramble with minimal exposure per SummitPost/trip reports; no rope used on the standard route.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_hoodoo_peak_sawtooth_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"rack to 3in","nuts":"stopper set","runners":"4-6 slings + extra rap tat"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '2-pitch trad route (~500ft total, Edward Peak ''The Mole''); MP notes ''gear to 3 inches'' and a 3-rappel descent to the east with minimal (single-bolt-plus-tat) anchors — bring extra tat.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_face_of_the_mole';

UPDATE routes SET
  sling_rack = '{"runners":"2-3 slings for a hand line/short belay"}',
  alpine_draws = 0,
  rope_type = 'single dynamic (short/optional)',
  rope_length_m = 30,
  rope_note = 'Class 3 dike with a Class 4 down-step; SummitPost notes it ''requires a little bit of roped climbing (half-a-pitch)'' — a short rope suffices.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_horseshoe_peak_scramble';

UPDATE routes SET
  sling_rack = '{"runners":"2-3 slings + webbing for rap anchor"}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Stiff Class 3-4 route; trip reports explicitly recommend a 60m rope to rappel the summit block, which even experienced scramblers use.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_huckleberry_mountain_west_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Remote Class 2-3 scramble in the Skagit Range near Whatcom Peak (North Cascades NP); no route-specific technical beta located. Terrain-based inference: standard scramble unroped, though an ice axe may be useful for snow approach.',
  ascender = NULL,
  corrections = 'No route-specific trip reports located; there are at least two ''Indian Mountain'' peaks in WA and the ''_baker'' suffix may just be a disambiguator. Recommend spot-checking against source guidebook.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_indian_mountain_baker_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (optional harness for less-experienced parties)',
  rope_length_m = NULL,
  rope_note = 'Standard Class 2-3 route via gullies from the notch; Mountaineers guidance recommends an ice axe for snow near the gap and a scramble harness for first-time T3 scramblers, but no rope is used on the standard line.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ingalls_peak_south_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"single rack .2/.3 to 3, doubled in 1-2 and 2-3 (sources vary slightly)","nuts":"full stopper set (~6)","runners":"double-length runners + extra rap tat/cord"}',
  alpine_draws = 10,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = 'Verified 2024 trip report beta: crampons, ice axe, single 70m rope, one set of nuts, cams .2-3 with doubles of 2 and 3. Descent is 14 rappels (5 down the upper West Ridge, 9 down the South Face) — bring extra cord for rap anchors.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_ridge_4';

UPDATE routes SET
  sling_rack = '{"cams":"rack to 2.5in","nuts":"stopper set","runners":"4-6 slings"}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Verified beta: ''standard glacier gear, rock pro to 2.5 inches.'' Route climbs the 400ft ''Great Gash'' corner/chimney system; descent via the West Ridge (rappels).',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_face_5';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble on stepped rock terrain (Alpine Lakes Wilderness); no rope standard. Ice axe useful for early-season snow approach via Chetwoot Lake/West Fork Foss.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; inference from Class 3 terrain description (SummitPost/WTA).',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_iron_cap_mountain_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 ridge walk-up from De Roux camp via Trail 1399; one narrow ridge section near summit with no exposure requiring hands. No technical gear needed.',
  ascender = NULL,
  corrections = 'Mountaineers/WTA describe as straightforward non-technical scramble; no gear list published.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_iron_peak_teanaway_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble on loose volcanic rock; short exposed ledge traverse (~40ft) below the summit cliff band. Helmet recommended for rockfall on notoriously loose Goat Rocks rock.',
  ascender = NULL,
  corrections = 'Terrain-based inference from SummitPost/willhiteweb/oregonhikers descriptions; no explicit gear list.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ives_peak_r1';

UPDATE routes SET
  sling_rack = '{"nuts":"double set, micronuts to standard sizes","cams":"double rack micro to #4 Camalot, single #5, single set of offset cams","aid":"5 beaks, 2 lost arrows, 10 rivet hangers (some #1 size), 2 sets of hooks","other":"portaledge, ledge fly/rain shell for leader"}',
  alpine_draws = 14,
  rope_type = 'single lead line + static haul line',
  rope_length_m = 60,
  rope_note = 'Grade VI big wall (16 pitches); climbed with a lead line plus separate static haul line for portaledge/haul bag, and typically two 60m ropes for multi-day rappel descent. All anchors bolted except pitch 15; fixed lines often left on pitch 7.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'None — explicit route beta found on SuperTopo/theclimbingguides.com; this is a multi-day aid/big-wall route, far beyond typical single-push alpine rock rack.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_j_tnar';

UPDATE routes SET
  sling_rack = '{"cams":"small-medium alpine rack to 3 inches","nuts":"light set","runners":"10+ slings/runners"}',
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '12-pitch Grade IV 5.7+ alpine ridge with steep snow/mixed approach terrain. Ice axe/crampons often needed for approach snow depending on season.',
  ascender = NULL,
  corrections = 'Gear line taken directly from Mountain Project route page for Northeast Ridge (1963 Route).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_northeast_ridge_1963_route';

UPDATE routes SET
  sling_rack = '{"nuts":"single set","cams":"doubles to 3 inches; single #4 cam helpful (no longer a fixed piece on P7)"}',
  alpine_draws = 12,
  rope_type = 'single (double ropes common for the long rap descent)',
  rope_length_m = 60,
  rope_note = 'IV, 1500ft, 15-pitch splitter-crack route on Juno Tower''s east buttress; 7 of 15 pitches are 5.10. Long multi-rappel descent — many parties use double ropes or plan extra raps with a single 60m.',
  ascender = NULL,
  corrections = 'Protection beta from Mountain Project route page; SuperTopo gear page was unreachable but MP corroborates.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_clean_break';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble via Denny Creek/Melakwa Lake; one eroded ~5ft rock chimney near 5100ft requiring 2-3 downclimb moves. No rope standard.',
  ascender = NULL,
  corrections = 'Terrain description from Mountaineers.org/summitpost trip reports; no formal gear list exists for a scramble of this grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_kaleetan_peak_south_ridge';

UPDATE routes SET
  sling_rack = '{"cams":"standard rack to 3 inches","nuts":"light set"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Short easy multi-pitch granite route on Kangaroo Temple. No dedicated route-specific beta found; inferred from the comparable/easier North Face (5.6, 3 pitches, standard rack to 3in, chain-rappel descent) on the same formation.',
  ascender = NULL,
  corrections = 'Could not locate a Mountain Project or SuperTopo page specifically named ''Koala Krack'' despite searching; grade (5.4) and formation suggest an easy line comparable to or easier than the North Face route — flag for manual verification against a guidebook if precision matters.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_koala_krack';

UPDATE routes SET
  sling_rack = '{"cams":"single rack 0.3-3, doubles 0.4-1","nuts":"set of chocks"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '6-pitch 5.7+ face route (first ascent Beckey brothers, 1942); pitches wander so extra long slings recommended. Descent: two 30m raps to a scramble-off ledge, or three raps to the notch with a 60m rope.',
  ascender = NULL,
  corrections = 'Gear/descent beta from Mountain Project + spokalpine.com trip report, consistent across sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_northwest_face_2';

UPDATE routes SET
  sling_rack = '{"cams":"standard rack to 3 inches","nuts":"set"}',
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '7-pitch III-IV 5.8 route up slabs/cracks/chimneys (also referenced as Southwest Face). Descent via chains atop North Face and P1 belay chains, 3 single-rope raps with a 60m rope.',
  ascender = NULL,
  corrections = 'Descent/rack details corroborated across Mountain Project area page and SuperTopo route listing.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_face_4';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = '~600ft gully of scree/talus with ~100ft of Class 4 scrambling near a ''mushroom'' summit block; loose rock bypassing a waterfall low on route. Steep snow can persist into August in the upper gully (ice axe useful). No rope standard for competent parties.',
  ascender = NULL,
  corrections = 'Terrain description from SummitPost/trailcatjim.com; no formal technical gear list published for this route.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_katsuk_peak_gully';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3-4 cross-country scramble via Ragged Ridge (typically approached from Easy Pass); route crosses a ledge past ''Grotesque Gendarmes,'' a cliffy/cave section, then gullies to the summit. No rope standard but route-finding and Class 4 skill required.',
  ascender = NULL,
  corrections = 'Route name ''Southwest Slopes/Gully'' not found verbatim; inferred from general Kimtah Peak / Ragged Ridge approach descriptions.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_kimtah_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'glacier rope (optional, party-dependent)',
  rope_length_m = 30,
  rope_note = 'Distinct glacier route via the Columbia Glacier (few crevasses; often traveled unroped by experienced parties but roping up recommended for less experienced teams), ascending an east-side snow ramp through a break in lower cliffs, then Class 2-3 scrambling on the summit slab/ledges. Ice axe and microspikes/crampons required.',
  ascender = NULL,
  corrections = 'This is a different route than the previously-researched Kyes Peak South Ridge/Columbia Glacier/Pride Glacier routes; terrain-based inference from climberkyle.com and alpinewanderlust.com trip reports.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_kyes_peak_glaciated_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 talus/scree slope approach near Necklace Valley/La Bohn Gap; a couloir (''waterfall route'') variant flanks the peak. No technical rope needed under normal summer conditions.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; inferred from general La Bohn Peak/Gap approach descriptions.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_la_bohn_peak_southwest_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble via slabby west face or a southwest ramp/east ridge from Pistol Pass or Slate Pass approaches; exposed granite but no rope standard.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; inferred from SummitPost/trailcatjim.com terrain descriptions of the standard ascent lines.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lake_mountain_pasayten_scramble';
COMMIT;
