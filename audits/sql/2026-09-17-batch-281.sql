-- WA alpine audit batch 281 (pass 5)
-- Routes checked: wa_mount_sefrit_bloody_head_couloir, wa_mount_sefrit_southeast_ridge,
-- wa_mount_sefrit_southwest_ridge, wa_mount_shuksan_fisher_chimneys,
-- wa_mount_shuksan_hanging_glacier, wa_mount_shuksan_north_face,
-- wa_mount_shuksan_northeast_ridge, wa_mount_shuksan_northwest_arete

-- Fix 1: wa_mount_shuksan_hanging_glacier -- `season` ("Jul-Aug") is contradicted by
-- six of this same row's own fields describing a spring ice line: `best_season`
-- ("May to June"), `seasonal_guidance.optimalWindow` ("May to June, as already on
-- file"), `seasonal_guidance.monthBreakdown` (rates only May "optimal" and June
-- "good" -- no July or August entries at all), `seasonal_hazards.avalanche.byMonth`
-- (covers only May and June), `climate.bySeason.spring` ("prime ice-line season") vs
-- `.summer` ("glaciers open up, more crevasse and rockfall hazard"), and
-- `itinerary.cal` ("best done early season... avoid it in warm or unstable
-- conditions"). The two `approach_variants[].season` fields that do say "Jul-Aug" are
-- answering a different, narrower question -- when the valley/trail hike-IN is
-- snow-free -- not when the glacier climbing itself is safest; both explicitly warn
-- that going in later means "the crevasses on the White Salmon are open." Independent
-- corroboration: published route notes for Shuksan's north-side glacier lines
-- generally describe the schrund/crevasses opening up and the route becoming broken
-- by mid-late season, favoring an earlier window. Corrected `season` to the row's own
-- best_season window; approach_variants left untouched since that field answers a
-- different question and is not itself wrong.
UPDATE routes
SET season = 'May-Jun'
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND season = 'Jul-Aug';

-- Fix 2: wa_mount_shuksan_north_face -- `season` ("Jun-Aug") is contradicted by this
-- same row's own `best_season` ("Mid-May through early July"),
-- `seasonal_guidance.optimalWindow` (identical to best_season), its
-- `monthBreakdown` (May "optimal", June "good", July already "risky" -- bergschrund
-- enlarging and warming-driven rockfall -- with no August entry at all), and
-- `seasonal_hazards.avalanche.byMonth` (May/June/July only, no August). The route's
-- own primary `approach_variants[0].season` reads "spring to early summer; needs snow
-- cover," which matches best_season and does not support "Jun-Aug" either. Corrected
-- `season` to the row's own best_season window.
UPDATE routes
SET season = 'May-Jul'
WHERE id = 'wa_mount_shuksan_north_face'
  AND season = 'Jun-Aug';

-- Fix 3: wa_mount_sefrit_southwest_ridge -- `gain_ft`/`loss_ft` (4,500/4,500) are
-- mathematically impossible for this route: the row's own waypoint chain climbs
-- monotonically from the Nooksack Cirque Trailhead (2,140 ft) to the summit (7,191
-- ft) with no recorded descent along the way, a net rise of 5,051 ft that a stored
-- gain figure can never be less than. The row's own `itinerary.days[0]` already states
-- the correct figures on this same row -- gainFt: 5000, lossFt: 5000 -- matching the
-- waypoint-derived minimum almost exactly, and `itinerary.totalNote` independently
-- confirms "~5,000 ft gain." Corrected the top-level gain_ft/loss_ft to match the
-- row's own itinerary; no external figure substituted, no other field touched.
UPDATE routes
SET gain_ft = 5000, loss_ft = 5000
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND gain_ft = 4500
  AND loss_ft = 4500;

-- No further UPDATEs this batch. Remaining checked facts below.

-- wa_mount_sefrit_southwest_ridge, wa_mount_sefrit_southeast_ridge: fa/overview claim
-- ("First climbed in 1930 by Jim Irving and Brick Spouse") and summit elevation
-- (7,191 ft) both confirmed via Wikipedia's Mount Sefrit article. Route-level `fa` is
-- correctly left null on both rows since neither source ties the 1930 ascent to a
-- specific one of Sefrit's several lines -- the row's own `corrections` field already
-- says so explicitly. southeast_ridge's gain_ft/loss_ft (4,500/4,500) are consistent
-- with its own itinerary text (Hannegan CG trailhead 2,950 ft to the 7,191 ft summit,
-- net rise 4,241 ft) -- no impossible-gain defect there, unlike southwest_ridge above.

-- wa_mount_sefrit_bloody_head_couloir: sparse entry (no grade/fa/gain_ft/season) with
-- nothing invented to fill the gaps -- appropriately left blank rather than guessed.
-- No contradictions found.

-- wa_mount_shuksan_fisher_chimneys: fa list left appropriately hedged ("year not
-- confirmed by available sources") -- could not be independently confirmed or
-- refuted this session. gain_ft (5,100) and loss_ft (4,700) both match the row's own
-- itinerary day-sum exactly (800+2,500+1,800=5,100 gain; 300+0+4,400=4,700 loss), and
-- itinerary.totalNote's "~5,100 ft of gain" agrees. access.group_limit (12) confirmed
-- against NPS's own published North Cascades National Park cross-country zone group
-- size limit for the Mount Shuksan zone. Clean.

-- wa_mount_shuksan_hanging_glacier: fa ("Unrecorded party, 1939 -- this glacier lay
-- along the first technical ascent of Mount Shuksan") independently corroborated --
-- the Hanging Glacier route is documented elsewhere as the line used on Shuksan's
-- 1939 first technical ascent (distinct from Asahel Curtis's 1906 first ascent of the
-- mountain overall via the Sulphide Glacier side), with the specific climbers'
-- identities likewise not confirmed by available sources. Not changed.

-- wa_mount_shuksan_northeast_ridge, wa_mount_shuksan_northwest_arete: both sparse,
-- honestly-hedged entries ("seldom-done variation," "little-traveled") with no fa
-- claimed and no gain_ft/loss_ft contradiction against their waypoints.
-- northwest_arete's beta claim ("Northwest Arayete, 5.9, established 2007 by Darin
-- Berdinka and Matt Alford") confirmed via American Alpine Institute's contemporary
-- blog post and Alpinist's 2007 newswire -- matches on climbers, year, grade, and
-- description. Clean.
