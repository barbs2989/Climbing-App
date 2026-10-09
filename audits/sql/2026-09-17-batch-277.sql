-- WA alpine audit batch 277 (pass 5)
-- Routes checked: wa_mount_mathias_scramble, wa_mount_maude_r1, wa_mount_maude_r2,
-- wa_mount_mystery_standard, wa_mount_olympus_blue_glacier, wa_mount_olympus_west_ridge,
-- wa_mount_persis_the_hexorcist, wa_mount_persis_west_ridge

-- Cross-route contradiction found: wa_mount_mathias_scramble, wa_mount_olympus_blue_glacier
-- and wa_mount_olympus_west_ridge all share the identical trailhead (Hoh River Trailhead,
-- 47.86028,-123.93472 in approach_logistics on all three) and all three describe the same
-- Upper Hoh Road washout/closure event in road.status -- but with THREE different date
-- ranges:
--   wa_mount_mathias_scramble:     "closed from Dec 2025 until reopening in May 2026"
--   wa_mount_olympus_blue_glacier: "shut it from December 2024 until repairs reopened it
--                                    in May 2026"
--   wa_mount_olympus_west_ridge:   "closed for months (from Dec 2024) ... restored as of
--                                    May 8, 2025"
-- Verified against multiple independent, corroborating sources (Seattle Times, KOMO News,
-- Washington State Standard, Peninsula Daily News, and Jefferson County's own MP 9.8
-- repair announcement): there was exactly ONE such closure. The Hoh River undercut the
-- roadbed near MP 9.7-9.9 after heavy December rains; Jefferson County announced the
-- closure on Dec 20, 2024; the state committed $623k in emergency funds; construction
-- began mid-April 2025; and the road reopened to all traffic on May 8, 2025 (a ribbon-
-- cutting with Gov. Ferguson on site). No source found describes a second washout or any
-- closure spanning into "May 2026" -- that figure appears to be a one-year date-arithmetic
-- slip made independently on two of the three rows (one of which also shifted the START
-- year to Dec 2025). wa_mount_olympus_west_ridge already has the correct dates (and even
-- the correct exact reopening date, May 8) and needed no change; it served as the
-- cross-check that caught the other two.
--
-- Fixed with a surgical replace() on just the wrong date fragment, rather than retyping
-- each full paragraph as a literal (both paragraphs contain a semicolon of their own —
-- "Paved to both trailheads; Upper Hoh..." — which upset check:sql's naive statement
-- splitter when embedded whole; replace() also means only the fragment that is actually
-- wrong has to be transcribed correctly). Each WHERE guard is scoped to the fragment being
-- replaced, so it is a no-op (0 rows) if the row has already changed.

UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  to_jsonb(replace(road->>'status', 'Dec 2025 until reopening in May 2026', 'Dec 2024 until reopening in May 2025'))
)
WHERE id = 'wa_mount_mathias_scramble'
  AND road->>'status' LIKE '%Dec 2025 until reopening in May 2026%';

UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  to_jsonb(replace(road->>'status', 'December 2024 until repairs reopened it in May 2026', 'December 2024 until repairs reopened it in May 2025'))
)
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND road->>'status' LIKE '%December 2024 until repairs reopened it in May 2026%';

-- No further UPDATEs this batch. All checked facts (peak elevations, coordinates, first-
-- ascent parties/dates) on all 8 routes verified clean against independent sources:
--   wa_mount_mystery_standard:      high_point_ft 7639 matches Wikipedia (7,639 ft) exactly.
--   wa_mount_persis_the_hexorcist
--   & wa_mount_persis_west_ridge:   high_point_ft 5464 and fa "1917 ... Harry B. Hinman"
--                                    both match Wikipedia exactly.
--   wa_mount_maude_r1:              fa "Fred Beckey, Don Gordon, John Rupley, Herb Staley"
--                                    matches the AAC's own 1957 first-ascent account
--                                    (Rupley, Beckey, Staley, and Gordon as author).
--   wa_mount_olympus_blue_glacier
--   & wa_mount_olympus_west_ridge:  high_point_ft 7980 and fa "Lorenz A. Nelson party
--                                    (The Mountaineers), Aug 13, 1907" both match Wikipedia
--                                    and The Mountaineer's own 1907 account exactly;
--                                    approach_logistics peakLat/peakLng (47.801305,
--                                    -123.710855) match published West Peak coordinates to
--                                    five decimal places.
--   wa_mount_mathias_scramble:      high_point_ft 7156 and approach_logistics peakLat/
--                                    peakLng (47.80522,-123.676932) both match Wikipedia
--                                    (7,156 ft; 47°48'18"N 123°40'37"W) closely.
--
-- wa_mount_persis_west_ridge and wa_mount_persis_the_hexorcist access.permit both claim a
-- Hampton Resources recreational access permit is required for FR-62 -- this is broadly
-- consistent with Hampton Lumber's own published North Cascades Recreation Program FAQ
-- (a free permit system, formerly Weyerhaeuser-run, now via myoutdooragent.com) but the
-- current fee/free status specific to this particular road could not be confirmed from a
-- single authoritative page reachable this run. Left as-is -- flagged for human
-- verification rather than guessed at, per audit rules.
--
-- wa_mount_maude_r2 (Entiat Ice Fall) carries only a 2-point gpx/waypoints array (start +
-- summit, no intermediate track) -- a data-completeness gap consistent with many
-- under-enriched routes in this catalog, not a factual error; left untouched.
