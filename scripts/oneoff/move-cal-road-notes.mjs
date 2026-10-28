// Road and closure sentences out of the Trip plan's note, into the road block (owner note 2026-10-28).
//
// `itinerary.cal` began as the plan's calibration caveat and, on researched rows, filled up with the
// ROAD'S season: Mount Logan's read "Highway 20 access to the Easy Pass Trailhead is seasonal… the
// trailhead sits inside the MP134-171 winter closure zone", drawn between Trip plan's chips and its day
// cards while GETTING THERE carried the same closure as its Road status. Of 502 rows with a note, 158
// mention a road, gate or closure (all 158 have a road block). Each was read sentence by sentence
// (the plan files beside this script): a road sentence that adds a fact is appended to
// road.seasonalGate, a trail or camp closure to access.closures, one the road block already states is
// dropped, and everything else (permits, season, snow on the route) stays in `cal`.
//
// Where a note CONTRADICTED the road block the old sentence is dropped, not appended: the road blocks
// were each checked online in the 2026-10-28 GETTING THERE accuracy pass (#2861/#2863/#2864), so they
// are the newer record (OVERRIDE below).
//
// Paced (1.2 s a write), re-read after each, before-file kept for --rollback.
//   node scripts/oneoff/move-cal-road-notes.mjs [--write | --rollback]
import fs from "node:fs";
import { SUPABASE_URL, headers, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const PLAN = new URL("./move-cal-road-notes.plan.json", import.meta.url);
const BEFORE = new URL("./move-cal-road-notes.before.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OVERRIDE = {
  // appended text contradicted the checked road block; drop instead
  wa_mount_daniel_daniel_glacier: "drop-gate",
  wa_sherpa_peak_west_ridge: "drop-gate",
};

async function readRow(id) {
  for (let t = 0; ; t++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,itinerary,road,access`, { headers: headers(key) });
    if (r.ok) { const j = await r.json(); if (j.length !== 1) throw new Error(id + ": " + j.length + " rows"); return j[0]; }
    if (t >= 3) throw new Error(id + " read " + r.status);
    console.log("read", r.status, "— backing off 60s"); await sleep(60000);
  }
}

if (process.argv.includes("--rollback")) {
  for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(BEFORE, "utf8")))) { await patchRow("routes", id, v); await sleep(1200); }
  console.log("rolled back"); process.exit(0);
}

const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
const join = (a, b) => { a = (a || "").trim(); b = (b || "").trim(); if (!b) return a || null; if (!a) return b; return a + (/[.!?]$/.test(a) ? " " : ". ") + b; };
const write = process.argv.includes("--write");
const before = fs.existsSync(BEFORE) ? JSON.parse(fs.readFileSync(BEFORE, "utf8")) : {};
let changed = 0, skipped = 0, bad = 0;
for (const p of plan) {
  if (!p.gateAppend && !p.closuresAppend && !p.dropped) continue;
  const row = await readRow(p.id);
  const it = row.itinerary || {};
  if (typeof it.cal !== "string" || it.cal.trim() !== p.orig.trim()) { console.log("SKIP (cal changed since read):", p.id); skipped++; continue; }
  const ov = OVERRIDE[p.id];
  const nextIt = { ...it }; if (p.cal && p.cal.trim()) nextIt.cal = p.cal.trim(); else delete nextIt.cal;
  const body = { itinerary: nextIt };
  if (p.gateAppend && ov !== "drop-gate") body.road = { ...(row.road || {}), seasonalGate: join(row.road && row.road.seasonalGate, p.gateAppend) };
  if (p.closuresAppend) body.access = { ...(row.access || {}), closures: join(row.access && row.access.closures, p.closuresAppend) };
  console.log(p.id, "| cal:", (p.cal || "").slice(0, 70), "| +gate:", ov === "drop-gate" ? "(dropped: contradicts road)" : (p.gateAppend || "").slice(0, 70), "| +closures:", (p.closuresAppend || "").slice(0, 50));
  if (!write) continue;
  if (!before[p.id]) { before[p.id] = { itinerary: row.itinerary, ...(body.road ? { road: row.road } : {}), ...(body.access ? { access: row.access } : {}) }; fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1)); }
  await patchRow("routes", p.id, body);
  const after = await readRow(p.id);
  for (const k of Object.keys(body)) if (JSON.stringify(after[k]) !== JSON.stringify(body[k])) { bad++; console.log("RE-READ MISMATCH", p.id, k); }
  changed++;
  await sleep(1200);
}
console.log(`${write ? "written" : "would write"} ${write ? changed : plan.filter((p) => p.gateAppend || p.closuresAppend || p.dropped).length}, skipped ${skipped}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
