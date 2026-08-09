-- 0105: reshape Mount Index to match Mountain Project's hierarchy.
--
-- Requested directly: "do it like Mountain Project". MP nests the massif's summits under
-- the peak; we have them flat as SIBLINGS of it, with a fifth row (the #468 peak-scoped
-- enrichment layer) holding duplicates of routes that already live on the sub-peaks.
--
--   MP                                    ours (before)
--   Mount Index                           Skykomish Valley
--     Lake Serene Boulders  (3)             Mount Index   [peak 5,991] 4 routes
--     Main Peak             (1)             Main Peak     [crag]       1 route
--     Middle Peak           (4)             Middle Peak   [region]     0 -> Jotunheim
--       South Norwegian Buttress            North Peak    [crag]       2 routes
--       North Norwegian Buttress
--       Jotunheim
--     North Peak            (2)
--
-- MP's North Peak holds exactly "North Face" and "Traverse of Mount Index" — which is
-- exactly what our North Peak already holds. Our North Peak was already right; what was
-- wrong is that Mount Index carried a second, richer copy of both.
--
-- 0103 already merged those copies (19 columns) onto the peak-scoped keepers, so the
-- keepers are now the best rows and the originals are genuinely redundant. This migration
-- moves the keepers to where MP puts them and drops the originals.
--
-- "Northeast Buttress" is KEPT AS A DISTINCT ROUTE on North Peak, by explicit decision.
-- It shares the 1929 Chute & Kaartinen FA and 12 pitches with the North Face but differs
-- in aspect (NE vs N), grade (5.7 vs 5.6) and length (488 m vs 427 m), its own `fa` says
-- "disputed/uncertain history", and MP lists no such route. Treating it as a third naming
-- and deleting it would be a guess that destroys data; keeping it is reversible.
--
-- ORDER IS LOAD-BEARING. `areas_leaf_xor` forbids nesting anything under an area that
-- holds routes, and `routes_require_leaf` forbids attaching a route to an area that has
-- sub-areas. So Mount Index must be emptied of routes BEFORE it can take children, and
-- the new buttress area must exist BEFORE its route moves in.

-- ── 1. North Peak becomes a peak in its own right ───────────────────────────
-- Three routes are about to move onto it. `enrichRoute` only builds peakMetadata when
-- areaType === 'peak', so leaving it `crag` would strip High point and Prominence from
-- routes that have them today on Mount Index. 5,357 ft is from North Peak's own blurb;
-- prominence is left null because no source publishes one for a subsidiary summit of the
-- massif — the same call as Mushroom Tower and West Craggy in 0097.
update areas set area_type = 'peak',
                 elevation_ft = coalesce(elevation_ft, 5357)
 where id = 'wa_north_peak_2';

-- ── 2. The buttress area MP files under Middle Peak ─────────────────────────
-- MP has North Norwegian Buttress as an AREA under Middle Peak (2 routes, incl. Bluebell);
-- we hold it as a single route. Middle Peak already has a child (Jotunheim), so it cannot
-- take a route directly — the route needs its own area, which is also what MP has.
-- `path` is set by trg_areas_set_path; route_count defaults to 0 and the routes trigger
-- maintains it from here.
insert into areas (id, name, area_type, parent_id, lat, lng, blurb)
values ('wa_north_norwegian_buttress', 'North Norwegian Buttress', 'crag', 'wa_middle_peak_2',
        47.77748, -121.57543,
        'The North Norwegian Buttress is a roughly 2,000-foot buttress on Mount Index''s northwest aspect, visible from US 2 above Lake Serene, separated from the South Norwegian Buttress by a deep cleft.')
on conflict (id) do nothing;

-- ── 3. Empty Mount Index, putting each route where MP has it ────────────────
update routes set area_id = 'wa_north_peak_2'
 where id in ('wa_mount_index_north_face',
              'wa_mount_index_north_peak_traverse',
              'wa_mount_index_northeast_buttress');

update routes set area_id = 'wa_north_norwegian_buttress'
 where id = 'wa_mount_index_north_norwegian_buttress';

-- ── 4. Drop the originals 0103 superseded ───────────────────────────────────
-- Guarded on the keeper being present AND carrying a column 0103 copied, so these are
-- no-ops if that merge never landed. Never delete before the merge is proven.
delete from routes where id = 'wa_north_face_6'
  and exists (select 1 from routes k where k.id = 'wa_mount_index_north_face' and k.pitches is not null);

delete from routes where id = 'wa_traverse_of_mount_index'
  and exists (select 1 from routes k where k.id = 'wa_mount_index_north_peak_traverse' and k.rappel_detail is not null);

-- ── 5. Nest the summits under the peak, as MP does ──────────────────────────
-- Legal only now that Mount Index holds no routes.
update areas set parent_id = 'wa_mount_index'
 where id in ('wa_main_peak_2', 'wa_middle_peak_2', 'wa_north_peak_2');

-- trg_areas_set_path recomputes `path` for the updated row ONLY — descendants keep a
-- stale path unless their parent_id is written again. Re-assign Middle Peak's children to
-- the parent they already have; Postgres fires `update of parent_id` whenever the column
-- is in the SET clause, even with an unchanged value.
update areas set parent_id = 'wa_middle_peak_2' where parent_id = 'wa_middle_peak_2';

-- ── 6. Recount ──────────────────────────────────────────────────────────────
-- route_count is a trigger on ROUTES: the moves and deletes above maintained it, but an
-- AREA reparent does not touch it, so the nodes whose subtree membership changed need a
-- recount. Recomputed by subquery so it cannot go stale.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_mount_index', 'wa_main_peak_2', 'wa_middle_peak_2', 'wa_north_peak_2',
               'wa_north_norwegian_buttress', 'wa_stevens_pass_region');

-- Verify afterward. No ltree operators in the checks: `!~` on an ltree column raised 42883
-- during 0097 and, because the SQL Editor runs a paste as ONE transaction, rolled back the
-- correct UPDATEs above it.
--   select id, name, area_type, parent_id, elevation_ft, route_count, path::text
--     from areas
--    where id in ('wa_mount_index','wa_main_peak_2','wa_middle_peak_2','wa_north_peak_2',
--                 'wa_north_norwegian_buttress','wa_j_tunheim') order by path::text;
--   -- expect Main/Middle/North Peak parented to wa_mount_index, every path containing
--   -- .wa_mount_index., North Peak typed peak at 5357, Mount Index route_count 7
--   select id, name, area_id from routes
--    where area_id in ('wa_mount_index','wa_north_peak_2','wa_north_norwegian_buttress')
--    order by area_id, id;
--   -- expect 0 on wa_mount_index, 3 on North Peak, 1 on the buttress
--   select id from routes where id in ('wa_north_face_6','wa_traverse_of_mount_index');
--   -- expect 0 rows
