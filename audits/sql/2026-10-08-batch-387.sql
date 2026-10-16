-- WA alpine audit, pass 7, batch 387 (2026-10-08)
-- Routes checked: wa_bulls_tooth_south_ridge, wa_burgundy_spire_north_face,
-- wa_burnt_boot_peak_north_ridge, wa_cardinal_peak_nw_couloir_north_ridge,
-- wa_carne_mountain_trail_route, wa_cascade_peak_east_ridge,
-- wa_cascade_peak_nw_chimney

BEGIN;

-- wa_bulls_tooth (areas row): stored elevation_ft (6849) disagrees with the
-- route's OWN high_point_ft on wa_bulls_tooth_south_ridge (6840), and every
-- outside source found (Wikipedia, PeakVisor) gives 6,840 ft -- no source
-- anywhere gives 6,849. The two on-file numbers for the same summit were
-- themselves in conflict; bringing the area row in line with both the
-- route's own figure and the outside sources.
UPDATE areas
SET elevation_ft = 6840
WHERE id = 'wa_bulls_tooth'
  AND elevation_ft = 6849;

-- wa_carne_mountain_trail_route: the `approach` text's own prose states the
-- summit sits at "7,091 ft", but this route's high_point_ft (7085) and the
-- wa_carne_mountain area row's elevation_ft (7085) both already agree with
-- each other and with outside sources (WTA: 7,085 ft; Mountaineers: 7,085
-- ft; Wikipedia: 7,080 ft -- none give 7,091). The prose figure was the lone
-- outlier within this row and across all sources checked.
UPDATE routes
SET approach = replace(approach, '7,091 ft', '7,085 ft')
WHERE id = 'wa_carne_mountain_trail_route'
  AND approach LIKE '%7,091 ft%';

COMMIT;

-- Flagged for human review, not fixed this batch:
--
-- wa_burgundy_spire (areas row): stored elevation_ft (8483) does not match
-- any of the three numbers in circulation for this peak. The route's own
-- `data_quality` note (on wa_burgundy_spire_north_face) says the route's
-- high_point_ft (8400) "follows climbing literature" while "peak databases
-- (listsofjohn/peakbagger) cite 8,492 ft" -- but this websearch pass found
-- no source giving 8,492 ft at all, and the only place 8,483 ft turned up
-- was a single climber's personal route-log page (not an independent
-- survey source). So the area row's 8483, the route's own narrative claim
-- of 8492, and the route's stored high_point_ft of 8400 are three different
-- numbers, and only 8400 (matching SummitPost, Mountaineers.org, and Steph
-- Abegg's trip report) has real independent corroboration. Not fixing the
-- area row without a human confirming which figure the catalog means to
-- track (summit vs. a specific survey benchmark); flagging the data_quality
-- note's own "8,492" claim as itself unconfirmed.
--
-- wa_burgundy_spire_north_face: `fa` ("Fred Beckey party, 1953 ... a
-- subsequently discovered rock 'tunnel' at Burgundy Ledge now allows the
-- same line to be free-climbed at 5.8") -- this pass found an AAC report
-- describing a multi-day aid ascent of the north face using fixed ropes
-- (consistent with the general shape of the claim) but could not
-- independently confirm the 1953 date, the Beckey-party attribution, or the
-- "tunnel" detail from any source reached by websearch. Plausible given
-- Beckey's documented history in this same area (Boston Peak 1938,
-- Burgundy's own neighboring routes) but not confirmed either way --
-- needs a human with AAJ archive or Beckey's Cascade Alpine Guide access.
--
-- Clean (confirmed against independent sources, no fix needed):
-- wa_cascade_peak's elevation (7,428 ft, exact match to Wikipedia) and the
-- fa on wa_cascade_peak_east_ridge ("Fred Beckey, Pete Schoening, and Phil
-- Sharpe, July 23, 1950" -- exact match to Wikipedia, which gives the same
-- three names and date for the peak's first ascent); wa_burnt_boot_peak_
-- north_ridge's fa ("Don Williamson, Bill Bucher, and Tom Oas, 1971" --
-- matches PeakVisor's "Don Williamson, Tom Oas, Bill Bucher, June 1971" for
-- this specific route, as distinct from the peak's separate 1963 overall
-- FA by Weiser/Stockwell, which this route does not claim); wa_carne_
-- mountain's elevation (7085, matching WTA and Mountaineers.org) and its
-- `access`/`road` fields' claimed closures (Chiwawa River Road debris-flow
-- closure since May 20, 2026, and the Little Giant Fire closure through
-- Oct 31, 2026) -- both independently confirmed current as of this
-- audit's run date (Oct 8, 2026) via the Okanogan-Wenatchee NF/WTA alert
-- language, so this row is already accurately reflecting an active,
-- time-sensitive closure rather than needing a fix. wa_cardinal_peak's
-- elevation (8596) was checked but not flagged: sources disagree among
-- themselves (Wikipedia/PeakVisor 8,595 ft vs. SummitPost 8,590 ft), and
-- 8596 falls within that same few-foot survey-noise band, so there is no
-- single authoritative figure to correct it against.
