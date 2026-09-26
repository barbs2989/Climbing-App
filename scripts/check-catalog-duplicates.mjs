// check:catalog-duplicates — can the catalog gain a duplicate route again, and has it?
//
// 2026-09-25: import-mp-grades --create-areas filed Mountain Project's `North Cascades › Mt. Baker`
// beside our `Bellingham and Mt Baker Hwy › Mount Baker` — ~225 copy areas across 27 states,
// cleaned up by 0213/0215/0217. The user: "make sure the duplicate routes don't happen again".
// The database now refuses them (0216 on INSERT, 0218 on a move or rename). This guard asks the
// two questions that refusal cannot answer about itself:
//
//   1. IS THE REFUSAL STILL THERE? Both triggers exist, are enabled, and fire on INSERT and UPDATE.
//      A later migration that drops or re-creates them INSERT-only would pass every other gate.
//   2. DID ONE GET PAST IT? Two routes in ONE area with the same catalog_key (0214: "Mt." =
//      "Mount", punctuation and "The" ignored), placeholders ("Unknown", "Project") excluded.
//      Routes carry no created_at, so "new since the trigger" cannot be read off a date: the
//      groups that existed on 2026-09-25 are LISTED in scripts/data/catalog-duplicates-baseline.json,
//      and any group — or any extra row in a listed group — that is not on it fails. A LIST, not
//      a count: a count stays level when one duplicate is fixed and another lands.
//
// catalog_key is recomputed HERE in JS: in SQL it costs past the gateway's ~100 s over 211k
// routes (measured: 57014, then a 524). lib/search.js searchCanon is the same table as SQL
// search_canon — check:search-norm pins that — and the stoplist below is 0214's.
//
// What it cannot see: a duplicate filed under a DIFFERENT area (MP's copy area beside ours) —
// that is the trigger's 5 km / 0.3 km neighbourhood test, which a whole-catalog pairwise scan
// cannot afford here. The trigger check (1) is what covers that shape.
//
//   npm run check:catalog-duplicates                     report; exit 1 on a new duplicate or a missing trigger
//   npm run check:catalog-duplicates -- --rows-only       half 2 only — what the daily workflow runs (anon key, no DB link)
//   npm run check:catalog-duplicates -- --write-baseline  re-list today's groups (only after FIXING some)
//
// Credentials: routes are read with the anon key; the trigger check goes through
// `supabase db query --linked`, so a worktree needs supabase/.temp symlinked (supabase-scripts.md).

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { selectAll } from "./lib/supabase-env.mjs";
import { searchCanon } from "../lib/search.js";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const BASELINE = path.join(ROOT, "scripts/data/catalog-duplicates-baseline.json");
const WRITE = process.argv.includes("--write-baseline");
const ROWS_ONLY = process.argv.includes("--rows-only");   // CI: no management token, so half 2 only
const fails = [];

// ── 1. the triggers ──
if (!ROWS_ONLY) {
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "catdup-")), "q.sql");
fs.writeFileSync(tmp, `select tgname, tgenabled::text en, (tgtype & 4) > 0 ins, (tgtype & 16) > 0 upd, (tgtype & 2) > 0 before
  from pg_trigger where tgname in ('trg_refuse_duplicate_area', 'trg_refuse_duplicate_route') and not tgisinternal;`);
let trig;
try {
  const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", tmp], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  trig = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
  if (!Array.isArray(trig)) throw new Error(raw.slice(0, 300));
} catch (e) {
  console.error(`check:catalog-duplicates: could not read the live triggers — ${String(e.message).slice(0, 300)}
  In a worktree, symlink supabase/.temp from the main checkout (docs/codebase/supabase-scripts.md).`);
  process.exit(2);
}
for (const [name, table] of [["trg_refuse_duplicate_area", "areas"], ["trg_refuse_duplicate_route", "routes"]]) {
  const t = trig.find(x => x.tgname === name);
  if (!t) { fails.push(`${name} is MISSING on ${table} — nothing stops a duplicate (0216/0218)`); continue; }
  if (t.en === "D") fails.push(`${name} is DISABLED`);
  if (!t.before) fails.push(`${name} is not BEFORE — it cannot refuse the row`);
  if (!t.ins) fails.push(`${name} does not fire on INSERT`);
  if (!t.upd) fails.push(`${name} does not fire on UPDATE — a move or rename can make a duplicate (apply 0218)`);
}
}

// ── 2. same-area duplicates ──
const STOP = new Set(["the", "mount", "mountain", "mountains", "peak", "peaks", "area", "areas",
  "climbing", "climbs", "crag", "crags", "ice", "route", "via", "and", "of"]);          // 0214 catalog_key
const catalogKey = n => { const c = searchCanon(n); return c.split(" ").filter(w => w && !STOP.has(w)).join(" ") || c; };
const QUAL = "(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v\\d+|5\\.\\d+[a-d]?|\\d+)";
const PLACEHOLDER = [/^_?delete$/, new RegExp(`^un-?named(\\s+${QUAL})?$`), new RegExp(`^unknown(\\s+${QUAL})?$`),
  /^(open|closed) project$/, /^(project|route|no name|nameless|tbd|n\/?a)$/, /^v\d+[+-]?$/];            // 0065
const isPlaceholder = n => { const t = String(n ?? "").trim(); return !t || !/\p{L}/u.test(t) || PLACEHOLDER.some(r => r.test(t.toLowerCase())); };

await selectAll("routes", "id", "id=eq.__warmup_no_such_route__", { pageSize: 1 });   // cold start: see check-area-counts.mjs
const routes = await selectAll("routes", "id,area_id,name", "", { pageSize: 1000 });
if (routes.length < 100000) { console.error(`check:catalog-duplicates: read only ${routes.length} routes — an empty read is not a clean catalog`); process.exit(2); }
const groups = new Map();
for (const r of routes) {
  if (isPlaceholder(r.name)) continue;
  const k = catalogKey(r.name); if (!k) continue;
  const g = `${r.area_id}|${k}`;
  (groups.get(g) || groups.set(g, []).get(g)).push(r.id);
}
const dups = Object.fromEntries([...groups].filter(([, ids]) => ids.length > 1).map(([g, ids]) => [g, ids.sort()]).sort());

if (WRITE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify({ written: new Date().toISOString().slice(0, 10), groups: dups }, null, 1) + "\n");
  console.log(`wrote ${Object.keys(dups).length} pre-existing duplicate groups to ${path.relative(ROOT, BASELINE)}`);
} else {
  const base = JSON.parse(fs.readFileSync(BASELINE, "utf8")).groups;
  let fixed = 0;
  for (const [g, ids] of Object.entries(dups)) {
    const known = new Set(base[g] || []);
    const extra = ids.filter(id => !known.has(id));
    if (!base[g] || extra.length) fails.push(`NEW duplicate in ${g.split("|")[0]} ("${g.split("|")[1]}"): ${ids.join(", ")}${base[g] ? ` — new: ${extra.join(", ")}` : ""}`);
  }
  for (const g of Object.keys(base)) if (!dups[g]) fixed++;
  console.log(`routes=${routes.length}  duplicate groups=${Object.keys(dups).length}  (baseline ${Object.keys(base).length}, ${fixed} since fixed)`);
}

if (fails.length) {
  console.error(`\ncheck:catalog-duplicates FAILED:\n${fails.map(f => "  - " + f).join("\n")}`);
  console.error(`\nA new duplicate: merge it into the existing row (0213 is the pattern), never add it to the baseline.`);
  process.exit(1);
}
console.log(`check:catalog-duplicates: ok — ${ROWS_ONLY ? "(triggers NOT checked: --rows-only) " : "both triggers refuse on INSERT and UPDATE; "}no duplicate route beyond the ${WRITE ? "just-written" : "listed"} pre-trigger groups.`);
