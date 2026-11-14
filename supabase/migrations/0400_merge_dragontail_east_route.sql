-- 0400: two Dragontail Peak climbs each filed twice, under two different names.
--
-- Found by the Peakbagger track pass (2026-11-04). The name-key guard (check:catalog-duplicates) cannot
-- see a climb filed under two names; scripts/oneoff/gpx-any-source/same-climb-census.mjs lists them.
-- READ side by side:
--   * "East Route" = "East Ridge via Aasgard Pass Route": both stored the same 1,971-point recording and
--     describe one line — Colchuck Lake, up Aasgard Pass, across the snowfield to the east-ridge saddle.
--   * "West Route" = "Pandora's Box (W Couloir)": from Colchuck Col, the snow gully just east of the col to
--     the ridge notch, then northeast to the summit — the line every description of Pandora's Box gives.
-- The keeper is the researched row in each pair. It fills each BLANK column from its twin (0221/0271's
-- rule) — here snow_grade_num and sort_order, and disciplines where blank — and takes the twin's name as
-- an alt_name so a search for it still lands. Grades stay the keeper's (Class 3; the twins' "Mod. Snow"
-- is the snow condition the keepers' own text already describes). The twins are deleted.
-- No climber row points at either twin (all 20 referencing tables read 0 on 2026-11-04). ABORTS if one
-- does now, or if a row is no longer where the plan read it.

begin;

create temp table m_merge(keep text not null, drop_id text primary key, keep_name text not null, drop_name text not null) on commit drop;
insert into m_merge values
  ('wa_dragontail_peak_east_ridge_aasgard_pass', 'wa_dragontail_peak_east_route', 'East Ridge via Aasgard Pass Route', 'East Route'),
  ('wa_dragontail_peak_r3', 'wa_dragontail_peak_west_route', 'Pandora''s Box (W Couloir)', 'West Route');

do $$ declare n int; d text[]; begin
  -- an EMPTY database (a Supabase preview, check:migration-replay) has no catalog
  if not exists (select 1 from routes where id in (select keep from m_merge)) then raise notice '0400: no catalog'; return; end if;
  select count(*) into n from m_merge m
    join routes k on k.id = m.keep and k.area_id = 'wa_dragontail_peak' and k.name = m.keep_name
    join routes o on o.id = m.drop_id and o.area_id = 'wa_dragontail_peak' and o.name = m.drop_name;
  if n <> 2 then raise exception '0400: % of 2 pairs are as the plan read them', n; end if;
  select array_agg(drop_id) into d from m_merge;
  select (select count(*) from climb_logs where route_id = any(d))
       + (select count(*) from content_reports where route_id = any(d))
       + (select count(*) from contributions where route_id = any(d))
       + (select count(*) from crew_listings where route_id = any(d))
       + (select count(*) from crews where route_id = any(d))
       + (select count(*) from gps_submissions where route_id = any(d))
       + (select count(*) from hazard_votes where route_id = any(d))
       + (select count(*) from objectives where route_id = any(d))
       + (select count(*) from route_base_checkins where route_id = any(d))
       + (select count(*) from route_base_pin_changes where route_id = any(d))
       + (select count(*) from route_difficulty_ratings where route_id = any(d))
       + (select count(*) from route_field_confidence where route_id = any(d))
       + (select count(*) from route_flags where route_id = any(d))
       + (select count(*) from route_ratings where route_id = any(d))
       + (select count(*) from route_views where route_id = any(d))
       + (select count(*) from topo_lines where route_id = any(d))
       + (select count(*) from topos where route_id = any(d))
       + (select count(*) from user_itineraries where route_id = any(d))
       + (select count(*) from route_link_ups where route_ids && d)
       + (select count(*) from user_lists where route_ids && d)
    into n;
  if n > 0 then raise exception '0400: % climber rows point at a row this deletes — stop and repoint them', n; end if;

  update routes k set
    disciplines = case when (k.disciplines is null or k.disciplines in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.disciplines else k.disciplines end,
    snow_grade_num = coalesce(k.snow_grade_num, o.snow_grade_num),
    sort_order = coalesce(k.sort_order, o.sort_order),
    alt_names = case when m.drop_name = any(coalesce(k.alt_names, '{}')) then k.alt_names else array_append(coalesce(k.alt_names, '{}'), m.drop_name) end
  from m_merge m join routes o on o.id = m.drop_id
  where k.id = m.keep;

  delete from routes where id = any(d);
  if exists (select 1 from routes where id = any(d)) then raise exception '0400: a twin survived'; end if;
end $$;

commit;
