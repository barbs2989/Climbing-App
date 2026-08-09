-- 0106: three Washington Pass formation groups were hollow shells sitting BESIDE the
-- peaks they name.
--
-- APPLIED 2026-08-09, and verified against the live DB rather than on the SQL Editor's
-- word: Liberty Bell Group 27 -> 50 with all six children on correct ltree paths, Kangaroo
-- Ridge 0 -> 13, Silver Star and Wine spires 10 -> 25, the duplicate stub gone,
-- wa_sub_wapass unchanged at 149, and `check:counts` clean across all 47,572 areas.
--
-- NUMBERED 0104 WHEN IT WAS PASTED, renamed to 0106 afterwards. `main` moved underneath
-- this branch: 0103_profile_discoverable was itself renumbered to 0104 to settle an
-- earlier collision, and 0105 is claimed by an open branch. The file name is
-- documentation and the applied state does not depend on it, which is exactly what
-- README-numbering.md says to do. `ls supabase/migrations/` in a worktree cut days ago
-- reports a stale answer -- fetch first, and check every ref, not just the working tree.
--
-- Reported as "South Early Winter Spire and North Early Winter Spire aren't in the
-- Liberty Bell Group". They are not, and the same defect is on both of its neighbours.
--
-- ── THE SHAPE ────────────────────────────────────────────────────────────────
-- Every WA area sorted by latitude at Washington Pass shows it in one read. The Liberty
-- Bell Group is one ridge of five towers running north to south over ~350 m:
--
--     Liberty Bell Mountain      48.51543 -120.65837   IN the group
--     Concord Tower              48.51450 -120.65827   IN the group
--     Lexington Tower            48.51425 -120.65747   *** SIBLING ***
--     (group row)                48.51365 -120.65653
--     North Early Winters Spire  48.51293 -120.65547   *** SIBLING ***
--     Minuteman Spire            48.51229 -120.65397   IN the group
--     South Early Winters Spire  48.51228 -120.65539   *** SIBLING ***
--
-- Lexington Tower sits BETWEEN two towers that are already inside, 100 m from the group's
-- own centre. The three strays carry 23 routes between them -- Liberty Crack's tower, the
-- Direct East Buttress, the South Arete -- so the group advertised 27 routes against a
-- true 50, and the three best-known lines at Washington Pass rendered outside the
-- formation every guidebook files them under.
--
-- ── THE MECHANISM ────────────────────────────────────────────────────────────
-- Two loads that were never joined. An OpenBeta-derived crag tree supplied the GROUPING
-- rows (Liberty Bell Group, Kangaroo Ridge, Silver Star and Wine spires) plus hollow
-- `crag` stubs for a few formations; a separate alpine peak list attached every real
-- summit FLAT to Washington Pass. Nothing ever matched the two, so each group kept its
-- stubs and none of its peaks. The fingerprint is a 0-route stub sitting metres from a
-- populated peak of the same name -- see the delete at the bottom, 8 m apart.
--
-- The same shape is live in the Picket Range (Northern Pickets rc=0 holding two stubs
-- while twelve Southern Picket summits sit outside it). That is NOT fixed here: which
-- summits fall in which sub-range is an editorial call, and this file only contains
-- moves where the group's own name settles the question. Reported separately.
--
-- ── WHY EACH MOVE IS SAFE ────────────────────────────────────────────────────
-- All 13 moved rows are childless leaves that hold routes, and all three destination
-- groups hold ZERO direct routes -- so trg_areas_leaf_xor (0001) passes, and because no
-- mover has children there is no ltree cascade to chase (contrast 0097, where Boston
-- Basin's seven children each needed a no-op re-assign to re-derive their paths).
--
-- Every move stays INSIDE wa_sub_wapass, so only the three group rows change their
-- subtree membership; Washington Pass and every ancestor above already counted these
-- routes and are deliberately left alone.

-- ── 1. Liberty Bell Group ────────────────────────────────────────────────────
-- The five towers of the group, north to south: Liberty Bell, Concord, Lexington, North
-- Early Winters Spire, South Early Winters Spire. Two were already in. Minuteman Spire
-- stays -- Minuteman Buttress is on Liberty Bell's east side, correctly filed already.
update areas set parent_id = 'wa_liberty_bell_group'
 where id in ('wa_lexington_tower','wa_north_early_winters_spire','wa_south_early_winters_spire');

-- ── 2. Kangaroo Ridge ────────────────────────────────────────────────────────
-- The group row had route_count = 0 and held only two empty stubs (Melted Tower, The
-- Temple -- both real Kangaroo Ridge formations we simply hold no routes for, so both
-- are KEPT). All five populated formations on the ridge crest sat outside it, strung
-- along -120.61 from 48.502 to 48.520.
--
-- Mushroom Tower is included on our own prior research, not on proximity alone: 0097's
-- prominence audit already records it as "Mushroom Tower (8,180 ft, Kangaroo Ridge)".
update areas set parent_id = 'wa_kangaroo_ridge'
 where id in ('wa_big_kangaroo','wa_kangaroo_temple','wa_mushroom_tower',
              'wa_half_moon','wa_wallaby_peak');

-- ── 3. Silver Star and Wine spires ───────────────────────────────────────────
-- The starkest of the three: the group contained NEITHER Silver Star NOR three of the
-- four Wine Spires. It held Chablis Spire and Whine Spire (plus Juno Tower, Vasiliki
-- Tower, Paisano Pinnacle, The Silver Horn) while Burgundy, Chianti and Pernod -- the
-- other three Wine Spires -- and Silver Star Mountain itself were siblings.
--
-- Vasiliki Ridge joins too: Juno Tower and Vasiliki Tower are both already inside the
-- group and both stand ON that ridge, so leaving the ridge outside split one feature
-- across two levels.
--
-- Big Snagtooth (1.78 km south-east) is deliberately NOT moved. It is on Snagtooth
-- Ridge, a separate ridge, and only proximity suggested it -- exactly the evidence this
-- codebase has been burned by. Reported, not executed.
update areas set parent_id = 'wa_silver_star_and_wine_spires'
 where id in ('wa_burgundy_spire','wa_chianti_spire','wa_pernod_spire',
              'wa_silver_star_mountain_okanogan','wa_vasiliki_ridge');

-- ── 4. Drop the hollow duplicate ─────────────────────────────────────────────
-- `wa_north_early_winter_spire` (crag, 0 routes, no children, no elevation) sits 8 m from
-- `wa_north_early_winters_spire` (peak, 6 routes, 7,760 ft). Singular vs plural of one
-- name for one spire -- the stub is the shell the crag tree left behind, and after step 1
-- both would sit under the same parent with near-identical names.
--
-- Safe to delete: it has no routes, no children, and climb_logs / contributions /
-- comments / hazard_votes / user_lists are all empty tables, so nothing is orphaned.
--
-- Guarded on the survivor existing, per 0102 -- a duplicate flag is a hypothesis, and the
-- last unguarded one destroyed the only copy of Triple Couloirs. If the real peak is not
-- there at run time this removes zero rows instead of deleting the last copy.
delete from areas where id = 'wa_north_early_winter_spire'
  and not exists (select 1 from routes where area_id = 'wa_north_early_winter_spire')
  and exists (select 1 from areas k where k.id = 'wa_north_early_winters_spire'
                                      and k.route_count > 0);

-- ── 5. Recount the three groups ──────────────────────────────────────────────
-- route_count is maintained by a trigger on the ROUTES table (0001). It does NOT
-- recompute when an AREA's parent_id changes -- same gap 0017, 0027 and 0097 each
-- repaired, and the reason check:counts exists.
--
-- Recount, never arithmetic. 0097 predicted 86 + 20 = 106 for North Cascades Core and it
-- landed on 103, because the cached 86 was itself 3 too high. Whatever these three land
-- on IS the truth; the numbers in the verify block below are expectations, not assertions.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_liberty_bell_group','wa_kangaroo_ridge','wa_silver_star_and_wine_spires');

-- ── Verify afterward ─────────────────────────────────────────────────────────
-- Cast `path` to text and use NO ltree operators in these checks. `!~` is the TEXT regex
-- operator with no ltree form; it raised 42883 while handing over 0097, and because the
-- SQL Editor runs a pasted script as ONE transaction that error in a read-only SELECT
-- rolled back every correct UPDATE above it.
--
--   select id, name, parent_id, path::text from areas
--     where id in ('wa_lexington_tower','wa_north_early_winters_spire',
--                  'wa_south_early_winters_spire')
--     order by id;
--   -- expect parent_id = wa_liberty_bell_group on all three, and every path ending
--   --        ...wa_sub_wapass.wa_liberty_bell_group.<id>
--
--   select id from areas where id = 'wa_north_early_winter_spire';
--   -- expect 0 rows
--
--   select name, route_count from areas where parent_id = 'wa_liberty_bell_group'
--     order by name;
--   -- expect 6 rows: Concord Tower 6, Lexington Tower 4, Liberty Bell Mountain 20,
--   --                Minuteman Spire 1, North Early Winters Spire 6,
--   --                South Early Winters Spire 13
--
--   select id, route_count from areas
--     where id in ('wa_liberty_bell_group','wa_kangaroo_ridge',
--                  'wa_silver_star_and_wine_spires','wa_sub_wapass')
--     order by id;
--   -- expect roughly liberty_bell_group 50, kangaroo_ridge 13,
--   --        silver_star_and_wine_spires 25, and wa_sub_wapass UNCHANGED at 149.
--   -- The three recounts are authoritative if they disagree; wa_sub_wapass moving at
--   -- all would mean a route left the subtree and is a real problem.
--
--   -- then, from the repo:  npm run check:counts
--   -- It walks every area in the DB and is the only check that proves no ancestor was
--   -- left stale by this file.
