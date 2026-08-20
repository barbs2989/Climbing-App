// How often does the KNOWN HAZARDS box say the same thing twice?
//
// It merges three fields — hazards, objHaz, watchOut — and until now compared only the first
// two, by exact string equality. Southwest Rib on South Early Winters Spire printed "runout
// slab" twice character-for-character (objHaz and watchOut were never compared) and a third
// time as "Some slab sections are runout (notably the delicate 5.6+ slab…)".
//
// Read-only, report-only. Runs the same lib/hazards.js the screen renders through, so a count
// here is exactly the number of repeated lines a climber no longer sees.
//
//   node scripts/audit-hazard-redundancy.mjs [--state wa] [--list 20]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { mergeHazards } from "../lib/hazards.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 15);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,hazards,obj_haz,watch_out&hazards=not.is.null` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const t = { rows: 0, withDup: 0, lines: 0, exact: 0 };
const out = [];
let after = "";
for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  for (const r of rows) {
    if (STATE && !String(r.id).startsWith(STATE + "_")) continue;
    t.rows++;
    const m = mergeHazards(r.hazards, r.obj_haz, r.watch_out);
    if (!m.dropped.length) continue;
    t.withDup++; t.lines += m.dropped.length;
    // How many were literally the same string, i.e. invisible to the old exact-match rule
    // only because those two fields were never compared?
    const all = [].concat(r.hazards || [], r.obj_haz || [], r.watch_out || []).map(x => String(x).trim().toLowerCase());
    const seen = new Set(); let ex = 0;
    all.forEach(x => { if (seen.has(x)) ex++; else seen.add(x); });
    t.exact += ex;
    if (out.length < LIST) out.push({ id: r.id, name: r.name, dropped: m.dropped.slice(0, 3) });
  }
  after = rows[rows.length - 1].id;
  if (rows.length < 1000) break;
}

console.log("\n=== hazard redundancy audit ===");
// THESE NUMBERS MEASURE A WORKING FEATURE, NOT A BACKLOG, and the wording has to say so.
// `mergeHazards` runs at render time — RouteDetail calls it as
// mergeHazards(route.hazards, _objHaz, route.watchOut) — and drops any line whose token set is
// a subset of one already kept. So every line counted here is one the merge ALREADY removes;
// none of it reaches a climber twice. Read this as how much work the dedupe does.
//
// Verified 2026-08-20 rather than assumed: the three columns really are all passed, and the
// KNOWN HAZARDS box really is the caller. Nothing here is actionable.
//
// It is the third audit in this repo whose count reads like a defect list and is not —
// audit:terrain measures suppression the app performs, and audit:waypoint-order's "0" was true
// only of the routes it could order. When an audit reports a number, ask what it is the number
// OF before treating it as work.
console.log("routes with a hazards list:", t.rows);
console.log("routes where the merge has something to remove:", t.withDup,
  "— these are DEDUPED at render, not defects");
console.log("lines the merge removes:", t.lines, " of which character-for-character duplicates:", t.exact);
if (out.length) {
  console.log("\nexamples of what the merge removes (a climber never sees these twice):");
  for (const o of out) console.log(` ${o.id} — ${o.name}\n     ${o.dropped.map(d => JSON.stringify(d)).join("\n     ")}`);
}
process.exit(0);
