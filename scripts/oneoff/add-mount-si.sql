-- Mount Si: a peak the catalog did not hold under any spelling (catalog_find_area empty, no
-- Si/Haystack area in Washington). Summit placed on the USGS 1 m ground: 4,178 ft at
-- 47.5068,-121.7391 (published 4,167 ft). Trailhead from WTA, 668 ft on the ground.
begin;

insert into areas (id, name, area_type, parent_id, lat, lng, elevation_ft, prominence_ft, coords_approx, region, blurb)
values ('wa_mount_si', 'Mount Si', 'peak', 'wa_north_bend_vicinity', 47.5068, -121.7391, 4167, 247, false, 'Alpine Lakes / I-90',
  'Mount Si (4,167 ft) is the steep peak rising straight out of North Bend, in the Mount Si Natural Resources Conservation Area just southwest of Mount Teneriffe. Its trail is one of the most-hiked in Washington: 8 miles round trip and 3,150 ft of gain to a viewpoint at the foot of the Haystack, the rock summit block, which takes an exposed Class 3 scramble.');

insert into routes (id, area_id, name, discipline, grade, grade_num, gain_ft, loss_ft, dist_km, high_point_ft, season, aspect, face, outing_shape,
  overview, beta, approach, descent, descent_text, permit, pro_needs, detailed_rack, gear, what_to_bring, hazards, watch_out, access, approach_logistics, emergency, auto_generated, classic)
values
('wa_mount_si_trail', 'wa_mount_si', 'Mount Si Trail', 'mountaineering', 'Class 1', 1, 3150, 3150, 6.44, 3900, 'Mar-Nov', 'S/SW',
  'South flank, climbed from the North Bend valley trailhead', 'outback',
  'The standard way up: a maintained trail that switchbacks steadily through forest from the trailhead on SE Mount Si Road, past Snag Flats at about 2 miles, to the open rocky viewpoint at the foot of the Haystack. The trail ends there, about 250 ft below the true summit.',
  'A non-technical but sustained hike — 3,150 ft in 4 miles with few flat stretches. The view from the top takes in the Snoqualmie Valley, Seattle and the Olympics. Going higher means the Haystack, a separate exposed Class 3 scramble.',
  'From I-90 take Exit 32 and turn left onto 436th Ave SE, follow it to SE North Bend Way and turn left. After 0.3 mile turn right onto SE Mount Si Road and continue 2.4 miles to the trailhead entrance on the left (Discover Pass required). The trail climbs through second-growth forest on steady switchbacks, passes the interpretive display at Snag Flats about 2 miles up, and continues switchbacking to the rocky viewpoint below the Haystack at about 3,900 ft.',
  'Retrace the trail to the trailhead.',
  'Descend the same trail. The upper switchbacks are rocky and the lower forest tread is rooty; both are slick when wet and icy in winter, so take care on the way down.',
  'No climbing permit; a Discover Pass is required to park on Washington State lands.',
  'None; this is a hiking trail.', 'No protection or rack is needed.',
  '["sturdy hiking boots","trekking poles","Washington Discover Pass (display in vehicle)","microspikes in winter and early spring"]'::jsonb,
  '["Ten Essentials","water — there is none reliable on the upper trail","layers for wind at the viewpoint","headlamp in case of a late finish"]'::jsonb,
  ARRAY['Snow and ice on the upper switchbacks in winter and early spring make the rocky tread treacherous without traction.'],
  '["The trailhead lot fills early on weekends; arrive early.","The rocky summit area has drop-offs; stay back from the edges, and do not mistake the Haystack for part of the trail."]'::jsonb,
  '{"fees":"Washington Discover Pass required to park at the trailhead","landManager":"Washington State Department of Natural Resources — Mount Si Natural Resources Conservation Area (day-use only)","land_manager":"Washington State Department of Natural Resources — Mount Si Natural Resources Conservation Area (day-use only)","passRequired":"Discover Pass","parking_pass":"Washington State Discover Pass required to park at the Mount Si trailhead.","permit":"No wilderness permit exists for this route. The Mount Si Natural Resources Conservation Area is Washington DNR land rather than National Forest, so there is no self-issue permit box; a Discover Pass is required to park.","rules":"Day use only — no camping anywhere in the conservation area. Dogs must be on leash. No garbage service: pack out what you pack in.","notes":"The trailhead sits low off SE Mount Si Road near North Bend and is reachable year-round; snow on the upper mountain, not the road, limits the season."}'::jsonb,
  '{"peakLat":47.5068,"peakLng":-121.7391,"trailhead":"Mount Si Trailhead","trailheadDirection":"From I-90 take Exit 32, turn left onto 436th Ave SE and follow it to SE North Bend Way; turn left, then after 0.3 mile turn right onto SE Mount Si Road and continue 2.4 miles to the trailhead entrance on the left.","trailheadLat":47.4880,"trailheadLng":-121.7231}'::jsonb,
  ((select emergency from routes where id = 'wa_mount_teneriffe_standard_route') - 'notes'),
  false, false);

insert into routes (id, area_id, name, discipline, grade, grade_num, gain_ft, loss_ft, dist_km, high_point_ft, season, aspect, face, outing_shape,
  overview, beta, approach, descent, descent_text, permit, pro_needs, detailed_rack, gear, what_to_bring, hazards, watch_out, access, approach_logistics, emergency, auto_generated, classic)
values
('wa_mount_si_haystack_scramble', 'wa_mount_si', 'Haystack Scramble', 'scrambling', 'Class 3', 3, 3400, 3400, 6.7, 4167, 'Jun-Oct', 'S/SW',
  'The Haystack, Mount Si''s rock summit block, from the end of the Mount Si Trail', 'outback',
  'The true summit of Mount Si: the Mount Si Trail to its end at the foot of the Haystack, then an exposed Class 3 scramble of roughly 200 ft up the rock summit block.',
  'Optional beyond the trail and a real step up from it: steep rock with genuine exposure, worst on the last moves to the top. Scramblers usually work around to the west side of the block, reaching a saddle between the Haystack and a minor point to its northwest on Class 2 ground before the Class 3 climbing. Dry rock only.',
  'Follow the Mount Si Trail from the trailhead on SE Mount Si Road (Exit 32 off I-90, then SE North Bend Way and SE Mount Si Road; Discover Pass required) about 4 miles and 3,150 ft to its end at the rocky viewpoint at the foot of the Haystack.',
  'Downclimb the scramble the way you came, then retrace the Mount Si Trail.',
  'Downclimbing the Haystack is harder than going up it: face in on the steep exposed moves and take the same line back to the saddle before regaining the trail-end viewpoint, then descend the Mount Si Trail.',
  'No climbing permit; a Discover Pass is required to park on Washington State lands.',
  'None carried by most parties; this is an unroped scramble, and anyone uneasy on exposed Class 3 rock should stop at the trail end.',
  'No technical rack is used.',
  '["sturdy boots with grippy soles","Washington Discover Pass (display in vehicle)","helmet"]'::jsonb,
  '["Ten Essentials","water","layers for wind on the summit","headlamp in case of a late finish"]'::jsonb,
  ARRAY['Exposed Class 3 rock with serious fall consequences, especially on the final moves to the summit.','Wet, mossy or icy rock makes the Haystack far more dangerous; leave it for dry days.','Loose rock and other parties above you on a crowded summit block.'],
  '["The scramble is optional — the trail-end viewpoint has nearly the same view.","Downclimbing is the crux for most people; make sure you can reverse every move before you make it."]'::jsonb,
  (select access from routes where id = 'wa_mount_si_trail'),
  (select approach_logistics from routes where id = 'wa_mount_si_trail'),
  ((select emergency from routes where id = 'wa_mount_teneriffe_standard_route') - 'notes'),
  false, false);

select id, name, route_count, path::text from areas where id = 'wa_mount_si';
select id, name, discipline, grade, grade_num from routes where area_id = 'wa_mount_si';
commit;
