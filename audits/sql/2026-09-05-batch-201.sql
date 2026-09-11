-- WA alpine audit, pass 4, batch 201 (2026-09-05)
-- Routes covered: wa_lichtenberg_mountain_west_face_west_rib, wa_lincoln_peak_north_ridge,
-- wa_lincoln_peak_standard, wa_little_big_chief_mountain_northeast_face,
-- wa_little_mac_spire_southwest_route, wa_little_sister_north_face,
-- wa_little_sister_west_face, wa_little_tahoma_cowlitz_ingraham_glaciers

-- wa_lincoln_peak_north_ridge: high_point_ft (9101) contradicts this route's own
-- corrections field, which already notes "Wikipedia's Black Buttes article gives a
-- precise 9,085ft for Lincoln Peak" -- and contradicts this app's own areas.elevation_ft
-- (9085) for wa_lincoln_peak. Confirmed via Wikipedia ("Lincoln Peak (Washington)",
-- "Black Buttes") and AAC Publications' own FA writeup for this exact route
-- ("Lincoln Peak (9,080')"), both independently landing at ~9,080-9,085ft, not 9,101ft.
-- Fixing both the summary field and the summit waypoint's elev, which carried the same
-- stale figure.
UPDATE routes
SET high_point_ft = 9085
WHERE id = 'wa_lincoln_peak_north_ridge' AND high_point_ft = 9101;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elev}', '9085'::jsonb)
WHERE id = 'wa_lincoln_peak_north_ridge'
  AND waypoints->7->>'name' = 'Lincoln Peak summit'
  AND (waypoints->7->>'elev')::numeric = 9101;

-- wa_lincoln_peak_standard: same peak, same stale 9101ft figure in both high_point_ft
-- and its own summit waypoint (which carries both elev and elevFt).
UPDATE routes
SET high_point_ft = 9085
WHERE id = 'wa_lincoln_peak_standard' AND high_point_ft = 9101;

UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '9085'::jsonb), '{0,elevFt}', '9085'::jsonb)
WHERE id = 'wa_lincoln_peak_standard'
  AND waypoints->0->>'name' = 'Lincoln Peak summit'
  AND (waypoints->0->>'elev')::numeric = 9101
  AND (waypoints->0->>'elevFt')::numeric = 9101;

-- wa_lichtenberg_mountain_west_face_west_rib: bivy array (7 entries) was a Stevens
-- Pass/US-2 corridor zone list. Only 2 of the 7 entries are actually about Lichtenberg
-- (Lake Valhalla, Lichtenwasser Lake -- both of which this route's own approach/descent
-- text names directly). The other 5 are camps for entirely different, unrelated peaks
-- reached from different trailheads: "Smithbrook trailhead and Union Gap" (Union Peak /
-- Mount McCausland), "Skyline Lake" (Sky Mountain / Tye Peak -- confirmed via web search
-- that this trailhead is the Stevens Pass ski area lot, not Smithbrook), "The basin
-- between Tye Peak and Spinnaker Peak" (Spinnaker Peak / Martin Peak), "Trap Lake" and
-- "Surprise Lake and Glacier Lake" (Slippery Slab Tower / Thunder Mountain, reached via
-- Tunnel Creek or Surprise Creek at Scenic -- a different trailhead system entirely).
-- None of the 5 removed entries mentions Lichtenberg anywhere in their own notes.
UPDATE routes
SET bivy = '[{"elev": 4838, "name": "Lake Valhalla", "type": "camp", "notes": "The natural base for both Lichtenberg Mountain and Mount McCausland, which stand on opposite sides of the bowl the lake fills. Lichtenberg''s broad face rises straight out of the water on the south side and is the peak everyone photographs from camp; McCausland is the gentler summit to the northeast, gained by a signed spur off the Pacific Crest Trail a little under three miles from the Smithbrook trailhead and reachable from camp in about an hour. The short way in is Smithbrook Road to the trailhead, then a mile or so of switchbacks to Union Gap and a traverse south on the Pacific Crest Trail, roughly five miles each way. The long way is the Pacific Crest Trail north from the pass itself, about five and a half miles with less climbing but more distance. Thru-hiker traffic through July and August adds real pressure on a small number of sites, so arrive early or plan to camp away from the water. Season is roughly mid-July through October; snow lingers in this bowl and the trail is muddy for weeks after it goes. In winter Smithbrook Road is unplowed and the approach lengthens considerably, which is why the winter ascents of Lichtenberg come at it from the road rather than from the lake.", "water": "The lake itself, and a small inlet at the south end. Wash and rinse well back from the shore \u2014 this is a small basin carrying a lot of traffic.", "permit": "Henry M. Jackson Wilderness. A free self-issue permit is filled out at the trailhead register. A Northwest Forest Pass is required at the Smithbrook trailhead; the Pacific Crest Trail lot at Stevens Pass needs no pass but does need the self-registration. CAMPFIRES ARE PROHIBITED at the lake \u2014 carry a stove.", "capacity": "A handful of established sites scattered around the lake, mostly in the trees on the north and east shores, plus a couple of backcountry toilets. First come, first served, and genuinely full on summer weekends."}, {"elev": 4700, "name": "Lichtenwasser Lake", "type": "camp", "notes": "The direct camp for Lichtenberg Mountain, and quieter by an order of magnitude than Lake Valhalla on the other side of the peak. The fishing path leaves the first switchback on Smithbrook Road and is unsigned; it is a genuine bushwhack for the lower part, picking up a boot track around 4,400 feet on the northeast side of the lake. From the lake the scramble follows the inlet up into a steep boulder garden and gains the saddle on the southeast ridge in about half an hour, with the ridge itself giving the summit without difficulty. Reckon on seven miles and a little over two thousand feet for the round trip from the road. THIS IS A WINTER PEAK AS MUCH AS A SUMMER ONE: the boulder garden above the lake is far more pleasant under snow than bare, and the southeast ridge often melts out while the approach is still covered, but an ice axe is genuinely needed and the bowl below the ridge holds a cornice into early summer. In winter Smithbrook Road is not plowed past the highway, so parties park on US 2 at the road junction and add the road distance to the day.", "water": "The lake and its inlet stream. Treat it.", "permit": "National forest outside the wilderness boundary, so no wilderness permit. Northwest Forest Pass for parking on Smithbrook Road. Fires are legal here in most seasons but the district restricts them from midsummer, and the basin is small enough that a stove is the better answer regardless.", "capacity": "Rough informal spots for one or two tents in the trees at the outlet end. Nothing built, no toilet, and no reason to expect company."}]'::jsonb
WHERE id = 'wa_lichtenberg_mountain_west_face_west_rib'
  AND jsonb_array_length(bivy) = 7;
