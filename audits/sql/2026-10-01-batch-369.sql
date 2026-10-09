-- wa_southwest_buttress: dist_km was halved again after the 2026-08-05 correction (9.7 -> 12.88
-- one-way) logged in this row's own `corrections` field. That correction derived 12.88 km
-- from the row's own approach text ("~25.75 km round trip") and itinerary day-mileage sum
-- (5.7+4+5.7=15.4 mi =~ 24.8 km) per the app's dist_km*2 display convention. The live value
-- (6.44) is exactly half of 12.88, so the earlier fix was silently reverted/halved again.
UPDATE routes SET dist_km = 12.88 WHERE id = 'wa_southwest_buttress';

-- wa_spider_mountain_north_face: access.landManager wrongly names the full route as
-- "North Cascades National Park Service Complex." Spider Mountain itself sits south of
-- Cache Col in Glacier Peak Wilderness (Okanogan-Wenatchee / Mt. Baker-Snoqualmie NF) --
-- confirmed via Wikipedia, Wikidata (Q49076359), and multiple trip reports describing Cache
-- Col as the NP/Glacier Peak Wilderness boundary. This row's own nested
-- access.overnight_permit field already states the Glacier Peak Wilderness split correctly;
-- only the top-level landManager field was wrong. The NP complex covers only the approach
-- (Cascade Pass Trailhead to Cache Col).
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"Glacier Peak Wilderness (Okanogan-Wenatchee / Mt. Baker-Snoqualmie National Forest), reached via North Cascades National Park Complex (Cascade Pass Trailhead to Cache Col)"') WHERE id = 'wa_spider_mountain_north_face';

-- wa_spider_mountain_north_ridge: same landManager error as wa_spider_mountain_north_face above.
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"Glacier Peak Wilderness (Okanogan-Wenatchee / Mt. Baker-Snoqualmie National Forest), reached via North Cascades National Park Complex (Cascade Pass Trailhead to Cache Col)"') WHERE id = 'wa_spider_mountain_north_ridge';

-- wa_spider_mountain_north_ridge: fa names "Ralph Clough" as a member of the 1938 Ptarmigan
-- Club first-ascent party. Independent, mutually consistent sources (Wikipedia's "Ptarmigan
-- Traverse" article, American Alpine Institute's program page, and a National Academies
-- "Memorial Tributes" biography of the man himself, later a noted UC Berkeley structural
-- engineer) all give the climber's name as "Ray W. Clough," not "Ralph Clough." The other
-- three names and the July 25, 1938 date are independently confirmed correct and left as-is.
UPDATE routes SET fa = 'Calder Bressler, Ray W. Clough, Bill Cox, and Tom Myers (Ptarmigan Club), July 25, 1938 (first ascent of the peak)' WHERE id = 'wa_spider_mountain_north_ridge';

-- wa_spinnaker_peak_s_route: the summit elevation is stored correctly as 5645 ft in both this
-- row's own high_point_ft and the parent area's elevation_ft (and matches SummitPost's 5,645 ft
-- at this route's own stored summit coordinates, 47.77044/-121.13302, exactly) -- but three
-- other fields on this same row still say 5654/5,654 ft: the summit waypoint's elev, the
-- itinerary's 10:30 AM schedule-step detail text, and the itinerary's day-1 objective text.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{6,elev}', '5645') WHERE id = 'wa_spinnaker_peak_s_route';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,schedule,3,detail}', '"Follow the mostly-forested ridge crest to the 5,645 ft summit."') WHERE id = 'wa_spinnaker_peak_s_route';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,objective}', '"Tag Spinnaker Peak (5,645 ft), with optional side trip to Martin Peak"') WHERE id = 'wa_spinnaker_peak_s_route';
