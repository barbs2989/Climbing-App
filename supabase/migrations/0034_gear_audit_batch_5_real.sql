-- Gear audit batch 5 (CORRECTED — real route IDs verified against live DB): 50 routes across 35 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Research methodology: direct WebSearch/WebFetch against Mountain Project, SummitPost, WTA, AAC,
-- Mountaineers, and trip-report sources. confidence field distinguishes "verified" (real trip-report/
-- route-page data found) from "inferred" (no route-specific source found; gear derived from grade/terrain).
--
-- NOTE: requires migration 0028 (structured_rack_fields) to be applied first.
-- This worktree has no SUPABASE_SERVICE_ROLE_KEY — this file must be applied by hand,
-- either via `supabase db push` / psql with the service role, or pasted directly into
-- the Supabase SQL editor.

BEGIN;

ALTER TABLE routes ADD COLUMN IF NOT EXISTS gear_confidence text;

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Unroped Class 2-3 scramble on established boot path/scree to a saddle then along the ridge crest; steep snow or loose rock possible early season, carry an ice axe if snow persists, but no rope or rack needed for the ridge itself.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_abernathy_peak_north_ridge';

UPDATE routes SET
  sling_rack = '{"nuts":"small set (light rack)","cams":"0.3-2 in","slings":3}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Steep snow couloir approach leads to a short roped 5.6 chimney crux pitch and a final 100 ft scramble to the summit; rope and light rack carried for the technical pitch.',
  ascender = NULL,
  corrections = 'Trip-report beta describes a 5.6 chimney crux requiring rope/rock gear plus an ice-axe snow couloir approach — meaningfully harder than the ''Class 3-4'' grade listed for this route.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_agnes_mountain_west_route';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"0.3-2 in","slings":2}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Mostly 4th-class ridge scrambling (3-4 pitches) to the base of a summit tower, then a short 5.5 step and a single ~40 ft rappel to descend; 60m single rope covers the rappel and short pitch.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_ridge_7';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.3-3 in, single set","slings":4}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Standard multi-pitch 5.6 alpine granite route in Boston Basin; well-protected cracks/corners take a light alpine rack.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_south_ridge_6';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'glacier rope',
  rope_length_m = 30,
  rope_note = 'Week-long glaciated traverse crossing 5+ glaciers between Cascade Pass and Dome Peak; each rope team carries a thin 30m glacier-travel rope, crevasse-rescue rack (pickets, prusiks, pulley), plus ice axe and crampons — not a rock rack.',
  ascender = '1-2 prusik cords or a mechanical ascender per person recommended for crevasse rescue',
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ptarmigan_traverse';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 scramble along Rampart Ridge from Rachel Lake with one or two easy 2nd-class spots; no rope or rack needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_alta_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Straightforward Class 2 walk-up from Upper Cathedral Lake via scree/grass slopes to the 8,358 ft summit; no technical gear needed. Distinct from the technical rock routes on the same peak''s north wall.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_amphitheater_mountain_west_route';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.3-3 in, single set plus doubles in finger/thin-hand sizes","slings":6}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Sustained 5.11c alpine granite route with a 20-mile approach; standard trad rack with an emphasis on small-to-medium cams for the crux climbing.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_finger_of_fatwa';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.4-4 in, single set including an offwidth/wide piece","slings":5}',
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '4-pitch 5.10b route with a deep chimney (originally aided A1, now free) leading into 5.7+ dihedrals; top two pitches mostly 4th class. Bring wide gear for the chimney.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_middle_finger_buttress_left_side';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.3-3 in, single set","slings":5}',
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '5.9 route climbing thin vertical cracks up a steep slab on the NW side of the buttress; crux on pitch 3. Standard trad rack.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_middle_finger_buttress_right_side';

UPDATE routes SET
  sling_rack = '{"nuts":"small-medium set","cams":"0.3-2 in","slings":3}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 50,
  rope_note = 'Short, lightly-traveled 5.5 alpine rock ridge route on Amphitheatre Mountain''s north wall; light rack sufficient.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_ridge_8';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.4-4 in, single set including hand/offwidth sizes","slings":5}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Classic 4-pitch 5.9 alpine trad route: P1 5.7 triple crack system to a roof, P2 5.8 thin flake/layback corner, P3 5.9 mantle into twin handcrack (crux), P4 5.8 low-angle offwidth corner. Bring gear up to ~4in for the handcrack/offwidth.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_pilgrimage_to_mecca';

UPDATE routes SET
  sling_rack = '{"nuts":"small-medium set","cams":"0.3-3 in","slings":3}',
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 40,
  rope_note = 'Single-pitch 5.9 trad route on Apex Mountain''s remote north face; light rack for one pitch of crack/corner climbing.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_apex_buttress';

UPDATE routes SET
  sling_rack = '{"nuts":"small-medium set","cams":"0.3-2 in","slings":3}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = '~300 ft, 5.6 blocky rock face directly below Argonaut Peak''s summit; watch for loose rock near the base. Light-to-standard trad rack over roughly 3 pitches.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_face_12';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Off-trail talus/forest scramble rated S3/T3 (Class 2-3); often done with snow on the ground — traction (microspikes) and trekking poles useful, no rope needed.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_arrowhead_mountain_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'South Ridge-Southwest Gully scramble: mostly Class 2-3 with one steep, clean Class 4 step midway; most parties climb it unroped, though a short rope/handline can help less-experienced climbers on the Class 4 step. Rock is disintegrating granite — loose in places.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_azurite_peak_southeast';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Standard route is Class 3-4 scrambling with ~5,000 ft cumulative gain; traction devices (microspikes) recommended for steep forest-duff slopes, no rope typically carried.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_bald_eagle_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Unprotected scramble; Mountain Project lists protection as ''None''. Crux is ~8 ft of exposed 5th-class rock with no gear placed by parties climbing it. Ice axe recommended for the snow-holding gully in spring/early summer.',
  ascender = NULL,
  corrections = 'None — brushy, dirty Class 3-4 gully to south (true) summit; not a standalone recommended objective but gear needs confirmed via Mountain Project route page and multiple trip reports.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_baring_mountain_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Mostly trail hiking to Church Lake, then steep off-trail path; only the final ~100m to the summit is scrambling. No rope used in any trip reports found.',
  ascender = NULL,
  corrections = 'None — consistent across WTA, Bivouac, and personal trip-report accounts as an easy Class 2-3 scramble.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_bearpaw_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No route-specific trip reports located for Berdeen Peak itself. Inferred from comparable Pasayten Class 3-4 scrambles (e.g. Big Craggy, Blackcap): standard scramble kit, ice axe for lingering snow, helmet for loose rock on Class 4 sections. No rope typically carried.',
  ascender = NULL,
  corrections = 'Route-specific trip-report data not found despite searching; gear profile inferred from grade/terrain and similar remote Pasayten peaks. Flag for future re-verification if trip reports surface.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_berdeen_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 shoulder scramble; steepens around 7,800 ft with loose scree/talus as crux difficulty, not technical rock. No rope used in trip reports (Mountaineers, WTA, trailcatjim.com).',
  ascender = NULL,
  corrections = 'None — multiple independent trip reports (Mountaineers, WTA, trailcatjim.com, havetent.com) agree: talus/scree scramble, no technical gear, best in early summer before scree fully melts out.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_big_craggy_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'East Ridge from the saddle is mostly Class 2 with one or two Class 3 moves and some exposure on loose rock near the ''black cap'' summit block. Ice axe advisable in early season; no rope/rack needed from Shellrock Pass approach.',
  ascender = NULL,
  corrections = 'None — consistent with SummitPost and Everett Mountaineers scramble committee descriptions.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_blackcap_mountain_scramble';

UPDATE routes SET
  sling_rack = '{"slings":"3-5 alpine/rock slings for anchors on the Class 3-4 rock section","rack":"light rock rack (small-to-mid nuts/cams) — some parties leave the rack behind if downclimbing","pickets":"2 snow pickets for glacier travel and crevasse rescue anchors","cordelette":"1-2 cordelettes for rappel/glacier anchors"}',
  alpine_draws = 4,
  rope_type = 'single glacier rope (dry-treated)',
  rope_length_m = 60,
  rope_note = 'Standard route: glacier travel to steep upper snow finger, then Class 3-4 rock for several rope-lengths to a notch below the summit. Reported setups vary: 2x40m ropes (one for glacier travel, both combined for rappels), a 70m rope, or a single 50-60m rope; skilled parties often downclimb the rock unroped but rappel the descent. Crevasse hazard is real even when the rock is soloed.',
  ascender = '{"type":"prusik cords (2) for crevasse rescue / self-belay on glacier","note":"no mechanical ascender specifically reported; prusiks standard for this glacier route"}',
  corrections = 'None — corroborated across Mountaineers trip reports, SummitPost, ericsbasecamp.net, and Mountain Project route page.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_bonanza_peak_mary_green_glacier';

UPDATE routes SET
  sling_rack = '{"cams":"small-to-medium cams — bring doubles of finger-to-hand sizes; do NOT forget #3/#4","nuts":"full set of nuts/small wires — heavily relied upon along with small cams","notable_piece":"small Alien-style cams reported as most-used protection","footwear_note":"approach shoes for lower pitches, rock shoes for steeper/more delicate upper pitches"}',
  alpine_draws = 12,
  rope_type = 'double rope system (twin 60m ropes)',
  rope_length_m = 60,
  rope_note = '22-pitch route on the North Face/West Buttress of Bonanza''s SW peak. Modern ascent (Steph Abegg party) used two 60m ropes with both followers belayed simultaneously for full 200-ft pitches; two 200-ft (60m) rappels used on descent.',
  ascender = NULL,
  corrections = 'Grade is historically listed as NCCS VI, F10 by the 1975 Soviet first-ascent team but is commonly cited today as V 5.10a (or 5.9 for easier variations) — matches the V, 5.9-5.10a grade given. No ice axe/crampons reported necessary for typical (August) ascents; primarily a rock climb accessed via glacier approach, so glacier gear should still be carried for the approach.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_soviet_route';

UPDATE routes SET
  sling_rack = '{"pickets":"1-2 snow pickets per rope team for the moderate snow pitches","rock_gear":"minimal rack — small cams/nuts for sparse protection on the rock traverse section","slings":"a handful of slings for rock/rappel anchors"}',
  alpine_draws = 3,
  rope_type = 'glacier/rock rope, one per rope team',
  rope_length_m = 30,
  rope_note = 'Committing traverse between the two summits combining moderate snow pitches (pickets + rock gear for pro) with a sparsely-protected rock traverse. Trip reports describe teams of 2-3 using a 30m glacier-style rope with one picket each; some experienced parties climb it as 7 statically-belayed pitches. Best done early season (April-May) before brush fills the approach gullies.',
  ascender = NULL,
  corrections = 'Route is genuinely committing; one veteran party described it as more intense than Liberty Ridge on Rainier — reinforces the ''Easy 5th'' grade undersells real commitment/exposure.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_brothers_traverse';

UPDATE routes SET
  sling_rack = '{"pickets":"1-2 snow pickets useful for handline anchors on the steep snow section","note":"minimal-to-no rock rack — this is a snow couloir climb, not a rock route"}',
  alpine_draws = 0,
  rope_type = 'handline rope (optional, conditions-dependent)',
  rope_length_m = 30,
  rope_note = 'Standard basic climb: steep snow couloir requiring ice axe/crampons in early/winter/late season; can become a snow-free 3rd-class scramble by late August. Trip reports show a rope is sometimes rigged as a handline (with prusiks) on sustained ~30-degree snow above ''The Hourglass'' where moats form on both sides.',
  ascender = '{"type":"prusik cords for handline self-belay","note":"used by at least one documented party when rigging a handline in the couloir"}',
  corrections = 'None — Mountaineers course listings and multiple trip reports agree helmet/crampons/ice axe are the core essentials; rope/pickets are conditionally recommended rather than always mandatory.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_couloir';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble via Hemlock Pass with talus and a rock scramble finish; some exposure and rockfall potential (helmet recommended) but no rope used in trip reports.',
  ascender = NULL,
  corrections = 'None — reconfirmed via SummitPost, Mountaineers, and WTA sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_bryant_peak_southeast_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Described generically as ''Class 3, exposed scrambling — gear and experience recommended.'' Route-specific South Ridge trip reports were sparse; inferred that a rope is not typically carried for the ridge scramble itself given comparable Class 3 Cascades scrambles, though some parties may carry a short rope/sling for exposed moves.',
  ascender = NULL,
  corrections = 'Limited South Ridge-specific source data. Gear profile inferred from the Class 3 rating and regional norms.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_buck_mountain_south_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'From Marmot Pass, a steep but non-exposed open path gains the West Peak summit — explicitly described as an easy Class 2 scramble suitable as a first scramble, no technical gear needed.',
  ascender = NULL,
  corrections = 'None — corroborated by Mountaineers route/activity pages, WTA, and SummitPost as a non-technical talus/scree walk-up.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_buckhorn_marmot_pass';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'No trip reports specifically describing Buckskin Mountain''s Southwest Slopes were found; nearby Buckskin Ridge/Silver Lake and Pasayten Peak scrambles in the same range are non-technical Class 2-3 talus/ridge routes. Inferred no-rope, ice-axe-for-snow profile consistent with the stated Class 2-3 grade.',
  ascender = NULL,
  corrections = 'Route-specific data not found; gear profile inferred from terrain/grade and adjacent Pasayten peaks.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_buckskin_mountain_southwest_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble on solid granite (per AAC North Ridge FA account: 3 leads class 3-4 above a class 5 base section). No rope needed for the standard scramble line; parties climbing the true north ridge crest into 5th class terrain should carry a short rope.',
  ascender = NULL,
  corrections = 'Historic route is documented as the ''North Ridge'' (AAC), not a distinct ''North Route'' name; likely the same line, but naming isn''t matched 1:1 in sources.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_burnt_boot_peak_north_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3 with an exposed, moderately-exposed ledge traverse near the summit. No rope on the standard route in dry conditions; a 30m handline is a reasonable option for less-experienced parties on the exposed ledge.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_cadet_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble via SE/E slopes to a notch below the summit block. No rope needed for the middle-summit walkup; the true south summit register requires 4th/5th class moves where some parties choose a short handline.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_cardinal_peak_se_slopes';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Maintained hiking trail to a ridge walk, Class 1-2. No technical gear required at any point.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_carne_mountain_trail_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2 with easy Class 3 and a few Class 3+ steps on solid granite. No rope on the standard scramble; carry an ice axe if snow patches persist near the 7400'' notch.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_castle_peak_pasayten_scramble';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"double set 0.3-3in (finger-to-hand cracks), single set to #4","notes":"granite alpine rack; carry a few pitons/extra nuts for old fixed gear/thin seams"}',
  alpine_draws = 14,
  rope_type = 'single dynamic, plus a second rope for rappel descent',
  rope_length_m = 60,
  rope_note = 'Remote alpine rock wall. Two 60m ropes recommended for multi-rappel descent given remoteness; single 60m sufficient for leading.',
  ascender = NULL,
  corrections = 'Mountain Project confirms grade (5.10d trad, 3 stars) and route name but publishes no official pitch count or gear list; rack/rope sizing inferred from the comparably-scaled ''Drawbridge'' (IV 5.10+ A1, 10 pitches) on the same north face.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_face_left_buttress';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"small set 0.4-2in","slings":"3-4 shoulder-length"}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 30,
  rope_note = 'This is ''The Castle'' in the Tatoosh Range (Mt Rainier NP), not Castle Peak Pasayten. SummitPost confirms 4th class to 5.6 depending on line, with generally short rock pitches.',
  ascender = NULL,
  corrections = 'None — grade and location cross-verified against SummitPost.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_southeast_face_2';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"light rack to 2in","slings":"3-4"}',
  alpine_draws = 3,
  rope_type = 'single dynamic (optional for short 5th-class step)',
  rope_length_m = 30,
  rope_note = 'Mostly 3rd/4th class ridge scrambling with a short 5.3 step. Light rack for the one roped pitch.',
  ascender = NULL,
  corrections = 'Grade (5.3, 2 stars) verified on Mountain Project; no pitch/gear breakdown published, so rack sizing is inferred from the terrain description.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_ne_ridge';

UPDATE routes SET
  sling_rack = '{"nuts":"wide range","cams":"0.3-3in, doubles in common sizes, up to a #3 Camalot"}',
  alpine_draws = 12,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Classic III-IV, 7-pitch line up the middle of the 1000'' South Face (originally 5.8/A1, now typically climbed free). Descend via the walk-off route to the west.',
  ascender = NULL,
  corrections = 'Route list grade ''5.8'' matches MP''s free-climbing rating; historically listed as 5.8/A1.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_face_10';

UPDATE routes SET
  sling_rack = '{"nuts":"wide range","cams":"0.3-3in single set"}',
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Descend via the shared NE gully off The Monk (three 75'' rappels, per adjacent Scabo route beta) — a 60m rope doubled easily covers each 75'' pull.',
  ascender = NULL,
  corrections = 'Grade (5.8, 2 stars) verified on Mountain Project; no pitch count or rack published specifically for this line, so gear is inferred from sibling Monk routes on the same formation.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_monk_le_gibet';

UPDATE routes SET
  sling_rack = '{"nuts":"wide range","cams":"0.3-3in single set"}',
  alpine_draws = 9,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Descend via the shared NE gully (three 75'' rappels). Similar character to Scabo on the same face.',
  ascender = NULL,
  corrections = 'Mountain Project lists this route at 5.9, not 5.8 as given in the route table — flagging for correction upstream.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_monk_odine';

UPDATE routes SET
  sling_rack = '{"nuts":"wide range","cams":"0.3-3in single set"}',
  alpine_draws = 10,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '5 pitches, starts near the right side of the South Face''s lowest ledge, zigzags up the right side. Descend via NE gully: three 75'' rappels.',
  ascender = NULL,
  corrections = 'None — fully confirmed on Mountain Project (grade, pitches, rack, descent, FA date Aug 1973).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_the_monk_scabo';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.75-3in emphasis (hand/fist), single set"}',
  alpine_draws = 8,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Crack line on The Monk; descend via shared NE gully (three 75'' rappels). Emphasize cam sizes matching hand/fist cracks.',
  ascender = NULL,
  corrections = 'Grade (5.8, 2 stars) verified on Mountain Project; pitch/rack detail inferred from sibling Monk routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_monk_west_cracks_left_crack';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.5-2.5in emphasis, single set"}',
  alpine_draws = 7,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Crack line adjacent to Left Crack; shared NE gully descent (three 75'' rappels).',
  ascender = NULL,
  corrections = 'Grade (5.7, 2 stars) verified on Mountain Project; pitch/rack detail inferred from sibling Monk routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_monk_west_cracks_right_crack';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.3-2in","slings":"a few, plus webbing to back up the fixed horn anchor"}',
  alpine_draws = 6,
  rope_type = 'twin/double-strand rappel setup (single 60m rope doubled, or two ropes)',
  rope_length_m = 60,
  rope_note = '4-pitch route on Chablis Spire (Wine Spires, Washington Pass), P4 is the 5.6 crux corner. Descent: downclimb 15ft from the ''bunny ears'' notch to rap slings on a horn, then a double-rope rappel to the base.',
  ascender = NULL,
  corrections = 'None — confirmed via SuperTopo/Mountain Project route descriptions.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_face_2';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Off-trail Class 2-3 scramble over talus, slabs, and heather; exposure only on the final ridge crest. No rope typically used; helmet recommended for rockfall/exposure.',
  ascender = NULL,
  corrections = 'None.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_chikamin_peak_southeast_slopes';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.3-2.5in"}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Documented Chimney Rock routes are predominantly on the East Face (3 pitches: chimney, slab, chimney, low-5th). The West Face/South Summit line described in the route list has limited independent documentation — gear sized comparably to the East Face standard route as the closest analog.',
  ascender = NULL,
  corrections = 'Could not verify a distinct ''West Face / South Summit'' route description separate from the well-documented East Face lines; flagging for manual review against a Beckey guide.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_chimney_rock_west_face';

UPDATE routes SET
  sling_rack = '{"nuts":"small-mid set","cams":"0.4-2in"}',
  alpine_draws = 5,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Standard East Face route: P1 vegetated chimney, P2 exposed slab to a ledge, P3 deep summit chimney — low 5th class throughout, consistent with the 5.3 grade given (distinct from the harder 5.6 ''East Face Direct'' variant).',
  ascender = NULL,
  corrections = 'None — grade matches the standard (non-Direct) East Face route in available sources.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_face_6';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 3-4 scramble on Twin Sisters olivine, an exceptionally high-friction rock. No rope typically needed on the standard scramble line; a party doing the East Buttress variant reported some easy technical moves where a short rope could be prudent.',
  ascender = NULL,
  corrections = 'General Twin Sisters/olivine terrain character confirmed via multiple sources; no route-specific gear list found for this exact route name, so inferred from the range''s documented Class 3-4 character.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_cinderella_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = '30-40m glacier rope (crevasse hazard), unroped for the final rock scramble',
  rope_length_m = 35,
  rope_note = 'Route crosses the Walrus (Clark) Glacier before a Class 3 rock finish to the summit. Rope up for glacier travel; standard crevasse-rescue kit (prusiks) recommended. Rock finish from the ~8000'' col is typically done unroped.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'None — glacier-crossing requirement confirmed across multiple independent trip reports (Mountaineers, Mazamas, trailcatjim).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_clark_mountain_west_ridge';
COMMIT;
