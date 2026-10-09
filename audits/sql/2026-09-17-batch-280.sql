-- WA alpine audit batch 280 (pass 5)
-- Routes checked: wa_mount_rainier_nisqually_icefall, wa_mount_rainier_ptarmigan_ridge,
-- wa_mount_rainier_sunset_ridge, wa_mount_rainier_tahoma_glacier,
-- wa_mount_rainier_willis_wall, wa_mount_redoubt_south_face,
-- wa_mount_seattle_noyes_basin, wa_mount_seattle_seattle_creek

-- Fix 1: wa_mount_rainier_tahoma_glacier -- `gain_ft` (5,007) is mathematically
-- impossible for this route: the row's own two waypoints are the Westside
-- Road/Dry Creek trailhead (2,900 ft) and Columbia Crest (14,406 ft), a net rise of
-- 11,506 ft that a stored gain figure can never be less than. The row's own
-- `itinerary` breaks the climb into three gaining days (3,300 + 3,700 + 5,000 =
-- 12,000 ft) and its own `itinerary.totalNote` states the trip as "~12,000 ft gain"
-- outright -- i.e. the correct figure is already written on this same row, just not
-- carried into the `gain_ft` column. Every sibling Rainier route audited this batch
-- (Nisqually Icefall, Ptarmigan Ridge, Sunset Ridge, Willis Wall) has `gain_ft`
-- matching its own itinerary day-sum near-exactly; Tahoma Glacier is the one outlier
-- that breaks that pattern. Corrected to match the row's own itinerary total; no
-- external figure substituted, no other field touched.
UPDATE routes
SET gain_ft = 12000
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND gain_ft = 5007;

-- Fix 2: wa_mount_rainier_willis_wall -- `descent` states the descent "using rappels
-- and downclimbing as necessary," directly contradicting this same row's own
-- `rappels` field ("0 on the descent -- the Emmons-Winthrop walk-off uses no fixed
-- rappels") and `descent_text` ("This is a walk-off/downclimb on established glacier
-- route, not a rappel descent -- no fixed rappels are used on the Emmons-Winthrop
-- line"), both of which describe the actual descent in detail (Emmons-Winthrop to
-- Camp Schurman and out to White River). The generic wording in `descent` reads as an
-- unedited boilerplate fragment that was never reconciled with the two more specific,
-- mutually-consistent fields on the same row. Corrected to match; no new information
-- introduced.
UPDATE routes
SET descent = 'There is no descent down Willis Wall itself. After summiting, descend the standard Emmons-Winthrop Glacier route to Camp Schurman and out to White River -- a walk-off/downclimb on established glacier terrain, not a rappel descent. No fixed rappels are used on this exit.'
WHERE id = 'wa_mount_rainier_willis_wall'
  AND descent = 'Descend via established descent route, using rappels and downclimbing as necessary. Multiple anchor points and protection required. Route-finding is critical in poor visibility.';

-- Fix 3: wa_mount_rainier_sunset_ridge -- `season` ("Jun-Aug") contradicts this same
-- row's own `best_season` ("May to June"), `seasonal_guidance.optimalWindow` ("May to
-- June", with July explicitly marked "risky"/"Typically out of condition"), and its
-- own `approach_variants[0].season` ("Roughly May-Jun, best frozen; typically out of
-- condition by July"). Three independently-worded fields on the row agree the window
-- is May-June and that the route falls out of condition by July as rockfall/serac
-- hazard rises with warming (consistent with `pro_tips`' "Cold, stable conditions are
-- essential to manage serac hazard" and `hazards`' rockfall/serac entries); `season`
-- and `climate.summer` ("Primary window (Jul-Aug based on the FA timing)") read as
-- unedited boilerplate that was never reconciled with the route-specific research.
-- The 1938 FA date this boilerplate reasons from carries no month in this row's own
-- `fa` field, so it supports no specific window either. Corrected `season` to match
-- the row's own majority/more-specific fields; no external figure substituted.
UPDATE routes
SET season = 'May-Jun, best when frozen -- typically out of condition by July as rockfall and serac hazard rise with warming'
WHERE id = 'wa_mount_rainier_sunset_ridge'
  AND season = 'Jun-Aug';

-- Fix 4: wa_mount_rainier_ptarmigan_ridge -- `season` and `approach` both describe the
-- shorter Mowich Lake approach as merely seasonally late ("frequently doesn't open
-- until early July", "a seasonal question rather than a fixed one... in a normal year
-- opens well after this route comes into condition"), contradicting this same row's
-- own `road.driveNote` and `approach_logistics.trailheadDirection`, which correctly
-- state that SR-165's Fairfax/Carbon River Bridge -- the only public access to Mowich
-- Lake/Carbon River -- was permanently closed by WSDOT in April 2025 with no detour
-- and no funded reopening timeline (confirmed independently via WSDOT's own April 22,
-- 2025 closure announcement). The approach is not merely late in a given year; it is
-- currently unavailable at all. Corrected `season` and `approach` to match the row's
-- own `road`/`approach_logistics` fields and the underlying fact; `approach_variants`
-- (a separate jsonb array covering the same ground in more detail) is left for a
-- follow-up pass rather than risk a malformed edit to a large nested structure in this
-- batch.
UPDATE routes
SET season = 'Often in good condition by May, but the shorter Mowich Lake approach is not available at present: SR-165''s Fairfax/Carbon River Bridge, its only public access, was permanently closed by WSDOT in April 2025 with no detour and no funded reopening timeline. Parties now use the longer White River side, which is reachable earlier in the season at the cost of a much longer approach.'
WHERE id = 'wa_mount_rainier_ptarmigan_ridge'
  AND season = 'Often in good condition by May, but the Mowich Lake road frequently doesn''t open until early July, delaying that approach option';

UPDATE routes
SET approach = 'Historically approached either from the west via Mowich Lake (shorter) or from the east via White River Campground (longer, typically requiring a car shuttle or carryover with descent via the Emmons Glacier) -- but the Mowich Lake option is not available at present: SR-165''s Fairfax/Carbon River Bridge, the only public access to that side, was permanently closed by WSDOT in April 2025 with no detour and no funded reopening timeline. The White River side, reachable earlier in the season at the cost of a much longer walk, is now the only practical approach. Check current road status before planning a trip.'
WHERE id = 'wa_mount_rainier_ptarmigan_ridge'
  AND approach = 'Historically approached either from the west via Mowich Lake (shorter) or from the east via White River Campground (longer, typically requiring a car shuttle or carryover with descent via the Emmons Glacier). Which of the two is actually available is a seasonal question rather than a fixed one: the Mowich Lake road is summer-only and in a normal year opens well after this route comes into condition, so the shorter approach and the season rarely line up. The White River side is reachable earlier, at the cost of a much longer walk. Check the road status before planning around Mowich Lake.';

-- No further UPDATEs this batch. Remaining checked facts below.

-- wa_mount_rainier_nisqually_icefall: fa ("Dee Molenaar and Bob Craig, July 15, 1948")
-- confirmed against the AAC Publications first-ascent account. gain_ft (9,000) and
-- loss_ft (9,000) both match the row's own itinerary day-sum (5,700 + 3,300 = 9,000).
-- Clean.

-- wa_mount_rainier_ptarmigan_ridge: fa ("Wolf Bauer and Jack Hossack, September 8,
-- 1935...") confirmed in general terms (year, climbers, north-side first ascent) via
-- HistoryLink.org and The Mountaineers; the specific day (Sept 8) could not be
-- independently confirmed or refuted this session. Not changed absent a
-- contradicting source. gain_ft (9,481) matches the row's own itinerary day-sum
-- (3,800 + 2,900 + 2,800 = 9,500) closely enough to be consistent.

-- wa_mount_rainier_willis_wall: fa (Charlie Bell, solo, June 1961, validity later
-- confirmed by Jim Wickwire) confirmed via multiple independent sources (Wikipedia,
-- AAC Publications, Yakima Herald interview with Wickwire). gain_ft/loss_ft (9,500/
-- 9,500) match the row's own itinerary day-sum (3,500 + 6,000 = 9,500). Clean.

-- wa_mount_redoubt_south_face: fa ("1930 -- Jimmy Cherry and Bob Ross") confirmed via
-- Wikipedia. high_point_ft (8,969) already carries a documented `corrections` note
-- from a prior research pass weighing Wikipedia/Peakbagger/PeakVisor (8,969) against
-- a 2020s LiDAR re-survey (8,958) and against Mountain Project's figure (8,603, flagged
-- there as likely erroneous); left as-is rather than re-litigated on a fourth,
-- similarly-close source (Wikipedia's current snapshot reads 8,956 ft) -- the
-- difference is within normal survey noise for this class of peak and the row already
-- documents its reasoning. access.permit fee ($10/person + $6 reservation fee)
-- confirmed current via NPS's own North Cascades backcountry permit fee page. Clean.

-- wa_mount_rainier_sunset_ridge: fa ("...Arnold Campbell and Lyman Boyer, who
-- suggested the route's name") confirmed via The Mountaineers' own 1949 annual
-- (climbing party: Lyman Boyer, Arnold Campbell, and Don Woods, 1938); the row omits
-- the third party member (Don Woods) but names no one incorrectly, so left as-is.

-- wa_mount_seattle_noyes_basin, wa_mount_seattle_seattle_creek: both are minimal,
-- sparsely-populated entries (Class 3 scramble approaches to Mount Seattle with no
-- documented ascent history) with nothing to cross-check beyond the summit waypoint
-- (47.73101, -123.57782, 6,246 ft), which matches the USGS-listed elevation for Mount
-- Seattle. No contradictions found; nothing flagged.
