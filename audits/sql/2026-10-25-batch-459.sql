-- WA alpine/mountaineering audit -- batch 459 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_the_chopping_block_south_route, wa_the_devils_club,
--         wa_the_fin_northeast_face, wa_the_hitchhiker, wa_the_horn_scramble,
--         wa_the_incisor_scramble, wa_the_monk_le_gibet, wa_the_monk_odine
--
-- All current values below were re-read from the live DB via the read-only anon key
-- immediately before this file was written; each UPDATE carries a guard on that current
-- value so it cannot silently no-op or clobber an unrelated edit.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

BEGIN;

-- =========================================================================
-- The Horn -- areas.wa_the_horn (hierarchy placement, not a routes fix)
-- =========================================================================
-- wa_the_horn.parent_id is 'wa_north_central_olympics', but The Horn sits on
-- Sawtooth Ridge in the Mount Skokomish Wilderness, in the SOUTHERN Olympics --
-- not the north-central cluster. Three independent checks agree:
--   (1) Coordinates: The Horn (47.558215, -123.321115) sits 0.15 km from its
--       own sibling route's peak The Fin (47.559455, -123.320255, correctly
--       filed under wa_southern_olympics) and 0.8 km from Mount Cruiser
--       (47.564407, -123.315692, also wa_southern_olympics). The nearest
--       member of wa_north_central_olympics (Mount Steel, 47.639705) is
--       ~9 km north -- The Horn is nowhere near that cluster.
--   (2) External source: Wikipedia confirms Sawtooth Ridge (between Mt.
--       Lincoln and Mt. Cruiser) lies in the Mount Skokomish Wilderness, "in
--       the southeast corner of Olympic National Forest ... southern
--       Olympics, not north-central."
--   (3) This row's own `overview` field already says so: "The Horn is a
--       rugged basalt pinnacle on Sawtooth Ridge ... on the crest between
--       Mount Cruiser and Mount Lincoln ... shares its approach (Staircase,
--       Flapjack Lakes, Gladys Divide) with Mount Cruiser and The Fin" --
--       both of which are correctly filed under wa_southern_olympics. The
--       route text was already correct; only the area row's parent_id was
--       wrong.
UPDATE areas
SET parent_id = 'wa_southern_olympics'
WHERE id = 'wa_the_horn' AND parent_id = 'wa_north_central_olympics';

COMMIT;

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - wa_the_monk_le_gibet / wa_the_monk_odine: both share high_point_ft =
--    8606, an exact match for the PARENT peak's (Cathedral Peak) own
--    elevation_ft -- but The Monk is consistently described (Mountain
--    Project, Mountaineers.org) as a smaller, separate subsidiary tower on
--    Cathedral's south face, not the summit of Cathedral Peak itself. No
--    source found gives The Monk's own summit height, so there is nothing
--    to substitute -- flagged as a suspicious shared-with-parent figure
--    rather than guessed at.
-- =========================================================================

-- Verify afterward:
select id, parent_id from areas where id = 'wa_the_horn';
