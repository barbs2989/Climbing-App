-- WA Alpine Audit — Pass 1, Batch 17 — 2026-07-29
-- Peaks: Klawatti Peak (SW Buttress), Kangaroo Temple (Koala Krack), Kololo Peaks,
--        Kyes Peak, North Early Winters Spire (Labor Pains), Lane Peak (Zipper/Fly/
--        Lover's Lane)

-- wa_kyes_peak_glaciated_scramble / wa_kyes_peak_northeast_ridge: both of Kyes Peak's
-- in-DB routes already agree on high_point_ft=7280, matching Wikipedia and Peakbagger
-- ("Kyes Peak... 7,280+ ft (2,220+ m), NGVD 29") and this row's own overview text
-- ("Kyes Peak (7,280+ ft)..."). The area row is the outlier at elevation_ft=7282 -- a
-- small (2 ft) but confirmed offset, same systematic-offset pattern as batch 16's Inner
-- Constance fix, just in the opposite direction (area wrong, routes right).
UPDATE areas SET elevation_ft = 7280
WHERE id = 'wa_kyes_peak';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - wa_koala_krack: this row's own `corrections` field already flags that no
--    Mountain Project or SuperTopo page named "Koala Krack" could be found on Kangaroo
--    Temple. Confirmed during this pass: a real "Koala Rock" does exist on Mountain
--    Project, but it is an unrelated formation at Smith Rock, Oregon (part of "The
--    Marsupials" area there) -- not evidence this WA route is misplaced, just that the
--    name search collides with an out-of-state crag. Grade (5.4), FA (William Kamens &
--    Andrea Bedlington, July 2020), and area placement (wa_kangaroo_temple) could not be
--    independently corroborated either way -- left as-is per "don't fabricate a fix."
--  - wa_kololo_peaks_standard: gain_ft (6120) and loss_ft (7000) fail the arithmetic
--    identity gain-loss = net elevation change that holds elsewhere in the dataset (e.g.
--    this same batch's Kyes Peak route: gain 6023 - loss 707 = 5316, vs. actual net
--    5330 trailhead-to-summit). Here gain-loss = -880, but the route's own trailhead
--    waypoint (North Fork Sauk TH, 2050 ft) and high_point_ft (8240 ft) imply a net one-
--    way climb of +6190 ft. gain_ft (6120) is close to that net figure and plausible;
--    loss_ft (7000) is not -- the route's own approach/descent text describes only a
--    couple of minor basin dips, nowhere near 7000 ft of descent on the way up. No
--    on-file or external source states a specific correct loss figure, so flagging
--    rather than guessing a replacement number.
--  - wa_lane_peak_r3 (Lover's Lane): grade, grade_system, and grade_num are all null,
--    unlike its two siblings on the same face (r1 "Zipper" = wi 3, r2 "Fly" = wi 2).
--    The row's own watch_out text references "the moderate AI1 rating" as the nominal
--    grade, but that never made it into the grade fields -- and AI1 (moderate) sits
--    oddly next to the row's own overview calling this "the steepest and narrowest" of
--    the three couloirs, harder than the Zipper (wi 3). Mountain Project's "Lover's
--    Lane" page exists but its exact grade could not be retrieved this pass. Needs a
--    human with page access or a guidebook to resolve and fill in.
-- =========================================================================

-- Verify afterward:
SELECT id, elevation_ft FROM areas WHERE id = 'wa_kyes_peak';
