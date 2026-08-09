-- 0098: repair the 12 areas whose cached route_count disagrees with the truth.
--
-- `areas.route_count` is a denormalised aggregate maintained by `routes_bump_counts`,
-- a trigger on the ROUTES table (0001). It bumps every ancestor of a route's area on
-- insert/delete/area-change — but nothing maintains it when an AREA moves, is merged,
-- or is deleted. Every such operation leaves the ancestors above it stale. 0017 and
-- 0027 repaired earlier rounds of exactly this.
--
-- Audited 2026-08-07 over the FULL tree — all 47,574 areas and 205,492 routes, with
-- subtree totals computed by one post-order walk rather than 47k subtree queries. Only
-- these 12 rows are wrong. Every one is a `region`/`state`/`country` node; no leaf crag
-- drifted, which is the signature of ancestor-bump staleness rather than bad route data.
--
--   area                        cached ->  true   delta
--   wa_liberty_bell_group            6 ->    27    -21   <- worst: shows 6 of its 27 routes
--   wa_snoqualmie_i90_region        91 ->    85     +6
--   wa_western_alpine_lakes          3 ->     8     -5
--   wa_northwest                  1135 ->  1131     +4
--   wa_centraleast                2006 ->  2009     -3
--   wa_hwy20_ncnp                  484 ->   481     +3
--   usa                         205494 -> 205492    +2
--   wa_centralwest                2102 ->  2100     +2
--   wa_sub_wapass                  151 ->   149     +2
--   washington                    8381 ->  8379     +2
--   wa_north_cascades              125 ->   126     -1
--   wa_okanogan                    550 ->   551     -1
--
-- This is user-visible: route_count is what the area browser prints next to an area
-- name, so Liberty Bell Group has been advertising 6 climbs while holding 27.
--
-- The value is RECOMPUTED by subquery rather than written as a literal, so the
-- statement cannot go stale between writing it and running it, and re-running it is
-- always safe. Scoped to these 12 ids — a blanket recount over all 47k areas would do
-- 47k subtree counts over a 205k-row table for 12 corrections.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (
  'wa_liberty_bell_group', 'wa_snoqualmie_i90_region', 'wa_western_alpine_lakes',
  'wa_northwest', 'wa_centraleast', 'wa_hwy20_ncnp', 'usa', 'wa_centralwest',
  'wa_sub_wapass', 'washington', 'wa_north_cascades', 'wa_okanogan'
);

-- Verify afterward. No ltree operators in the check: `!~` on an ltree column raised
-- 42883 while handing over 0097, and because the SQL Editor runs a pasted script in ONE
-- transaction, that error in a read-only SELECT rolled back the correct UPDATEs above
-- it. Compare against the expected column instead.
--   select id, route_count from areas where id in (
--     'wa_liberty_bell_group','wa_snoqualmie_i90_region','wa_western_alpine_lakes',
--     'wa_northwest','wa_centraleast','wa_hwy20_ncnp','usa','wa_centralwest',
--     'wa_sub_wapass','washington','wa_north_cascades','wa_okanogan') order by id;
--   -- expect: usa 205492 · washington 8379 · wa_centraleast 2009 · wa_centralwest 2100
--   --         wa_hwy20_ncnp 481 · wa_liberty_bell_group 27 · wa_north_cascades 126
--   --         wa_northwest 1131 · wa_okanogan 551 · wa_snoqualmie_i90_region 85
--   --         wa_sub_wapass 149 · wa_western_alpine_lakes 8
