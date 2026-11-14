# Elevation gain and loss audit — alpine, mountaineering, scrambling (2026-11-14)

Owner: "mt goode northeast buttress has a pretty big descent on the approach, but the stats don't show that.
Audit all routes elevation gain and loss from the trailhead to the summit and back to the trailhead for all
alpine, mountaineering and scrambling routes."

Read-only census of production (anon REST, under the DB slot gate), 6628 routes whose primary
discipline is alpine, mountaineering or scrambling. Raw per-route rows: `audit-rows.json`.

## Why Goode looked wrong

`wa_mount_goode_northeast_buttress` stores gain 10,700 / loss 10,700 (the whole loop). Its recorded track
(3,000 points with heights) measures:

| Leg | Gain | Loss |
|---|---|---|
| Trailhead → summit | +6,587 ft | **−2,199 ft** (the Bridge Creek drop to the North Fork) |
| Summit → trailhead | **+2,789 ft** | −7,158 ft |
| Whole outing (measured) | +9,376 ft | −9,357 ft |

The leg cards printed one direction per leg (Gain up, Drop down), so the 2,199 ft lost on the approach and
the 2,789 ft climbed back out had nowhere to appear, and "Trailhead to summit" printed the whole loop's
10,700 ft. The measured whole-outing gain is 12% under the stored 10,700; the 10 m noise filter undercounts
slightly, so the stored figure is not called wrong here.

## What the code change does (this PR)

- `measuredLegClimb()` (lib/tripLegs.js) measures gain AND loss for each leg on the route's own recorded
  track with heights. It is never typed or guessed, and returns nothing when there is no such track.
- TRAILHEAD TO SUMMIT now shows **Loss** (the downhill on the way up). SUMMIT TO TRAILHEAD and the DESCENT
  strip show **Regain** (the uphill on the way back). CAR TO CAR shows both. A dip is shown at 200 ft or more.
- On a loop/point-to-point, the leg's Gain is the measured leg, not the whole-outing number; the note keeps
  the outing total.
- Scrambling routes now print their stored Gain (scrambling was missing from `tripLegGeometry`'s list).
- Guard: `npm run check:leg-loss-regain` (in build).

Reach today, rendered through the real cards (dbRouteToCamel → SummitLegsCard): **135** routes can be measured
(trailhead and summit pins within 300 m of the track, as tripProfile requires); **47** now show an approach Loss and **46** a
return Regain. The audit below snaps pins at 500 m, so it measures 165 and lists a few routes the page still cannot.

## Coverage — the real gap

| Discipline | Routes | gain_ft set | loss_ft set | Recorded track | Track with heights |
|---|---|---|---|---|---|
| alpine | 5648 | 409 | 268 | 148 | 64 |
| scrambling | 561 | 178 | 140 | 141 | 57 |
| mountaineering | 419 | 211 | 174 | 145 | 44 |

By state/province (top 30):

| State | Routes | gain_ft set | loss_ft set | Recorded track | Track with heights |
|---|---|---|---|---|---|
| ca | 1633 | 1 | 0 | 28 | 24 |
| wa | 1055 | 767 | 580 | 326 | 72 |
| co | 983 | 8 | 0 | 31 | 27 |
| wy | 648 | 0 | 0 | 7 | 7 |
| ut | 638 | 0 | 0 | 1 | 0 |
| ak | 503 | 1 | 0 | 2 | 1 |
| nh | 210 | 0 | 0 | 1 | 1 |
| id | 182 | 2 | 0 | 3 | 3 |
| bc | 167 | 4 | 0 | 9 | 8 |
| mt | 145 | 1 | 0 | 2 | 2 |
| nm | 118 | 0 | 0 | 0 | 0 |
| or | 114 | 5 | 0 | 13 | 10 |
| ny | 78 | 0 | 0 | 3 | 2 |
| nv | 57 | 0 | 0 | 1 | 1 |
| ab | 29 | 5 | 0 | 7 | 7 |
| me | 17 | 0 | 0 | 0 | 0 |
| va | 9 | 0 | 0 | 0 | 0 |
| md | 8 | 0 | 0 | 0 | 0 |
| tx | 6 | 0 | 0 | 0 | 0 |
| yt | 6 | 0 | 0 | 0 | 0 |
| az | 3 | 0 | 0 | 0 | 0 |
| nt | 3 | 0 | 0 | 0 | 0 |
| nu | 3 | 0 | 0 | 0 | 0 |
| pa | 3 | 0 | 0 | 0 | 0 |
| adams | 2 | 2 | 2 | 0 | 0 |
| ct | 2 | 0 | 0 | 0 | 0 |
| rainier | 2 | 2 | 0 | 0 | 0 |
| vt | 2 | 0 | 0 | 0 | 0 |
| nc | 1 | 0 | 0 | 0 | 0 |
| wi | 1 | 0 | 0 | 0 | 0 |

Only Washington has gain/loss at any scale. Everywhere else, alpine routes carry essentially no gain, loss,
or track, so there is nothing to show and nothing to audit until they are researched or recorded.

## Findings (counts within the 6628)

| Finding | Count | Meaning |
|---|---|---|
| No gain anywhere (column or itinerary) | 5752 | nothing to print or time from |
| Track has no heights | 211 | a recorded line that could be measured once heights are filled (USGS 3DEP) |
| Approach descent ≥250 ft, measured | 48 | shown by this PR where pins sit within 300 m of the track |
| Return regain ≥250 ft, measured | 57 | same |
| Stored gain off the track by >20% | 10 | data to review |
| Gain below the trailhead→summit pin rise (−300 ft slack) | 61 | impossible as stored |
| Out-and-back with loss < gain ("dips only" convention) | 40 | ambiguous `loss_ft` |
| Out-and-back with loss > gain | 22 | finishes lower than it starts |
| Gain with no loss | 218 | descent unknown |
| No usable track, but approach prose says it descends | 70 | research candidates for an approach-loss number |

### Every measured route (trailhead → summit, summit → trailhead)

| Route | Stored gain | Stored loss | Up: +gain / −loss | Down: +gain / −loss | Measured round-trip gain |
|---|---|---|---|---|---|
| `bc_golden_hinde_phillips_ridge_route` | — | — | +14635 / −8657 | +5943 / −11923 (track) | 20578 |
| `wa_johannesburg_mountain_northeast_rib_1951_route` | 5000 | — | +10577 / −5917 | +5917 / −10577 (reverse) | 16494 |
| `wa_ptarmigan_traverse` | 11000 | 11000 | +8901 / −4678 | +33 / −5893 (track-elsewhere) | 8934 |
| `wa_mount_cameron_standard` | 3170 | 6800 | +5059 / −4169 | +3969 / −4936 (track) | 9028 |
| `wa_elephant_butte_standard_route` | 9700 | 9700 | +9443 / −3214 | +3214 / −9443 (reverse) | 12657 |
| `wa_dark_peak_dark_glacier_route` | 7100 | 7100 | +9156 / −2307 | +1669 / −8565 (track) | 10825 |
| `wa_mount_goode_northeast_buttress` | 10700 | 10700 | +6587 / −2199 | +2789 / −7158 (track) | 9376 |
| `wa_jack_mountain_nohokomeen_headwall` | 10000 | — | +9336 / −2160 | +3869 / −11056 (track) | 13205 |
| `ca_tenaya_matthes_cathedral_traverse` | — | — | +4693 / −2027 | +0 / −2589 (track) | 4693 |
| `ca_west_ridge_5` | — | — | +4296 / −1824 | +1824 / −4296 (reverse) | 6120 |
| `wa_mount_terror_west_ridge` | 6000 | — | +9259 / −1822 | +502 / −7927 (track-elsewhere) | 9761 |
| `co_wham_ridge` | — | — | +5052 / −1786 | +1817 / −5062 (track) | 6869 |
| `wa_wing_peak_northwest_ridge` | 3900 | — | +4726 / −1260 | +68 / −3504 (track) | 4794 |
| `ca_saber_ridge_traverse_south_to_north` | — | — | +6086 / −1088 | +1095 / −6080 (track) | 7181 |
| `wy_cirque_of_the_towers_traverse` | — | — | +3630 / −1079 | +3379 / −5980 (track) | 7009 |
| `wy_southwest_slope` | — | — | +5130 / −937 | +1012 / −5236 (track) | 6142 |
| `wa_magic_mountain_south_ridge` | 4800 | — | +4674 / −936 | +69 / −1301 (track-elsewhere) | 4743 |
| `wa_huckleberry_mountain_east_ridge` | 5850 | — | +4104 / −906 | +906 / −4104 (reverse) | 5010 |
| `wa_forbidden_peak_north_ridge` | 4500 | 5700 | +6420 / −863 | +0 / −3262 (track-elsewhere) | 6420 |
| `wa_mount_triumph_northeast_ridge` | 4900 | — | +5425 / −860 | +1182 / −5668 (track) | 6607 |
| `ca_west_face_11` | — | — | +8872 / −855 | +855 / −8872 (reverse) | 9727 |
| `wa_prusik_peak_west_ridge` | 5900 | 5900 | +5306 / −851 | +931 / −5398 (track) | 6237 |
| `wa_mcmillan_spire_west_west_ridge` | 9800 | 9800 | +7759 / −766 | +766 / −7759 (reverse) | 8525 |
| `mt_phantom_creek_trail` | — | — | +6791 / −673 | +673 / −6791 (reverse) | 7464 |
| `wa_mount_stuart_west_ridge` | 5175 | 5175 | +5680 / −645 | +1320 / −6381 (track) | 7000 |
| `ca_tinker_knob_via_the_pacific_crest_trail` | — | — | +3238 / −637 | +666 / −3340 (track) | 3904 |
| `ca_south_lake_peaks_traverse` | — | — | +3568 / −634 | +709 / −3701 (track) | 4277 |
| `co_mount_oxford_via_mount_belford` | — | — | +5064 / −622 | +622 / −5064 (reverse) | 5686 |
| `wy_west_face_2` | — | — | +6068 / −610 | +668 / −6142 (track) | 6736 |
| `co_mount_silverheels_north_spur_from_hoosier_pass` | — | — | +2835 / −560 | +517 / −2804 (track) | 3352 |
| `wa_mount_thomson_west_ridge` | 5200 | 5200 | +4014 / −555 | +842 / −4282 (track) | 4856 |
| `ca_a_clouds_rest_trail_clouds_rest_trail` | — | — | +2260 / −525 | +514 / −2269 (track) | 2774 |
| `wa_painted_traverse` | 12000 | — | +5317 / −505 | +3689 / −8519 (track) | 9006 |
| `wa_gardner_mountain_west_ridge` | 7400 | 5800 | +6350 / −458 | +458 / −6350 (reverse) | 6808 |
| `wa_ragged_ridge` | — | — | +5415 / −447 | +4890 / −9877 (track) | 10305 |
| `wa_black_peak_northeast_ridge` | 4130 | — | +4113 / −446 | +623 / −4259 (track) | 4736 |
| `ca_northwest_chute` | — | — | +4861 / −443 | +443 / −4861 (reverse) | 5304 |
| `wa_east_slope` | 7300 | 7350 | +7646 / −426 | +430 / −7683 (track) | 8076 |
| `wa_mount_daniel_daniel_glacier` | 5100 | 5100 | +4898 / −379 | +319 / −4784 (track) | 5217 |
| `nv_mount_rose_mount_rose_trail` | — | — | +2155 / −354 | +171 / −1962 (track) | 2326 |
| `ca_white_mountain_peak_trail` | — | — | +2771 / −350 | +345 / −2790 (track) | 3116 |
| `wa_mount_constance_north_chimney` | 7100 | 7100 | +7450 / −339 | +295 / −7412 (track) | 7745 |
| `wa_north_gardner_mountain_southwest` | 7300 | 7300 | +6258 / −319 | +319 / −6258 (reverse) | 6577 |
| `wa_mount_pilchuck_east_ridge` | 2800 | — | +3029 / −317 | +353 / −2820 (track) | 3382 |
| `wa_summit_chief_mountain_south_route` | 5000 | 5000 | +4859 / −286 | +309 / −4847 (track) | 5168 |
| `wa_hadley_peak_cougar_divide` | 3600 | 3600 | +2799 / −271 | +246 / −2779 (track) | 3045 |
| `wa_little_annapurna_south_slopes` | 5018 | 5018 | +5091 / −252 | +252 / −5091 (reverse) | 5343 |
| `ca_northwest_arete_2` | — | — | +7706 / −251 | +558 / −8032 (track-elsewhere) | 8264 |
| `ab_mount_northover_south_ridge` | — | — | +4164 / −240 | +271 / −4219 (track) | 4435 |
| `ab_storelk_mountain_east_face` | 3300 | — | +3125 / −239 | +320 / −3251 (track) | 3445 |
| `ny_allen_mountain_allen_brook_herd_path` | — | — | +2798 / −236 | +272 / −2850 (track) | 3070 |
| `wa_enchantment_enchainment` | 18400 | — | +6033 / −227 | +7983 / −13783 (track) | 14016 |
| `co_a_walk_in_the_park` | — | — | +5293 / −221 | +2617 / −7696 (track) | 7910 |
| `wa_gunn_peak_southeast_route` | 4700 | 4700 | +4046 / −216 | +356 / −4254 (track) | 4402 |
| `co_south_ramp` | — | — | +3449 / −215 | +443 / −3671 (track) | 3892 |
| `wa_bearpaw_mountain_scramble` | 1300 | 1300 | +1481 / −215 | +106 / −1346 (track) | 1587 |
| `bc_wedge_mountain_northeast_arete` | — | — | +7072 / −204 | +212 / −7050 (track) | 7284 |
| `wa_del_campo_peak_standard` | 4200 | 4300 | +4328 / −188 | +102 / −4275 (track) | 4430 |
| `wy_cathedral_traverse` | — | — | +5419 / −188 | +3056 / −8138 (track) | 8475 |
| `bc_ossa_mountain_east_ridge` | — | — | +7391 / −173 | +139 / −7255 (track) | 7530 |
| `or_middle_sister_north_ridge_hayden_glacier` | — | — | +4865 / −173 | +173 / −4865 (reverse) | 5038 |
| `ak_south_pioneer_peak_pioneer_ridge` | 6900 | — | +6287 / −170 | +173 / −6258 (track) | 6460 |
| `ny_big_slide_mtn_the_brothers_trail` | — | — | +2909 / −168 | +137 / −2850 (track) | 3046 |
| `wa_mount_blum_south_ridge` | 7000 | 7000 | +6941 / −161 | +186 / −6999 (track) | 7127 |
| `wa_big_snagtooth_west_ridge` | 4000 | 4500 | +4093 / −150 | +184 / −4168 (track) | 4277 |
| `co_spiral_route` | — | — | +2827 / −147 | +143 / −2827 (track) | 2970 |
| `wa_philadelphia_mountain_scramble` | 3685 | 3685 | +3842 / −146 | +264 / −3964 (track) | 4106 |
| `wa_mount_cruiser_south_corner` | 5250 | 5250 | +5305 / −144 | +144 / −5305 (reverse) | 5449 |
| `wa_ruth_mountain_south_slopes` | 4115 | 4115 | +4014 / −144 | +144 / −4014 (reverse) | 4158 |
| `co_longs_peak_keyhole_route` | — | — | +5008 / −142 | +111 / −4944 (track) | 5119 |
| `wa_true_grit_2` | 4400 | 4400 | +3972 / −137 | +107 / −3924 (track) | 4079 |
| `wa_gilbert_peak_west_route` | 4000 | — | +3689 / −136 | +137 / −3662 (track) | 3826 |
| `co_mt_bierstadt_standard_route_west_slopes` | — | — | +2539 / −134 | +134 / −2590 (track) | 2673 |
| `bc_slesse_mountain_southwest_gully` | — | — | +6773 / −133 | +34 / −6673 (track) | 6807 |
| `co_north_ridge_2` | — | — | +2927 / −116 | +408 / −3234 (track) | 3335 |
| `wa_clark_mountain_west_ridge` | 6500 | — | +6349 / −110 | +110 / −6349 (reverse) | 6459 |
| `ca_southwest_slope_and_northwest_face` | — | — | +4614 / −109 | +146 / −4684 (track) | 4760 |
| `co_mount_antero_west_slopes` | — | — | +4843 / −107 | +107 / −4843 (reverse) | 4950 |
| `co_east_ridge_the_citadel_clear_creek_co` | — | — | +3029 / −104 | +104 / −3029 (reverse) | 3133 |
| `co_rio_grande_pyramid_east_slope_ridge` | — | — | +4547 / −103 | +34 / −4447 (track) | 4581 |
| `wa_kendall_peak_standard` | 2800 | 2800 | +2859 / −103 | +102 / −2856 (track) | 2961 |
| `wa_ives_peak_r1` | 3400 | 3400 | +3358 / −102 | +168 / −3407 (track) | 3526 |
| `ca_ne_ridge_full` | — | — | +6393 / −82 | +82 / −6393 (reverse) | 6475 |
| `wa_mount_adams_north_ridge` | 7691 | 7690 | +7742 / −75 | +75 / −7742 (reverse) | 7817 |
| `ca_north_ar_te` | — | — | +1309 / −74 | +72 / −1309 (track) | 1381 |
| `ca_north_arete_6` | — | — | +5227 / −73 | +0 / −5179 (track) | 5227 |
| `ca_north_arete_4` | — | — | +3534 / −72 | +67 / −3519 (track) | 3601 |
| `wa_big_chiwaukum_west_ridge` | 5300 | — | +5370 / −71 | +71 / −5370 (reverse) | 5441 |
| `co_mount_sherman_southwest_ridge` | — | — | +1965 / −70 | +70 / −1996 (track) | 2035 |
| `wa_old_snowy_mountain_r1` | 3600 | 3100 | +3250 / −68 | +68 / −3250 (reverse) | 3318 |
| `wa_vesper_peak_standard_route` | 4000 | — | +3890 / −68 | +102 / −3927 (track) | 3992 |
| `ab_mount_lefroy_west_face` | 5985 | — | +5988 / −67 | +33 / −5804 (track) | 6021 |
| `wa_dragontail_peak_east_ridge_aasgard_pass` | 5600 | — | +5281 / −66 | +104 / −5322 (track) | 5385 |
| `wa_mount_teneriffe_kamikaze_trail` | 3800 | 3927 | +3913 / −48 | +174 / −4018 (track) | 4087 |
| `co_pyramid_peak_northeast_ridge` | 4500 | — | +4305 / −44 | +44 / −4305 (reverse) | 4349 |
| `wa_inspiration_traverse` | 14062 | — | +6711 / −38 | +5007 / −11715 (track) | 11718 |
| `wa_northwest_face_2` | 2425 | 2500 | +2117 / −37 | +35 / −0 (track-elsewhere) | 2152 |
| `co_wilson_peak_southwest_ridge` | 3900 | — | +3528 / −36 | +36 / −3528 (reverse) | 3564 |
| `wa_ruby_mountain_south_ridge` | 6300 | — | +6071 / −35 | +35 / −6071 (reverse) | 6106 |
| `ab_mount_athabasca_aa_col` | — | — | +4930 / −34 | +0 / −4884 (track) | 4930 |
| `wa_big_snow_mountain_east_ridge_hardscrabble_route` | 5300 | — | +5266 / −34 | +33 / −5261 (track) | 5299 |
| `ab_mount_smuts_south_ridge` | 4918 | — | +3462 / −33 | +1997 / −5393 (track) | 5459 |
| `or_hurwal_divide_traverse` | 8000 | — | +4752 / −33 | +2631 / −7380 (track) | 7383 |
| `or_north_ridge_2` | — | — | +2985 / −33 | +33 / −2985 (reverse) | 3018 |
| `wa_mount_shuksan_sulphide_glacier` | 6600 | — | +6563 / −33 | +0 / −6531 (track) | 6563 |
| `ab_mount_birdwood_northwest_ridge` | 4240 | — | +3727 / −0 | +0 / −3751 (track) | 3727 |
| `ab_mount_cline_southwest_ridge` | 6535 | — | +6357 / −0 | +34 / −6371 (track) | 6391 |
| `bc_black_tusk_standard_route` | 5700 | — | +5695 / −0 | +33 / −5594 (track) | 5728 |
| `bc_mount_begbie_north_ridge` | 5757 | — | +6696 / −0 | +0 / −6710 (track) | 6696 |
| `bc_mount_sir_donald_northwest_arete` | — | — | +6249 / −0 | +0 / −6263 (track) | 6249 |
| `bc_mount_vaux_southwest_face` | 7218 | — | +7254 / −0 | +0 / −7212 (track) | 7254 |
| `ca_east_arete_3` | — | — | +5641 / −0 | +70 / −5777 (track) | 5711 |
| `ca_jobs_peak_east_gully` | — | — | +5768 / −0 | +0 / −5768 (reverse) | 5768 |
| `ca_mount_tallac_trail_mount_tallac_trail` | — | — | +3271 / −0 | +0 / −3275 (track) | 3271 |
| `ca_mt_shasta_avalanche_gulch` | 7200 | — | +7153 / −0 | +0 / −7153 (reverse) | 7153 |
| `ca_north_east_couloir` | — | — | +7569 / −0 | +0 / −7569 (reverse) | 7569 |
| `ca_northwest_buttress_2` | — | — | +2115 / −0 | +0 / −2105 (track) | 2115 |
| `ca_sierra_buttes_lookout_trail` | — | — | +1625 / −0 | +0 / −1571 (track) | 1625 |
| `ca_southeast_face_aka_the_waterfall_route` | — | — | +3773 / −0 | +0 / −3773 (reverse) | 3773 |
| `ca_the_mountaineer_s_route` | — | — | +6112 / −0 | +0 / −6112 (reverse) | 6112 |
| `co_arapaho_peaks_traverse` | — | — | +3194 / −0 | +301 / −3507 (track) | 3495 |
| `co_castle_peak_northeast_ridge` | — | — | +4752 / −0 | +148 / −5488 (track) | 4900 |
| `co_grays_peak_north_slopes` | — | — | +2987 / −0 | +0 / −2987 (reverse) | 2987 |
| `co_mount_elbert_northeast_ridge` | 4400 | — | +4384 / −0 | +34 / −4399 (track) | 4418 |
| `co_mount_hope_east_ridge` | — | — | +4000 / −0 | +0 / −4021 (track) | 4000 |
| `co_mount_princeton_east_slopes` | — | — | +5228 / −0 | +0 / −5232 (track) | 5228 |
| `co_mount_shavano_east_slopes` | — | — | +4359 / −0 | +0 / −4359 (reverse) | 4359 |
| `co_pikes_peak_east_slopes` | — | — | +7299 / −0 | +0 / −7299 (reverse) | 7299 |
| `co_quandary_peak_standard_route_east_ridge` | — | — | +3338 / −0 | +0 / −3357 (track) | 3338 |
| `co_solo_flight` | — | — | +3582 / −0 | +0 / −3582 (reverse) | 3582 |
| `co_uncompahgre_peak_south_ridge` | — | — | +4985 / −0 | +0 / −4985 (reverse) | 4985 |
| `co_wetterhorn_peak_southeast_ridge` | — | — | +3071 / −0 | +0 / −3122 (track) | 3071 |
| `id_diamond_peak_east_ridge` | 4200 | — | +3937 / −0 | +0 / −3863 (track) | 3937 |
| `id_southwest_ridge` | — | — | +5160 / −0 | +0 / −5160 (reverse) | 5160 |
| `id_thompson_peak_south_couloir` | 4200 | — | +3942 / −0 | +0 / −3991 (track) | 3942 |
| `mt_sacagawea_direct` | 1870 | — | +1926 / −0 | +0 / −1899 (track) | 1926 |
| `nh_whitney_gilman_ridge` | — | — | +845 / −0 | +621 / −1488 (track) | 1466 |
| `or_diamond_peak_south_ridge` | 3190 | — | +2908 / −0 | +0 / −2908 (reverse) | 2908 |
| `or_northwest_ridge` | — | — | +3456 / −0 | +0 / −3456 (reverse) | 3456 |
| `or_south_ridge_2` | — | — | +7384 / −0 | +0 / −4766 (track-elsewhere) | 7384 |
| `or_south_ridge_route` | — | — | +2933 / −0 | +0 / −2933 (reverse) | 2933 |
| `or_south_sister_south_side_route` | — | — | +4820 / −0 | +0 / −4659 (track) | 4820 |
| `or_three_sisters_traverse` | 9400 | — | +4874 / −0 | +4014 / −9006 (track-elsewhere) | 8888 |
| `or_west_ridge_2` | — | — | +3655 / −0 | +0 / −3655 (reverse) | 3655 |
| `wa_abernathy_peak_south_ridge` | 5200 | — | +5005 / −0 | +0 / −5005 (reverse) | 5005 |
| `wa_big_craggy_peak_scramble` | 5600 | 5600 | +4469 / −0 | +0 / −4469 (reverse) | 4469 |
| `wa_big_snow_mountain_north_slope_dingford_route` | 5280 | — | +5032 / −0 | +0 / −5068 (track) | 5032 |
| `wa_carne_mountain_trail_route` | 3600 | 3600 | +3538 / −0 | +0 / −3542 (track) | 3538 |
| `wa_chair_peak_east_face` | 3138 | 3138 | +2980 / −0 | +102 / −3083 (track) | 3082 |
| `wa_chelan_butte_chelan_butte_trail` | 2500 | 2500 | +2602 / −0 | +0 / −2602 (reverse) | 2602 |
| `wa_eagle_rock_scramble` | 1464 | 1464 | +1489 / −0 | +0 / −1503 (track) | 1489 |
| `wa_fortress_mountain_southwest_face` | 5884 | 6000 | +5875 / −0 | +33 / −5895 (track) | 5908 |
| `wa_half_moon_southwest_slopes` | 3200 | 3200 | +2797 / −0 | +0 / −2768 (track) | 2797 |
| `wa_mount_baker_squak_glacier` | — | — | +7366 / −0 | +0 / −7366 (reverse) | 7366 |
| `wa_mount_ellinor_standard` | 2444 | 2444 | +2342 / −0 | +0 / −2337 (track) | 2342 |
| `wa_mount_pilchuck_standard_route` | 2300 | 2200 | +2134 / −0 | +0 / −2110 (track) | 2134 |
| `wa_mount_washington_olympic_standard` | 3190 | 3300 | +3102 / −0 | +0 / −3102 (reverse) | 3102 |
| `wa_scramble_route` | 3297 | 3297 | +3130 / −0 | +39 / −3172 (track) | 3169 |
| `wa_sherman_peak_baker_route` | 6800 | 6800 | +6685 / −0 | +0 / −4132 (track-elsewhere) | 6685 |
| `wa_south_early_winter_spire_southwest_couloir` | — | — | +2372 / −0 | +33 / −2389 (track) | 2405 |
| `wa_west_craggy_peak_standard_route` | 4600 | 4600 | +4488 / −0 | +0 / −4488 (reverse) | 4488 |
| `wa_windy_peak_windy_creek_trail` | 3000 | — | +2695 / −0 | +0 / −2697 (track) | 2695 |
| `wy_east_face` | — | — | +5493 / −0 | +0 / −5422 (track) | 5493 |
| `wy_owen_spalding` | — | — | +6956 / −0 | +0 / −6930 (track) | 6956 |
| `wy_southwest_couloir_3` | — | — | +5961 / −0 | +0 / −5961 (reverse) | 5961 |

### Stored gain disagrees with the track by >20%
- `ab_mount_smuts_south_ridge` South Ridge — stored gain 4918 vs track 3462 (net 3413)
- `wa_big_craggy_peak_scramble` Standard Scramble — stored gain 5600 vs track 4469 (net 4489)
- `wa_enchantment_enchainment` Enchantment Enchainment — stored gain 18400 vs track 6033 (net 5806)
- `wa_forbidden_peak_north_ridge` North Ridge — stored gain 4500 vs track 6420 (net 5550)
- `wa_huckleberry_mountain_east_ridge` East Ridge — stored gain 5850 vs track 4104 (net 3198)
- `wa_johannesburg_mountain_northeast_rib_1951_route` Northeast Rib (1951 Route) — stored gain 5000 vs track 10577 (net 4668)
- `wa_mcmillan_spire_west_west_ridge` West Ridge / Southwest Approach — stored gain 9800 vs track 7759 (net 7015)
- `wa_mount_cameron_standard` Standard Route (Southeast Slopes) — stored gain 3170 vs track 5059 (net 902)
- `wa_mount_terror_west_ridge` West Ridge — stored gain 6000 vs track 9259 (net 7437)
- `wa_mount_thomson_west_ridge` West Ridge — stored gain 5200 vs track 4014 (net 3463)

### Gain below its own pin rise
- `wa_amphitheater_mountain_finger_of_fatwa` Finger of Fatwa — gain 4800 < pin rise 5308
- `wa_amphitheater_mountain_middle_finger_buttress_left_side` Middle Finger Buttress - Left Side — gain 4800 < pin rise 5308
- `wa_amphitheater_mountain_middle_finger_buttress_right_side` Middle Finger Buttress - Right Side — gain 4800 < pin rise 5308
- `wa_amphitheater_mountain_north_ridge` North Ridge — gain 4800 < pin rise 5308
- `wa_amphitheater_mountain_pilgrimage_to_mecca` Pilgrimage to Mecca — gain 4800 < pin rise 5308
- `wa_amphitheater_mountain_west_route` West Route — gain 3000 < pin rise 5308
- `wa_bears_breast_mountain_southwest_face` Southwest Face — gain 5400 < pin rise 5707
- `wa_blue_s_buttress` Blue's Buttress — gain 1365 < pin rise 2405
- `wa_castle_peak_pasayten_scramble` Standard Scramble — gain 6000 < pin rise 6743
- `wa_cathedral_peak_pasayten_se_buttress` Southeast Buttress — gain 4700 < pin rise 5556
- `wa_concerto_in_c_for_drill_and_hammer` Concerto in C for Drill and Hammer — gain 2200 < pin rise 3058
- `wa_cutthroat_peak_cauthorn_wilson_couloir` Cauthorn-Wilson Couloir — gain 2500 < pin rise 2839
- `wa_cutthroat_peak_northeast_face` East Face — gain 2500 < pin rise 2839
- `wa_cutthroat_south_buttress` South Buttress — gain 2500 < pin rise 2838
- `wa_east_face` East Face — gain 5000 < pin rise 6760
- `wa_east_face_2` East Face — gain 2850 < pin rise 4050
- `wa_east_ridge_3` East Ridge — gain 4400 < pin rise 5891
- `wa_ellation` Ellation — gain 1200 < pin rise 1900
- `wa_flight_of_the_falcon` Flight of the Falcon — gain 3500 < pin rise 4580
- `wa_flora_mountain_southwest_slope` Southwest Slope (Standard Route) — gain 3150 < pin rise 7103
- `wa_forbidden_peak_north_ridge` North Ridge — gain 4500 < pin rise 5615
- `wa_forbidden_peak_northeast_face` Northeast Face — gain 4600 < pin rise 5615
- `wa_forbidden_peak_northwest_face` Northwest Face — gain 4800 < pin rise 5615
- `wa_golden_horn_southwest_route` Southwest Route — gain 2700 < pin rise 3486
- `wa_gunrunner` Gunrunner — gain 5000 < pin rise 6760
- `wa_hadley_peak_skyline_divide` Skyline Divide Route — gain 2818 < pin rise 3265
- `wa_j_tnar` Jötnar — gain 4000 < pin rise 4806
- `wa_jack_mountain_northeast_glacier` Northeast Glacier — gain 4501 < pin rise 7195
- `wa_liberty_bell_thin_red_line` Thin Red Line — gain 1312 < pin rise 2520
- `wa_liberty_traverse` Liberty Traverse — gain 2001 < pin rise 2407
- `wa_mcgregor_mountain_scramble` Summit Block Scramble (from Stehekin) — gain 6200 < pin rise 6516
- `wa_mount_adams_adams_glacier` Adams Glacier — gain 5150 < pin rise 7676
- `wa_mount_adams_lyman_glacier` Lyman Glacier — gain 5000 < pin rise 7676
- `wa_mount_barnes_scramble` Elwha Basin Scramble — gain 3200 < pin rise 4007
- `wa_mount_ellinor_standard` Standard Trail (Upper Trailhead, NFR 24) — gain 2444 < pin rise 3344
- `wa_mount_hopper_standard` Standard Scramble — gain 4400 < pin rise 5335
- `wa_mount_lago_south_slope_south_face` South Slope - South Face (Standard Route) — gain 2800 < pin rise 6245
- `wa_mount_lyall_south_route` Southwest Ridge Route — gain 4800 < pin rise 6802
- `wa_mount_meany_standard` Standard Route — gain 2500 < pin rise 6180
- `wa_mount_norton_scramble` Mount Norton Scramble — gain 5100 < pin rise 6052
- `wa_mount_rainier_curtis_ridge` Curtis Ridge — gain 9500 < pin rise 10006
- `wa_mount_rainier_edmunds_headwall` Edmunds Headwall — gain 8470 < pin rise 9182
- `wa_mount_shuksan_price_glacier` Price Glacier — gain 6000 < pin rise 6931
- `wa_mount_si_trail` Mount Si Trail — gain 3150 < pin rise 3499
- `wa_mount_terror_north_face` North Face / North Buttress — gain 6000 < pin rise 7551
- `wa_mount_terror_southeast_face` East Ridge — gain 6000 < pin rise 7551
- `wa_nooksack_tower_beckey_route` North Face (Beckey-Schmidtke Route) — gain 5735 < pin rise 6085
- `wa_north_ridge_west_side` North Ridge - West Side — gain 2300 < pin rise 2692
- `wa_north_star_mountain_east_route` East Route — gain 4500 < pin rise 4868
- `wa_phantom_peak_south_route` South Route — gain 1916 < pin rise 4880
- `wa_rampage` Rampage — gain 3288 < pin rise 3650
- `wa_remmel_mountain_nw_ridge` NW Ridge — gain 5265 < pin rise 5635
- `wa_silver_star_glacier` Silver Star Glacier — gain 4000 < pin rise 4476
- `wa_skookum_peak_twinsisters_scramble` North Ridge via Jaws' Tooth — gain 4200 < pin rise 4534
- `wa_south_early_winter_spire_direct_east_buttress` Direct East Buttress — gain 2350 < pin rise 2657
- `wa_south_face_10` South Face — gain 4700 < pin rise 5551
- `wa_south_face_2` South Face — gain 3500 < pin rise 4147
- `wa_soviet_route` Soviet Route — gain 5300 < pin rise 6105
- `wa_storm_king_southwest_scramble` Southwest Scramble — gain 6800 < pin rise 7320
- `wa_upper_north_ridge_w_great_gendarme` Upper North Ridge w/Great Gendarme — gain 2998 < pin rise 5172
- `wa_west_ridge_2` West Ridge — gain 3288 < pin rise 3650

### Out-and-back with loss above gain
- `wa_big_snagtooth_west_ridge` West Ridge (Standard Route) — gain 4000, loss 4500
- `wa_forbidden_peak_north_ridge` North Ridge — gain 4500, loss 5700
- `wa_forbidden_peak_northeast_face` Northeast Face — gain 4600, loss 5200
- `wa_forbidden_peak_northwest_face` Northwest Face — gain 4800, loss 5615
- `wa_fortress_mountain_east_ridge` East Ridge — gain 5884, loss 7900
- `wa_kololo_peaks_standard` Standard Route — gain 6150, loss 9500
- `wa_lost_peak_pasayten_scramble` Standard Scramble — gain 14000, loss 15700
- `wa_mount_cameron_standard` Standard Route (Southeast Slopes) — gain 3170, loss 6800
- `wa_mount_hinman_hinman_glacier` Hinman Glacier / Standard — gain 6100, loss 6300
- `wa_mount_hopper_standard` Standard Scramble — gain 4400, loss 5290
- `wa_mount_lincoln_standard` North Ridge from Flapjack Lakes — gain 5070, loss 5350
- `wa_mount_logan_fremont_glacier` Fremont Glacier — gain 8900, loss 9600
- `wa_mount_norton_scramble` Mount Norton Scramble — gain 5100, loss 5300
- `wa_mount_steel_standard` Standard Scramble (Marmot Lake / Duckabush approach) — gain 6200, loss 6400
- `wa_mount_teneriffe_kamikaze_trail` Kamikaze Trail (SW Ridge Scramble) — gain 3800, loss 3927
- `wa_mount_terror_southeast_face` East Ridge — gain 6000, loss 7550
- `wa_mount_washington_olympic_standard` Standard Scramble (above Lake Cushman) — gain 3190, loss 3300
- `wa_northwest_face_2` Northwest Face — gain 2425, loss 2500
- `wa_old_guard_peak_southwest_route` West Side (LeConte Glacier) — gain 10600, loss 12400
- `wa_sentinel_peak_standard` Standard Route — gain 8500, loss 9200
- `wa_south_face_10` South Face — gain 4700, loss 6700
- `wa_the_triad_east_peak` East Peak (Standard Route) — gain 3920, loss 5410

### "Dips only" loss convention (loss < gain on a non-traverse)
- `wa_argonaut_peak_east_ridge` Southeast Ridge — gain 4300, loss 4157
- `wa_burnt_boot_peak_north_route` North Route — gain 5300, loss 5140
- `wa_cashmere_mountain_west_ridge` West Ridge — gain 5500, loss 5300
- `wa_direct_west_face` Direct West Face — gain 3400, loss 3200
- `wa_gardner_mountain_west_ridge` South Slopes — gain 7400, loss 5800
- `wa_garfield_mountain_preiss_route` Preiss Route — gain 3200, loss 20
- `wa_garfield_mountain_southwest_ledges` Southwest Ledges — gain 3630, loss 300
- `wa_hozomeen_mountain_northeast_buttress` Northeast Buttress (North Peak) — gain 6266, loss 545
- `wa_johannesburg_mountain_cj_couloir` Cascade-Johannesburg Couloir (East Ridge) — gain 4900, loss 4600
- `wa_liberty_bell_independence_route` The Independence Route — gain 2500, loss 2400
- `wa_liberty_bell_overexposure` Overexposure — gain 2500, loss 2400
- `wa_magic_mountain_north_face` North Face — gain 4200, loss 600
- `wa_magic_mountain_northeast_couloir` Northeast Couloir — gain 4200, loss 600
- `wa_magic_mountain_northwest_ridge` Northwest Ridge — gain 4700, loss 600
- `wa_magic_mountain_southwest_cirque` Southwest Cirque — gain 4700, loss 600
- `wa_magic_mountain_west_ridge` West Ridge — gain 4700, loss 600
- `wa_mount_angeles_standard` Standard Scramble (Switchback / Klahhane Ridge approach) — gain 2550, loss 2100
- `wa_mount_baker_boulder_glacier` Boulder Glacier — gain 8100, loss 7000
- `wa_mount_olympus_west_ridge` West Ridge — gain 7500, loss 400
- `wa_mount_pilchuck_standard_route` Mount Pilchuck Trail (Standard Route) — gain 2300, loss 2200
- `wa_mount_shuksan_fisher_chimneys` Fisher Chimneys — gain 5100, loss 4700
- `wa_ne_ridge` NE Ridge — gain 6000, loss 400
- `wa_overcoat_peak_southeast_route` East Face — gain 6032, loss 5800
- `wa_pinnacle_mountain_entiat_scramble` Standard Scramble — gain 5722, loss 5400
- `wa_pinnacle_peak_tatoosh_r1` Pinnacle Saddle / South Gully — gain 1700, loss 1050
- `wa_rampage` Rampage — gain 3288, loss 213
- `wa_remmel_mountain_nw_ridge` NW Ridge — gain 5265, loss 1200
- `wa_sinister_peak_southwest_route` Southwest Route — gain 7000, loss 5500
- `wa_south_spur` South Spur — gain 11000, loss 9300
- `wa_the_chopping_block_south_route` Southeast Face — gain 6209, loss 6000
- `wa_the_hitchhiker` The Hitchhiker — gain 2600, loss 2200
- `wa_the_monk_le_gibet` The Monk - Le Gibet — gain 6000, loss 1300
- `wa_the_monk_odine` The Monk - Ondine — gain 6000, loss 1300
- `wa_the_monk_scabo` The Monk - Scarbo — gain 6000, loss 5450
- `wa_the_monk_west_cracks_left_crack` The Monk - West Cracks - Left Crack — gain 6000, loss 1300
- `wa_the_monk_west_cracks_right_crack` The Monk - West Cracks - Right Crack — gain 6000, loss 5200
- `wa_the_temple_south_ridge` West Side — gain 8000, loss 6995
- `wa_treen_peak_scramble` Standard Scramble — gain 6100, loss 800
- `wa_tye_peak_e_route` East Slopes Scramble — gain 2400, loss 1800
- `wa_west_ridge_2` West Ridge — gain 3288, loss 213

### Approach prose mentions a descent, no measurable track
- `rainier_central_mowich_face` Central Mowich Face —  Climbers trail ascends lower Ptarmigan Ridge. At 8,300 ft, descend 1,000 ft to North Mowich Glacier. {"peakLat":46.
- `wa_around_the_cave_we_go` Around the Cave We Go — nd rockfall is a concern once it melts out. From the notch, drop about 50 feet down the gully on the north side of the
- `wa_blizzard_peak_standard` Standard Route —  the PCT north over Windy Pass, Tamarack/Foggy/Jim Pass and down to Holman Pass (~5,100 ft, mile ~13.5 from Harts Pass), then clim
- `wa_burnt_boot_peak_north_ridge` North Ridge — ds across the Middle Fork to the south, and its north ridge drops straight from the summit to the river near 3,100 ft. There is no bridge here (the next one 
- `wa_chalangin_peak_little_giant_pass_luahna_col` Little Giant Pass – Luahna Col Route — p forest and meadows to the 6,409 ft pass on Chiwawa Ridge. Descend roughly 2,200 ft into the Napeequa River Valley and foll
- `wa_chianti_spire_lichen_bouquet` Lichen Bouquet (East Face) —  Northwest Forest Pass is required on the highway shoulder. Descend a steep, faint scree path about 300 ft to Early Winters Creek, cross on logs, 
- `wa_chikamin_peak_southeast_slopes` Southeast Slopes — hikamin Pass, near an established pack camp where the trail dips to about 5,500 ft — leave the PCT and climb steep grassy/
- `wa_classic_route_3` Classic Route — rop south through sparse, open forest toward Tatoosh Creek, losing a couple hundred feet to reach it around 4,500 ft. Cross the creek (a rock-hop most of th
- `wa_corteo_peak_southwest_ridge` Southwest Ridge / Standard Route — bout 7,500 ft. Work west along the ridge to a second notch, downclimb roughly 400 ft of dirt or snow into the cirque under t
- `wa_cosho_peak_scramble` Standard Scramble —  where possible. From the pass, leave the high traverse and descend the Fisher Creek side: the trail switchbacks roughly 30 times, losing nearly 1,400 ft, into the Fisher Creek valley. Follow t
- `wa_early_morning_spire_southwest_face` Southwest Face — rnative goes by Sibley Pass and Triad Col. From Dorado Col, drop into the Marble Creek cirque over bare ice and snow to roughly 6,000 ft, contour west along a bench, then climb
- `wa_east_twin_needle_south_route` South Route — und). Parties wanting a camp nearer the Needles can instead drop about 200-250' off the ridge crest into Crescent Creek
- `wa_east_twin_needle_thread_of_ice` Thread of Ice —  Creek Basin and climb to the Ottohorn-Himmelhorn col, then descend its north side onto the Mustard Glacier; the couloir starts roughly 1,000 ft below the col and tops out at the Eye C
- `wa_eldorado_peak_eldorado_glacier_nw` Northwest Couloir / Eldorado Glacier — oss the Cascade River via the log/three-tree crossing about 90 ft downstream of the parking area, then climb t
- `wa_eldorado_peak_west_arete` West Arete — glaciers to Dorado Needle Col and make a loose fourth-class downclimb into the Marble Creek cirque, traversing to the toe of the arete near 6,000 ft. Typically a 3-day trip (approach day, 
- `wa_emerald_peak_se_ridge` Southeast Ridge — th Emerald and neighboring Cardinal/Saska. From this basin, drop 200–300 ft to skirt cliff bands, then regain a 6,9
- `wa_fish_whistle` Fish & Whistle — 720 ft, 2.7 mi, loose rock/rockfall in the narrow couloir), down to Vesper Creek and up a short rise to Vesper Lake (Lake Elan, ~4,950 ft, ~3.5 mi/~2,700 ft gain — last water), 
- `wa_free_mojo` Free Mojo — nto the basin below the west face. Free Mojo starts roughly 40 ft down and right of the large chockstone-fille
- `wa_goat_mountain_south_ridge` South Ridge / Standard Scramble — on the south or west slope. Past the false summit the ridge drops roughly 300 ft into a notch/col, then climbs the final
- `wa_goode_mountain_southwest_couloir` Southwest Couloir — fic Crest Trail southbound along Bridge Creek. This stretch loses elevation steadily — roughly 1,600 ft over about 9.5-9.6 miles — down through
- `wa_gunsight_peak_standard` Standard Route — eadows continue up steepening open slopes to Cub Pass, then drop about 700' to Cub Lake and cross the meadows beyon
- `wa_horseshoe_peak_scramble` Standard Route — ing one short 4th-class step, into a scree/talus gully that drops to a snowfield around 6,600 ft. Cross this snowfield into Horseshoe Ba
- `wa_hozomeen_mountain_northeast_buttress` Northeast Buttress (North Peak) —  you are south of the border. From camp the climb begins by dropping about 545 ft to the 5,800 ft saddle at the head of t
- `wa_ingalls_peak_north_peak_southwest_face` North Peak Southwest Face — mble to the notch between the north and south summits, then drop west about 100 feet to a friction slab, where the Southwest
- `wa_ingalls_peak_south_scramble` South Peak Scramble —  of Mount Stuart across the valley. From the pass the trail drops about a mile and several hundred feet into the basin to Lake Ingalls (~6,450 ft), the last reliable water source — carr
- `wa_jack_mountain_east_ridge` East Ridge — ly, from the Jerry Lakes camp a goat path leads to the col; lose about 800 ft into the next basin, climb the southeas
- `wa_jack_mountain_northeast_glacier` Northeast Glacier — mb to the serrated rock col east of the Southeast Ridge and drop about 250 ft on its far side onto the Northeast Glac
- `wa_jack_mountain_south_face` South Face / Southeast Ridge — ther shelf to a 6,520ft notch/pass south of the lakes, then descend about 600ft into Crater Creek Basin through mild te
- `wa_kangaroo_temple_north_face` North Face —  instead contour/traverse south along the base of the slabs descending from Wallaby Peak, losing about 20 ft below the level of the pass, to pick up
- `wa_kimtah_peak_scramble` Southwest Slopes / Gully — fall and a band of steep scree partway along that forces a ~200 ft descent to find a safe crossing point — this is
- `wa_lake_mountain_pasayten_scramble` Standard Scramble —  Woods basin, so tank up at the crossing. From Pistol Pass, descend about a mile north past Lake of the Woods to a basecamp around 6,600' — total is roughly 12 miles and 5,300' 
- `wa_le_conte_mountain_northern_aspect` Northern Aspect — raverse: ascend the Cache Glacier to Cache Col (~6,900 ft), descend to Kool-Aid Lake (~6,100 ft), cross the Red Ledge and the Middle Ca
- `wa_lizard_mountain_south_route` South Route — ier; rope up for the glacier to Cache Col (~6,900 ft), then drop to Kool-Aid Lake (~6,100 ft), the usual first camp. Beyond the lake
- `wa_mojo_rising` Mojo Rising — st face. Mojo Rising starts on an obvious bolted face about 20 ft downhill from a large chockstone-filled chim
- `wa_monument_peak_pasayten_scramble` Standard Scramble — northwest to the ~7,400-ft saddle below Lake Mountain, then descend into Lower Monument Basin (~6,100 ft); the lake-outlet creek here is your la
- `wa_mount_ann_scramble` Lake Ann Approach Scramble — m Bellingham), follow the signed Lake Ann Trail #600, which drops about 800 ft into the Swift Creek headwaters basin b
- `wa_mount_claywood_standard` Standard Route —  follow the Grand Pass Trail along open Lillian Ridge, then down into Grand Valley past Grand and Moose Lakes and up past Gladys Lake to Grand Pass (6,488 ft) at about 6 miles. Net gain to the pass
- `wa_mount_degenhardt_southwest_route` South Route — w to the roughly 6400 ft saddle near the Chopping Block and descending about 200 ft — a snow ramp rises to the same notch. 
- `wa_mount_fernow_southeast_face` Southeast Face / Leroy Basin —  than counting on a visible target. From the col, the route loses about 1,000 ft into the basin below the Gloomy Glacier
- `wa_mount_fury_east_direct_east_ridge` Direct East Ridge — andard high camp on glacially polished slabs. From Luna Col drop a few hundred feet east, then traverse right at about the 6,600 ft level across ribs, gullies and small ba
- `wa_mount_fury_east_north_buttress` North Buttress — traverse to Luna Col at about 7,100-7,200 ft. From Luna Col descend north-northwest into Luna Cirque to Luna Lake at about 4,800 ft and continue southwest to a camp on the
- `wa_mount_hardy_snow_scramble` Southeast Slope via Methow Pass — there. From Cutthroat Pass continue north on the PCT, which drops to Granite Pass (~6,300 ft) and then contours across open, sparsel
- `wa_mount_larrabee_south_ridge` South Ridge — ; an unmarked climbers' path continues west, contouring and dropping 100–200 ft into the basin below Larrabee's south f
- `wa_mount_queets_south` North Ridge — g on crumbly rock and heather; where it becomes impassable, drop a few hundred feet to traverse steep, firm scree around 5,300 ft on the east side to bypass a cliff band
- `wa_mount_spickard_silver_glacier` Silver Glacier — i (reservation required) roughly 25 miles up Ross Lake to a drop-off at the Silver Creek mouth (1,600 ft); a trail climbs the north side of Silv
- `wa_mount_terror_stoddard_buttress` Stoddard Buttress — to the 6,400 ft saddle northeast of The Chopping Block, and downclimb about 200 ft into Crescent Creek Basin to the high c
- `wa_mutchler_peak_scramble` Mutchler Peak Scramble — t) is the main route-finding crux of the approach. The path dips to a broad saddle near 4,800 ft where the boot path is easy to lose; pa
- `wa_ottohorn_southeast_route` Southeast Route — the approach and the site of a common bivy. From the notch, descend ~250 ft into 'Stump Hollow,' the gentle basin b
- `wa_primus_peak_south_ridge` South Ridge / McAllister Glacier — and then east below the south side of Austera's east ridge, descending to round the end of that ridge near 6,800 ft onto the North Klawatti Glacier, and cr
- `wa_ragged_edge` Ragged Edge — mi, loose rock/rockfall exposure in the narrow couloir) and down to Vesper Creek and Vesper Lake (Lake Elan, ~5,000 ft, ~3.5 mi/~2,700 ft gain) — the last dep
- `wa_sherpa_balanced_rock_standard` Standard Route — , loose, eroded boot path (sometimes called the 'tapeworm') losing about 1,400-1,600 ft over roughly a mile to Ingalls Creek at
- `wa_sinister_peak_southwest_route` Southwest Route — ,900') just northwest of Cub Lake (about 14 miles in), then drops to Cub Lake (5,338', another good camp with water). Most pa
- `wa_snoqualmie_mountain_standard_route` Standard Route (Southwest Slopes) — hat trail, look for an unsigned boot path/old roadbed about 50 ft downhill (south) of the Snow Lake trailhead 
- `wa_snowfield_peak_neve_glacier` Neve Glacier / Standard Route — aterfall here is a second good camp and water source), then descend about 200 ft onto the Neve Glacier and cross it - a 
- `wa_south_spur` South Spur — rossing is unsafe or impassable; the established workaround drops roughly 800 ft down to about 4,400 ft and re-climbs a 
- `wa_southwest_buttress` Southwest Buttress — a cairn at about 5,100 ft, switchback up past 6,000 ft, and drop via a short Class 3 gully into Roush Creek basin (6,100-6,400 ft, reliable water, a good lower camp/bail
- `wa_spectre_peak_south_route` South Ridge ("Spirited Away") —  miles beyond Copper Creek an easily missed side path leads down to the Chilliwack River ford (about 2,750 ft), and the Easy Ridge path climbs steepl
- `wa_spire_point_southwest_face` Southeast Face — 0' the path tops out on the forested ridge above Cub Lake — descend ~500' on steep switchbacks to the lake (good 
- `wa_star_peak_sawtooth_scramble` Standard Scramble — t stop with reliable water nearby. From the pass, the trail drops about 300 ft into the Star Lake basin (~7,180 ft) — 
- `wa_storm_king_north_face` North Face — le, make one rappel onto the glacier on the north side, and descend it through crevasses and beneath an ice cliff to the foot of the roughly 3,000 ft rock rib that leads straight to the mai
- `wa_table_mountain_standard_scramble` Table Mountain Trail (Standard) —  crux of the approach: a narrow, exposed catwalk with steep drop-offs toward the Chain Lakes basin and Swift Creek drainage 400-800 ft below. Footing here is loose rock and g
- `wa_tenpeak_mountain_north_couloir` North Couloir — er basin via the PCT and cross to the Honeycomb Glacier, or descend the Honeycomb Glacier northward from a high camp on Kololo Peaks (8,220 ft) further west along the Glacier Peak ma
- `wa_the_cave_route` The Cave Route — e June, high rockfall risk after snowmelt). From the notch, drop about 50 feet down the gully on the north side of Con
- `wa_the_needle_neve_glacier` Neve Glacier Approach / Standard — l south up the Colonial Glacier to a col at about 6,900 ft, drop about 200 ft onto the Neve Glacier icecap, and cross
- `wa_the_tooth_north_ridge` North Ridge —  Ridge starts on the north side of the peak: from the basin drop about 100 ft and traverse northwest to reach the rid
- `wa_three_fingers_r1` North Peak — t-Alb (Three Fingers) Glacier below. From the gap the route drops about 400 ft off-trail down snow/talus onto the glac
- `wa_three_fingers_r2` Middle Peak (South Face) — ) and Goat Flats (~4.5 mi) to Tin Can Gap (~6.2-7 mi), then drop ~400 ft off-trail onto the Queest-Alb Glacier a
- `wy_beyer_east_face_i` Beyer East Face I — the base of the Stettner Couloir to Teepe Col. From the col descend on rubble, trending left, for about 200 ft to a low-angle ridge, then walk up nort
- `wy_grand_teton_the_rainbow_bridge` The Rainbow Bridge — il you spot the vertical cracks that start pitch one, about 350 ft down the couloir from the Gunsight notch at 
- `wy_red_spot_alternate_start` Red Spot Alternate Start — e start is a small buttress with two parallel cracks, about 70 feet downslope to the right of the start of Red S

## Not done here (needs the owner)

1. **Fill heights on the 211 tracks that have none** (USGS 3DEP point queries, an official measurement that
   locks alone under the verification ledger). Every one then shows Loss/Regain with no other change. Prod write.
2. **A stored `approach_loss_ft` for routes without a track** (Goode's Southwest Couloir prose says "loses roughly 1,600 ft"
   along Bridge Creek). That needs a migration, and research under the 2-source rule.
3. **Time model.** planTimes still charges the walk up for gain only and the walk out for max(gain, loss). Charging
   the measured approach loss on the way up and the regain on the way out would lengthen times on the 57 routes.
   Not changed here, because that moves every timed card those routes print.
4. **Untangle `loss_ft`'s two conventions** (route list above). This is per-route research, not a bulk transform (CLAUDE.md).
