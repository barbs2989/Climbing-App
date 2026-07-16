-- Salvaged + corrected gear-audit data from migrations 0029-0033
-- Generated: 2026-07-16
-- Every route_id below was re-verified against the live routes table.
-- Fixes applied: missing 'wa_' ID prefix (migration 0032), wrong WHERE
-- column name 'route_id' -> 'id' (migration 0033). Blocks whose route_id
-- had no match at all in the live DB (fabricated) were discarded --
-- see /tmp/discarded_ids.txt for the full list; those peaks/routes still
-- need real research under correct IDs in a future batch.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column
-- to be applied first. Apply via Supabase SQL editor or with the service
-- role key (see README note in 0034).

BEGIN;

update routes set
  gear = '["Rock shoes (or sturdy approach shoes)","Single rack of cams #0.3-#1, some parties add a few small Alien/C3 microcams","Set of nuts plus a few tricams for quick anchors","Single 60m rope (skinny 7-8mm ropes are common)","8-14 alpine draws","A handful of slings (60cm/120cm) plus a cordelette or double-length sling for anchors/PAS","Light ice axe and aluminum crampons for the Goode Glacier crossing","Helmet","Micro Traxion + 2 prusiks + guide-mode belay device, if you want crevasse-rescue capability on the glacier approach"]'::jsonb,
  detailed_rack = 'A single rack of cams from about #0.3 to #1 (some parties add a few small Aliens or C3 microcams, or double up 0.3-0.75, for long simul-climbing blocks), a set of nuts, and a few tricams -- useful for quick gear anchors on this mostly 3rd/4th-class buttress with short low-5th-class steps (5.5-5.7ish). Bring 8-14 alpine draws for the wandering, low-angle terrain, plus a handful of 60cm/120cm slings and a cordelette or double-length sling for anchors and a personal anchor system. No need for a heavy rack or doubled cams beyond the small-to-mid sizes.',
  pro_needs = 'Protection is intermittent -- most of the route is 3rd/4th-class scrambling with short low-5th-class steps, so gear placements are more about quick simul-climbing anchors than sustained crack climbing. A single light rack to about #1 plus a few tricams is standard; nobody needs a heavy or doubled rack.',
  what_to_bring = '["Rock shoes or approach shoes","Single rack to #1 plus nuts/tricams","8-14 alpine draws","Single 60m rope","Helmet","Light axe and aluminum crampons for the glacier crossing","Micro Traxion + prusiks if you want crevasse-rescue capability","Headlamp","Bivy gear (most parties do this over 2 days)","Extra layers for a long day"]'::jsonb,
  sling_rack = '[{"sizeCm": 60, "qty": 5}, {"sizeCm": 120, "qty": 3}, {"sizeCm": 240, "qty": 1}]'::jsonb,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Rappels are 6 single-strand ~30m raps off the standard descent (3 summit-to-Black Tooth Notch, 3 into the SW Couloir) -- a single 60m rope is standard and sufficient. Do not bring a second rope; the "double rope" beta in older data appears to be a misreading of one party''s skinny single-rated rope doubled over for simul-climbing protection, not two full ropes.',
  ascender = 'Micro Traxion',
  corrections = 'Corrected from auto_generated placeholder text. Previous data claimed "double rope" (real parties use a single 60m rope -- see rope_note) and a rack "to 3 inches" (real trip reports cap around #1-2). Previously had zero sling/alpine-draw data; 5 independent trip reports (2020-2025) converge on 8-14 alpine draws and a handful of slings/cordelette. Ascender/crevasse-rescue gear was never modeled -- at least one documented party carries a Micro Traxion + prusiks for the Goode Glacier crossing.',
  auto_generated = false
where id = 'wa_mount_goode_northeast_buttress';

update routes set
  gear = '["sturdy scrambling boots","helmet","trekking poles","ice axe (if snow lingers near saddle/tarn)"]'::jsonb,
  detailed_rack = 'No roped rock rack is carried on this route. Cross-referenced trip reports (Country Highpoints, NWHikers forum, Steven''s Peak-bagging Journey, hike2hike) consistently describe the non-standard North Ridge (via the Wolf Creek/Gardner Meadows trail and an old, largely-vanished mine boot path) as an unroped Class 2-3 scramble: talus and scree to Gardner Meadows, then an unmaintained path/cairns to a 7,680+ ft saddle 0.6 mi north of the summit, then a ''pick-your-own-adventure'' scramble along the ridge crest with ''a few class 3 moves'' on a spur ridge. No party describes placing cams, nuts, or using a rope.',
  pro_needs = 'None placed — this is unprotected scrambling, not protected rock climbing. Hazard is loose rock/footing (talus, scree, old mining debris) rather than lack of gear placements; a helmet is the relevant safety item, not a rack.',
  what_to_bring = '["helmet (loose rock/rockfall risk on talus and scree)","trekking poles for scree and talus","ice axe and/or microspikes if snow lingers near the 7,680ft saddle or approach tarn (common into early summer on this east-side, north-facing approach)","sturdy boots with good ankle support for off-trail talus","map/compass or GPS — the old mine boot path is faint to nonexistent above Gardner Meadows, marked only by occasional cairns and cut logs","extra water — long ridge approach (11 mi to Gardner Meadows) with few reliable water sources higher up"]'::jsonb
where id = 'wa_abernathy_peak_north_ridge';

update routes set
  gear = '["helmet","ice axe","crampons","60m single rope","light rock rack (nuts + small-to-medium cams)","snow pickets"]'::jsonb,
  detailed_rack = 'No trip report gives an exact cam/nut inventory. Terrain is a broad Class 2-4 ramp to a col, then a 30-ft chimney (5.5, with a harder ~5.8 alternate chimney used when the first proved ''impassable''), then a final loose Class 4 scramble to the true summit. A light single rack of nuts plus cams roughly finger-to-hand size (~0.3-3in) covers the chimney/ledge terrain reasonably; a couple of doubled mid-size cams (1-2in) help for chimney stemming/stacking. This sizing is inferred from route character, not a sourced gear list.',
  pro_needs = 'Both documented ascents describe the rock as loose/rotten in places (''test every single hold,'' ''loose rock and hard dirt near the notch'') rather than gear-placement-difficult — rockfall management is emphasized more than protection scarcity. The technical crux is a chimney (5.5, or 5.8 on the adjacent alternate line) where natural chimney/stemming technique and slung chockstones can supplement small-to-medium cams. Rappel anchors during descent are through a snow couloir rather than bolted stations, consistent with natural/gear anchors.',
  what_to_bring = '["overnight backpacking/bivy gear (remote multi-day approach, ~33mi RT via Stehekin ferry/PCT)","bear canister (North Cascades NP / Lake Chelan NRA backcountry regulation)","water filter/treatment (multiple creek crossings)","trekking poles (heavy brush/bushwhack sections, faint-to-vanished approach trail)","GPS/map and compass (approach trail described as largely vanished, requires route-finding)","sturdy approach boots suited to steep snow and loose rock","wilderness/backcountry camping permit"]'::jsonb
where id = 'wa_agnes_mountain_west_route';

update routes set
  gear = '["rock shoes","light alpine trad rack: cams ~0.3-2in (doubles 0.5-1in)","set of stoppers/nuts","helmet","60m single rope","a handful of slings for anchors"]'::jsonb,
  detailed_rack = 'A light alpine rack covers this route: a single set of cams from finger-size up to about 2in, with doubles in the common 0.5-1in range for the sustained low-5th ridge climbing and the 5.6 crux on pitch 3 (bypassing a gendarme on the right, on more solid but harder rock). Bring a set of stoppers/nuts too — the ridge is described as loose and lichen-covered in places, so smaller opportunistic nut/cam placements matter as much as a big piece. There is no fixed protection on-route except a single faded rap sling at the P2/P3 notch belay below the gendarme.',
  pro_needs = 'Protection is moderate but not continuous — this is a broken, sometimes loose ridge crest rather than a clean crack system, so gear comes from natural placements as terrain allows rather than a splitter line. Mountain Project explicitly flags ''an abundance of loose, lichen-y rock,'' and warns belayers on pitch 2 to stay out of the fall line because of rockfall risk from parties above on the pitch 3 crux.',
  what_to_bring = '["helmet (loose/lichen-y rock)","ice axe, and crampons if there''s residual snow in Forbidden Gully/Cat Scratch Gullies on the approach","approach shoes/light boots for scree and snowfield approach to Boston Basin","bivy/camp gear for the multi-day Boston Basin approach"]'::jsonb
where id = 'wa_south_ridge_6';

update routes set
  gear = '["rock shoes","light alpine rack: small-medium cams + a few nuts","helmet","60m single rope","a few slings"]'::jsonb,
  detailed_rack = 'Very light rack. The route is 2-3 pitches of nearly level ridge that''s typically simul-climbed or short-roped, then a single steeper crux step (Mountain Project calls it 4th class, ~50-60ft; other sources describe it as up to 5.5) leading to a short tower, followed by one more short 4th class pitch to the summit. A small set of cams from finger-size to roughly 2in plus a handful of nuts is enough to protect the crux step and build gear anchors — there is no fixed gear or anchors on-route apart from rappel slings waiting at the descent notch.',
  pro_needs = 'Minimal protection needed overall — most of the route is easy, low-angle ridge terrain covered with minimal or no gear (simul/short-roped), with real protection only wanted on the one steeper step. Place gear opportunistically there rather than expecting a continuous crack.',
  what_to_bring = '["helmet","ice axe, and crampons if snow lingers in Forbidden Gully/Cat Scratch Gullies on approach","a light rack rather than a full trad kit — this is a short half-day route from Boston Basin, not a long alpine outing","approach/scramble shoes for the col traverse to the base of the ridge"]'::jsonb
where id = 'wa_north_ridge_7';

update routes set
  gear = '["ice axe","aluminum or steel crampons","glacier travel harness + helmet","single 30-60m rope (shared ''glacier rope'', not full rock rope)","crevasse-rescue kit: pulley, 2 prusik cords/hero loops, cordelette, 2-3 lockers","1-2 snow pickets per rope team","optional light rock rack only for side-summit scrambles (Dome Peak, Sinister Peak)"]'::jsonb,
  detailed_rack = 'The standard through-traverse is a glacier/scramble route, not a pitched rock climb, so the ''rack'' is mostly glacier-travel and crevasse-rescue kit rather than rock gear: ice axe, crampons (aluminum acceptable, some parties use lightweight strap-on models), climbing harness, helmet, and a shared rope — either a 30m ''glacier rope'' per 2 people or a single lightweight 60m 8-9mm rope split among a 3-person team. Crevasse-rescue gear is the real ''rack'' here: a pulley, 2-3 locking carabiners, 2 prusik cords (pre-rigged ''texas prusiks''/hero loops work well), a cordelette or 5.5mm accessory cord, and 1-2 snow pickets per rope team (add 1-2 lightweight aluminum ice screws, e.g. 21cm, if traveling late-season when the Le Conte Glacier can go bare-ice). No rock rack is needed for the standard route. If adding optional technical side-summits (Dome Peak''s exposed class 3-4 final scramble, or a Sinister Peak side trip), bring a light rock rack: a half-set of nuts, a nut tool, a few small-to-mid cams (~0.1-2in) or tricams, and 3-4 shoulder-length slings for natural or gear anchors/short raps.',
  pro_needs = 'Protection needs are minimal and glacier-hazard-driven rather than rock-driven: pickets and (late-season) ice screws for crevasse-rescue anchors are the main ''pro'' on this route, not cams/nuts. Rock protection only comes into play on optional side-summit scrambles (e.g. Dome Peak''s final exposed step, occasionally belayed) or as a rappel backup if the Red Ledge traverse beneath Arts Knoll is broken by a melted-out gap (documented up to 15-20ft raps in some seasons) — the granite there is solid and takes gear fine, but placements are sparse because most parties simply scramble/hand-line rather than place traditional pro.',
  what_to_bring = '["gaiters","glacier glasses / sun protection","trekking poles","multi-day pack with camp gear (tent, stove, bear-resistant food storage) for the typical 4-7 day traverse","map/compass/GPS — extensive off-trail navigation across ~6 glaciers","1-2 lightweight aluminum ice screws if attempting late-season when the Le Conte Glacier can be bare ice"]'::jsonb
where id = 'wa_ptarmigan_traverse';

update routes set
  gear = '["sturdy scrambling/hiking boots (mountaineering boots if any snow lingers)","trekking poles","helmet (situational, precautionary -- carried by some parties for rockfall/loose rock, not technically required)","ice axe (early-season/lingering-snow on the approach gully only; not needed on dry summer rock)"]'::jsonb,
  detailed_rack = 'No rock rack is used or needed -- this is an unroped Class 2 hands-on-rock scramble, not a roped rock climb. Parties do not carry cams, nuts, hexes, or a rack of any kind on the standard South Ridge/Rampart Ridge route.',
  pro_needs = 'None -- no technical protection is placed on this route. It is a Class 2 scramble: loose rock and large steps on the initial push, then a narrow, exposed but non-technical ridge crest with several false summits to the true summit. Rock quality on the ridge itself is solid enough for hands-and-feet scrambling; the main hazard is loose talus/scree on the lower approach slope rather than anything requiring gear placement.',
  what_to_bring = '["bug net and repellent (mosquitoes reported swarming heavily at rest stops on the approach)","sun protection -- little to no shade on the final push and ridge","map/GPS/route beta for false-summit routefinding (3-5 false summits reported before the true summit)","wind layer for the exposed open ridge","turn-around discipline / willingness to bail if snow is encountered on the ridge or gully (per WTA guidance)"]'::jsonb
where id = 'wa_alta_mountain_scramble';

update routes set
  gear = '["helmet","approach shoes/light boots (route is scrambling + one roped chimney)","small rack to 2in with stoppers","60m single rope","extra webbing/cordage for weathered rap anchors","ice axe for early-season snow gullies"]'::jsonb,
  detailed_rack = 'A small-to-medium rack covers the route: a set of stoppers/nuts plus small cams up to about 2 inches. No large cams are needed — the SummitPost route page for this exact line and The Mountaineers'' route description both independently describe the gear as a light rack of small-to-medium chocks/cams topping out around 2in, used mainly to protect the short roped chimney pitch(es) around the chockstones and ''cannonhole'' squeeze. Trip reports climbing the Great Chimney note the crux moves are around a series of 3-4 chockstones and can feel harder/thinner-protected than the 5.4 rating suggests in wet/loose conditions, but no wider gear is called for.',
  pro_needs = 'Protection is intermittent rather than sparse-to-nothing: the chimney''s chockstones and constrictions (including the tight ''cannonhole'') give natural gear placements, but the rock in this chimney system is loose/exfoliating in spots, so test placements and expect some sections to feel underprotected relative to 5.4. Fixed webbing/tat exists at several rappel stations (e.g. above chockstones) but is frequently described as old, ragged, or in need of replacement — back it up or bring your own webbing rather than trusting in-place anchors.',
  what_to_bring = '["helmet (loose rock is a recurring theme in every trip report)","ice axe for early-season snow in the approach gullies/traverses","headlamp — long days (12-18+ hrs car-to-car) are common even for parties that don''t get lost","gloves for the squeeze/chimney sections","extra tubular webbing/cord for replacing weathered rap-anchor tat","gaiters/approach gear for off-trail talus, scree, and forest duff (~80% of the route is off-trail)"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":5},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'The SummitPost route page for this exact line (''South Ridge 5.4'') describes the standard descent as three rappels done on a single 60m rope. A Mountaineers trip report on the same route mentions ''two 60-meter double rope rappels'' plus a handline during their descent — read as one party choosing extra rope/redundancy for a long, loose, complex descent (8-9 linked gully/chimney/face features) rather than evidence the route requires double ropes. A single 60m (or 70m for margin) rope is standard; carrying a second, shorter rope or handline is a reasonable option for parties wanting backup on this convoluted, loose descent, not a requirement.',
  ascender = 'Not needed',
  corrections = 'The prior auto-generated gear text for this route should not be trusted as-is for two likely inaccuracies typical of the placeholder generator: (1) it likely assumed a rack up to ~3in typical of generic ''alpine rack'' boilerplate — real route-specific sources (SummitPost''s dedicated South Ridge 5.4 page and The Mountaineers) agree a small rack topping out around 2in plus stoppers is what''s actually used; (2) if it assumed double/half ropes purely because this is an alpine route, that''s not well supported — the route-specific descent beta calls for a single 60m rope over three rappels, with only one out of several trip reports describing a two-rope descent (by choice, for redundancy on a loose/complex line), not as a technical requirement.'
where id = 'wa_american_border_peak_southeast_face';

update routes set
  gear = '["sturdy hiking/approach boots","ice axe (pre-mid-July snow)","trekking poles","helmet for loose talus sections"]'::jsonb,
  detailed_rack = 'No technical rock rack is needed for the standard West Route. From Upper Cathedral Lake it follows a boot path around the west ridge, then scree/grass slopes to a basin (~8,000 ft), then easy slopes south to the summit. The true (south) summit has one short mantle move onto a block; otherwise it''s a walk.',
  pro_needs = 'No trad gear is placed on the standard route - it is a scree/talus/grass walk-up with one short 3rd-class move near the true summit. A rope/harness/rack is only relevant if linking into one of the technical buttress routes (Middle Finger Buttress, Finger of Fatwa, Pilgrimage to Mecca) on the same peak.',
  what_to_bring = '["ice axe and possibly crampons for lingering snow before ~mid-July","trekking poles","sun protection - long exposed alpine walk","map/GPS - open terrain with braided boot paths","extra water - dry upper basin"]'::jsonb
where id = 'wa_amphitheater_mountain_west_route';

update routes set
  gear = '["rock shoes","trad rack: doubles 0.3-2, single #3, single #4, single #0.2, set of nuts","12-14 slings (~10 single-length, 4 double-length)","helmet","60m single rope (thin, ~8.7mm ideal)"]'::jsonb,
  detailed_rack = 'Doubles of cams from BD #0.3 through #2 (0.3, 0.4, 0.5, 0.75, 1, 2), plus single #3, single #4 (party confirms the #4 sees real use - don''t skip it), single #0.2, and a full set of nuts. Rope: a 60m single skinny rope (~8.7mm) was reported as ideal for the whole 4-pitch, 450 ft route on the Ka''aba Buttress.',
  pro_needs = 'Abundant crack/corner protection throughout the 4 pitches on the Ka''aba Buttress; gear belays/anchors the whole way, no fixed pro. Rock quality is good (blocky, stepping-stone buttress).',
  what_to_bring = '["crack gloves","cordelette for anchors","light rack bag - only a 15-minute approach from Upper Cathedral Lake once at camp","helmet","approach/camp shoes for the ~20-mile backpack in"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":10},{"sizeCm":120,"qty":4}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'A single 60m (thin, ~8.7mm) rope is standard and confirmed by an actual party''s trip report. Descent is a walk-off (east to the Amphitheater saddle, then trail south back around to Upper Cathedral Lake) - not rappelling - so there is no basis for a double/half-rope requirement.',
  ascender = 'Not needed',
  corrections = 'If existing data assumed doubled/half ropes for this route, correct that - descent is a walk-off, not raps, so a single rope is the verified standard.'
where id = 'wa_amphitheater_mountain_pilgrimage_to_mecca';

update routes set
  gear = '["rock shoes","set of stoppers","doubles BD #0.3-#2","single #3","helmet","60m single rope"]'::jsonb,
  detailed_rack = 'Set of stoppers, doubles from BD #0.3 to #2, plus a single #3. Pitch 1 is a full 60m hand-crack/chimney-start pitch at 5.10, pitch 2 a 40m 5.9 dihedral, then 2 (sometimes a 5th) moderate 5.7-5.9 pitches to the top, ~100m+ total.',
  pro_needs = 'Sustained crack and dihedral climbing takes cams and stoppers well throughout on sound buttress rock; no fixed gear reported.',
  what_to_bring = '["helmet","approach shoes for the ~20-mile approach to Upper Cathedral Lake","light rack bag"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":6},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Pitch 1 alone is 60m, so a 60m single rope is required just to reach the belay. Descent hikes east along the crest to a small col SW of the North Ridge, then a 3rd-class gully down the north slope - no rappelling, so no need for a second rope.',
  ascender = 'Not needed',
  corrections = 'If existing data assumed a double/half rope, correct it - the descent is a walk/3rd-class gully, not technical rappels, and a single 60m rope is what the route''s own 60m first pitch calls for.'
where id = 'wa_amphitheater_mountain_middle_finger_buttress_left_side';

update routes set
  gear = '["rock shoes","doubles in the finger-to-hand range (~0.3-1)","singles to #3 for hand cracks/roofs","set of nuts","helmet","60m single rope"]'::jsonb,
  detailed_rack = 'No published trip-report rack list was found. The AAC Publications first-ascent note (Scott Bennett & Blake Herrington, 2012) describes ~160m of climbing as ''an incredible fingers-to-thin-hands splitter, then a series of left-leaning roofs, surmounted by hand cracks and jugs.'' Based on that description, expect doubles in the finger-to-hand range (roughly 0.3-1) for the splitter, plus singles up to #3 for the hand cracks, and a full nut set for the thin sections.',
  pro_needs = 'Same Middle Finger Buttress rock as the Left/Right Side routes (sound, well-protected); the roof sections will need extension/slings to manage rope drag more than hard-to-find gear.',
  what_to_bring = '["helmet","crack gloves recommended for the finger/hand splitter","approach shoes for the ~20-mile approach"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":6},{"sizeCm":120,"qty":3}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'No trip report with explicit rope beta was found (the one CascadeClimbers.com TR that logs a Finger of Fatwa ascent returned a 403 and could not be read). This route shares the same buttress and walk-off/gully descent options as Middle Finger Buttress Left/Right Side, both of which use a single 60m rope with no rappelling - treated the same here absent contrary evidence, but flagged as inferred rather than directly confirmed for this specific route.',
  ascender = 'Not needed',
  corrections = 'If existing data assumed doubled ropes here specifically, there is no source support for that; the neighboring, better-documented routes on the same buttress use a single rope with walk-off descents.'
where id = 'wa_amphitheater_mountain_finger_of_fatwa';

update routes set
  gear = '["rock shoes or sturdy approach boots","light rack of nuts","long slings","helmet","ice axe for early-season snow"]'::jsonb,
  detailed_rack = 'Mountain Project describes the rack simply as ''a light rack of nuts and long slings'' for this Grade II, 5.5, 5-7 pitch ridge route (pitch count varies with line chosen). Terrain includes sections of loose boulders.',
  pro_needs = 'Low-5th-class ridge climbing where protection is more about threading blocks/horns with long slings than placing hard gear; loose rock in sections calls for care and a helmet.',
  what_to_bring = '["helmet (loose-rock hazard specifically noted)","sturdy boots/approach shoes","ice axe for early-season snow patches on approach/ridge"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":6}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'No rappelling is reported - descent is either a walk southwest around the peak back to Upper Cathedral Lake, or a 3rd-class gully via a small col southwest of the ridge. A single 60m rope is standard; no source supports a double-rope need.',
  ascender = 'Not needed',
  corrections = 'The direct source language is ''a light rack of nuts and long slings'' - exact sling counts/sizes here are a reasonable inference from that phrase and the ridge''s wandering, block-threaded character, not a directly sourced count. If existing data listed a heavy cam rack or double ropes, that overstates what sources describe.'
where id = 'wa_amphitheater_mountain_north_ridge';

update routes set
  gear = '["rock shoes","wide range of nuts and cams","helmet","60m single rope"]'::jsonb,
  detailed_rack = 'Mountain Project''s only protection note for this Grade III, 5.9, 7-pitch route is ''wide range of nuts and cams'' - no exact sizes/counts are published. The route climbs cracks on the NW side of the buttress, starting on a steep slab with a thin vertical crack, with the crux on pitch 3.',
  pro_needs = 'No trip report with a specific gear list was found; treat exact rack sizing as inferred from the thin-crack start plus longer crack pitches - bring a fairly full single rack (nuts + cams roughly finger-to-fist) rather than a minimal one, given 7 pitches of varied crack climbing.',
  what_to_bring = '["helmet","approach shoes for the ~20-mile approach","extra layers/food - 7 pitches makes for a long day"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":8},{"sizeCm":120,"qty":3}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'No source gives explicit rope beta for this route. It shares its buttress and likely descent options (walk to saddle, or col + 3rd-class gully) with the Left Side and North Ridge routes, both of which use a single 60m rope with no rappelling - applied here by inference, not direct confirmation.',
  ascender = 'Not needed',
  corrections = 'If existing data invented specific cam counts/sizes beyond MP''s generic ''wide range of nuts and cams,'' those numbers are not source-backed and should be treated as inferred, not verified.'
where id = 'wa_amphitheater_mountain_middle_finger_buttress_right_side';

update routes set
  gear = '["rock shoes","wires (full nut set)","doubles from tips to #2","single #3 cam","single #4 cam","60m single rope","helmet"]'::jsonb,
  detailed_rack = 'Full set of wired nuts plus cams doubled from the smallest sizes (''tips'') up through BD #2, with a single #3 and single #4 for the hand-crack/chimney exit pitches shared with Middle Finger Buttress - Left. Crux pitch 2 (ringlock/stem corner, 5.11c) and pitch 3 (underclings/roofs, 5.11b) take small-to-mid cams; upper pitches 4-5 are hand cracks and blocky terrain joining Middle Finger Buttress - Left.',
  pro_needs = 'Continuous crack protection reported on all 5 pitches; gear is generally plentiful along the ringlock/stem-corner and hand-crack systems, though a 2018 trip report noted the cracks were ''pretty dirty'' in places, which can slow placements. No runout sections documented.',
  what_to_bring = '["approach shoes for the 20-mile approach","backpacking/camp gear (multi-day approach)","helmet","headlamp","sun protection","trekking poles"]'::jsonb
where id = 'wa_finger_of_fatwa';

update routes set
  gear = '["approach/light rock shoes","light rack of nuts","long slings (120cm)","a few small-to-mid cams (optional)","60m single rope","helmet"]'::jsonb,
  detailed_rack = 'Mountain Project describes only ''a light rack of nuts and long slings'' — no cam sizes, nut counts, or rope length are specified in any source found. A minimal nut set plus several 120cm slings for slinging horns/blocks on the loose, blocky ridge steps is the documented approach; a few small-to-mid cams are a reasonable addition for the harder 5.5 steps but are not independently confirmed by any trip report.',
  pro_needs = 'Protection is sparse and mostly natural (horns, chockstones, threads) between short, steep gully/step sections. Route-finding and loose rock are bigger hazards than protection scarcity; much of the route is only 3rd-4th class between the roped 5.5 steps and can be simul-climbed or scrambled with minimal gear.',
  what_to_bring = '["helmet (loose rock)","trekking poles for the long approach/scramble","backpacking/camp gear (20-mile approach)","sun protection","sturdy approach shoes for scrambling sections"]'::jsonb
where id = 'wa_north_ridge_8';

update routes set
  gear = '["rock shoes","wide range of nuts and cams (doubles through #3)","60m single rope","helmet"]'::jsonb,
  detailed_rack = 'Mountain Project''s route description only says ''wide range of nuts and cams'' with no specific sizes or counts. Based on the neighboring routes on the same buttress complex (Middle Finger Buttress - Left: stoppers + doubles #0.3-#2 + a #3; Finger of Fatwa / Pilgrimage to Mecca: doubles to #2-3 plus a #4), a comparable rack — full nut set, cams doubled from small through #3 — is a reasonable inference for this 7-pitch route, but no route-specific trip report with exact sizes/counts was found.',
  pro_needs = 'Route follows crack systems on the NW side of the buttress for 7 pitches with a short crux on pitch 3 (begins on a steep slab with a thin vertical crack). Gear appears continuous along the crack systems per the route description, though no trip report confirms placement density or scarcity.',
  what_to_bring = '["approach shoes for the 20-mile approach","backpacking/camp gear","helmet","sun protection","trekking poles"]'::jsonb
where id = 'wa_middle_finger_buttress_right_side';

update routes set
  gear = '["rock shoes","set of stoppers","doubles BD #0.3-#2","single #3 cam","60m single rope","helmet"]'::jsonb,
  detailed_rack = 'Mountain Project specifies: set of stoppers, doubles from BD #0.3 to #2, plus a single #3. Pitch 1 (the hand-crack crux, called one of the best 5.10 corner pitches in the Cascades) is where most of the doubled mid-size cams get used; upper pitches (5.7-5.9, non-sustained) take less gear. A single #4 is not listed by MP for this route specifically, though it''s worth carrying if also linking into Finger of Fatwa''s shared upper pitches, which do call for a #4.',
  pro_needs = 'Pitch 1 (hand crack/chimney start, the route''s crux and highlight) is well protected by the doubled 0.3-2 cams. Upper pitches are easier and less sustained (5.7-5.9), needing less gear per pitch.',
  what_to_bring = '["approach shoes for the 20-mile approach","backpacking/camp gear","helmet","sun protection"]'::jsonb
where id = 'wa_middle_finger_buttress_left_side';

update routes set
  gear = '["rock shoes","doubles BD #0.3-#2","single #3 cam","single #4 cam","full set of nuts","a few small cams","60m single skinny rope (~8.7mm)","12-14 slings","helmet"]'::jsonb,
  detailed_rack = 'Direct 2024 trip report (rocknropenw.com): single BD #4 and #3, doubles of BD #2 through #0.3, a single #0.2, a full set of nuts, and 12-14 slings (~10 single-length 60cm + 4 double-length 120cm). The #4 is explicitly called out as required (''definitely'' needed), not optional — a second #3 is noted as nice-to-have but not necessary. This closely matches Mountain Project''s own listing (''doubles from .3-3, one #4, set of nuts, a few small cams'').',
  pro_needs = 'All anchors are gear anchors (no fixed anchors) — build every belay from the rack. Rock quality is described as excellent throughout, especially the pitch-3 ''money pitch'' finger-crack layback corner. P1 has a triple-crack system with a roof, P2 a thin flake/layback corner, P4 an offwidth-or-crack option to a secure belay ledge; in wet conditions P4 has forced parties onto a harder ~5.10b crack variation.',
  what_to_bring = '["approach shoes/backpacking gear for the 20-mile approach","helmet","trekking poles","sun protection","a skinny single rope (8.5-9mm) for weight savings on the long approach"]'::jsonb
where id = 'wa_pilgrimage_to_mecca';

update routes set
  gear = '["helmet","approach shoes or light rock shoes","light alpine rack (small cams/nuts)","30-40m rope for short technical section/rappel","harness"]'::jsonb,
  detailed_rack = 'No trip-report or guidebook source could be found describing this specific route''s gear. Based on the stated ''Class 4 / low 5th'' grade, a minimal rack is what the terrain implies: a few small-to-mid cams (roughly 0.3-1in) and 2-3 nuts to protect the brief low-5th move(s), plus a small handful of slings for a belay/rappel anchor. There is no basis for anything larger or for doubled gear — this is an inference from grade/terrain, not a verified rack list.',
  pro_needs = 'Protection is likely sparse and largely optional across the Class 4 majority of the route, needed mainly to back up the short low-5th crux move(s) or to build a rappel/belay anchor. No source confirms rock quality; treat any natural gear placements on this kind of small, lesser-documented Cascades summit with caution (loose/lichen-covered rock is common on obscure alpine towers) until party-specific beta is available.',
  what_to_bring = '["helmet (loose rock is typical on unmaintained Class 4 terrain)","sturdy approach shoes with good scrambling grip","light rack as above","short rope (30-40m) for the technical section and any rappel","map/compass or GPS — route-finding on an obscure, sparsely documented summit is likely the real crux","extra time buffer for navigation uncertainty"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'No rappel/descent beta was found for this route. A single rope is assumed standard for a short Class 4/low 5th route (no evidence supports needing doubles); a 30m length is a conservative inference for protecting a brief technical section and a short rappel, not a confirmed figure — verify actual rappel length before relying on a short rope.',
  ascender = 'Not needed',
  corrections = 'The existing gear/detailedRack/proNeeds text for this route is flagged as AI-generated placeholder (autoGenerated=true) and could not be verified: exhaustive searching across Mountain Project, SummitPost, CascadeClimbers, Peakbagger, WTA, NWHikers.net, AAC/AAJ, StephAbegg, and ClimberKyle turned up no trip report, route description, or database entry for a Washington North Cascades peak/route named ''Anderson''s Thumb'' at ~6,785 ft. All fields above are a conservative inference from the stated ''Class 4 / low 5th'' grade only — recommend flagging this peak/route for verification of its name, location, and existence before further gear enrichment, since it may be a very obscure/locally-named feature with no public documentation, or a naming/data-entry issue.'
where id = 'wa_andersons_thumb_standard';

update routes set
  gear = '["rock shoes","helmet","rack of nuts and cams to ~3in with doubles in finger-to-hand sizes","60m single rope","alpine quickdraws","approach shoes/boots for the cross-country approach"]'::jsonb,
  detailed_rack = 'Mountain Project''s route page (FA July 1975) describes protection only as ''a wide selection of nuts/cams'' for this 7-pitch, Grade II buttress — no trip report gives an exact piece-by-piece list, and none could be found despite extensive searching (this route has essentially no online trip-report history). Based on the comparable granite buttress routes nearby in the same range (Cathedral Peak''s SE Buttress and Middle Finger Buttress, which run similar crack systems on the same alpine granite), a single set of stoppers plus cams from finger to hand size (roughly 0.4-3in / BD 0.3-3 equivalent) with doubles in the 0.75-2in range is a reasonable rack; there are no reports of offwidth or wide-crack sections on Apex Buttress specifically, unlike Cathedral''s SE Buttress which needs a #4/#5 for one pitch.',
  pro_needs = 'Protection is described in the only available source as ''a wide selection of nuts/cams'' with no gaps or run-outs called out. Granite crack systems on this range''s buttress routes generally take gear well; given the total lack of trip reports for this specific route, treat this as a lightly-traveled, self-sufficient alpine objective and rack conservatively rather than relying on fixed gear (there is none).',
  what_to_bring = '["approach shoes/boots for the long cross-country approach from Apex Pass or Tungsten Mine","helmet","rack (see rack notes) plus rock shoes","layers for alpine weather at ~8,300ft","bivy/overnight gear if not done car-to-car given the remote, multi-day approach","this is a very rarely climbed, remote route — expect to be self-reliant with no beta on rappel stations or bail options"]'::jsonb
where id = 'wa_apex_buttress';

update routes set
  gear = '["rock shoes","helmet","rack to 3in (single set nuts + cams)","60m single rope","4-6 alpine slings","approach/mountaineering boots for the col approach"]'::jsonb,
  detailed_rack = 'Single set of nuts and cams from finger-size through ~3in covers the ridge''s crack and corner systems; nothing larger is reported as needed. The East Ridge is most commonly encountered as the standard rappel descent off the Northwest Arete (Argonaut-Colchuck Col in 4 rappels) with established anchors found at each station, so bring cordelette/webbing to back up or replace tat if worn.',
  pro_needs = 'Protection is moderate and intermittent on 4th-to-low-5th ridge terrain; multiple trip reports describe finding rappel anchors ''as hoped'' along the ridge, implying stations are already equipped and spaced for single-strand rope lengths. A distinct winter/mixed variant (East Ridge to a crossover into the NE Couloir) exists and is far more serious, requiring rock pro placed to protect wind-slab traverses plus ice tools/crampons — that is NOT the standard 5.6 summer rock route and should not be conflated with it.',
  what_to_bring = '["helmet (rockfall/chossy sections reported nearby)","approach shoes for the talus/scramble approach","headlamp (parties report ~4-5.5hr descents, full-day car-to-car)","light rock rack rather than a heavy trad rack"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Descent (and the standard connector use of this ridge) is done via established single-strand rappel stations — trip reports repeatedly describe finding rap anchors on the ridge and executing single-rope raps, not full-length double-rope raps. A single 60m rope is standard; double ropes are only clearly justified for the harder winter East Ridge/NE Couloir mixed variant, not the summer 5.6 rock route.',
  ascender = 'Not needed',
  corrections = 'If the prior auto-generated text implied a double/half-rope requirement or a large rack, that overstates it: real trip reports (NW Arete descents via this ridge, a 2024 winter TR) consistently describe single-strand rappels off pre-existing stations and a light-to-moderate rack (nuts, cams to ~3in). No source supports needing doubled ropes for the standard summer ascent/descent.'
where id = 'wa_argonaut_peak_east_ridge';

update routes set
  gear = '["approach shoes/light rock shoes","helmet","small rack (nuts + cams to ~2in)","60m single rope (or shorter, e.g. 30-40m, given only one technical pitch)","1-2 slings"]'::jsonb,
  detailed_rack = 'A light rack suffices — a single set of small-to-mid nuts and cams (roughly finger to 2in) is enough for the one low-to-mid-5th-class pitch that guards the final gully exit near 7,850ft. The rest of the route (from the Colchuck-Argonaut saddle up the ridge crest, traversing right below the crest) is Class 3-4 scrambling with no sustained protectable terrain reported.',
  pro_needs = 'Protection needs are minimal — most parties describe this as a scramble with a single crux pitch of low-to-mid 5th class rock guarding a loose, rubble-filled exit gully near the top. A 2024 party turned back at this gully lacking technical gear/rope, underscoring that a rope and a small rack (not just scrambling gear) should be carried even though most of the route is Class 4.',
  what_to_bring = '["helmet (loose rubble reported in the summit gully)","ice axe if snow lingers on the approach through Porcupine Basin/the saddle","light alpine rack rather than a full trad kit"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Only one pitch of real technical difficulty (low-mid 5th class) is reported near the top; a single rope is standard and sufficient — no source describes multi-rappel descents specific to this ridge that would require doubled rope. A shorter rope (30-40m) could suffice given how little of the route is roped, but 60m is the safer general-purpose choice for any rappel option off the summit.',
  ascender = 'Not needed',
  corrections = 'If prior auto-generated text assumed a substantial trad rack or double-rope system typical of longer alpine routes, that overstates this route''s character: sourced trip reports describe it as predominantly Class 3-4 scrambling with a single low-5th-class crux, not a sustained multi-pitch technical climb.'
where id = 'wa_argonaut_peak_northeast_ridge';

update routes set
  gear = '["rock shoes","helmet","rack to 3in with doubles 0.5-2in","single 60m rope","4-6 alpine slings/draws","ice axe + crampons for the snow-finger approach (early/mid season)"]'::jsonb,
  detailed_rack = 'Beckey''s guide lists the route as 6-8 pitches of Class 4 to 5.6; parties report placing only 2-3 pieces per pitch on generally moderate, blocky-but-not-sustained rock, so a single set of nuts plus a light set of cams (roughly 0.5-2in, doubled in common finger-to-fist sizes) covers it — no source calls for anything above ~3in. One party found sections wetter/mossier than expected running closer to 5.8+, so don''t undercount finger-size gear for shaded, lichen-covered stretches.',
  pro_needs = 'Gear is moderate but not plentiful — 2-3 placements per pitch is typical, consistent with ''straightforward route-finding'' on solid-but-not-sustained rock. Watch for wet, mossy rock reducing both friction and placement quality on shadier pitches; rock quality is otherwise good granite.',
  what_to_bring = '["ice axe and crampons for the snow finger below the route (can be firm/intimidating late season)","helmet","bivy gear if doing it as a 2-day trip (standard recommendation)","approach shoes for the Stuart Lake Trail approach"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'The standard descent from the east ridge to the Argonaut-Colchuck Col is 4 rappels, and multiple trip reports describe single-strand raps off found anchors (''a single rope rap'', anchors on trees/rock along the ridge). A single 60m rope is the standard, sufficient choice. Two lightweight parties chose to climb on a doubled thin rope (8mm x50m or 60m twin doubled) purely for speed/weight savings while simul-climbing — that''s a personal ultralight tactic, not evidence the route requires a genuine half/twin rope system.',
  ascender = 'Not needed',
  corrections = 'No major correction to existing curated data — this refines it with sourced specifics (2-3 placements/pitch, 4-rappel standard descent, snow-finger approach gear, and clarification that reports of ''doubled'' thin ropes reflect a lightweight tactic rather than a true double-rope requirement).'
where id = 'wa_northwest_arete';

update routes set
  gear = '["rock shoes","helmet","small-to-mid rack (nuts + cams ~0.4-2in)","60m single rope","webbing/cordelette for the crux belay/rap anchor"]'::jsonb,
  detailed_rack = 'Short route — 300ft/3 pitches of blocky Class 5.6 on generally good granite directly below the summit. A single set of nuts plus cams in the 0.4-2in range (with extra pieces in the 0.75-1in range, reported as the most useful crux size) is sufficient; no source describes needing anything larger. Bring webbing or a cordelette specifically for building/backing up the crux-pitch anchor.',
  pro_needs = 'Protection is adequate in the crack/corner systems on this face (start in a short left-facing corner and follow cracks up), but rock quality is inconsistent — good overall, with reported loose blocks near the base, so test holds low on the route. The face is wide enough that parties pick their own line (''climb anywhere on this face''), so exact placements vary party to party.',
  what_to_bring = '["helmet (loose blocks reported near the base)","approach shoes for the talus gully to the wall base","light rack rather than a heavy trad kit given the short 3-pitch length"]'::jsonb
where id = 'wa_south_face_12';

update routes set
  gear = '["sturdy hiking boots (insulated mountaineering boots in winter/spring)","ice axe","crampons or microspikes (winter/spring snow conditions)","helmet","trekking poles","snowshoes (when approach snow is unconsolidated)"]'::jsonb,
  detailed_rack = 'No roped rock rack is used on this route. Arrowhead''s South/standard route is a non-technical Class 2-3 scramble — travel is on logging road, open clearcut, ridge, and a short rocky summit step, with no crack systems or fixed anchors that parties place gear in. Every trip report reviewed (Mountaineers, WTA, SummitPost, CascadeClimbers, Wenatchee Outdoors) describes it as unroped; no cams, nuts, or rope appear in any gear list. The route is most commonly climbed Dec-April as a winter/spring snow scramble, in which case an ice axe and crampons (or microspikes, swapped depending on snow firmness) substitute for a rock rack as the real protection system, used for self-arrest and traction on the steep upper ridge (~5,100ft+) and near tree wells/cornices. A summer ascent (July-Aug) trades snow travel for brush/talus and the same short Class 3 rock step, typically done in approach shoes with hands only.',
  pro_needs = 'No fixed or removable rock protection is placed — this is an unroped scramble, not a roped climb. In winter/spring conditions, self-arrest with an ice axe is the primary safety system on the steep upper ridge, and crampons provide the real ''protection'' on hard, icy, wind-swept snow. The Class 3 summit rock step is short and low-angle; parties comfortable with exposed unroped scrambling solo it without gear. Rock quality on the short summit block was not specifically characterized as loose or solid in any source found — treat with normal alpine caution for an unfrequented Cascades summit block.',
  what_to_bring = '["map, compass, and altimeter or GPS — clearcuts, logging roads, and open ridge terrain are easy to lose in poor visibility","headlamp — several trip reports logged 6-7.5+ hour car-to-car days","avalanche safety gear (beacon, probe, shovel) for winter/spring ascents — sources disagree on how avalanche-exposed the standard route is (one TR calls it ''avalanche-safe'', others describe ''considerable avalanche terrain'' on nearby lines), so carry standard winter travel gear and judgment","gaiters","wind layers for the exposed upper ridge"]'::jsonb
where id = 'wa_arrowhead_mountain_south_route';

update routes set
  gear = '["glacier travel kit: crampons, ice axe, glacier harness","light rock rack ~0.3–2in cams, no nuts","few long (120cm) slings + 6mm cordelette for rap anchor","30–60m single rope","helmet","crevasse rescue kit (prusiks)"]'::jsonb,
  detailed_rack = 'Very light rack: parties recommend roughly 0.3–2in cams (about 4–5 pieces spanning small-to-medium sizes), with no nuts needed — the chockstone chimney (5.2, ~60ft) and the return traverse''s 75ft of 5.5 climbing both take small/medium cam placements. Bring a handful of long (120cm) slings to extend over rime/verglas-prone rock and reduce rope drag on the wandering sections, plus a retrievable 6mm cordelette (~18–20ft) to build the rappel anchor at the 7,900ft notch on the Klawatti-Austera col/north ridge of Klawatti.',
  pro_needs = 'Protection is sparse but sufficient given the short technical sections: the crux chimney and the 75ft of 5.5 on the return are described as ''well-protected'' by real parties, but rock is loose in places (typical North Cascades choss) so test placements. The final ~150ft of 4th/low-5th class scrambling to the true summit is commonly soloed or simul-climbed with minimal gear placed — don''t expect to protect every move.',
  what_to_bring = '["crampons","ice axe (lightweight 50-70cm)","glacier travel harness","crevasse rescue kit (prusik cords / pulley)","mountaineering boots (crampon-compatible) for upper mountain; approach shoes usable on lower glacier after mid-July","climbing helmet","sun protection for long multi-glacier traverse (Inspiration, McAllister, Klawatti glaciers)","camp gear for multi-day approach (Eldorado Basin ~6,000ft, Roush Basin ~6,300ft, or Klawatti Col ~7,800ft camps)"]'::jsonb,
  sling_rack = '[{"sizeCm":120,"qty":3},{"sizeCm":60,"qty":2}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Mountain Project''s route description explicitly calls for a ''30-60M rope'' with a light rack — not a double-rope setup. There is one rappel of ~75ft (about 23m) down to the Klawatti Glacier from the ridge notch, well within single-strand range on a 60m rope; a 70m works too if carried for other reasons. No source supports carrying half/twin ropes on this route — if the prior autoGenerated text specified double ropes, that was an unsupported generic-alpine assumption and should be corrected to a single 60m rope.',
  ascender = 'Prusik cords only',
  corrections = 'The prior auto-generated gear text (flagged autoGenerated:true) needed verification and was too generic/overstated for this specific route. Cross-checking Mountain Project''s actual route beta and a detailed BC Adventure Guides trip writeup shows: (1) the rack is much lighter than typical alpine boilerplate — roughly 0.3–2in cams only, with no nuts, not a full rack ''to 3 inches''; (2) a single 30-60m rope is standard (one ~75ft single-strand rappel), with no support anywhere for a double/half-rope system; (3) technical difficulty is concentrated in two short sections (5.2 chimney, 75ft of 5.5) bracketing mostly glacier travel and 4th-class scrambling, so gear needs are sparse relative to the route''s overall length and remoteness.'
where id = 'wa_austera_peak_southwest_ridge';

update routes set
  gear = '["helmet (loose choss/rockfall)","ice axe (early/late-season snow runnels only)","sturdy scrambling boots/approach shoes","optional 30-60m rope + harness for upper gully rappel"]'::jsonb,
  detailed_rack = 'No technical rock rack is carried on this route — it is an unroped Class 3-4 scramble on loose, quickly-disintegrating granite/basalt. No trip report describes placing cams, nuts, or any fixed protection anywhere on the South Ridge or Southwest Gully lines. The only rope use noted is an optional single-strand or doubled rappel of the loose upper gully below the summit tower (some parties down-climb it instead), for which a harness, rappel device, and a couple of slings/webbing for a natural (rock horn/chockstone) anchor are sufficient — there are no reports of fixed/bolted rap anchors.',
  pro_needs = 'Essentially no placed protection on this route; it is climbed as an unroped scramble. Rock is loose, weathered, and chossy (granite disintegrating to pebbly sand lower down, harder basalt higher), so protection would be unreliable even if desired — parties instead manage exposure by route-finding around the worst sections and downclimbing conservatively. If rappelling the upper gully, build a natural anchor (sling around a horn/chockstone); no bolted or fixed anchors are reported.',
  what_to_bring = '["ice axe (glissade/snow-runnel crossings in early/late season; often unnecessary by mid-late summer)","crampons only if climbing in early/late season snow conditions","helmet for rockfall/looseness","trekking poles for the long approach and scree/talus","optional 30-60m rope + harness + rappel device for the upper gully","layers/wind protection for the exposed ridge and summit tower","overnight/backpacking gear if doing the standard 2-day approach via Azurite Pass"]'::jsonb
where id = 'wa_azurite_peak_southeast';

update routes set
  gear = '["mountaineering boots","crampons","ice axe","helmet","snowshoes (useful into early summer)","glacier-travel rope + basic crevasse-rescue kit","harness"]'::jsonb,
  detailed_rack = 'No technical rock rack is needed — this is a Class 2-3 snow/glacier mountaineering route, not a roped rock climb. No cams, nuts, or pitons are used or reported by any party. Multiple trip reports (Steph Abegg, One Hike A Week, trailcatjim.com/Jim Brisbine) describe dirt/scree gullies with loose rock on the lower south approach and open, generally low-angle glacier/snow slopes above — none describe placing rock protection. Carry a thin glacier-travel rope (roughly 30m per 2-3 person rope team) and a basic crevasse-rescue kit (harness, 2-3 prusik cords or a Tibloc/Micro Traxion, small pulley, a few locking biners and slings) for the Diobsud Creek Glacier and Green Lake Glacier crossings.',
  pro_needs = 'No fixed rock protection is needed or used on this route — it is snow/glacier travel with a brushy/loose-rock approach gully, not technical rock climbing. Crevasse hazard on the Diobsud Creek and Green Lake Glaciers is real but variable by season: multiple trip reports describe crossing unroped when the glacier is well filled-in with no visible cracks (onehikeaweek.com: ''no visible crevasses... probing for crevasses'' as a precaution; Jason Hummel''s account of a nearby route mentions crossing a moat), while a Steph Abegg report from a slightly later-season visit specifically notes crevasses ''beginning to open up'' and hidden snow bridges, prompting the party to parallel crevasse lines carefully. A thin glacier rope and basic crevasse-rescue kit (prusiks or a Tibloc-style device) is the prudent standard setup rather than a rock rack; The Mountaineers'' guided trips to this peak also require crevasse-rescue proficiency and standard glacier gear.',
  what_to_bring = '["mountaineering boots","crampons","ice axe","helmet","snowshoes (spring/early-summer approach)","glacier rope + crevasse-rescue kit (harness, prusiks/Tibloc, pulley, locking biners)","trekking poles (brushy/loose lower approach)","gaiters","sun protection/glacier glasses (open glacier exposure)","overnight camping/bivy gear (most parties do this as a 2-day trip with a camp near Green Lake or the Diobsud/Bacon Tarns basin)"]'::jsonb,
  sling_rack = '[{"sizeCm":120,"qty":2},{"sizeCm":60,"qty":2}]'::jsonb,
  alpine_draws = null,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'No rappelling occurs on this route — descent is via glissading/walking down the Green Lake Glacier snow slopes, not rope-assisted rappels, so there is no basis for a ''double rope'' rappel setup as the prior auto-generated text may have implied. A single lightweight glacier-travel rope (~30m, often carried in coils between 2-3 climbers) is the standard tool here, used for glacier-crossing security and potential crevasse rescue, not for climbing pitches or raps. Several trip reports describe experienced parties crossing unroped in low-crevasse-hazard (well snow-filled) conditions, but carrying the rope + crevasse-rescue kit is the safe default given documented open crevasses and a moat in other-season reports.',
  ascender = 'Prusik cords only',
  corrections = 'Existing auto-generated gear/rack text appears to have treated this as a roped technical alpine rock route (implying a climbing rack and/or double ropes for rappelling). No trip report found describes any technical rock climbing, fixed rock protection, or rappelling on this route — it is Class 2-3 terrain: steep dirt/scree/loose-rock gullies on the south approach (per trailcatjim.com) up to a southeast ridge, then open snow/glacier slopes on the Diobsud Creek Glacier and descent via Green Lake Glacier''s snow slopes (per SummitPost and stephabegg.com). The appropriate ''rope'' for this route is a lightweight glacier-travel rope plus a basic crevasse-rescue kit — not a rock rack or doubled ropes for rappelling.'
where id = 'wa_bacon_peak_diobsud';

update routes set
  gear = '["helmet","ice axe","microspikes or crampons (early-season/lingering snow)","trekking poles","sturdy mountaineering boots"]'::jsonb,
  detailed_rack = 'No technical rock rack is used on the standard North Ridge route — this is an unroped scramble, not a roped climb. No cams, nuts, or slings are placed. Multiple trip reports describe the route as forested ridge travel with brush, a short crampon-and-helmet bypass gully around a cliff band near 5,400 ft, and an exposed summit ledge traverse — none involve gear placements.',
  pro_needs = 'None — no fixed or removable protection is used. The only protective gear is a helmet for the loose-rock cliff-bypass gully (~5,400 ft) and traction (ice axe + crampons/microspikes) for lingering snow on the upper ridge, which can persist into summer on north-facing slopes.',
  what_to_bring = '["helmet","ice axe","microspikes or crampons for spring/early-summer snow","trekking poles","map/GPS (brushy, route-finding-heavy lower ridge)","plenty of water — no reliable water source on the north ridge"]'::jsonb
where id = 'wa_bald_eagle_peak_scramble';

update routes set
  gear = '["sturdy hiking/scrambling boots","trekking poles","helmet (loose rock near summit block)","map/compass or GPS (route becomes faint above treeline)"]'::jsonb,
  detailed_rack = 'No technical rack needed - this is a hike/scramble with no roped climbing. The route follows the Upper Maynard Burn Trail or the older Baldy Trail from the Slab Camp/Deer Ridge trailhead area, gaining a ridge crest via steep, sometimes faint tread through subalpine meadows and scree/talus to the Baldy summit block. No cams, nuts, or fixed anchors are used or needed by parties climbing the standard route.',
  pro_needs = 'None - no protection is placed on the standard route; it is unroped talus/scree hiking and scrambling. Rockfall/loose rock is the main hazard rather than a lack of protection quality, so party spacing and helmets matter more than rack size.',
  what_to_bring = '["map and compass or GPS - the boot path fades above treeline and in the summit meadows","trekking poles for the sustained steep grade (route gains ~3,000-3,400 ft)","helmet for the loose rock/scree near the summit","ice axe and microspikes if climbing in spring/early season when snow patches remain on the upper slopes/ridge","sun protection - much of the route is above treeline on an exposed ridge","ample water - no reliable water source high on the route"]'::jsonb,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'No rope is carried on the standard route - it''s an unroped Class 1-2 hike/scramble to a talus/scree summit with no rappels or exposed technical pitches. Not applicable.',
  ascender = 'Not needed',
  corrections = 'The existing auto-generated gear/detailedRack/proNeeds text implied a technical rack was relevant; that''s wrong for this peak. Baldy (6,808'', Gray Wolf Ridge, Olympic Mountains near Sequim, via Slab Camp/Baldy Trail or Upper Maynard Burn Trail) is a non-technical Class 1-2 hike/scramble. WTA''s official route page explicitly rates it ''Hard'' for fitness/navigation but states ''no technical gear required.'' There is no rope, rack, protection, or sling need on the standard summer route - the only gear items that matter are footwear, poles, navigation, and a helmet for the loose rock near the summit block. Ice axe/microspikes are situational (only relevant if snow lingers into the route in spring/early summer per a January Mountaineers winter-scramble trip report), not core standard-route gear.'
where id = 'wa_baldy_standard';

update routes set
  gear = '["sturdy hiking boots with ankle support","ice axe (spring/early-summer snow gully)","helmet (loose rock/rockfall)","trekking poles","optional light 30m rope + a few slings for belaying wet class-4 moves"]'::jsonb,
  detailed_rack = 'No technical rack is needed for typical dry-condition ascents. This is an unroped Class 3-4 scramble up a brushy climber''s trail, a snow/talus gully, and heather/talus slopes to the north/south peak notch, then easy scrambling to the summit. In early season or after rain the gully holds snow (ice axe, plus crampons/microspikes if firm), and a few multiple sources note that when the summit-block heather is wet some parties choose to rope up for the class-4 moves — in that case a short 30-40m single rope with a handful of slings/small nuts is enough; this is not a route with an established protection rack.',
  pro_needs = 'Protection is essentially optional here — the terrain is loose/brushy/vegetated rather than clean rock, so any gear carried is for psychological security on one or two exposed class-4 steps, not for sustained protection. Most parties climb it entirely unroped in dry summer conditions.',
  what_to_bring = '["helmet","ice axe (spring/early summer snow)","microspikes or crampons if the gully is icy/firm","trekking poles","gaiters","sun and rain protection","the ten essentials","sturdy boots with ankle support"]'::jsonb
where id = 'wa_baring_mountain_south_route';

update routes set
  gear = '["rock shoes (carried for the technical headwall pitches)","helmet","single alpine trad rack to 3in with extra small-to-medium cams (0.5-1.5in)","single 60m rope","sturdy approach shoes/boots for ~1000ft of brush and heather below the rock","a few slings for anchors — do not trust old fixed pitons in place"]'::jsonb,
  detailed_rack = 'No published trip report gives an exact cam-by-cam list for this specific route, so this is a reasoned inference from route character rather than a direct source: hard ''Rhino Stone'' granodiorite similar to nearby Index cracks, a single ~5.10c crux headwall pitch, with the rest of the roughly 1000ft of technical climbing more moderate (5.6-5.9). A single alpine rack from small nuts through 3in cams, doubled in the 0.5-1.5in hand/finger range where the crux crack likely lies, is a reasonable standard rack. The route is notorious for poor fixed gear from its 1960s-70s first-ascent efforts — a 2013 party described the old pitons as ''pathetic pins about to fall out of the wall'' — so any in-place pin should be treated as backup only, never primary protection.',
  pro_needs = 'Protection is sparse and the few fixed pitons left from early ascents are unreliable, but the rock itself on the headwall is described as solid with real gear options (''the rock is good and there are some options for pro'' — 2013 ascent report). This is not a bolted line; it is a serious, committing alpine rock route requiring confidence placing your own trad gear well above a long brushy/heathery approach.',
  what_to_bring = '["helmet","rock shoes","sturdy approach footwear for brush/heather approach","headlamp","extra water (long approach and day)","light bivy gear if treating it as an overnight (historically climbed over multiple days; strong modern parties do it car-to-car)","no glacier-travel gear needed — route has no glacier"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":6},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Modern moderate ascents (e.g. a 2013 trip report) describe this as climbed with a single rope, with no long free-hanging rappels — the standard descent is a walk-off via Baring''s southeast/south ridge (the same ridge terrain used descending the South Route), not rappelling the face. A single 60m rope is standard for the roped climbing on the headwall.',
  ascender = 'Not needed',
  corrections = 'If the existing (AI-generated) data assumed a double/half-rope rappel system — typical boilerplate for ''grade IV-V alpine'' routes — that is not supported by sourced accounts: real trip reports describe a single rope and a walk-off descent, not face rappels. Also important: this catalog entry (Grade IV-V, steep alpine rock/mixed) corresponds to the older, historic North Face route (Cooper-Gordon-Beckey, first ascent 1961) that modern parties now climb in a single long day as a serious trad route with a 5.10c-ish crux — it is a distinct, much easier line than ''Vanishing Point'' (5.12b, 20-pitch bolted route on Dolomite Tower on the same wall), which should not be conflated with this route''s data. A Mountain Project page titled ''North Face'' (route ID 109059579) was checked and confirmed to actually be on Kangaroo Temple, a different WA peak — it was NOT used as a source here.'
where id = 'wa_baring_mountain_r1';

update routes set
  gear = '["rock shoes","helmet","60m single rope","rack to 3in with cams doubled on 0.5/0.75/1/2in","stoppers/nuts","ice axe","crampons"]'::jsonb,
  detailed_rack = 'Single rack of cams from small (~0.4in) up to 3in max, DOUBLED on the 0.5in, 0.75in, 1in, and 2in sizes — this specific doubling comes directly from a route-focused trip report/gear list (stephabegg.com), not a generic guess. Bring a set of stoppers/nuts for thinner, more delicate placements on the 5.6-5.10a pitches. No pitons needed on modern ascents (historic 1960s FA account mentions pins, but current parties climb it clean).',
  pro_needs = 'Protection is generally adequate on the upper buttress''s crack systems across the 7 pitches (5.6-5.10a); doubled mid-size cams (0.5-2in) cover the bulk of placements, with the 5.10a section being the crux and best-protected pitch. The approach glacier couloir below the buttress crest is loose, unprotectable 4th-class snow/rock/debris terrain with rockfall exposure — no gear is placed there, move efficiently and avoid lingering below parties.',
  what_to_bring = '["ice axe","crampons","helmet (rockfall risk in approach couloir)","bivy/camping gear for the 2-3 day approach","food and fuel for a multi-day trip","water treatment (approach is via Chilliwack River Trail, largely unmaintained past the US/Canada border)"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":6},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Descent from the North Buttress (Beckey/Fielding 1967 route, aka ''North Face Buttress'') is a 3rd/4th class scramble/walk back to camp per trip reports — no technical rappels are documented on the standard descent, so a single 60m rope is standard; doubles/half ropes are unnecessary unless bailing mid-route.',
  ascender = 'Not needed',
  corrections = 'Existing gear text was flagged auto-generated/unverified. Verified against a route-specific trip report (Steph Abegg): the correct rack is doubles on 0.5, 0.75, 1, and 2in cams up to 3in max (not a vague ''rack to 3 inches'' with no doubling detail), and the rope is a SINGLE 60m rope, not double/half ropes — descent is a 3rd/4th class walk/scramble back to camp with no technical rappels documented, so there is no reason to carry doubles. Also confirmed the approach ''glacier couloir'' is loose, unprotectable 4th-class snow/rock/debris terrain (rockfall hazard, move fast) rather than crevassed glacier travel requiring a crevasse-rescue kit.'
where id = 'wa_bear_mountain_chilliwack_north_buttress';

update routes set
  gear = '["rock shoes","helmet","60m single rope","full rack to BD #4 with doubles of mid-range cams","many slings/long runners","crampons","lightweight ice axe"]'::jsonb,
  detailed_rack = 'Full rack from small nuts/finger-size cams up through a BD #4 (~4in) — the #4 is specifically noted as ''helpful on the lower crux.'' Bring doubles of the mid-range cams (roughly 0.4-2in) to cover sustained, varied crack sizes across the route''s 21 pitches, including the P3 5.10- roof and the awkward P16a 5.10- offwidth (harder with a loaded pack).',
  pro_needs = 'Protection is generally good throughout on solid Cascades rock, with doubled mid-size cams covering most placements and the BD #4 specifically useful low on the route. Watch the P6 leftward traverse past loose blocks — described as ''sketchy'' and a real rockfall hazard, protect and communicate carefully there. Upper pitches can be wet from snowmelt depending on season.',
  what_to_bring = '["crampons","lightweight ice axe (helpful for a steep snow section near the route base, not mandatory)","helmet","multi-day bivy/approach gear (2-3 day approach via the largely unmaintained Chilliwack River Trail past the US/Canada border)","extra water capacity (upper-pitch snowmelt is unreliable)"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":10},{"sizeCm":120,"qty":3}]'::jsonb,
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'The route tops out on the ridge where climbers stash rack/rope, scramble to the summit, then walk off via snow slopes and cliff bands back to camp — no technical rappels on the standard descent. Mountain Project''s route notes and trip reports agree a single 60m rope is standard and sufficient; this was already correct in the existing data.',
  ascender = 'Not needed',
  corrections = 'Existing manually-curated entry (autoGenerated:false) checked out well against current sources — no double-rope or major rack-size error found. Confirmed via Mountain Project''s route-specific protection notes and cross-referencing trip reports: full rack to BD #4 with doubles of mid-range cams, ''many slings'' for the wandering 21-pitch line, and single 60m rope is correct (route ends in a walk-off, no technical rapelling needed on descent). The specific sling count (10x60cm/3x120cm) and alpine-draw count are reasonable inferences from the route''s wandering, 21-pitch character since no single source gives an exact tally — flagged as inferred within an otherwise verified gear picture.'
where id = 'wa_direct_north_buttress';

update routes set
  gear = '["sturdy hiking boots or approach shoes","trekking poles","ice axe (seasonal — snowpack lingers in the basin into July)","helmet (optional, for loose rock on the final ~100m scramble)"]'::jsonb,
  detailed_rack = 'No technical rock rack applies to this route. It is an unroped Class 2-3 scramble — no cams, nuts, rope, or protection are used at any point, including the final steep section below the summit.',
  pro_needs = 'None. This is an unroped scramble; there are no protectable technical moves. The final ~100m to the summit is loose Class 2-3 terrain handled by careful route-finding and hand-and-foot scrambling, not by placing gear.',
  what_to_bring = '["trekking poles for the short, steep maintained trail to Church Lake","ice axe or microspikes if attempting in spring/early summer while snow persists in the cirque (reported to linger into July)","sturdy trail shoes or light hiking boots","navigation aid (map/GPS) since the climbers'' path fades to a boot-track past Church Lake through the alpine meadows/cirque","sun protection for the open alpine basin","helmet if concerned about loose rock on the final scramble (optional, not reported as standard practice)"]'::jsonb
where id = 'wa_bearpaw_mountain_scramble';

update routes set
  gear = '["ice axe","helmet","mountaineering boots or sturdy approach shoes","trekking poles","microspikes/light traction for firm early-season snow"]'::jsonb,
  detailed_rack = 'No technical rack is needed. This is an unroped Grade II scramble (river crossing, forest/brush route-finding, snow slopes, and a short Class 2-3 rock section) — no cams, nuts, or protection are placed anywhere on the route.',
  pro_needs = 'None placed — the route is climbed unroped. The crux is ~30 feet of exposed but ''solid and easy'' Class 2-3 slab below the summit ridge with bad runout; it is normally soloed/scrambled without protection. One Mountaineers-affiliated trip report notes a party carried a rope but the trip leader judged it impractical/unsafe to use as a group belay at the crux — confirming rope is not standard gear here, not that it substitutes for the missing rack.',
  what_to_bring = '["ice axe (for the snow slopes/boulderfields above ~4,200-4,450ft)","helmet (recommended for the exposed slab crux and loose rock; multiple parties note wishing they''d worn one)","mountaineering boots — parties commonly switch from approach shoes to boots once on solid snow (~4,450ft)","trekking poles (stow on pack for hands-on scrambling sections)","microspikes or light crampons if snow is firm/icy, especially early season","gaiters","map/compass/GPS — the lower route relies on flagging through thick forest and a river crossing that can be route-finding-intensive","layers/sun protection for the open ridge and summit"]'::jsonb,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'No rope is standard kit for this route. It''s an unroped scramble; the only technical passage is a short (~30ft) Class 2-3 slab crux with bad runout, which parties cross unroped. A trip report describes one group carrying a rope but the leader deciding it wasn''t practical/safe to use as an improvised belay there — this is evidence rope is non-standard, not a recommendation to bring one.',
  ascender = 'Not needed',
  corrections = 'The existing gear/detailedRack text was AI-generated placeholder and (given the ''Grade II'' label) likely implied a technical rock rack or rope. Cross-checking The Mountaineers'' official route listing plus multiple independent trip reports (Must Hike Must Eat, TrailcatJim) confirms this is an unroped Class 2-3 alpine scramble with no protection placed anywhere — the only technical gear used in practice is an ice axe (for snow slopes) and helmet (for the exposed slab crux and loose rock). There is no evidence any party has used a rope, rack, or crampons-for-ice on this route; treat any prior text suggesting a rock rack or standard roped travel as incorrect.'
where id = 'wa_bedal_peak_standard';

update routes set
  gear = '["helmet","sturdy mountaineering boots or scrambling approach shoes","ice axe (seasonal, if approach gullies hold snow)","map/compass or GPS","trekking poles for bushwhack approach"]'::jsonb,
  detailed_rack = 'No technical rack is used on this route. The only detailed trip report of an actual Berdeen Peak ascent (Steph Abegg''s Mystery Ridge Enchainment, approaching via Porkbelly Ridge and the east side/NW slopes) describes mostly Class 3 terrain with one or two Class 4 moves on steep, mossy, loose rock, and does not mention a rope, harness, or any protection being placed or carried for the summit scramble itself.',
  pro_needs = 'None needed — this is an unroped Class 3-4 scramble. The limiting factor is loose, mossy rock and careful hold selection, not a lack of protectable terrain, so gear is a non-issue; a helmet is the main protective item worth carrying given the reported rockfall/handhold-failure hazard.',
  what_to_bring = '["helmet (loose, mossy rock reported)","sturdy boots or scrambling shoes with good traction on wet/mossy rock","ice axe if snow lingers in approach gullies (seasonal)","map/compass or GPS — off-trail, unmaintained route on a peak described as ''not climbed often''","trekking poles for the Porkbelly Ridge bushwhack approach","overnight/camping gear if basing at Berdeen Lake as most parties do"]'::jsonb
where id = 'wa_berdeen_peak_scramble';

update routes set
  gear = '["sturdy hiking/mountaineering boots","helmet","ice axe (seasonal, for snow gullies/couloirs)","Ten Essentials","trekking poles"]'::jsonb,
  detailed_rack = null,
  pro_needs = 'No rack or fixed protection is used on this route — it is unroped Class 2-3 talus and scree scrambling up the SE ridge (from Copper Glance/Eightmile Pass), not technical rock climbing. Multiple trip reports describe the rock as generally solid on larger blocks but covered in loose ''kitty litter'' talus/scree, so the primary hazard is rockfall/footing rather than lack of protection. No party in the sourced trip reports placed gear or used a rope.',
  what_to_bring = '["ice axe (carry if early-season snow lingers in the approach gullies/couloirs)","crampons (situational — only needed if steep snow is encountered; one trip report carried but rarely used them)","gaiters","sun protection (long, mostly open talus/scree approach)","extra water (long approach, ~11.6 mi round trip with ~5,600 ft gain)","overnight/camp gear if doing Big + West Craggy together (commonly a 2-day trip)","navigation (GPS/map/compass) — off-trail travel above Eightmile Pass/Copper Glance basin"]'::jsonb
where id = 'wa_big_craggy_peak_scramble';

update routes set
  gear = '["rock shoes","light single rack: stoppers + cams ~0.5-2in","60m single rope","helmet","ice axe & light crampons (snow-filled approach gullies into July)"]'::jsonb,
  detailed_rack = 'A single, light rack covers this 3-pitch, ~200ft route: a set of stoppers/nuts plus cams roughly 0.5 to 2 inches. Pitch 1 takes small gear to a sling belay; pitch 2 is mostly natural pro off a flake and a small block (sparse); pitch 3 (5.6) has a crack taking small cams about 20ft above the belay before the first piece.',
  pro_needs = 'Protection is thin in places, especially pitch 2, which several parties describe as sketchy with minimal anchoring options. The exposed summit move is essentially unprotectable 5.6 slab with only one old, rusty 1/4in bolt at the top — treat it as decorative, not a real anchor point. Rock quality is generally sound granite but the approach gullies below involve choss and bushwhacking.',
  what_to_bring = '["approach shoes for talus/bushwhack approach along Early Winters Creek","ice axe and light crampons — the parallel approach gullies hold snow into July","helmet for loose rock on approach and lower pitches"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'One 60m rope is sufficient for the entire route. Descent is a single 60m rappel from two slung-block anchors at the notch (after a top-rope down-climb/up-climb shuffle past the summit using the old bolt as a directional only) — no double rope is needed.',
  ascender = 'Not needed',
  corrections = 'Existing gear text was auto-generated and unverified. Corrected: a single 60m rope is standard (there is no basis for a double-rope requirement on this short route); the rack is a light single set of nuts/small-to-medium cams (~0.5-2in), not a generic ''rack to 3 inches''; and the summit''s single rusty 1/4in bolt should be flagged as unreliable rather than treated as a trustworthy anchor.'
where id = 'wa_big_kangaroo_southwest_rib';

update routes set
  gear = '["rock shoes","double rack of cams ~#0.5-#3 + single set of nuts","helmet","60m rope (plus a 2nd rope if rappelling the face)"]'::jsonb,
  detailed_rack = 'Double set of cams from about #0.5 to #3 (BD-equivalent sizing) plus a single set of nuts covers the six pitches. A #0.4, #4, and #5 can be placed on roughly half the pitches but are not necessary to bring — most parties get by without the larger sizes.',
  pro_needs = 'Protection is good to great on the crux pitch 5 finger/hands crack and the pitch 6 handcrack. Pitch 4''s lieback-into-offwidth/flaring-chimney section has slightly runout pro between placements. Several belays use trees and slings as well as gear, and runners help manage rope drag on the more wandering pitches. Rock is solid granite overall, though the lower two pitches (mostly easy scrambling) have loose, crumbly sections.',
  what_to_bring = '["approach shoes/boots — the south-face approach is longer and steeper than most Washington Pass climbs and isn''t visible from the highway","helmet (loose rock low on the route and on the descent gully)","headlamp — this is a long Grade III day","layers/water — south-facing but a full alpine rock day"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":5},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Lead on a single 60m rope. Mountain Project''s route description gives the standard descent as rappelling the face directly — 5-6 rappels using two ropes from a mix of slings and trees — so bring a second rope (tag line or a 2nd 60m) if you plan to descend that way rather than continue to the true summit. Multiple trip reports instead finish the extra pitch to the summit and walk off the standard gully descent back toward the Hairpin Turn (roughly 2 hours), which avoids needing a second rope at all — decide which descent option before racking up.',
  ascender = 'Not needed',
  corrections = 'No major factual errors found in the existing (non-auto-generated) gear text — it already reflects a reasonable rack. Clarified/tightened: the ''two ropes'' descent requirement applies specifically to rappelling the face itself (per Mountain Project), not to leading the route, which is done on a single rope; and flagged that a common alternative is to summit and walk off the gully, which needs no second rope.'
where id = 'wa_beckey_tate';

update routes set
  gear = '["approach shoes or light mountaineering boots","ice axe","microspikes or crampons (snow lingers on the col/upper gully into July)","helmet","optional light rack + short rope for the exposed summit traverse (most parties climb this unroped)"]'::jsonb,
  detailed_rack = 'No technical rack is needed for the standard route in normal (dry) conditions — this is an unroped class 2-4 scramble per multiple independent trip reports, including solo ascents (nwhikers.net, 7/8/2017). Parties wanting extra security for the short exposed ridge traverse near the false summit, or for a steep snow section below the saddle in early season, sometimes carry a single ~30m rope with a very light rack. A 2017 ICC group carrying ''light alpine racks, lots of doubles'' up this peak explicitly reported the rack going ''mostly unused'' on the South Ridge portion of their day.',
  pro_needs = 'Protection is essentially unnecessary on this route — the main hazard is loose, rotten scree in the gully leading to the saddle (avoid party-inflicted rockfall), not a lack of gear. If roping up for the ~15-20m exposed knife-edge traverse near the true summit, slinging a horn or block is sufficient; no cam/nut rack is really needed.',
  what_to_bring = '["hiking boots or approach shoes","ice axe","microspikes or crampons (snow persists on the col/upper gully into July)","helmet (loose rock/scree)","trekking poles","sun protection for the long, exposed approach","overnight/bivy gear if camping at Wing Lake","map/GPS — easy to stray off the cairned line in the summit gully"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":2}]'::jsonb,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = 'Most parties climb this route completely unroped (confirmed solo ascents in trip reports). If a rope is carried, a single 30m rope is plenty for the short exposed traverse near the false summit or a steep snow section below the saddle — descent is a walk-off down the same ridge, so no rappelling/double-rope length is needed.',
  ascender = 'Not needed',
  corrections = 'If prior data implied this route requires a standard technical rack or is routinely roped/protected throughout, that overstates it — real trip reports (including solo ascents) show it is most commonly climbed entirely unroped as a class 2-4 scramble, with a rope/light rack carried but essentially unused except optionally for a short exposed traverse near the summit.'
where id = 'wa_south_ridge_3';

update routes set
  gear = '["mountain boots (climbed in boots by real parties; rock shoes not needed)","single rack ~0.3-2in with doubles in the 0.4-0.75in range","10 nuts including offsets","~12-15 slings (mix of 60cm singles and 120cm doubles)","1-2 cordelettes","single 30-60m rope","ice axe and crampons/microspikes","1-2 snow pickets (early-season cornice/snow crossing)","helmet"]'::jsonb,
  detailed_rack = 'Two real trip-report gear lists: (Aug 2019, dry conditions, cascadeclimbers.com) — cams 0.3 to 2in with doubles in 0.4-0.75in, 10 nuts, 8 single (60cm) slings, 7 double (120cm) slings, 2 tied-off doubles, 2 cordelettes; party never needed anything larger than a #2. (June 2018, snowier early-season, cascadeclimbers.com) — cams 0.3-1in plus one 2in-class cam (Omega Link-type), nuts + offset nuts, 10 double-length and 6 single-length slings, 2 snow pickets for the col/cornice crossing, single 60m rope Kiwi-coiled. Both parties simul-climbed the bulk of the ridge (one team ~80/20 simul/pitched) placing gear only occasionally.',
  pro_needs = 'Gear is fairly plentiful — numerous horns and cracks to sling along the ridge crest, and neither real trip report ever needed a piece bigger than roughly a #2 (2in) cam. Rock quality is worst low on the route/first pitch, where significant rockfall between simul-climbing rope teams is a documented hazard (stay tucked around corners); rock improves higher up. Offset nuts are useful in thinner cracks. Bring plenty of slings (12-15+) to sling horns and manage rope drag on the wandering crest rather than relying on cams alone.',
  what_to_bring = '["mountain boots (not rock shoes)","ice axe","crampons or microspikes (col snowfield persists into September)","1-2 snow pickets (a corniced traverse near the start of the ridge can require protection, or a rappel retreat in early season)","helmet (rockfall risk on lower pitches)","overnight/bivy gear for a Wing Lake camp","avalanche gear (beacon/shovel/probe) if approaching while snow still lingers near the corniced traverse above Lewis Lake","careful route-finding — a documented off-route excursion into a loose, hard-to-protect gully is a known hazard partway up the ridge"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":8},{"sizeCm":120,"qty":7}]'::jsonb,
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Single rope only — no half/twin rope setup is needed or used. Real parties have climbed this either on one single 60m rope Kiwi-coiled for simul-climbing (2018 TR), or split into two 2-person teams each carrying their own 30m single rope (2019 TR). Rappels on this route are short and used mainly for early-season retreat off the ridge crest (a 2017 TR describes 2x30m raps off single pickets when bailing from a corniced traverse near the ridge start), not long free-hanging descents — descent from the summit is a walk-off via the South Ridge, not a rappel line.',
  ascender = 'Not needed',
  corrections = 'The existing auto-generated gear text likely assumed a double/half-rope setup typical of glaciated alpine objectives and an oversized rack — neither is supported. Every real trip report located used a single strand of rope (30m or 60m), and racks topped out around 2in with an emphasis on nuts and numerous slings rather than large cams. Also worth correcting if implied elsewhere: the descent is via the South Ridge walk-off, not down the NE Ridge itself.'
where id = 'wa_black_peak_northeast_ridge';

update routes set
  gear = '["sturdy boots with ankle support (talus/scree/blocky ridge)","climbing/scramble helmet (loose rock near the black hornfels summit cap)","trekking poles for scree/talus","ice axe if early-season snow lingers on the approach basin or ridge"]'::jsonb,
  detailed_rack = null,
  pro_needs = 'No protection is placed on this route. It is an unroped Class 2-3 scramble: talus and scree up to the ridge, then a class 2 ridge walk with one or two class 3 moves through loose rock near the summit''s distinctive black hornfels cap. Rock quality on the cap itself is described as solid but the approach slopes/gullies are loose — a helmet is the main protective item recommended, not a rack. No trip report reviewed (from either the NE-ridge/Shellrock Pass side or the east Monument Creek basin side) mentions placing gear.',
  what_to_bring = '["water treatment/extra capacity — fill at Eureka Creek, upper basin tarns are unreliable/seasonal","map/compass or GPS — remote Pasayten cross-country route-finding on talus, no maintained trail on the peak itself","early start to avoid afternoon heat on exposed ridge","layers — exposed alpine ridge, weather can change fast in the Pasayten"]'::jsonb
where id = 'wa_blackcap_mountain_scramble';

update routes set
  gear = '["sturdy hiking/scrambling boots","trekking poles","ice axe (only if lingering early-season snow on north-facing slopes)","map, compass and/or GPS (route is off-trail)","helmet (optional — loose talus/scree)"]'::jsonb,
  detailed_rack = null,
  pro_needs = 'None needed. Blizzard Peak''s standard route is an unroped Class 2-3 off-trail scramble on scree, talus, and low-angle rock — reached via an off-trail hike and rock scramble up the North Ridge from the Frosty Pass/Chuchuwanteen Mountains area (older beta describes an alternate line via an avalanche chute off the south ridge, also non-technical, Class 1-2). No trip report found documents any fixed anchors, rack, or protection being placed.',
  what_to_bring = '["multi-day backpacking gear — Blizzard Peak sits deep in the northwest Pasayten Wilderness (Hozameen Range) and is normally combined with Mt. Winthrop, Frosty Pass, and Monument 83 in a 30+ mile loop, not done as a standalone day trip","extra food and water for a long, remote approach with minimal water sources on ridge sections","layers for exposed alpine terrain and variable weather this far from any road","insect repellent for subalpine meadow approach (The Parks area)","GPS track/detailed map — the Chuchuwanteen Creek approach trail is unmaintained with heavy deadfall and easy to lose"]'::jsonb,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'No rope is used or needed — every source describing this peak (a 2012 party''s ascent via the North Ridge, and older route beta describing a south-ridge avalanche-chute line) characterizes it as unroped Class 1-3 scrambling, not roped climbing.',
  ascender = 'Not needed',
  corrections = 'The existing gear/detailedRack/proNeeds fields were AI-generated placeholder text implying a technical rack/rope setup appropriate for roped alpine rock. Corrected: Blizzard Peak''s standard route is a non-technical, unroped Class 2-3 scramble (off-trail hike + rock scramble, North Ridge, per a documented 2012 ascent; older beta separately describes a Class 1-2 south-ridge/avalanche-chute line) — no rope, rack, cams, nuts, or slings are used. The dominant challenge is the very long, remote, largely off-trail Pasayten Wilderness approach, not technical difficulty.'
where id = 'wa_blizzard_peak_standard';

update routes set
  gear = '["ice axe","crampons (aluminum or steel)","mountaineering boots or sturdy approach shoes with crampons","glacier travel rope (60m or 2x30m)","harness","crevasse rescue kit (pickets, prusiks)","helmet","a few slings for rappel anchors"]'::jsonb,
  detailed_rack = 'Minimal to no rock rack — most parties carry no cams/nuts at all for the Class 3-4 (up to low-5th, 5.0-5.6) rock above the glacier; several trip reports specifically mention leaving the rock rack at home. What''s actually used is a handful of slings (including a couple of double-length 120cm runners) for building anchors around blocks/horns on the summit scramble and for the rappel stations on the loose-rock/waterfall-slab descent gully — one report notes a long (triple-length) sling is worth replacing a worn one at the wet-slab rappel station.',
  pro_needs = 'Protection is essentially non-existent on the upper mountain — the Class 3-4 ridge/gully climbing to the summit is typically soloed or simul-climbed by experienced parties rather than protected with placed gear. The real protection need is glacier travel gear (roped travel, pickets for crevasse crossings) and reliable natural rappel anchors (slung horns/blocks) for the loose descent.',
  what_to_bring = '["ice axe","crampons","glacier travel rope","crevasse rescue kit (pickets, prusiks, pulley)","helmet","approach/scrambling shoes for the rock finish (some swap out of mountaineering boots)","trekking poles","bivy/camping gear for the multi-day approach via Holden and Holden Lake"]'::jsonb
where id = 'wa_bonanza_peak_mary_green_glacier';

update routes set
  gear = '["helmet","single set of nuts + cams to ~2-3in (with doubles in thin-to-hand sizes)","glacier travel gear for the approach (ice axe, crampons, rope)","single 60m rope","a handful of slings/runners for anchors and rope-drag management on the wandering ridge crest"]'::jsonb,
  detailed_rack = 'A single set of nuts and cams from finger-size to about 2-3in covers the documented 5.7/5.8 climbing — steep, narrow terrain right off the toe of the buttress, then simul-climbable ridge crest with at least one full 60m pitch through a chimney partway up. Doubling up thin-to-hand cams (roughly 0.4-1in) is a reasonable add given long simul-climbed stretches with sparse pro on a wandering ridge line, but no trip report gives an exact size-by-size list.',
  pro_needs = 'The steep lower buttress and the chimney pitch take gear well, but the long ridge-crest sections above are described as exposed and were largely simul-climbed rather than pitched out — expect runout stretches where the challenge is exposure, not gear-starved climbing. Rock is ''mostly solid but lichen-covered,'' so test holds and placements, especially anything covered in lichen.',
  what_to_bring = '["ice axe and crampons for the Mary Green Glacier approach to the base of the buttress (~8,350ft, ~3hr from Holden Lake)","helmet (loose/lichen-covered rock)","headlamp (parties report ~19hr round trips from Holden Lake)","approach shoes for the glacier/scree approach, plus climbing shoes or sticky-soled boots for the rock"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":5},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 6,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'The only detailed technical account found (AAC 2004 three-summit-traverse report) describes belaying a full pitch through a chimney and taking ''a long rappel'' to regain the Mary Green Glacier on descent — consistent with standard single-rope use, not a doubled-rope system. No source supports a half/twin-rope requirement on this route.',
  ascender = 'Prusik cords only',
  corrections = 'If existing data assumed a double/half-rope system simply because this is graded a alpine IV/V, that isn''t supported by the one detailed source available — it describes single-rope pitch climbing and one long rappel back to the glacier, not doubled ropes. Note also: the only substantive trip report found (AAC ''Three-Summit Traverse'') approaches the buttress from the Mary Green Glacier side, not a ''Company Glacier'' as the route id implies — flagging for awareness even though approach/descent fields are out of scope for this gear audit.'
where id = 'wa_bonanza_peak_northeast_face_company_glacier';

update routes set
  gear = '["rock shoes (for the steeper pitches)","approach shoes (worn for roughly the lower half of the route)","helmet","extensive rack of small-to-mid cams and nuts (small cams especially valuable)","a couple of thin/knifeblade pitons (optional, for old fixed placements)","two 60m ropes (double-rope technique)"]'::jsonb,
  detailed_rack = 'A long route (14 pitches of full 60m/200ft length on the 2012 ascent; the 1975 FA logged 22 pitches) where small gear sees the most use — a small cam (Alien-sized) was reported as the single most-used piece on the modern ascent; nuts and small-to-mid cams cover most placements. A full set of large cams (#3/#4-equivalent) was carried on the 2012 ascent but not needed and could reasonably be trimmed from the rack. The 1975 first-ascent party placed well over 100 nuts/chocks/wedges across the route plus just six thin knifeblade pitons for the hardest sections, and left two titanium pitons in place — a couple of old fixed pins may still be found at difficult spots.',
  pro_needs = 'Protection is generally good with attentive small-gear placement, but the rock is loose in places low on the route — one account notes it gets noticeably cleaner higher up — so extra care with rock quality is warranted on the lower pitches. A couple of fixed pitons remain from the first ascent at some of the harder spots and can supplement natural gear.',
  what_to_bring = '["rock shoes and approach shoes (parties swap footwear partway up the route)","helmet","headlamp (this route has been descended at night)","two 60m ropes for double-rope climbing and rappelling","bivy gear if not going car-to-car — this is a long Grade V day"]'::jsonb
where id = 'wa_soviet_route';

update routes set
  gear = '["helmet","crampons","ice axe","crevasse rescue kit (Micro Traxion/Tibloc + prusiks)","light rack: nuts + small-mid cams 0.4-2in","60m single rope","harness + belay/rappel device"]'::jsonb,
  detailed_rack = 'Very light rack only: a small set of nuts and a handful of cams in the roughly 0.4-2in range for the short technical steps near the summit and to back up rappel anchors if needed. Full double racks are unnecessary — most of the route is unroped 4th-class scrambling on ledges, not sustained crack climbing. The three rappel stations along the standard descent (toward Sahale, then down) are described by parties as solid, pre-equipped anchors (''bomb proof''), so plan to supplement rather than build anchors from scratch; carry a few extra rap rings/cord/webbing in case a station needs backing up or refreshing.',
  pro_needs = 'Protection needs are minimal because most of the route is climbed unroped as 4th-class scrambling; the rock is notoriously loose and chossy with real rockfall danger, which is exactly why parties minimize roped/stacked climbing here. Where gear is placed (short steps, rappel backups) opportunities are limited and rock quality for protection is questionable — test everything. The three fixed rappel anchors on the standard descent are reported as solid, reducing the anchor-building burden.',
  what_to_bring = '["crampons","ice axe","crevasse rescue gear (glacier crossing to Boston/Sahale saddle)","helmet (significant rockfall hazard)","sturdy approach/scrambling footwear","rope for roped glacier travel on approach"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":3},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 0,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Descent is three ~25m single-strand rappels off fixed sling anchors on the way down toward Sahale/the snow below; a 60m rope doubled gives ~30m per strand, ample margin (even a 50m rope would work). Single rope is standard — nothing in trip reports supports carrying a second rope, and most of the route is climbed unroped anyway, further reducing rope-related weight concerns.',
  ascender = 'Micro Traxion',
  corrections = 'Existing gear text was flagged as AI-generated boilerplate. Corrected to reflect the actual route character: this is Boston Peak''s standard route, a mostly-UNROPED Class 4 ledge system on the east/southeast face (multiple sources recommend climbing it unroped to reduce rockfall exposure to the party), so a full rock rack is not needed — only a token light rack for the short technical sections. Descent is 3 rappels of ~25m (82ft) each off fixed slings that trip reports describe as ''bomb proof,'' so little additional anchor-building gear is required and a single 60m rope (or even 50m) is standard — there is no basis for a double-rope setup. The approach crosses the Quien Sabe Glacier to the Boston/Sahale saddle, which is the real technical crux for gear purposes and requires crampons/axe/crevasse-rescue kit that generic ''rack to 3in'' boilerplate would omit. Note: this route''s id contains ''southwest_face'' but its display name is ''Southeast Face''; all sourced descriptions of Boston Peak''s standard route describe an east/southeast aspect, so beta was sourced accordingly — flagging the id/name mismatch as a data-hygiene item outside gear scope.'
where id = 'wa_boston_peak_southwest_face';

update routes set
  gear = '["helmet","crampons","ice axe","crevasse rescue kit (Micro Traxion/Tibloc + prusiks)","light alpine rack: nuts + cams 0.3-2in","60m single rope","extra cord/webbing for improvised anchors"]'::jsonb,
  detailed_rack = 'A light alpine rock rack weighted toward small-to-mid cams (roughly 0.3-2in) and a modest nut set — the AAC account describes the rock as ''the consistency of feta cheese'' and the crux as two pitches of a-cheval straddling a crumbling ridge crest, meaning placements will be scarce and often marginal rather than plentiful. This is not a route to bring a full double rack for; prioritize a few bomber pieces you can trust over volume. Given the X rating (runout/poor pro), extra cordage/slings for improvised anchors off horns, chockstones, or rock features is worth the weight, since natural gear placements can''t be counted on.',
  pro_needs = 'Protection is genuinely sparse — this is an X-rated route, meaning real runout on rock described firsthand as extremely rotten (''virgin choss''). The only detailed account treats significant sections as essentially unprotected and relies on careful movement (a-cheval technique) rather than gear over a crumbling crest. Don''t expect reliable natural anchors; back up placements where the rock allows and be prepared to climb through sections with minimal or no protection.',
  what_to_bring = '["crampons","ice axe","crevasse rescue gear (glacier approach)","helmet","headlamp (long day, possible bivy)","extra cord/webbing for improvised rappel anchors","light bivy gear if not completing car-to-car"]'::jsonb,
  sling_rack = '[{"sizeCm":60,"qty":5},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'No trip report gives a rap sequence specific to this ridge alone (the one detailed ascent was part of a much larger traverse with different logistics). Single 60m rope is inferred as standard, consistent with this peak''s documented single-rope standard descent (3x ~25m raps off fixed anchors) and regional norms for comparable Cascades choss ridges — nothing found supports carrying a second rope.',
  ascender = 'Micro Traxion',
  corrections = 'No source supports a double/half-rope requirement for this route despite its serious alpine 5.5 X grading. The only detailed published account of this specific ridge (AAC Publications, ''Boston Basin, Boston Marathon,'' Boyce & Willis, 2018) does not specify rope logistics for the ridge itself, only that 26 rappels occurred across an entire multi-day, multi-peak traverse (not this route alone). Regional practice and this peak''s own documented (single-rope) standard descent both point to a single 60m rope being standard; if existing data assumed doubles purely from the ''IV+/alpine'' grade, that assumption isn''t supported by any source found. Specific cam sizes, sling counts, and alpine-draw counts below are reasoned from route character (10 pitches per Mountain Project, X-rated/runout, severely chossy rock per the AAC account) rather than a direct trip-report gear list, so treat them as informed inference, not a verified count.'
where id = 'wa_northwest_ridge_2';

update routes set
  gear = '["helmet","ice axe (or whippet)","crampons","30m glacier/scramble rope (rope teams for less-experienced parties)","1 snow picket per person","harness, belay device, prusik cord"]'::jsonb,
  detailed_rack = 'No technical rock rack is used — South Couloir is a 3rd class (1- YDS) snow/rock scramble, not a roped rock climb. Parties climbing it as an organized ''glacier style'' rope team (per Mountaineers guidance) carry a single short rope (~30m ''glacier rope''), one snow picket per person for the sustained ~30° snow above the Hourglass, and each climber carries a harness, belay device, and prusik cord for rope-team travel/self-rescue. A real trip report (Alpinism Project) confirms this exact kit: 30m Mammut hyperstatic glacier rope, one picket each, ice axes (whippet used by one climber). No cams, nuts, or slings for rock protection are used.',
  pro_needs = 'Protection is snow-based (pickets), not rock gear — the rock sections are class 3 scrambling and generally unprotected/unprotectable. Real parties often carry pickets but don''t place them: the Alpinism Project trip report states ''we didn''t use the pickets at all... would have set up a running belay if conditions warranted it.'' Needs are highly condition-dependent — by late season (post-August, per willhiteweb.com) the route can go with essentially no technical gear once snow is out.',
  what_to_bring = '["ice axe or whippet","crampons","helmet","gaiters (snow gets into low gaiters easily per trip reports)","trail runners or approach shoes for the long approach, boots + crampons for the snow/summit section","water filter (no reliable water source high on route)","1 snow picket"]'::jsonb
where id = 'wa_south_couloir';

update routes set
  gear = '["helmet","ice axe","crampons","light alpine rock rack (small-to-mid cams + a few nuts)","2 snow pickets","harness + rappel/belay device","single rope (~50-60m)"]'::jsonb,
  detailed_rack = 'Mountain Project''s route description and a first-hand ascent log call for a ''light alpine rock rack'' plus pickets — not a full trad rack. The documented ascent used 7 short, statically-belayed pitches mixing 2 pitches of moderate snow (protected with pickets) on the ridge''s east side with a ''sparsely protected rock traverse'' and further rock-traverse pitches; the party noted it ''would be quite possible to simulclimb much or all of'' the route in good conditions with a confident party. No large cams or a full double rack are reported or needed — bring small-to-mid cams and a handful of nuts for the short rock steps, plus 1-2 pickets for the snow sections.',
  pro_needs = 'Protection is genuinely sparse: MP describes the rock traverse as ''sparsely protected,'' and other trip accounts of the North-South connecting ridge describe sections with ''full on unprotectable death exposure.'' Rock quality is ''better than much of the Olympics, although that doesn''t say much'' — lichen-covered and greasy when wet, so don''t count on bomber gear. Treat this as a route where route-finding and comfort with runout scrambling matter more than a large rack.',
  what_to_bring = '["ice axe","crampons","helmet","harness + rappel/belay device","gaiters","approach shoes for the hike, boots for snow/rock sections","extra prusik/cordelette for improvised rappel anchors and any summit-horn pull-throughs"]'::jsonb
where id = 'wa_brothers_traverse';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"type":"alpine_slings","size_cm":"various","qty":"6-10","note":"Multiple slings around peak for anchor construction; bring fresh webbing for anchor repair"}]'::jsonb,
  alpine_draws = [object Object],
  rope_type = 'single_or_double',
  rope_length_m = 70,
  rope_note = '',
  ascender = '[object Object]',
  corrections = '[object Object]'
where id = 'wa_burgundy_spire_north_face';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = 'none',
  rope_length_m = null,
  rope_note = '',
  ascender = '',
  corrections = ''
where id = 'wa_north_ridge';

update routes set
  gear = '["Waterproof boots","Gaiters","Helmet","Trekking poles"]'::jsonb,
  detailed_rack = 'ZERO TECHNICAL GEAR - unroped scramble'
where id = 'wa_bryant_peak_southeast_slopes';

update routes set
  gear = '["Helmet","Ice axe and crampons if snow present"]'::jsonb,
  detailed_rack = null
where id = 'wa_buck_mountain_south_ridge';

update routes set
  gear = '["Ice axe","crampons/microspikes","helmet"]'::jsonb,
  detailed_rack = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'Unroped scramble; rope optional for snow/glacier sections',
  ascender = null,
  corrections = 'Standard route is primarily scramble; rope not required for standard approach'
where id = 'wa_cashmere_mountain_west_ridge';

update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = 'Full set up to #2 Camalot, or doubles in finger-to-mid-sized cams; Full set of stoppers',
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'single or twin',
  rope_length_m = 40,
  rope_note = '30m minimum; 40m allows for longer rappels',
  ascender = null,
  corrections = 'Rappel slings frequently in place at summit; existing rap stations simplify descent'
where id = 'wa_castle_peak_tatoosh_southeast_face';

update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = 'Doubles in finger to mid-sized cams (#0.3-#1); Full set of stoppers and hexes; 4-6 quickdraws',
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 5,
  rope_type = 'single or twin',
  rope_length_m = 40,
  rope_note = '40m rope standard for this harder route',
  ascender = null,
  corrections = 'Crux involves a #2 Camalot placement; consider fixed anchors at rappel points'
where id = 'wa_castle_peak_tatoosh_la_villa';

update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '4-5 cams (sizes #1-#3), small to medium stoppers',
  sling_rack = '[{"sizeCm":60,"qty":3},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'dynamic',
  rope_length_m = 50,
  rope_note = 'Single pitch on south face; 50-60m adequate',
  ascender = null,
  corrections = 'Well-protected established route'
where id = 'wa_classic_route';

update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '4-6 cams (including medium sizes for chimney), several stoppers',
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 5,
  rope_type = 'half-rope',
  rope_length_m = 50,
  rope_note = '60m half-rope typical; more technical than standard route',
  ascender = null,
  corrections = 'Hand jam section 5.7ish; better protection than standard scramble'
where id = 'wa_direct_finish';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '{"route_type_assessment":"Cascade Peak East Ridge is a Class 4 alpine scramble (5.2 rock grade), NOT primarily a technical rock climbing peak like Forbidden Peak or Liberty Bell. It is an alpine peak ascent with scrambling exposure and optional protection placements.","standard_rack_philosophy":"Bring a moderate alpine rock rack (8 cams total, 12 stoppers) for protection on scrambling sections and exposed terrain. Ice climbing protection is secondary but valuable for September traverse conditions with rime ice or persistent snowfields. Snow anchors (2 pickets, 1 snow fluke) are mandatory for any overnight camps or emergency anchor situations.","seasonal_best_practice":"Plan for dry rock, potential rime ice, and high altitude cold in September-October. Prioritize helmet, crampons, and ice axe for safety on frost-slicked traverses. One 50-foot rope sufficient for belayed scramble sections; glacier rope useful for team travel if roped. Avoid mid-July peak season crowds; accept early-season short days (darkness by 6:30pm by early Oct).","permit_requirements":"North Cascades National Park overnight permit required. Cascade Pass Trailhead requires NW Forest Pass.","navigation_hazard":"Doug''s Direct descent (standard route back to Cascade Pass Trail) involves route-finding through steep meadows and is a common source of confusion. Bivy location (7,100 ft) well-documented on trip reports.","river_ford":"Cascade River ford at trailhead can be dangerously cold and fast during afternoon snowmelt. Cross early in the day or on return before peak flows.","cell_communication":"North Cascades NP explicitly advises climbers to be self-sufficient and not rely on personal locator or cell devices for rescue"}',
  updated_at = now()
where id = 'wa_cascade_peak_east_ridge';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
where id = 'wa_jack_mountain_south_face';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = '["Elevation discrepancy resolved: Dolomite Tower base ~5,708 ft (not 11,948 ft user-provided). User elevation may refer to another peak; verified via multiple independent sources.","Rope length: Sources consensus 60-70m single rope. Angle 5 (generic alpine) recommends 30m minimum, but Dolomite Tower''s 20-pitch length requires 60m minimum; 70m preferred to avoid forced simul-climbing on 5.10 pitches.","Approach time: Angles 1 & 3 cite 3-3.5 hours; Angle 4 cites 3-4 hours. 3-3.5 hours is consensus for fit parties. 2020 improvements noted (new bolts, alternative slab route).","Gear rack: All sources (Angles 1, 2, 3) agree on single rack to #1 Camalot + optional #2. Small/medium nuts optional (Angles 1, 2). P4 requires gear; rest primarily bolted.","P3 crux: 2020 modernization added 2 bolts; still technically runout but safer than pre-2020. Multiple sources reference P3 as site of historic fall/injury.","P5 loose rock: Multiple trip reports (Angle 3) confirm significant deterioration and rock falls. Alternate ''mystery bolts out left'' avoids worst section.","2020 modernization: Confirmed by multiple recent ascent reports. All anchors replaced stainless steel. Route improved but retains intentional runouts (P8) for mental challenge.","Deep Blue (separate route): 5.13c sport, 12 pitches effective (30 total). All bolted. 70m rope. Can be rapped or walked off."]',
  updated_at = now()
where id = 'wa_vanishing_point';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
where id = 'wa_glacier_peak_kennedy_glacier';

UPDATE routes SET
  sling_rack = NULL,
  alpine_draws = 0,
  rope_type = NULL,
  rope_length_m = NULL,
  rope_note = NULL,
  ascender = NULL,
  corrections = NULL,
  updated_at = now()
where id = 'wa_glacier_peak_frostbite_ridge';

COMMIT;
