# Route grades — one final grade per WA mountain route (2026-10-01)

**Trigger.** Disappointment Cleaver (Rainier) headlined **"3rd-4th class"** — read out of a
`rock_grade` note by `displayGrade()`'s column chain — while `grade` held "Grade II–III glacier",
`grade_num` was null, and the route sat outside every grade filter. No source says 4th class:
SummitPost *Class 2-3*, the NPS route brief *class 2 scrambling with occasional class 3 moves*,
Mountain Project *Mod. Snow*, The Mountaineers *Basic Glacier Climb*. Its page also read as two
routes: a second approach card (camping at Ingraham Flats — a camp choice, ruled SINGLE in
`audits/wa-multi-approach/`) rendered as "2 ways in" with its own base-finding, and the
base-finding text explained the Gibraltar Ledges and Ingraham Direct routes.

## The rule

A mountaineering / scrambling / alpine route has **one final grade**: its **crux**, the top of any
range, on **one scale** — `Class 1-4`, `5.x`, or `WI/AI n` — stored in `grade`, with
`grade_system` and `grade_num` (= `gradeNumFrom`) to match, and `ice_grade_num` for an ice crux.

- `lib/grade.js` `finalGrade()` makes that value the headline on those three disciplines
  (pinned by four `check:grade-parser` fixtures; scoped because on MP ice/mixed rows `grade` is
  the free grade beside an ice headline — a blanket rule moved 198 of those, measured and refused).
- The other grade columns stay as the COMPOSITE GRADE breakdown.
- The route finder now offers a grade range on all three (`lib/DbAreaBrowser.jsx`
  `DISC_GRADE_SCALES` / `GRADE_SYS_FILTERED`), filtered by scale so Class 4 and 5.4 (both 4) stay apart.

Mapping conventions the researchers used (`research/BRIEF.md`): non-technical glacier/snow →
Class 2; steep snow with no ice grade → Class 3; "Easy/low 5th" with no number → 5.0; unroped
tops out at Class 4. Notes say when a snow term was mapped.

## What was done

| step | rows | script / record |
|---|---|---|
| DC row: grade, rock_grade, ALPINE III (contradicted COMMITMENT II), crux note, camp card, other-route prose, `rappels` | 1 | `scripts/oneoff/fix-dc-grade-and-single-route-beta.mjs`, `rollback-dc-*.json` |
| online research, every WA mountaineering/alpine/scrambling/ice/mixed route | 1,157 (590 high, 413 medium, 108 low conf.; 46 drytooling skipped) | `research/in`, `research/out`, `research/BRIEF.md` |
| final grade written | 689 rows, 424 headlines changed | `scripts/oneoff/apply-route-grades.mjs`, `plan-*.json`, `rollback-*.json`, `headline-changes.tsv` |
| low-confidence leftovers normalised (record's own difficulty kept where research disagreed at low confidence: East McMillan W Ridge, Bacon Diobsud, North Star E Route, Chopping Block S Route, Tupshin) | 46 | `research/out/zz-normalize.json` |
| out-of-state `grade_system` relabelled to the scale the grade text is on ("3rd"/"4th" labelled yds, unlabelled 5.x) — label only, grade_num untouched | 351 | `scripts/oneoff/relabel-mountain-grade-systems.mjs`, `rollback-relabel-*.json` |
| pages explaining a second route: 405 naming a sibling read by two readers, 16 MIXED; sentence-level fixes | 12 | `scripts/oneoff/scan-mixed-route-beta.mjs`, `mixed-beta/`, `scripts/oneoff/apply-mixed-beta-fixes.mjs` |

**End state:** 927 of 930 WA mountain-discipline routes carry one final grade. The 3 without one
have no grade published anywhere: `wa_golden_horn_north_face`, `wa_mount_persis_the_hexorcist`,
`wa_storm_king_north_face`. `grade_num` drift on the set is 2 rows, both `ice` rows this pass
did not write (`wa_mcclellan_butte_north_couloir`, `wa_new_york_gully`).

Every write went through `patchRow` (exactly one row or it throws) and was re-read and reconciled
column by column: 0 mismatches.

## Not done — owner decisions

**Route identity.** Pages that ARE another route, or two rows for one climb, need a merge or a
rename, and `docs/codebase/route-identity.md` reserves that. Prose was left as is on Bonanza
"North Ridge" (wholly the Mary Green Glacier route), Huckleberry West Route (beta, fa and overview
name three lines) and the Ragged Edge pair. The full list, from the researchers and readers:

| route | note |
|---|---|
| `wa_amphitheater_mountain_north_buttress` | Face field calls it 'Middle Finger Buttress (right side)' while the overview puts it just east of Middle Finger Buttress; may overlap Middle Finger Buttress - Right Side (also III 5.9). |
| `wa_austera_peak_chockstone_route` | Overlaps the other two Austera rows: the chockstone chimney is the summit-tower crux of the standard route, so this may be the same line. |
| `wa_bears_breast_mountain_se_mega_slab` | Describes the same SE Mega Slab and summit block as Infinite Beauty and Timeless Treasure; likely a generic duplicate of those lines. |
| `wa_big_snow_mountain_east_buttress` | Sources call the 5.10 free line 'a Pete Doorish route' on the buttress, which may be a separate line from the 1971 Dial-Williamson III 5.7 A1 route the record otherwise describes. |
| `wa_bonanza_peak_north_ridge` | Overview and breakdown describe the Mary Green Glacier standard route (glacier, then Class 3-4 rock), duplicating wa_bonanza_peak_mary_green_glacier rather than a distinct North Ridge line. |
| `wa_bulls_tooth_standard` | Another party calls the Class 4-5 south ridge 'undoubtedly the easiest way' up the Tooth, so it is unclear that a separate Class 3 north-notch route exists as described. |
| `wa_chimney_rock_west_face` | The id says 'west_face', but the name and overview describe the South Peak via the East Gully. |
| `wa_colchuck_peak_east_ridge` | Its face (Colchuck Glacier / Colchuck Col) and breakdown describe the standard Colchuck Glacier route, so it may duplicate wa_colchuck_peak_colchuck_glacier. |
| `wa_crooked_thumb_peak_south_route` | The face field combines a 2016 NW couloir–N ridge–W face–S ridge line with a 1963 diagonal-gully/chimney line, so this may be two routes merged. |
| `wa_cutthroat_peak_southeast_buttress` | The Mountaineers' 'Southeast Buttress' description (Tarzan Jump, III 5.8) matches the South Buttress route, so this row likely duplicates wa_cutthroat_south_buttress. |
| `wa_davis_peak_nc_south_slope_and_ridge` | Same Gorge Creek south-side route as wa_davis_peak_nc_southwest; the two rows likely describe one route. |
| `wa_davis_peak_nc_southwest` | Likely the same south-side Gorge Creek route as wa_davis_peak_nc_south_slope_and_ridge. |
| `wa_dragontail_peak_r1` | Hidden Couloir is only the entry third of Triple Couloirs, not a separate summit route; no source lists it as a standalone climb. |
| `wa_fortress_mountain_northeast_face` | Named "Northeast Ridge" but the overview describes a NE-face headwall plus a long snow slope; the 4th-class chimney ridge from the Fortress-Chiwawa col is the line the East Ridge row already describes. |
| `wa_gardner_mountain_west_ridge` | Named "West Ridge / Saddle Traverse" but face and breakdown describe the Class 2 south slopes; sources put the west traverse at Class 3-4. |
| `wa_garfield_mountain_scramble` | Duplicates the "South Route (Main Peak)" row: same south route to the Main Peak, which that row (and sources) put at easy 5th. |
| `wa_goat_mountain_east_peak` | Same objective and approach as the "South Ridge / Standard Scramble" row (both leave Trail #673 for the East Peak); the two rows look like one route. |
| `wa_goat_mountain_south_ridge` | Duplicates the "East Peak Traverse" row (same East Peak summit from Trail #673). |
| `wa_south_gully_south_spur` | Record merges two MP routes: the summer Easy 5th rock route and the winter AI1-2 M2+ snow/mixed route (its alpine/ice grades and breakdown are the winter one). |
| `wa_half_moon_southwest_slopes` | id says "southwest_slopes" but the route is the North Ridge from the notch north of the summit. |
| `wa_hozomeen_mountain_southeast_face` | The South Peak standard route appears to share its summit finish (the same 5.6 step) with wa_hozomeen_mountain_south_peak_southwest_route; the two rows may describe one route. |
| `wa_jack_mountain_northeast_glacier` | The overview places it 'near the Nohokomeen Glacier basin'; the 1978 Beckey line climbed the north-face glacier and may overlap the Nohokomeen Glacier and Headwall route. |
| `wa_la_bohn_peak_southwest_slopes` | The id says 'southwest_slopes' but the route name and overview describe the East Ridge from La Bohn Gap. |
| `wa_little_annapurna_south_slopes` | The id says south_slopes but the record is named North Slopes and describes the walk-up from the Enchantment Lakes basin (north side); the id is the odd one out. |
| `wa_little_tahoma_cowlitz_ingraham_glaciers` | The overview and breakdown describe the gully-chimney (East Shoulder-style) finish, but rock_grade's 'several short low-5th pitches' is the separate South Face rock finish; the two finishes are merged. |
| `wa_little_tahoma_east_shoulder` | Same route as wa_frying_pan_whitman_glaciers; that record's own overview says the 'East Shoulder' and 'Fryingpan/Whitman Glaciers' are one standard route. |
| `wa_south_ridge_2` | This 'South Ridge' from Luna Col is the same standard line as wa_luna_peak_southeast_slopes (Class 2 ridge to the false summit, then the summit traverse); the two records appear to describe one route. |
| `wa_south_face_2001_variation` | Looks like a duplicate of wa_lundin_peak_south_face_left: the same 5.10 layback start, ramp and 5.7-5.8 finish to the west ridge. MP lists no separate '2001 variation' and dates the FA to 2004. |
| `wa_eldorado_peak_eldorado_glacier_nw` | Same route as wa_main_peak_4_northwest_ice_couloir; the record is named Northwest Couloir / Eldorado Glacier but describes the NW Ice Couloir above Marble Creek Cirque. |
| `wa_main_peak_4_northwest_ice_couloir` | Duplicate of wa_eldorado_peak_eldorado_glacier_nw (Eldorado's NW Ice Couloir). The peak name 'Main Peak' is ambiguous: Mount Index's routes also use it. |
| `wa_baring_mountain_south_route` | Appears to be the same standard route as wa_baring_mountain_northwest_ridge (its face reads 'Northwest Ridge / South notch'): a climbers' path up the NW side to the notch, then the summit. |
| `wa_mount_adams_mount_adams_circumnavigation` | A circumnavigation trek around the mountain, not a climbing route to the summit. |
| `wa_mount_constance_finger_traverse` | A crux section/variation of the standard South Chute route rather than a separate route to the summit. |
| `wa_mount_constance_terrible_traverse` | A named crux section of the standard South Chute route rather than a separate route to the summit. |
| `wa_mount_fury_west_west_ridge` | Face and overview describe the East Fury to West Fury connecting-ridge traverse, the same line as wa_ridge_traverse_from_east_fury, not a separate West Ridge/Northwest route. |
| `wa_mount_lincoln_standard` | Name says Flapjack Lakes approach (which the climbers' guide routes via the North Ridge, Class 3) but the face column says South Ridge (Class 2 in the same guide); the record may blend the two lines. |
| `wa_olympus_blue_glacier_east_ramps` | Calls itself the Standard finish, overlapping the separate Blue Glacier (Standard Route) record for the same climb. |
| `wa_mount_price_hester_lake_route` | Sources describe the Hester Lake route finishing via the North Ridge, not the east ridge named in the record, which overlaps the separate North Route record. |
| `wa_mount_rahm_south_side` | Same Ouzel Lake south-side gully line as wa_mount_rahm_standard; the two records look like one route. |
| `wa_mount_rahm_standard` | Describes the same south-side gully route as wa_mount_rahm_south_side. |
| `wa_mount_stone_lake_of_angels` | Describes the same South Couloir line from Lake of the Angels as wa_mount_stone_putvin (same face, approach and crux); likely a duplicate. |
| `wa_mount_stone_putvin` | Same South Couloir route via the Putvin Trail and Lake of the Angels as wa_mount_stone_lake_of_angels; likely a duplicate. |
| `wa_mount_stuart_north_ridge` | The breakdown (5.7, 5.8, 5.4, 5.9+ ...) overlaps the separate 'Direct North Ridge w/ Gendarme' row; the two rows may describe the same full-length line. |
| `wa_mount_stuart_the_gendarme` | This is the crux section of the North Ridge, not a separate route to the summit. |
| `wa_needle_peak_south_route` | The id says south_route but the name, face and beta all describe the North Ridge. |
| `wa_west_face_2` | Filed under peak 'North Peak' beside Mount Index's North Peak routes, but this is the West Face of North Gunsight Peak in the Gunsight Range. |
| `wa_mount_index_northeast_buttress` | No such route found online; its ice grade WI3-, French D and 60-degree angle duplicate the North Face of North Peak, and the overview's 'Class 4-5 scrambling on solid granite' fits neither, so it may be a merged or invented record. |
| `wa_pinnacle_peak_tatoosh_r1` | Same line as wa_southwest_scramble (Pinnacle Saddle trail, then the south/southwest face scramble); the two records appear to be one route. |
| `wa_southwest_scramble` | Duplicates wa_pinnacle_peak_tatoosh_r1 (Pinnacle Saddle / South Gully) on the same peak. |
| `wa_sherpa_balanced_rock_ne_couloir` | This is Sherpa Peak's Northeast Couloir: its 5.0 pitch reaches the summit area, not the top of the Balanced Rock obelisk, which is 5.7 on its own. |
| `wa_sherpa_balanced_rock_north_ridge` | Describes Sherpa Peak's North Ridge (same route as wa_sherpa_peak_north_ridge), which ends at the main summit, not on the Balanced Rock. |
| `wa_neve_glacier_west_ridge` | Same line as wa_snowfield_peak_neve_glacier (both are the West Ridge finish off the Neve Glacier) - likely a duplicate record. |
| `wa_snowfield_peak_neve_glacier` | Duplicates wa_neve_glacier_west_ridge (same West Ridge via Neve Glacier route). |
| `wa_south_early_winter_spire_east_buttress` | No distinct 5.8 East Buttress on SEWS could be found; this record likely duplicates or confuses the Direct East Buttress (5.9 A0 / 5.11a). |
| `wa_south_twin_sister_scramble` | Overlaps wa_south_twin_sister_west_ridge, whose own record already describes this south-gully bypass. |
| `wa_summertime` | MP lists Summertime as a single ~70 ft crag route, but the record describes a 3-pitch Grade II alpine climb (5.10/5.11c/5.10) - likely merged with another line or mis-described. |
| `wa_summit_chief_north_face` | Same route as wa_summit_chief_mountain_north_face (peak filed under two names) - duplicate record. |
| `wa_summit_chief_mountain_north_face` | Duplicate of wa_summit_chief_north_face (same North Face route). |
| `wa_the_fin_scramble` | 'Sawtooth Range Scramble' on The Fin describes the same 5.4 NE Face line as wa_the_fin_northeast_face - a likely duplicate. |
| `wa_the_incisor_scramble` | Named a 'Scramble' with a Class 3-4 grade, but sources say the Incisor has no scramble route. |
| `wa_the_temple_south_ridge` | Named 'South Ridge' but its own face field and grade describe the West Side route. |
| `wa_tupshin_peak_scramble` | Named 'South Ridge' but describes the southeast-face standard route, which sources treat as the same East Face line as wa_tupshin_peak_east_face. |
| `wa_unicorn_peak_r1` | Named as an approach ('Snow Lake / Unicorn Creek approach'), and its summit pitch is the same line as wa_classic_route_2. |
| `wa_upper_black_ice_and_winter_ice_crag_unknown` | A route literally named 'unknown' with CYA's exact grade at Upper Black Ice - likely a duplicate or placeholder of CYA. |
| `wa_vesper_peak_north_face_ragged_edge` | Same route as wa_ragged_edge (identical pitch grades and description) - a duplicate. |
| `wa_whatcom_peak_southwest_route` | Likely the same south-side line as wa_south_spur reached via the Whatcom Glacier/Perfect Pass. |
| `wa_whitehorse_mountain_r1` | Describes the same Lone Tree Pass / NW Shoulder line as wa_whitehorse_mountain_nw_shoulder in snowier conditions - effectively a duplicate. |
| `wa_e_se_face` | Logged on MP as 'East Face'; the 'E/SE' name may blur it with SummitPost's separate 5.6 Southeast Face. |
| `wa_bonanza_peak_north_ridge` | The whole page (overview, beta, breakdown) is the Mary Green Glacier standard route under the name North Ridge. It needs a real North Ridge description, or it should be merged into the Mary Green Glacier page. |
| `wa_johannesburg_mountain_northeast_buttress` | The beta and fa give this route the Northeast Rib's 1951/1957 history, so the two pages read as one route. |
| `wa_colchuck_peak_east_ridge` | Its fa and its ascent are those of the Colchuck Glacier route (whose own beta already ends with the 3rd-class scramble from the col). It is probably the same route as the Colchuck Glacier page. |
| `wa_frying_pan_whitman_glaciers` | Duplicate of East Shoulder (same approach, crossing, summit block and FA). The two pages should be merged. |
| `wa_baring_mountain_south_route` | The same route as Northwest Ridge (by both pages' own account). The two pages should be merged. |
| `wa_garfield_mountain_scramble` | The beta and fa are a copy of the South Route (Main Peak). This page is the South Route under another name. |
| `wa_huckleberry_mountain_west_route` | The overview says West Route = Beckey's west gully, the fa is the 2001 West Face, and the beta describes the East Ridge. |
| `wa_south_face_2001_variation` | The page names itself the 2001 Variation but claims to be the separately catalogued 'South Face Left' (FA 2004); either one page is a duplicate or the FA belongs to the sibling. |
| `wa_north_twin_sister_scramble` | Self-declared duplicate of wa_north_twin_sister_west_ridge (same line, same summit). It needs a merge or a decision, not only prose edits. |
| `wa_south_early_winter_spire_east_buttress` | Beta says this page is not distinguished from the Direct East Buttress, but the overview and pitches describe the moderate 5.8 East Buttress. Only the beta is wrong. |
| `wa_the_chopping_block_south_route` | Beta says 'South Route' is not attached to any established line and points at the Northwest Route and Northeast Ridge pages instead. |
| `wa_ragged_edge` | Duplicate catalog entry of wa_vesper_peak_north_face_ragged_edge. Merge the two pages; the prose itself is fine, so the fix keeps the sentence unchanged. |
| `wa_vesper_peak_north_face_ragged_edge` | Duplicate of wa_ragged_edge (see that entry). |
**Not swept.** 4 more SINGLE routes carry a second approach card that is a camp or route-finding
choice on the same approach (Burgundy Spire N Face, Dark Peak, Silver Star Glacier, Snowfield
Neve) — kept, since they describe the same climb; DC's was removed because its camp is already
under CAMPING & BIVY and its base-finding explained other routes. The wider class is the 331
SINGLE routes in `audits/wa-multi-approach/`, where that pass recorded "No change".
