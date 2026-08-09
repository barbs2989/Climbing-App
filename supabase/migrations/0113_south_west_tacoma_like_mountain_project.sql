-- 0113: South-West & Tacoma funnelled everything through one row, which also contained a
-- second row of its own name.
--
-- Third find from the MP diff. Mountain Project has five sub-areas under South-West &
-- Tacoma; we have ONE, with everything nested beneath it:
--
--   MP                                    ours (before)
--   South-West & Tacoma                   South-West & Tacoma
--     Columbia Gorge            642         └ Southwest Cascades          669
--     Southwest Cascades        149             ├ Columbia Gorge          520
--     Tacoma & I5 to Foothills   72             ├ Tacoma & I5 to Foothills 58
--     Waterfall ice … SW Cascades 1             ├ Southwest Cascades       48   <- !!
--     Tenino City Park            1             └ 9 alpine peaks
--
-- Two separate faults, and the second explains the first.
--
-- ── 1. A row nested inside its own namesake ──────────────────────────────────
-- `wa_southwest_cascades_2` ("Southwest Cascades", 48 routes) sits INSIDE
-- `wa_southwest_cascades` ("Southwest Cascades", 669). The inner one holds Chimney Rocks,
-- Pinto Rock, Shark Rock and Tatoosh Range — which is, verbatim, what MP's real "Southwest
-- Cascades" holds (MP: Ashford, Chimney Rocks, Goat Rocks, Monte Cristo Slab, Mount Adams,
-- Mount Rainier NP, Mount St. Helens NVM, Pinto Rock, Shark Rock).
--
-- So the INNER row is the genuine crag-tree "Southwest Cascades", and the OUTER row is a
-- second copy that the alpine peak list attached its nine volcanoes and Goat Rocks summits
-- to (Rainier, Adams, St. Helens, Little Tahoma, Liberty Cap, Point Success, Gilbert,
-- Ives, Old Snowy) — and which then also became the parent of Columbia Gorge and Tacoma &
-- I5. The same two-load mechanism as 0106/0107/0111, but here the duplicate is a whole
-- region rather than a peak stub, so it swallowed two unrelated sub-regions on its way.
--
-- The outer row is KEPT and the inner one dissolved into it, not the reverse: the outer id
-- (`wa_southwest_cascades`, unsuffixed) is the one 520 + 58 routes of Columbia Gorge and
-- Tacoma & I5 currently hang from, and the `_2` suffix is the ETL's uniquifier for a
-- same-name clash — the marker of the accidental copy, exactly as in 0102.
--
-- ── 2. Columbia Gorge and Tacoma & I5 belong one level up ────────────────────
-- MP has both as siblings of Southwest Cascades, not children of it. Columbia Gorge alone
-- is 520 routes — 78% of everything in South-West & Tacoma — sitting a level too deep.
--
-- ── WHAT IS NOT DONE HERE ────────────────────────────────────────────────────
-- The nine alpine peaks stay directly under Southwest Cascades. MP groups them further
-- (Mount Rainier National Park, Mount Adams, Mount St. Helens NVM, Goat Rocks), and Little
-- Tahoma, Liberty Cap and Point Success are all features OF Rainier while Gilbert, Ives
-- and Old Snowy are Goat Rocks summits — but we hold no area rows for those four MP
-- groupings, so there is nothing to move them into. Creating four regions and
-- redistributing nine peaks is a bigger, separate change; it is reported, not guessed at.
-- Also not done: MP's "Ashford", "Monte Cristo Slab", "Waterfall ice and mixed routes in
-- the SW Cascades" and "Tenino City Park", none of which we hold at all.
--
-- ── SAFETY ───────────────────────────────────────────────────────────────────
-- Verified against the live DB immediately before writing: none of the five areas involved
-- holds a DIRECT route, so trg_areas_leaf_xor passes on every move. Columbia Gorge carries
-- 91 descendants up to 4 levels deep and Tacoma & I5 carries 20 up to 2, so the path
-- cascade below is run five times.

-- ── 1. Dissolve the duplicate: its four children move up one level ───────────
update areas set parent_id = 'wa_southwest_cascades'
 where parent_id = 'wa_southwest_cascades_2';

-- ── 2. Drop the now-empty duplicate row ──────────────────────────────────────
-- Guarded three ways, per 0102: it must hold no routes, have no remaining children, and
-- the survivor must still exist. Any of those failing makes this a no-op rather than a
-- destructive surprise.
delete from areas where id = 'wa_southwest_cascades_2'
  and not exists (select 1 from routes where area_id = 'wa_southwest_cascades_2')
  and not exists (select 1 from areas where parent_id = 'wa_southwest_cascades_2')
  and exists (select 1 from areas where id = 'wa_southwest_cascades');

-- ── 3. Columbia Gorge and Tacoma & I5 move up beside Southwest Cascades ──────
update areas set parent_id = 'wa_sw_tacoma'
 where id in ('wa_columbia_gorge','wa_tacoma_i5_to_foothills');

-- ── 4. Re-derive every descendant path (5 passes — max depth is 4) ───────────
-- trg_areas_set_path rebuilds `path` only for the row whose parent_id changed; it does not
-- cascade. Naming the column in SET is what re-fires it. Each pass repairs one more level
-- and a pass with nothing to fix is a harmless no-op, so this is idempotent.
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

-- ── 5. Recount the one node whose subtree shrank ─────────────────────────────
-- Only wa_southwest_cascades loses members. wa_sw_tacoma and everything above already
-- counted all 669 routes, since every move stays inside that subtree.
-- Recount, never arithmetic.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id = 'wa_southwest_cascades';

-- ── Verify afterward, as SEPARATE statements ─────────────────────────────────
-- Do not append these to the paste: one transaction, and an error in a read-only SELECT
-- rolls back the writes above it.
--
--   select name, route_count from areas where parent_id = 'wa_sw_tacoma' order by name;
--   -- expect 3 rows: Columbia Gorge 520, Southwest Cascades ~91, Tacoma & I5 58
--
--   select id from areas where id = 'wa_southwest_cascades_2';
--   -- expect 0 rows
--
--   select name from areas where parent_id = 'wa_southwest_cascades' order by name;
--   -- expect 13: the 9 alpine peaks + Chimney Rocks, Pinto Rock, Shark Rock, Tatoosh Range
--
--   select count(*) from areas a join areas p on p.id = a.parent_id
--     where a.path <> p.path || subpath(a.path, -1);
--   -- expect 0 — every path agrees with its parent chain
--
--   select id, route_count from areas where id in ('wa_sw_tacoma','wa_southwest_cascades');
--   -- expect sw_tacoma UNCHANGED at 669; southwest_cascades ~91.
--   -- sw_tacoma moving at all would mean a route left the subtree and is a real problem.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents
