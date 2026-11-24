-- 0520: two places filed twice are folded into one each, and twelve regions' climb counts are recounted.
--
-- check:area-duplicates (daily) named three pairs not on its read list. Each was read in the
-- database on 2026-11-24:
--   Pawtuckaway (NH): nh_pawtuckaway (1,148 climbs, 31 sub-areas, under New Hampshire) and a second
--     "Pawtuckaway" 1.4 km away under Coastal & Southern NH, holding only its own "Lower Cliff" with
--     two ICE climbs: Mountain Project's parallel ice tree. ONE place. Both ice climbs move to the
--     real Lower Cliff (nh_lower_cliff), keeping their names; the emptied copy and its leaf go.
--     "Overhanging Corner Direct" (WI3+) shares its name with the 5.10 rock climb on that cliff:
--     two different climbs on one feature, so that one move takes the duplicate bypass.
--   Crabtree Falls (VA): va_crabtree_falls (Mile Marker sub-areas and The Priest) and a second
--     "Crabtree Falls" 0.12 km away under Shenandoah & NW VA Region holding one climb, the frozen
--     falls themselves (WI3). ONE place. A climb must sit on a leaf (routes_require_leaf) and the
--     real Crabtree Falls has sub-areas, so the copy's leaf moves UNDER it as "The Falls" (0385's
--     Pine River Trail shape) rather than being deleted.
--   Buffalo Canyon/Dark Canyon (MT) is NOT a copy: an empty region whose two sub-areas ARE Buffalo
--     Canyon and Dark Canyon. It was flagged only because those two held paths outside it (a stranded
--     subtree, section 1); once their paths are repaired the guard no longer pairs them.
--   The ice "Overhanging Corner Direct" (WI3+) now shares Lower Cliff with the 5.10 rock climb of that
--     name: two climbs, listed as READ in scripts/data/catalog-duplicates-baseline.json, as 0221 listed
--     Percolator 5.7 / WI3+ when it folded Rumney's ice tree.
--
-- check:counts found twelve regions whose route_count disagreed with the PARENT tree. The count was
-- right by the path tree; 36 areas' paths were wrong (section 1 says why, and makes the database keep
-- a moved subtree's paths and counts current from now on). Every ancestor of an old or new position
-- is RECOUNTED by subquery afterwards, never written as literals.
--
-- ABORTS if any row in any table points at an area it deletes (every foreign key to areas is read
-- from the catalog, not listed by hand: #2835 lost cascaded rows that a hand list missed).

begin;

-- ── 1. A moved area's subtree follows it ───────────────────────────────────────────────────────
-- THE CAUSE of check:counts' twelve drifted regions was not a stale count: route_count matched the
-- PATH tree exactly. 36 areas held a path under their parent's OLD place. A mid-level area had been
-- moved (Lover's Leap Limestone from Northeast to Northwest California, Point Mugu, Riggins, Memorial
-- Falls, Wolf Butte, Emigrant Gulch, Tollgate Pass, Leslie Gulch, Buffalo Canyon/Dark Canyon),
-- areas_set_path rewrote ITS path, and nothing rewrote its children's: areas_set_path fires only on a
-- row's own parent_id/id. 0349 moved areas with a loop that rewrote every descendant by hand; a move
-- without that loop strands the subtree, so every `path <@` reader (the area browser, the charts'
-- subtree totals, partner reach) filed those climbs under the old region.
-- Now the database does it: when an area's path changes, its children's paths follow (and theirs,
-- recursively, through this same trigger), and when the area itself changed PARENT, its route_count
-- leaves the old ancestors and joins the new ones. 0440's trg_areas_path_moves_rollup already moves
-- each area's own per-discipline counts whenever its path changes, so the chart totals follow too.
-- Watches parent_id and id as well as path: a path set by the BEFORE trigger does not fire an
-- UPDATE OF path trigger (0440).
create or replace function public.areas_cascade_path() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.path is not distinct from new.path then return null; end if;
  update areas set path = new.path || subpath(path, nlevel(old.path))
   where parent_id = new.id and path is distinct from new.path || subpath(path, nlevel(old.path));
  if old.parent_id is distinct from new.parent_id and coalesce(new.route_count, 0) <> 0 then
    update areas set route_count = route_count - new.route_count where path @> old.path and id <> new.id;
    update areas set route_count = route_count + new.route_count where path @> new.path and id <> new.id;
  end if;
  return null;
end $$;
revoke all on function public.areas_cascade_path() from public, anon, authenticated;
drop trigger if exists trg_areas_cascade_path on public.areas;
create trigger trg_areas_cascade_path after update of path, parent_id, id on public.areas
  for each row execute function public.areas_cascade_path();

-- ── 2. The 36 stranded subtrees are rewritten under their parent's CURRENT path ───────────────────
-- Captured first, so the recount below reaches both the old and the new ancestors.
create temp table m_recount(path ltree) on commit drop;
insert into m_recount
  select x.path from areas a join areas p on p.id = a.parent_id, areas x
   where a.path <> p.path || subpath(a.path, nlevel(a.path) - 1)
     and (x.path @> a.path or x.path @> p.path);
do $$
declare r record; guard int := 0;
begin
  loop
    select a.id, p.path || subpath(a.path, nlevel(a.path) - 1) as want into r
      from areas a join areas p on p.id = a.parent_id
     where a.path <> p.path || subpath(a.path, nlevel(a.path) - 1)
     order by nlevel(p.path) limit 1;
    exit when not found;
    update areas set path = r.want where id = r.id;   -- trg_areas_cascade_path carries the subtree
    guard := guard + 1;
    if guard > 500 then raise exception '0520: stranded paths did not converge'; end if;
  end loop;
end $$;

-- ── 3. Two places filed twice are folded ──────────────────────────────────────────────────────
do $$
begin
  -- an EMPTY database (a Supabase preview) has no catalog: nothing to fold
  if not exists (select 1 from areas where id = 'nh_pawtuckaway_2') then return; end if;
  if (select count(*) from areas where id in ('nh_pawtuckaway', 'nh_pawtuckaway_2', 'nh_lower_cliff',
        'nh_lower_cliff_2', 'va_crabtree_falls', 'va_crabtree_falls_2')) <> 6 then
    raise exception '0520: expected 6 areas, found a different number';
  end if;
  if exists (select 1 from areas where parent_id = 'nh_pawtuckaway_2' and id <> 'nh_lower_cliff_2')
     or exists (select 1 from areas where parent_id in ('nh_lower_cliff_2', 'va_crabtree_falls_2')) then
    raise exception '0520: a copy holds an area this file did not read';
  end if;
  if exists (select 1 from routes where area_id = 'nh_lower_cliff_2'
               and id not in ('nh_lower_cliff_2_overhanging_corner_direct', 'nh_lower_cliff_2_seaver_s_folly_start'))
     or exists (select 1 from routes where area_id = 'nh_pawtuckaway_2') then
    raise exception '0520: a copy holds a climb this file did not read';
  end if;
end $$;

-- the ancestors that will need a recount, captured BEFORE anything moves
insert into m_recount select a.path from areas a, areas t
 where t.id in ('nh_lower_cliff_2', 'nh_lower_cliff', 'va_crabtree_falls_2', 'va_crabtree_falls') and a.path @> t.path;

set local catalog.allow_duplicate = 'on';
update routes set area_id = 'nh_lower_cliff'
 where id in ('nh_lower_cliff_2_overhanging_corner_direct', 'nh_lower_cliff_2_seaver_s_folly_start')
   and area_id = 'nh_lower_cliff_2';
update areas set parent_id = 'va_crabtree_falls', name = 'The Falls'
 where id = 'va_crabtree_falls_2' and parent_id = 'va_shenandoah_nw_va_region';
reset catalog.allow_duplicate;

do $$
declare fk record; n bigint;
begin
  if not exists (select 1 from areas where id = 'nh_pawtuckaway_2') then return; end if;
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
      from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.areas'::regclass and array_length(c.conkey, 1) = 1
  loop
    if fk.tbl::text = 'areas' and fk.col = 'parent_id' then
      execute format('select count(*) from %s where %I = %L', fk.tbl, fk.col, 'nh_lower_cliff_2') into n;
    else
      execute format('select count(*) from %s where %I in (%L, %L)', fk.tbl, fk.col, 'nh_pawtuckaway_2', 'nh_lower_cliff_2') into n;
    end if;
    if n > 0 then raise exception '0520: % row(s) in %.% point at an area this file deletes', n, fk.tbl, fk.col; end if;
  end loop;
end $$;

delete from areas where id = 'nh_lower_cliff_2'
   and not exists (select 1 from areas c where c.parent_id = areas.id)
   and not exists (select 1 from routes r where r.area_id = areas.id);
delete from areas where id = 'nh_pawtuckaway_2'
   and not exists (select 1 from areas c where c.parent_id = areas.id)
   and not exists (select 1 from routes r where r.area_id = areas.id);

-- recount: the ancestors captured above (old and new positions), the moved leaf's new chain, and
-- the twelve regions check:counts named
insert into m_recount select a.path from areas a, areas t where t.id = 'va_crabtree_falls_2' and a.path @> t.path;
update areas set route_count = (
  select count(*) from routes r join areas d on d.id = r.area_id where d.path <@ areas.path
) where path in (select path from m_recount)
     or id in ('ca_northeast_california', 'ca_northwest_california', 'id_central_idaho', 'id_west_idaho',
               'mt_great_falls_area', 'az_black_hills', 'ca_central_coast', 'ca_los_angeles_basin',
               'ca_santa_monica_mountains', 'or_northeast_oregon', 'or_southeast_oregon', 'mt_paradise_valley');

do $$
declare n int;
begin
  select count(*) into n from areas a join areas p on p.id = a.parent_id
   where a.path <> p.path || subpath(a.path, nlevel(a.path) - 1);
  if n > 0 then raise exception '0520: % area(s) still hold a path under a parent they left', n; end if;
  if not exists (select 1 from areas where id = 'nh_pawtuckaway') then return; end if;
  if exists (select 1 from areas where id in ('nh_pawtuckaway_2', 'nh_lower_cliff_2')) then
    raise exception '0520: a Pawtuckaway copy survived';
  end if;
  select count(*) into n from routes where area_id = 'nh_lower_cliff'
     and id in ('nh_lower_cliff_2_overhanging_corner_direct', 'nh_lower_cliff_2_seaver_s_folly_start');
  if n <> 2 then raise exception '0520: % of 2 ice climbs moved', n; end if;
  if not exists (select 1 from areas where id = 'va_crabtree_falls_2' and parent_id = 'va_crabtree_falls' and name = 'The Falls') then
    raise exception '0520: the Crabtree Falls leaf did not move';
  end if;
end $$;

commit;
