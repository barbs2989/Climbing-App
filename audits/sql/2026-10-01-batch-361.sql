-- WA alpine/mountaineering audit -- batch 361 (pass 6)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes (full wa_prusik_peak_* cluster, 8 routes -- 5 of which had never been
-- audited in any prior pass): wa_prusik_peak_alpine_craggers_delight,
-- wa_prusik_peak_der_sportsman, wa_prusik_peak_prayer_for_a_friend,
-- wa_prusik_peak_sail_away, wa_prusik_peak_solid_gold,
-- wa_prusik_peak_south_face_burgner_stanley, wa_prusik_peak_taylor_wood_route,
-- wa_prusik_peak_west_ridge
-- All values below were re-read from the live DB immediately before this file was written;
-- each UPDATE carries a guard on the current value so it cannot silently no-op if another
-- session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- Solid Gold (wa_prusik_peak_solid_gold)
-- -- high_point_ft (8008, Prusik's true summit) contradicts this row's own prose
-- =========================================================================
-- This row's own `beta` ("...topping out on the West Ridge rather than the true
-- summit"), `overview` ("at a stiffer grade than the popular west ridge"),
-- `descent_text` ("From the top of Solid Gold, most parties continue to easy
-- ground and locate the shared 'Solid Gold' rap anchors... down the north face")
-- and especially its own itinerary.days[1].schedule ("Top out -- Route joins the
-- West Ridge BELOW THE TRUE SUMMIT", immediately followed by "Rappel the north
-- side" with no summit step in between) all agree the climb's own top-out point
-- is below Prusik's 8,008 ft summit. Its two siblings that also don't reach the
-- true summit directly (wa_prusik_peak_alpine_craggers_delight,
-- wa_prusik_peak_prayer_for_a_friend) correctly leave high_point_ft NULL; this
-- row alone, among the partial-topout routes, wrongly carries the full-summit
-- value. No source gives the exact elevation of the West Ridge junction point,
-- so this clears the wrong value rather than inventing a replacement.
UPDATE routes SET high_point_ft = NULL
WHERE id = 'wa_prusik_peak_solid_gold'
  AND high_point_ft = 8008;

-- =========================================================================
-- Taylor-Wood Route (wa_prusik_peak_taylor_wood_route)
-- -- overview calls it a "ten-section route" but the row's own pitches=8 (confirmed
--    against Mountain Project: 8 pitches, 670 ft) and its own watch_out already
--    states "~10 hours climbing time" -- the duration, not a pitch/section count
-- =========================================================================
-- SummitPost's first-ascent account (summitpost.org/new-route-the-taylor-wood-
-- route-on-prusik-peak-wa) gives the climb as roughly 10 hours car-to-car for the
-- route itself; Mountain Project lists it as 8 pitches / 670 ft. This row's own
-- `beta` field, walked section by section, also lists exactly 8 climbing
-- sections ending at the summit. "ten-section" in the overview looks like the
-- 10-hour duration miswritten as a pitch/section count -- corrected to match the
-- row's own, externally-confirmed pitch count instead of inventing a new figure.
UPDATE routes SET overview = 'A long, 5.9+ eight-pitch route up the south face established by David Wood and Fletcher Taylor in 2023, combining crack, chimney, and short scrambling sections en route to the summit.'
WHERE id = 'wa_prusik_peak_taylor_wood_route'
  AND overview = 'A long, 5.9+ ten-section route up the south face established by David Wood and Fletcher Taylor in 2023, combining crack, chimney, and short scrambling sections en route to the summit.';

-- =========================================================================
-- Alpine Cragger's Delight, Prayer for a Friend, Sail Away, Taylor-Wood Route
-- -- top-level `permit` column is NULL on all four, while this exact peak's
--    permit rule is already stated (and presumably human-reviewed) on siblings
-- =========================================================================
-- All four of these routes sit on the same south/southwest face of Prusik Peak,
-- reached by the identical Aasgard Pass approach, as the already-audited sibling
-- routes on this peak (wa_prusik_peak_der_sportsman, _solid_gold,
-- _south_face_burgner_stanley, _west_ridge) -- confirmed by each row's own prose
-- ("20 ft left of the Stanley-Burgner route's normal start", "about 20 yards left
-- of Solid Gold", joining "Stanley-Burgner's P2", etc.) and by their shared
-- `road` field (same Icicle Road / Stuart-Colchuck trailhead). Those four
-- sibling rows all carry the same `permit` text covering both the free day-use
-- permit and the Core Enchantments overnight quota permit (May 15-Oct 31,
-- Recreation.gov lottery) that this peak's zone requires; these four rows leave
-- the column empty, even though their nested `access.permit`/`access.fees`
-- sub-fields describe only a free day-use permit with no mention of the
-- overnight option -- incomplete for routes this deep in the Enchantments,
-- where most parties on a 6-8 pitch route camp rather than day-trip it. This
-- fills the NULL top-level column with the identical, already-stated rule for
-- this same permit zone (not a new claim); the nested `access` sub-object's
-- day-use-only framing is left for a human to decide whether to also expand
-- (noted in the audit log rather than guessed at here).
UPDATE routes SET permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.'
WHERE id IN (
  'wa_prusik_peak_alpine_craggers_delight',
  'wa_prusik_peak_prayer_for_a_friend',
  'wa_prusik_peak_sail_away',
  'wa_prusik_peak_taylor_wood_route'
) AND (permit IS NULL OR permit <> 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.');

COMMIT;
