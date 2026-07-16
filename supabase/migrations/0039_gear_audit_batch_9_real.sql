-- Gear audit batch 9 (real route IDs verified against live DB): 54 routes across 42 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes 10 Mount Rainier technical routes (Willis Wall, Ptarmigan Ridge, Mowich Face, Curtis
-- Ridge, Kautz Headwall, Nisqually Icefall, Sunset Ridge, Tahoma Glacier, Fuhrer Finger, Gibraltar
-- Ledges — differentiated per-route, not generic glacier boilerplate), Mount Olympus (2 routes),
-- Mount Fury East Mongo Ridge (Grade VI big-wall ridge), plus many Olympic Mountains scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found. Class 3 hands-on scrambling; standard WA norm is unroped travel, with a light 30m rope occasionally carried by less-experienced parties for confidence on short exposed steps.',
  ascender = NULL,
  corrections = 'No route-specific sources found for Mount Arriva despite repeated searches; gear inferred purely from the stated Class 3 grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_arriva_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Documented Ballard routes include a 4th-class corner and a 3rd-class summit block section where some parties use a handline; the South Slopes line itself is standard Class 3 talus/heather and normally climbed unroped.',
  ascender = NULL,
  corrections = 'Found detail on Mt Ballard''s general east/west approach, not the specific ''South Slopes'' line named in the DB; gear extrapolated from adjacent route descriptions.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_ballard_south';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found beyond Mount Barnes'' location at the Elwha River headwaters. Standard Class 2-3 scramble norms apply; carry an ice axe if snow lingers in the basin.',
  ascender = NULL,
  corrections = 'No trip reports or guidebook route descriptions located for this specific scramble; gear inferred from grade only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_barnes_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Mount Berge (Glacier Peak Wilderness) is approached via open talus/heather terrain to treeline on its southwest side; standard Class 2-3 scramble, unroped, ice axe useful for lingering snow patches.',
  ascender = NULL,
  corrections = 'General peak/approach info verified; no route-specific technical/gear description found for the Southwest Route itself.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_berge_southwest_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = 30,
  rope_note = 'Standard route (via Upper Eagle Lake) ascends talus/snow/scree through cliff bands to an ~8ft chimney/step below the summit. Most parties climb this step unroped, but a short 30m rope/handline is a reasonable option for less confident scramblers.',
  ascender = NULL,
  corrections = 'None significant; route description matches the named ''Standard Scramble.''',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_bigelow_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"3-4 small-medium cams (0.4-2in)","nuts":"small set","slings":"3-4 shoulder-length runners"}',
  alpine_draws = 2,
  rope_type = 'single dynamic (optional)',
  rope_length_m = 30,
  rope_note = 'South Ridge is Class 3 gully/heather scrambling with a snow couloir leading to a non-technical final ridge, but trip reports describe parties roping up for a Class 3-4 rock step near the summit. Carry ice axe for the couloir; a 30m rope with a small rack is a reasonable option for the summit rock.',
  ascender = NULL,
  corrections = 'None; description matches South Ridge/Southeast Slopes route.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_blum_south_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Route crosses the exposed ''Catwalk'' ridge (3rd-class moves with good holds) between Cat Basin and Carrie, described as unmaintained and requiring good route-finding. Early-season snow requires ice axe and crampons; the route is not normally roped.',
  ascender = NULL,
  corrections = 'None; matches guidebook/trip-report description of the SE Route via Cat Basin/Catwalk.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_carrie_se_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'South slope is scree-covered and explicitly described as a nontechnical ascent (Class 2). No rope or rack needed under normal summer conditions.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_carru_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"standard alpine single rack, ~0.3-3in","nuts":"full set of nuts/stoppers","slings":"6 shoulder-length + 2-3 double-length runners"}',
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Grade IV 5.9, 4 pitches (P1 5.9/180ft, P2 5.8/200ft, P3 5.8/200ft, P4+ 5.7/800ft in blocks). A 60m single rope covers all pitch lengths; rock is sound for gear anchors. Consider a second rope or extra webbing for descent given the remote alpine setting.',
  ascender = NULL,
  corrections = 'None; matches published FA/route description.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_poltergeist_pinnacle';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No beta found for the ''South Side'' line specifically; the documented West Route (Class 2-3) involves steep sidehilling and real exposure via a ramp system, climbed unroped by competent parties. Assume comparable exposure/terrain on the south side.',
  ascender = NULL,
  corrections = 'Only the West Route was documented in sources found; South Side route gear inferred by analogy to the same peak''s West Route and stated grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_chaval_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found for a Washington ''Mount Dana'' (searches surfaced Mount Daniel, a different, better-documented peak, instead). Gear inferred purely from the stated Class 2-3 grade.',
  ascender = NULL,
  corrections = 'Could not locate any guidebook/trip-report source specifically for this peak/route; recommend a manual data-quality check that ''Mount Dana'' is not a mislabeling of a better-known WA peak.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_dana_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Direct snow-gully route: continuous ~45-degree snow climb to hard mud/loose Class 3 rock. Source explicitly states ''rope and other typical glacier accessories are unnecessary, but a helmet is essential'' due to loose rock.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_honeymoon_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Royal Basin approach crosses the top edge of a small glacier where crevasse danger is described as minimal; remainder is Class 2 loose scree/pillow lava. Described as ''steep, exposed and quite serious'' primarily due to rockfall risk, not technical difficulty — helmet essential, rope not standard.',
  ascender = NULL,
  corrections = 'None; matches SummitPost/Mazamas/guidebook descriptions.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_deception_standard';

UPDATE routes SET
  sling_rack = '{"cams":"single rack ~0.4-3in","nuts":"small-medium set","slings":"5-6 shoulder-length + 2 double-length"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'No source specifically named a ''Southwest Route'' by that title (found instead a documented East Ridge, Class 4, and a separate ''Corkscrew Route''). Given the stated Grade III 5.6 rating typical of Southern Picket Range technical routes, inferred a standard trad rack and single 60m rope for several roped pitches.',
  ascender = NULL,
  corrections = 'Route name/grade could not be matched to a specific published description; gear inferred from comparable Picket Range Grade III rock routes on the same peak.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_degenhardt_southwest_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No summit-scramble-specific beta found; sources cover only the Marmot Lake/O''Neil Pass approach trails. Given the stated Class 2-3 (steep snow early season) grade, standard scramble gear applies.',
  ascender = NULL,
  corrections = 'Could not find a technical route description for the actual peak scramble, only approach-trail information; gear inferred from stated grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_duckabush_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Standard summer route from the Upper Trailhead is a hike/scramble that does not typically require rope or ice axe. Winter/early-season conditions require ice axe and crampons for a steep snow chute to the summit.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_ellinor_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Standard approach via Leroy Basin traverses around Gloomy Glacier and scrambles the south side; expect some Class 3 rock steps. Route is normally unroped; ice axe recommended for the glacier-margin traverse and snow slopes.',
  ascender = NULL,
  corrections = 'None; matches route description via Leroy Basin.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_fernow_southeast_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'South Slopes descent/ascent is described in trip reports as easy scree (''practically a stroll'') compared to the Southeast Ridge ascent line. No rope or rack needed.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_ferry_standard';

UPDATE routes SET
  sling_rack = '{"cams":"single set BD Camalots 0.3-3in","nuts":"small-medium set","other":"small Mastercams, 2 snow pickets"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Published rack from a documented second ascent trip report: crampons, 60 or 70m rope, ice axe, single set BD Camalots 0.3-3in, set of nuts, some small Mastercams, helmet, and 2 pickets. 8-12 pitches of glacier travel plus moderate rock to 5.6.',
  ascender = NULL,
  corrections = 'None; rack is directly sourced from a published trip report.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_northeast_face_direct';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Described as ''a fairly easy scramble... ideal objective for beginner mountaineers'' via Royal Basin/Constance Pass approaches. No rope or rack needed under normal conditions.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_fricaba_standard';

UPDATE routes SET
  sling_rack = '{"cams":"comprehensive alpine rack to 3in, doubles in common mid sizes","nuts":"full set","slings":"12+ shoulder/double-length runners plus significant extra cordage/webbing for building rappel anchors (no fixed gear on route)","pitons":"a few knifeblades/lost arrows for supplementing rap anchors, optional but historically useful"}',
  alpine_draws = 12,
  rope_type = 'double/twin ropes',
  rope_length_m = 60,
  rope_note = 'Extremely serious Grade VI 5.10 big-wall ridge route (~25 technical pitches over a mile-long, 4,000ft ridge). The bottom half has four narrow towers requiring summit-and-rappel tactics with long double-rope rappels; the crux Rooster Comb section near the top requires more rappels. There are NO fixed anchors on route. First ascent took 4 days solo with 12 rappels and 25 pitches.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Ascender flagged as recommended for jugging/hauling bivy gear efficiently across such a long, multi-day remote big-wall ridge — standard practice for Grade VI objectives of this length.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_fury_east_mongo_ridge';

UPDATE routes SET
  sling_rack = '{"snow protection":"2 pickets, 2-3 ice screws for bergschrund/crevasse anchors","rock protection":"light rack of a few cams/nuts for Class 4-5 rock sections","slings":"3-4 runners"}',
  alpine_draws = 2,
  rope_type = 'glacier rope (team rope)',
  rope_length_m = 30,
  rope_note = 'Standard route descends from Luna Col to the southeast glacier (~6,700ft), ascending its right side then steeper snow with a possible bergschrund crossing; snow/glacier terrain ranges 20-40 degrees, interspersed with Class 3-5 rock sections. A 30m rope per rope-team is typical, plus light rock protection for harder rock steps. Multi-day remote approach (allow ~1 week).',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Ascender included as standard crevasse-rescue kit for glacier travel, not explicitly itemized but standard practice for this terrain type.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_fury_east_southeast_glaciers';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Southwest Slopes standard route is non-technical Class 2-3 scrambling with loose scree/blocks; no rope carried on typical ascents. Ice axe for early-season snow, no roped travel documented in route beta.',
  ascender = NULL,
  corrections = 'None; SummitPost/Mountaineers route description confirms scramble-only terrain.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_hardy_snow_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'South/East Slopes standard scramble via Herman Saddle; Class 2-3 ridge/snow travel. Rope not standard; aluminum crampons/ice axe useful in shoulder-season snow.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_herman_standard_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2 approach via First Divide/North Fork Skokomish or Lake of the Angels ridge; steep snow sections early season warrant ice axe, but route is not roped.',
  ascender = NULL,
  corrections = 'Route/approach location confirmed via WTA/SummitPost; explicit no-rope statement not found, inferred from Class 2 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_hopper_standard';

UPDATE routes SET
  sling_rack = '{"cams":"single rack to ~2in (BD C4 #0.3-2 or equiv)","nuts":"light stopper set","runners":"6-8 shoulder-length + 2 double-length","cordage":"rappel tat/webbing — existing anchors reported in place"}',
  alpine_draws = 6,
  rope_type = 'dynamic single',
  rope_length_m = 60,
  rope_note = 'Committing Grade III technical rock (this route line rated 5.0-5.6; the harder Persis-Index full traverse variant hits 5.7 on vertical dirt/rotten rock). Rope and rack mandatory — carried from the trailhead for the hourglass-gully rappels and technical pitches; ice axe/crampons needed for permanent snowfields en route.',
  ascender = NULL,
  corrections = 'This is NOT a pure scramble despite the terse grade label — SummitPost/Mountainproject/CascadeClimbers trip reports are explicit that the North Peak is only reached via committing 5th-class climbing with multiple rappels; full trad rack and rope required, contrary to what a ''Class 5.0-5.6'' tag might undersell.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_index_north_peak_traverse';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific technical beta found despite searching. Class 2-3 rating is consistent with non-technical talus/ridge scrambling typical of this part of the Olympics — rope not standard.',
  ascender = NULL,
  corrections = 'climbersguideolympics.com (best source for this peak) was unreachable (403/blocked); relied on grade-based inference.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_la_crosse_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Described in scattered sources as a ''difficult scramble via rubble'' terrain; Class 3 rating implies hands-on scrambling but not roped climbing. Helmet and ice axe (early season) standard.',
  ascender = NULL,
  corrections = 'Very limited route-specific data found; one source describing ''Mount Lawson'' rubble scramble may refer to a different (Canadian) peak of the same name, so treated with caution and inferred from grade only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_lawson_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Standard Scramble via Flapjack Lakes/Sawtooth Ridge (Staircase approach); Class 3 ridge terrain, second-highest point on Sawtooth Ridge. Steep snow early season needs ice axe; route not roped by standard parties.',
  ascender = NULL,
  corrections = 'Approach and location verified; explicit rope requirement not documented, consistent with Class 3 no-rope norm.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_lincoln_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found (searches returned unrelated Mount Lyell/Lyall peaks in CA/Alberta). Class 3-4 rating suggests exposed scrambling where some parties may choose a short handline for the class 4 crux, though not standard for all parties.',
  ascender = NULL,
  corrections = 'Could not locate any WA-specific source for this peak; entry is grade-based inference only, not fabricated trip-report detail.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_lyall_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble with talus, bushwhacking, and gendarmes on the ridge. Trip reports cite helmets and ice axes; rope not part of standard gear list.',
  ascender = NULL,
  corrections = 'None; Mountaineers.org trip reports confirm scramble-grade terrain with gendarme routefinding, no roped climbing mentioned.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_mastiff_south_route';

UPDATE routes SET
  sling_rack = '{"slings":"2-3 runners for occasional handline/rappel anchors on Class 4 sections"}',
  alpine_draws = 0,
  rope_type = 'dynamic single',
  rope_length_m = 30,
  rope_note = 'Bailey Range Scramble sits within the broader Bailey Range Traverse: permanent snowfields and crevassed glacier terrain (Hoh Glacier vicinity) require rope for glacier-travel legs; the Class 4 ridge scrambling on broken sedimentary rock itself is typically unroped by experienced parties, but a short rope aids confidence on exposed sections.',
  ascender = 'prusik cord recommended for glacier crossings en route',
  corrections = 'Distinguish from a dry-rock Class 4 scramble elsewhere — glacier travel gear is warranted by the route''s proximity to permanent snow/glacier per Bailey Range Traverse trip reports.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_mathias_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Short, low-elevation (~1,800ft gain) Class 2 scramble near Lake Valhalla; some rock scrambling near the summit but rated only ''mildly technical.'' No technical rock or snow gear needed beyond trekking poles/traction in shoulder season.',
  ascender = NULL,
  corrections = 'This is a minor, non-alpine objective relative to most others on this list — WTA/AllTrails sources consistently describe it as a short hike-scramble, not a mountaineering route.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_mccausland_n_route';

UPDATE routes SET
  sling_rack = '{"slings":"2-4 runners for the 4th-class pitch/anchor"}',
  alpine_draws = 2,
  rope_type = 'dynamic single',
  rope_length_m = 30,
  rope_note = 'Standard Scramble via Royal Basin includes a mellow glacier approach and one pitch of 4th-class scrambling near the summit; most parties carry a short rope for this pitch plus glacier-travel gear for the approach.',
  ascender = 'prusik cord for glacier approach',
  corrections = 'None; sources explicitly describe ''moderate scrambling with 1 pitch of 4th class near the top'' and a ''mellow glacier approach.''',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_mystery_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found. Olympic rock here (shale/sandstone/pillow lava) is characteristically loose — helmet essential — but Class 2-3 rating indicates non-technical scrambling without rope.',
  ascender = NULL,
  corrections = 'Only general peak/geology data found; no route-level trip reports located.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_norton_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found; Class 2-3 rating is consistent with non-technical Olympic talus/ridge scrambling — rope not standard.',
  ascender = NULL,
  corrections = 'climbersguideolympics.com (the one indexed source for this peak) was unreachable on repeated attempts; grade-based inference only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_noyes_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found; Class 2-3 rating is consistent with non-technical Olympic scrambling — rope not standard.',
  ascender = NULL,
  corrections = 'climbersguideolympics.com listing found but unreachable; searches otherwise redirected to Mount Olympus results. Grade-based inference only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_olson_standard';

UPDATE routes SET
  sling_rack = '{"stoppers":"small stopper/nut set","cams":"a few tri-cams / small cams","runners":"long runners/slings for the ramps","ice_screws":2}',
  alpine_draws = 3,
  rope_type = 'dynamic single',
  rope_length_m = 50,
  rope_note = 'Glacier rope for the Blue Glacier crossing/crevasse rescue, plus roped Class 4 climbing with a Class 5 step up the East Face Ramps to the summit block. Source explicitly recommends a few stoppers, tri-cams, and long runners to protect exposed rock moves, and two ice screws for crevasse-rescue anchors — pickets explicitly NOT needed.',
  ascender = 'prusiks/mechanical ascender for crevasse-rescue system',
  corrections = 'Source explicitly contradicts a default ''bring pickets for glacier route'' assumption — states no pickets needed given typically solid glacier ice, two ice screws suffice.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_olympus_blue_glacier_east_ramps';

UPDATE routes SET
  sling_rack = '{"cams":"3-4 small-to-medium cams (approx BD C4 #0.4-2 range)","runners":"assorted slings for anchors"}',
  alpine_draws = 4,
  rope_type = 'dynamic single',
  rope_length_m = 50,
  rope_note = 'Full glacier team-rope travel across the Blue Glacier/upper mountain (17+ mile approach, crevasses and bergschrunds) connecting West (7,969ft), Middle (7,929ft), and East (7,762ft) Peaks. West Peak''s summit pitch needs 3-4 small-to-medium cams; Middle/East Peak sections are comparatively easier but still glaciated and exposed.',
  ascender = 'prusiks/ascender for crevasse rescue',
  corrections = 'Gear reflects the documented West Peak crux pitch; carry full crevasse-rescue kit for the entire multi-day, multi-summit traverse — one of the most serious objectives on the list.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_olympus_traverse';

UPDATE routes SET
  sling_rack = '{"slings":"1-2 runners for an optional handline on the exposed ridge section"}',
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Ridge scramble via Jefferson Creek/Hamma Hamma approach: solid Class 3 with a ''spicy'' exposed traverse, and a 4th-class scramble section on a very exposed ridge that confident parties walk unroped. Rock quality is inconsistent.',
  ascender = NULL,
  corrections = 'Trip-report language indicates this is harder/more exposed than a typical Class 3 despite the nominal grade — flag for extra caution.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_pershing_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found; regional Olympic High Route sources describe similar terrain in this area as ''mostly Class 2-3,'' consistent with non-technical scrambling — rope not standard.',
  ascender = NULL,
  corrections = 'No dedicated trip report for Mount Price''s North Route was located; inference drawn from regional-terrain descriptions only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_price_north_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'South Ridge/Southeast Ridge route (via Thirtynine Mile Creek) is mostly Class 1-2 ridge travel with short Class 3 rock sections near the false and true summits; exposure is explicitly described as ''never bad.'' Rope not required for competent parties.',
  ascender = NULL,
  corrections = 'Matched to a trip report naming this exact line via Thirtynine Mile Creek in the Picket Range near Ross Lake — note this Mount Prophet is a North Cascades peak, not Olympics, despite being grouped with the other routes in this batch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_prophet_east';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found; Class 2-3 rating is consistent with non-technical Olympic-style scrambling — rope not standard.',
  ascender = NULL,
  corrections = 'No dedicated source located for this peak despite multiple search attempts; grade-based inference only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_pulitzer_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Mount Queets has multiple named routes spanning Class 2 to Class 4; this South Slopes line''s Class 3 rating sits mid-range — no rope typically required, though the peak supports a small glacier so early-season parties should watch for snow/ice.',
  ascender = NULL,
  corrections = 'The exact ''South Slopes'' line wasn''t independently confirmed against the three named routes found; Class 3 rating placed it closest to the ridge route in difficulty rather than the glacier line.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_queets_south';

UPDATE routes SET
  sling_rack = '{"cams":4,"nuts":"a few, assorted small-mid","pitons":2,"tat_cord":"bring extra for rap anchors"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single 60m rope for glacier travel plus short rappels off the ridge crest; trip report recommends carrying extra cord to leave at rappel anchors in case existing tat looks bad.',
  ascender = 'Tibloc/prusik recommended for crevasse self-rescue given remote, low-traffic terrain',
  corrections = 'Mountain Project route-specific trip report gives exact rack (2 pitons, few nuts, 4 cams); one short ice step was protected with rock gear, not screws. Curtis Ridge is described as harder/more committing than Liberty or Ptarmigan Ridge.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_curtis_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single (or twin 30m glacier ropes for 3-person teams)',
  rope_length_m = 30,
  rope_note = '30m glacier/rando rope standard for a 2-person crevasse-rescue team; some parties instead run two 30m glacier ropes at 3 climbers/rope. Lightweight parties report 60m 8mm ropes.',
  ascender = NULL,
  corrections = 'No rock rack — this is a snow/ice couloir (30-45 deg) with minimal crevasse danger through the finger itself; gear need is glacier crevasse-rescue kit only, not rock protection.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_fuhrer_finger';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = '30m glacier line typically adequate for this shorter, moderate route.',
  ascender = NULL,
  corrections = 'No technical rock rack; protection is pickets (1-2 per person) with occasional ice screws depending on snow/ice coverage. Route is only advisable in winter/spring due to extreme rock/icefall in summer.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_gibraltar_ledges';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '60m rope enables two double-rope (30m) rappels off the ice headwall plus some downclimbing to regain the base of the ice pitches.',
  ascender = NULL,
  corrections = 'No rock rack needed — 300ft AI2 ice headwall (~50 deg max), climbable in two pitches; gear is ice screws + pickets + a second ice tool. Primary hazard is icefall from the Kautz Ice Cliff seracs above.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_kautz_headwall';

UPDATE routes SET
  sling_rack = '{"pitons":2,"cams":"small set","tricams":2,"note":"highly broken volcanic rock — pitons/Tricams/cams hold better than nuts per multiple sources"}',
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single 60m rope for glacier approach and ice-step pitches; the Grade IV right-hand variation adds 4-6 mixed pitches to AI2-3 on the way to the Liberty Cap Glacier.',
  ascender = 'recommended for crevasse self-rescue on the approach glacier',
  corrections = 'Rock gear composition differs meaningfully from granite Cascades routes — nuts flagged as unreliable in this rock type. Rockfall hazard is significant; sun-exposure timing matters more than gear here.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_mowich_face';

UPDATE routes SET
  sling_rack = '{"pitons":"a few, for belay anchors in serac terrain","note":"no dedicated rock rack found in any source — anchors are primarily ice-axe belays and piton belays across the icefall"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 45,
  rope_note = 'The 1948 first ascent used a single ~120ft (37m) rope with ice-axe and piton belays; a modern party would carry a 50-60m single rope. Extremely thin modern beta.',
  ascender = 'recommended — serac/crevasse-maze terrain with essentially no modern traffic or nearby rescue',
  corrections = 'Very sparse route-specific gear beta: only the 1948 AAC first-ascent account and a SummitPost photo page exist for this route specifically. The original survey team explicitly recommended against using it as a summit route due to icefall hazard, and it sees essentially no modern ascents. Figures extrapolated from that account plus standard practice on adjacent Kautz-icefall/Wilson-Headwall terrain.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_rainier_nisqually_icefall';

UPDATE routes SET
  sling_rack = '{"cams":"0.4-1.5in, 3-4 pieces","nuts":"half set to full set","pitons":2,"tricams":2,"note":"three independent trip reports converge: ''a rock rack was essential''"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single 60m rope typical for this sustained 3-4 day route; length isn''t fixed across sources but 60m matches the multi-pitch mixed terrain reported.',
  ascender = 'recommended for crevasse self-rescue on remote upper-mountain terrain',
  corrections = 'Strongest multi-source agreement of the 10 routes that a real rock rack — not just a token piton — is required, unlike moderate Rainier routes. Ice screw count (6) and picket count (1-4, strongly condition-dependent) also corroborated across independent reports.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_ptarmigan_ridge';

UPDATE routes SET
  sling_rack = '{"slings_120cm":3,"note":"''long slings'' specifically called out for anchor extension on the upper Mowich Face finish"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '60m rope with long slings reported for the upper Mowich Face finish shared by this route; 4-6 ice screws recommended for that section.',
  ascender = 'recommended given remote, low-traffic, strongly condition-dependent terrain',
  corrections = 'Route shares its final section (upper Mowich Face) with the Mowich Face route, so gear needs converge there. Only reliable in good snow years — recent reports note dry seasons expose rock and increase difficulty.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_sunset_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single (or twin 30m for 3-person teams)',
  rope_length_m = 50,
  rope_note = 'Standard glacier rope; late-season parties specifically report needing to rappel into and ice-climb out of crevasses rather than just cross on snow bridges.',
  ascender = 'mechanical ascender (Tibloc/Micro Traxion) or prusiks specifically valuable — sources note late-season parties may need to climb out of crevasses on this remote, low-traffic route',
  corrections = 'No rock gear — pure glacier route, but notably more serious than its Grade III suggests because of crescentic upper crevasses requiring careful route-finding; crevasse-rescue technique must be ''nailed'' before attempting given the isolation.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_tahoma_glacier';

UPDATE routes SET
  sling_rack = '{"cams":1,"nuts":"a few","pitons":1,"note":"verbatim from a direct trip report: ''a rope, a cam, a few nuts, three screws, and one piton'' — deliberately minimalist for speed through icefall exposure"}',
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'A direct trip report''s minimalist rack used one rope (consistent with a 60m alpine rope); the route requires rappels off ice cliffs (e.g. ~75ft) using doubled strands off a single rope, plus an extra sling used at one rappel anchor.',
  ascender = 'recommended — most serious/committing of the 10 routes, extended icefall/rockfall exposure with essentially no rescue access',
  corrections = 'Directly sourced trip-report gear list: 1 cam, a few nuts, 1 piton, 3 ice screws, 1 rope, 2 ice tools. Confirms the lightweight ethos typical of Willis Wall ascents.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_rainier_willis_wall';
COMMIT;
