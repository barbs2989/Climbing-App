-- 0133: the three WA area names carrying a doubled space.
--
-- Found by D6, the name-hygiene detector added in #820. `0119` fixed the one name in all
-- 47,566 that carried a raw HTML entity (`Exit 34: Middle Fork &amp; Taylor River`); D6 exists
-- so the next import escape is caught rather than found by accident, and on its first run it
-- turned up three more of the same family.
--
--   "Erie Mountain Drive  Areas"      15 routes   wa_erie_mountain_drive_areas
--   "Mid West -  FZ Wall, The"        12 routes   wa_mid_west_fz_wall_the
--   "Steamboat  Rock State Park"       0 routes   wa_steamboat_rock_state_park
--
-- All three are display names, rendered straight to the climber in the area browser. Nothing
-- else in the repo reads an area name, so no code depends on the doubled space.
--
-- ── IDS ARE DELIBERATELY UNTOUCHED ───────────────────────────────────────────
-- Same call as 0119 made for the `&amp;` id: `routes.area_id` is a FK to `areas.id`, so
-- renaming an id means rewriting every route that points at it, and the id is never shown to
-- a climber. The slugs here are already clean anyway (`wa_erie_mountain_drive_areas`) because
-- the slugifier collapsed the run of whitespace that the display name kept.
--
-- ── WHY NOT A BLANKET REGEX OVER THE WHOLE TABLE ─────────────────────────────
-- Three literal, id-targeted updates rather than
--   update areas set name = regexp_replace(name, '\s{2,}', ' ', 'g') where name ~ '\s{2,}';
-- because a catalog-wide predicate would silently sweep 47,590 rows including 44 other
-- states, and out-of-state work is parked. check:sql can verify a literal id exists; it
-- cannot tell you what an unbounded predicate will match. Same reasoning as the per-route
-- rappel fixes.
update areas set name = 'Erie Mountain Drive Areas'  where id = 'wa_erie_mountain_drive_areas';
update areas set name = 'Mid West - FZ Wall, The'    where id = 'wa_mid_west_fz_wall_the';
update areas set name = 'Steamboat Rock State Park'  where id = 'wa_steamboat_rock_state_park';

-- No path repair and no recount: a name is not part of the ltree path (the path is built from
-- ids) and it has no bearing on route_count. This migration cannot move a single route.

-- ── Verify afterward, as SEPARATE statements ────────────────────────────────
--   select id, name from areas
--     where id in ('wa_erie_mountain_drive_areas','wa_mid_west_fz_wall_the',
--                  'wa_steamboat_rock_state_park') order by id;
--   -- expect no doubled spaces
--
--   -- then:  npm run audit:area-parents -- --state washington
--   -- expect D6 3 -> 0. D4 stays at 1 (Last Unicorn, deliberately not collapsed) and
--   -- D5 stays at 0.
