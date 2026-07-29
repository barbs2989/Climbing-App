// Fails the build when lib/db.js reads a table or column the database does not have.
//
// Why this exists: PostgREST does not error on a missing column. `select("*")`
// simply omits it, and a mapper's `toArr(r.gone)` returns []. PR #372 shipped a
// whole Safety-tab feature reading `routes.hazard_tags` after migration 0060 had
// dropped that column — it rendered nothing, raised nothing, and passed CI. The
// only signal was a human noticing an empty panel.
//
// Checked against scripts/schema-snapshot.json (refresh with
// scripts/refresh-schema-snapshot.mjs). Runs offline, so CI needs no credentials.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
const TABLES = snapshot.tables;
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const lineOf = (i) => src.slice(0, i).split("\n").length;
const problems = [];

// Already-known drift, reported loudly every run but not build-breaking, so the
// check can start guarding against NEW drift today.
//
// crews_messages / messages: created by supabase/migrations/0042_crew_and_direct
// _messaging.sql, which has never been applied — both return PGRST205 from the
// live API. Every crew-chat and DM read/write throws, so messaging has never
// persisted; it lives in React state for the session only.
//
// Apply 0042, run scripts/refresh-schema-snapshot.mjs, and delete this list —
// the entries then resolve on their own and any remaining drift fails the build.
const KNOWN_MISSING = new Set(["crews_messages", "messages"]);
const known = [];

// Body of a function, by brace matching from its opening "{".
function bodyOf(name) {
  const m = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(src);
  if (!m) return null;
  let i = m.index + m[0].length - 1, depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return { text: src.slice(i, j + 1), start: i };
  }
  return null;
}

// 1. Row-mapper property reads. `r.foo` inside dbRouteToCamel must be a routes
//    column — or an embedded relation, which is named after the table it joins.
const mapper = bodyOf("dbRouteToCamel");
if (!mapper) problems.push({ line: 0, msg: "dbRouteToCamel not found — checker needs updating" });
else {
  const cols = new Set(TABLES.routes || []);
  const seen = new Set();
  for (const m of mapper.text.matchAll(/\br\??\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const col = m[1];
    if (seen.has(col)) continue;
    seen.add(col);
    if (cols.has(col) || TABLES[col]) continue; // real column, or an embedded relation
    problems.push({ line: lineOf(mapper.start + m.index), msg: `dbRouteToCamel reads r.${col} — no such column on "routes"` });
  }
}

// 2. Table names in .from("x").
for (const m of src.matchAll(/\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)/g)) {
  if (TABLES[m[1]]) continue;
  const entry = { line: lineOf(m.index), msg: `.from("${m[1]}") — no such table` };
  (KNOWN_MISSING.has(m[1]) ? known : problems).push(entry);
}

// 3. Explicit column lists in .select("a,b"), scoped to the nearest preceding
//    .from(). Embedded resources — foo(...) — are stripped and not validated
//    here; they are covered by rule 2 when they name a table.
for (const m of src.matchAll(/\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)\s*\.select\(\s*["'`]([^"'`]*)["'`]/g)) {
  const [, table, list] = m;
  const cols = TABLES[table];
  if (!cols) continue; // already reported by rule 2
  let flat = list;
  for (let guard = 0; guard < 20 && /\(/.test(flat); guard++) {
    flat = flat.replace(/[A-Za-z_][A-Za-z0-9_.:]*\([^()]*\)/g, "");
  }
  for (const raw of flat.split(",")) {
    const tok = raw.trim();
    if (!tok || tok === "*") continue;
    const col = (tok.includes(":") ? tok.split(":").pop() : tok).trim();
    if (!col || col === "*" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) continue;
    if (!cols.includes(col)) problems.push({ line: lineOf(m.index), msg: `.from("${table}").select(...) requests "${col}" — no such column` });
  }
}

if (known.length) {
  console.warn(`\ncheck-schema: ${known.length} KNOWN unapplied-migration reference(s) — tracked, not build-breaking:`);
  for (const p of known.sort((a, b) => a.line - b.line)) console.warn(`  lib/db.js:${p.line}  ${p.msg}`);
  console.warn(`  -> apply supabase/migrations/0042_crew_and_direct_messaging.sql, then refresh the snapshot.\n`);
}
if (problems.length) {
  console.error(`\nSchema drift — lib/db.js references ${problems.length} thing(s) the database does not have:\n`);
  for (const p of problems.sort((a, b) => a.line - b.line)) console.error(`  lib/db.js:${p.line}  ${p.msg}`);
  console.error(`\nSnapshot generated ${snapshot.generatedAt}. If the schema changed on purpose, run:`);
  console.error(`  node scripts/refresh-schema-snapshot.mjs\n`);
  process.exit(1);
}
console.log(`check-schema: ok — lib/db.js matches the ${snapshot.generatedAt} snapshot (${Object.keys(TABLES).length} tables).`);
