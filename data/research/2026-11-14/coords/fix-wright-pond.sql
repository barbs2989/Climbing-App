-- Wright-Pond (Cutthroat Creek Wall / "Little Liberty Bell", Washington Pass, WA) is 4 pitches, 600 ft, ending on ledges
-- at a slung tree and rappelled (Mountain Project). Its Summit pin "Little Liberty Bell / Cutthroat Creek Wall (formation
-- high point)" 6,263 ft is MP's area elevation + GPS pin; "Little Liberty Bell" is an informal name with no surveyed height.
-- Waypoint rules: a Summit/Topout pin only on a named, fixed, mappable feature with an official height -> drop it.
-- USFS Cutthroat Trailhead page: 4,500 ft -> the Trailhead pin gets it. (2026-11-18, owner "do what you recommend")
begin;
do $$ declare n int; begin
  select count(*) into n from routes r, jsonb_array_elements(r.waypoints) w
   where r.id = 'wa_wright_pond' and w->>'type' = 'Summit' and w->>'name' like 'Little Liberty Bell%';
  if n <> 1 then raise exception 'expected 1 Little Liberty Bell summit pin, found %', n; end if;
end $$;
update routes r
   set waypoints = (
     select jsonb_agg(case when w->>'type' = 'Trailhead' and w->>'name' = 'Cutthroat Creek Trailhead'
                           then w || jsonb_build_object('elev', 4500) else w end order by ord)
       from jsonb_array_elements(r.waypoints) with ordinality as t(w, ord)
      where not (w->>'type' = 'Summit' and w->>'name' like 'Little Liberty Bell%'))
 where r.id = 'wa_wright_pond';
select id, jsonb_array_length(waypoints) pins, waypoints::text like '%Little Liberty Bell%' has_summit,
       (select w->>'elev' from jsonb_array_elements(waypoints) w where w->>'type' = 'Trailhead') th_elev
  from routes where id = 'wa_wright_pond';
commit;
