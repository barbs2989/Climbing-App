-- 0123: the Wilmans Peak Group rejoins the Monte Cristo Group, finishing what 0120 started.
--
-- 0120 moved `wa_wilmans_peak` (the summit, 1 route) into `wa_monte_cristo_group` and is
-- applied. It did not move `wa_wilmans_peak_group`, which is a SEPARATE row holding
-- `wa_wilmans_spires` and the 5.6 "East Wilmans Spire". So the catalog currently splits one
-- formation across two branches of the tree:
--
--   wa_glacier_peak_region  ("Darrington and Mountain Loop Hwy")
--   ├── wa_monte_cristo_group        → wa_wilmans_peak     (Standard Scramble)
--   └── wa_glacier_peak_wilderness   → wa_wilmans_peak_group → wa_wilmans_spires
--                                                             (East Wilmans Spire 5.6)
--
-- The two Wilmans branches are 50 m apart. This is the two-loads-never-joined fingerprint
-- recorded in #736/#763: an OpenBeta crag tree supplied the `Wilmans Peak Group` /
-- `Wilmans Spires` grouping rows, a separate alpine peak list attached `Wilmans Peak` flat,
-- and nothing ever joined them.
--
-- Mountain Project settles the parent, and it is the same evidence 0120 used: MP's Monte
-- Cristo Group lists exactly four children — Columbia Peak, Kyes Peak, Monte Cristo Peak and
-- **Wilmans Peak Group**. 0120 acted on that list for the peak; this acts on it for the group
-- MP actually names.
--
-- ── WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────────
-- It does not move `wa_monte_cristo_group` itself, and that is a decision, not an oversight.
-- MP nests Monte Cristo Group under **Glacier Peak Wilderness**. That is geographically
-- wrong: Monte Cristo Peak, Kyes, Columbia and Cadet all lie in the **Henry M. Jackson
-- Wilderness**, which borders Glacier Peak Wilderness to the north — and we already hold
-- `wa_henry_m_jackson_wilderness` as a sibling row (it currently holds Sloan Peak).
--
-- So the two candidate parents disagree, and neither is safe to apply blind:
--   * MP's placement  → wa_glacier_peak_wilderness  (matches the published tree, wrong land)
--   * land designation → wa_henry_m_jackson_wilderness  (right for Monte Cristo/Kyes/
--     Columbia/Cadet, but Del Campo and Foggy sit west toward Gothic Basin and may not be
--     inside HMJ at all — moving the group would assert a membership for all seven children)
--
-- The standing rule is match MP's PLACEMENT, never its granularity — but that rule assumes
-- MP is right about where a thing is, and here it demonstrably is not. Rather than pick,
-- this is left for a pass that checks each of the seven children against the wilderness
-- boundary individually. 0120's author reached the same conclusion about this group and
-- moved only the row the evidence named.
--
-- ── SAFETY, verified against the live DB immediately before writing ──────────
--   * wa_wilmans_peak_group  — 0 direct routes, 1 child. It is a parent; trg_areas_leaf_xor
--     is satisfied on both sides of the move.
--   * wa_monte_cristo_group  — 0 direct routes, 7 children (Cadet, Columbia, Del Campo,
--     Foggy, Kyes, Monte Cristo Peak, Wilmans Peak). Already a parent, so adopting an
--     eighth child cannot break leaf-XOR.
--   * wa_wilmans_spires      — 1 direct route, 0 children, so ONE level of path repair is
--     enough below the mover.
--   * Both branches sit inside wa_glacier_peak_region, so no ancestor above that region
--     changes subtree membership and its 186 must not move.

update areas set parent_id = 'wa_monte_cristo_group'
 where id = 'wa_wilmans_peak_group';

-- trg_areas_set_path fires `on update of parent_id` for the updated row ONLY — it does not
-- cascade. Re-assigning each child to the same parent puts parent_id back in the SET clause,
-- which re-fires the trigger and re-derives the child's path from the mover's NEW path.
-- wa_wilmans_spires is childless, so one level is enough (same pattern as 0097).
update areas set parent_id = 'wa_wilmans_peak_group' where parent_id = 'wa_wilmans_peak_group';

-- route_count is trigger-maintained on ROUTES and does not recompute when an AREA moves.
-- Recount from the subtree — never arithmetic on two cached numbers (0097 predicted 106 and
-- the truth was 103, because the cached input was itself wrong).
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_monte_cristo_group','wa_glacier_peak_wilderness','wa_glacier_peak_region');

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- One paste is ONE transaction, so an error in a read-only SELECT rolls back the writes
-- above it. Run these after, not with.
--
--   select id, parent_id, path::text from areas
--     where id in ('wa_wilmans_peak_group','wa_wilmans_spires','wa_wilmans_peak') order by id;
--   -- expect all three under ...wa_monte_cristo_group, and specifically
--   --   wa_wilmans_spires = ...wa_monte_cristo_group.wa_wilmans_peak_group.wa_wilmans_spires
--   -- If wa_wilmans_spires still reads ...wa_glacier_peak_wilderness..., the cascade repair
--   -- did not fire and the second UPDATE above needs re-running.
--
--   select id, route_count from areas
--     where id in ('wa_monte_cristo_group','wa_glacier_peak_wilderness','wa_glacier_peak_region')
--     order by id;
--   -- expect monte_cristo_group 10 (was 9), glacier_peak_wilderness 8 (was 9),
--   -- glacier_peak_region UNCHANGED at 186 — the move is internal to it, so any change
--   -- there means a route left the subtree and is a real problem.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents -- --state wa
