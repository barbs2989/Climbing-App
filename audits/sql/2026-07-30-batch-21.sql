-- WA Alpine Audit — Pass 1, Batch 21 — 2026-07-30
-- Peaks: Phantom Peak (Luna Glacier), Luna Peak (Southeast Slopes), Lundin Peak
--        (South Face Left), Magic Mountain (South Ridge/Southeast Slopes),
--        Martin Peak (West Ridge), Morning Star Peak (Marvin's Ear),
--        McMillan Spire West (Southwest Ridge, West Ridge/Southwest Approach),
--        Mix-up Peak (East Face/East Buttress), South Early Winters Spire
--        (Mojo Rising)

-- =========================================================================
-- Luna Peak — Southeast Slopes
-- =========================================================================

-- wa_luna_peak_southeast_slopes: gain_ft (6700) and loss_ft (6711) don't match
-- this row's own itinerary.days gain/loss fields, which sum to 8700 ft gain
-- and 8700 ft loss (3400+4600+700 / 700+4600+3400) -- the same
-- top-level-equals-itinerary-sum convention already verified on this batch's
-- sibling wa_luna_glacier record. dist_km (16.1) is likewise far short of the
-- round-trip distance: the itinerary's own totalNote says "roughly 48 mi
-- round trip," matching the day-by-day mileage sum and the summit waypoint's
-- one-way distMi=23 -- 48 mi round trip is ~77.2 km, not 16.1 km.
UPDATE routes SET gain_ft = 8700, loss_ft = 8700, dist_km = 77.2
WHERE id = 'wa_luna_peak_southeast_slopes';

-- =========================================================================
-- Magic Mountain — South Ridge / Southeast Slopes
-- =========================================================================

-- wa_magic_mountain_south_ridge: fa names the peak's 1938 first-ascent party
-- as "Calder Bressler, Ralph Clough, Bill Cox, Tom Myers" -- but this same
-- row's own overview field already correctly names the fourth climber "Ray
-- Clough," an internal contradiction. Multiple independent sources on the
-- 1938 Ptarmigan Traverse first-ascent party name him "Ray W. Clough" (later a
-- UC Berkeley structural engineering professor); no source corroborates
-- "Ralph." The area row's blurb carries the identical "Ralph Clough" error.
UPDATE routes SET fa = replace(fa, 'Ralph Clough', 'Ray Clough')
WHERE id = 'wa_magic_mountain_south_ridge';

UPDATE areas SET blurb = replace(blurb, 'Ralph Clough', 'Ray Clough')
WHERE id = 'wa_magic_mountain';

-- =========================================================================
-- Martin Peak — West Ridge
-- =========================================================================

-- wa_martin_peak_west_ridge: fa credits a solo first ascent, "Ida Zacher
-- Darr -- July 1936." Per alpenglow.org's Dwight Watson historical notes
-- (citing period diaries), "Everett Darr and Ida Zacker of Portland" were
-- unsuccessful on a first-ascent attempt of Bonanza Peak in summer 1936 and,
-- as a two-person party, made the first ascent of Martin Peak instead --
-- Everett Darr was omitted and the two names were run together into one.
-- Also fixing this row's own trailhead waypoint: waypoints[0] ("Railroad
-- Creek Trailhead / Holden Campground") is stored at 48.2381, -120.8662, about
-- 4 mi WNW of Holden Village's real, confirmed location (48.1993, -120.7741)
-- -- which this same row's own approach_logistics.trailheadLat/trailheadLng
-- already store correctly. Propagating the row's own correct coordinate into
-- the mismatched waypoint.
UPDATE routes
SET fa = 'Everett Darr and Ida Zacher, July 1936',
    waypoints = jsonb_set(jsonb_set(waypoints, '{0,lat}', '48.1993'), '{0,lng}', '-120.7741')
WHERE id = 'wa_martin_peak_west_ridge';

-- =========================================================================
-- McMillan Spire (West) — area row
-- =========================================================================

-- wa_mcmillan_spire_west (area): prominence_ft stored as 737, contradicting
-- this row's own blurb text, which explicitly cites "600 ft of clean
-- prominence" (attributed there to Wikipedia/USGS-derived data) -- and
-- Wikipedia independently lists McMillan Spire's prominence as 600 ft (180 m).
-- 737 appears to be a stray/unsourced figure never reconciled with the row's
-- own already-researched prominence note.
UPDATE areas SET prominence_ft = 600 WHERE id = 'wa_mcmillan_spire_west';

-- =========================================================================
-- McMillan Spire (West) — West Ridge / Southwest Approach
-- =========================================================================

-- wa_mcmillan_spire_west_west_ridge: top-level grade ("Grade III, 5.6",
-- grade_system 'yds', grade_num 6) directly contradicts this same row's own
-- alpine_grade ("II"), commitment ("II"), and rock_grade ("4th class (3rd
-- class below)") fields. Every external source checked (WTA, Mountaineers.org,
-- SummitPost, multiple CascadeClimbers/trip-report accounts) describes this
-- route as Class 2-3 scrambling with at most an occasional low-5th variation
-- near the summit -- consistent with the row's own alpine_grade/rock_grade,
-- not with a 5.6 YDS rating. Same orphaned-grade_num pattern as the
-- Dragontail Peak Northeast Face fix in an earlier batch: cleared the
-- YDS-specific fields to match the row's own already-correct class rating.
UPDATE routes
SET grade = 'Grade II, 4th class (3rd class below)',
    grade_system = 'class',
    grade_num = 4
WHERE id = 'wa_mcmillan_spire_west_west_ridge';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_luna_glacier: rock_grade carries a nonstandard "M1c" mixed-grade
--    suffix (M-grades don't normally take a letter subgrade) with no source
--    found using this notation for the route -- likely a data artifact, not
--    independently confirmed either way. Also: this route and sibling
--    wa_phantom_peak_south_route both claim the same 1940 Beckey FA; could not
--    confirm from available sources whether these are two genuinely distinct
--    lines from that era or a naming overlap.
--  - wa_lundin_peak_south_face_left (+ out-of-batch sibling
--    wa_south_face_2001_variation): Mountain Project's numeric route ID
--    (119617555) turned up for both this route's URL slug and the sibling
--    "South Face (2001 Variation)" slug -- MP route IDs don't change on a
--    rename, suggesting these may be the same physical route stored as two
--    separate DB rows with two different FA-year claims (2004 vs. 2001/2004
--    disputed). Needs a human to confirm against Mountain Project directly
--    before any merge/delete.
--  - wa_martin_peak_west_ridge: named "West Ridge" and its own overview/beta
--    describe a ridge-crest scramble, but this same row's own
--    itinerary.days[1] describes the summit day as "Southeast Slopes" via a
--    south-facing scree gully -- a route-identity conflict already flagged,
--    unresolved, in the row's own data_quality.gaps. No guidebook/primary
--    source found this pass to resolve whether these are the same line or two
--    conflated routes; needs a human with guidebook access.
--  - wa_mcmillan_spire_west (area): elevation_ft (8038) matches neither figure
--    the row's own blurb already discloses as the two competing sources
--    (Wikipedia/USGS 8,004 ft vs. listsofjohn.com 8,041 ft) -- a real,
--    already-documented source conflict on an interior, largely unsurveyed
--    peak, left for a human to standardize rather than picking a third value.
--  - wa_mcmillan_spire_west_southwest_ridge: stored as a 6-pitch, 5.8-,
--    PG13, Grade III alpine rock route, but every external source found
--    describing a "Southwest Ridge"/"Southwest Snowfinger" line on this peak
--    (trailcatjim.com, onehikeaweek.com trip reports) treats it as a steep
--    snow-climb approach variation into the same standard scramble summit, not
--    a distinct technical line. This row also lacks the data_quality/source
--    metadata present on its siblings and its gpx track is just the two
--    endpoints (trailhead + summit), suggesting thin/synthesized data rather
--    than a vetted entry. Mountain Project's own route pages 403'd this run,
--    so the specific 5.8 line could not be conclusively ruled in or out --
--    recommend a human check Mountain Project/Beckey's guide directly before
--    treating this as distinct from the West Ridge route above.
--  - wa_mojo_rising: this row's own waypoints[0].elev (5200 ft, Blue Lake
--    Trailhead) conflicts with the same row's approach_logistics.
--    trailheadDirection text (~5,400 ft), and external sources disagree too
--    (5,200 ft vs. a trail elevation range implying ~5,383-5,400 ft at the
--    trailhead); USFS's own trailhead page was unreachable this run. gain_ft/
--    loss_ft (2200/2200) look low against either trailhead figure paired with
--    the confirmed 7,807 ft summit, but resolving that depends on settling the
--    trailhead elevation first. Also: sling_rack.cams ("set 0.3-3in") disagrees
--    with the rack/gear/detailed_rack fields on the same row (all "0.2-2 in"),
--    with no source distinguishing which range is correct.
-- =========================================================================

-- Verify afterward:
SELECT id, gain_ft, loss_ft, dist_km FROM routes WHERE id = 'wa_luna_peak_southeast_slopes';

SELECT id, fa FROM routes WHERE id = 'wa_magic_mountain_south_ridge';
SELECT id, blurb FROM areas WHERE id = 'wa_magic_mountain';

SELECT id, fa, waypoints->0->'lat' AS wp0_lat, waypoints->0->'lng' AS wp0_lng
FROM routes WHERE id = 'wa_martin_peak_west_ridge';

SELECT id, prominence_ft FROM areas WHERE id = 'wa_mcmillan_spire_west';

SELECT id, grade, grade_system, grade_num FROM routes WHERE id = 'wa_mcmillan_spire_west_west_ridge';
