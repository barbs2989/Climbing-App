-- WA alpine audit batch 275 (pass 5)
-- Routes checked: wa_mount_formidable_south_face, wa_mount_fury_east_mongo_ridge,
-- wa_mount_fury_east_southeast_glaciers, wa_mount_fury_west_west_ridge,
-- wa_mount_goode_northeast_buttress, wa_mount_hardy_snow_scramble,
-- wa_mount_hinman_hinman_glacier, wa_mount_howard_south_slope

-- wa_mount_fury_east_mongo_ridge: fa field hedges "(month uncertain: July or August)"
-- for Wayne Wallace's solo first ascent of Mongo Ridge (Mount Fury West Peak's
-- southwest buttress). That hedge is false and contradicts three OTHER fields on this
-- same row (overview, beta, best_season), which all already state a specific August
-- 2006 date. Verified externally via WebSearch this session: multiple independent
-- sources converge on August 24-28, 2006, including Wallace's own first-ascent report
-- published in the American Alpine Club's American Alpine Journal ("he headed out at
-- 4 a.m., August 24, 2006") and a Cascadeclimbers.com trip-report thread whose own
-- title carries the date "8/28/2006" (matching this row's beta field's note that the
-- climb ran Aug 24-27 with Wallace "exiting/reporting on the 28th"). No source found
-- suggests July was ever a candidate month. Corrected to match the row's own
-- already-accurate beta/overview/best_season fields and drop the false hedge.
UPDATE routes SET fa = 'Wayne Wallace, solo — August 24-28, 2006, a four-day solo ascent departing the Ross Dam Trailhead area August 24, per his own American Alpine Journal first-ascent report'
WHERE id = 'wa_mount_fury_east_mongo_ridge'
  AND fa = 'Wayne Wallace, solo — 2006 (month uncertain: July or August)';

-- wa_mount_fury_east_southeast_glaciers: loss_ft=13000 against gain_ft=6200 for a
-- standard out-and-back route (ascend the Southeast Glacier to East Fury's summit,
-- descend the same way back to the same trailhead -- confirmed by this row's own
-- waypoints, "descent" field ("Reverse the southeast glacier route"), and
-- descent_text, none of which describe a traverse or different exit). An out-and-back
-- route's cumulative gain and loss must be close to equal; this row's own itinerary
-- field sums to ~6,900 ft of gain and ~7,200 ft of loss across its 4 days (2700+2700
-- +1500+0 gain; 0+300+1500+5400 loss), consistent with gain_ft=6200 and wildly
-- inconsistent with loss_ft=13000. The likely source of the error: descent_text
-- quotes a published trip report describing "the full round trip (camp to camp to
-- trailhead) as a 4-day, ~42-mile, ~13,000 ft trip" -- that ~13,000 ft is plainly the
-- TOTAL cumulative vertical for the whole round trip (gain+loss combined, i.e.
-- roughly 6,500 up and 6,500 down), not the loss figure alone. Corrected loss_ft to
-- match this row's own gain_ft, since nothing on file gives a more precise
-- independent split and every other cross-check (itinerary days, waypoint
-- elevations) puts the true one-way gain/loss in the 6,200-7,200 ft range, not 13,000.
UPDATE routes SET loss_ft = 6200
WHERE id = 'wa_mount_fury_east_southeast_glaciers' AND gain_ft = 6200 AND loss_ft = 13000;

-- No further UPDATEs this batch. Two additional issues found and left for human
-- review rather than a targeted UPDATE -- see wa-alpine-audit-log.md for the full
-- write-up of both:
--   wa_mount_fury_east_mongo_ridge: route id contains "fury_east" but area_id,
--     high_point_ft, and every content field (overview/beta/waypoints) unambiguously
--     place this route on Mount Fury's WEST peak. Likely a legacy id-naming artifact
--     rather than a wrong area_id (the actual foreign-key relationship is correct);
--     renaming a route's primary key is outside this audit's scope and risks breaking
--     references elsewhere (contributions, bookmarks), so this is flagged rather than
--     fixed.
--   wa_mount_fury_west_west_ridge: this single route record merges at least two, and
--     likely three, genuinely different and non-interchangeable approaches to Mount
--     Fury's West Peak -- the real 1958 first-ascent route via Hannegan Pass/Whatcom
--     Pass/Perfect Pass/Challenger Glacier (described in pitch_detail, and matching
--     the externally-verified 1958 FA party/approach), a modern "standard route via
--     East Fury's connecting ridge" approached from Access Creek/Luna Col (described
--     in overview/beta/approach/descent/waypoints/gpx/itinerary/approach_logistics),
--     and a third northwest-glacier-and-ledges variant (approach_variants,
--     climbing_route). Same class of defect as the already-flagged
--     wa_mount_fairchild_standard (pass 4, batch 209): needs an editorial call on
--     which approach this record should describe, or a split into separate route
--     records, not a targeted UPDATE.
