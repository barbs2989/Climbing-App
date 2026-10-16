// Which of the 143 migration files are ACTUALLY applied to the live database?
//
// Why this exists: supabase_migrations.schema_migrations does not exist on this project —
// every migration was applied by hand (SQL Editor) or by PostgREST, so the CLI has no record
// of any of them. Connecting the GitHub integration in that state would make it treat all 143
// as pending and re-run them, including the data migrations that move, merge and delete areas.
//
// The repair is to write the history to match reality. But "mark everything applied" is a lie,
// so each file is judged against the live catalog.
//
// *** CORRECTION 2026-08-13 — THE ORIGINAL HEADER'S HEADLINE CLAIM WAS FALSE. ***
// It read: "0079_contributions_insert_policy.sql is written and NOT applied (verified live --
// the contributions table carries a SELECT policy and no INSERT policy)." Measured directly:
//
//     contributions | INSERT | "authed can contribute" | with_check (auth.uid() IS NOT NULL)
//
// The INSERT policy exists. It was RENAMED when it was hardened. 0079 creates
// `"anyone can contribute" ... with check (true)`, and because RLS policies are OR'd, running
// it would ADD a permissive policy alongside the strict one and let ANON write to
// `contributions`. So the file the header called "a real pending fix" is a superseded, weaker
// draft, and applying it is a security regression rather than a repair. This is why the
// RENAMED verdict below exists: name equality reported the hardened database as the unpatched
// one, and the resulting to-do list pointed at the wrong action.
//
// A full live sweep on 2026-08-13 found EVERY one of the 8 MISSING and 10 PARTIAL verdicts to
// be false, for four distinct reasons. Nothing needed to be run:
//   * renamed policies (the largest class) — see the RENAMED verdict
//   * storage-schema policies never read at all — the catalog query said schemaname='public'
//   * a later migration dropped the target — 0044/0045/0045/0054 all write `routes.hazard_tags`,
//     which 0060 dropped; same class as 0059, already retired to research/phase3/tier2-unapplied/
//   * the data model legitimately moved on — 0048 pins ONE root area via a unique index, but
//     there are now two legitimate country roots (usa, canada, the latter from 0130/0131), so
//     that index can no longer be created and the file is obsolete, not pending
//   * 0134's `routes_lists_gin_idx` is live as `routes_lists_gin`, an identical
//     `USING gin (lists)` — re-running it would build a DUPLICATE gin index
//
// So: for each migration, extract the schema objects it claims to create and ask the live
// catalog whether they exist. Verdicts, and the honest ones are not hidden:
//
//   APPLIED    every object it creates exists
//   RENAMED    a policy's (table, command) is covered under a different name -> do NOT re-run
//   MISSING    it creates objects and NONE of them exist -> almost certainly never applied
//   OPAQUE     no detectable schema object (pure data migration: update/insert/delete)
//
// MISSING is a HYPOTHESIS, never an instruction. Read the file and the live object before
// running anything: on the only sweep ever run, its precision was zero.
//
// OPAQUE is the important category and it must NOT be read as a problem. A data migration
// leaves no schema footprint, so this script cannot see it either way. Those default to
// applied when repairing, because the risk we are defending against is RE-RUNNING them.
//
// Read-only. Prints a report and writes nothing.
//   node scripts/oneoff/verify-migrations-applied.mjs
//   node scripts/oneoff/verify-migrations-applied.mjs --json out.json

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DIR = "supabase/migrations";
const files = fs.readdirSync(DIR).filter(f => /^\d{4}.*\.sql$/.test(f)).sort();
if (files.length < 100) { console.error(`FAIL: only ${files.length} migrations found — walk broke`); process.exit(1); }

// -- strip -- line comments only. These files are prose-heavy and their headers quote the very
// SQL they are about (0079's header quotes 0002's create policy), so counting a commented
// statement as a real one would invent objects that were never meant to exist.
const decomment = s => s.split("\n").map(l => { const i = l.indexOf("--"); return i === -1 ? l : l.slice(0, i); }).join("\n");

const OBJ = [
  [/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi, "table"],
  // `[^;]` rather than `[\s\S]`: the window must not cross a statement boundary. With
  // `[\s\S]{0,400}` a preceding `alter table account_links ...;` swallowed the next
  // statement's `add column account_type`, so 0035 reported a column on the wrong table
  // and read as PARTIAL while `profiles.account_type` was live all along.
  [/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?[^;]{0,400}?add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z0-9_]+)"?/gi, "column"],
  [/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z0-9_]+)"?/gi, "function"],
  [/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?([a-z0-9_]+)"?/gi, "index"],
  // capture the command too, so a renamed policy can still be matched on (table, cmd)
  [/create\s+policy\s+"([^"]+)"\s+on\s+(?:(?:public|storage)\.)?"?([a-z0-9_]+)"?\s*(?:as\s+\w+\s*)?for\s+(all|select|insert|update|delete)/gi, "policy"],
  [/create\s+(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi, "view"],
];

const want = new Map(); // file -> [{kind, a, b}]
for (const f of files) {
  const sql = decomment(fs.readFileSync(path.join(DIR, f), "utf8"));
  const objs = [];
  for (const [re, kind] of OBJ) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(sql))) {
      if (kind === "column") objs.push({ kind, a: m[1].toLowerCase(), b: m[2].toLowerCase() });
      else if (kind === "policy") objs.push({ kind, a: m[2].toLowerCase(), b: m[1], cmd: m[3].toLowerCase() });
      else objs.push({ kind, a: m[1].toLowerCase(), b: null });
    }
  }
  want.set(f, objs);
}

// -- one round trip for the whole live catalog, rather than a query per object
const CAT = `
select json_build_object(
  'tables',   (select coalesce(json_agg(tablename),'[]') from pg_tables where schemaname='public'),
  'views',    (select coalesce(json_agg(viewname),'[]') from pg_views where schemaname='public'),
  'matviews', (select coalesce(json_agg(matviewname),'[]') from pg_matviews where schemaname='public'),
  'columns',  (select coalesce(json_agg(table_name||'.'||column_name),'[]') from information_schema.columns where table_schema='public'),
  'functions',(select coalesce(json_agg(distinct p.proname),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
  'indexes',  (select coalesce(json_agg(indexname),'[]') from pg_indexes where schemaname='public'),
  -- public AND storage. Restricting to public made every storage.objects policy read as
  -- absent, which is why 0022 (guide_documents) and 0026 (topo_photos) both reported four
  -- missing policies while all eight were live.
  'policies', (select coalesce(json_agg(tablename||'|'||policyname),'[]') from pg_policies where schemaname in ('public','storage')),
  -- (table, command) coverage, used to tell a RENAMED policy from an absent one
  'policycmds',(select coalesce(json_agg(distinct tablename||'|'||lower(cmd)),'[]') from pg_policies where schemaname in ('public','storage')),
  'policynames',(select coalesce(json_agg(tablename||'|'||lower(cmd)||'|'||policyname),'[]') from pg_policies where schemaname in ('public','storage'))
) as cat;`;

const tmp = path.join(process.env.CLAUDE_JOB_DIR || "/tmp", "cat.sql");
fs.writeFileSync(tmp, CAT);
let raw;
try {
  raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp], { encoding: "utf8", timeout: 120000 });
} catch (e) { console.error("FAIL: could not read the live catalog —", e.message); process.exit(1); }

const jm = raw.match(/\{[\s\S]*\}/);
if (!jm) { console.error("FAIL: no JSON in CLI output"); process.exit(1); }
let cat;
try {
  const outer = JSON.parse(jm[0]);
  const rows = outer.result || outer.rows || outer;
  const row = Array.isArray(rows) ? rows[0] : rows;
  cat = row.cat || row;
  if (typeof cat === "string") cat = JSON.parse(cat);
} catch (e) { console.error("FAIL: could not parse catalog —", e.message); process.exit(1); }

const S = k => new Set((cat[k] || []).map(x => String(x).toLowerCase()));
const tables = S("tables"), views = S("views"), matviews = S("matviews"),
      columns = S("columns"), functions = S("functions"), indexes = S("indexes");
const policies = new Set((cat.policies || []).map(x => String(x).toLowerCase()));
const policyCmds = new Set((cat.policycmds || []).map(x => String(x).toLowerCase()));
const policyNames = (cat.policynames || []).map(x => String(x));

if (tables.size < 5) { console.error(`FAIL: live catalog returned ${tables.size} tables — read broke, not a clean DB`); process.exit(1); }

const exists = o => {
  switch (o.kind) {
    case "table":  return tables.has(o.a) || views.has(o.a) || matviews.has(o.a);
    case "view":   return views.has(o.a) || matviews.has(o.a) || tables.has(o.a);
    case "column": return columns.has(`${o.a}.${o.b}`);
    case "function": return functions.has(o.a);
    case "index":  return indexes.has(o.a);
    case "policy": return policies.has(`${o.a}|${String(o.b).toLowerCase()}`);
    default: return false;
  }
};

// A policy whose exact NAME is absent while the same (table, command) is covered by a live
// policy under another name. That is the normal state in this project rather than an edge
// case: policies were hardened after their migration was written and RENAMED to carry the
// constraint they now enforce -- "anyone can file a report" became "anyone can file a report
// open", "guide_profiles self insert" became "...self insert unlisted", and 0079's "anyone
// can contribute" is live as "authed can contribute". Name equality therefore reports the
// HARDENED database as the unpatched one.
//
// This is not cosmetic. 0079 is the case that matters: it creates
//   `for insert to public with check (true)`
// while the live policy checks `auth.uid() is not null`. RLS policies are OR'd, so applying
// 0079 on top of the live one would WIDEN access and let anon write to `contributions`.
// Reported as MISSING it reads as a pending fix; it is a superseded, weaker draft.
const renamedPolicy = o => o.kind === "policy" && !exists(o) && policyCmds.has(`${o.a}|${o.cmd}`);
const liveNamesFor = o => policyNames
  .filter(x => x.toLowerCase().startsWith(`${o.a}|${o.cmd}|`))
  .map(x => x.split("|").slice(2).join("|"));

const rep = { applied: [], missing: [], partial: [], opaque: [], renamed: [] };
for (const f of files) {
  const objs = want.get(f);
  if (!objs.length) { rep.opaque.push({ file: f }); continue; }
  const have = objs.filter(exists);
  const absent = objs.filter(o => !exists(o));
  // split the absent ones: a renamed policy is COVERED, not missing
  const ren = absent.filter(renamedPolicy);
  const lack = absent.filter(o => !renamedPolicy(o));
  if (ren.length) rep.renamed.push({ file: f, ren: ren.map(o => ({ ...o, live: liveNamesFor(o) })) });
  if (!lack.length) rep.applied.push({ file: f, n: objs.length, viaRename: ren.length });
  else if (!have.length && !ren.length) rep.missing.push({ file: f, lack });
  else rep.partial.push({ file: f, have: have.length + ren.length, lack });
}

const line = "-".repeat(74);
console.log(`\nmigration files: ${files.length}   live catalog: ${tables.size} tables, ${columns.size} columns, ${policies.size} policies\n${line}`);
console.log(`APPLIED  ${String(rep.applied.length).padStart(3)}  every object they create exists`);
console.log(`OPAQUE   ${String(rep.opaque.length).padStart(3)}  no detectable schema object (data migrations — invisible either way)`);
console.log(`PARTIAL  ${String(rep.partial.length).padStart(3)}  some objects present, some absent`);
console.log(`MISSING  ${String(rep.missing.length).padStart(3)}  creates objects and NONE exist — probably never applied`);
console.log(`RENAMED  ${String(rep.renamed.length).padStart(3)}  policy live under a DIFFERENT name — covered, do NOT re-run`);
console.log(line);

if (rep.renamed.length) {
  console.log("\nRENAMED — the (table, command) IS covered; re-running these would add a SECOND,");
  console.log("possibly weaker policy, because RLS policies are OR'd together:");
  for (const r of rep.renamed) {
    for (const o of r.ren) {
      console.log(`  ${r.file}`);
      console.log(`     file wants: ${o.a} ${o.cmd.toUpperCase()} "${o.b}"`);
      console.log(`     live:       ${o.live.map(n => `"${n}"`).join(", ") || "(none)"}`);
    }
  }
}

if (rep.missing.length) {
  console.log("\nMISSING — do NOT mark these applied:");
  for (const r of rep.missing) console.log(`  ${r.file}\n     ${r.lack.slice(0, 4).map(o => `${o.kind} ${o.a}${o.b ? "." + o.b : ""}`).join(", ")}`);
}
if (rep.partial.length) {
  console.log("\nPARTIAL — read each before deciding (a later migration may have dropped or renamed the absent half):");
  for (const r of rep.partial) console.log(`  ${r.file}  (${r.have} present)\n     absent: ${r.lack.slice(0, 4).map(o => `${o.kind} ${o.a}${o.b ? "." + o.b : ""}`).join(", ")}`);
}

const ji = process.argv.indexOf("--json");
if (ji > -1 && process.argv[ji + 1]) { fs.writeFileSync(process.argv[ji + 1], JSON.stringify(rep, null, 2)); console.log(`\nwrote ${process.argv[ji + 1]}`); }
console.log("");
