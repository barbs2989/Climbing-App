-- 0096: two WA alpine data corrections — missing summit prominence, and Boston
-- Basin sitting beside the North Cascades Core group instead of inside it.
--
-- ── 1. Prominence backfill ───────────────────────────────────────────────────
-- RouteDetail's TECHNICAL STATS box renders "Prominence" only when
-- areas.prominence_ft is non-null (areas -> _dbArea -> peakMetadata.prominence,
-- see enrichRoute in ClimbMatchCore.jsx and RouteDetail.jsx:261/277/289). A null
-- silently DROPS the row rather than saying the figure is unknown, which is what
-- "some peaks don't have the prominence in the technical stats box" looks like.
--
-- Audit over every WA alpine-ish route (discipline in alpine / mountaineering /
-- scrambling / ice / mixed), 843 routes:
--     767 sit on a peak-typed area — 758 of those areas carry prominence
--       9 sit on the 6 peak areas below that carried none
--      76 sit on crag-typed spires and walls (Paisano Pinnacle, Juno Tower,
--         Chablis Spire, "South Face", "Main Peak" …). Those are sub-features of
--         a peak, not independent summits, and correctly get no peak panel at
--         all — they are NOT part of this fix.
--
-- Only three of the six have a published prominence. Values are each peak's
-- Wikipedia infobox figure, which cites Peakbagger.com in every case:
--     Mount Pilchuck    2,860 ft   (elevation there is 5,344 ft NAVD 88 vs our
--                                   stored 5,341 — a datum difference, left alone)
--     Mount Teneriffe      628 ft   (elevation 4,788 ft — matches ours exactly)
--     Raven Ridge        1,092 ft   (elevation 8,572 ft — matches ours exactly)
--
-- Mushroom Tower (8,180 ft, Kangaroo Ridge), Swiss Peak (7,988 ft, Northern
-- Pickets) and West Craggy Peak (8,366 ft, Pasayten) are LEFT NULL ON PURPOSE.
-- All three are subsidiary summits and none has a prominence figure in any
-- source checked (Wikipedia, SummitPost, PeakVisor, Peakery, WTA, Mountaineers).
-- A guessed number would render as fact in the stats box; a blank is honest.
--
-- coalesce() rather than a plain assignment so this can only ever fill a blank —
-- if a concurrent enrichment batch already wrote a value, that value wins.
update areas set prominence_ft = coalesce(prominence_ft, 2860) where id = 'wa_mount_pilchuck';
update areas set prominence_ft = coalesce(prominence_ft,  628) where id = 'wa_mount_teneriffe';
update areas set prominence_ft = coalesce(prominence_ft, 1092) where id = 'wa_raven_ridge';

-- ── 2. Boston Basin -> North Cascades Core ───────────────────────────────────
-- Boston Basin was a direct child of wa_north_cascades, a SIBLING of
-- wa_north_cascades_core. That leaves a hole in the middle of the Core group:
-- Boston Basin's seven children (Forbidden Peak, Mount Torment, Sahale Mountain,
-- Boston Peak, Sharkfin Tower, Buckner Mountain, Aiguille de l'M) sit at
-- 48.49–48.51 N, 121.00–121.08 W — geographically interleaved with peaks already
-- in the Core group: Johannesburg (across the Cascade River valley), Cascade
-- Peak, Mix-up, Magic Mountain and The Triad (the Cascade Pass ridge that Sahale
-- and Boston stand on), Eldorado, Booker and Horseshoe.
--
-- Research note: Mountain Project — the upstream shape most of this tree follows
-- — has no "North Cascades Core" area at all; it lists Boston Basin flat under
-- "N Cascades" alongside Eldorado, Mix Up, Formidable, Goode, Logan and Primus,
-- all of which WE have already grouped into wa_north_cascades_core. So the Core
-- group is our own editorial grouping, and Boston Basin was simply never moved
-- into it. Nesting it there makes the grouping internally consistent rather than
-- contradicting an upstream hierarchy.
update areas set parent_id = 'wa_north_cascades_core' where id = 'wa_boston_basin';

-- trg_areas_set_path (0001) recomputes path on `update of parent_id`, but ONLY
-- for the row being updated — it does not cascade to descendants. Re-assigning
-- each child to the same parent puts parent_id in the SET clause again, which is
-- what fires the trigger, and it re-derives each child's path from Boston
-- Basin's NEW path. Verified beforehand that none of the seven children has
-- children of its own, so one extra level is enough.
update areas set parent_id = 'wa_boston_basin' where parent_id = 'wa_boston_basin';

-- route_count is a denormalised aggregate maintained by a trigger on the ROUTES
-- table (0001) — it does NOT recompute when an AREA's parent_id changes. Same
-- fix pattern as 0017 and 0027. The move stays inside the wa_north_cascades
-- subtree, so North Cascades Core is the only node whose subtree membership
-- changed (86 -> 106); every ancestor above it already counted these 20 routes.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id = 'wa_north_cascades_core';

-- Verify afterward:
--   select id, name, prominence_ft from areas
--     where id in ('wa_mount_pilchuck','wa_mount_teneriffe','wa_raven_ridge');
--   -- expect 2860, 628, 1092
--
--   select id, parent_id, path, route_count from areas where id = 'wa_boston_basin';
--   -- expect parent_id = wa_north_cascades_core and path ...wa_north_cascades_core.wa_boston_basin
--
--   select count(*) from areas
--     where parent_id = 'wa_boston_basin'
--       and path !~ 'wa_north_cascades_core.wa_boston_basin.*';
--   -- expect 0 — every child's path cascaded
--
--   select id, route_count from areas
--     where id in ('wa_north_cascades_core','wa_north_cascades','wa_hwy20_ncnp');
--   -- expect core = 106; north_cascades and hwy20_ncnp unchanged
