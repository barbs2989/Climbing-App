// Batch 2 of the WA multi-approach worklist: the routes the first research pass marked
// MULTI_TRAILHEAD with medium/low confidence (re-researched), and the routes it never reached
// (flagged but unresearched, or on a peak whose own routes start from trailheads ≥3 km apart).
//
// Reads the re-research verdicts in ./link-multi-approach-batch2.plan.json — one entry per route,
// MULTI | SINGLE | UNSURE; only MULTI is written. Same shape and rules as batch 1
// (link-multi-approach-batch1.mjs + multi-approach-batch1-camps.mjs), in one pass:
//   - each way in other than the one the row describes gets a `trip` (trailhead + coordinate when
//     a page or the catalog states one; one-way distance and gain only where a page states them);
//   - the way the row describes is marked `storedRow` when it is not the most used, and keeps only
//     its own camps (`camps`); every camp goes with every way in that uses it;
//   - text written for climbers is checked for URLs and source names before anything is sent.
//
//   node scripts/oneoff/link-multi-approach-batch2.mjs [--write | --rollback]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

// `--batch batch3` runs a later plan (./link-multi-approach-batch3.plan.json) through the same rules.
const BATCH = process.argv.includes("--batch") ? process.argv[process.argv.indexOf("--batch") + 1] : "batch2";
const PLAN = JSON.parse(fs.readFileSync(new URL(`./link-multi-approach-${BATCH}.plan.json`, import.meta.url), "utf8"));
const BEFORE = new URL(`./link-multi-approach-${BATCH}.before.json`, import.meta.url);
const key = requireServiceKey();
const multi = PLAN.filter((p) => p.verdict === "MULTI");
const ids = multi.map((p) => p.id);
const rows = [];
for (let i = 0; i < ids.length; i += 25) rows.push(...(await selectAll("routes", "id,area_id,name,approach_variants,approach_logistics,bivy,waypoints", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));
if (process.argv.includes("--rollback")) {
  const b = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const [id, v] of Object.entries(b)) await patchRow("routes", id, v);
  console.log("rolled back", Object.keys(b).length); process.exit(0);
}
const allIds = new Set((await selectAll("routes", "id", `id=in.(${[...new Set(multi.flatMap((p) => p.ways.map((w) => w.viaRouteId).filter(Boolean)))].join(",") || "none"})`, { key })).map((r) => r.id));

const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const anchorOf = (row) => { const al = row.approach_logistics || {}; const s = (row.waypoints || []).find((w) => /summit/i.test(w?.type || "")); return s && s.lat != null ? [+s.lat, +s.lng] : al.peakLat != null ? [+al.peakLat, +al.peakLng] : al.trailheadLat != null ? [+al.trailheadLat, +al.trailheadLng] : null; };
const SOURCEY = /https?:|www\.|\.com\b|\.org\b|mountain ?project|summitpost|peakbagger|wta\b|washington trails association|cascadeclimbers|caltopo|trip report|guidebook|according to|research/i;
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const problems = [], next = {}, before = {}, log = [];

for (const p of multi) {
  const row = rows.find((r) => r.id === p.id);
  if (!row) { problems.push(`${p.id}: row missing`); continue; }
  const cur = Array.isArray(row.approach_variants) ? row.approach_variants : [];
  if (cur.some((v) => v && (v.trip || v.viaRouteId))) { log.push(`${p.id}: SPENT (already linked)`); continue; }
  const ex = cur.map((v) => ({ ...v }));
  const newWays = p.ways.filter((w) => /^n\d+$/.test(w.ref));
  for (const w of p.ways) if (/^e\d+$/.test(w.ref) && !ex[+w.ref.slice(1)]) problems.push(`${p.id}: no card ${w.ref}`);
  const final = [...ex, ...newWays.map((w) => ({ name: String(w.name || "").trim(), notes: String(w.notes || "").trim() }))];
  const idxOf = (ref) => /^e\d+$/.test(ref) ? +ref.slice(1) : ex.length + newWays.findIndex((w) => w.ref === ref);
  const anchor = anchorOf(row);
  for (const w of p.ways) {
    const i = idxOf(w.ref), v = final[i];
    if (!v) continue;
    if (/^n/.test(w.ref) && (!v.name || !v.notes)) problems.push(`${p.id} ${w.ref}: a new way in needs a name and notes`);
    for (const t of [v.name, v.notes]) if (/^n/.test(w.ref) && t && SOURCEY.test(t)) problems.push(`${p.id} ${w.ref}: text names a source: "${t.slice(0, 80)}"`);
    if (w.viaRouteId) { if (!allIds.has(w.viaRouteId)) problems.push(`${p.id}: via ${w.viaRouteId} does not exist`); else v.viaRouteId = w.viaRouteId; continue; }
    if (!w.trailhead) continue;
    if (w.ref === p.stored) { problems.push(`${p.id}: the stored way in may not carry a trailhead`); continue; }
    const th = w.trailhead, al = { trailhead: String(th.name || "").trim() };
    if (!al.trailhead) { problems.push(`${p.id} ${w.ref}: trailhead without a name`); continue; }
    if (SOURCEY.test(al.trailhead)) problems.push(`${p.id} ${w.ref}: trailhead name names a source`);
    if (isFinite(th.lat) && isFinite(th.lng) && th.lat != null && th.lng != null) {
      al.trailheadLat = +th.lat; al.trailheadLng = +th.lng;
      if (anchor) { const d = km(anchor[0], anchor[1], al.trailheadLat, al.trailheadLng); if (d > 45) problems.push(`${p.id} ${w.ref}: ${al.trailhead} is ${d.toFixed(0)} km from the climb`); }
    }
    if (isFinite(th.elevFt) && th.elevFt != null) al.trailheadElevFt = Math.round(+th.elevFt);
    const t = { approachLogistics: al };
    if (isFinite(w.distMi) && w.distMi > 0) { t.distKm = +(w.distMi * 1.609344).toFixed(2); t.outingShape = "outback"; }
    if (isFinite(w.gainFt) && w.gainFt > 0) { t.gainFt = Math.round(w.gainFt); t.gainM = Math.round(w.gainFt / 3.28084); }
    v.trip = t;
  }
  if (!final.some((v) => v.trip || v.viaRouteId)) { log.push(`${p.id}: MULTI but no way in has data of its own — left as cards`); continue; }
  // primary + storedRow
  const pi = idxOf(p.primary), si = idxOf(p.stored);
  final.forEach((v) => { delete v.primary; delete v.storedRow; });
  if (final[pi]) final[pi].primary = true; else problems.push(`${p.id}: primary ${p.primary} missing`);
  if (final[si] && si !== pi) final[si].storedRow = true;
  if (final[si] && (final[si].trip || final[si].viaRouteId)) problems.push(`${p.id}: the stored way in has its own data`);
  // camps
  const camps = Array.isArray(row.bivy) ? row.bivy : [];
  const cm = p.camps || {};
  for (const n of Object.keys(cm)) if (!camps.some((c) => c && c.name === n)) problems.push(`${p.id}: no camp named "${n}"`);
  // A camp the plan does not name goes with every way in; one it names with [] goes with none
  // (a descent camp, such as Camp Schurman below Liberty Cap).
  const uses = (c, i) => { const refs = cm[c.name]; return !refs || refs.some((r) => idxOf(r) === i); };
  final.forEach((v, i) => {
    if (v.viaRouteId) return;
    const mine = camps.filter((c) => c && c.name && uses(c, i));
    if (v.trip) { if (mine.length) v.trip.bivy = mine; }
    else if (i === si && Object.keys(cm).length) v.camps = mine.map((c) => c.name);
  });
  const patch = { approach_variants: final };
  if (p.fillStored) {
    const al = { ...(row.approach_logistics || {}) }, f = p.fillStored;
    // `replace`: the stored pin is another trailhead's (Cockscomb Ridge stored Artist Point's under
    // the Heliotrope Ridge name); the fill is the pin the sibling routes from that trailhead share.
    if ((al.trailheadLat == null || f.replace) && isFinite(f.lat) && f.lat != null) { al.trailheadLat = +f.lat; al.trailheadLng = +f.lng; if (anchor) { const d = km(anchor[0], anchor[1], al.trailheadLat, al.trailheadLng); if (d > 45) problems.push(`${p.id}: stored trailhead fill ${d.toFixed(0)} km away`); } }
    if (!al.trailhead && f.name) al.trailhead = f.name;
    if (JSON.stringify(al) !== JSON.stringify(row.approach_logistics || {})) patch.approach_logistics = al;
  }
  before[p.id] = { approach_variants: row.approach_variants, ...(patch.approach_logistics ? { approach_logistics: row.approach_logistics } : {}) };
  next[p.id] = patch;
  log.push(`\n${p.id}  (${row.name})` + (patch.approach_logistics ? `\n   stored trailhead → ${patch.approach_logistics.trailhead} @ ${patch.approach_logistics.trailheadLat ?? "-"},${patch.approach_logistics.trailheadLng ?? "-"}` : "") +
    final.map((v) => `\n   ${v.primary ? "★" : " "}${v.storedRow ? "S" : " "} ${v.name}` + (v.viaRouteId ? `  → via ${v.viaRouteId}` : "") + (v.trip ? `  → ${v.trip.approachLogistics.trailhead}${v.trip.approachLogistics.trailheadLat != null ? " ●" : " (no pin)"}${v.trip.distKm ? " " + v.trip.distKm + "km" : ""}${v.trip.gainFt ? " ↑" + v.trip.gainFt : ""}${v.trip.bivy ? " camps:" + v.trip.bivy.map((c) => c.name).join("/") : ""}` : "") + (v.camps ? `  camps:${v.camps.join("/") || "(none)"}` : "")).join(""));
}
console.log(log.join("\n"));
const counts = PLAN.reduce((a, p) => ((a[p.verdict] = (a[p.verdict] || 0) + 1), a), {});
console.log("\nverdicts:", counts);
if (problems.length) { console.log("\nPROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log(`\ndry run: ${Object.keys(next).length} rows would change — pass --write`); process.exit(0); }
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1));
for (const [id, patch] of Object.entries(next)) await patchRow("routes", id, patch);
const after = [];
for (let i = 0; i < ids.length; i += 25) after.push(...(await selectAll("routes", "id,approach_variants,approach_logistics", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));
let bad = 0;
for (const [id, patch] of Object.entries(next)) {
  const a = after.find((r) => r.id === id);
  if (JSON.stringify(canon(a.approach_variants)) !== JSON.stringify(canon(patch.approach_variants)) || (patch.approach_logistics && JSON.stringify(canon(a.approach_logistics)) !== JSON.stringify(canon(patch.approach_logistics)))) { bad++; console.log("RE-READ MISMATCH", id); }
}
console.log(`written ${Object.keys(next).length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
