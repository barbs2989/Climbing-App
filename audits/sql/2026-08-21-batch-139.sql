-- wa_live_free_or_die (Liberty Bell, East Face): grade / rock_grade stored as
-- "5.12-" but the route's own primary sources both give 5.12+ -- Blake Herrington's
-- AAC Publications writeup (AAC is co-FA-party, published account of the 2017 FA)
-- and the Mountain Project route page both state 5.12+, mostly 5.10-5.11 face
-- climbing with "a few short bouldery bits in the 5.12 range" at the crux. No
-- source anywhere gives 5.12-. grade_num (12) is unaffected by the +/- qualifier
-- and is left as-is.
UPDATE routes
SET grade = '5.12+'
WHERE id = 'wa_live_free_or_die'
  AND grade = '5.12-';

UPDATE routes
SET rock_grade = '5.12+'
WHERE id = 'wa_live_free_or_die'
  AND rock_grade = '5.12-';

-- Everything else in this batch checked clean against authoritative sources:
-- Little Sister (Twin Sisters Range) 6,600 ft confirmed on both the North Face and
-- West Face rows (SummitPost/Wikipedia); Little Tahoma 11,138 ft confirmed on both
-- the Cowlitz/Ingraham Glaciers and East Shoulder rows, and East Shoulder's FA
-- (J.B. Flett & Henry H. Garrison, August 29, 1894, via Summerland) confirmed
-- exactly. Luahna Peak 8,445 ft confirmed (Wikipedia states "true summit is 8,445
-- feet" verbatim; listsofjohn.com's independent 8,450 ft is within normal survey
-- variance). Luna Peak (Picket Range) 8,311 ft and its FA (Bill Cox & Will F.
-- Thompson, September 1938) both confirmed exactly (Wikipedia, PeakVisor). Phantom
-- Peak / Luna Glacier route: high_point_ft 8,016 ft is consistent with the
-- "8,000+ ft" figure every source gives (no source publishes a more precise
-- number), and its FA (Fred & Helmy Beckey, 1940) is confirmed. Lizard Mountain's
-- stored 7,420 ft differs from PeakVisor's 7,408 ft (2,258 m) by only 12 ft, on a
-- single source with no second corroborating figure found -- left alone as
-- ordinary survey/LIDAR variance, not a confirmed error.
--
-- FLAGGED FOR HUMAN REVIEW, not auto-fixed (see audit log for detail):
-- wa_little_mac_spire_southwest_route -- high_point_ft (7,736 ft) disagrees with
-- both its own summit waypoint (7,680 ft, which the row's own note admits is an
-- unsurveyed approximation) and two external citations (AAC Publications'
-- "Walking the Fence" article and stephabegg.com) that both give 7,992 ft for
-- "Little Mac Spire" -- but those sources describe that figure as ALSO being East
-- McMillan Spire's elevation, raising an identity question (is "Little Mac Spire"
-- a genuinely distinct, separately-surveyed summit, or an alternate name folded
-- into East McMillan Spire?) that needs a human decision before any elevation
-- write, not a number swap.
