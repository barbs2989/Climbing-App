// Draft migration from decisions.json: only to_* verdicts. Not applied.
const fs=require('fs');const d=require('./decisions.json');
const to=d.filter(o=>o.verdict.startsWith('to_')).sort((a,b)=>a.id.localeCompare(b.id));
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const cnt={};for(const o of to)cnt[o.new_discipline]=(cnt[o.new_discipline]||0)+1;
const vals=to.map((o,i)=>`  (${q(o.id)}, ${q(o.area_id)}, ${q(o.new_discipline)}, ${q(JSON.stringify(o.new_disciplines))}::jsonb)${i<to.length-1?',':''} -- ${o.name.replace(/[\r\n]/g,' ')} | ${o.grade} | ${(o.signals.find(s=>s.startsWith('AREA RESEARCH'))||'').match(/~(\d+) min/)?.[0]||''} on foot`).join('\n');
const sql=`-- DRAFT — NOT APPLIED. Crag rows filed alpine move to trad / sport (owner 2026-11-11: "crag for trad is just a
-- short approach"; research-data/trad-alpine-2026-11-11/RULE.md). ${to.length} rows: ${Object.entries(cnt).map(([k,v])=>v+' '+k).join(', ')}.
--
-- Each row: stored alpine with a 5.x grade, no alpine_grade, no Summit pin, no gain_ft, in a crag that a Mountain Project
-- area page puts at <= 45 min on foot from the car with a return to the base, and named on that page with a Sport/Trad
-- type (the new discipline; MP's own "Alpine" tag on these crags is an area-level label, not a setting). Per-route
-- signals and URLs: decisions.json beside this file. No row moved TO alpine by 0413/0418 is here, and no row in an area
-- where 0413/0418 moved a route to alpine.
--
-- Guards: assert-then-set (a row no longer alpine is left alone); a row whose discipline the owner locked by hand
-- (route_field_confidence) or that carries an approved climber edit of discipline / rockStyle is left alone.
-- disciplines: the new primary first (0366's trigger requires the list to hold it), then the route's MP types, then any
-- other tag already on the row except 'alpine'. The route triggers (0051, 0198) re-derive each area's main type.
-- Grade becomes HIGH (climber-locked) once discipline is trad/sport/toprope (0406 _route_field_level_for).
-- Before applying: renumber if 0451 is taken (npm run check:migration-claims), npm run check:sql -- <this file>,
-- check:migration-replay, record the version in supabase_migrations.schema_migrations, then npm run gen:schema.
begin;

create temp table _crag_moves (id text primary key, area_id text not null, discipline text not null, disciplines jsonb not null) on commit drop;
insert into _crag_moves (id, area_id, discipline, disciplines) values
${vals};

-- Every id must exist, sit in the area the decision was made for, and still be alpine; otherwise stop.
do $$
declare n_missing int; n_moved_area int; n_not_alpine int;
begin
  select count(*) into n_missing from _crag_moves m where not exists (select 1 from routes r where r.id = m.id);
  select count(*) into n_moved_area from _crag_moves m join routes r on r.id = m.id where r.area_id is distinct from m.area_id;
  select count(*) into n_not_alpine from _crag_moves m join routes r on r.id = m.id where r.discipline is distinct from 'alpine';
  raise notice 'crag moves: % listed, % missing, % in another area, % no longer alpine', (select count(*) from _crag_moves), n_missing, n_moved_area, n_not_alpine;
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (rows.json 2026-11-14) — re-run classify.js'; end if;
end $$;

update routes r
   set discipline  = m.discipline,
       disciplines = m.disciplines || coalesce((
         select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(r.disciplines) = 'array' then r.disciplines else '[]'::jsonb end) x
          where x not in ('"alpine"'::jsonb, '"mountaineering"'::jsonb, '"scrambling"'::jsonb) and not m.disciplines @> jsonb_build_array(x)), '[]'::jsonb)
  from _crag_moves m
 where r.id = m.id
   and r.area_id = m.area_id
   and r.discipline = 'alpine'
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect ${to.length} (less any rows the guards skipped; the notice above says why).
select discipline, count(*) from routes where id in (select id from _crag_moves) group by discipline order by 1;

commit;
`;
fs.writeFileSync(__dirname+'/0451_crag_rows_out_of_alpine.DRAFT.sql',sql);console.log('rows',to.length,cnt,'bytes',sql.length);
