// Migration 0457 from decisions2.json (pass 2 of the crag audit): only to_* verdicts.
const fs = require("fs");
const d = require("./decisions3.json");
const OUT = process.argv[2];
const to = d.filter((o) => o.verdict.startsWith("to_")).sort((a, b) => a.id.localeCompare(b.id));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const cnt = {}; for (const o of to) cnt[o.new_discipline] = (cnt[o.new_discipline] || 0) + 1;
const vals = to.map((o, i) => {
  const min = ((o.signals.find((s) => s.startsWith("AREA RESEARCH: crag")) || "").match(/~(\d+(?:\.\d+)?) min/) || [])[1];
  // the comma goes BEFORE the comment, or the last row's semicolon would sit inside it (0452 replay failure)
  return `  (${q(o.id)}, ${q(o.area_id)}, ${q(o.new_discipline)}, ${q(JSON.stringify(o.new_disciplines))}::jsonb)${i < to.length - 1 ? "," : ";"} -- ${String(o.name).replace(/[\r\n]/g, " ")} | ${o.grade} | ${min ? "<= " + min + " min on foot" : "hand-read approach"}`;
}).join("\n");
const sql = `-- 0462 — Crag rows filed alpine move to trad / sport / top-rope, pass 3 (owner 2026-11-11: "crag for trad is just a
-- short approach"; pass 1 = 0452, pass 2 = 0457). ${to.length} rows: ${Object.entries(cnt).map(([k, v]) => v + " " + k).join(", ")}.
--
-- These rows were still "unsure" after pass 2. Their 227 areas were researched again for a STATED walk time from other
-- sources (8 lists; data/research/2026-11-14/crag3/p-out-*.json; decisions: research-data/crag-rows-out-of-alpine-pass3-2026-11-18/).
-- A row moves only when ALL hold (owner: "accurate and correct"; "i dont want to have to do any of our own math"):
--  * a page STATES the walk from the car to the base as <= 60 min, or as roadside ("virtually no approach");
--    a distance alone, a time from a lift / tram / gondola top, a photo caption, a partly-timed walk, or pages that
--    disagree past 60 min -> NOT moved (left alpine, listed for the owner);
--  * no summit / ridge finish, glacier or snow for the area;
--  * Mountain Project names THIS route with a Sport / Trad / TR type (a guessed or substitute match -> not moved);
--  * the row's own text carries no strong alpine signal; no row moved TO alpine by 0413/0418 and none in their areas.
--
-- Guards (as 0452): assert-then-set (a row no longer alpine is left alone); a row whose discipline the owner locked
-- by hand (route_field_confidence) or that carries an approved climber edit of discipline / rockStyle is left alone.
-- disciplines: the new primary first (0366's trigger requires it), then the route's MP types, then any other tag
-- already on the row except alpine / mountaineering / scrambling. Area main types re-derive via triggers 0051, 0198.
-- Checked before applying: check:migration-claims, check:sql preflight, check:migration-replay; version recorded in
-- supabase_migrations.schema_migrations in the same step; then npm run gen:schema.
begin;

create temp table _crag_moves (id text primary key, area_id text not null, discipline text not null, disciplines jsonb not null) on commit drop;
insert into _crag_moves (id, area_id, discipline, disciplines) values
${vals}

-- Every id must exist, sit in the area the decision was made for, and still be alpine; otherwise stop.
do $$
declare n_missing int; n_moved_area int; n_not_alpine int;
begin
  select count(*) into n_missing from _crag_moves m where not exists (select 1 from routes r where r.id = m.id);
  select count(*) into n_moved_area from _crag_moves m join routes r on r.id = m.id where r.area_id is distinct from m.area_id;
  select count(*) into n_not_alpine from _crag_moves m join routes r on r.id = m.id where r.discipline is distinct from 'alpine';
  raise notice 'crag moves: % listed, % missing, % in another area, % no longer alpine', (select count(*) from _crag_moves), n_missing, n_moved_area, n_not_alpine;
  -- An empty catalog (a migration replay or a Supabase preview branch) holds none of these routes: nothing to move.
  if n_missing = (select count(*) from _crag_moves) then raise notice 'no listed route exists here (empty catalog) — nothing to do'; return; end if;
  if n_missing > 0 or n_moved_area > 0 then raise exception 'ids or areas changed since the audit (2026-11-18) — re-run classify3.js'; end if;
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
fs.writeFileSync(OUT, sql);
console.log("rows", to.length, cnt, "bytes", sql.length, "->", OUT);
