// merge-next-door-twins.mjs — fold a climb filed TWICE on one wall into the row Mountain Project lists.
//
// audit:next-door found older-named copies of a climb (our first import's name) sitting beside the row the
// wall-order run matched to MP's current name: "RBF" next to "Resting Belayer Face", "Webelo" next to
// "[L] Webelo". NEXT DOOR then names a climb as its own neighbour. Each pair in the plan was READ (see the
// plan file's `evidence`); this script only carries out what was decided.
//
//   node scripts/pipeline/merge-next-door-twins.mjs --plan plan.json [--apply] [--batch 8] [--pause-ms 15000]
//
// plan.json: [{ area, keep, drop, keepName, dropName, evidence }]. Per pair, in ONE transaction:
//   - both rows must still be where the plan read them (area and names), or the pair is skipped;
//   - every row of every table that points at a route (24 tables, read live from pg_constraint and the
//     two id arrays, user_lists.route_ids and route_link_ups.route_ids) is counted for `drop`: any at all,
//     and the pair is skipped and reported — never cascaded away;
//   - the keeper fills each BLANK column from its twin (0221/0271's rule) and keeps the HIGHER grade (owner:
//     a grade is never lowered), then the twin is deleted.
// Both full rows are saved to scripts/rollback-next-door-twins-<ts>.json BEFORE anything is written.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const PLAN = arg("plan"), APPLY = process.argv.includes("--apply"), BATCH = +(arg("batch") || 8), PAUSE = +(arg("pause-ms") || 15000);
if (!PLAN) { console.error("usage: --plan plan.json [--apply]"); process.exit(1); }
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const k = requireServiceKey();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
function sql(text) {
  for (let t = 0; ; t++) {
    try {
      const out = execFileSync(NPX, [...NPX_PRE, "supabase", "db", "query", "--linked", "--output-format", "json", text], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
      const at = out.indexOf("{"), j = at >= 0 ? JSON.parse(out.slice(at)) : null;
      // the CLI can print an Error object on stdout; never read that as success
      if (j && j._tag === "Error") throw Object.assign(new Error("cli error"), { stdout: out, stderr: "" });
      return j;
    } catch (e) {
      // the CLI puts the SQL error on STDOUT and only "Initialising login role..." on stderr
      const msg = [e.stdout, e.stderr, e.message].filter(Boolean).map(String).join(" ").replace(/Initialising login role\.\.\.\s*/g, "");
      // a RAISEd SKIP is a decision, never a transient: do not retry it
      if (/SKIP /.test(msg) || t >= 2 || !/timeout|57014|HTTP 5\d\d|status 5\d\d|ECONN|terminated/i.test(msg)) throw new Error(msg.slice(0, 600));
      execFileSync("sleep", ["90"]);
    }
  }
}
const ROLLBACK = `scripts/rollback-next-door-twins-${Date.now()}.json`;
const LOG = PLAN.replace(/\.json$/, "") + ".log.jsonl";
const saved = [];

// One pair as one DO block: assert, count, fill, keep the higher grade, delete. RAISE on any count; the caller
// reads the error and moves on (the transaction rolled back, nothing written for that pair).
const pairSql = p => `do $$ declare n int; refs text := ''; t record; setlist text := ''; c record; kg numeric; dg numeric; ksys text; dsys text;
begin
  perform 1 from routes where id = ${q(p.keep)} and area_id = ${q(p.area)} and name = ${q(p.keepName)};
  if not found then raise exception 'SKIP keeper % moved or renamed', ${q(p.keep)}; end if;
  perform 1 from routes where id = ${q(p.drop)} and area_id = ${q(p.area)} and name = ${q(p.dropName)};
  if not found then raise exception 'SKIP twin % moved or renamed', ${q(p.drop)}; end if;
  for t in select c2.conrelid::regclass::text as tbl, a.attname::text as col from pg_constraint c2 join pg_attribute a on a.attrelid = c2.conrelid and a.attnum = any(c2.conkey) where c2.contype = 'f' and c2.confrelid = 'public.routes'::regclass
    union all select x.table_name::text, x.column_name::text from information_schema.columns x where x.table_schema = 'public' and x.table_name <> 'routes' and x.column_name in ('route_id') and x.table_name not in (select c3.conrelid::regclass::text from pg_constraint c3 where c3.contype = 'f' and c3.confrelid = 'public.routes'::regclass) and (select relkind from pg_class where oid = ('public.' || x.table_name)::regclass) = 'r'
  loop
    execute format('select count(*) from %s where %I = $1', t.tbl, t.col) using ${q(p.drop)} into n;
    if n > 0 then refs := refs || t.tbl || '=' || n || ' '; end if;
  end loop;
  select count(*) into n from user_lists where ${q(p.drop)} = any(route_ids); if n > 0 then refs := refs || 'user_lists=' || n || ' '; end if;
  select count(*) into n from route_link_ups where ${q(p.drop)} = any(route_ids); if n > 0 then refs := refs || 'route_link_ups=' || n || ' '; end if;
  if refs <> '' then raise exception 'SKIP % has references: %', ${q(p.drop)}, refs; end if;
  -- fill every blank column of the keeper from the twin
  for c in select column_name::text as col, data_type::text as dt from information_schema.columns where table_schema = 'public' and table_name = 'routes' and is_generated = 'NEVER' and column_name not in ('id', 'area_id', 'name', 'sort_order', 'grade', 'grade_num', 'grade_system') and data_type not in ('tsvector', 'USER-DEFINED')
  loop
    setlist := setlist || format(', %1$I = case when %2$s then o.%1$I else k.%1$I end', c.col,
      case when c.dt in ('text', 'character varying') then format('nullif(btrim(k.%I), '''') is null', c.col)
           when c.dt = 'jsonb' then format('(k.%1$I is null or k.%1$I in (''null''::jsonb, ''{}''::jsonb, ''[]''::jsonb))', c.col)
           when c.dt = 'ARRAY' then format('coalesce(cardinality(k.%I), 0) = 0', c.col)
           when c.dt = 'integer' and c.col = 'pitches' then 'coalesce(k.pitches, 0) = 0'
           else format('k.%I is null', c.col) end);
  end loop;
  execute 'update routes k set ' || substr(setlist, 3) || ' from routes o where k.id = $1 and o.id = $2' using ${q(p.keep)}, ${q(p.drop)};
  -- the higher grade (same grading system only)
  select grade_num, grade_system into kg, ksys from routes where id = ${q(p.keep)};
  select grade_num, grade_system into dg, dsys from routes where id = ${q(p.drop)};
  if dg is not null and (kg is null or dg > kg) and coalesce(ksys, dsys) = dsys then
    update routes k set grade = o.grade, grade_num = o.grade_num, grade_system = o.grade_system from routes o where k.id = ${q(p.keep)} and o.id = ${q(p.drop)};
  end if;
  delete from routes where id = ${q(p.drop)};
end $$;`;

let done = 0, skipped = 0;
for (let i = 0; i < plan.length; i += BATCH) {
  const part = plan.slice(i, i + BATCH);
  const ids = [...new Set(part.flatMap(p => [p.keep, p.drop]))];
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(k) });
  const rows = await r.json(); if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows).slice(0, 300));
  saved.push(...rows); writeFileSync(ROLLBACK, JSON.stringify(saved, null, 1));
  for (const p of part) {
    if (!APPLY) { console.log("would merge", p.drop, "->", p.keep, "|", p.dropName, "->", p.keepName); continue; }
    try { sql(pairSql(p)); done++; appendFileSync(LOG, JSON.stringify({ ...p, status: "merged" }) + "\n"); console.log("merged", p.drop, "->", p.keep); }
    catch (e) { const m = (e.message.match(/SKIP[^\\"]*/) || [e.message.replace(/Initialising login role\.\.\.\s*/g, "").slice(0, 600)])[0]; skipped++; appendFileSync(LOG, JSON.stringify({ ...p, status: "skipped", why: m }) + "\n"); console.log("skipped", p.drop, "—", m); if (!/SKIP/.test(m)) { console.error("unexpected failure — stopping"); process.exit(1); } }
    await sleep(1500);
  }
  if (APPLY) {
    // reconcile: every dropped id must be gone and every keeper present
    const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(k) })).json();
    const have = new Set(back.map(x => x.id)), log = readFileSync(LOG, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
    for (const p of part) { const st = log.filter(x => x.drop === p.drop).pop()?.status; if (!have.has(p.keep) || (st === "merged" && have.has(p.drop)) || (st === "skipped" && !have.has(p.drop))) { console.error("RECONCILE FAILED", p); process.exit(1); } }
    await sleep(PAUSE);
    // the shared database gate (~/dev/db-throttle): stop the moment the live app's reads slow down
    const gate = process.env.HOME + "/dev/db-throttle/dbslot.mjs";
    try { execFileSync("node", [gate, "check"], { stdio: "ignore" }); }
    catch (e) { if (e.status === 1) { console.error(`database slow — stopped after ${done} merged; re-run with the same plan (merged pairs are skipped as "moved or renamed")`); process.exit(2); } }
  }
}
console.log(`${APPLY ? "merged" : "planned"} ${APPLY ? done : plan.length}, skipped ${skipped}; rollback rows in ${ROLLBACK}`);
