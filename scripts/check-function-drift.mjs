// check:function-drift — does the LIVE function catalog agree with the migrations?
//
// Sibling of check:function-columns, and a different question. That one asks whether a function
// writes a column the table still has. This one asks whether the function running in production
// is the one this repository describes.
//
// WHY IT IS NOT THE SAME AS "the migration merged":
//
//   `scripts/oneoff/verify-migrations-applied.mjs` checks that objects EXIST by name.
//   `merge_accounts` exists, so it passes — while the live body is an OLDER version than 0035
//   defines: it writes `crews.user_id` where 0035 writes `created_by`, and it is missing 0035's
//   entire crew_members merge statement. EXISTENCE IS NOT AGREEMENT.
//
// This repo has been bitten by the gap three times: a migration merged and never applied, a
// migration applied only in part (the create half ran, the trailing revoke/grant/comment did
// not), and a function created by hand in the SQL editor that no migration has ever described.
// All three are invisible to every gate, because the checkout is fine and the database is the
// thing that is wrong.
//
// TWO FINDINGS IT REPORTS:
//   1. DRIFT   — a live body that differs from the newest migration defining that function.
//   2. UNTRACKED — a live function no migration creates at all. Nothing in git describes it, so
//      nobody reviewed it, and re-creating the database from migrations would not produce it.
//
// NORMALISATION, and why it is this loose. The first run reported SEVEN drifting functions and
// FIVE were false:
//   * five differed only by two spaces of leading indent per line — re-applied from a
//     differently-indented source, identical code;
//   * `compute_trust_score` differed by exactly its `--` comment lines, the live copy having
//     been created comment-free — every statement byte-for-byte identical.
// So whitespace runs are collapsed and `--` comments stripped before comparing. A detector that
// reports a function correct in every statement is one people learn to ignore. The count went
// 7 -> 3 -> 2 as each class was removed; distrust a first run here.
//
//   node scripts/check-function-drift.mjs           report, exit 1 on an undeclared finding
//   node scripts/check-function-drift.mjs --diff    also print the first differing chunk
//
// Exit 0 = every live function matches the migration that defines it, or is declared below.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const WANT_DIFF = process.argv.includes("--diff");
const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const MIG = path.join(ROOT, "supabase", "migrations");
const fail = [];

// ── declared, and a STALE entry fails ────────────────────────────────────────
// Each name is a claim about the live database. If the function starts agreeing with its
// migration — or stops existing — the claim is stale and this run fails, so the list cannot rot
// into a description of a database that has moved on.
const KNOWN = {
  // merge_accounts was declared here until 0170 REMOVED the account-linking feature
  // outright. The entry said the RPC must not be repaired without an ownership gate, and
  // that gate was only worth writing if the feature was wanted — it was not: no UI, no
  // caller, 0 rows in account_links, 0 linked profiles. So the liability went instead of
  // being made safe. Same call 0167 made for the two dead crew functions.

  handle_new_user:
    "BENIGN. Differs from 0009 only in writing `public.profiles` where the migration writes " +
    "`profiles` — the live copy is the SAFER one, since it does not depend on search_path. Not " +
    "repaired by editing 0009: an applied migration is history and must not be rewritten. If it " +
    "is ever worth aligning, a new migration re-creates the function with the qualified name.",

  // auto_archive_crews and is_crew_ready were declared here until 0167 dropped them. Both were
  // hand-made, broken on columns that do not exist, referenced by nothing, and duplicated by
  // working client-side code (isArchivedCrew/CREW_ARCHIVE_GRACE_DAYS, and isReady). Their bodies
  // are recorded verbatim in that migration, so the intent is in git for the first time — which
  // was the stated reason for keeping them.
};

// ── live catalog ─────────────────────────────────────────────────────────────
const SQL = `
select coalesce(json_agg(json_build_object(
         'name', p.proname,
         'args', pg_get_function_arguments(p.oid),
         'body', p.prosrc)), '[]') as fns
from pg_proc p
join pg_language l on l.oid = p.prolang
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and l.lanname in ('plpgsql','sql');`;

const tmp = path.join(process.env.CLAUDE_JOB_DIR || "/tmp", "fn-drift.sql");
fs.writeFileSync(tmp, SQL);
let raw;
try {
  raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp],
    { encoding: "utf8", timeout: 180000 });
} catch (e) {
  console.error("FAIL: could not read the live catalog —", String(e.message).split("\n")[0].slice(0, 200));
  console.error("      This guard cannot report on a database it did not reach. Not a pass.");
  // SAY HOW TO FIX IT. Both hand-run function guards go through `supabase db query --linked`, and
  // a FRESH WORKTREE IS NOT LINKED — `supabase link` writes to supabase/.temp, which is gitignored
  // and therefore absent from every new worktree. So a session that does the thing CLAUDE.md asks
  // ("run it by hand after any migration") hits this message, reads it as a missing credential,
  // and moves on. A guard nobody CAN run is worse than one nobody remembers to: the remembering
  // is at least fixable by a note.
  // The link needs no database password — it authenticates against the Management API with the
  // token the CLI already holds, and `supabase projects list` working is the tell that it does.
  console.error("");
  console.error("      If this is a fresh worktree it is simply not LINKED, which is not the same");
  console.error("      as having no credential. Check with:  npx supabase projects list");
  console.error("      If that lists the project, link this worktree and re-run:");
  console.error("        npx supabase link --project-ref <ref>       # no DB password needed");
  process.exit(1);
}
const jm = raw.match(/\{[\s\S]*\}/);
if (!jm) { console.error("FAIL: no JSON in the CLI output — nothing was checked."); process.exit(1); }
let live;
try {
  const outer = JSON.parse(jm[0]);
  const rows = outer.rows || outer.result || outer;
  live = (Array.isArray(rows) ? rows[0] : rows).fns;
} catch (e) { console.error("FAIL: could not parse the catalog —", e.message); process.exit(1); }

if (!Array.isArray(live) || !live.length) {
  console.error("FAIL: the live function catalog came back empty. This database has ~50;");
  console.error("      an empty read means the scan broke, never that there is nothing to check.");
  process.exit(1);
}

// ── newest definition per name, from the migrations in file order ────────────
const files = fs.readdirSync(MIG).filter((f) => /^\d{4}.*\.sql$/.test(f)).sort();
if (files.length < 20) { console.error(`FAIL: only ${files.length} migration(s) found — the walk broke.`); process.exit(1); }

const defs = new Map();
const DEF_RE = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;
for (const f of files) {
  const sql = fs.readFileSync(path.join(MIG, f), "utf8");
  let m; DEF_RE.lastIndex = 0;
  while ((m = DEF_RE.exec(sql)) !== null) {
    const after = sql.slice(m.index);
    const dq = after.match(/\$([a-z_]*)\$/i);
    if (!dq) continue;
    const tag = dq[0];
    const start = after.indexOf(tag) + tag.length;
    const end = after.indexOf(tag, start);
    if (end < 0) continue;
    defs.set(m[1].toLowerCase(), { file: f, body: after.slice(start, end) });
  }
}
if (!defs.size) { console.error("FAIL: parsed no function definition from any migration — the pattern broke."); process.exit(1); }

const norm = (b) => b.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();

let match = 0;
const found = new Map();   // name -> "DRIFT" | "UNTRACKED"
for (const f of live) {
  const d = defs.get(f.name.toLowerCase());
  if (!d) { found.set(f.name, "UNTRACKED"); continue; }
  if (norm(d.body) === norm(f.body)) { match++; continue; }
  found.set(f.name, "DRIFT");
  if (WANT_DIFF) {
    const a = norm(d.body), b = norm(f.body);
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    console.log(`\n  ${f.name} first differs at char ${i}:\n    migration: …${a.slice(Math.max(0,i-40), i+90)}\n    live     : …${b.slice(Math.max(0,i-40), i+90)}`);
  }
}

console.log(`check:function-drift — ${live.length} live function(s), ${defs.size} defined across ${files.length} migrations`);
console.log(`  agree with their newest migration : ${match}`);

for (const [name, kind] of found) {
  if (KNOWN[name]) console.log(`\n  known  ${name} (${kind}) — ${KNOWN[name]}`);
  else fail.push(
    kind === "DRIFT"
      ? `${name}: the LIVE body differs from ${defs.get(name.toLowerCase()).file}, the newest migration that defines it.\n` +
        `        The migration is in the repo and the database is running something else — so it either never\n` +
        `        applied, applied in part, or was edited by hand. Read the live body (pg_proc.prosrc) before\n` +
        `        re-applying anything: a migration may have deliberately left a defect in place.`
      : `${name}: exists in the live database and NO migration creates it.\n` +
        `        Nothing in git describes it, so nobody reviewed it, and rebuilding the database from\n` +
        `        migrations would not produce it. Either write the migration or drop the function.`);
}
for (const name of Object.keys(KNOWN)) {
  if (!found.has(name)) fail.push(
    `KNOWN names "${name}", but it now agrees with its migration (or no longer exists).\n` +
    `        Remove the entry — a declaration that outlives its finding hides the next one.`);
}

if (fail.length) {
  console.error(`\n${fail.length} failure(s):`);
  fail.forEach((f) => console.error(`\n  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\nok — every live function matches the migration that defines it` +
            `${Object.keys(KNOWN).length ? ` (${Object.keys(KNOWN).length} declared)` : ""}`);

// ── injection cases (the fault lives in the DATABASE, so run these by hand) ──
//
// 1. `create or replace function is_crew_ready(crew_id uuid) returns boolean language plpgsql
//     as $$ begin return true; end $$;`  -> still UNTRACKED, still declared, PASSES. Then remove
//    it from KNOWN -> FAILS as untracked. Proves the entry suppresses a real finding.
// 2. Re-create any migration-defined function with one statement changed -> reports DRIFT naming
//    it and the migration file. Restore from the migration afterwards.
// 3. Add a bogus name to KNOWN -> reports STALE, exit 1.
// 4. Point the CLI at a nonexistent project -> "could not read the live catalog", exit 1, never
//    a pass. The case that matters most: an unreachable database must not look like a clean one.
// 5. Break DEF_RE (match `create funktion`) -> "parsed no function definition from any
//    migration", exit 1, rather than reporting all 50 as untracked.
// 6. Re-indent a live function body by two spaces -> must still PASS (whitespace is not drift).
// 7. Strip the `--` comments from a live body -> must still PASS (comments are not behaviour).
//    Cases 6 and 7 are the false-positive classes the first run actually produced.
