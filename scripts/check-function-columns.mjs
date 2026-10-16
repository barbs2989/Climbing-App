// check:function-columns — does every column a stored FUNCTION writes still exist?
//
// This exists because of #1020 / 0155, which dropped `routes.source`. That migration's header
// is careful and names everything it swept: three pipeline loaders and two readers. It missed
// `approve_new_route`, a SECURITY DEFINER RPC that inserted the constant 'community' into that
// column. Route approval was BROKEN on the live database until 0157 removed it.
//
// WHY NOTHING CAUGHT IT, and why it needs a script rather than more care in review:
//
//   plpgsql resolves column names when a statement first RUNS, not when the function is
//   created. So the drop deployed clean, `create or replace` on the function would also have
//   succeeded, every guard stayed green, and the failure was reserved for the next admin to
//   approve a route. Approval is admin-only and exercised by hand, so it could have sat broken
//   indefinitely with nobody seeing a red anything.
//
// `check:schema` is the near miss, and the difference is worth stating: it asserts `lib/db.js`
// never READS a column the database lacks. It never looks inside a function body. A function is
// exactly where this hides, because a function is the one place SQL is stored rather than
// executed.
//
// `scripts/oneoff/verify-migrations-applied.mjs` is the other near miss: it checks that objects
// EXIST by name. `merge_accounts` exists, so it passes — while the live body is an older, broken
// version of the one 0035 defines. Existence is not agreement.
//
// WHY THIS IS NOT A BUILD GATE. It reads the live database (pg_proc + information_schema), which
// PostgREST cannot expose, so it shells out to `supabase db query --linked`. Same reasoning as
// check:counts besides: the condition is a property of the DATABASE, not the checkout. No code
// change can cause it and none can fix it, so failing `npm run build` would block unrelated PRs
// on something their author cannot affect.
//
// WHAT IT CHECKS, AND WHAT IT DOES NOT. It reads the WRITE TARGETS only:
//   * `insert into <table> ( a, b, c )`  — the column list
//   * `update <table> set a = ..., b = ...` — the assignment targets
// It deliberately does NOT try to resolve arbitrary column references in WHERE clauses, select
// lists or expressions. Those need real name resolution (aliases, CTEs, subqueries, record
// variables), and a regex that guesses at them reports correct code as broken — which is how a
// guard gets ignored. The write half is where this bites and it is the half that can be parsed
// exactly. In practice a function broken this way usually names the column on both sides:
// `auto_archive_crews` below reads `status` in its WHERE and was caught by its SET list.
//
//   node scripts/check-function-columns.mjs           report, exit 1 on any finding
//   node scripts/check-function-columns.mjs --list    also print what was parsed, per function
//
// Exit 0 = every column written by a stored function exists on the table it writes.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const WANT_LIST = process.argv.includes("--list");
const fail = [];

// ── triaged, and a STALE entry fails ─────────────────────────────────────────
// A name here is a claim that the finding is known and deliberately not fixed yet. If the
// function stops having the problem — or stops existing — that claim is stale and this run
// fails, so the list cannot rot into a description of code that is gone. Same standard as
// check:field-renders' KNOWN map and check:zero's NEEDS_EXTRA_STATE.
const KNOWN = {
  // merge_accounts was declared here until 0170 REMOVED the account-linking feature
  // outright. The entry said the RPC must not be repaired without an ownership gate, and
  // that gate was only worth writing if the feature was wanted — it was not: no UI, no
  // caller, 0 rows in account_links, 0 linked profiles. So the liability went instead of
  // being made safe. Same call 0167 made for the two dead crew functions.

  // auto_archive_crews was declared here until 0167 dropped it — see that migration, which
  // records its body verbatim. Nothing referenced it and the app already archives crews
  // client-side with CREW_ARCHIVE_GRACE_DAYS.
};

// ── one round trip: the writing functions, plus every public column ──────────
const SQL = `
select json_build_object(
  'fns', (
    select coalesce(json_agg(json_build_object('name', p.proname, 'body',
             regexp_replace(p.prosrc, '--[^\\n]*', '', 'g'))), '[]')
    from pg_proc p
    join pg_language l on l.oid = p.prolang
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and l.lanname in ('plpgsql','sql')
      and regexp_replace(p.prosrc, '--[^\\n]*', '', 'g') ~* '(insert\\s+into|update\\s+[a-z_]+\\s+set)'
  ),
  'cols', (
    select coalesce(json_agg(table_name || '.' || column_name), '[]')
    from information_schema.columns where table_schema = 'public'
  )
) as cat;`;

const tmp = path.join(process.env.CLAUDE_JOB_DIR || "/tmp", "fn-cols.sql");
fs.writeFileSync(tmp, SQL);
let raw;
try {
  raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp],
    { encoding: "utf8", timeout: 180000 });
} catch (e) {
  // The CLI dumps its whole help block on a bad flag, which buries the one line that matters.
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

let cat;
try {
  const outer = JSON.parse(jm[0]);
  const rows = outer.rows || outer.result || outer;
  const row = Array.isArray(rows) ? rows[0] : rows;
  cat = row.cat || row;
} catch (e) { console.error("FAIL: could not parse the catalog —", e.message); process.exit(1); }

// ── fail closed ──────────────────────────────────────────────────────────────
// Every one of these makes each comparison below pass vacuously, so an empty read must be a
// failure and never a clean bill of health. This guard's realistic failure mode is a FALSE PASS.
const fns = cat.fns || [];
const colList = cat.cols || [];
if (!colList.length) { console.error("FAIL: the schema came back empty — nothing was checked."); process.exit(1); }
if (!fns.length) {
  console.error("FAIL: found NO function that writes anything. This database has at least a dozen;");
  console.error("      an empty set means the scan broke, not that there is nothing to check.");
  process.exit(1);
}

const schema = new Map();
for (const s of colList) {
  const i = s.indexOf(".");
  const t = s.slice(0, i), c = s.slice(i + 1);
  if (!schema.has(t)) schema.set(t, new Set());
  schema.get(t).add(c);
}

// split at top-level commas — a value can itself contain commas inside a call
function topLevel(inner) {
  const out = []; let d = 0, cur = "";
  for (const ch of inner) {
    if ("([".includes(ch)) d++;
    else if (")]".includes(ch)) d--;
    if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const found = new Map();          // function -> [ "table.col", ... ]
const note = [];
let checkedIns = 0, checkedUpd = 0;

for (const f of fns) {
  const body = f.body || "";
  const hit = (t, c) => {
    if (!found.has(f.name)) found.set(f.name, []);
    found.get(f.name).push(`${t}.${c}`);
  };

  // ---- insert into <table> ( col, col, ... )
  const insRe = /insert\s+into\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;
  let m;
  while ((m = insRe.exec(body)) !== null) {
    const table = m[1].toLowerCase();
    const st = insRe.lastIndex - 1;
    let d = 0, end = -1;
    for (let k = st; k < body.length; k++) {
      if (body[k] === "(") d++;
      else if (body[k] === ")") { d--; if (!d) { end = k; break; } }
    }
    if (end < 0) { note.push(`${f.name}: unbalanced parenthesis after "insert into ${table}" — not parsed`); continue; }
    if (!schema.has(table)) { note.push(`${f.name}: inserts into "${table}", which is not a public table — not parsed`); continue; }
    const list = topLevel(body.slice(st + 1, end));
    // Only a bare identifier list is a column list. `insert into t select ...` and
    // `insert into t (…) values` where the paren holds an expression are different shapes.
    if (!list.length || !list.every((x) => /^"?[a-z_][a-z0-9_]*"?$/i.test(x))) {
      note.push(`${f.name}: insert into ${table} is not a bare column list — not parsed`);
      continue;
    }
    checkedIns++;
    for (const rawc of list) {
      const c = rawc.replace(/"/g, "").toLowerCase();
      if (!schema.get(table).has(c)) hit(table, c);
    }
  }

  // ---- update <table> set col = ..., col = ...
  const updRe = /update\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+set\s+([\s\S]*?)(?:\bwhere\b|;)/gi;
  while ((m = updRe.exec(body)) !== null) {
    const table = m[1].toLowerCase();
    if (!schema.has(table)) { note.push(`${f.name}: updates "${table}", which is not a public table — not parsed`); continue; }
    let any = false;
    for (const a of topLevel(m[2])) {
      const lhs = a.match(/^\s*"?([a-z_][a-z0-9_]*)"?\s*=/i);
      if (!lhs) continue;
      any = true;
      const c = lhs[1].toLowerCase();
      if (!schema.get(table).has(c)) hit(table, c);
    }
    if (any) checkedUpd++;
  }
}

if (!checkedIns && !checkedUpd) {
  console.error("FAIL: parsed no insert column list and no update set list at all.");
  console.error("      The write vocabulary broke; a clean result here would be meaningless.");
  process.exit(1);
}

console.log(`check:function-columns — ${fns.length} writing function(s), ` +
            `${checkedIns} insert column list(s), ${checkedUpd} update set list(s)`);
if (WANT_LIST) for (const f of fns) console.log(`   ${f.name}`);

// ── report ───────────────────────────────────────────────────────────────────
for (const [name, cols] of found) {
  const uniq = [...new Set(cols)];
  if (KNOWN[name]) {
    console.log(`\n  known  ${name} writes ${uniq.join(", ")} — ${KNOWN[name]}`);
  } else {
    fail.push(`${name} writes ${uniq.length} column(s) that do not exist: ${uniq.join(", ")}\n` +
      `        plpgsql resolves these when the statement first RUNS, so this function is valid,\n` +
      `        deployed, and will raise on its first call. Check whether a migration dropped the\n` +
      `        column, or whether the live body has drifted from the migration that defines it.`);
  }
}

// a KNOWN entry that no longer describes anything is stale bookkeeping, not a pass
for (const name of Object.keys(KNOWN)) {
  if (!found.has(name)) {
    fail.push(`KNOWN names "${name}", but it writes no missing column any more (or no longer\n` +
      `        exists). Remove the entry — a triage note that outlives its finding hides the next one.`);
  }
}

if (note.length && WANT_LIST) { console.log(""); note.forEach((n) => console.log(`   note  ${n}`)); }
else if (note.length) console.log(`\n${note.length} statement(s) not parsed — run with --list to see them`);

if (fail.length) {
  console.error(`\n${fail.length} failure(s):`);
  fail.forEach((f) => console.error(`\n  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\nok — every column these functions write exists on the table they write it to` +
            `${Object.keys(KNOWN).length ? ` (${Object.keys(KNOWN).length} known, triaged)` : ""}`);

// ── injection cases (re-run after changing any parsing above) ────────────────
//
// The fault lives in the DATABASE, so these are run by hand against a scratch function rather
// than driven by a flag. Create it, run, drop it.
//
// 1. `create function zz_probe() returns void language plpgsql as $$ begin
//     insert into routes (id, nosuchcol) values ('x','y'); end $$;`
//    -> FAIL naming zz_probe and routes.nosuchcol.
// 2. Same but `update routes set nosuchcol = 1 where id='x';` -> FAIL naming it.
// 3. A function writing only REAL columns must PASS — a guard that flags correct code is one
//    people learn to ignore.
// 4. Point the CLI at a database with no such project -> "could not read the live catalog",
//    exit 1. Never a pass. This is the one that matters most: an unreachable database and a
//    clean catalog must not look alike.
// 5. Break the write-vocabulary regex (match `insert onto`) -> "parsed no insert column list
//    and no update set list at all", exit 1, rather than reporting zero findings.
// 6. Remove `auto_archive_crews` from KNOWN -> it reports as a real FAIL (proves the entry is
//    suppressing a genuine finding, not padding).
// 7. Add a bogus name to KNOWN -> reports as STALE, exit 1.
