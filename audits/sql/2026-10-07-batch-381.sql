-- WA alpine/mountaineering audit -- batch 381 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_arrowhead_mountain_south_route, wa_austera_peak, wa_austera_peak_southwest_ridge,
--         wa_bacon_peak_diobsud, wa_bald_eagle_peak_daniel_glacier, wa_bald_eagle_peak_south_spur,
--         wa_bald_eagle_peak_southwest_route, wa_baldy_standard
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Austera Peak (wa_austera_peak) -- waypoint mislabeled
-- =========================================================================
-- The waypoint at elev 7900 ("Junction", note "rappel ~75 ft to the Klawatti Glacier") is
-- labeled "Klawatti col" but it is actually the separate Klawatti-Austera col one ridge
-- segment further along (~0.4 mi past the true Klawatti Col at ~7,800 ft). Authoritative
-- sources (AAC Publications' route description, the Mountaineers.org Inspiration-McAllister-
-- Klawatti Ice Cap Traverse route page) consistently distinguish these as two separate named
-- features. The sibling row wa_austera_peak_southwest_ridge already names this same 7,900 ft
-- feature "Klawatti-Austera col" correctly, confirming the right name. This row's own beta
-- text already describes passing through a first col and then reaching "a break in the ridge"
-- further on, so the row knows there are two features -- the waypoints array just reused the
-- wrong name for the second one.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,name}', '"Klawatti-Austera col"')
WHERE id = 'wa_austera_peak'
  AND waypoints -> 2 ->> 'name' = 'Klawatti col'
  AND (waypoints -> 2 ->> 'elev')::int = 7900;

-- =========================================================================
-- Baldy, standard route (wa_baldy_standard) -- high_point_ft
-- =========================================================================
-- high_point_ft (6827) silently disagreed with 6808, the elevation value this row's own
-- data_quality.gaps field says it already standardized on after weighing a 6,797-6,827 ft
-- cross-source spread ("6,808 ft was used as the most consistently repeated figure"). 6,808 ft
-- is also what the parent area row (elevation_ft), the route's own "Baldy summit" waypoint, and
-- its overview/blurb text all already use -- high_point_ft was the one field left on the
-- unreconciled outlier. WebSearch corroboration (SummitPost) supports 6,808 ft as the
-- most-repeated external figure; no source found supports 6,827 ft specifically.
UPDATE routes SET high_point_ft = 6808
WHERE id = 'wa_baldy_standard'
  AND high_point_ft = 6827;

COMMIT;
