// Pre-flight a hand-written .sql file before it is pasted into the Supabase SQL Editor.
//
// `patchRow` already makes a *script* write fail loudly on a wrong id. But structural
// changes in this project are handed to the user as copy-paste SQL, and that path has
// no guard at all: the SQL Editor reports **success** for an UPDATE or DELETE that
// matched zero rows. "Success" means the statement parsed, not that anything changed.
//
// On 2026-07-28 five fixes were reported applied that had matched nothing, because
// their ids were composed from route display names rather than looked up:
//   wa_burgundy_spire_action_potential  (real id: wa_action_potential)
//   wa_alpine_lookout_round_mountain    (real id ends _trail)
//   wa_mount_thomson_east_ridge         (no such route in the table)
//   wa_unicorn_peak_classic_route       (real row: wa_unicorn_peak_r1)
//   wa_dragontail_peak_r4               (did not exist live)
//
// That last one caused data loss. r4 and wa_dragontail_peak_triple_couloirs were
// flagged as a duplicate pair, so the plan was "keep r4, delete triple_couloirs".
// r4 was not in the live DB, so triple_couloirs was the ONLY copy — the delete
// removed Triple Couloirs, an ultra-classic Dragontail north face route, entirely.
//
// This script catches all of the above before the paste:
//   - every id an UPDATE/DELETE targets that does not exist  (silent no-op)
//   - every DELETE that removes the last row with that name on its peak (only copy)
//   - statements or files large enough to be truncated on paste
//
// Read-only. Exits non-zero if anything would be a no-op or destroy an only copy.
//
// Usage:
//   node scripts/check-sql-targets.mjs path/to/fix.sql
//   node scripts/check-sql-targets.mjs --table routes fix.sql
//   cat fix.sql | node scripts/check-sql-targets.mjs -

import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const TABLE = arg("--table", "routes");
// Which column scopes a row to its parent. `routes` hang off an area; `areas` hang off
// another area. This was hardcoded to area_id, so `--table areas` asked PostgREST for
// areas.area_id and died with 42703 — the areas mode had never once worked, while the
// default silently reported "nothing to check" on an areas file. Structural area edits
// are handed over as copy-paste SQL routinely, so both halves mattered.
const SCOPE_COL = TABLE.toLowerCase() === "areas" ? "parent_id" : "area_id";
const skippedTables = new Set();
const file = argv.filter(a => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--table")[0];

if (!file) {
  console.error("usage: node scripts/check-sql-targets.mjs <file.sql|->");
  process.exit(2);
}
const sql = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");

// A paste that exceeds this has been observed to truncate silently in the SQL Editor;
// a 9.6KB file with one 7KB single-line INSERT ran as nothing on 2026-07-29.
const PASTE_LIMIT = 4000;
const LINE_LIMIT = 2000;

// Strip comments so ids mentioned in prose are not treated as write targets.
const code = sql
  .split("\n")
  .map(l => (l.trim().startsWith("--") ? "" : l.replace(/--.*$/, "")))
  .join("\n");

// Split on semicolons at statement level. Good enough: these files are generated
// UPDATE/DELETE/INSERT lists, not procedural SQL with embedded blocks.
const statements = code.split(";").map(s => s.trim()).filter(Boolean);

// Remove parenthesised SELECT groups, innermost first, so ids inside a guard or a
// scalar subquery are not mistaken for the statement's own write targets. Only groups
// containing `select` are dropped — an ordinary `id in ('a','b')` list is preserved.
function stripSubqueries(sql) {
  let out = sql, prev;
  do {
    prev = out;
    out = out.replace(/\(([^()]*)\)/gi, (whole, inner) => (/\bselect\b/i.test(inner) ? " " : whole));
  } while (out !== prev);
  return out;
}

const targets = []; // { kind, id, stmt }
for (const stmt of statements) {
  const head = stmt.slice(0, 220).replace(/\s+/g, " ");
  const isDelete = /^\s*delete\s+from/i.test(stmt);
  const isUpdate = /^\s*update\s/i.test(stmt);
  if (!isDelete && !isUpdate) continue;

  // Read the table this statement actually writes to, rather than testing whether
  // TABLE appears anywhere in it. A mere mention matches subqueries: every dedup file
  // in research/ ends with
  //     update areas a set route_count = (select count(*) from routes r where ...)
  // which mentions `routes`, so the loose test let it through and then checked the AREA
  // ids against the routes table — reporting three confident failures for rows that were
  // never routes. A guard that cries wolf is a guard people stop reading.
  const tableMatch = stmt.match(/^\s*(?:delete\s+from|update)\s+([a-z_][a-z0-9_]*)/i);
  const stmtTable = tableMatch ? tableMatch[1].toLowerCase() : null;
  // Remember what this file actually writes to. Skipping quietly is right for one
  // statement, but a file that touches ONLY other tables must not end on "nothing to
  // check" — that reads exactly like "checked, all good". See the report below.
  if (stmtTable) skippedTables.add(stmtTable);
  if (stmtTable !== TABLE.toLowerCase()) continue;

  // Ids inside a subquery are not what this statement writes to. The safest form of
  // DELETE names its twin in an EXISTS guard —
  //     delete from routes where id = 'stray'
  //       and exists (select 1 from routes k where k.id = 'keeper' and k.dist_km is not null)
  // — and reading ids out of the whole statement counted 'keeper' as a deletion target,
  // so the only-copy check fired on a row that was never being deleted. That failed the
  // guarded delete and passed the unguarded one, which is exactly backwards. Same class
  // as the table-name bug above: a mention is not a write.
  const scrubbed = stripSubqueries(stmt);

  const ids = new Set();
  for (const m of scrubbed.matchAll(/\bid\s*=\s*'([^']+)'/gi)) ids.add(m[1]);
  const inClause = scrubbed.match(/\bid\s+in\s*\(([^)]*)\)/i);
  if (inClause) for (const m of inClause[1].matchAll(/'([^']+)'/g)) ids.add(m[1]);

  if (!ids.size) {
    console.warn(`WARN  ${isDelete ? "DELETE" : "UPDATE"} with no literal id predicate — not checkable:\n      ${head}`);
    continue;
  }
  // `full` keeps the untruncated statement so the only-copy check can tell whether a
  // cross-area DELETE names its twin in an EXISTS guard. `stmt` stays the short form
  // used for reporting.
  for (const id of ids) targets.push({ kind: isDelete ? "delete" : "update", id, stmt: head, full: stmt });
}

if (!targets.length) {
  // The file DOES write, just not to the table we were pointed at. Saying "nothing to
  // check" here is indistinguishable from "checked, all good" — which is how the Middle
  // Peak areas fix went to the user unchecked. Fail closed and name the flag to use.
  const others = [...skippedTables].filter(t => t !== TABLE.toLowerCase());
  if (others.length) {
    console.error(`\ncheck:sql FAILED — this file writes to ${others.map(t => `\`${t}\``).join(", ")}, but it was checked against \`${TABLE}\`.`);
    console.error(`Nothing was verified. Re-run naming the table you are actually writing:`);
    for (const t of others) console.error(`  node scripts/check-sql-targets.mjs --table ${t} ${file === "-" ? "-" : file}`);
    process.exit(1);
  }
  console.log("no UPDATE/DELETE statements with literal ids found — nothing to check");
  process.exit(0);
}

const key = anonKey();
const uniq = [...new Set(targets.map(t => t.id))];

async function fetchRows(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).map(x => `"${x}"`).join(",");
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=in.(${batch})&select=id,name,${SCOPE_COL}`,
      { headers: headers(key) }
    );
    if (!r.ok) { console.error(`query failed: ${r.status} ${await r.text()}`); process.exit(2); }
    out.push(...(await r.json()));
  }
  return out;
}

const rows = await fetchRows(uniq);
const found = new Map(rows.map(r => [r.id, r]));

const missing = targets.filter(t => !found.has(t.id));
const deletes = targets.filter(t => t.kind === "delete" && found.has(t.id));

// For each DELETE, is this the last row carrying that name on that peak?
//
// "Last copy on this peak" is a proxy, and it is wrong for a cross-area dedup: when a
// route is stranded under a bogus area, its twin is by definition on a DIFFERENT area,
// so the proxy fails every such delete no matter how safe. A rule that cannot be
// satisfied is a rule people route around.
//
// So the twin is looked for by name anywhere, and the three cases are separated:
//   - a same-area sibling exists            -> fine, nothing to prove
//   - no row of that name exists anywhere   -> FAIL. This is the Triple Couloirs case.
//   - the twin is on another area           -> allowed ONLY if this DELETE names that
//                                              twin's id in an EXISTS guard, so the
//                                              statement removes 0 rows if the twin
//                                              vanished between writing and running.
const onlyCopy = [], crossArea = [];
for (const t of deletes) {
  const row = found.get(t.id);
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?name=eq.${encodeURIComponent(row.name)}&select=id,${SCOPE_COL}`,
    { headers: headers(key) }
  );
  const sameName = await r.json();
  const sameArea = sameName.filter(s => s[SCOPE_COL] === row[SCOPE_COL]);
  if (sameArea.length > 1) continue;

  const elsewhere = sameName.filter(s => s.id !== t.id);
  if (!elsewhere.length) { onlyCopy.push({ ...t, name: row.name, area: row[SCOPE_COL] }); continue; }

  // Names like "East Face" are shared by 90+ routes catalog-wide, so "a row with this
  // name exists somewhere" proves nothing. What counts is the specific twin the author
  // asserts in the guard — that is the claim being made, and it is checked against the
  // live row set rather than taken on trust.
  const asserted = elsewhere.filter(s => new RegExp(`'${s.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`).test(t.full));
  if (asserted.length) crossArea.push({ ...t, name: row.name, area: row[SCOPE_COL], twin: asserted.map(s => `${s.id} (${s[SCOPE_COL]})`).join(", ") });
  else onlyCopy.push({ ...t, name: row.name, area: row[SCOPE_COL],
    hint: `${elsewhere.length} other row(s) share this name, but none is named in this statement — put the intended twin's id in an EXISTS guard` });
}

// Paste-size checks
const oversizeStmt = statements.filter(s => s.length > LINE_LIMIT);
const longLines = code.split("\n").filter(l => l.length > LINE_LIMIT);

let bad = false;
console.log(`checked ${targets.length} write target(s) across ${statements.length} statement(s) in ${file}\n`);

if (missing.length) {
  bad = true;
  console.log(`FAIL  ${missing.length} target id(s) do not exist — these statements would report success and change nothing:`);
  for (const m of missing) console.log(`        ${m.kind.toUpperCase().padEnd(6)} ${m.id}`);
  console.log(`      Resolve real ids by querying (name=ilike.*x*) — never compose an id from a route's display name.\n`);
}

if (onlyCopy.length) {
  bad = true;
  console.log(`FAIL  ${onlyCopy.length} DELETE(s) would remove the ONLY row with that name on its peak:`);
  for (const o of onlyCopy) console.log(`        ${o.id}  ("${o.name}" on ${o.area})${o.hint ? `\n          ${o.hint}` : ""}`);
  console.log(`      A duplicate flag is a hypothesis. Confirm the twin row exists before deleting either half.\n`);
}

if (crossArea.length) {
  console.log(`INFO  ${crossArea.length} cross-area DELETE(s) — twin is on another area and IS named in an EXISTS guard:`);
  for (const c of crossArea) console.log(`        ${c.id}  ("${c.name}" on ${c.area})  twin: ${c.twin}`);
  console.log(`      Allowed: the guard makes each statement a no-op if its twin is gone at run time.\n`);
}

if (sql.length > PASTE_LIMIT || oversizeStmt.length || longLines.length) {
  console.log(`WARN  paste-size risk — the SQL Editor has silently truncated large pastes:`);
  if (sql.length > PASTE_LIMIT) console.log(`        file is ${sql.length} bytes (soft limit ${PASTE_LIMIT})`);
  if (oversizeStmt.length) console.log(`        ${oversizeStmt.length} statement(s) exceed ${LINE_LIMIT} bytes`);
  if (longLines.length) console.log(`        ${longLines.length} physical line(s) exceed ${LINE_LIMIT} chars`);
  console.log(`      Split into ~1.5KB chunks and verify each before sending the next.\n`);
}

if (!bad) console.log("OK    every target id exists; no DELETE removes an only copy");
process.exit(bad ? 1 : 0);
