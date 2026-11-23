-- Three one-pitch routes at the Mamie Peak crag (Hannegan Pass road, WA) carry a "Topout" pin "Top of Mamie Peak wall"
-- at 5,000 ft, at the SAME coordinate as their crag/base pins. Mountain Project gives each route as a short pitch near
-- the base of the 700 ft Ellation wall (stephabegg.com: 5,000 ft is the top of Ellation), and their stored gain 1,200 is
-- the published approach to the BASE. The waypoint rules allow a Topout only on a named fixed mappable feature with an
-- official height; this one is neither, and the base pins repeat the wall-top height. Fix (2026-11-18, owner "do the
-- rest"): drop the Topout pin; drop the unsourced 5,000 ft from the base pins (their place is kept).
begin;
do $$ declare n int; begin
  select count(*) into n from routes r, jsonb_array_elements(r.waypoints) w
   where r.id in ('wa_blood_orgy', 'wa_hail_satan', 'wa_woodland_critter_christmas')
     and w->>'type' = 'Topout' and w->>'name' = 'Top of Mamie Peak wall' and (w->>'elev')::numeric = 5000;
  if n <> 3 then raise exception 'expected 3 Mamie Peak Topout pins, found %', n; end if;
end $$;

update routes r
   set waypoints = (
     select jsonb_agg(case when w->>'type' in ('Crag', 'Crag/route start') then w - 'elev' - 'elevFt' else w end order by ord)
       from jsonb_array_elements(r.waypoints) with ordinality as t(w, ord)
      where not (w->>'type' = 'Topout' and w->>'name' = 'Top of Mamie Peak wall'))
 where r.id in ('wa_blood_orgy', 'wa_hail_satan', 'wa_woodland_critter_christmas');

select id, jsonb_array_length(waypoints) pins, waypoints::text like '%Topout%' has_topout, waypoints::text like '%5000%' has_5000
  from routes where id in ('wa_blood_orgy', 'wa_hail_satan', 'wa_woodland_critter_christmas') order by 1;
commit;
