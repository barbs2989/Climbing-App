with ic as (select path from areas where id = 'ut_indian_creek'),
top as (
  select r.id, r.name, r.area_id, a.name as wall, a.area_type, r.discipline, r.grade, r.pitches, r.length_m,
         r.classic, r.classic_score, r.detailed_rack, r.pro_needs, r.rack, r.rack_items, r.gear,
         r.overview, r.description, r.access, r.permit, r.descent_text
    from routes r join areas a on a.id = r.area_id, ic
   where a.path <@ ic.path
     and not exists (select 1 from route_field_evidence e where e.route_id = r.id)
   order by r.classic desc, coalesce(r.classic_score, r.guide_stars, r.stars) desc nulls last, r.id
   limit 150)
select json_build_object('routes', (select json_agg(t) from top t)) j;
