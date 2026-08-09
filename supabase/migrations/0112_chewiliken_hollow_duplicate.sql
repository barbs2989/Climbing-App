-- 0112: the last hollow stub in Washington — same fingerprint as 0106 and 0107.
-- (Written as 0108; renumbered because 0108/0109 merged to main while this was in CI and
--  0110/0111 are claimed by the open Summit Chief PR. A number is only truly yours once
--  something merges.)
--
-- ── WHAT IS WRONG ────────────────────────────────────────────────────────────
-- `wa_chewiliken_creek_crags` is a `crag` row holding 0 routes and 0 children, sitting
-- 57 m from `wa_chewiliken_creek_crags_tonasket`, a `region` carrying 21 routes across
-- four sub-crags (Lower Crag 17, Middle Crag 4, Creek Side 0, Upper Crag 0).
--
-- Verified against the live DB immediately before writing this:
--
--   wa_chewiliken_creek_crags            crag   route_count=0   0 children  0 direct routes
--     in United States > Washington > Okanogan > McLoughlin Canyon (Tonasket)
--   wa_chewiliken_creek_crags_tonasket   region route_count=21  4 children  0 direct routes
--     in United States > Washington > Okanogan
--
-- So a climber browsing McLoughlin Canyon sees a "Chewiliken Creek Crags" entry and taps
-- into an empty screen, while the real 21 routes sit one level up under a near-identical
-- name. Same two-load mechanism as 0106/0107: an OpenBeta-derived crag tree supplied the
-- hollow stub, a separate load supplied the populated area.
--
-- ── WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────────
-- It does NOT reparent the real area under McLoughlin Canyon. Every other Okanogan
-- climbing area is a town-suffixed sibling directly under Okanogan — Burge Mountain
-- (Tonasket), Kettle Valley (Curlew), Whistler Canyon Trailhead (Oroville), McLoughlin
-- Canyon (Tonasket) itself, and ten more. "Chewiliken Creek Crags (Tonasket)" sitting
-- beside them is consistent with that convention, and the 57 m separation is not evidence
-- of containment: these are area-level coordinates, and Chewiliken Creek and McLoughlin
-- Canyon are separate drainages near Tonasket. Moving it on 57 m of coordinate agreement
-- would be the exact mistake [[colocated-duplicate-areas-swept]] records.
--
-- ── NO RECOUNT NEEDED, AND THAT IS CHECKED, NOT ASSUMED ──────────────────────
-- route_count is trigger-maintained on ROUTES, so removing a 0-route childless area
-- cannot change any ancestor's subtree count. McLoughlin Canyon is 44 and its children
-- already sum to exactly 44 (0 + 0 + 36 + 3 + 2 + 1 + 1 + 1), so the stub contributes
-- nothing. `npm run check:counts` was green across all 47,567 areas before this.

-- Guarded exactly as 0102/0107: a duplicate flag is a hypothesis, and the last unguarded
-- delete destroyed the only copy of Triple Couloirs. This removes the row only if it still
-- holds no routes, still has no children, and its populated twin still exists.
delete from areas where id = 'wa_chewiliken_creek_crags'
  and not exists (select 1 from routes where area_id = 'wa_chewiliken_creek_crags')
  and not exists (select 1 from areas where parent_id = 'wa_chewiliken_creek_crags')
  and exists (select 1 from areas k
               where k.id = 'wa_chewiliken_creek_crags_tonasket' and k.route_count > 0);

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- Do not append these to the paste above. The SQL Editor runs a pasted script as ONE
-- transaction, and an error in a read-only SELECT rolls back the writes before it — that
-- is how 0097's six correct UPDATEs were undone.
--
--   select id from areas where id = 'wa_chewiliken_creek_crags';
--   -- expect 0 rows
--
--   select name, route_count from areas where parent_id = 'wa_mcloughlin_canyon_tonasket'
--     order by name;
--   -- expect 7 rows (was 8), still summing to 44
--
--   select id, route_count from areas
--     where id in ('wa_mcloughlin_canyon_tonasket','wa_chewiliken_creek_crags_tonasket');
--   -- expect 44 and 21, both UNCHANGED. Either one moving means a route left a subtree
--   -- and is a real problem.
--
--   -- then, from the repo:  npm run check:counts   and   npm run audit:area-parents
