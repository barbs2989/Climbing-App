-- Colfax Peak: Cosley-Houston Couloir length_m was copy/paste-duplicated from the
-- Polish Route's value (305m/1000ft). AAJ describes this route as "ca. 700 ft," the
-- route's own pitch_detail array sums to 200m (~656ft), and a trip report independently
-- states "600 feet" -- all cluster around 213m, not 305m.
UPDATE routes SET length_m = 213 WHERE id = 'wa_colfax_peak_cosley_houston';

-- Cutthroat Peak: area elevation_ft drifted back to the stale 8,065 ft figure after a
-- prior audit pass already corrected all of the peak's routes to 8,066 ft (Wikipedia and
-- Peakbagger both agree on 8,066 ft).
UPDATE areas SET elevation_ft = 8066 WHERE id = 'wa_cutthroat_peak';

-- Cutthroat Peak: the same stale 8,065 ft figure is duplicated in the area's free-text
-- blurb.
UPDATE areas SET blurb = replace(blurb, '8,065 ft', '8,066 ft') WHERE id = 'wa_cutthroat_peak' AND blurb LIKE '%8,065 ft%';

-- Cutthroat Peak: wa_north_ridge_3 (North Ridge) is the one route on this peak still
-- carrying the stale 8,065 ft summit figure -- its 7 sibling routes on the same peak
-- already read 8,066 ft.
UPDATE routes SET high_point_ft = 8066 WHERE id = 'wa_north_ridge_3';

-- Crater Mountain Standard Route: the top-level permit field wrongly framed the whole
-- route under NPS / North Cascades NP complex permit rules. The same row's own
-- access.permit and emergency.notes fields, and USFS's own Jackita Ridge Trail #738
-- page, agree this route sits in the Pasayten Wilderness (Okanogan-Wenatchee National
-- Forest) and needs only a free self-issue wilderness permit at the trailhead.
UPDATE routes SET permit = 'Free self-issue wilderness permit required at the trailhead to enter the Pasayten Wilderness (Okanogan-Wenatchee National Forest, Methow Valley Ranger District). The standard out-and-back route stays entirely on National Forest land. A separate paid NPS backcountry permit is only required if a party extends into the adjoining North Cascades National Park Complex (e.g., via the Devils Dome loop).' WHERE id = 'wa_crater_mountain_standard_route';

-- Corteo Peak: prominence off by 1 ft vs Wikipedia/Peakbagger (652 ft, not 651 ft).
UPDATE areas SET prominence_ft = 652 WHERE id = 'wa_corteo_peak';

-- Corteo Peak Southwest Ridge: an out-and-back route to the same trailhead (own
-- waypoints: 4,855 ft trailhead to 8,107 ft summit, net ~3,252 ft matching the stored
-- gain_ft), but loss_ft was null.
UPDATE routes SET loss_ft = 3245 WHERE id = 'wa_corteo_peak_southwest_ridge';
