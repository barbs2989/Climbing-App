#!/usr/bin/env node
// check:rls — the three database-security invariants that were each broken in production, and
// which nothing in this repo could see.
//
// 58 guards existed before this one and not a single one was about RLS. On 2026-08-19/20 an audit
// of the live catalog found six defects, all on tables holding ZERO rows — a policy that has never
// been asked to refuse anything has never been tested, and 21 of the 32 tables lib/db.js writes
// were in that state. Every fix is a structural property that can silently regress, and a seventh
// instance would ship exactly the way the first six did. That is the argument this file exists to
// answer: an invariant kept only in a migration header rots (see [[semantic-invariants-need-a-script]]).
//
// THE THREE RULES, each a real defect:
//
//   1. A SELF-COMPARISON INSIDE A POLICY (0163). 0042 wrote
//        exists (select 1 from crew_members m where m.crew_id = crew_id and ...)
//      meaning crews_messages.crew_id. But the subquery selects FROM crew_members, so the bare
//      name binds to the INNER table and Postgres stored `m.crew_id = m.crew_id` — true for every
//      row. The membership test collapsed from "a member of THIS crew" to "a member of ANY crew",
//      and any confirmed member could post into any crew's chat. The SELECT policy two lines above
//      qualified its column and was correct, so reads were scoped and writes were not.
//
//   2. A SECURITY DEFINER FUNCTION THAT DOES NOT PIN pg_temp (0171). A definer function runs with
//      the definer's privileges, so which schema an unqualified name resolves to is a security
//      decision. 14 functions were wrong — and SEVEN of those said `set search_path = public`,
//      which READS AS PINNED AND IS NOT: Postgres searches the temporary schema FIRST, ahead of
//      everything in search_path, whenever pg_temp is not itself listed. Naming it is what demotes
//      it to last. handle_new_user was in that false-comfort group.
//
//   3. A TABLE THAT NEVER ENABLES RLS. Not a defect found here — all 39 were enabled — but it is
//      the one whose absence is unrecoverable: a table with RLS off is readable and writable by
//      anyone holding the anon key, which ships in the bundle. Cheap to assert, catastrophic to
//      miss, and the natural place to assert it is beside the other two.
//
// WHY END-STATE REPLAY, NOT A SYNTAX LINT. Most `create function ... security definer` in these
// files set no search_path, because 0171 pinned them with ALTER afterwards. A rule that demanded
// the setting inside each CREATE would fail ~17 historical migrations that are perfectly correct
// today — the "a new gate breaks work already in flight" trap. So every rule replays the whole
// migration set in file order and judges the FINAL state of each object, the same technique
// check:approve-route-columns uses for its monotonic-columns rule. A file is never judged alone.
//
// Static: no database, no network, no browser. Sits in `npm run build` with the other gates, which
// is deliberate — the live-catalog version of this check CANNOT run in CI (PostgREST does not
// expose pg_catalog, and this repo's rule is that CI never holds privileged credentials), and a
// guard that only runs on one person's laptop is a guard you do not have. Catching the shape where
// it is WRITTEN is also strictly better than catching it in the database a day later.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:rls FAILED — ${what}.`);
  console.error("  Nothing below was actually checked, so this is a broken scan, not a clean tree.");
  process.exit(1);
};

// Tables deliberately without RLS, each with a reason. A name here that no longer exists, or that
// has since gained RLS, FAILS as stale bookkeeping — the same rule as check:field-renders' KNOWN
// map. An exemption is a claim about the schema, and a claim nobody re-checks is how a list rots
// into one that silently permits everything.
const RLS_EXEMPT = {};

let files;
try {
  files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
} catch (e) {
  dead(`cannot read ${MIGRATIONS}: ${e.message}`);
}
if (files.length < 20) dead(`only ${files.length} migration file(s) found — the walk broke`);

// `--` line comments only, deliberately NOT the comment/string blanker the .jsx guards use. These
// files are prose-heavy and several headers QUOTE the very defects below (this one included), so a
// scan that read comments would report phantoms. A blanker that also wipes string contents is
// wrong here for the opposite reason: a policy body is full of quoted literals ('confirmed',
// 'open') that the rules must still see.
const strip = (s) => s.replace(/--[^\n]*/g, "");

const sqlOf = new Map();
for (const f of files) {
  try { sqlOf.set(f, strip(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))); }
  catch (e) { dead(`cannot read ${f}: ${e.message}`); }
}

// ── replay ───────────────────────────────────────────────────────────────────
// tables:    name -> { created: file, rlsOn: file|null }
// functions: name -> { definer: bool, searchPath: string|null, file, dropped: bool }
// policies:  "table\0name" -> { body, file }
const tables = new Map();
const functions = new Map();
const policies = new Map();

// Matches `create policy "x" on t for insert with check ( ... );` — balanced to the final
// semicolon at depth 0, because a policy body is full of parenthesised subqueries and a
// non-greedy match to the first `;` truncates mid-EXISTS.
function policyBodies(sql) {
  const out = [];
  const re = /create\s+policy\s+("([^"]+)"|[a-z_0-9]+)\s+on\s+([a-z_0-9.]+)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[2] || m[1];
    const table = m[3].replace(/^public\./, "");
    let i = re.lastIndex, depth = 0;
    for (; i < sql.length; i++) {
      const c = sql[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === ";" && depth === 0) break;
    }
    out.push({ name, table, body: sql.slice(re.lastIndex, i), at: m.index });
  }
  return out;
}

for (const f of files) {
  const sql = sqlOf.get(f);

  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_0-9.]+)/gi)) {
    const t = m[1].replace(/^public\./, "");
    if (!tables.has(t)) tables.set(t, { created: f, rlsOn: null });
  }
  for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?([a-z_0-9.]+)\s+enable\s+row\s+level\s+security/gi)) {
    const t = m[1].replace(/^public\./, "");
    if (!tables.has(t)) tables.set(t, { created: f, rlsOn: null });
    tables.get(t).rlsOn = f;
  }
  for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([a-z_0-9.]+)/gi)) {
    const t = m[1].replace(/^public\./, "");
    tables.delete(t);
    // A dropped table takes its policies with it. Without this the guard keeps checking policies
    // on tables that no longer exist — measured: `account_links` kept two after #1141 removed the
    // account-linking feature. That direction can only produce a FALSE FAILURE on a table nobody
    // can fix, which is the kind of noise that teaches people to ignore a guard.
    for (const k of [...policies.keys()]) if (k.startsWith(t + "\0")) policies.delete(k);
  }

  // create [or replace] function name(...) ... [security definer] ... [set search_path = ...]
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([a-z_0-9.]+)\s*\(/gi)) {
    const name = m[1].replace(/^public\./, "");
    // the header is everything up to the body delimiter ($$ or $tag$); settings live there
    const after = sql.slice(m.index, m.index + 4000);
    const head = after.split(/\$[a-z_]*\$/i)[0] || after;
    const definer = /security\s+definer/i.test(head);
    const sp = head.match(/set\s+search_path\s*(?:=|to)\s*([^\n;]+)/i);
    const prev = functions.get(name);
    functions.set(name, {
      definer: definer || (prev ? prev.definer : false),
      // `create or replace` RESETS function settings, so a later CREATE without one un-pins it.
      searchPath: sp ? sp[1].trim() : null,
      file: f, dropped: false,
    });
  }
  for (const m of sql.matchAll(/alter\s+function\s+([a-z_0-9.]+)\s*\([^)]*\)\s*set\s+search_path\s*(?:=|to)\s*([^\n;]+)/gi)) {
    const name = m[1].replace(/^public\./, "");
    const e = functions.get(name);
    if (e) e.searchPath = m[2].trim();
  }
  for (const m of sql.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?([a-z_0-9.]+)/gi)) {
    const name = m[1].replace(/^public\./, "");
    if (functions.has(name)) functions.get(name).dropped = true;
  }

  // IN STATEMENT ORDER, not two passes. Migrations routinely read
  //   drop policy if exists "x" on t;  create policy "x" on t ...
  // so collecting every CREATE and then applying every DROP deletes the policy the file just
  // rewrote. The first draft did exactly that and went BLIND to 35 policies — including the two
  // this guard exists to protect: `crews_messages | crew members can send messages` (0163) and
  // `contributions | authed can contribute` (0165). It still printed ok. Caught only by diffing
  // the parsed set against pg_policy on the live database; nothing about the run looked wrong.
  const events = [];
  for (const p of policyBodies(sql)) events.push({ at: p.at, kind: "create", p });
  for (const m of sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?("([^"]+)"|[a-z_0-9]+)\s+on\s+([a-z_0-9.]+)/gi)) {
    events.push({ at: m.index, kind: "drop", key: `${m[3].replace(/^public\./, "")}\0${m[2] || m[1]}` });
  }
  events.sort((a, b) => a.at - b.at);
  for (const e of events) {
    if (e.kind === "create") policies.set(`${e.p.table}\0${e.p.name}`, { body: e.p.body, file: f, table: e.p.table, name: e.p.name });
    else policies.delete(e.key);
  }
}

if (!tables.size) dead("parsed ZERO tables — the create-table pattern broke");
if (!policies.size) dead("parsed ZERO policies — the create-policy pattern broke");
if (!functions.size) dead("parsed ZERO functions — the create-function pattern broke");

console.log(`\ncheck:rls — replayed ${files.length} migration(s): ${tables.size} table(s), ${policies.size} live policy(ies), ${functions.size} function(s)\n`);

// ── rule 1: no self-comparison inside a policy (the 0163 class) ───────────────
// `m.crew_id = crew_id` — alias-qualified on one side, BARE on the other, SAME column name. Inside
// a subquery the bare name binds to the inner table, so this is `m.crew_id = m.crew_id`: true for
// every row. There is no legitimate reason to write it, which is what makes this rule precise
// rather than a heuristic — it is not "looks suspicious", it is "always means nothing".
let selfCmp = 0;
for (const p of policies.values()) {
  const flat = p.body.replace(/\s+/g, " ");
  for (const m of flat.matchAll(/\b([a-z_][a-z_0-9]*)\.([a-z_][a-z_0-9]*)\s*=\s*([a-z_][a-z_0-9]*)\b(?!\s*\.)/gi)) {
    if (m[2].toLowerCase() !== m[3].toLowerCase()) continue;
    selfCmp++;
    fail(`${p.file}: policy "${p.name}" on ${p.table} compares ${m[1]}.${m[2]} to a BARE ${m[3]}.`);
    fail(`        Inside the subquery that binds to ${m[1]}.${m[2]} — a self-comparison, true for every row.`);
    fail(`        Qualify it: ${p.table}.${m[3]}`);
  }
  // the already-bound form, in case someone pastes it back out of pg_policy
  for (const m of flat.matchAll(/\b([a-z_][a-z_0-9]*)\.([a-z_][a-z_0-9]*)\s*=\s*\1\.\2\b/gi)) {
    selfCmp++;
    fail(`${p.file}: policy "${p.name}" on ${p.table} contains ${m[0]} — a literal self-comparison.`);
  }
}
if (!selfCmp) ok(`no policy compares a column to itself (${policies.size} checked)`);

// ── rule 2: every SECURITY DEFINER function pins search_path INCLUDING pg_temp ─
let unpinned = 0;
for (const [name, f] of functions) {
  if (!f.definer || f.dropped) continue;
  if (!f.searchPath) {
    unpinned++;
    fail(`${f.file}: ${name}() is SECURITY DEFINER and pins no search_path.`);
    fail(`        Add: alter function public.${name}(...) set search_path = public, pg_temp;`);
  } else if (!/\bpg_temp\b/i.test(f.searchPath)) {
    unpinned++;
    fail(`${f.file}: ${name}() sets search_path = ${f.searchPath} — pg_temp is NOT listed.`);
    fail(`        Postgres searches the temp schema FIRST unless it is named. This READS as pinned`);
    fail(`        and is not. Use: set search_path = public, pg_temp`);
  }
}
const definerCount = [...functions.values()].filter((f) => f.definer && !f.dropped).length;
if (!definerCount) dead("found NO security-definer functions at all — the parse broke");
if (!unpinned) ok(`all ${definerCount} SECURITY DEFINER function(s) pin search_path with pg_temp listed`);

// ── rule 3: every surviving table enables RLS ─────────────────────────────────
let noRls = 0;
for (const [t, e] of tables) {
  if (e.rlsOn) continue;
  if (t in RLS_EXEMPT) continue;
  noRls++;
  fail(`${e.created}: table ${t} never enables row level security.`);
  fail(`        The anon key ships in the bundle, so a table without RLS is world-readable.`);
}
for (const t of Object.keys(RLS_EXEMPT)) {
  if (!tables.has(t)) fail(`RLS_EXEMPT names ${t}, which no migration creates — stale bookkeeping.`);
  else if (tables.get(t).rlsOn) fail(`RLS_EXEMPT names ${t}, but it DOES enable RLS — stale bookkeeping.`);
}
if (!noRls) ok(`all ${tables.size} table(s) enable row level security`);

if (failures) {
  console.error(`\ncheck:rls FAILED — ${failures} problem(s).`);
  process.exit(1);
}
console.log("\ncheck:rls: ok — policies bind the right column, definer functions pin pg_temp, every table has RLS.\n");

// Injection tests (run by hand after any change to the parsing; each must FAIL the run):
//   1. Reinstate 0042's `m.crew_id = crew_id` by deleting 0163  -> rule 1 names the policy.
//   2. Delete 0171                                              -> rule 2 names 14 functions.
//   3. Change 0171 to `set search_path = public`                -> rule 2 fires on the pg_temp half,
//      which is the one a first draft misses because it LOOKS pinned.
//   4. Delete an `enable row level security` line               -> rule 3 names the table.
//   5. Break the create-policy regex                            -> "parsed ZERO policies", exit 1,
//      NOT a clean run. The realistic failure of this guard is a false pass.
//   6. Add a name to RLS_EXEMPT that does enable RLS            -> stale-bookkeeping failure.
