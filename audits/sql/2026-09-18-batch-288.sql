-- WA alpine route audit batch 288 (pass 5)
-- Generated and reviewed by the recurring audit task; see wa-alpine-audit-log.md for full notes.

-- wa_old_guard_peak_southwest_route: loss_ft (14100) does not match the sum of this
-- route's own 6-day itinerary.days[].lossFt values (300+1800+2200+1400+2500+4200=12400).
-- Corroborated externally: Downey Creek/Suiattle River Road, this route's documented exit
-- trailhead, sits at ~1,450-1,500 ft (WTA, hikeoftheweek.com). Cascade Pass TH (this row's
-- start, per its own approach text) is 3,660 ft. gain_ft(10600) - loss_ft implies an end
-- elevation of 3660-14100=-10440 ft (impossible) with the stored value, vs. 3660-12400=
-- 1,860 ft with the corrected value -- much closer to the real ~1,450-1,500 ft trailhead.
-- An independent trip-report source (stephabegg.com) states "~30 miles, 11000 ft gain/loss"
-- for this same Cascade Pass-to-Suiattle River traverse, consistent with the corrected figure.
UPDATE routes SET loss_ft = 12400
WHERE id = 'wa_old_guard_peak_southwest_route' AND loss_ft = 14100;

-- wa_old_guard_peak_southwest_route: dist_km (26.23 km = 16.3 mi) is roughly HALF this
-- route's own itinerary mile total (6.5+4.5+5.5+4.5+5+9 = 35 mi one-way; the row's own
-- itinerary.totalNote separately states "roughly 33-mile"). This is a point-to-point
-- traverse ending at a different trailhead (Suiattle River Road/Downey Creek), not an
-- out-and-back, so dist_km should hold the full one-way distance rather than half of it.
-- External sources on the Cascade Pass-to-Suiattle "Ptarmigan Traverse" independently give
-- 30-40 miles (Wenatchee Outdoors, summitpost.org, stephabegg.com), consistent with this
-- row's own 33-35 mile total and inconsistent with the stored 16.3 mi figure. Corrected to
-- this route's own itinerary-day mile sum (35 mi = 56.33 km).
UPDATE routes SET dist_km = 56.33
WHERE id = 'wa_old_guard_peak_southwest_route' AND dist_km = 26.23;

-- wa_old_guard_peak_southwest_route: outing_shape was null. This route's own itinerary day 6
-- ("Exit via Bachelor and Downey Creek ... most parties pre-arrange a car shuttle since this
-- is a different trailhead than the Cascade Pass start") and external sources (the Ptarmigan
-- Traverse is documented as a point-to-point route from Cascade Pass to the Suiattle River /
-- Downey Creek trailhead, never an out-and-back) both confirm this is a point-to-point outing.
-- Set to match, so distance/route-shape logic does not treat it as an out-and-back.
UPDATE routes SET outing_shape = 'point'
WHERE id = 'wa_old_guard_peak_southwest_route' AND outing_shape IS NULL;

-- wa_old_snowy_mountain_r1: waypoints[] contained two errors around the Trail 96/97/PCT
-- junction, contradicted by this row's OWN approach text and itinerary schedule, and by
-- external sources (Mountaineers.org: "hike the Snowgrass Flat Trail [#96] to its
-- intersection with the PCT (~7,100 ft)"; general trail-network sources describing Trail #97
-- as an alternate "Bypass Trail" connector to the PCT, not the through-route). Fixed:
-- (1) the "Trail 97 junction" waypoint's note previously instructed climbers to "stay on 97
--     ... rather than continuing on 96" -- backwards from this row's own approach/itinerary,
--     which both describe staying on Trail 96 all the way to the PCT. Corrected to describe
--     #97 as an optional alternate bypass rather than the required line.
-- (2) the "PCT junction" waypoint's elev was 6900 ft and its note credited Trail 97 with
--     reaching the PCT. This row's own approach text ("at about 4.7 miles the trail meets
--     the PCT at roughly 7,100 ft") and its own itinerary schedule ("Reach Snowgrass Flat /
--     PCT junction ... ~7,100 ft") both say ~7,100 ft via Trail 96, matching Mountaineers.org
--     and other sources. Corrected elev to 7100 and the note to credit Trail 96.
-- (3) the "Snowgrass Flats meadows" waypoint's distMi was 3, but this row's own approach text
--     places reaching the flats at "~3.9-4 miles, ~6,400 ft" (after the springs at 2.4-2.6 mi
--     and the creek ford ~0.8 mi further); corrected distMi to 3.9 to match the row's own
--     more granular mile-by-mile approach narrative. All other waypoint fields unchanged.
UPDATE routes SET waypoints = '[{"lat": 46.4644, "lng": -121.5178, "elev": 4600, "name": "Snowgrass Flats Trailhead (#96)", "note": "Trail 96 begins here on FR 2150; Northwest Forest Pass required and self-issue Goat Rocks Wilderness permit at the trailhead kiosk.", "type": "Trailhead", "distMi": 0, "directions": "The trailhead sits at the end of Forest Road 2150, at about 4,600 feet, where the Snowgrass Flat Trail (#96) begins. A Northwest Forest Pass is required, and a free self-issue Goat Rocks Wilderness permit is available at the trailhead kiosk. The access road has taken washout damage in past winters, so confirm current conditions before driving in."}, {"lat": 46.483746, "lng": -121.481789, "elev": 6400, "name": "Snowgrass Flats meadows", "note": "Trail 96 opens into heather meadows and wildflower bogs with reliable creek water; camping is prohibited within Snowgrass Flat itself per Gifford Pinchot wilderness regulations (36 CFR 261.58(e)) -- use designated sites above/below the flats instead. Trail 86 splits here and drops 0.8 mi/500 ft to Goat Lake.", "type": "Landmark", "distMi": 3.9}, {"lat": 46.489239, "lng": -121.476662, "elev": 6550, "name": "Trail 97 junction", "note": "Junction with the Bypass Trail (#97), an alternate connector that also reaches the PCT; the standard route (and this row''s own approach/itinerary) continues on Trail 96, which climbs on to meet the PCT directly.", "type": "Junction", "distMi": 4}, {"lat": 46.495711, "lng": -121.472097, "elev": 7100, "name": "PCT junction", "note": "Trail 96 (Snowgrass Flat Trail) meets the Pacific Crest Trail here at roughly 7,100 ft; turn north and climb a series of open benches with views of Mt. Adams and the Goat Rocks crest.", "type": "Junction", "distMi": 4.7}, {"lat": 46.513694, "lng": -121.462348, "elev": 7190, "name": "Old Snowy climbers''-path junction", "note": "Signed junction where an unmaintained climbers'' path leaves the PCT for Old Snowy; many parties stash trekking poles/packs here before the scramble.", "type": "Junction", "distMi": 7}, {"lat": 46.51352, "lng": -121.458623, "elev": 7550, "name": "Summit scree/talus scramble", "note": "Final ~0.5 mi/350 ft leaves the tread for loose scree and talus with a short Class 3 hand-climbing section; watch for rockfall dislodged by climbers above and lingering steep snow into early summer.", "type": "Hazard", "distMi": 7.3}, {"lat": 46.51194, "lng": -121.45389, "elev": 7880, "name": "Old Snowy Mountain", "note": "True summit (7,880+ ft); panoramic views of Mt. Adams, Mt. Rainier, Mt. St. Helens and the McCall, Conrad and Meade Glaciers, with Packwood Glacier visible just below to the northwest.", "type": "Summit", "distMi": 7.6}]'
WHERE id = 'wa_old_snowy_mountain_r1';
