#!/usr/bin/env node
// check:column-drift — is the live TABLE the one the migrations describe?
//
// `check:function-drift` asks this of stored functions and found two hand-made ones git had
// never seen. Nothing asked it of COLUMNS, and the same thing happened: on 2026-08-27 the live
// `routes` table gained `access_checked_at` with 39 rows stamped, and the repo contains no
// migration, no commit, and no reader for it. The DATA shipped to production; the CODE did not.
//
// THREE GUARDS SIT NEXT TO THIS AND NONE CAN SEE IT.
//   - `check:schema` (check-schema-drift.mjs) is a build gate, and asks exactly one direction:
//     does lib/db.js READ a column the snapshot lacks. An EXTRA column in the database breaks
//     nothing it tests.
//   - `check:function-columns` asks whether columns a stored FUNCTION writes still exist — a
//     different subject, and it too only looks for absence.
//   - `check:migrations` refuses two files sharing a number. A migration nobody wrote has no
//     number to collide with.
// A column that exists and is described nowhere is invisible by construction, which is the
// shape `check:overlay-discovery` and `check:drift` both exist for: a coverage hole cannot
// report itself.
//
// WHY THE SNAPSHOT COULD NOT CATCH IT, AND WHY REFRESHING IT WOULD MAKE THINGS WORSE.
// `scripts/schema-snapshot.json` is a committed cache of the live schema that a human refreshes
// on purpose, and `check:schema` validates lib/db.js against it. So the snapshot is the only
// record of the database inside the repo — and `npm run schema:refresh` would silently ABSORB
// `access_checked_at`, after which lib/db.js could legally read a column that no migration
// creates. A rebuild from migrations would then produce an app reading a column that does not
// exist, and every gate would stay green. That is the "baseline regenerated until it asserts
// nothing" failure with teeth, so section A has to ask the question against the MIGRATIONS
// rather than against the cache.
//
// PRECISION WAS MEASURED BEFORE THIS SHIPPED, because a detector over 179 migration files is
// exactly the kind that returns a page of noise. Across 41 live tables and 479 live columns:
// section A reports ONE, section B reports ZERO, section C reports four. The migration
// directory turns out to describe the database almost exactly — which is what makes the one
// exception worth reading rather than a needle in a haystack.
//
// Reads the live database, so it is NOT a build gate and never runs in CI — same placement as
// check:function-drift and for the same reason. Run it after any migration, and after any DDL
// applied by hand.
//
//   node scripts/check-column-drift.mjs                 report, exit 1 on an undeclared finding
//   node scripts/check-column-drift.mjs --fixture f.json   read live schema from a file (tests)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, requireServiceKey, headers } from "./lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };

// ── declared, and a STALE entry fails ────────────────────────────────────────────────────────
// Every name is a claim that this column is live, undescribed, and that somebody has looked. The
// moment a migration describes it the claim is stale and this run fails, so the list cannot rot.
const KNOWN = {
  // routes.access_checked_at was declared here for exactly one day. It was applied to the live
  // database by hand on 2026-08-27 with 39 rows stamped and anon-readable, while the repo held no
  // migration, no commit anywhere in history mentioning the name, and no reader — the data had
  // shipped to production and the code had not. #1347 landed the missing half
  // (0172_road_access_can_carry_a_date.sql, lib/road.js, check:access-checked-line), this guard
  // went red as STALE bookkeeping on the next run, and the entry came out.
  //
  // That is the contract validated against a REAL event rather than an injection: the entry was
  // written predicting the repair, the repair landed from another session, and the declaration
  // failed by itself without anybody remembering it existed. Injection case `stale-known` pins
  // the same behaviour synthetically.
};


// TEST-ONLY: `--known table.column=reason` adds a declaration at run time. The stale-bookkeeping
// assertion is the one thing that cannot be tested when KNOWN is in its correct state — empty —
// and an assertion that only works while the tree is unhealthy is not an assertion. Used solely by
// scripts/oneoff/inject-column-drift-cases.mjs.
for (let i = 0; i < process.argv.length - 1; i++) {
  if (process.argv[i] !== "--known") continue;
  const [k, ...rest] = process.argv[i + 1].split("=");
  KNOWN[k] = rest.join("=") || "declared on the command line (test)";
}

const dead = (what) => {
  console.error(`\ncheck:column-drift FAILED — ${what}.`);
  console.error("Nothing below was checked. This guard reports schema that is DESCRIBED NOWHERE,");
  console.error("so a broken scan finds nothing and would otherwise read as a clean database.\n");
  process.exit(1);
};

// ── what the migrations describe ─────────────────────────────────────────────────────────────
const MIG = path.join(ROOT, "supabase", "migrations");
if (!fs.existsSync(MIG)) dead("supabase/migrations does not exist");
const files = fs.readdirSync(MIG).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
if (files.length < 20) dead(`only ${files.length} migration(s) found — the walk broke`);

const strip = (s) => s.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const tracked = new Map();     // table -> Set(column)
const views = new Set();       // views/matviews: created by `create view`, not `create table`
const put = (t, c) => {
  t = t.toLowerCase(); c = c.toLowerCase();
  if (!tracked.has(t)) tracked.set(t, new Set());
  tracked.get(t).add(c);
};
// Replayed in STATEMENT order, not pattern order. `0036_crews_persistence.sql` does
// `drop table if exists crews cascade;` and then re-creates it in the SAME file, so applying
// every CREATE and then every DROP wipes the table the file had just built and reports all ten
// of its columns as undescribed. check:rls records this exact defect from the policy side —
// there a drop deleted the policy the same file had just rewritten. Order is the fix in both.
for (const f of files) {
  const sql = strip(fs.readFileSync(path.join(MIG, f), "utf8"));
  const events = [];
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_0-9]+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi)) {
    const t = m[1], body = m[2];
    events.push([m.index, () => {
      let depth = 0, cur = "";
      for (const ch of body + ",") {
        if (ch === "(") depth++; else if (ch === ")") depth--;
        if (ch === "," && depth === 0) {
          const mm = cur.trim().match(/^"?([a-z_0-9]+)"?\s+/i);
          // a table constraint is not a column, and reads exactly like one to a naive split
          if (mm && !/^(primary|foreign|unique|check|constraint|exclude|like)$/i.test(mm[1])) put(t, mm[1]);
          cur = "";
        } else cur += ch;
      }
    }]);
  }
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    const t = m[1].toLowerCase(); events.push([m.index, () => views.add(t)]);
  }
  for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    const t = m[1].toLowerCase(); events.push([m.index, () => tracked.delete(t)]);
  }
  for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?([a-z_0-9]+)"?([\s\S]*?);/gi)) {
    const t = m[1].toLowerCase(), body = m[2];
    events.push([m.index, () => {
      for (const a of body.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_0-9]+)"?/gi)) put(t, a[1]);
      for (const d of body.matchAll(/drop\s+column\s+(?:if\s+exists\s+)?"?([a-z_0-9]+)"?/gi)) tracked.get(t)?.delete(d[1].toLowerCase());
      for (const r of body.matchAll(/rename\s+column\s+"?([a-z_0-9]+)"?\s+to\s+"?([a-z_0-9]+)"?/gi)) {
        const st = tracked.get(t); if (st) { st.delete(r[1].toLowerCase()); st.add(r[2].toLowerCase()); }
      }
    }]);
  }
  events.sort((a, b) => a[0] - b[0]);
  for (const [, apply] of events) apply();
}
const trackedCols = [...tracked.values()].reduce((n, s) => n + s.size, 0);
if (trackedCols < 100) dead(`parsed only ${trackedCols} column(s) from ${files.length} migrations — the patterns broke`);

// ── what the live database has ───────────────────────────────────────────────────────────────
let live;
const fixture = arg("fixture");
if (fixture) {
  live = JSON.parse(fs.readFileSync(fixture, "utf8"));
  console.log(`reading live schema from fixture ${path.basename(fixture)} …`);
} else {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: headers(requireServiceKey(), { Accept: "application/openapi+json" }),
  }).catch((e) => dead(`the database is unreachable (${e.message}) — this is not a clean schema`));
  if (!res.ok) dead(`OpenAPI fetch failed: ${res.status}`);
  const spec = await res.json();
  const defs = spec.definitions || (spec.components && spec.components.schemas) || {};
  live = {};
  for (const t of Object.keys(defs).sort()) live[t] = Object.keys(defs[t].properties || {}).sort();
}
if (!Object.keys(live).length) dead("the live schema exposed no tables — refusing to report a clean database");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const liveCols = Object.values(live).reduce((n, c) => n + c.length, 0);
console.log(`${files.length} migration(s) describe ${tracked.size} table(s) / ${trackedCols} column(s)`);
console.log(`the live database has ${Object.keys(live).length} table(s) / ${liveCols} column(s)\n`);

// ── A. live, and described NOWHERE ───────────────────────────────────────────────────────────
console.log("A. live schema no migration describes");
let aFound = 0;
for (const [t, cols] of Object.entries(live)) {
  const k = tracked.get(t.toLowerCase());
  if (!k) {
    if (views.has(t.toLowerCase())) continue;   // a view is created by `create view`, not a table
    aFound++;
    const key = t;
    if (KNOWN[key]) { console.log(`  known  ${key} (whole table) — ${KNOWN[key]}`); continue; }
    fail(`${t} — a whole TABLE that no migration creates (${cols.length} columns).`);
    continue;
  }
  for (const c of cols) {
    if (k.has(c.toLowerCase())) continue;
    aFound++;
    const key = `${t}.${c}`;
    if (KNOWN[key]) { console.log(`  known  ${key} — ${KNOWN[key]}`); continue; }
    fail(`${key} exists in the live database and NO migration describes it.\n` +
         `        Nothing in git creates it, so a rebuild from migrations would not produce it and\n` +
         `        nobody reviewed it. THREE CAUSES, and they want opposite actions:\n` +
         `          1. AN OPEN PR ALREADY CARRIES ITS MIGRATION — the likeliest, because sessions\n` +
         `             here apply DDL before the PR lands. Check first:\n` +
         `               gh pr list --state open --search "${c} in:title,body"\n` +
         `               gh search code --owner "$(gh repo view --json owner -q .owner.login)" "${c}"\n` +
         `             If so do NOTHING: not a migration (it would duplicate a number), and NOT a\n` +
         `             KNOWN entry — that goes stale the moment the PR merges, and a stale entry\n` +
         `             fails this guard in its own right.\n` +
         `          2. DDL applied by hand and never written down — write the migration.\n` +
         `          3. Genuinely intended to live outside the migrations — declare it in KNOWN\n` +
         `             with the reason, and expect to remove that entry later.\n` +
         `        Do NOT reach for \`npm run schema:refresh\` in any of the three: section A exists\n` +
         `        to stop a refresh silently absorbing a column no migration creates.`);
  }
}
if (!aFound) console.log("  ok    every live table and column is described by a migration");

// ── B. described, and absent live ────────────────────────────────────────────────────────────
console.log("\nB. migration schema the live database does not have");
let bFound = 0;
const liveLower = new Map(Object.entries(live).map(([t, c]) => [t.toLowerCase(), c.map((x) => x.toLowerCase())]));
for (const [t, cols] of tracked) {
  const l = liveLower.get(t);
  if (!l) { bFound++; fail(`${t} — a migration creates this table and the live database has no such table.`); continue; }
  for (const c of cols) if (!l.includes(c)) { bFound++; fail(`${t}.${c} — described by a migration, absent from the live database.`); }
}
if (!bFound) console.log("  ok    every described table and column exists live");

// ── C. the committed snapshot against live ───────────────────────────────────────────────────
// check:schema is a BUILD GATE and validates lib/db.js against this cache, so a stale cache does
// not merely go quiet — it answers wrongly in both directions. A column live but absent from the
// snapshot makes a correct reader fail the build; a column dropped live but still in the snapshot
// lets a reader of a DROPPED column pass, which is the #372 defect that guard exists to prevent.
console.log("\nC. the committed snapshot against the live database");
const snapPath = path.join(ROOT, "scripts", "schema-snapshot.json");
let cFound = 0;
if (!fs.existsSync(snapPath)) fail("scripts/schema-snapshot.json is missing — check:schema has nothing to validate against.");
else {
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf8")).tables || {};
  for (const [t, cols] of Object.entries(live)) {
    const s = snap[t];
    if (!s) { cFound++; fail(`${t} is live and absent from the snapshot.`); continue; }
    for (const c of cols) if (!s.includes(c)) { cFound++; fail(`${t}.${c} is live and absent from the snapshot — a correct reader of it would FAIL the build.`); }
    for (const c of s) if (!cols.includes(c)) { cFound++; fail(`${t}.${c} is in the snapshot and NOT live — a reader of it would PASS the build and render nothing.`); }
  }
  for (const t of Object.keys(snap)) if (!live[t]) { cFound++; fail(`${t} is in the snapshot and not live.`); }
  if (cFound) console.log(`        → run \`npm run schema:refresh\`. Section A is what stops that refresh from\n          silently absorbing an undescribed column.`);
}
if (!cFound) console.log("  ok    the snapshot matches the live database");

// ── stale declarations ───────────────────────────────────────────────────────────────────────
for (const key of Object.keys(KNOWN)) {
  const [t, c] = key.split(".");
  const cols = live[t];
  const stillUntracked = c
    ? cols && cols.includes(c) && !tracked.get(t.toLowerCase())?.has(c.toLowerCase())
    : cols && !tracked.has(t.toLowerCase()) && !views.has(t.toLowerCase());
  if (!stillUntracked) fail(`KNOWN names "${key}", but it is now described by a migration (or no longer exists).\n` +
                            `        That is the repair landing — delete the entry.`);
}

if (failures) { console.log(`\ncheck:column-drift FAILED — ${failures} finding(s).`); process.exit(1); }
console.log(`\nok — the live schema and the migrations agree${Object.keys(KNOWN).length ? ` (${Object.keys(KNOWN).length} declared)` : ""}.`);
