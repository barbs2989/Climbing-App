-- === wa_upper_north_ridge_w_great_gendarme (Upper North Ridge w/Great Gendarme, Mount Stuart) ===

-- fa credits are swapped. Stored text reads as though Rupley & Gordon climbed the Great
-- Gendarme directly in 1956 and Wickwire & Stanley did the general upper-ridge linkup in
-- 1964. Three independent sources (a Mountain Project route-profile synthesis, an AAC
-- Publications incident report on this route, and Grokipedia's Jim Wickwire page) agree
-- on the opposite: Don Gordon and John Rupley made the first ascent of the North Ridge in
-- 1956 but bypassed/skirted the Great Gendarme rather than climbing it; Jim Wickwire and
-- Fred Stanley made the first ascent of the Great Gendarme itself (climbing it directly)
-- in 1964. The peak elevation (9,415 ft), grade (IV 5.9), and pitch count (18, within the
-- 15-17-pitch range multiple trip reports give for this abbreviated-start variant) all
-- check out and are left unchanged.
UPDATE routes
SET fa = 'North Ridge (bypassing the Great Gendarme): John Rupley & Don Gordon, 1956. First ascent of the Great Gendarme itself: James Wickwire & Fred Stanley, 1964'
WHERE id = 'wa_upper_north_ridge_w_great_gendarme';

-- === wa_west_face_2 (West Face, North Peak / Gunsight Range) ===

-- approach opens with "this area's stored coordinates place it at Washington Pass on
-- SR-20 ... likely a data/geocoding error worth flagging for correction." That claim is
-- false today: the area's current coordinates (48.3068, -120.994) sit almost exactly on
-- Gunsight Peak's real position -- Wikipedia's Gunsight Peak article gives 48.30667N,
-- 120.99389W, matching to the fourth decimal, in Chelan County near Dome Peak in the
-- Glacier Peak Wilderness, nowhere near Washington Pass (48.52, -120.66). Whatever
-- geocoding error this note once described has since been corrected elsewhere and the
-- warning was never removed, so it now tells climbers to distrust a location that is
-- actually correct. Removed the stale claim; kept the accurate Downey Creek/Ptarmigan
-- Traverse approach description that follows it. (FA/FFA credits -- Nelson & Dietrich
-- 1986 5.10 A2, Hasson & Holsten FFA 2007 -- and the route length/pitch count both check
-- out against independent sources and are left unchanged.)
UPDATE routes
SET approach = 'The Gunsight Range is a remote granite sub-range near Dome Peak in the Glacier Peak Wilderness. The genuine standard approach is from the Downey Creek Trailhead (off Suiattle River Road) via the southern end of the Ptarmigan Traverse — a rugged, largely off-trail alpine route over Itswoot Ridge/Cub Lake and Bachelor Creek involving glacier travel and significant bushwhacking. Climbers typically budget a full day (or two) of approach before reaching the base of the peak''s granite faces. This is an experienced-mountaineers-only objective, not a roadside crag.'
WHERE id = 'wa_west_face_2';
