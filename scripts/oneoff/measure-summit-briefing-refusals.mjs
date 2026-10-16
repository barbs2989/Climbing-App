// How often does the peak-page briefing REFUSE to name a fact its routes agree on?
//
// `SummitBriefing` (lib/DbAreaBrowser.jsx) prints one Permit / Land manager / Parking line
// "across every route here", and refuses — "Differs by route — check the one you are
// climbing." — unless every stated value is a PREFIX of the longest one once spelling is
// normalised. That refusal is correct where two routes really need different permits
// (Mount Stuart's Teanaway side is outside the Enchantment quota its north side is in) and
// costs the reader a fact everywhere else.
//
// This measures which it is, over the real catalog, by EXECUTING the panel's own
// `normFact`/`sharedFact` rather than a copy — a copy would agree with itself whatever the
// component does, which is the whole question. `ANCHOR LOST` if either moves.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const SRC = fs.readFileSync(new URL("../../lib/DbAreaBrowser.jsx", import.meta.url), "utf8");

// Lift a top-level declaration by balancing braces from its own header.
function lift(header) {
  const i = SRC.indexOf(header);
  if (i < 0) throw new Error(`ANCHOR LOST — "${header}" is not in lib/DbAreaBrowser.jsx`);
  if (SRC.indexOf(header, i + 1) >= 0) throw new Error(`ANCHOR LOST — "${header}" appears more than once`);
  let d = 0, started = false;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === "{") { d++; started = true; }
    else if (c === "}") { d--; if (started && d === 0) return SRC.slice(i, j + 1); }
    else if (!started && c === ";") return SRC.slice(i, j + 1);
  }
  throw new Error(`ANCHOR LOST — "${header}" never closes`);
}

const parts = [lift("const ALIAS = {"), lift("function normFact("), lift("function sharedFact(")];
const { sharedFact } = new Function(parts.join("\n") + "\nreturn { sharedFact };")();

const ALPINE_FAMILY = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];
const accessOf = r => (r.access && typeof r.access === "object") ? r.access : {};
const FACTS = [
  ["Permit", r => r.permit],
  ["Land manager", r => accessOf(r).land_manager || accessOf(r).landManager],
  ["Parking / entrance", r => accessOf(r).parking_pass || accessOf(r).passRequired],
];

const h = headers(requireServiceKey());
async function get(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: h });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Every WA route with the three access-bearing columns, grouped by its own area.
const rows = [];
let last = "";
for (let g = 0; g < 500; g++) {
  const page = await get(`routes?select=id,name,area_id,discipline,permit,access&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000&area_id=like.wa_*`);
  if (!page.length) break;
  rows.push(...page);
  last = page[page.length - 1].id;
  if (page.length < 1000) break;
}
if (rows.length < 1000) { console.error(`FAIL — only ${rows.length} routes read. A short read reports a clean catalog.`); process.exit(1); }

const byArea = new Map();
for (const r of rows) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }

let panels = 0;
const refusals = [];
let agreedCount = 0, absent = 0;
for (const [areaId, rs] of byArea) {
  if (rs.length < 2) continue;
  const family = rs.filter(r => ALPINE_FAMILY.includes(r.discipline));
  if (family.length * 2 < rs.length) continue;   // the panel's own gate
  panels++;
  for (const [label, pick] of FACTS) {
    const f = sharedFact(rs, pick);
    if (!f) { absent++; continue; }
    if (f.agreed) { agreedCount++; continue; }
    const distinct = [...new Set(rs.map(pick).filter(v => v != null && String(v).trim() !== "").map(v => String(v).trim()))];
    refusals.push({ areaId, label, said: f.said, of: f.of, distinct });
  }
}

console.log(`panels that render: ${panels}`);
console.log(`fact rows: agreed ${agreedCount} · refused ${refusals.length} · absent ${absent}`);
const byLabel = {};
for (const x of refusals) byLabel[x.label] = (byLabel[x.label] || 0) + 1;
console.log("refusals by row:", byLabel);

if (process.argv.includes("--list")) {
  for (const x of refusals) {
    console.log(`\n${x.areaId} · ${x.label} · ${x.said} of ${x.of} routes state it`);
    for (const d of x.distinct) console.log("   " + JSON.stringify(d.length > 150 ? d.slice(0, 150) + "…" : d));
  }
}
