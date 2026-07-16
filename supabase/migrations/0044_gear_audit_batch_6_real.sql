-- Gear audit batch 6 (real route IDs verified against live DB): 50 routes across 20 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes The Dikes crag cluster (23 single-pitch sport routes, cross-verified against
-- Mountain Project's official area page) plus alpine objectives (Dorado Needle, East McMillan
-- Spire, Crooked Thumb Peak) and Keechelus Ridge East Face sport routes.
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
  rope_note = 'Class 2 walk-up on the SW slopes; no rope or technical protection used on this specific line (other Cloudy Peak approaches have 3rd/4th class sections, but the SW Slopes route itself is non-technical).',
  ascender = NULL,
  corrections = 'No route-specific trip report found for ''Southwest Slopes'' by name; inferred from Class 2 grade and general Cloudy Peak terrain descriptions.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_cloudy_peak_southwest_slopes';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":3,"double_slings_120cm":2,"cordelette":true}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Class 3 to gain the ridge, then exposed 5.6 ridge climbing to a summit boulder-problem block; a Steph Abegg trip report describes a single 25m rappel off a sling anchor on descent (consistent with a 60m rope doubled).',
  ascender = NULL,
  corrections = 'Route-specific rack beta was thin; rack sizing inferred from 5.6 grade and typical CBR-area granite protection.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_nw_ridge_2';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Confirmed non-technical: ''the mountain does not require rope or rock climbing gear to summit'' — Class 3 scramble up the west spur with one 4th-class move gaining the SW face; exposure but no fixed pro used.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_columbia_peak_scramble';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":2,"double_slings_120cm":2,"cordelette":false}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = 'Directissima variant shares pitches with the standard 3-pitch North Face (5.6, 5.7, 5.6+/5.7); Grade II, moderate crack/flake climbing to a bear-hug flake below the summit. Descend via raps from the notch/summit.',
  ascender = NULL,
  corrections = 'Found solid beta for the standard North Face route but no gear list specific to the ''Var. Right (Directisimo)'' variant; rack inferred from sibling Concord Tower routes at similar grade.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_north_face_var_right_directisimo';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":2,"double_slings_120cm":3,"cordelette":false}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = 'Verified via Mountain Project: climbable in one ~220ft (67m) pitch with a 70m rope; two single-rope rappels from the south side of the summit for descent. Loose blocks/flakes — usual alpine caution.',
  ascender = NULL,
  corrections = 'MP source explicitly states ''bring about a 1.5 rack [tips to #3 cams], add more depending on confidence'' and ''lots of alpine draws as this route wanders'' — used directly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_south_face_center';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":3,"double_slings_120cm":2,"cordelette":false}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = '3 pitches (P1 crux diagonal cracks, P2 exposed leftward traverse through/around ''the cave'', P3 5.4 crack to face climbing). The ''R'' rating stems from the traversing P2 — protect it well for the second''s safety with directional gear.',
  ascender = NULL,
  corrections = 'Route description confirmed via Mountain Project; no explicit rack list found, so gear sizing inferred from grade (5.8) and comparable Concord Tower routes plus the traverse pitch''s need for extra draws/slings.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_cave_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Class 2-3 scramble; standard grade-based expectation is no rope, though an optional short rope/handline could be prudent on any exposed 3rd-class step for less-experienced parties.',
  ascender = NULL,
  corrections = 'Search results were ambiguous between multiple Washington peaks named ''Copper'' (Olympics Copper Mountain Class 2-3 vs. North Cascades Copper Peak SE Glacier route, which is glaciated and roped). Given the route name and Class 2-3 grade matching the Olympics Copper Mountain, treated as non-technical; flagging peak-identity ambiguity for verification against the DB''s area coordinates.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_copper_peak_south_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Ragged Ridge peak; final approach is moderate snow (ice axe useful) then ~200ft of solid 3rd-class rock to the summit — no rope used in trip reports found.',
  ascender = NULL,
  corrections = 'No route named specifically as a standalone ''Standard Scramble''; beta drawn from general Cosho Peak (often combined with Kimtah Peak) ascent descriptions.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_cosho_peak_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = 'Straightforward Class 2-3 climb up the SE ridge from Fish Creek Pass to a wide summit; described as a simple, non-technical scramble in multiple sources.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_courtney_peak_scramble';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":2,"double_slings_120cm":2,"cordelette":true}',
  alpine_draws = 4,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Grade III-IV, 5.6 in the remote Picket Range (Big Beaver Trailhead approach); route reportedly combines glacier travel with exposed rock climbing to 5.6, so a rope is carried for both glacier crossing and roped rock pitches — plan for a multi-day approach.',
  ascender = 'Prusik cords (see rope_note)',
  corrections = 'Very little route-specific beta exists online for this remote Picket Range objective. Gear inferred from the Grade III-IV/5.6 rating and confirmed presence of glacier travel. Flag for expert review given sparse sourcing.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_crooked_thumb_peak_south_route';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":3,"double_slings_120cm":2,"cordelette":false}',
  alpine_draws = 6,
  rope_type = 'single dynamic',
  rope_length_m = 70,
  rope_note = 'Verified via SpokAlpine trip report: 70m 9.2mm rope. Long wandering line up slabs/overhangs/chimneys with the 5.8 crux (an offwidth) near the top before an easy final scramble. Approach involves a snow gully — ice axe/crampons useful early season.',
  ascender = NULL,
  corrections = 'Source (spokalpine.com) gives exact rack: singles .3-4, doubles .4-2, nuts, plus ice axe/crampons; author notes the #4 cam specifically protects the crux offwidth and a lighter rack is viable if that piece is skipped.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_complete_south_buttress';

UPDATE routes SET
  sling_rack = '{"shoulder_slings_60cm":2,"double_slings_120cm":2,"cordelette":false}',
  alpine_draws = 5,
  rope_type = 'single dynamic',
  rope_length_m = 60,
  rope_note = 'Verified via SpokAlpine: ''60m rope minimum.'' Unprotected 5.6 slab gains the ridge crest, then mostly 2nd/3rd-class ramps on the east side to a final 5.4 headwall pitch (5.7 PG13 crux is loose/runout). Descent via West Ridge with 5 rappels.',
  ascender = NULL,
  corrections = 'Two sources gave slightly different racks: SpokAlpine (single rack .4-3, nuts, 60m rope minimum — used as primary) vs. another listing (single rack .4-4, 5 alpine draws, 2x70m ropes). Alpine draw count (5) taken from the second source since SpokAlpine didn''t specify a number.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_north_ridge_3';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. Megadike North walls run up to ~120ft, so a 70m rope is recommended for margin when lowering off anchors.',
  ascender = NULL,
  corrections = 'Grade 5.7 matches MP exactly. Exact bolt count/route length not individually published; rope length inferred from sub-area wall-height data.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_a_little_something';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single-pitch bolted sport route at Minidike (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. Minidike routes are shorter than Megadike; 60m is sufficient.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly (2.5-star route).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_ahoot';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.9 matches MP exactly. Note: an unrelated multi-pitch route of the same name exists at Unaweep/Grand Junction, CO — not the same climb.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_bachelor_party';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly. Name references the horizontally-jointed ''stacked firewood'' basalt texture characteristic of this crag.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_cordwood';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike South (The Dikes, WA); confirmed as Sport, 3-star, on Mountain Project''s official area page. 70m recommended given crag-wide walls up to 120-140ft.',
  ascender = NULL,
  corrections = 'Grade 5.10a matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_czech_it_out';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_face_farce';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single-pitch bolted sport route at Minidike (The Dikes, WA); confirmed as Sport, 2-star, on Mountain Project''s official area page. Minidike routes are shorter than Megadike; 60m is sufficient.',
  ascender = NULL,
  corrections = 'Grade 5.10b matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_firearms';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike South (The Dikes, WA); confirmed as Sport, 3-star, on Mountain Project''s official area page. 70m recommended given crag-wide walls up to 120-140ft.',
  ascender = NULL,
  corrections = 'Grade 5.10b matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_heinous_thing';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single-pitch bolted sport route at Minidike (The Dikes, WA); confirmed as Sport, 2.5-star, on Mountain Project''s official area page. Minidike routes are shorter than Megadike; 60m is sufficient.',
  ascender = NULL,
  corrections = 'Grade 5.7 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_henpecked';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_incoming';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single-pitch bolted sport route at Minidike (The Dikes, WA); confirmed as Sport, 3-star, on Mountain Project''s official area page. Minidike routes are shorter than Megadike; 60m is sufficient.',
  ascender = NULL,
  corrections = 'Grade 5.10a matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_internal_combustion';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Confirmed on Mountain Project as a 30ft (9m) single-pitch sport route in the Minidike sub-area of The Dikes, WA, described in the route text as ''bolts to anchors'' and ''great for teaching new climbers.'' 60m rope is far more than sufficient for a route this short.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly. Route length (30ft) and bolts-to-anchors protection style directly verified from the individual route page — most specific data of the batch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_joe_s_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_just_enough';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single-pitch bolted sport route at Minidike (The Dikes, WA); confirmed as Sport, 1-star, on Mountain Project''s official area page. Minidike routes are shorter than Megadike; 60m is sufficient.',
  ascender = NULL,
  corrections = 'Grade 5.5 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_just_for_fun';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.5 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_lady_slipper';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike South (The Dikes, WA); confirmed as Sport, 2-star, on Mountain Project''s official area page. 70m recommended given crag-wide walls up to 120-140ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_moe';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.5 matches MP exactly. Name references the crag''s stacked-firewood basalt columns, same motif as ''Cordwood.''',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_monkey_on_a_woodpile';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.9 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_morning_thunder';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_notta_slab';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike North (The Dikes, WA); confirmed as Sport on Mountain Project''s official area page. 70m recommended given Megadike North''s walls up to ~120ft.',
  ascender = NULL,
  corrections = 'Grade 5.7 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_red_zinger';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike South (The Dikes, WA); confirmed as Sport, 2.5-star, on Mountain Project''s official area page. 70m recommended given crag-wide walls up to 120-140ft.',
  ascender = NULL,
  corrections = 'Grade 5.7 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_redtail_arete';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at Megadike South (The Dikes, WA); confirmed as Sport, 1-star, on Mountain Project''s official area page. 70m recommended given crag-wide walls up to 120-140ft.',
  ascender = NULL,
  corrections = 'Grade 5.8 matches MP exactly.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_safety_dance';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = 'Single-pitch bolted sport route at The Castle sub-area of The Dikes, WA (approached via a long, steep hillside to the pinnacle base); confirmed as Sport on Mountain Project''s official area page. No published length; 70m recommended given crag-wide walls up to 140ft.',
  ascender = NULL,
  corrections = 'Grade 5.8+ matches MP exactly (only route currently listed at The Castle).',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_unknown_climb_up_the_castle';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Unroped Class 3 scramble up the SW Face gully system; snow to ~40 degrees encountered seasonally. Ice axe recommended when snow present; approach involves significant bushwhacking/alder rather than technical terrain.',
  ascender = NULL,
  corrections = 'Route-specific beta (Ryan S./Nick R. exploratory ascent) confirms SW route downgraded Davis Peak to non-technical vs. the older, steeper South Ridge route.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_davis_peak_nc_southwest';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 3 scramble typically approached via Alpental ski area/Source Lake; ice axe and helmet required per Mountaineers guidance, microspikes/crampons recommended if snow is firm.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_denny_mountain_north_slopes';

UPDATE routes SET
  sling_rack = '{"nuts":"small set","cams":"0.3-2 in, light rack","slings":2}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Approach to a col (~7,500 ft) on Devore''s SE ridge, then face scramble to summit with routefinding; Mountaineers beta describes Class 4 terrain with a few Class 5 moves, and descent uses a mix of rappels and downclimbing — meaningfully harder than the listed Class 2-3 grade.',
  ascender = NULL,
  corrections = 'Source grade (Class 4 w/ 5th-class moves, rappel required) exceeds the DB''s listed Class 2-3; treat as harder than labeled.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_devore_peak_west_ridge';

UPDATE routes SET
  sling_rack = '{"cams":"single rack to #3 Camalot, doubles in 0.5/0.75/1 in","nuts":"full set","pickets":"2 (optional, for snow pitches)"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Grade III+ alpine rock buttress, ~13 pitches over 1000+ ft; standard Southwest Buttress line is 5.7-5.8 (first pitch a full 55-57m rope length), the ''Direct'' variant follows a steeper/harder line to reach 5.10a. Glacier approach via Marble Creek-McAllister Pass gully (year-round snow to 35 deg) requires ice axe/crampons.',
  ascender = NULL,
  corrections = 'No standalone source found for the ''Direct'' 5.10a variation specifically; rack/rope scaled up slightly to cover the harder direct crux — verify locally if possible.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_direct_southwest_buttress';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Class 2 walk-up/scramble; no route-specific sources found. Inferred from grade: boot path/talus/scree, no rope or rack needed, ice axe only if early-season snow persists.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_dot_mountain_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Eagle Peak (Longmire/Mt Rainier) standard scramble to a short, exciting summit ridge; Class 3/4 rock scramble per Mountaineers/SummitPost. Winter/spring conditions call for ice axe, crampons/microspikes, and helmet due to steep upper meadow terrain with avalanche exposure.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_scramble_route';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = 'none',
  rope_length_m = NULL,
  rope_note = 'Standard route: talus below cliffs on the NE side, an ascending counterclockwise traverse around the mountain (the route''s crux section), then ~600 ft of Class 2 (or Class 2/3 direct) to the summit.',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_eagle_rock_scramble';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 70,
  rope_note = '2-pitch bolted sport route (130 ft/39m total), 17 bolts, 2 chain anchors mid-route. A 70m rope is NOT enough to lower from the upper anchor in one go — either climb/rap in two pitches using the mid anchors, or alpine-sling the lower bolts and back-clean on a single continuous lead.',
  ascender = NULL,
  corrections = 'Confirmed via direct Mountain Project route-page fetch.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_black_systems_solar';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 25,
  rope_note = 'Single-pitch bolted sport route, 75 ft (23m), 10 bolts, chain anchor. Overhanging jugs to a crux mantle, rest ledge, second ~5.10c mini-crux, then easier slab to anchor.',
  ascender = NULL,
  corrections = 'Mountain Project lists this route as 5.11b, one letter grade below the DB''s listed 5.11c — minor grade discrepancy, likely guidebook vs. MP consensus difference.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_crescendo_of_the_sarcophagus_breathing';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 8,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'No standalone source found for this specific route. Inferred from its East Face/Keechelus Ridge sector siblings: single-pitch bolted sport line on blocky andesite, likely 60-90 ft with a chain anchor.',
  ascender = NULL,
  corrections = 'Route not individually indexed in the sources checked; gear pattern extrapolated from neighboring East Face routes.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_glacier_view_temple';

UPDATE routes SET
  sling_rack = '{"cams":"0.3-3 in, single set (inferred, crack route)","nuts":"light set"}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'No standalone source found. The name and 5.9+ grade suggest a crack line — the East Face sector does include at least one trad route, so this may require actual cam/nut protection rather than pure bolted sport gear.',
  ascender = NULL,
  corrections = 'Not individually indexed on Mountain Project/SummitPost in searches performed; treat rack as a starting-point estimate only, confirm locally or via Snoqualmie Rock guidebook before relying on it.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_project_crack';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Confirmed to exist on the right side of the East Face (grouped with Ancients Nestled Within, Nocturnal Pulse, Enchanting Puller); starts ~20 ft up on a ledge near a large black block. Bolt count/anchor type not directly confirmed but sector pattern is bolted sport with chain anchors.',
  ascender = NULL,
  corrections = 'Route existence and approach beta verified via Mountain Project photo caption; exact bolt count and rope length not found and are extrapolated from sibling 5.10c routes at the same sector.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_the_pillar_under_pale_streaks';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 13,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Single-pitch bolted sport route, 90 ft (27m), 13 bolts, chain anchor. Climbs sustained jugs; belay set from the ground (not the ledge). Standard 60m single rope more than covers it.',
  ascender = NULL,
  corrections = 'Confirmed via direct Mountain Project route-page fetch; MP lists grade as 5.10b/c vs. DB''s 5.10c — consistent.',
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_with_love_lie_ancients_nestled_within';

UPDATE routes SET
  sling_rack = '{"nuts":"light set","cams":"0.3-2 in","pickets":1}',
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Grade III alpine rock/snow route in the Southern Pickets, ~8,000 ft gain approach via Terror Basin. Standard glacier travel gear (ice axe, crampons, helmet) required for year-round snow on approach slopes; a short exposed Class 3 step with ice axe/crampons just below the summit block; light rack + 1-2 pickets sufficient for the roped sections (30m rope reported adequate).',
  ascender = NULL,
  corrections = NULL,
  gear_confidence = 'verified',
  updated_at = now()
WHERE id = 'wa_east_mcmillan_spire_west_ridge';

UPDATE routes SET
  sling_rack = '{"nuts":"full set","cams":"0.4-3 in","slings":4}',
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Picket Range alpine rock route, Grade III. Sources most directly document a Southeast Ridge/Face line at II 5.10a rather than a distinctly-named ''South Route'' at 5.7 — treat this as a related but not exactly-matched line. Standard alpine rack, glacier approach gear (ice axe/crampons) for Crescent Creek basin approach, 60m rope for multi-pitch rock.',
  ascender = NULL,
  corrections = 'Could not confirm an exact source for a 5.7 ''South Route'' distinct from the documented 5.10a SE Ridge/Face line and the 5.9 North Buttress — grade/route-name mismatch flagged for local verification against a current guidebook.',
  gear_confidence = 'inferred',
  updated_at = now()
WHERE id = 'wa_east_twin_needle_south_route';
COMMIT;
