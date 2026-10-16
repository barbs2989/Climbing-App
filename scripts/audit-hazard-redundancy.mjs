// How often does the KNOWN HAZARDS box say the same thing twice?
//
// It merges three fields — hazards, objHaz, watchOut — and until now compared only the first
// two, by exact string equality. Southwest Rib on South Early Winters Spire printed "runout
// slab" twice character-for-character (objHaz and watchOut were never compared) and a third
// time as "Some slab sections are runout (notably the delicate 5.6+ slab…)".
//
// Read-only. Builds each route's box with knownHazards — the SAME call RouteDetail renders — over
// the columns parsed the way lib/db.js parses them (toWarnArr for watch_out), so what it measures
// is what a climber reads, not what a merge would produce if it were the caller.
//
//   node scripts/audit-hazard-redundancy.mjs [--state wa] [--list 20]
//
// Exits 1 when a printed line is SUBSUMED by another printed line — every significant word of it
// appears in a line beside it. That is the merge's own rule, so a non-zero count is a reader
// defect, not a data one, and it is what this audit missed for six weeks: it ran
// mergeHazards(h, o, w) and counted the lines that call drops, while the box ran TWO merges and
// printed some of those lines anyway — 322 lines on 250 routes, every one reported as removed.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { mergeHazards, knownHazards, toWarnArr } from "../lib/hazards.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 15);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// ANY of the three columns, not `hazards=not.is.null`: obj_haz and watch_out reach the box on
// their own, and 23 rows carry one of them with hazards NULL.
async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,hazards,obj_haz,watch_out` +
    `&or=(hazards.not.is.null,obj_haz.not.is.null,watch_out.not.is.null)` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}
// hazards and obj_haz are arrays or NULL on every row (measured 2026-09-30); db.js's toArr would
// comma-split a string, so refuse one here rather than silently parse it differently.
const arr = (v, id, col) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  throw new Error(`${id}.${col} is a ${typeof v}, not an array — db.js would comma-split it; update this audit`);
};

const t = { rows: 0, rendered: 0, lines: 0, withDup: 0, removed: 0, exact: 0, subsumedRoutes: 0, subsumed: 0 };
const out = [], bad = [];
let after = "";
for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  for (const r of rows) {
    if (STATE && !String(r.id).startsWith(STATE + "_")) continue;
    t.rows++;
    const h = arr(r.hazards, r.id, "hazards"), o = arr(r.obj_haz, r.id, "obj_haz"), w = toWarnArr(r.watch_out);
    const box = knownHazards(h, o, w);
    const shown = [...box.hazards, ...box.watchOut];
    if (shown.length) { t.rendered++; t.lines += shown.length; }
    // The invariant: re-merging what is printed must remove nothing.
    const again = mergeHazards(shown).dropped;
    if (again.length) { t.subsumedRoutes++; t.subsumed += again.length; if (bad.length < LIST) bad.push({ id: r.id, name: r.name, again }); }
    // How much the merge does — every line in the inputs that is not printed.
    const inputs = [...h, ...o, ...w].map(x => String(x).trim()).filter(Boolean);
    const removed = inputs.length - shown.length;
    if (!removed) continue;
    t.withDup++; t.removed += removed;
    const seen = new Set(); let ex = 0;
    inputs.map(x => x.toLowerCase()).forEach(x => { if (seen.has(x)) ex++; else seen.add(x); });
    t.exact += ex;
    if (out.length < LIST) out.push({ id: r.id, name: r.name, dropped: inputs.filter(x => !shown.includes(x)).slice(0, 3) });
  }
  after = rows[rows.length - 1].id;
  if (rows.length < 1000) break;
}

console.log("\n=== hazard redundancy audit ===");
console.log("routes with any hazard column:", t.rows, " rendering a KNOWN HAZARDS box:", t.rendered, " lines printed:", t.lines);
// The merge counts measure a WORKING FEATURE, not a backlog: every line counted is one a climber
// does not see. It is the third audit in this repo whose count reads like a defect list and is
// not — audit:terrain measures suppression the app performs, and audit:waypoint-order's "0" was
// true only of the routes it could order. Ask what a number is the number OF.
console.log("routes where the merge removes something:", t.withDup, "— DEDUPED at render, not defects");
console.log("lines the merge removes:", t.removed, " of which character-for-character duplicates:", t.exact);
if (out.length) {
  console.log("\nexamples of what the merge removes (a climber never sees these twice):");
  for (const o of out) console.log(` ${o.id} — ${o.name}\n     ${o.dropped.map(d => JSON.stringify(d)).join("\n     ")}`);
}
console.log(`\nprinted lines another printed line already says: ${t.subsumed} on ${t.subsumedRoutes} routes (must be 0)`);
for (const b of bad) console.log(` ${b.id} — ${b.name}\n     ${b.again.map(d => JSON.stringify(d)).join("\n     ")}`);
process.exit(t.subsumed ? 1 : 0);
