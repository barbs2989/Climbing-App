// Owner, 2026-10-07, after 0259: "if it actually names a place then keep it". 0259's rule read a name
// made only of generic words as a bucket — but "The Crags" or "The Boulders" can be the real name of a
// crag cluster or a sector. Each such name 0259 removed was researched (audits/generic-area-names-2026-10-07/
// real-names.json); this writes the migration that puts back every one READ as a real name:
//   * a grouping 0259 dissolved is re-created from the rollback snapshot (same id, parent, coordinate,
//     blurb) and its sub-areas move back under it;
//   * a leaf 0259 renamed for its place gets its real name back;
//   * an empty area 0259 deleted that is a real place is re-created (empty real areas are fine — owner,
//     2026-09-30: climbers will add climbs).
// It also lists each restored id in scripts/data/generic-area-names-exempt.json, so check:generic-area-names
// accepts it.
//   node scripts/oneoff/plan-restore-real-place-names.mjs <NNNN> [--write]
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const DIR = path.join(ROOT, "audits/generic-area-names-2026-10-07");
const NUM = process.argv[2]; if (!/^\d{4}$/.test(NUM || "")) throw new Error("usage: plan-restore-real-place-names.mjs <migration number> [--write]");
const WRITE = process.argv.includes("--write");
const key = requireServiceKey();
const verdicts = JSON.parse(fs.readFileSync(path.join(DIR, "real-names.json"), "utf8")).filter(v => v.verdict === "real_name");
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/rollback-generic-area-fold-1791415115166.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(path.join(DIR, "plan.json"), "utf8"));
const before = new Map(snap.areas.map(a => [a.id, a]));
// "Crags, The" and "The Crags" were ONE place filed twice (co_the_crags held only "Mid Rib"): restore the
// one, and put the other's sub-area under it rather than re-create a duplicate.
const ALIAS = { co_the_crags: "co_crags_the" };

const live = new Map((await selectAll("areas", "id,name,parent_id", "", { key, pageSize: 1000 })).map(a => [a.id, a]));
const q = s => s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'";
const n = v => v == null ? "null" : String(+v);
const steps = [], exempt = {}, problems = [];
const deleted = new Set(plan.ops.filter(o => o.op === "delete").map(o => o.id));
const renamed = new Map(plan.ops.filter(o => o.op === "rename").map(o => [o.id, o]));
const ids = new Set(verdicts.map(v => ALIAS[v.id] || v.id));
for (const id of ids) {
  const v = verdicts.find(x => (ALIAS[x.id] || x.id) === id && x.id === id) || verdicts.find(x => (ALIAS[x.id] || x.id) === id);
  const name = (v.real_name_spelling || before.get(id)?.name || "").trim();
  const was = before.get(id);
  if (!was) { problems.push(`${id}: not in the rollback snapshot`); continue; }
  exempt[id] = { name, why: `a real place name, not a bucket (researched 2026-10-07): ${String(v.evidence).replace(/\s+/g, " ").slice(0, 220)}` };
  if (deleted.has(id)) {
    if (live.has(id)) { problems.push(`${id}: deleted by 0259 but present again`); continue; }
    if (!live.has(was.parent_id)) { problems.push(`${id}: its parent ${was.parent_id} is gone`); continue; }
    steps.push(`perform pg_temp.mk(${q(id)}, ${q(name)}, ${q(was.parent_id)}, ${n(was.lat)}, ${n(was.lng)}, ${q(was.area_type)}, ${q(was.region)}, ${q(was.blurb)});  -- re-created: ${was.name}`);
    // its sub-areas, and the alias copy's, come back under it
    const kidsOf = pid => snap.areas.filter(a => a.parent_id === pid).map(a => a.id);
    const kids = [...kidsOf(id), ...Object.entries(ALIAS).filter(([, t]) => t === id).flatMap(([s]) => kidsOf(s))];
    for (const k of kids) {
      const cur = live.get(k);
      if (!cur) { problems.push(`${id}: sub-area ${k} is gone (folded?)`); continue; }
      steps.push(`perform pg_temp.mv_area(${q(k)}, ${q(cur.parent_id)}, ${q(id)});  -- ${cur.name}`);
    }
  } else if (renamed.has(id)) {
    const cur = live.get(id); if (!cur) { problems.push(`${id}: gone`); continue; }
    steps.push(`perform pg_temp.ren(${q(id)}, ${q(cur.name)}, ${q(name)});  -- was "${was.name}" before 0259`);
  } else problems.push(`${id}: 0259 neither deleted nor renamed it`);
}
console.log(`real names to restore: ${ids.size} | steps ${steps.length}`); for (const s of steps) console.log("  " + s.slice(0, 150));
if (problems.length) { console.log("PROBLEMS:"); for (const p of problems) console.log("  " + p); }
if (!WRITE) process.exit(0);
if (problems.length) { console.error("refusing to write with problems"); process.exit(1); }

const file = path.join(ROOT, `supabase/migrations/${NUM}_restore_real_place_names_after_generic_fold.sql`);
const touched = [...new Set([...ids, ...steps.flatMap(s => [...s.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]))])];
fs.writeFileSync(file, `-- ${NUM}: put back the REAL place names 0259 removed.
--
-- Owner, 2026-10-07, after 0259 folded 147 areas named only by discipline: "if it actually names a place
-- then keep it". 0259's rule (scripts/lib/generic-area-name.mjs) reads a name made only of generic words
-- as a bucket, and "The Crags" / "The Boulders" can be the real name of a crag cluster or a sector. Every
-- such name 0259 removed was researched (audits/generic-area-names-2026-10-07/real-names.json, evidence per
-- id); the ${ids.size} READ as real are restored here — a dissolved grouping re-created from 0259's rollback
-- snapshot with its sub-areas moved back, a renamed leaf given its real name back — and listed in
-- scripts/data/generic-area-names-exempt.json so check:generic-area-names accepts them.
-- Generated by scripts/oneoff/plan-restore-real-place-names.mjs. Each step asserts its effect.

begin;

create or replace function pg_temp.mk(p_id text, p_name text, p_parent text, p_lat float8, p_lng float8, p_type text, p_region text, p_blurb text) returns void language plpgsql as $f$
begin
  if exists (select 1 from areas where id = p_id) then raise exception '${NUM}: % already exists', p_id; end if;
  insert into areas (id, name, parent_id, area_type, region, lat, lng, blurb) values (p_id, p_name, p_parent, p_type, p_region, p_lat, p_lng, p_blurb);
end $f$;
create or replace function pg_temp.mv_area(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update areas set parent_id = p_to where id = p_id and parent_id = p_from;
  if not found then raise exception '${NUM}: % is not under % (re-parent to %)', p_id, p_from, p_to; end if;
end $f$;
create or replace function pg_temp.ren(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update areas set name = p_to where id = p_id and name = p_from;
  if not found then raise exception '${NUM}: % is not named "%"', p_id, p_from; end if;
end $f$;

create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path where t.id in (${touched.map(q).join(", ")});

do $$ begin
-- An EMPTY database (a Supabase preview) has no catalog; a re-run finds the names already back.
if not exists (select 1 from areas where id = 'colorado') then return; end if;
if exists (select 1 from areas where id = ${q([...ids][0])} and name = ${q(exempt[[...ids][0]].name)}) then raise notice '${NUM}: already applied'; return; end if;
${steps.join("\n")}
end $$;

do $$ declare k int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics k = row_count;
    exit when k = 0;
  end loop;
end $$;

insert into m_recount select distinct a.id from areas a join areas t on a.path @> t.path where t.id in (${touched.map(q).join(", ")});
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount);

commit;
`);
const exFile = path.join(ROOT, "scripts/data/generic-area-names-exempt.json");
const ex = JSON.parse(fs.readFileSync(exFile, "utf8"));
Object.assign(ex.exempt, exempt);
fs.writeFileSync(exFile, JSON.stringify(ex, null, 1) + "\n");
console.log(`wrote ${path.relative(ROOT, file)} and ${Object.keys(exempt).length} exemptions`);
