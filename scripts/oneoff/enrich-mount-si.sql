-- Mount Si: researched full-page enrichment (wa-enrich-batch), reviewed before writing.
-- Corrections from review: source names removed from prose; summit pin on the USGS ground
-- (4,178 ft at 47.5068,-121.7391; the researched 47.5075,-121.7400 reads 4,008 ft); season kept
-- window-shaped; a dated news item and an unverifiable fitness claim dropped.
begin;
update areas set blurb = $q$Mount Si (4,167 ft) rises steeply above North Bend on the western edge of the Cascades, about 35 minutes east of Seattle, inside the state-owned Mount Si Natural Resources Conservation Area (DNR, est. 1987). The mountain is a highly metamorphosed remnant of an oceanic volcano (Jurassic-Cretaceous metagabbro), and its true summit is the Haystack, an exposed class 3 rock block above the meadow at the top of the trail. Named for homesteader Josiah "Uncle Si" Merritt, it carries 80,000-100,000 hikers a year, which makes it one of the busiest trails in Washington.$q$ where id = 'wa_mount_si';
update routes set
  overview = $q$A steep, heavily used, well-graded forest trail that gains about 3,150 ft in 4 miles from the Mount Si Road trailhead, past Snag Flats, to the rocky overlook and meadow at Haystack Basin (about 3,900 ft), just below the Haystack summit block.$q$,
  beta = $q$This is a non-technical hike. The trail climbs steadily through second-growth and old-growth forest. At about 0.7 mi the Talus Loop branches right, and it rejoins the main trail at Snag Flats. Snag Flats, at about 2 mi and 2,100 ft, is a short flat stretch with a boardwalk and an interpretive display through a stand of fire-scarred old-growth trees. From Snag Flats the trail climbs another roughly 1,800 ft to Haystack Basin at about 3,900 ft. Roughly 80% of the route is forested before it breaks out onto open talus and meadow with views of the Snoqualmie Valley, Rainier, the Olympics and Seattle. The trail ends at the basin. Going higher means the separate, exposed class 3 Haystack scramble. Climbers use this trail to train for Mount Rainier.$q$,
  approach = $q$From Seattle, take I-90 east to Exit 32 (436th Ave SE). Turn left and go north on 436th Ave SE to its end at SE North Bend Way. Turn left, and after 0.3 mi turn right onto SE Mt. Si Road. Follow it 2.4 mi to the large trailhead lot on the left. The trail starts at the lot. Keep left at the Talus Loop junction at about 0.7 mi, and continue past Snag Flats (about 2 mi) to Haystack Basin (about 4 mi).$q$,
  descent = $q$Return the way you came on the same trail.$q$,
  descent_text = $q$Go back down the main trail the way you came up. The descent is steep and unrelenting, and it is hard on the knees. Trekking poles help. In the shoulder seasons, the upper trail above Snag Flats can hold packed snow or ice when the trailhead is warm and dry. Microspikes make the descent much safer. Optionally, take the Talus Loop between Snag Flats and the lower junction, which adds about 0.3 mi.$q$,
  best_season = $q$The trail can be hiked year-round because the trailhead sits low near North Bend. May through October gives the most snow-free conditions. In winter and early spring, the upper mile can be snowy or icy even when the valley is warm, so carry traction. Weekends are crowded and the lot fills early.$q$,
  season = $q$Year-round$q$,
  aspect = $q$SW$q$,
  face = $q$South/southwest flank above North Bend$q$,
  obj_haz = $q$["ice","crowds","exposure at basin"]$q$::jsonb,
  hazards = ARRAY[$q$The upper trail and Haystack Basin can hold snow and ice when the trailhead is warm, so conditions up top are often worse than they look from the car.$q$,$q$The rocky edges at the overlook in Haystack Basin drop off steeply.$q$,$q$There are black bears in the conservation area, and DNR posts bear-awareness alerts.$q$]::text[],
  watch_out = $q$["Do not drift from the basin onto the Haystack without scrambling experience. It is a separate, exposed class 3 route where people have been injured and killed.","The trailhead lot is patrolled. Display a Discover Pass.","The area is day use only."]$q$::jsonb,
  pro_tips = $q$["Start early on weekends. The trail sees 80,000-100,000 visitors a year and the lot fills.","Use the Snag Flats interpretive boardwalk (about 2 mi) as a halfway marker.","The Talus Loop is a slightly longer alternative between the lower junction and Snag Flats."]$q$::jsonb,
  gear = $q$["Trekking poles","Microspikes (Nov-Apr)"]$q$::jsonb,
  what_to_bring = $q$["Ten Essentials","Discover Pass","Water (none reliable on the upper trail)","Layers and a rain shell","Headlamp","Microspikes in the shoulder season"]$q$::jsonb,
  turnaround = $q$Turn back if you meet ice on the upper trail and have no traction, if weather moves in, or if you cannot be back to the car by dark. The area is day use only.$q$,
  bail = $q$The only retreat is back down the same trail. Snag Flats (about 2 mi) is the obvious midway point to turn around.$q$,
  road = $q${"name":"SE Mt. Si Road","status":"Paved","seasonalGate":null,"driveNote":"Take I-90 Exit 32, then 436th Ave SE north to SE North Bend Way. Turn left, then after 0.3 mi turn right on SE Mt. Si Road and drive 2.4 mi to the lot on the left."}$q$::jsonb,
  gain_ft = 3150,
  dist_km = 6.4,
  high_point_ft = 3900,
  waypoints = $q$[{"type":"Trailhead","name":"Mount Si Trailhead","lat":47.488,"lng":-121.7231,"elev":668,"distMi":0,"note":"Large paved lot on SE Mount Si Road; a Discover Pass is required and the lot fills early on weekends.","directions":"From I-90 Exit 32, go north on 436th Ave SE to SE North Bend Way and turn left; after 0.3 mi turn right on SE Mount Si Road and drive 2.4 mi to the lot on the left."}]$q$::jsonb
where id = 'wa_mount_si_trail';
update routes set
  overview = $q$An exposed class 3 rock scramble of about 150 ft up the north side of the Haystack, the summit block that rises above Haystack Basin at the top of the Mount Si Trail and is the true summit of Mount Si.$q$,
  beta = $q$From the meadow at the top of the Mount Si Trail, a path continues northeast to a wooden bench that marks the start of the scramble. It then goes north to a rocky, northeast-facing gully with plentiful holds and generally sound rock. Many paths lead up the gully to the saddle between the main and north summits. From the saddle, turn south and make a few slabby, exposed moves to the small summit. Near the top are two class 3 sections of 20-30 ft with huge fall potential, and the face is about 150 ft of near-vertical, exposed rock. An alternative drops left from the overlook beside the Haystack, goes around it, and climbs a southwest gully to the rocky ridge between the North Peak and the Haystack.$q$,
  approach = $q$Hike the Mount Si Trail from the SE Mt. Si Road trailhead (Discover Pass) about 4 mi and about 3,150 ft past Snag Flats to Haystack Basin (about 3,900 ft). From the basin meadow, follow the path northeast to the wooden bench at the base of the scramble.$q$,
  descent = $q$Downclimb the same route (class 3), then hike out the Mount Si Trail.$q$,
  descent_text = $q$Reverse the route carefully. Downclimb the slabby, exposed moves north to the saddle between the main and north summits, then descend the northeast-facing gully facing in where it steepens. Back at the bench and basin meadow, return about 4 mi down the Mount Si Trail to the trailhead. Many accidents happen on the way down. Take your time and test holds.$q$,
  best_season = $q$Climb only on dry, snow-free rock, typically summer through early fall. Do not try the scramble in fog or rain. In spring the summit can hold snow and ice that you cannot see from a warm trailhead.$q$,
  season = $q$Jun-Oct$q$,
  aspect = $q$NE$q$,
  face = $q$North side of the summit block (NE-facing gully)$q$,
  obj_haz = $q$["exposure","fall","wet rock","ice","rockfall"]$q$::jsonb,
  hazards = ARRAY[$q$A fall from the Haystack is an uncontrolled fall. People have been seriously injured and some have died scrambling to the top.$q$,$q$The rock becomes treacherous when wet, foggy or icy.$q$,$q$Other parties in the gully can knock rocks down.$q$]::text[],
  watch_out = $q$["The final 20-30 ft class 3 sections have huge fall potential.","Do not attempt it in fog, rain or any bad weather.","Hikers without scrambling experience often get stuck on the Haystack. Downclimbing is harder than going up.","Rescues of stuck teens and fallen hikers on the Haystack are regular events."]$q$::jsonb,
  pro_tips = $q$["Start at the wooden bench northeast of the meadow and aim for the NE-facing gully, where the holds are plentiful and the rock is generally sound.","The views from the basin meadow are nearly as good as from the top. You do not have to climb the Haystack.","Wear shoes with sticky soles and keep three points of contact on the exposed slab moves.","Look at the descent before you commit."]$q$::jsonb,
  gear = $q$["Sticky-soled approach shoes or boots","Helmet (recommended)"]$q$::jsonb,
  what_to_bring = $q$["Ten Essentials","Discover Pass","Helmet","Gloves","Water","Layers and a rain shell","Headlamp"]$q$::jsonb,
  turnaround = $q$Turn around at the bench if the rock is wet, foggy or icy, or if you are not comfortable downclimbing exposed class 3. On the route, if the moves feel harder than class 3 you are off route, so back down.$q$,
  bail = $q$Downclimb to the saddle, then down the gully to the bench and Haystack Basin. Beyond that the only way out is the Mount Si Trail.$q$,
  road = $q${"name":"SE Mt. Si Road","status":"Paved","seasonalGate":null,"driveNote":"Take I-90 Exit 32, then 436th Ave SE north to SE North Bend Way. Turn left, then after 0.3 mi turn right on SE Mt. Si Road and drive 2.4 mi to the lot on the left."}$q$::jsonb,
  gain_ft = 3360,
  dist_km = 6.8,
  high_point_ft = 4167,
  pro_needs = $q$Usually done unroped as a class 3 scramble. There is no fixed protection.$q$,
  commitment = $q$I$q$,
  length_m = 46,
  pitch_detail = $q$[{"pitch":"NE gully","grade":"Class 3","lengthM":30,"notes":"From the wooden bench, follow many paths up the rocky northeast-facing gully (plentiful holds, generally sound rock) to the saddle between the main and north summits. The split of the 150 ft total between sections is approximate."},{"pitch":"Summit slabs","grade":"Class 3","lengthM":16,"notes":"From the saddle, turn south: two exposed class 3 sections of 20-30 ft with slabby moves and huge fall potential lead to the small summit."}]$q$::jsonb,
  waypoints = $q$[{"type":"Trailhead","name":"Mount Si Trailhead","lat":47.488,"lng":-121.7231,"elev":668,"distMi":0,"note":"Large paved lot on SE Mount Si Road; a Discover Pass is required and the lot fills early on weekends.","directions":"From I-90 Exit 32, go north on 436th Ave SE to SE North Bend Way and turn left; after 0.3 mi turn right on SE Mount Si Road and drive 2.4 mi to the lot on the left."},{"type":"Summit","name":"Haystack (Mount Si summit)","lat":47.5068,"lng":-121.7391,"elev":4167,"distMi":null,"note":"The small rock top of the Haystack, the true summit of Mount Si, reached by the exposed class 3 scramble from the bench above Haystack Basin."}]$q$::jsonb
where id = 'wa_mount_si_haystack_scramble';
select id, season, aspect, gain_ft, dist_km, length_m, jsonb_array_length(waypoints) wps, array_length(hazards,1) hz from routes where area_id = 'wa_mount_si' order by id;
commit;
