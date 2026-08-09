-- 0119: the 14 peaks under "Snoqualmie Pass" redistributed, and that region dissolved.
--
-- 0118 left this open on purpose: `wa_snoqualmie_i90_region` ("Snoqualmie Pass", 28 routes)
-- sat as a sibling of `wa_snoqualmie_pass_area` ("Snoqualmie Pass Area", 84) — two
-- near-identically named regions in the same picker — and MP indexes none of its 14 peaks,
-- so there was no MP row to copy. This resolves it from research instead of from
-- coordinates.
--
-- ── THE RULE, AND WHERE IT CAME FROM ─────────────────────────────────────────
-- MP's Western Alpine Lakes description states its own boundary, and it is testable:
--
--   "This is the high-country region between Stevens and Snoqualmie Passes, mostly within
--    the Alpine Lakes Wilderness. It includes all climbing between the two highways EXCEPT
--    that directly accessed from I-90 and Highway 2, and is bordered on the east by the
--    vertical line of the North Fork Teanaway River and Jack Creek..."
--    Getting there: "I-90, Highway 2, the Middle Fork Snoqualmie road and the Cle Elum
--    River road."
--
-- So the question for each peak is **which trailhead it is climbed from**, not where it
-- plots. That matters: coordinates got two of these wrong (see MOUNT ROOSEVELT below).
--
-- ── AND WHERE THE RULE NEEDED CORRECTING ─────────────────────────────────────
-- Read alone, "access via the Middle Fork Snoqualmie road" suggests every Middle Fork peak
-- is Western Alpine Lakes. MP's own filing says otherwise. Infinite Bliss, the 23-pitch
-- route on Mount Garfield, sits at:
--
--   Washington > Central-West Cascades & Seattle > North Bend & Vicinity
--             > Exit 34; Middle Fork & Taylor River > Mount Garfield
--
-- Garfield is in the Alpine Lakes Wilderness and is reached from the Middle Fork road, and
-- MP still files it under North Bend. So the Middle Fork ROAD CORRIDOR counts as "directly
-- accessed from I-90" (via Exit 34); only the deep interior beyond it is Western Alpine
-- Lakes. That single breadcrumb is the hardest MP datapoint available for these peaks and
-- it is what splits the Middle Fork group below.

-- ── WESTERN ALPINE LAKES (7) ─────────────────────────────────────────────────
--   Alta Mountain      MP's WAL description names "the Rampart-Rachel area" outright.
--                      Climbed from Rachel Lake TH, 4.2 mi up Box Canyon Rd off Kachess.
--   Four Brothers      Same ridge system, seen from Alta alongside Chikamin Peak and
--                      Mount Thomson — both already Western Alpine Lakes members.
--   Lemah Two          A sub-summit of Lemah Mountain, which is already in WAL. Decisive:
--                      a peak cannot sit in a different region from its own massif.
--   Burnt Boot Peak    End of the Middle Fork road at Dutch Miller Gap — past the Exit 34
--                      corridor, 1 mi east of the crest, and routinely climbed in a day
--                      with Big Snow Mountain, already a WAL member.
--   Cathedral Rock     Cle Elum River road (SR903 > Salmon la Sac > FR4330) — an access
--                      route WAL's own description lists. Adjacent to Daniel at Peggys Pond.
--   Mount Daniel       MP's WAL description names "the glaciated gentleness of Daniel and
--   Mount Hinman       Hinman". Same Cle Elum River road; Hinman is joined to Daniel by a
--                      6,200 ft col.
update areas set parent_id = 'wa_western_alpine_lakes'
 where id in ('wa_alta_mountain','wa_four_brothers','wa_lemah_two','wa_burnt_boot_peak',
              'wa_cathedral_rock','wa_mount_daniel','wa_mount_hinman');

-- ── EXIT 34; MIDDLE FORK & TAYLOR RIVER (4) ──────────────────────────────────
--   Garfield Mountain  MP files it here explicitly (breadcrumb above). Not inferred.
--   Treen Peak         1.25 mi northeast of Garfield, off the Middle Fork River Road ~1.1
--                      mi before the Dingford Creek TH.
--   Mount Price        Dingford Creek TH (FR 5620), same road.
--   Preacher Mountain  Middle Fork TH via Rainy Lake, same road.
-- All four share Garfield's corridor, so they follow Garfield's filing.
update areas set parent_id = 'wa_exit_34_middle_fork_amp_taylor_river'
 where id in ('wa_garfield_mountain','wa_treen_peak','wa_mount_price','wa_preacher_mountain');

-- ── SNOQUALMIE PASS AREA (2 + a stub) ────────────────────────────────────────
--   Denny Mountain     Alpental sits on its flank; approached from I-90 Exit 53. The
--                      "directly accessed from I-90" exception, verbatim.
--   Mount Roosevelt    **Coordinates get this one wrong.** It plots out in the Middle Fork
--                      at -121.477, but it is climbed from the Alpental parking lot via the
--                      Snow Lake trail to Gem Lake, and is habitually paired with Kaleetan
--                      Peak — already a Snoqualmie Pass Area member. Access, not position.
--   Winter-Spring      An empty discipline grouping (0 routes, 0 children) that has to land
--                      somewhere once its parent goes. Moved rather than deleted: a 0-route
--                      node is not evidence of a dead node, and the catalog-wide sweep in
--                      #763 found parallel ice/bouldering trees where deletion erases a
--                      tree rather than a stub.
update areas set parent_id = 'wa_snoqualmie_pass_area'
 where id in ('wa_denny_mountain','wa_mount_roosevelt','wa_winter_spring_ice_snow_mixed_2');

-- ── NORTH BEND & VICINITY (1) ────────────────────────────────────────────────
--   Mount Teneriffe    Mount Si NRCA, climbed from Mt Si Road off Exit 32 — the Si massif,
--                      not the Alpine Lakes. Filed as a direct child rather than under
--                      "Exit 32 / Little Si", which is specifically the Little Si crag.
update areas set parent_id = 'wa_north_bend_vicinity' where id = 'wa_mount_teneriffe';

-- ── DISSOLVE THE EMPTIED REGION ──────────────────────────────────────────────
-- Guarded: it deletes only if every child really moved and it holds no routes. If any
-- UPDATE above matched nothing, this is a silent no-op instead of destroying a populated
-- region — which is the failure mode `check:sql` exists for, and the one that destroyed
-- Triple Couloirs on 2026-07-28.
delete from areas
 where id = 'wa_snoqualmie_i90_region'
   and not exists (select 1 from areas  c where c.parent_id = 'wa_snoqualmie_i90_region')
   and not exists (select 1 from routes r where r.area_id  = 'wa_snoqualmie_i90_region');

-- ── AN UNRELATED BUG FOUND WHILE DOING THIS ──────────────────────────────────
-- `Exit 34: Middle Fork &amp; Taylor River` carries a raw HTML entity in its display name —
-- the only one of 47,566 area names that does, so this is a one-off import escape, not a
-- class. The **id** carries it too (`..._amp_...`) and is deliberately left alone: routes
-- reference it by FK, and the id is never shown to a climber.
update areas set name = 'Exit 34: Middle Fork & Taylor River'
 where id = 'wa_exit_34_middle_fork_amp_taylor_river';

-- ── PATH REPAIR ─────────────────────────────────────────────────────────────
-- All 15 movers are childless leaves, so one pass would do; two for safety. Second is a
-- no-op once consistent.
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);
update areas a set parent_id = a.parent_id
  from areas p where p.id = a.parent_id and a.path <> p.path || subpath(a.path, -1);

-- ── RECOUNT ─────────────────────────────────────────────────────────────────
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_western_alpine_lakes','wa_exit_34_middle_fork_amp_taylor_river',
               'wa_snoqualmie_pass_area','wa_north_bend_vicinity','wa_centralwest');

-- ── Verify afterward, as SEPARATE statements ────────────────────────────────
-- One transaction; an error in a read-only SELECT rolls back the writes above it.
--
--   select id from areas where id = 'wa_snoqualmie_i90_region';
--   -- MUST return 0 rows. If it returns one, a move failed and the guard correctly held.
--
--   select id, name, route_count from areas where parent_id = 'wa_centralwest' order by name;
--   -- expect 5 children, matching MP exactly: North Bend & Vicinity, Seattle and Seattle
--   -- Eastside, Skykomish Valley, Snoqualmie Pass Area, Western Alpine Lakes.
--
--   select id, route_count from areas where id = 'wa_centralwest';
--   -- MUST still be 2090 — every move in this file stays inside Central-West.
--
--   select count(*) from areas a join areas p on p.id = a.parent_id
--     where a.path <> p.path || subpath(a.path, -1);
--   -- MUST be 0.
--
--   -- then:  npm run check:counts   and   npm run audit:area-parents
