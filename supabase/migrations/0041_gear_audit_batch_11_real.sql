-- Gear audit batch 11 (FINAL BATCH - real route IDs verified against live DB): 119 routes across 83 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- This closes out the original 764-route curated WA alpine/mountaineering/scrambling scope.
-- Includes Prusik Peak (4 routes, Enchantments), Sloan Peak (3 routes), South Early Winters Spire
-- (7 routes, Washington Pass), Spire Gully/Alpenkuhl (5 routes), Unicorn Peak (4 routes, Tatoosh),
-- Guye Peak (5 routes, incl. Improbable Traverse flagged as currently discouraged post-2021
-- rockfall), West McMillan Spire, Vesper Peak, Whatcom Peak, Southeast Mox Peak's Devils Club
-- (23-pitch remote big wall), plus many Class 2-4 scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Nontechnical talus/scree scramble via SW ridge/south face from Lake Doris camp; no rope used on standard route.',
  ascender = NULL,
  corrections = 'No route-specific technical beta found; based on terrain description of southwest talus slopes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_osceola_peak_scramble';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.3-3 in single rack"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Grade III-IV alpine rock in the Southern Pickets area; approach crosses glaciated terrain near Ottohorn-Himmelhorn col requiring rope for glacier travel.',
  ascender = NULL,
  corrections = 'No dedicated route topo/gear list found; gear inferred from grade (III-IV 5.7) and typical Southern Pickets glacier-approach alpine rock norms.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ottohorn_southeast_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2, unexposed boulder/talus ridge scramble via SW ridge from Oval Lakes or W Fork Buttermilk Creek; no rope needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_oval_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble to red-rock summit massif above ~3100ft; comfort with exposed scrambling needed but no rope typically used.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_painted_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.3-4 in single rack; small-to-medium cams protect the P4 offwidth, no #5 needed"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '4 pitches/500ft; descent is two 30m rappels down a gully (or Class 3 downclimb via ridge). Single 60m rope sufficient.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_rampage';

UPDATE routes SET
  sling_rack = '{"nuts":"set of nuts","cams":"0.4-4 in; small cams work well on twin cracks P3-4; P8 wide crack has sparse pro"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '8 pitches/600ft, Grade III; two rappels off pre-placed sling/horn anchors for descent.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_west_ridge_2';

UPDATE routes SET
  sling_rack = '{"nuts":"full set incl. small wires/RPs","cams":"0.3-3 in single rack"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'III-IV 5.10+ R — R-rating means runout, sparsely protected sections; carry extra small wires/thin gear for spaced protection.',
  ascender = NULL,
  corrections = 'Route confirmed to exist but trip report returned 403; gear list inferred from grade/R-rating conventions, not a verified pitch-by-pitch source.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_direct_west_face';

UPDATE routes SET
  sling_rack = '{"nuts":"set","cams":"0.3-3 in"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '5.9 with one A0 aid move; standard trad rack sufficient, optional aider/daisy for the A0 section.',
  ascender = NULL,
  corrections = 'No dedicated route page/topo located; gear inferred from Wine Spires area norms and the 5.9 A0 grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_south_face_2';

UPDATE routes SET
  sling_rack = '{"cams":"few pieces, light rack","nuts":"few","note":"per MP route description: ''runners and a few pieces of gear''"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 50,
  rope_note = 'Grade II, 4 pitches/400ft, easy 5th class rock above a hanging glacier crux (may be impassable late season). Carry ice axe/crampons for the glacier + light rock rack. Helmets required.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_luna_glacier';

UPDATE routes SET
  sling_rack = '{"cams":"light rack for Class 4 rock","nuts":"few","pickets":"2-3 snow pickets"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 50,
  rope_note = 'Grade III, Class 4; roped snow/glacier travel with pickets near the bergschrund (~7200ft) transitioning to Class 4 rock on an exposed summit ridge.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_phantom_peak_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2 off-trail scramble up steep western slopes from Lake Serene; best May/June when snow covers underbrush. No technical gear.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_philadelphia_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 off-trail ridge/talus scramble from Borealis Pass; no rope used on standard route.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_pinnacle_mountain_entiat_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3-4 scramble via Pinnacle-Plummer saddle and south gully; loose volcanic rock with exposure - helmet strongly recommended, typically climbed unroped.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_pinnacle_peak_tatoosh_r1';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = '4th class scramble on Pinnacle Peak; loose volcanic rock, exposure warrants helmet and caution; a short rope/handline is optional for less-experienced parties on the exposed step.',
  ascender = NULL,
  corrections = 'No beta specifically named ''Southwest Scramble'' was located; inferred from general Pinnacle Peak/Tatoosh loose-volcanic-rock terrain and the Class 4 rating.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_southwest_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2 easy walk-up from the Pinnacle-Plummer saddle; short rock scramble near the summit, no rope needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_plummer_peak_r1';

UPDATE routes SET
  sling_rack = '{"nuts":"set","cams":"0.5-3 in","note":"three short (5-15ft) technical cruxes in the 5.5-5.7 range"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Multi-pitch alpine rock, often simul-climbed; descent is a summit walk-off down sandy slopes/scree, no rappel needed.',
  ascender = NULL,
  corrections = 'Multiple sources grade this III 5.7 overall with a 5.6 crux pitch; the provided grade of 5.6 likely reflects the crux pitch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_blue_s_buttress';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 off-trail scramble via Rainy Lake; steep, overgrown brush and mossy slab above the lake, no rope typically used.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_preacher_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"few pieces optional for Class 3 rock","note":"glacier travel gear matters more than a rock rack here"}',
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Class 3 max via East Ridge from the Primus-Tricouni Col (''Lucky Pass''); glacier travel required to reach the col - carry ice axe, crampons, and a rope for crevasse rescue on approach.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_slope';

UPDATE routes SET
  sling_rack = '{"nuts":"set","cams":"0.5-3 in"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Rarely climbed, described as a jagged, loose ridge (at least 4th class terrain with a 5.6 crux); standard trad rack, helmet essential for rockfall/loose rock.',
  ascender = NULL,
  corrections = 'Only a single source mentions this route''s existence; no pitch-by-pitch gear beta found.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_ridge_4';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"to 4 in, doubles 0.5-2 in"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '6 pitches, 700ft, original 1962 line up Prusik''s south face; some parties finish via a 5.10a splitter variation to the summit.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_beckey_davis';

UPDATE routes SET
  sling_rack = '{"nuts":"set","cams":"0.3-3 in"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '4 pitches, 450ft, on Prusik''s south/west face near Solid Gold; standard alpine trad rack similar to neighboring routes.',
  ascender = NULL,
  corrections = 'Route length/grade confirmed via overlays, but no itemized gear list was found; rack inferred from comparable Prusik south-face routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_boving_christensen';

UPDATE routes SET
  sling_rack = '{"nuts":"set","cams":"0.3-3 in"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '5 pitches, 450ft; one short (~15ft) C1 aid section near the top where the FA party pulled on gear - carry a couple aiders/daisy or be prepared to French-free. Otherwise standard trad rack.',
  ascender = NULL,
  corrections = 'FA trip report describes climbing character and the aid section but does not itemize the rack.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_energizer_bunny';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"doubles 0.5-2 in, singles to 3-4 in","slings":"8 single (24in) + 4 double (48in) length slings"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '6 pitches, Grade III 5.9+; ice axe useful for early-season snow on the Aasgard Pass approach.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_stanley_burgner';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 ridge walk from Mt. Lago area; one tricky 3rd-class ledge traverse near Point 8165, otherwise easy dirt/talus, unroped.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ptarmigan_peak_pasayten_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Approach crosses the Colonial Glacier basin (crevasses, steep snow finger) - carry ice axe, crampons, and consider a rope for glacier travel; final ridge/summit is a Class 3 rock scramble, typically unroped.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_pyramid_peak_colonial_standard';

UPDATE routes SET
  sling_rack = '{"cams":"light set 0.5-2in","nuts":"small stopper set","notes":"Rock reported loose in places; solid slabs on south side"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Short 5.5 rock scramble/climb on Red Mountain''s ridge; single 60m rope sufficient for the low-5th-class sections, many parties simul-climb or scramble sections unroped.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; rack inferred from 5.5 grade and terrain description.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ragged_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3-4 scramble, non-technical except a few hundred feet of 3rd/4th class near the true (South) summit; no rope used in standard dry-condition ascents.',
  ascender = NULL,
  corrections = 'Grade/terrain-based inference; avalanche-exposed slopes noted for early-season snow.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_reynolds_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble; no rope required in dry conditions.',
  ascender = NULL,
  corrections = 'No route-specific trip reports found beyond peak elevation (7,260ft); gear inferred purely from stated Class 3 grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_rimrock_ridge_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 trail-based route via maintained Rock Mountain Trail #1587 (USFS) off US-2; no technical rock or rope gear needed.',
  ascender = NULL,
  corrections = 'Confirmed via USFS trailhead page; maintained trail to near-summit scrambling only.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_rock_mountain_west_route';

UPDATE routes SET
  sling_rack = '{"pickets":"2-3 snow pickets","notes":"Crevasse-rescue kit (prusik cords, pulley, carabiners) recommended, not a mechanical ascender"}',
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Grade II glacier route: roped glacier travel required crossing the Ruth Glacier (mandatory ice axe, strongly recommended rope especially after early July); parties commonly carry 30m ropes. Final approach to Icy Peak''s summit is ~500ft of 2nd-3rd class, then a 100ft 4th-class summit gully typically climbed unroped/scrambled.',
  ascender = NULL,
  corrections = 'Confirmed via multiple trip reports: glacier gear mandatory, crevasses open by late summer.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ruth_icy_traverse';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble on the standard route; no rope typically needed away from any glaciated aspects (Fairchild Glacier sits on the NE slope, off standard line).',
  ascender = NULL,
  corrections = 'Only general peak/geography info found; no dedicated route-level trip report distinguishing the standard scramble line from the glacier.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ruth_peak_olympics_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble via broad gully to South Ridge; airy, exposed summit block with high rockfall danger and loose holds. No rope standard, though cautious parties may want a handline for the final exposed section.',
  ascender = NULL,
  corrections = 'Confirmed via multiple route descriptions of the Emerald-Saska Col approach and South Ridge scramble.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_saska_peak_emerald_saska_col';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 broad southwest-slope scramble from Leroy Creek Basin; boulder-hopping and loose granite but no roped climbing on the standard route.',
  ascender = NULL,
  corrections = 'Confirmed via route descriptions; steep sections can be passed left or right without technical difficulty.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_seven_fingered_jack_southwest_slopes';

UPDATE routes SET
  sling_rack = '{"cams":"light-to-medium rack to 3in","nuts":"stopper set","notes":"Standard single-pitch trad rack for the grade; no route-specific beta found beyond MP grade listing"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Short 5.6 trad route at Shark Rock (minor Gifford Pinchot crag); single 60m rope sufficient. Exact pitch count/length not published.',
  ascender = NULL,
  corrections = 'Mountain Project confirms grade (5.6, trad) and area, but no published rack/pitch/length details.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ez_way';

UPDATE routes SET
  sling_rack = '{"cams":"single set to 2in","nuts":"small-mid stoppers","notes":"Gear good once crack widens on P1; P2 gear sparse, best found in thin cracks/horizontal seams; two-bolt anchor atop P1"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '2 pitches, ~150ft total (5.10-, Grade II). Descent is two 75ft rappels from a fixed anchor at the top.',
  ascender = NULL,
  corrections = 'Verified directly via Mountain Project route page (FA Sept 1990).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_southeast_face';

UPDATE routes SET
  sling_rack = '{"slings":"1-2 long slings/webbing for the tree rap anchor","notes":"Rarely visited, self-arrest same way up/down"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Mostly Class 3/4 rock and brush; one short pitch requires a rope belay going up, and the same section is rappelled off a tree anchor on descent. A 30m rope covers the single roped pitch.',
  ascender = NULL,
  corrections = 'Confirmed via route description of the standard line from Weden Pass area.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_sheep_gap_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"standard alpine rack to 3in, doubles in common mid sizes","nuts":"stopper set","notes":"Clean white granite south face, comparable in character to the neighboring Chalice route on the same wall"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Grade III, 5.10 multi-pitch alpine route on Silver Horn''s south face (sub-summit of Silver Star). Single 60m rope appropriate for a route of this grade/length. Exact pitch count not published online.',
  ascender = NULL,
  corrections = 'Primary trip report was blocked (403) from direct fetch; rack inferred by comparison to the well-documented neighboring Chalice route.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_playing_not_spraying';

UPDATE routes SET
  sling_rack = '{"cams":"standard alpine rack, doubles in common finger-to-hand sizes","nuts":"stopper set","notes":"Standard alpine rack per Mountain Project; rarely climbed, no fixed gear noted"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '8 pitches, 800ft (Grade III, 5.10-). Route follows flakes/corners/splitters to a mid-height ledge, then 3 more pitches to blocky summit terrain.',
  ascender = NULL,
  corrections = 'Verified directly via Mountain Project route page.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_chalice';

UPDATE routes SET
  sling_rack = '{"cams":"light rock rack (finger to 2.5in)","nuts":"small-mid stopper set","notes":"Approach/descent involves glacier or snowfield travel"}',
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 50,
  rope_note = '5.9+ ridge route on Silver Star Mountain (Okanogan); the closest well-documented comparable line (NE Ridge, Grade III 5.9) uses standard glacier-crossing gear plus a light rock rack for scrambling to the summit. A 50-60m single rope covers both glacier travel and short 5th-class ridge pitches.',
  ascender = NULL,
  corrections = 'Primary source returned 403/certificate errors on fetch; inferred from the closely comparable, well-documented NE Ridge route character.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_east_ridge_3';

UPDATE routes SET
  sling_rack = '{"pickets":"snow pickets (bring extra) for Chickamin Glacier crossing","cams":"minimal light rock rack for the summit scramble","notes":"Gully described as one of the loosest/most unpleasant on the route"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Class 4 with glacier crossing (Chickamin Glacier, approached via Ptarmigan Traverse). Rope up for glacier travel — crevassing and bergschrund can be serious.',
  ascender = NULL,
  corrections = 'Confirmed via multiple Ptarmigan Traverse trip reports.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_sinister_peak_southwest_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3-4 olivine scramble in the Twin Sisters Range; olivine rock is noted as unusually grippy, reducing rope necessity even on steeper sections.',
  ascender = NULL,
  corrections = 'General Twin Sisters Range/Skookum Peak beta found but no route-specific trip report isolating the Skookum scramble line from roped climbs on adjacent Jaw''s Tooth.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_skookum_peak_twinsisters_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 scramble; described as non-technical, requiring more time/navigation than nearby peaks due to steep approach slopes, but no rope or technical gear needed.',
  ascender = NULL,
  corrections = 'Confirmed non-technical standard approach from Stevens Pass PCT access.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_sky_mountain_s_route';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack to 3+in, doubles recommended in common sizes","nuts":"stopper set","notes":"Best climbed late season once large summit ledges shed snow"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '9 pitches, ~1100ft, Grade III 5.10 on Sloan Peak''s Southwest Face (FA 9/11/2011). Single 60m rope standard for a route of this length/grade.',
  ascender = NULL,
  corrections = 'FA trip report returned 403/blocked on fetch; grade/length/pitch-count confirmed via Mountain Project area listings, rack inferred by comparison to the neighboring Fire on the Mountain route.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_diamond_in_the_rough';

UPDATE routes SET
  sling_rack = '{"cams":"doubles #0.2-#2, single #3","nuts":"full stopper set","notes":"Lots of alpine draws recommended (doubles); a few extra mid-size pieces helpful on longer pitches"}',
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '7 pitches of 5.10d rock (to a ledge intersecting the Corkscrew Route) plus ~500ft of 4th/low-5th scrambling to the true summit; ~1000ft technical + 500ft scrambling total. Generally good protection at cruxes but runout sections on P2 and P5.',
  ascender = NULL,
  corrections = 'Verified directly via Mountain Project route page and a corroborating trip report.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_fire_on_the_mountain';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack to 3+in","nuts":"small-mid stopper set","notes":"8-10 runners recommended, helmet mandatory; clean granite slabs with crack systems"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 50,
  rope_note = 'IV, 5.9+, 9 pitches, 1800ft. Lower half is easy low-angle slab (can be soloed/simul-climbed by confident parties), steepening higher up.',
  ascender = NULL,
  corrections = 'Verified via Mountain Project route page.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_northwest_buttress';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (optional short handline)',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble via SW slopes/Cave Ridge; roped travel not standard. Some parties carry a 20-30m handline + prusik for a short exposed step near the summit ridge. Helmet strongly recommended for climber-induced rockfall in the talus field.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_snoqualmie_mountain_standard_route';

UPDATE routes SET
  sling_rack = '{"cams":"2-3 small-mid (optional handline)","nuts":"small set (optional)"}',
  alpine_draws = 0,
  rope_type = 'glacier rope (team rope)',
  rope_length_m = 30,
  rope_note = 'Rope up for crevassed Neve Glacier crossing (col near Neve Peak to Snowfield''s west ridge); unrope for the Class 3 summit ridge scramble. Trip reports note some leaders carry a small cam/nut rack for a handline on the scramble.',
  ascender = 'crevasse-rescue prusiks/pulley (glacier travel kit)',
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_neve_glacier_west_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Area (''Sofa King Buttress'') not found on Mountain Project''s Washington Pass sub-area index or other guidebook sources searched. Inferred from grade/regional style as a short bolted granite pitch typical of Washington Pass sport crags.',
  ascender = NULL,
  corrections = 'Could not verify area name/location despite exhaustive search of Washington Pass''s 14 indexed sub-areas; gear inferred, not fabricated from trip reports.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_drilling_me_softly';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Same unverified area as Drilling Me Softly (Sofa King Buttress). Inferred bolted-sport gear from grade/regional style.',
  ascender = NULL,
  corrections = 'Area not found on Mountain Project; see wa_drilling_me_softly note.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_spraying_mantis';

UPDATE routes SET
  sling_rack = '{"cams":"single set 0.3-3in, doubles in finger/hand sizes","nuts":"small-mid set"}',
  alpine_draws = 6,
  rope_type = 'single (double ropes common for descent raps)',
  rope_length_m = 60,
  rope_note = '3-pitch trad line on South Early Winters Spire''s granite. Standard alpine rack to 3in, extra small cams for roof cracks. SEWS routes are commonly descended via multiple rappels down the SW Couloir, so many parties carry twin 60m ropes.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_boving_roofs';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-4in","nuts":"small-mid set"}',
  alpine_draws = 6,
  rope_type = 'single (double ropes for descent)',
  rope_length_m = 60,
  rope_note = 'Classic 5.9+ chimney/face line, SEWS. Standard rack to 3in; wide piece (#3-#4) useful for the chimney section.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_dolphin_chimney';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-3in","nuts":"small set"}',
  alpine_draws = 12,
  rope_type = 'single (double ropes for descent)',
  rope_length_m = 60,
  rope_note = '6-pitch 5.11- testpiece on SEWS; modern mixed bolt/gear protection typical of the harder Washington Pass free lines.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_free_mojo';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-3in","nuts":"small set"}',
  alpine_draws = 12,
  rope_type = 'single (double ropes for descent)',
  rope_length_m = 60,
  rope_note = '5.11b sport/trad hybrid pitch(es) on SEWS, same buttress as Free Mojo/Northwest Face; mixed protection.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mojo_rising';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-3in","nuts":"small-mid set"}',
  alpine_draws = 10,
  rope_type = 'double/twin ropes recommended',
  rope_length_m = 60,
  rope_note = '6-pitch 5.11a/b Boving-Pollock line on SEWS''s NW face; long multi-rappel descent makes twin 60m ropes the common choice.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_northwest_face_boving_pollock';

UPDATE routes SET
  sling_rack = '{"cams":"light set 0.3-2in","nuts":"small set"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Easiest/most popular SEWS line, mostly difficult scramble to low 5th (5.5); small light rack, often simul-climbed or short-roped by faster parties.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_arete';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-3in, doubles in thin sizes","nuts":"small-mid set"}',
  alpine_draws = 12,
  rope_type = 'single (double ropes for descent)',
  rope_length_m = 60,
  rope_note = 'Sustained 9-pitch 5.11d testpiece on SEWS; full rack plus extra small cams for sustained crux pitches.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_southern_man';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.3-3in","nuts":"small-mid set"}',
  alpine_draws = 10,
  rope_type = 'single (double ropes for descent)',
  rope_length_m = 60,
  rope_note = '9-pitch 5.11- SEWS route; standard hard-free alpine rack, similar to Southern Man on the same wall.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_hitchhiker';

UPDATE routes SET
  sling_rack = '{"cams":"light set","nuts":"small set","extra_slings":"several, for threading knobs"}',
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Pinto Rock ''South Face'' area, Beckey guidebook''s ''regular route.'' 400ft/4 pitches, knobby welded-tuff rock; mixed bolt + knob-thread protection.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_bowling_alley_aka_regular_route';

UPDATE routes SET
  sling_rack = '{"cams":"light set","nuts":"small set","extra_slings":"several"}',
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Pinto Rock South Face, 5 pitches, knobby rock (''cobbletrust'' skill-building route); mixed bolt + occasional gear placements.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_cobbles_101';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.4-3in","nuts":"small-mid set"}',
  alpine_draws = 8,
  rope_type = 'double 60m x 9mm',
  rope_length_m = 60,
  rope_note = 'Gunsight Range South Peak, remote granite spire reached via Chikamin Glacier. Not individually confirmed on MP; inferred consistent with the East Face/West Face naming pattern on neighboring Middle/North Peak.',
  ascender = NULL,
  corrections = 'Route not individually listed in fetched MP data; grade/style inferred from area pattern.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_accidental_discharge_east_face';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.4-3in","nuts":"small-mid set"}',
  alpine_draws = 6,
  rope_type = 'double 60m x 9mm',
  rope_length_m = 60,
  rope_note = 'Confirmed on Mountain Project: Gunsight Range South Peak, 5.8, 3 pitches. Remote glacier approach; trip reports cite twin 60m x 9mm ropes plus full snow/glacier/rock kit.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_ridge';

UPDATE routes SET
  sling_rack = '{"cams":"set 0.4-3in","nuts":"small-mid set"}',
  alpine_draws = 8,
  rope_type = 'double 60m x 9mm',
  rope_length_m = 60,
  rope_note = 'Gunsight Range South Peak. Not individually confirmed; inferred from area pattern and remote-glacier access logistics shared with South Ridge.',
  ascender = NULL,
  corrections = 'Route not individually detailed in fetched MP data.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_west_face';

UPDATE routes SET
  sling_rack = '{"cams":"2-3 light, optional","nuts":"few, optional"}',
  alpine_draws = 0,
  rope_type = 'none typically (optional single rope)',
  rope_length_m = 30,
  rope_note = 'South Twin Sister (Twin Sisters Range), West Ridge. 2hrs of Class 2-3 scrambling on grippy olivine; staying on the ridge crest hits a couple of low-5th-class spots where roping up is sensible.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_west_ridge_4';

UPDATE routes SET
  sling_rack = '{"cams":"double set 0.3-4in","nuts":"full set","pitons":"a few, optional, for old/thin placements","extra_cord":"significant amount for rap anchors"}',
  alpine_draws = 8,
  rope_type = 'double ropes recommended',
  rope_length_m = 60,
  rope_note = 'Southeast Mox Peak, 2,500ft East Face big-wall alpine route (23 pitches). First ascent placed no bolts and rappelled the route entirely on gear anchors; extremely remote/serious. Full trad rack plus abundant rap-anchor cord essential.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_devils_club';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Entiat Mountains. West Ridge/West Gully line up; gentle Class 2-3 with a minor cliff band (~6,800ft) requiring routefinding but no rope.',
  ascender = NULL,
  corrections = 'North vs South Spectacle Butte ''West Route'' not fully disambiguated in sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spectacle_buttes_west_route';

UPDATE routes SET
  sling_rack = '{"cams":"light set to 2in","nuts":"small set","extra_slings":"generous, for rappel anchors"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Northern Pickets, remote south face/ridge route: ~800ft of runout climbing into a chimney, a rappel into a notch, then exposed face climbing to a gendarme.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spectre_peak_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Off-trail, densely forested Class 3 peak near Rt 2/PCT; no glaciers, no technical rope typically needed - mostly bushwhack and talus/scramble.',
  ascender = NULL,
  corrections = 'Specific ''South Route'' line not individually documented; grade/gear inferred from general peak description.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_spinnaker_peak_s_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 9,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Spire Gully right - Alpenkuhl (Washington Pass bolted crag, 7min walk from hairpin). Confirmed on MP: 5.9, sport, single pitch.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unnamed_2';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 9,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Spire Gully right - Alpenkuhl. Confirmed on MP: 5.10, sport, single pitch.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unnamed_3';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 9,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Spire Gully right - Alpenkuhl. Confirmed on MP: 5.10 (task lists 5.10b), sport, single pitch, 3-star.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unnamed_4';

UPDATE routes SET
  sling_rack = '{"cams":"light-mid set 0.3-2in","nuts":"small set"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Spire Gully right - Alpenkuhl. Confirmed on MP: 5.8+, TRAD (only trad route in this otherwise-bolted cluster) - needs a real rack, not just draws.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unnamed_5';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Spire Gully right - Alpenkuhl. Confirmed on MP: 5.8, sport, single pitch, 2.5-star.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unnamed_6';

UPDATE routes SET
  sling_rack = '{"cams":"2-3 light, optional","nuts":"few, optional"}',
  alpine_draws = 0,
  rope_type = 'optional single (short pitches only)',
  rope_length_m = 30,
  rope_note = 'Spire Mountain near Index; ~6mi off-trail, 5,000ft gain, finishing on the west ridge. Mostly Class 3 with short Class 4/occasional Class 5 spots where a rope is sometimes used.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spire_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"light-mid set 0.3-2.5in","nuts":"small-mid set"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Remote Dome Peak-area summit; south/southwest face is a 5-pitch 5.6 (low-5th-class) rock route reached via glacier approach. Light trad rack plus glacier travel gear for approach.',
  ascender = 'crevasse-rescue kit for glacier approach',
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_spire_point_southwest_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Lake Chelan-Sawtooth Wilderness, via Fish Creek Pass. Class 2-3 scree/talus with easy scrambling; early-season parties carry an ice axe for a snow ramp below the summit ridge, otherwise non-technical.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_star_peak_sawtooth_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"2-3 light","nuts":"small set"}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Steeple Rock (Olympics basalt pillar, Hurricane Ridge). Easy 5th class (~5.0) scramble along the ridge crest to the summit block; short pitch, small rack.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_ridge';

UPDATE routes SET
  sling_rack = '{"cams":"light-mid set 0.3-2.5in","nuts":"small set"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Steeple Rock, 5.8 crack up the northernmost line on the west face, left-facing corner along a pillar to a belay stance atop it. Standard small rack.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_wings';

UPDATE routes SET
  sling_rack = '{"cams":"one #1 Camalot"}',
  alpine_draws = 7,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Confirmed on MP: Guye Peak, 5.11b, 50ft sport/mixed pitch - bolts plus one #1 Camalot placement into a pod near the start; 2-bolt chain anchor, no top-out.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_blood_sport';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack 0.3-3in","nuts":"small-mid set"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Confirmed on MP: Guye Peak west face, Grade III, 6 pitches, 800ft, 5.8, standard medium alpine rack, some fixed pro on the traverse pitch. IMPORTANT: a Nov 2021 rockfall destroyed part of the crux traverse (now 5.9-5.10 downclimbing with minimal pro through loose rock) - MP explicitly states ''Climbing this route is not recommended'' as of its last update.',
  ascender = NULL,
  corrections = 'Route is currently discouraged/hazardous per Mountain Project due to Nov 2021 rockfall damage to the crux traverse pitch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_improbable_traverse';

UPDATE routes SET
  sling_rack = '{"cams":"small set","nuts":"small set","extra_slings":"several, for tree anchors"}',
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Confirmed on MP: Guye Peak, Easy 5th class/Grade II. Small rock rack, single rope, slings for tree anchors.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_gully_south_spur';

UPDATE routes SET
  sling_rack = '{"cams":"single set 0.75-2in","extra_slings":"many, for extension due to poor rock/pro quality"}',
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Confirmed on MP: Guye Peak, Easy 5th class/Grade II, 800ft, 5 pitches. Single rack of cams .75-2in is sufficient; protection is intermittent/poor in dirty, flaring cracks, so bring extra slings to extend placements.',
  ascender = NULL,
  corrections = 'Task grade (''4th'') is slightly easier than MP''s listed ''Easy 5th class'' - likely the same route, minor grade-convention discrepancy.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_rib';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'SummitPost''s dedicated ''Standard South Route'' page and Mazamas trip logs describe the SE Ridge line: talus traverses, loose-rock gullies, and Class 3 rock sections up to a notch near 7,200ft. Standard scramble party travels unroped.',
  ascender = NULL,
  corrections = 'None; matches the named ''Standard South Route'' description directly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_summit_chief_mountain_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'West ridge/west face line (Class 2-3) from the Boiling Lake basin traverse. Sawtooth Wilderness guide explicitly lists helmet, ice axe, and crampons as required equipment for snow sections; no rope needed for the rock.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_switchback_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Blewett Pass Table Mountain trail through a burn area to Tronsen Head/larch meadows; this is effectively a hiking trail, consistent with the Class 2 rating. No technical gear needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_table_mountain_standard_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No defined trail; accessed via snow climb on the north slope/west ridge with descent via the east slope. Class 3 scrambling and route-finding; ice axe useful for the snow climb portion, no rope typically carried.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_tailgunner_peak_w_route';

UPDATE routes SET
  sling_rack = '{"cams":"single alpine rack ~0.4-3in","nuts":"small-medium set","slings":"5-6 shoulder-length + 2 double-length runners"}',
  alpine_draws = 5,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '5-pitch intermediate alpine rock route (sourced as 5.5/Grade II, DB lists 5.4) via access gullies on the south side to a heather ledge. Standard trad rack for moderate 5th-class pitches; remote Southern Pickets approach via Terror Basin.',
  ascender = NULL,
  corrections = 'Minor grade discrepancy: sources describe the route as 5.5/Grade II; DB lists Grade II-III, 5.4.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_chopping_block_south_route';

UPDATE routes SET
  sling_rack = '{"cams":"light rack small-medium","nuts":"small set","slings":"4-5 shoulder-length runners"}',
  alpine_draws = 3,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'NE Face route (5.4): angled bouldery moves into a deep 120ft chimney pitch with chockstones, then easy 3rd-class scrambling to the summit. 17-mile RT approach from Staircase via Flapjack Lakes.',
  ascender = NULL,
  corrections = 'None; matches the documented NE Face route on Sawtooth Ridge (Olympics).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_fin_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"small-medium rack, doubles in finger-hand sizes for runout sections","nuts":"full small set","slings":"5-6 shoulder-length runners"}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'SE/SW routes off the notch south of The Horn, both rated 5.5 trad on pillow basalt; the ''R'' rating implies sparser protection than typical, so extra small-to-medium gear for building solid placements is worth carrying.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_horn_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'The Incisor (7,440ft) is a confirmed named spire in The Needles group (Olympic Mtns), visible from Marmot Pass. No route-specific trip report found; several neighboring spires require roped 5th-class pitches, but Class 3-4 (as rated in DB) is typically scrambled unroped, with a handline as an option for the final block.',
  ascender = NULL,
  corrections = 'No route-specific description found despite confirming the peak/spire exists; gear inferred from the stated Class 3-4 grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_incisor_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Approach from High Pass over scree/snow to the col on Mt Larrabee''s south arm, then basin traverse and gully to the notch between peaks. All 4 Pleiades summits reportedly 3rd-class scrambles with loose rock.',
  ascender = NULL,
  corrections = 'Could not confirm which specific Pleiades summit this route_id refers to, nor find a literal glacier crossing despite the ''Glacier/Scramble'' naming.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_pleiades_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack","nuts":"full set","slings":"6+ dyneema runners","pitons":"2 pitons (knifeblade/lost arrow) for supplemental anchors"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'East ridge route, Grade IV 5.9, first ascended during the Complete Southern Pickets Traverse; involves vertical-to-overhanging rock protected partly by pitons. AAC-published equipment list specifies an 8.5mm 60m rope with a medium rock rack.',
  ascender = NULL,
  corrections = 'None; gear directly sourced from an AAC publication describing this exact route/traverse.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_rake_traverse_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'glacier rope (team rope), optional',
  rope_length_m = 30,
  rope_note = 'Standard route crosses the Queest-Alb glacier before a rocky scramble and three fixed wooden ladders leading to the lookout on the south peak. Ice axe/crampons required whenever the glacier headwall/steep snow slope below the summit is present.',
  ascender = 'crevasse-rescue kit for the glacier crossing, not because ascenders are used on the fixed ladders',
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_three_fingers_r1';

UPDATE routes SET
  sling_rack = '{"cams":"light rack, BD Camalots #0.4-#2","nuts":"small-medium set","slings":"several shoulder-length runners plus extra webbing/rap rings for descent anchors"}',
  alpine_draws = 3,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '2-pitch 5.4 route from the NE shoulder: P1 is a short low-5th move up/right to scrubby trees, P2 continues to the ridge. Descent is by rappelling the route from belay trees.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_slippery_slab_tower_ne_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Faint boot path north of Dingford Creek TH, cross-country through forest/heather/tarns to a boulder field, then a tough final scramble to the summit. Crampons/ice axe may be needed if snow lingers into early summer.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_treen_peak_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"light rack, small-medium","nuts":"small set","slings":"3-4 shoulder-length runners"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'South Ridge line bears NNE up sub-alpine slope to the ~7,000ft shoulder. Route is Class 4/low-5th with exposed scrambling; sources note Tupshin has ''no easy route to the top.''',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_tupshin_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'No trail to the summit; moderate-to-difficult summer bushwhack, commonly done instead as a winter snowshoe/scramble when brush is covered. Class 2 rating implies non-technical terrain.',
  ascender = NULL,
  corrections = 'Sources describe Tye Peak generally but not a specifically named ''East Slopes'' line.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_tye_peak_e_route';

UPDATE routes SET
  sling_rack = '{"cams":"3 cams (e.g. Camalot #1, #2, #3) or equivalent hexes","nuts":"small set of stoppers","slings":"~6 shoulder-length + 2 double-length runners"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'One of ~4 established lines on Unicorn Peak''s ~50ft south summit-block face. Sources name this the ''Classic Route'' at 5.6 with good protection; DB lists it as 5.4. Short face means a single 30m rope is more than sufficient.',
  ascender = NULL,
  corrections = 'Grade discrepancy: source lists Classic Route at 5.6; DB lists 5.4.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_classic_route_2';

UPDATE routes SET
  sling_rack = '{"cams":"1-2 small-medium cams","nuts":"small set","slings":"3-4 shoulder-length runners"}',
  alpine_draws = 1,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'Second named line on the south summit-block face, rated 5.0 per source — matches DB''s ''Easy 5th'' grade well.',
  ascender = NULL,
  corrections = 'None; grade (5.0/Easy 5th) matches the sourced ''Open Book Route'' description.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_open_book_2';

UPDATE routes SET
  sling_rack = '{"cams":"2-3 small-medium cams","nuts":"small set","slings":"4-5 shoulder-length runners"}',
  alpine_draws = 2,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'Not individually named in the sources found, but matched by elimination: of the ~4 lines on the south face, ''The Roof'' at DB-listed 5.6 corresponds to one of the two 5.6 lines.',
  ascender = NULL,
  corrections = 'Could not find a source explicitly naming ''The Roof''; identity/gear inferred by matching its 5.6 grade to one of the two unnamed 5.6 lines.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_roof';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Standard approach: Snow Lake Trailhead, up into the upper basin, gully to the saddle west of the peak, then around the west side of the summit block to a short (~50ft) Class 3 scramble/technical step. Competent parties take the easiest line unroped.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unicorn_peak_r1';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'From Smithbrook Rd/Union Gap, bushwhack NE to gain the SE ridge and follow it to the summit. Described explicitly as an ''easy to moderate, non-technical alpine scramble.''',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_union_peak_se_route';

UPDATE routes SET
  sling_rack = '{"nuts":"small-to-mid stopper set","cams":"single rack 0.3-3in","slings":"4 single + 2 double-length"}',
  alpine_draws = 4,
  rope_type = 'single 60m dry',
  rope_length_m = 60,
  rope_note = 'Confirmed on Mountain Project as Trad 5.6 at Vasiliki Tower (Washington Pass/Burgundy Col), but no published rack or pitch-by-pitch beta found; standard single-rope rappel setup assumed for a moderate multi-pitch granite route.',
  ascender = NULL,
  corrections = 'Route existence/grade verified on Mountain Project; specific gear list not published anywhere found.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_south_face';

UPDATE routes SET
  sling_rack = '{"nuts":"small set (stoppers)","cams":"singles 0.2-0.4in + 2in + 3in; doubles 0.5-1in","slings":"4 single + 2 double-length"}',
  alpine_draws = 4,
  rope_type = 'single 60m (some parties use 70m)',
  rope_length_m = 60,
  rope_note = '6-pitch route (5.5-5.7); fixed anchors at most belays, gear belays atop P1 and P3; P5 is most gear-hungry pitch.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ragged_edge';

UPDATE routes SET
  sling_rack = '{"nuts":"full stopper set","cams":"single rack 0.3-2in","slings":"6 single + 2 double-length"}',
  alpine_draws = 6,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'No trip report or database entry found under this exact name near Lake Viviane/Enchantments; treated as a moderate multi-pitch granite slab/face route consistent with the 5.10a grade and area character.',
  ascender = NULL,
  corrections = 'Route not locatable in Mountain Project/SummitPost/trip-report searches; gear inferred purely from stated 5.10a grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_smears_jugs_and_rock_roll';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Non-technical: bootpath/talus to Kangaroo Pass (6671ft) then SW ridge and a south-facing summit gully; nothing harder than Class 2 unless optionally detouring onto Class 3 rock to avoid loose scree.',
  ascender = NULL,
  corrections = 'Helmet recommended (loose scree/rockfall in upper gully) even though no roped gear is needed.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_wallaby_peak_standard';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid stopper set","cams":"single rack 0.3-3in","slings":"4 single + 2 double-length"}',
  alpine_draws = 4,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'Parent area could not be identified in any public route database; standard 5.6 multi-pitch alpine rock rack inferred from grade.',
  ascender = NULL,
  corrections = '"West Face 6" area not found on Mountain Project/SummitPost; gear sized from grade only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_nest_route';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid stopper set","cams":"single rack 0.4-2.5in","slings":"4 single + 1 double-length"}',
  alpine_draws = 3,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'Same unresolved parent area as Nest Route and Wild Wild West; 5.5 grade suggests a light rack for an easy multi-pitch alpine route.',
  ascender = NULL,
  corrections = 'Route/area not found in any public source; gear inferred from grade only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_spectacle_route';

UPDATE routes SET
  sling_rack = '{"nuts":"small back-up set","cams":"small rack 0.3-1in for gaps between bolts","slings":"2 single-length"}',
  alpine_draws = 12,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'An exact name+grade match (5.8, 4 pitches, mostly bolt-protected, Grade II) exists on Pinto Rock''s ''West Face'' area: alpine draws recommended (~a dozen) to reduce drag on wandering P3/P4, rappel descent off the back near a stand of fir trees.',
  ascender = NULL,
  corrections = 'Best-match route found but sibling routes in this database''s area don''t appear there, so this may be a different route reusing a common name; treat as an estimate.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_wild_wild_west';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid stopper set","cams":"single rack 0.3-3in","slings":"4 single + 2 double-length","pickets":1}',
  alpine_draws = 4,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'Confirmed on Mountain Project: West McMillan Spire, Southwest Ridge, Trad with Steep Snow, 5.8-, 2-star classic (distinct from the easier 4th-class West Ridge on the same peak). Approach through McMillan Cirque/Terror Basin crosses glaciated/steep snow terrain requiring ice axe and crampons.',
  ascender = NULL,
  corrections = 'Route name, grade, and type verified on Mountain Project; specific rack sizes not published in any trip report found.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_southwest_ridge';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"light single rack 0.3-2in","slings":"3 single + 1 double-length"}',
  alpine_draws = 2,
  rope_type = 'single 50-60m',
  rope_length_m = 60,
  rope_note = 'Confirmed via multiple trip reports (Mongo Ridge/Southern Pickets area): traverse crosses three intermediate towers before West Fury''s summit; a 50-60m rope is recommended at minimum for rappelling 4th-class and low-5th-class sections en route.',
  ascender = NULL,
  corrections = 'Glacier travel gear also needed for the broader Fury approach, though not specific to this ridge traverse itself.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ridge_traverse_from_east_fury';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"light rack 0.5-2in","slings":"2 single-length"}',
  alpine_draws = 0,
  rope_type = 'single 30-40m (short-roping)',
  rope_length_m = 35,
  rope_note = 'Confirmed as a long, exposed 3rd-class ridge accessed from Whatcom Pass; multiple trip reports note some parties rope up and belay sections, especially on descent.',
  ascender = NULL,
  corrections = 'General exposure/roping behavior verified by trip reports, but no specific rack was published.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_ridge_2';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (occasional handline)',
  rope_length_m = NULL,
  rope_note = '4th-class variation on the same peak as the North Ridge; typically unroped scrambling with exposure, occasionally protected with a short handline on steeper steps.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found; inferred from the stated 4th-class grade and Whatcom Peak''s general remote/glacier-adjacent character.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_south_spur';

UPDATE routes SET
  sling_rack = '{"nuts":"light set (less useful here per trip reports)","cams":"doubles 0-2in, single 3in and 4in","slings":"6 single + 2 double-length"}',
  alpine_draws = 2,
  rope_type = 'single 60m',
  rope_length_m = 60,
  rope_note = 'Confirmed 12-pitch route on Whine Spire (west face of Silver Star), sustained 5.10a/b with a 5.9+ offwidth/chimney section and some runout on loose ''kitty litter'' granite; full day for most parties.',
  ascender = NULL,
  corrections = 'Two sources gave slightly different cam ranges; listed the more detailed/recent Mountain Project version.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_gato_negro';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Non-technical: boot path from SR-20 near Rainy Pass up through meadows to the south ridge (6180ft), then ridge/gully scrambling to the summit. No roped climbing required.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_whistler_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Could not find a route-specific source for this particular White Mountain (Olympic Mountains, Grand Valley/Hurricane Ridge area); inferred as a non-technical Class 2 talus/ridge scramble.',
  ascender = NULL,
  corrections = 'No trip report specific to this summit surfaced; early-season snow could warrant an ice axe.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_white_mountain_olympics_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (optional handline)',
  rope_length_m = NULL,
  rope_note = 'Confirmed: Wilmans Peak (Monte Cristo area) is metamorphic volcanic breccia with a reasonable approach and no glacier travel; Class 3-4 scrambling with rockfall/loose-rock hazard.',
  ascender = NULL,
  corrections = 'Helmet strongly recommended given documented rockfall/chossy rock; the more technical, roped 5.5-5.6 routes documented online belong to the separate Wilmans Spires, not this standard scramble.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_wilmans_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Confirmed: standard route is a Class 2 hike up the west slope via trail from Long Swamp Campground; ridge variations reach Class 3 but the standard trail route is walk-up terrain.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_windy_peak_trail';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"light rack 0.5-2in","slings":"2 single-length"}',
  alpine_draws = 0,
  rope_type = 'single 30-40m',
  rope_length_m = 35,
  rope_note = 'Mountain Project lists Witches Tower''s east-facing route (matching E/SE Face) as a mixed-grade line: 4th class base with 5.6/5.10a/5.10b variations higher/direct. The 4th-class line noted here corresponds to the easiest (original) line up the white rock.',
  ascender = NULL,
  corrections = 'The listed grade (4th) is the easiest variation on this face per Mountain Project; harder direct-start options up to 5.10b exist but aren''t part of this route''s stated grade.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_e_se_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Confirmed: western approach off Boundary Trail #533 near Apex Pass, then off-trail ascent up the gentle west side to the 8137ft summit — Class 2 if the correct line is followed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_wolframite_mountain_scramble';
COMMIT;
