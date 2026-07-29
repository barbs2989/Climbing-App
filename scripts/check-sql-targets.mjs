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
  if (stmtTable !== TABLE.toLowerCase()) continue;

  const ids = new Set();
  for (const m of stmt.matchAll(/\bid\s*=\s*'([^']+)'/gi)) ids.add(m[1]);
  const inClause = stmt.match(/\bid\s+in\s*\(([^)]*)\)/i);
  if (inClause) for (const m of inClause[1].matchAll(/'([^']+)'/g)) ids.add(m[1]);

  if (!ids.size) {
    console.warn(`WARN  ${isDelete ? "DELETE" : "UPDATE"} with no literal id predicate — not checkable:\n      ${head}`);
    continue;
  }
  for (const id of ids) targets.push({ kind: isDelete ? "delete" : "update", id, stmt: head });
}

if (!targets.length) {
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
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=in.(${batch})&select=id,name,area_id`,
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
const onlyCopy = [];
for (const t of deletes) {
  const row = found.get(t.id);
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?area_id=eq.${encodeURIComponent(row.area_id)}` +
      `&name=eq.${encodeURIComponent(row.name)}&select=id`,
    { headers: headers(key) }
  );
  const siblings = await r.json();
  if (siblings.length <= 1) onlyCopy.push({ ...t, name: row.name, area: row.area_id });
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
  for (const o of onlyCopy) console.log(`        ${o.id}  ("${o.name}" on ${o.area})`);
  console.log(`      A duplicate flag is a hypothesis. Confirm the twin row exists before deleting either half.\n`);
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
