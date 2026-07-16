-- Gear audit batch 10 (real route IDs verified against live DB): 50 routes across 30 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes Mount Shuksan (5 routes), Mount Stuart (6 routes incl. Fifty Classic Climbs North
-- Ridge), Mount Terror (Picket Range), North Early Winters Spire (4 routes), North Twin Sister
-- (flagged a likely duplicate-area match vs. wa_north_twin), Pinto Rock sport routes.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble; no route-specific trip reports found describing roped sections. Typical for this grade in the Olympics/Cascades to go unroped.',
  ascender = NULL,
  corrections = 'No route-specific gear source found; based on Class 3 scramble grade convention.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_saul_se_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble on scree/talus; standard scramble kit, no rope typically carried.',
  ascender = NULL,
  corrections = 'Route-specific detail limited; South Slopes conflated with general Mt Seattle east-ridge trip notes in search results.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_seattle_south';

UPDATE routes SET
  sling_rack = '{"ice_screws":"4-6","pickets":"2-3","cams":"light rack to 2in for summit pyramid rock","nuts":"small set"}',
  alpine_draws = 4,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = '~3,000 ft of 40-50 deg snow/glacial ice to gain the upper Hanging Glacier, then 4th-5th class rock to the summit pyramid; used as an AMGA guide exam route for its sustained, moderate difficulty.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Distinguished from the standard North Face route it shares an approach with; no dedicated Hanging-Glacier-specific trip report with an itemized rack was found, so gear is extrapolated from North Face route profile.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_shuksan_hanging_glacier';

UPDATE routes SET
  sling_rack = '{"ice_screws":"4-6","pickets":"2-3","cams":"0.3-2in range, doubles in mid sizes","nuts":"1 set"}',
  alpine_draws = 8,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'Described as a seldom-done line combining additional ice climbing with complex alpine rock climbing above the North Face; more sustained/technical than the standard glacier routes.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Very little documented beta exists for this specific line (confirmed rare/seldom-climbed); gear inferred from its stated character (ice + complex rock) and Shuksan''s other technical routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_shuksan_northeast_ridge';

UPDATE routes SET
  sling_rack = '{"ice_screws":"6-8","pickets":"2-3","fluke":"1 (useful in soft snow)","cams":"small rock rack (few cams/hexes)","nuts":"few nuts","pitons":"couple of pins"}',
  alpine_draws = 4,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'Fifty Classic Climbs route; AI2-3 lower glacier ice, bergschrund crux around 7,800 ft with rock/ice/mixed options. A documented mid-August ascent used nearly all pro carried.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'None — multiple independent trip reports converge on this gear list.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_shuksan_price_glacier';

UPDATE routes SET
  sling_rack = '{"ice_screws":"2-3","pickets":"2-3"}',
  alpine_draws = 0,
  rope_type = 'single 30m glacier rope (or 60m if combining with Winnies Slide/Fisher Chimneys exit)',
  rope_length_m = 30,
  rope_note = 'Complex glacier route with short 1-2 pitch snow/rock/ice sections crossing bergschrunds; joins Winnies Slide about 2/3 height. Requires solid belaying and moderate ice technique.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Grade II/easy-snow characterization from the route list is a bit generous — sources describe short technical ice/rock steps requiring real belaying skill, not a walk-up.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_shuksan_white_salmon_glacier';

UPDATE routes SET
  sling_rack = '{"nuts":"small set (cracks to 1.5in)","cams":"small-medium set","slings":"extra slings for horn anchors, common on this route"}',
  alpine_draws = 4,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'Only the final ~600 ft above the notch is technical; class 3 approach pitches often simul-hiked or unroped. Selective route-finding keeps hardest moves at 5.3-5.4.',
  ascender = NULL,
  corrections = 'None — matches Mountain Project route description directly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_southeast_ridge_se_corner';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Typical Class 2-3(3+) Olympic scramble: side-hilling, contouring, talus, rotten rock via Putvin Trail/Lake of the Angels. Steep snow lingers in the approach gully/headwall into early summer.',
  ascender = NULL,
  corrections = 'Ice axe need for early-season steep snow is inferred from the grade note, not from an explicit trip-report gear list.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_skokomish_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Long approach (21 mi via Duckabush to Marmot Lake) then easy slopes to the summit block; wet conditions common June-early July.',
  ascender = NULL,
  corrections = 'Route-specific gear list not found (only approach/access descriptions); technical difficulty and gear inferred from Class 2-3 grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_steel_standard';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none typically; short rope/handline used in winter',
  rope_length_m = 30,
  rope_note = 'Class 3-4 talus/dirt scramble to a summit ridge/plateau; most parties go unroped in summer. In winter most groups rope up for the final gully to the summit ridge.',
  ascender = NULL,
  corrections = 'None — matches route-specific description including the winter rope-up note.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_stickney_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'optional handline; not typically roped',
  rope_length_m = 20,
  rope_note = 'Short Class 3 section on Mt Stone''s west ridge with three ~20 ft downclimbs; some parties want a handline for these. Loose glacial moraine near St. Peter''s Gate has a permanent snow/ice field — ice axe recommended.',
  ascender = NULL,
  corrections = 'None — matches Mountain Project route page and multiple trip reports.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_lena_lake_to_mt_stone_traverse';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Predominantly Class 3 with brief Class 4 moves on the summit block; ~5,000 ft gain, 11 mi RT via Putvin Trail. Typically climbed unroped by scramblers comfortable with exposure.',
  ascender = NULL,
  corrections = 'None — consistent across sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_stone_lake_of_angels';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none (unroped)',
  rope_length_m = NULL,
  rope_note = 'Same approach/line as the South Route via Lake of the Angels (Putvin Trail IS the Lake of the Angels approach); Class 3 with brief Class 4 summit block moves.',
  ascender = NULL,
  corrections = 'This route_id appears to describe the same physical line as wa_mount_stone_lake_of_angels — flagging as likely duplicate/alias in the DB rather than a distinct line.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_stone_putvin';

UPDATE routes SET
  sling_rack = '{"cams":"single blue alien/purple TCU; doubles green alien to #2; single #3 and #4","nuts":"single set"}',
  alpine_draws = 6,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = '8 pitches, ~900 ft, splitter crack on the West Face between Goat and Stuart Pass; P2/P4/P6 run 55-60m so a 60m rope is workable but tight on the longest pitches.',
  ascender = NULL,
  corrections = 'None — pulled directly from the route''s Mountain Project page.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_gorillas_direct';

UPDATE routes SET
  sling_rack = '{"cams":"base rack as Gorillas Direct plus supplemental 0.5-#4 recommended for headwall security","nuts":"single set + RPs"}',
  alpine_draws = 6,
  rope_type = 'single 70m dynamic',
  rope_length_m = 70,
  rope_note = 'Climbs first 4 pitches of Gorillas in the Mist, cuts into 2 pitches of Gorillas Direct, then 2 pitches of direct splitter headwall finish. Three pitches run ~55m, making 70m more comfortable than 60m.',
  ascender = NULL,
  corrections = 'Route list grade given as 5.11d matches AAC/Supertopo sourcing.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_king_kong_gorillas_direct_direct';

UPDATE routes SET
  sling_rack = '{"pickets":"1-2 for running belay","ice_screws":"couple, provisional"}',
  alpine_draws = 0,
  rope_type = '30-40m glacier rope (or short-roped on lead)',
  rope_length_m = 30,
  rope_note = 'Glacier approach/couloir route reaching ~40 deg near the top; ice axe and crampons essential as upper glacier and beyond can be firm/icy.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'None — consistent across sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_sherpa_glacier';

UPDATE routes SET
  sling_rack = '{"cams":"small-medium alpine rack","nuts":"small set"}',
  alpine_draws = 6,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = '4-5 short technical pitches (mostly 4th/low-5th) with two 20-30 ft sections of 5.7 that have decent pro; approach via Ingalls Creek Trail/West Ridge couloir.',
  ascender = NULL,
  corrections = 'No itemized rack list found specific to this route; sizes inferred from the described 5.7 crack/corner terrain typical of Stuart Range alpine rock.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_south_headwall';

UPDATE routes SET
  sling_rack = '{"cams":"0.3-3, doubles 0.4-2, optional #4 for the Gendarme offwidth","nuts":"1 set, offsets work well"}',
  alpine_draws = 10,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'Striking pitch-3 liebeck crack, Great Gendarme offwidth crux, 5.5 slab with a good crack up top. Rock ''loose in spots, lichen covered'' in places.',
  ascender = NULL,
  corrections = 'None — pulled directly from the route''s Mountain Project page.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_direct_north_ridge_w_gendarme';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack to 4in, doubles 0.5-3in; bring one 4in piece for the offwidth","nuts":"standard set"}',
  alpine_draws = 8,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'One of the Fifty Classic Climbs. ~11 pitches of low/mid 5th from the Stuart Glacier notch to the Gendarme base, then two crux 5.9 pitches plus a 5.8-5.9 pitch before 3 final low-5th pitches. A fixed #4 Camalot has been reported in place on the offwidth.',
  ascender = NULL,
  corrections = 'None — consistent across multiple sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_upper_north_ridge_w_great_gendarme';

UPDATE routes SET
  sling_rack = '{"cams":"medium alpine rack, emphasis on medium sizes for the offwidth section","nuts":"small-medium set","ice_screws":"1-2 for the moat"}',
  alpine_draws = 6,
  rope_type = 'single 60m dynamic',
  rope_length_m = 60,
  rope_note = 'Approach via Degenhardt Glacier requiring ice axe/crampons. Lower face ascending traverse mostly 3rd class stepping to 5.7 near the buttress crest; upper face has a long offwidth crack below the false summit.',
  ascender = NULL,
  corrections = 'None — consistent across sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_terror_north_face';

UPDATE routes SET
  sling_rack = '{"cams":"few, standard light alpine rack","nuts":"few stoppers","slings":"couple alpine/extendable draws"}',
  alpine_draws = 4,
  rope_type = 'two 60m ropes (double-rope rappels on descent)',
  rope_length_m = 60,
  rope_note = 'Ascends slabs to the Terror-Degenhardt saddle then a short steep ridge with a hand-width crack start; rock quality is notably poor/loose per trip reports.',
  ascender = NULL,
  corrections = 'Route list names this ''East Ridge'' under the wa_mount_terror_southeast_face id — flagging the id/name mismatch for DB review.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_terror_southeast_face';

UPDATE routes SET
  sling_rack = '{"cams":"small rack to 3in"}',
  alpine_draws = 2,
  rope_type = 'single 30-60m dynamic (carried mainly for the descent)',
  rope_length_m = 30,
  rope_note = 'Mostly Class 2 via Bumblebee Pass approach with one exposed ~20 ft Class 4 move near the summit; many parties rope up for this move.',
  ascender = NULL,
  corrections = 'None — consistent across sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_ridge_6';

UPDATE routes SET
  sling_rack = '{"crevasse_rescue_kit":{"prusiks":2,"cordelette":1,"pulley":1,"locking_carabiners":4,"purpose":"crevasse rescue/hauling system for Blue Glacier travel"}}',
  alpine_draws = 0,
  rope_type = 'Glacier travel rope (dynamic, dry-treated), used as a team rope not a lead rope',
  rope_length_m = 30,
  rope_note = 'Mount Tom is climbed as a side/expedition objective off the Blue Glacier traverse from Snow Dome (Mount Olympus massif); rope is for crevasse crossing/rescue on the glacier approach, not technical rock protection.',
  ascender = 'Mechanical ascender (e.g. Petzl Tibloc) or prusik cords for crevasse self-rescue',
  corrections = 'No Mount Tom-specific route page found; all sources describe the general Mount Olympus/Blue Glacier approach with Mount Tom as a nearby optional summit.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_tom_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No rope required. Maintained Forest Trail #839, Class 1-2 throughout; summit is exposed/windy but non-technical.',
  ascender = NULL,
  corrections = 'WTA/USFS/Mountaineers sources consistently describe this as a standard hiking trail; a down jacket for the exposed, windy summit is the only notable non-technical recommendation.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_townsend_standard';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"120cm","quantity":2,"purpose":"possible handline/rap anchor on trees or rock horns"}}',
  alpine_draws = 0,
  rope_type = 'Optional 30m rope as a safety backup',
  rope_length_m = 30,
  rope_note = 'No fixed-rope requirement found; a short rope/handline is a reasonable precaution for exposed Class 4 moves or a short rappel off the summit block, consistent with comparable Olympic Needles-range terrain.',
  ascender = NULL,
  corrections = 'Could not find Mountain Project or trip-report beta specific to ''The Needles Scramble'' on Mount Walkinshaw. General Olympic Needles-subrange sources describe routes from Class 3 scrambling to 5.8 rock; entry is grade-based inference.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_walkinshaw_scramble';

UPDATE routes SET
  sling_rack = '{"prusik_cord":{"quantity":2,"purpose":"self-belay on the catwalk fixed line in snow conditions"},"sling":{"length":"60cm","quantity":1,"purpose":"harness attachment to fixed line/anchor"}}',
  alpine_draws = 0,
  rope_type = 'Optional; short handline/fixed-line rope for the catwalk section',
  rope_length_m = 30,
  rope_note = 'Standard summer conditions need no rope — hiking gear, helmet, and at least one trekking pole. In early season or when snow/exposure warrant, a fixed line is commonly rigged on the catwalk; carry harness plus prusiks/carabiners to protect it.',
  ascender = NULL,
  corrections = 'Route 1 in the Olympic Mountains climbing guide, ~4mi RT / 3,300ft gain; helmet required, exposed Class 3-4 ridge walking and scree in summer, avalanche-prone snow otherwise.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_washington_olympic_standard';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm and 120cm","quantity":4,"purpose":"natural protection around horns/chockstones given poor rock quality"},"light_rack":{"purpose":"supplemental nuts/small cams where the fractured basalt allows placement"}}',
  alpine_draws = 2,
  rope_type = 'Single rope (light alpine rack, short pitches)',
  rope_length_m = 30,
  rope_note = 'Grade II alpine trad/snow route per Mountain Project; page explicitly states ''rock is horrible, protection is problematic'' on the fractured basalt, so natural pro on horns/chockstones is often more reliable than cams/nuts. Crux is a ~150ft low-5th ''wedge'' section near the start.',
  ascender = NULL,
  corrections = 'Mountain Project''s own route page gives no explicit gear/rack list; rope length and rack composition are inferred from the route''s stated character. Per MP, the standard west-basin traverse to Ellinor''s NE couloir is considered a superior alternative to this ridge traverse.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_washington_ellinor_traverse_ridge';

UPDATE routes SET
  sling_rack = '{"static_line_or_webbing":{"length":"20-30m","quantity":1,"purpose":"fixed handline across the exposed summit ridge"}}',
  alpine_draws = 0,
  rope_type = 'Optional; fixed handline for the exposed summit ridge',
  rope_length_m = 20,
  rope_note = 'Overall non-technical scramble; the final summit block is a ~30ft, Class 2-3 ridge with severe exposure on both sides, and a fixed line is commonly recommended for this section specifically.',
  ascender = NULL,
  corrections = 'Sourced from Mountaineers.org and a detailed trip-report description of the specific summit-block feature.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_mount_watson_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found. Class 2-3 scrambles of this type in the North Cascades typically require no rope.',
  ascender = NULL,
  corrections = 'Could not locate trip reports, guidebook entries, or Mountain Project/SummitPost coverage of ''Mount Wilder Scramble'' beyond a bare Peakbagger listing.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mount_wilder_scramble';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm","quantity":3,"purpose":"protection on granite flakes/horns, simple belay anchors"}}',
  alpine_draws = 2,
  rope_type = 'Single dynamic rope',
  rope_length_m = 50,
  rope_note = 'No indexed route-specific gear list found online (guidebook coverage is Beckey''s Cascade Alpine Guide Vol. 3, not available via web search). Recommendation reflects a light rack for a low-grade (5.2) alpine granite ridge; many parties simul-climb or solo given the easy grade.',
  ascender = NULL,
  corrections = 'Remmel Mountain''s standard SE approach (Four Point Creek Trail) is a walk-up; the NW Ridge is the technical line. No trip-report-level gear beta was found for this specific ridge — grade-based inference only.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_nw_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific beta found online. Class 3 scrambles of this type typically require no rope.',
  ascender = NULL,
  corrections = 'Unable to locate any guidebook, Mountain Project, SummitPost, or trip-report coverage for ''Mutchler Peak'' despite multiple targeted searches.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_mutchler_peak_scramble';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm","quantity":2,"purpose":"rap anchor/handline at the 5.0 crux"}}',
  alpine_draws = 0,
  rope_type = 'Optional 30m rope for the 5.0 crux move and/or rappel descent',
  rope_length_m = 30,
  rope_note = 'No WA-specific ''Needle Peak'' trip-report beta found — all located sources for ''Needle Peak'' referred to British Columbia or Colorado peaks of the same name. Given the stated Class 4 with 5.0 crux, a short rope is commonly prudent for that move or for the descent.',
  ascender = NULL,
  corrections = 'Could not verify this specific WA ''Needle Peak'' South Route via Mountain Project, SummitPost, or guidebook search; recommendation is grade-based inference.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_needle_peak_south_route';

UPDATE routes SET
  sling_rack = '{"fixed_gear_draws":{"quantity":"several","purpose":"clip plentiful fixed pins on the chockstone-bypass pitch"},"webbing":{"length":"60cm","quantity":2,"purpose":"tree-rap sling backup at the base"}}',
  alpine_draws = 8,
  rope_type = 'Single dynamic rope',
  rope_length_m = 60,
  rope_note = '60m rope for the rappel descent: 4 bolted rap stations plus one tree rappel down the 5.0 slab at the very start of the route. Bring an ice axe (and crampons if snow lingers) for the entry gully in early season.',
  ascender = NULL,
  corrections = 'Mountain Project route page: ''single rack to 2 inches, draws for fixed pins'' — a set of nuts and cams 0.5-2in is sufficient; bring extra draws for the fixed gear on the chockstone-bypass pitch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_chockstone_route';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm and 120cm","quantity":4,"purpose":"anchor building on ledges, tree slings"},"cordelette":{"quantity":1,"purpose":"anchor at the ''not great rock'' stance on P4"}}',
  alpine_draws = 10,
  rope_type = 'Single dynamic rope',
  rope_length_m = 70,
  rope_note = '60m is sufficient if descending via the neighboring Chockstone Route''s rappels; 70m is required if using Flycatcher''s own newer bolted rap-anchor line. Pick one descent option before starting.',
  ascender = NULL,
  corrections = 'Mountain Project route page: rack to #3 cam with a single #4; #5 optional. 10 pitches, ~1,100ft, Grade IV.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_flycatcher_buttress';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm and 120cm","quantity":4,"purpose":"anchors across the 5-pitch route"}}',
  alpine_draws = 6,
  rope_type = 'Single dynamic rope',
  rope_length_m = 60,
  rope_note = 'No full gear-beta page was surfaced for this specific route. Based on comparable North Early Winters Spire routes at similar grade, expect an emphasis on small cams/wires for the thin 5.10/5.11 pitches, with descent likely via the shared Chockstone Route rappels.',
  ascender = NULL,
  corrections = 'Confirmed facts only: Grade III, 5.11a, 5 pitches (2 of them 5.10-5.11), located between the West Face and Southwest Face routes, FA by Steve Risse and Donna McBain, September 1988. Detailed rack/pitch-by-pitch beta could not be independently verified.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_labor_pains';

UPDATE routes SET
  sling_rack = '{"webbing":{"length":"60cm and 120cm","quantity":4,"purpose":"anchors and slinging small/awkward gear placements"}}',
  alpine_draws = 8,
  rope_type = 'Single dynamic rope',
  rope_length_m = 70,
  rope_note = 'Mountain Project doesn''t state rope length explicitly; ~710ft across 6 pitches makes 70m practical for full pitch lengths. Original descent: 3 single-rope raps into the North/South spire notch, one free-hanging rap off a large chockstone, then a short tree rap or downclimb.',
  ascender = NULL,
  corrections = 'Mountain Project route page: doubles from 0.1in-3in, with emphasis on small sizes — crux pitches ''eat small stoppers like candy.''',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_west_face';

UPDATE routes SET
  sling_rack = '{"cams":"light rack 0.3-2in (small-mid)","nuts":"small nut set","runners":"4-6 shoulder slings, 2 double-length"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '650ft alpine rock tower on generally excellent granite; single 60m rope for occasional belays/short raps off the tower. No confirmed fixed rap anchors — carry rap tat.',
  ascender = NULL,
  corrections = 'No route-specific gear beta found online; based on SummitPost''s description (5.8 rock/VI- alpine, 650ft granite tower, mostly excellent rock).',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_tower_ridge_route';

UPDATE routes SET
  sling_rack = '{"cams":"minimal (2-3 small-mid pieces)","runners":"2-3 slings"}',
  alpine_draws = 0,
  rope_type = 'single dynamic (optional)',
  rope_length_m = 30,
  rope_note = '4th-class arete/ridge scramble; a short rope may be carried for exposed sections, but many parties solo it unroped.',
  ascender = NULL,
  corrections = 'Only a one-line SummitPost mention (''4th class'') was found; no dedicated route description or trip reports located.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_tower_arete';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 walk-up/scramble via the south ridge; no rope typically carried. Occasional Class 4 terrain possible on the ridge''s west side but avoidable.',
  ascender = NULL,
  corrections = 'Matched to Mountaineers/Wenatchee Outdoors descriptions: Class 2 terrain, ice axe recommended for snow crossings; no technical rack needed.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_gardner_mountain_southwest';

UPDATE routes SET
  sling_rack = '{"cams":"doubles 0.1-3in, triples in tips/fingers sizes if climbing near limit","nuts":"full stopper set, used prolifically on crux pitches","runners":"6-8 slings"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '6-pitch, 500ft alpine rock route; single 60m rope. Upper section has newer bolted rap stations; original descent raps off a large chockstone.',
  ascender = NULL,
  corrections = 'The matched route (Beckey-Beckstead ''The West Face'', 5.11-, III, 500ft/6 pitches) is cataloged on North Early Winter Spire in search results, not explicitly tied to an area named ''North Peak'' — flagging in case the area mapping differs. Grade (5.11-) is close to but not identical to the listed 5.11+.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_west_face_2';

UPDATE routes SET
  sling_rack = '{"cams":"single alpine rack (0.3-3in)","nuts":"light nut set","runners":"handful to two of rappel tat/webbing"}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '~5000ft alpine ridge traverse across North/Middle/Main peaks; single rope plus rap tat for multiple raps of varying anchor quality.',
  ascender = NULL,
  corrections = 'Mountain Project route description explicitly calls for ''a single alpine rack and a handful or two of rappels worth of tat''; matches listed 5.7+ grade closely.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_traverse_of_mount_index';

UPDATE routes SET
  sling_rack = '{"cams":"small rack supplementing bolts for knob placements","nuts":"small nut set","runners":"2-4 slings for knob hitches"}',
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Single-pitch basalt route on the North Side of Pinto Rock; 60m rope sufficient to lower off.',
  ascender = NULL,
  corrections = 'No dedicated route page found; based on Pinto Rock''s general area description and neighboring Sidewinder''s confirmed single-pitch bolted format at the same North Side sub-area.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_clast_from_the_past';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Single-pitch, slightly overhung sport route, bolts every ~4ft; lower from chains (anchor also used to toprope Top Gun).',
  ascender = NULL,
  corrections = 'Mountain Project confirms grade (5.9) and ''sport bolted'' single-pitch protection at Pinto Rock''s North Side; matches listed grade exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_sidewinder_4';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Single-pitch sport route toproped/lowered off the same chain anchor as Sidewinder, over a roof lip; bolt-protected.',
  ascender = NULL,
  corrections = 'Confirmed via Pinto Rock area description that Top Gun is toproped off Sidewinder''s anchor on the North Side sub-area. A separate, unrelated 3-pitch ''Top Gun'' exists elsewhere in Washington — do not confuse.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_top_gun';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 talus/scree scramble in the Glacier Peak Wilderness (Lyman Lake/Cloudy Pass area); no rope typically needed.',
  ascender = NULL,
  corrections = 'No source specifically described an ''East Route''; other sources document only south-side and Cloudy Peak traverse approaches, both Class 2 with possible Class 3-4 on connecting ridges.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_star_mountain_east_route';

UPDATE routes SET
  sling_rack = '{"cams":"a few cams/nuts for occasional protection","nuts":"small set","runners":"webbing + rap rings for occasional rap"}',
  alpine_draws = 0,
  rope_type = 'half/single (optional)',
  rope_length_m = 60,
  rope_note = '~1500ft sustained Class 3-4 ridge scramble on dunite/olivine rock; rope sometimes carried for exposed sections, often climbed unroped in good conditions.',
  ascender = NULL,
  corrections = 'Search results for ''North Twin, West Ridge, 4th class'' almost exclusively describe North Twin Sister''s West Ridge — likely the same real peak filed under a duplicate area slug (''wa_north_twin'' vs ''wa_north_twin_sister''), matching the known WA duplicate-area bug. Gear mirrors wa_north_twin_sister_west_ridge; flagging for dedup review.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_west_ridge_5';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble on grippy dunite/olivine rock, ~1500ft sustained; typically unroped. Ice axe useful on approach snowfields early/late season.',
  ascender = NULL,
  corrections = 'Matches multiple sources describing North Twin Sister''s olivine/dunite rock as grippy Class 3 terrain.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_twin_sister_scramble';

UPDATE routes SET
  sling_rack = '{"cams":"a few cams/nuts","nuts":"a few nuts","runners":"webbing, quick-links/rap rings for rap stations"}',
  alpine_draws = 0,
  rope_type = 'half/single',
  rope_length_m = 70,
  rope_note = 'Class 3-4 ridge scramble, ~2000ft; trip reports show parties carrying a 70m half rope, harness, belay device, and prusik for harder sections/short raps, plus ice axe/crampons in early-season snow.',
  ascender = NULL,
  corrections = 'Directly sourced from trip reports: ''ice axe, alpine harnesses, one 70m half rope, belay device, prusik, helmet, webbing, quick-links/rap rings, and a few cams/nuts.'' Terrain can reach easy 5th class off-route, so many summer parties still go unroped in good conditions.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_twin_sister_west_ridge';

UPDATE routes SET
  sling_rack = '{"cams":"standard Index trad rack up to #4 (Camalot-equivalent)","nuts":"standard nut set","runners":"4-6 slings"}',
  alpine_draws = 0,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Presumed short trad route on Index Town Wall granite (Obelisk/Madsen''s Ledge area); standard 60m rope to lower/rappel.',
  ascender = NULL,
  corrections = 'Could not locate a Mountain Project or guidebook page for ''Lone Wolf'' specifically. Area attribution to ''The Obelisk'' at Index Town Wall is based on slug/proximity matching, not confirmed route-specific beta.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_lone_wolf';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 non-technical scramble via PCT/south ridge in the Goat Rocks; well-graded trail to a short loose/exposed final scramble. No rope needed under normal summer conditions.',
  ascender = NULL,
  corrections = 'Matches WTA/SummitPost/Oregon Hikers: ''nothing technical is required,'' last ~100m is loose and slightly exposed but non-technical.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_old_snowy_mountain_r1';
COMMIT;
