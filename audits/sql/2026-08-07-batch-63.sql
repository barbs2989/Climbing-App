-- WA alpine route audit -- batch 63 (pass 2)
-- Peaks: Mount Thomson, Pinnacle Peak (Tatoosh), Primus Peak, East Twin Needle, Eldorado Peak
-- Generated 2026-08-07. Proposed fixes only -- run npm run check:sql before applying.

-- wa_east_ridge_6 (Mount Thomson, East Ridge): gain_ft (3600) was the one-way approach gain, not the round-trip total; route's own itinerary states 4900 ft gain (matches existing loss_ft=4900).
UPDATE routes SET gain_ft = 4900 WHERE id = 'wa_east_ridge_6';

-- wa_east_ridge_6: data_quality.gaps[0] said the FA was left as 'unknown', but the fa column holds a specific, externally-corroborated attribution (Joe Hazard & B. French, 1917) -- stale gap note removed.
UPDATE routes SET data_quality = data_quality #- '{gaps,0}' WHERE id = 'wa_east_ridge_6';

-- wa_east_slope (Primus Peak, East Slope): dist_km (16.1) didn't reproduce the route's own itinerary total (~19 mi RT per WTA); 15.3 km (x2 = 19.0 mi) matches WTA and matches sibling wa_primus_peak_south_ridge's on-file dist_km, suggesting a value swap between the two Primus routes.
UPDATE routes SET dist_km = 15.3 WHERE id = 'wa_east_slope';

-- wa_eldorado_peak_northeast_face: descent field was generic boilerplate contradicting the route's own descent_text (and external sources), which is clear the descent is via the East Ridge/Inspiration Glacier, not a reversal of the face.
UPDATE routes SET descent = 'Descend via the East Ridge / Inspiration Glacier route (not the face) back to camp and the approach trail.' WHERE id = 'wa_eldorado_peak_northeast_face';

-- wa_eldorado_peak_northeast_face: dist_km (19.47) stored the full round-trip distance instead of one-way (app doubles dist_km to render round trip, per CLAUDE.md); route's own itinerary sums to ~12.1 mi RT (~9.74 km one-way), matching the convention used by both sibling routes with structured itineraries.
UPDATE routes SET dist_km = 9.74 WHERE id = 'wa_eldorado_peak_northeast_face';

-- wa_eldorado_peak_west_arete: waypoints summit elevFt (8868) contradicted the row's own corrections field, which already documents 8868 as an old USGS benchmark figure, not the true summit (8,872.9 ft per Wikipedia, matching high_point_ft and the area row).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '8872', false) WHERE id = 'wa_eldorado_peak_west_arete';

-- wa_east_twin_needle_south_route: overview still described this route as a separate 'moderate 5.7' line distinct from 'a harder East Arete (II 5.10a)' -- but the 2026-07-28 grade fix already established this row's own fa/beta describe exactly that 2003-enchainment East Arete line. Overview rewritten to match the row's own corrected grade/beta.
UPDATE routes SET overview = 'East Twin Needle (7,868 ft) is the eastern and slightly lower of the Twin Needles pinnacles in the Southern Pickets, 0.55 mi west of Mount Terror and just east of its taller sister summit, West Twin Needle (7,936 ft). Both needles were first climbed together on August 17, 1932 by William Degenhardt, James Martin, and Herb Strandberg. Composed of solid Skagit gneiss, the pair rises above Crescent Creek Basin near the Mustard Glacier and is almost always climbed as a linked outing from one camp given the shared, multi-day approach. This Southeast Ridge/East Arete line (II 5.10a) was one of three genuine first ascents made during the 2003 Complete Southern Pickets Traverse; East Twin Needle also has a separate, easier-approach 2022-established North Buttress ("Thread of Gneiss," 2,000 ft, 5.9, 9 pitches) and the short north-side Thread of Ice couloir (5.7/AI2) - be sure you''re on the intended line.' WHERE id = 'wa_east_twin_needle_south_route';

-- wa_east_twin_needle_south_route: pro_needs still said '5.7 grade' / 'modest class 4 scrambling', contradicting rock_grade=5.10a. Rewritten to match the corrected grade.
UPDATE routes SET pro_needs = 'The South Route requires solid rock climbing skills at 5.10a grade with competence in multi-pitch trad climbing on loose rock. Leaders should be experienced at route-finding on complex, tremendously exposed alpine ridgelines and comfortable with sustained 5th-class terrain on the east arete. Ability to place protection quickly and accurately in shifting rock and gneiss terrain is essential. This is an alpine expedition-style climb requiring self-rescue competence and remote wilderness mountaineering experience.' WHERE id = 'wa_east_twin_needle_south_route';

-- wa_east_twin_needle_south_route: data_quality.gaps[0] still referenced the pre-fix '(III, 5.7)' grade and the retired 'much harder East Arete' framing -- updated to reflect the 2026-07-28 correction.
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps,0}', to_jsonb('Grade corrected 2026-07-28 to Grade II, 5.10a (Southeast Ridge/East Arete) per AAC Publications'' account of the 2003 Southern Pickets enchainment, matching this row''s own fa/beta text; no separate 5.7 line confirmed on this peak beyond the 2022 North Buttress (5.9) and Thread of Ice (5.7/AI2).'::text), false) WHERE id = 'wa_east_twin_needle_south_route';

-- wa_east_twin_needle (area): prominence_ft (176) was the metric prominence (176 m) mislabeled as feet; Wikipedia gives 576 ft (176 m).
UPDATE areas SET prominence_ft = 576 WHERE id = 'wa_east_twin_needle';

-- wa_east_twin_needle (area): lat/lng (48.768,-121.288) matched a coordinate the route's own waypoints data already identified and superseded as incorrect (southeast of Mount Terror, wrong direction per Wikipedia). Updated to match the route's own corrected, sourced summit waypoint.
UPDATE areas SET lat = 48.7767, lng = -121.3115 WHERE id = 'wa_east_twin_needle';

-- wa_eldorado_peak_eldorado_glacier_nw: gain_ft (4000) contradicted the route's own itinerary days (5400+1300+0=6700) and its own totalNote ('~6,700 ft gain').
UPDATE routes SET gain_ft = 6700 WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw';

-- wa_eldorado_peak_eldorado_glacier_nw: pitches (8) contradicted the route's own overview, itinerary, and pitch_detail, all of which describe 2-3 pitches.
UPDATE routes SET pitches = 3 WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw';

-- wa_eldorado_peak_eldorado_glacier_nw: descent field claimed parties 'sometimes rappel a short gully section to speed the return', directly contradicted by this row's own descent_text, which states no rappels are needed on the descent itself.
UPDATE routes SET descent = 'Descend the East Ridge / Inspiration Glacier route back over the pass near Dorado Needle to the standard high camp; this is a walk-off with no rappels required on the descent itself (rappels reported in trip reports are on the approach into the couloir, not the summit descent).' WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw';

-- wa_eldorado_peak_eldorado_glacier_nw: rappels field named a 'Dean's Tower notch' (matching neither this row's own approach field, which consistently says 'Dean's Spire col', nor any external source) and mislabeled the approach-shortcut rappels as a descent option.
UPDATE routes SET rappels = 'No rappels needed for the standard summit descent (see descent_text). Rappels reported in trip reports are on the approach: an optional shortcut near the Eldorado-Dean''s Spire col uses a belayed downclimb (~35m) and two 30-meter rappels to reach the couloir base directly.' WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw';

-- wa_eldorado_peak_north_ridge: aspect (N) contradicted the route's own overview, beta, and watch_out text, all of which describe an E-facing climbing line with exposure dropping to the west.
UPDATE routes SET aspect = 'E' WHERE id = 'wa_eldorado_peak_north_ridge';

