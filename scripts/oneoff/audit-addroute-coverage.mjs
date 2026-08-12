// audit-addroute-coverage.mjs — READ ONLY.
//
// "The AddRoute form covers roughly 47 of the ~85 columns on `routes`" was an impression
// nobody had grounded. This measures it, and it measures the thing that impression cannot
// express: the form and the APPROVAL are two different sets, and a key the form collects
// that approval drops is a silent data loss, not a coverage gap.
//
// Three sets, each read from the real artifact rather than asserted:
//
//   COLUMNS    the PostgREST OpenAPI document for `routes`. NOT a sample row — a column
//              that is null on every row is invisible to a sample, and six of them are.
//              The OpenAPI root now refuses the anon key ("Secret API key required"), so
//              this one read uses the service key. Nothing here writes.
//   COLLECTED  the `var _prop={...}` literal in AddRoute (ClimbMatchCore.jsx). That object
//              IS the submission — it is what `submitContribution` files as `value`.
//   WRITTEN    the `insert into routes (...) values (...)` inside the LIVE definition of
//              approve_new_route. 0128 redefines the function 0127 introduced, so the
//              script takes the highest-numbered migration that defines it; reading 0127
//              would report `grade_num` as unwritten, which stopped being true.
//
// Pairing COLLECTED to WRITTEN is done by parsing, not by a hand-written map: the insert's
// column list and values list are split on top-level commas and zipped, then each value
// expression is scanned for the `v->>'key'` / `v->'key'` it reads. A hand map would be a
// second copy of the migration that drifts from it.
//
// Readership is grepped in BOTH spellings. dbRouteToCamel spreads `...r` before aliasing,
// so a snake_case column reaches the app under its own name unless it has an alias; a
// one-word column like `landing` needs no alias and a two-word one like `prot_rating` does.
// Checking only one spelling calls live columns dead and dead columns live.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ─────────────────────────────────────────────────────────── 1. the real columns

async function columns() {
  const k = requireServiceKey();
  const res = await fetch(SUPABASE_URL + "/rest/v1/", {
    headers: { apikey: k, Authorization: "Bearer " + k },
  });
  if (!res.ok) throw new Error("OpenAPI read failed: " + res.status + " " + (await res.text()).slice(0, 200));
  const doc = await res.json();
  const defs = doc.definitions || (doc.components && doc.components.schemas);
  const props = defs && defs.routes && defs.routes.properties;
  if (!props) throw new Error("no routes definition in the OpenAPI document");
  const cols = Object.keys(props);
  // Fails closed: a schema that came back nearly empty would make every "not collected"
  // question pass vacuously, which is the failure mode guard-sources.mjs exists to stop.
  if (cols.length < 40) throw new Error(`only ${cols.length} columns came back — the read is wrong, not the schema`);
  return cols;
}

// ──────────────────────────────────────────────────── 2. what the form collects

// Split a comma-separated expression list at DEPTH ZERO only. The migration's values list
// contains `round(x * 0.3048)`, `case when ... end` and a nested `jsonb_build_object(...)`
// with its own commas; a naive split shears them apart and every pairing after the first
// nested call is off by one. Quotes count too — 'a,b' is one token.
function splitTop(src) {
  const out = [];
  let depth = 0, q = null, buf = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      buf += c;
      if (c === q) { if (src[i + 1] === q) { buf += src[++i]; } else q = null; }
      continue;
    }
    if (c === "'" || c === '"') { q = c; buf += c; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    if (c === ")" || c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { out.push(buf.trim()); buf = ""; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function collected() {
  const src = R("ClimbMatchCore.jsx");
  const i = src.indexOf("var _prop={");
  if (i < 0) throw new Error("ANCHOR LOST: `var _prop={` is gone from AddRoute — the submission shape moved");
  // Balance braces over raw source. The blanker used by check:seed-history desynchronises
  // on JSX apostrophes; here we only need one object literal and its own quotes are plain.
  const start = src.indexOf("{", i);
  let depth = 0, end = -1, q = null;
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === q && src[j - 1] !== "\\") q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error("could not balance the _prop literal");
  const body = src.slice(start + 1, end);
  const keys = splitTop(body).map((s) => {
    const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(s);
    return m ? m[1] : null;
  }).filter(Boolean);
  if (keys.length < 20) throw new Error(`only ${keys.length} keys parsed out of _prop — the parse broke`);
  return keys;
}

// ───────────────────────────────────────── 3. what approve_new_route actually writes

// Blank `-- ...` comments, preserving offsets and newlines. This is load-bearing, not
// tidiness: the values list carries a comment reading `NOT the form's "where did you`, and
// that lone apostrophe flips the quote state of any scanner that reads comments as code —
// the parse then runs to the end of the file looking for a closing paren. Doubled `''` is
// SQL's own escape and is consumed as one unit. `$$` is skipped rather than treated as a
// string delimiter: the whole function body is dollar-quoted, so quoting it would blank the
// insert this script exists to read.
function stripSqlComments(src) {
  let out = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      out += c;
      if (c === "'") { if (src[i + 1] === "'") { out += src[++i]; } else q = false; }
      continue;
    }
    if (c === "$" && src[i + 1] === "$") { out += "$$"; i++; continue; }
    if (c === "'") { q = true; out += c; continue; }
    if (c === "-" && src[i + 1] === "-") {
      while (i < src.length && src[i] !== "\n") { out += " "; i++; }
      out += "\n";
      continue;
    }
    out += c;
  }
  return out;
}

function approvalWrites() {
  const dir = path.join(ROOT, "supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"))
    .filter((f) => /create or replace function approve_new_route/i.test(fs.readFileSync(path.join(dir, f), "utf8")))
    .sort();
  if (!files.length) throw new Error("no migration defines approve_new_route");
  // The LAST definition wins in the database; reading an earlier one reports a stale set.
  const file = files[files.length - 1];
  const sql = stripSqlComments(fs.readFileSync(path.join(dir, file), "utf8"));
  const m = /insert\s+into\s+routes\s*\(([\s\S]*?)\)\s*values\s*\(([\s\S]*)/i.exec(sql);
  if (!m) throw new Error("ANCHOR LOST: no `insert into routes (...) values (` in " + file);
  const cols = splitTop(m[1]).map((s) => s.trim());
  // Balance the values list's own parens to find where it ends.
  let depth = 1, end = -1, q = null;
  const vsrc = m[2];
  for (let i = 0; i < vsrc.length; i++) {
    const c = vsrc[i];
    if (q) { if (c === q) { if (vsrc[i + 1] === q) i++; else q = null; } continue; }
    if (c === "'") { q = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error("could not balance the values list in " + file);
  const vals = splitTop(vsrc.slice(0, end));
  if (cols.length !== vals.length) {
    throw new Error(`insert lists disagree in ${file}: ${cols.length} columns vs ${vals.length} values`);
  }
  // column -> the proposal keys its value expression reads (usually 0 or 1).
  const map = new Map();
  cols.forEach((c, i) => {
    const keys = [...vals[i].matchAll(/v\s*->>?\s*'([^']+)'/g)].map((x) => x[1]);
    map.set(c, keys);
  });
  // A key can also be consumed through a local: `nm := btrim(coalesce(v->>'name',''))` and
  // then `nm` appears in the values list, so pairing on the values list ALONE reports `name`
  // as dropped — which is the opposite of true. "Is this key read at all?" is a separate,
  // weaker question than "which column does it land in", and both are needed: the first
  // decides whether the answer is lost, the second where it goes.
  const consumed = new Set([...sql.matchAll(/v\s*->>?\s*'([^']+)'/g)].map((x) => x[1]));
  return { file, cols, map, consumed };
}

// ──────────────────────────────────────────────── 4. does the app read the column?

const APP_FILES = [
  "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => "lib/" + f),
];

const APP_SRC = APP_FILES.map((f) => {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) throw new Error("required app source missing: " + f); // fail closed, per guard-sources.mjs
  return { f, s: fs.readFileSync(p, "utf8") };
});

const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// dbRouteToCamel spreads `...r`, so an un-aliased column arrives under its snake name.
// Both spellings are searched; a hit under either is a read.
//
// MEMBER ACCESS ONLY, and that is the difference between a measurement and a haystack. A
// bare word-boundary search for a short column name matches its own string literals: `rock`
// is also the discipline (`disc==="rock"`, `cat==="rock"`) and scored 10 "reads" that way
// while `route.rock` is what actually renders. Same trap for `landing`, `pads`, `crux`,
// `face`, `access`, `road`, `climate`, `stars`, `descent`. This app reads a route field as
// `route.x` / `r.x`, so `.x` and `["x"]` are the shapes that mean "a route's value is being
// read". Destructuring would be missed; this codebase's dense inline style does not use it
// for route fields (spot-checked against RouteDetail's own reads).
function readsOf(col) {
  const names = new Set([col, camel(col)]);
  const hits = [];
  for (const { f, s } of APP_SRC) {
    for (const n of names) {
      const re = new RegExp("(?:\\.|\\[\")" + n + "(?![\\w$])", "g");
      const c = (s.match(re) || []).length;
      if (c) hits.push({ file: f, name: n, count: c });
    }
  }
  return hits;
}

// A read inside lib/db.js alone is plumbing (the dbRouteToCamel alias line), not a render.
// The ROUTE PAGE is the question this audit is about, so RouteDetail.jsx and
// EnrichmentPanels.jsx (which check:field-renders records as owning whole columns) are
// weighted above everything else; ClimbMatch.jsx / ClimbMatchCore.jsx count as a render
// site but a hit there can also be the SuggestFix allow-list rather than a screen.
const ROUTE_PAGE = new Set(["RouteDetail.jsx", "EnrichmentPanels.jsx"]);
const RENDER_FILES = new Set(["RouteDetail.jsx", "EnrichmentPanels.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx"]);
const rendersIn = (hits) => hits.filter((h) => RENDER_FILES.has(h.file) || /^lib\/(FireNearRoute|DbAreaBrowser|provenance|rappels|waypoints|terrain|grade|hazards|routeTags|disciplines|lists)\./.test(h.file));
const onRoutePage = (hits) => hits.some((h) => ROUTE_PAGE.has(h.file));

// ─────────────────────────────────────────────────────── 5. population in the live DB

async function population(cols) {
  const k = anonKey();
  const out = {};
  for (const c of cols) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/routes?select=id&${encodeURIComponent(c)}=not.is.null`,
      { method: "HEAD", headers: { apikey: k, Authorization: "Bearer " + k, Prefer: "count=exact", Range: "0-0" } }
    );
    const cr = res.headers.get("content-range") || "";
    out[c] = res.ok ? Number((cr.split("/")[1] ?? "0")) : null;
  }
  return out;
}

// ──────────────────────────────────────────────────────────── 6. classification

// Every name here is a decision with a reason, so it is written down rather than inferred
// from a heuristic that would be wrong in both directions.
const ADMIN_OR_SYSTEM = new Set([
  "id", "area_id", "source", "verif", "auto_generated", "sort_order", "corrections",
  "gps_contributor_name", "lists", "classic", "data_quality", "gear_confidence",
]);
const DERIVED = new Set([
  "grade_num",        // computed by gradeNumFor() and passed into the RPC — never typed
  "grade_system",     // implied by the grade string
  "disciplines",      // plural mirror of `discipline`
  "gpx", "elev_pts", "waypoints",  // uploaded/traced, not typed into a text field
  "crowds", "partner_requirements", "seasonal_guidance", "seasonal_hazards",  // enrichment blocks
  "difficulty", "gear_bucket", "assumed_gear", "outing_shape",
  "rack",             // dbRouteToCamel falls back to `gear`; there is no separate rack input
  "high_point_ft",    // area elevation + route
]);

// ─────────────────────────────────────────────────────────────────────── report

const pad = (s, n) => String(s).padEnd(n);

// Collected keys the approval drops ON PURPOSE, each with the reason. Anything NOT here is
// an unexplained drop and is reported as a finding. `source` is the subtle one: the form's
// `source` is "where did you learn this" (srcType) while `routes.source` is DATA PROVENANCE
// (openbeta / a state import). They share a name and mean different things, so a
// name-matching audit calls this a lost field when writing it would be corruption.
const DELIBERATE_DROP = {
  source:     "form's 'where did you learn this' — routes.source is pipeline provenance; writing it would corrupt the column (0127 says so explicitly)",
  sourceNote: "free-text note about that answer; submission metadata, no column and should not have one",
  areaName:   "already carried by contributions.area_id, which the approval reads as c.area_id",
  climbed:    "'have you climbed it' — a claim about the SUBMITTER, not the route",
  photoCount: "count of attached photos; the 4000-char cap means photos are counted, never embedded",
  rockStyle:  "trad/sport/bouldering sub-discipline — genuinely has no column (it is folded into `discipline`)",
};

const cols = await columns();
const form = collected();
const { file: mig, cols: written, map: colToKeys, consumed } = approvalWrites();

console.log("=".repeat(78));
console.log("AddRoute coverage — measured " + new Date().toISOString().slice(0, 10));
console.log("=".repeat(78));
console.log(`  routes columns (OpenAPI)      : ${cols.length}`);
console.log(`  keys collected by AddRoute    : ${form.length}   (var _prop in ClimbMatchCore.jsx)`);
console.log(`  columns written on approval   : ${written.length}   (${mig})`);

// Which collected keys does the approval read at all?
const keyToCol = new Map();
for (const [c, keys] of colToKeys) for (const k of keys) keyToCol.set(k, c);
const landed = form.filter((k) => consumed.has(k));
const dropped = form.filter((k) => !consumed.has(k));

console.log(`  collected keys that land      : ${landed.length}`);
console.log(`  collected keys DROPPED        : ${dropped.length}`);

const pop = await population(cols);
const colSet = new Set(cols);
const snake = (k) => k.replace(/([A-Z])/g, "_$1").toLowerCase();

console.log("\n" + "-".repeat(78));
console.log("COLLECTED BUT DROPPED ON APPROVAL");
console.log("-".repeat(78));
console.log("A column exists for it  =>  the climber's answer is thrown away into verif.proposal");
console.log("and the column stays null. No other writer exists: `routes` has no client");
console.log("INSERT/UPDATE policy, so approve_new_route is the ONLY thing that can fill it.\n");
const findings = [];
for (const k of dropped) {
  const col = [k, snake(k)].find((c) => colSet.has(c));
  const why = DELIBERATE_DROP[k];
  if (why && !(col && !["source"].includes(k))) {
    console.log(`     ${pad(k, 12)} deliberate — ${why}`);
    continue;
  }
  if (!col) { console.log(`     ${pad(k, 12)} no column anywhere (kept only in verif.proposal)`); continue; }
  const hits = readsOf(col);
  const rend = [...new Set(rendersIn(hits).map((h) => h.file))];
  findings.push({ key: k, col, pop: pop[col], rend, routePage: onRoutePage(hits) });
  console.log(`  ** ${pad(k, 12)} -> routes.${pad(col, 12)} EXISTS · ${pad(pop[col], 7)} rows populated · ` +
    (rend.length ? "RENDERS in " + rend.join(", ") : "renders nowhere"));
}
console.log(`\n  ${findings.length} dropped key(s) have a real column, and the column is unexplained-empty.`);

// ── classification of every column NOT written by the approval
console.log("\n" + "-".repeat(78));
console.log("CLASSIFICATION OF COLUMNS NOT WRITTEN ON APPROVAL");
console.log("-".repeat(78));
const notWritten = cols.filter((c) => !written.includes(c));
const buckets = { CONTRIBUTOR_CAN_SUPPLY: [], DERIVED: [], ADMIN_OR_SYSTEM: [], UNUSED_OR_DEAD: [] };
for (const c of notWritten) {
  const hits = readsOf(c);
  const rend = rendersIn(hits);
  const row = { col: c, pop: pop[c], hits: hits.reduce((a, h) => a + h.count, 0), rend: [...new Set(rend.map((h) => h.file))], routePage: onRoutePage(hits) };
  // "Nothing reads it" is MEASURED, so it is asked first; the other three buckets are
  // judgements, and a judgement must not hide a column that no code touches at all.
  if (row.hits === 0) buckets.UNUSED_OR_DEAD.push(row);
  else if (ADMIN_OR_SYSTEM.has(c)) buckets.ADMIN_OR_SYSTEM.push(row);
  else if (DERIVED.has(c)) buckets.DERIVED.push(row);
  else buckets.CONTRIBUTOR_CAN_SUPPLY.push(row);
}
for (const [name, rows] of Object.entries(buckets)) {
  console.log(`\n${name} — ${rows.length}`);
  for (const r of rows) {
    console.log(`    ${pad(r.col, 22)} pop=${pad(r.pop, 7)} reads=${pad(r.hits, 4)} ${r.routePage ? "[ROUTE PAGE] " : "             "}${r.rend.length ? r.rend.join(",") : "NO RENDER SITE"}`);
  }
}

// ── ranked shortlist: contributor-suppliable, ranked by whether it reaches the route page
console.log("\n" + "-".repeat(78));
console.log("RANKED — contributor-suppliable, by visible gain on the ROUTE PAGE");
console.log("-".repeat(78));
console.log("A field that renders nowhere is worth much less, so the route page dominates the");
console.log("score. `pop` is context, not rank: a column populated on 1,000 enriched routes is");
console.log("proof the section EXISTS and has somewhere to put a climber's answer.\n");
const ranked = buckets.CONTRIBUTOR_CAN_SUPPLY
  .map((r) => ({ ...r, score: (r.routePage ? 1000 : 0) + r.rend.length * 20 + Math.min(r.hits, 30) + (r.pop > 500 ? 10 : 0) }))
  .sort((a, b) => b.score - a.score);
ranked.forEach((r, i) => {
  console.log(`  ${pad(i + 1, 3)} ${pad(r.col, 22)} score=${pad(r.score, 5)} pop=${pad(r.pop, 7)} ${r.routePage ? "ROUTE PAGE · " : ""}${r.rend.join(",") || "renders nowhere"}`);
});

// Columns nothing reads, across the WHOLE table — including ones the approval does write.
// Asked separately because a written-but-unread column is dead weight in the insert.
const deadAnywhere = cols.filter((c) => readsOf(c).length === 0);
console.log("\n" + "-".repeat(78));
console.log(`COLUMNS NO APP FILE READS (all ${cols.length}, written or not) — ${deadAnywhere.length}`);
console.log("-".repeat(78));
for (const c of deadAnywhere) console.log(`    ${pad(c, 22)} pop=${pad(pop[c], 7)} ${written.includes(c) ? "(written by approval)" : ""}`);

console.log("\n" + "=".repeat(78));
console.log(`totals: ${cols.length} columns | ${form.length} collected | ${written.length} written | ` +
  `${findings.length} collected-but-dropped WITH a column | ${deadAnywhere.length} read by nothing`);
console.log("=".repeat(78));
