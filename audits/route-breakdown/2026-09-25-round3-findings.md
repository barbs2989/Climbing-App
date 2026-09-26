# Route breakdown research, round 3 — 2026-09-25

Researched online by seven agents and applied through `enrich:apply` (`--from` each batch file in this
folder). Every write asserted the route's `area_id`, went through `patchRow`, and verified on re-read;
`scripts/oneoff/verify-route-breakdown-renders.mjs` then confirmed every entry's notes reach the Plan
tab (46/46 routes, 262 entries). The replaced tables are in the `rollback-*.json` files beside this one.

The batch files are the review surface: each entry's `review` block carries its sources and confidence,
and is never written to the row (the app names no sources).

## Written (46)

| Route | Batch | Section | Entries | Confidence |
|---|---|---|---|---|
| `wa_liberty_bell_freedom_or_death` | P | ROUTE BREAKDOWN | 4 | medium |
| `wa_up_in_arms` | P | ROUTE BREAKDOWN | 6 | medium |
| `wa_clean_break` | P | ROUTE BREAKDOWN | 11 | medium |
| `wa_doorway_flake` | P | ROUTE BREAKDOWN | 5 | medium |
| `wa_western_dihedral` | P | ROUTE BREAKDOWN | 5 | medium |
| `wa_accidental_discharge_east_face` | P | ROUTE BREAKDOWN | 3 | medium |
| `wa_east_face` | P | ROUTE BREAKDOWN | 7 | medium |
| `wa_roan_wall_center_stage` | Q | ROUTE BREAKDOWN | 10 | medium |
| `wa_flight_of_the_falcon` | Q | ROUTE BREAKDOWN | 12 | medium |
| `wa_technicians_of_the_sacred` | Q | ROUTE BREAKDOWN | 6 | high |
| `wa_sisu` | Q | ROUTE BREAKDOWN | 7 | medium |
| `wa_starfish_enterprise` | Q | ROUTE BREAKDOWN | 5 | medium |
| `wa_crying_dragon` | Q | ROUTE BREAKDOWN | 6 | medium |
| `wa_golden_age` | Q | ROUTE BREAKDOWN | 7 | high |
| `wa_the_tiger` | Q | ROUTE BREAKDOWN | 11 | high |
| `wa_northwest_face_4` | R | ROUTE BREAKDOWN | 10 | medium |
| `wa_spontaneity_arete` | R | ROUTE BREAKDOWN | 8 | high |
| `wa_spontaneous_distraction` | R | ROUTE BREAKDOWN | 4 | medium |
| `wa_big_kangaroo_walkabout` | R | ROUTE BREAKDOWN | 6 | medium |
| `wa_castle_in_the_sky` | R | ROUTE BREAKDOWN | 12 | high |
| `wa_little_sister_west_face` | R | ROUTE BREAKDOWN | 3 | medium |
| `wa_the_tooth_indentured_servant` | R | ROUTE BREAKDOWN | 6 | high |
| `wa_the_monk_odine` | R | ROUTE BREAKDOWN | 2 | medium |
| `wa_summit_chief_mountain_north_face` | S | ROUTE BREAKDOWN | 6 | medium |
| `wa_burnt_boot_peak_north_ridge` | S | ROUTE BREAKDOWN | 6 | medium |
| `wa_fortune_peak_east_slope` | S | ROUTE BREAKDOWN | 3 | medium |
| `wa_fortune_peak_standard_route` | S | ROUTE BREAKDOWN | 3 | medium |
| `wa_klawatti_peak_sw_buttress` | S | ROUTE BREAKDOWN | 3 | medium |
| `wa_remmel_mountain_nw_ridge` | S | ROUTE BREAKDOWN | 5 | medium |
| `wa_sw_couloir_and_face` | T | ROUTE BREAKDOWN | 10 | medium |
| `wa_mount_rainier_fuhrer_thumb` | T | ROUTE BREAKDOWN | 5 | medium |
| `wa_snoqualmie_mountain_the_snostril` | T | ROUTE BREAKDOWN | 5 | high |
| `wa_mount_maude_r2` | T | ROUTE BREAKDOWN | 6 | medium |
| `wa_fantasy_falls` | T | ROUTE BREAKDOWN | 3 | medium |
| `wa_mount_stone_putvin` | U | ROUTE BREAKDOWN | 8 | medium |
| `wa_lena_lake_to_mt_stone_traverse` | U | ROUTE BREAKDOWN | 7 | medium |
| `wa_north_ridge_2` | U | ROUTE BREAKDOWN | 3 | medium |
| `wa_star_peak_sawtooth_scramble` | U | ROUTE BREAKDOWN | 3 | medium |
| `wa_tepeh_towers` | U | ROUTE BREAKDOWN | 3 | medium |
| `wa_olympus_summit_block_north_face` | U | ROUTE BREAKDOWN | 1 | medium |
| `wa_south_face_of_the_mole` | U | ROUTE BREAKDOWN | 4 | high |
| `wa_american_border_peak_northeast_face` | V | CLIMBING ROUTE | 4 | medium |
| `wa_jack_mountain_north_ridge` | V | CLIMBING ROUTE | 5 | medium |
| `wa_jack_mountain_southwest_ridge` | V | CLIMBING ROUTE | 4 | medium |
| `wa_klawatti_peak_north_ridge` | V | CLIMBING ROUTE | 4 | medium |
| `wa_gilbert_peak_conrad_glacier` | V | CLIMBING ROUTE | 5 | high |

## Skipped — no credible section-level description found (10)

Left as they are. Sparse is better than invented on a climbing route.

| Route | Batch | Why |
|---|---|---|
| `wa_west_face` | P | Right peak confirmed (South Gunsight, Gunsight Range), but the only description is a single sentence of line (chimney on the left for one pitch, traverse right onto the face, a right-facing dihedral high up, finish left). No source gives per-pitch grades or lengths. The stored table's P2/P3 '5.9+' grades look like the overall grade copied onto pitches and the four 38 m lengths look like 152 m divided by four; neither is supported. Recommend the reviewer consider clearing those fields. A route list by the first ascensionists of the neighbouring routes grades this line III 5.9, against the stored 5.9+. |
| `wa_amphitheater_mountain_middle_finger_buttress_right_side` | S | Not enough pitch-level information. The only route description found gives two facts (P1 starts on a steep slab with a thin vertical crack; the short crux is on P3) and nothing for P2 or P4-P7. The only other first-hand record, a 2025 comment, rates the line 5.10 C1 R and describes grass hummocks, dirt-filled cracks, thick lichen and loose blocks. So even the grade is contested, and the stored 'historical C1' note has no online source. A 7-pitch table would have to be invented. Other findings: the stored grade 5.9 conflicts with that 2025 report (5.10 C1 R), and the route's quality/cleanliness warning is not in any column. Sources: https://www.mountainproject.com/route/109096812/middle-finger-buttress-right-side (description + comment), https://www.thecrag.com/en/climbing/united-states/washington/route/4529503278 |
| `wa_elephant_head_standard` | S | Route identity unclear and no pitch-level description exists. No published route on Elephant Head (Dome Peak group) could be found; the peak shows up only as a landmark in Ptarmigan Traverse and Dome Peak accounts, and peakbagger ascent logs could not be read (403/JS wall). The stored row also mixes two approaches from opposite sides of the peak. pitch_detail and beta send parties up the Dana Glacier (west side, the Ptarmigan/White Rock Lakes side), while approach, climbing_route and descent_text describe Downey Creek -> Bachelor Creek -> Cub Lake -> Itswoot Ridge, which is the Chickamin/Dome Glacier side. The approach text also reads as a Dome Peak approach. The grade 'Class 4 / glacier' does not agree with climbing_route's 'Class 2-3' finish, and descent_text asserts a 'possible short rappel' contingency with rappels = 0. Needs a human decision on what this row describes before any breakdown is written. |
| `wa_lincoln_peak_north_ridge` | T | Row mixes two climbs. The name is 'North Ridge / Standard' and the approach text describes the ~1,000 ft north face/ridge first climbed in May 1958 (Cooper and O'Conner), but the stored beta, overview, fa and pitch_detail all describe 'Wilkes-Booth', the ~2,000 ft NW Face WI4 line first climbed in 2015 (Coltrane/Rynkiewicz). Identity must be settled before a breakdown can be written. |
| `wa_eldorado_peak_northeast_face` | T | Identity unclear and no pitch-level source. Two different climbs go by 'Northeast Face' on Eldorado: a pitched ice line that breaks right from the East Ridge at the bergschrund (~8,400 ft) and climbs AI3–4 ice through the schrund and face, and a set of easy-to-moderate snow traverses across the face (low line below the 8,100 ft crevasse, high line below the schrund, or a direct line above it). The stored row (50–60° running belay beneath a rock band) sits between them. The only detailed pages (SummitPost route page, Mountaineers trip report) were not readable (HTTP 403); nothing found gives the face in sections. |
| `wa_mount_index_north_peak_traverse` | T | Row identity unclear. The name is 'Main Peak via North Approach' and the stored beta describes reaching the Main Peak by the East Route from Lake Serene or a Proctor Creek approach, while the overview, approach, pitch_detail, rappels and fa describe the North Face of North Index followed by the full North–Middle–Main Index Traverse (Beckey/Schoening 1950). These are different climbs; which one this row is must be settled before a breakdown is written. |
| `wa_lemah_two_scramble` | U | Identity unclear. Every source for this ground (the Lemah Creek meadow, the glacier remnant, the class 2-3 cliff bands, the moat and wet chimney, the chute, the col between Lemah Two and Lemah Main) describes the standard route to Lemah MAIN (Lemah 3), which only passes BELOW Lemah Two. No source found describes a route from that col up to Lemah Two's own summit; the stored descent_text itself ends by working 'north toward the true summit', i.e. Lemah Main. The row appears to be the Main Peak route filed on Lemah Two, so it is not rewritten. Sources: ericsbasecamp.net/trips/Lemah/Lemah.htm, mountainproject.com/route/124569007/lemah-glacier, mountainproject.com/area/119745946/lemah-mountain. |
| `wa_big_four_mountain_northwest_ridge` | V | No route description of the Northwest Ridge found anywhere online — only the 1931 first-ascent fact (Farr and Winder) and that it starts from the ice caves trail. Searched SummitPost (mountain page, via archive), Wikipedia, WTA, NWHikers, Mountain Project; all modern beta covers the Dry Creek/East Face, Tower Route and North Face instead. Nothing section-level to write without inventing. |
| `wa_black_peak_east_buttress` | V | Only one sentence exists online (SummitPost Black Peak page: ascend from Wing Lake, easy lower portion, then a gully system of fairly solid Class 3-4 steps) — which the stored beta already carries. No trip report, no indication which gully, where it tops out, or how it reaches the summit. Two vague sections would add nothing actionable, so skipped. |
| `wa_mount_fairchild_standard` | V | No section-level description of an ascent of Fairchild found. The only route description (Mountaineers route page, citing the Olympic climbing guide) is one sentence: from Mount Carrie's summit go NE down the Carrie Glacier, circle to the north of Fairchild and ascend its Southwest Ridge — no detail beyond that. See the finding below: the stored approach/descent text describes a different trip. |

## Findings in OTHER columns — NOT acted on (46 routes)

Each one is a research agent's reading of the sources against what the row stores. None was
written: grade, pitch count, discipline, `fa`, `beta`, `rappels` and `descent_text` are outside
this pass, and some of these are identity questions (which climb is this row?) that need a human.

- **`wa_liberty_bell_freedom_or_death`** — beta column states P4 is 5.10c; the route description and a first-ascent-era comment put the pitch to its anchor at 5.11c (the 5.10c is the traverse only). Stored beta wording tracks the route-page description closely.
- **`wa_up_in_arms`** — Stored route grade is 5.10b, but both the first-ascent journal report and the route page grade the route 5.11 (pitch 1 is 5.11). The beta column says aid is 'still occasionally used by the first ascensionists'; the report says the route was cleaned and freed with three added bolts, so it is all-free. The overview's 'six-pitch 5.11 testpiece' already contradicts the stored 5.10b.
- **`wa_clean_break`** — The approach column describes the Burgundy Col trail and ends 'Burgundy Spire is reached from the basin/col area' - that is the approach to Burgundy Spire and the usual DESCENT from Juno; the standard approach to Clean Break is up Silver Star Creek to the base of the east buttress at about 5,000 ft (some parties go over Burgundy Col and drop down the back side). The beta column says the first ten pitches are sustained hand cracks, but pitches 3, 4, 6 and 9 are 5.0-5.8 blocks, chimneys and traverses.
- **`wa_doorway_flake`** — The approach column describes reaching an 'open basin' via Waterfall Basin; the route description instead has climbers reach the grassy saddle, go west to the base of Skeena26, then climb a class 4 scramble (with some low fifth-class moves) to the talus below the far western wall. That scramble is not mentioned in the stored approach.
- **`wa_western_dihedral`** — Overview calls the route two crux pitches 'sandwiched between easier friction climbing above and below', but pitch 1 is also 5.8. As with Doorway Flake, the stored approach leaves out the class 4 scramble from the base of Skeena26 up to the far western wall (about 1 hour from the grassy saddle, about 4 hours from the trailhead).
- **`wa_accidental_discharge_east_face`** — discipline is 'mountaineering', but this is a three-pitch 5.10 rock route on a peak whose other routes are filed 'alpine'. The descent_text offers 'downclimb the South Ridge route if conditions allow'; the South Ridge is graded 5.8, so that is not a casual downclimb. The route-page GPS (48.5093, -120.66) on the source site sits at Washington Pass, not the Gunsight Range; if any stored coordinate for this route or West Face came from there it is wrong.
- **`wa_east_face`** — descent_text ends 'Navigate the crevasse field on Chickamin Glacier to return to base camp', but the route's base and view point are on the Blue Glacier, the east side of the range; worth checking which glacier the moat descent actually lands on. The beta column's 'hidden line visible from Blue Glacier' is self-contradictory wording taken from the route description, where it means the start of pitch 2 is visible from the glacier.
- **`wa_roan_wall_center_stage`** — The stored beta places Martha's Place (the bivy boulder) 'near the base'; one source puts that boulder at the head of the basin, above the turn-off for the Roan Wall approach. Not a pitch_detail matter; noted only.
- **`wa_flight_of_the_falcon`** — The route is on Salish Peak but is filed on wa_waterfall_basin, as it is on the source that lists it, so this looks intended. Height is given as 700 ft in one source and 800 ft (length_m 244) in another. The stored descent_text says the walk-off goes 'left (west)'; no source consulted gives a direction for it, only that it is easy and takes about 40 minutes.
- **`wa_technicians_of_the_sacred`** — The route is filed as sport; P6 is a gear pitch (hand crack), so a small rack is needed. The stored grade 5.12c is the high end of the P1 range (12b to 12b/c).
- **`wa_sisu`** — Source notes the route is often wet in spring and gets afternoon shade.
- **`wa_starfish_enterprise`** — Filed as sport, but P1 needs cams for the corner and P5 takes small cams (the source's rack is 16-18 draws plus 4-6 cams from tips to fat fingers).
- **`wa_crying_dragon`** — Rappel: the source suggests Green Drag-on and then swinging to Rise and Fall, or Town Crier, each with one 60 m rope. The P4 anchor is not rap-equipped, so a party bailing there must aid up and left on Green Drag-on or climb P5 and rappel Town Crier.
- **`wa_golden_age`** — Several stored columns disagree with the first-ascent topo. (1) descent_text and rappels say not all belays are bolted for rappel and that most parties walk off or use the Tiger/Ellen Pea rappels; the topo says all belays are fully bolted and the route rappels with one 70 m rope. The stored beta repeats the 'not all rappel-ready' claim. (2) The stored approach says the start is reached by climbing the early pitches of The Tiger or Ellen Pea; the topo gives a direct approach up the gully (about 1 hour), leaving it on a narrow ledge that leads back right to the first pitch, a 4–5 in left-arching corner, with the Tiger/Ellen Pea apron only as an optional extra. (3) The AAJ photo captions number the pitches one higher (crux 'fifth pitch', hand traverse 'sixth pitch') than the 7-pitch topo; the topo's own captions match the numbering used here.
- **`wa_the_tiger`** — The stored grade 5.12- is the softer of the two grades given; the first-ascent reports give IV 5.12b.
- **`wa_northwest_face_4`** — DESCENT: descent_text and rappels give only the first-ascent descent (south ridge, then a pocket glacier and slabs, then 1-2 raps from the 5,400-ft crest). The 2023 party advises strongly against the south ridge (steep, loose, uncertain). They went north instead: 2 raps from the summit on existing slings, heather ledges skier's left onto the north ridge, one more fixed rap station at an airy step, then a walk down to Dutch Miller Gap. The rappels column also gets the order wrong: it says the raps are 'off the south ridge to a pocket glacier'. In the first-ascent account the raps come AFTER the glacier and slabs, from the 5,400-ft crest into the valley. The same 2023 report says the rock was much looser than 'excellent gneiss' suggests, with loose blocks on the middle pitches. The first-ascent date is given as both August 2001 (the Mountain Project header) and September 10, 2001 (the first-ascent text). The stored Sep 10 matches the first-ascent text.
- **`wa_spontaneity_arete`** — The approach column still describes the fixed-rope line. Since July 2023, a flagged approach to climber's right of the cave, on treed ledges, mostly avoids the fixed lines and rejoins above the old third fixed rope. This may be worth adding to approach. Rack is cams to #3 with doubles of #1, plus nuts.
- **`wa_spontaneous_distraction`** — RAPPELS: the rappels and descent_text columns say one 70 m rope suffices to rappel the route. The route description agrees, but a 2021 comment says a 70 m rope does NOT reach from the trees directly above pitch 3's last bolt. Only pitches 1-2 rappel cleanly, and a pitch-3 rap would need an intermediate station on trees off to the side. A human should decide whether to soften 'one 70m rope is sufficient'. Access alternatives: climb the first three pitches of Spontaneity Arete and cross the gully, or go up the gully that parallels that route (about 1.5 hours).
- **`wa_big_kangaroo_walkabout`** — The stored grade is '5.11'. The route is IV 5.11 A2 and has never been climbed free: P3-P5 are A2. A reader sees it as a free 5.11 route. P5 is my reading of the report's next pitch after P4 ('aided out the next roof'); the report does not number it explicitly. P1's A2 label in the stored table was wrong: it is a free layback.
- **`wa_castle_in_the_sky`** — The rack is a single set 0.1-3 plus doubles 0.2-1, nuts, optional #2-#3 knifeblades, and a 60 m rope. The descent in the topo is simply 'the standard route down past Perfect Pass'. The stored descent_text's suggestion to downclimb or rappel pitches 2-6 in an emergency is not in any source I read. The first-ascent report puts the upper ridge at about 800 ft of low-to-mid 5th, where beta says about 1,000 ft.
- **`wa_little_sister_west_face`** — pitches=7 comes from 'up to seven pitches', a maximum, not a count. The first-ascent trip report calls the wall about 800 ft high; the stored length_m is 305 (1,000 ft, from Mountain Project). In 2013 the first ascensionist descended the south face to a col. The stored descent (reverse the westmost rib to the second lower notch, then snow or raps) matches the later Mountain Project write-up, so there is no conflict, just two options. Rack: small rack to 2 in.
- **`wa_the_tooth_indentured_servant`** — The overview says the route is about 500 ft left of The Tooth Fairy; the first ascensionist says '100+ yards'. Minor. The 2021 first-ascent post gives P2 as 5.7; the route page and a 2023 repeat say 5.8. A 12-14 quickdraw rack is usual.
- **`wa_the_monk_odine`** — DESCENT: descent_text and rappels say 'three 75-ft rappels down the NE gully'. A 2020 account adds about 50 m of downclimbing to an obvious sandy gully first, then 3 rappels off TREES, so bring webbing. The route page's own text grades the route 5.8 while its header lists 5.9; the stored 5.9 follows the header. A photo caption spells the name 'Ondine'. 'The first two pitches are a chimney' conflicts slightly with one account of '2-4 pitches of munge'; the pitch count of 3 is loose.
- **`wa_summit_chief_mountain_north_face`** — climbing_route row 1 prose ('the only published account of this line is the first ascent...') and the beta column name the FA party (Haley) as the source of a comparison and a quote; that may run into the no-sources rule. The FA account says the SW-side rappels land on snow leading to a col WEST of the peak; descent_text says 'return toward the approach basin/camp', which is consistent but vague. grade and pitches are null.
- **`wa_burnt_boot_peak_north_ridge`** — The beta column quotes the FA note verbatim and names its author ('Recorded in a single short first-ascent note by Don Williamson: ...'). That is a named source and a copied passage on a rendered surface. Wikipedia dates the FA to June 1971; fa just says 1971. Single source; no repeat ascents found.
- **`wa_fortune_peak_east_slope`** — length_m = 101 is presumably the ~330 ft of the ESE ridge above ~7,050 ft, not the east slope from Headlight Basin (~6,600 ft to 7,382 ft is roughly 240 m of gain). Worth a look before it feeds any planner estimate.
- **`wa_fortune_peak_standard_route`** — The approach column says to 'continue on the Ingalls Way trail toward Lake Ann' after the shared 0.4 mi. That looks wrong: Ingalls Way goes to Ingalls Pass, and the Lake Ann trail branches off the Esmeralda Basin Trail. The beta column has the same 'Ingalls Way/Lake Ann trail' conflation.
- **`wa_klawatti_peak_sw_buttress`** — One source notes that older guide descriptions call the SW ridge a 3rd-class scramble, and that glacier recession has since added a low-5th pitch at the bottom. The approach column still says 'this route is NOT on Eldorado Peak itself, despite being filed under the same area'. The route is now filed under wa_klawatti_peak, so that sentence is stale. It is also a long Eldorado summit approach pasted onto a Klawatti route ('toward Eldorado's famous narrow snow ridge and the 8,868-foot summit').
- **`wa_remmel_mountain_nw_ridge`** — The rappels column says '2, both on the descent - one off each of the two summit gendarmes ... roughly 30 m of rappelling in total'. The source puts 2 rappels on the ASCENT (off the west side of the North Summit), plus one off each gendarme on the descent. Likely 3-4 on the descent, since the North Summit presumably has to be re-crossed or bypassed; the source says 'several rappels'. The 30 m total is not in any source. The beta column has the same order error ('each is climbed ... and then a rappel on the west side regains the ridge crest'), and descent_text leaves out the North Summit entirely. The beta's claim that parties 'can bypass the technical sections by staying lower on the west slope' was not found in any source. pitches=6 and length_m=361 unverified. Source timing: 3.5 h camp to summit, 2.5 h descent.
- **`wa_sw_couloir_and_face`** — Route grade is stored as '5.2' with discipline 'ice'; the source gives WI3/5.2, Grade III, 3,300 ft. Stored overview/beta say '60 degrees at the bottom, 70 near the top' for the 300 ft slope — correct — but the stored beta opens with '100 ft of steep snow leads to a large transverse crevasse (crossed on the left)', which is the SECOND crevasse; it omits the 600 ft lower icefall, the ice chimney and the 5.0 step entirely. The source also states round trip from Lake Ann is ~8 hr (matches descent_text).
- **`wa_mount_rainier_fuhrer_thumb`** — Stored beta calls it a '50° snow/ice couloir' and puts camp at ~9,000 ft; sources give the Thumb itself as 40–45° with 50–55° only on the Wapowety Cleaver above, and high camps on the Wapowety Cleaver/Wilson edge (~9,500 ft per one route summary). Not changed.
- **`wa_snoqualmie_mountain_the_snostril`** — Stored grade is null; sources give WI4+ M5+ (MP) or WI4 M5 (AAJ), ~250 m total. Stored length_m 183 is short against the ~250 m sum. The stored fa text ('Partial ascent: Mike Preiss and Steve Wick, 1993 (incomplete)') is incomplete: Preiss returned in 2010, rappelled in and rope-soloed the crux, and is credited with the first ascent done piecemeal; the 2021 party made the first integral free ascent.
- **`wa_mount_maude_r2`** — descent_text and rappels are written as testimony ('one trip report recorded', 'one party recorded only about 30 minutes') — should be stated as fact. Stored length_m 457 and pitches 6 come from the MP page (1,500 ft, 6 pitches, Grade III); grade is null where MP gives Grade III with ice screws, pickets, 2 tools, light rock rack.
- **`wa_fantasy_falls`** — Stored grade is null; source gives WI5, 3 pitches, 425 ft (129 m) — stored length_m 130 agrees.
- **`wa_mount_stone_putvin`** — Stored climbing_route mixes two different lines: the 800 ft climb onto a rock rib and crossing to its north side (one trip report's variation, which then had to drop ~200 ft to reach the notch) and the standard boot path west under the cliff band to the west-ridge notch. The descent_text states the summit step is 15-20 ft class 4 in a shallow crack; sources rate it variously class 2-3, 3+ and 4. Stored headwall note says '~mile 2.8' while approach says ~4,200 ft; not reconciled here.
- **`wa_lena_lake_to_mt_stone_traverse`** — The stored climbing_route says parties descend about 300 ft from the Gate to the base of a basalt cliff before the south-face gully; I found no source for that figure. One source gives Upper Lena Lake as 7.5 mi from the trailhead (stored: 6.5 mi).
- **`wa_north_ridge_2`** — Rock quality is contested between sources (one calls the final 400 ft solid enough, others loose and extremely exposed). Stored length_m 335 is not checked here.
- **`wa_star_peak_sawtooth_scramble`** — Summit elevation: overview says 8,693 ft, sources say 8,690 ft (trivial). The east-side talus warning is from the stored descent_text's trip-report claim; I did not find a second source for it.
- **`wa_tepeh_towers`** — The route page lists it as Grade III, which does not fit a 30-minute route; stored grade 5.0 and pitches 1 agree with it. Stored length_m 30 is not supported by any source I read. The row is filed under Eldorado's Main Peak area although the towers are a separate formation off the Inspiration Glacier (the stored approach already says so).
- **`wa_olympus_summit_block_north_face`** — Sources disagree on rope length for the rappel: one says a 30 m rope does not reach the intermediate station and 2x30 m is needed to reach the base, another prefers 35 m+; stored rappels/descent_text say a 60 m doubled reaches the snow in one. The stored grade is 'Class 5.4' - a mixed token; '5.4' is the value.
- **`wa_south_face_of_the_mole`** — The route is catalogued (and was approached in one trip report) from the Rat Creek side, with the chockstone notch at ~6,800 ft; the row is filed under Hook Creek Drainage and the stored approach offers Snow Creek or Hook Creek. Descent: one party rappelled the NORTH side on bolted anchors, 2.5 rope lengths with a 60 m rope; the route page lists a slung boulder with a bolt, a tunnel traverse, or retracing the route. Stored descent_text omits the north-side bolted rappels.
- **`wa_american_border_peak_northeast_face`** — No stored fa for this route; the source gives Dwight Baker, Fred Beckey and John Dudra, 21 Sep 1952. Approach (none stored) is either down from the pass reached on the Southeast Route or via the Canadian Border Peak approach; best with snow cover.
- **`wa_jack_mountain_north_ridge`** — Stored overview calls the route 'Grade II, class 4', but the only detailed ascent describes a mid-fifth-class pitch leaving the glacier and a low-fifth finish up the East Ridge; a Class 4 label understates it (though an easier ridge access lower down may exist). Stored approach centres on the East Bank Trail/Devils Creek; the documented modern approach is the Ross Lake water taxi to May Creek camp (~1,600 ft), game trails through rock bands at ~3,500–4,100 ft, ridge crest ~5,000 ft, camp ~6,700 ft at the glacier toe. The 2007 reply also says descending the N Ridge and glacier is considerably easier than the East Ridge, which the stored descent_text frames the other way round only implicitly.
- **`wa_jack_mountain_southwest_ridge`** — Stored approach says to traverse from the notch 'across to the base of Jack Mountain proper and the start of the southwest ridge'; the only ascent report of this line simply stays on the ridge crest from the saddle. Treat the start point as loose. Descent_text's plan to downclimb the ridge is not described by any source — the reported party descended the South Face and side-hilled back to Little Jack.
- **`wa_klawatti_peak_north_ridge`** — None — stored beta, approach and descent agree with the sources. length_m 178 matches the col-to-summit rise (7,900 to 8,485 ft).
- **`wa_gilbert_peak_conrad_glacier`** — The Mountaineers route page gives a 4,301-ft gain, ~22 mi round trip and an 8,201-ft high point (the peak is usually given as 8,184 ft). The Mazamas note that late in the season there may be no steep snow on the final section. Nothing contradicts the stored beta/approach/descent.

## Round-2 findings verified and applied (same day)

Two agents checked every other-column finding from the round-2 batches (I–O) against sources:
`2026-09-25-verify-4.json` (I–K) and `2026-09-25-verify-5.json` (L–O). Only CONFIRMED findings were written.

- **Prose corrections, 15 routes** (`enrich:apply --from`, verified on re-read): Tahoma Glacier (Tahoma Creek Trail closed),
  Adams North Ridge descent, Price Glacier descent gully (south, not west), White Salmon beta (not an ice route),
  Cockscomb beta + fa (Klindt Vielbig), Forbidden North Ridge ("North", not "Northeast"), Johannesburg NE Rib (1951 vs 1957
  line, bivy position), Bonanza overview (the 5.7/5.8 grade belongs to the traverse), Mojo Rising (aid not freed), The Swarm
  (one protection bolt, not bolted pitches), Ultramega OK descent, King Kong fa (Jon Gleason), Tooth SW Face descent
  (rappel the South Face), Pandora's Box (no 5.6 summit move; a steep snow couloir, not technical mixed), Adams Wilson
  Headwall approach (Yakama Nation land, tribal permit).
  - Dropped at apply time: the Cockscomb `approach` rewrite. The live value already started at Heliotrope and crossed the
    Coleman and Roosevelt, so the finding described an older value.
- **Classification SQL** (`2026-09-25-classification.sql`, `-2.sql`, each with a rollback): Squak grade, Cockscomb pitches 5,
  Mojo Rising 5.11b C1+, Tooth Fairy 5.9+, Enchantment Peak Class 2-3, Triumph West Class 4, Vesper standard Class 2-3,
  Ultramega OK 273 m, Bacon Peak renamed "Diobsud Creek Glacier". grade_num kept equal to `gradeNumFor()`.
  - Held back: Megalodon pitches (20 is a different line from the stored grade), Bonanza grade V -> 5.7 (single source,
    moves grade_num), Little Tahoma grade (identity open), Kennedy grade (would empty grade_num), Sherpa grade (proposed
    value is prose), Sitkum grade (rewording only), Index Traverse pitches -> null (could change route classification).
- **No-sources fixes** (`2026-09-25-no-sources.json`): Burnt Boot beta quoted a first-ascent note and named its author;
  Summit Chief overview credited a named climber's opinion. Both restated in plain voice.

REFUTED and UNCLEAR verdicts are in the verify files' `review` blocks — do not re-raise the refuted ones.

**Needs the owner (identity):** Lemah Two scramble, Lincoln North Ridge, Eldorado NE Face, Index "Main Peak via North
Approach", Elephant Head, North Norwegian Buttress and Willis Wall each mix two climbs or name a whole face;
`wa_mount_baker_boulder_park_cleaver` looks like a duplicate of `wa_mount_baker_boulder_glacier`.

**Round-3 other-column findings above are NOT verified yet.** Two stand out: Golden Age's descent ("most parties walk off"
vs a fully bolted rappel line per the first-ascent topo) and Mount Fairchild's approach/descent (taken from a party that
walked past the peak, not up it).
