-- Batch 128 (pass 3): Forbidden Peak (North Ridge, Northeast Face, Northwest Face, West
-- Ridge), Fortress Mountain (East Ridge, Northeast Face, Southwest Face), Fortune Peak
-- (East Slope, Standard Route). See audits/wa-alpine-audit-log.md for the full writeup.

-- wa_fortune_peak_east_slope: top-level `permit` column is NULL, so RouteDetail's PERMIT
-- box (which reads route.permits directly with no fallback, RouteDetail.jsx ~L1872) never
-- renders anything on this route -- even though the row's own access.permit sub-field
-- already correctly documents the requirement (USFS Esmeralda Trailhead page: free
-- self-issue Alpine Lakes Wilderness permit required at the trailhead, plus a separate
-- day-use fee/NW Forest Pass). Copying that already-verified value into the column the
-- screen actually reads.
UPDATE routes
SET permit = 'Free self-issue Alpine Lakes Wilderness day-use permit at the trailhead'
WHERE id = 'wa_fortune_peak_east_slope' AND permit IS NULL;

-- wa_fortune_peak_standard_route: identical gap, same trailhead, same fix.
UPDATE routes
SET permit = 'Free self-issue Alpine Lakes Wilderness day-use permit at the trailhead'
WHERE id = 'wa_fortune_peak_standard_route' AND permit IS NULL;
