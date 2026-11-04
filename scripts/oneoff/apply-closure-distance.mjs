#!/usr/bin/env node
// Put a closed road's walk INTO a route's distance and gain, and record it as road.walkMi /
// road.walkGainFt (lib/outing.js roadWalkMi), from a researched plan file.
//
//   node scripts/oneoff/apply-closure-distance.mjs audits/closure-distance/<plan>.json --dry
//   node scripts/oneoff/apply-closure-distance.mjs audits/closure-distance/<plan>.json
//   node scripts/oneoff/apply-closure-distance.mjs --rollback scripts/rollback-closure-distance-<ts>.json
//
// A plan is an array of
//   { id, walkMi, walkGainFt?, distKmNew?, roadPatch?, accessPatch?, variantPatches?: [{index, set?, unset?}],
//     timingAdd?: {approachTimeHrs?, totalHrs?}, why }
// The distance moves where the Distance tile reads it (lib/outing.js effDistKm): with an itinerary
// that states day miles, the first and last days each gain walkMi (a one-day itinerary gains both
// legs); without one, `dist_km` is set to the plan's explicit `distKmNew`, because that column holds
// two conventions and no arithmetic on it is safe (CLAUDE.md). A row that already carries
// road.walkMi is refused, so a re-run cannot add the road twice.
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const key = requireServiceKey();
const read = async ids => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,dist_km,gain_ft,loss_ft,itinerary,road,access,approach_variants,timing&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  if (!r.ok) throw new Error(`read -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

if (args[0] === "--rollback") {
  const before = JSON.parse(fs.readFileSync(args[1], "utf8"));
  for (const row of before) { const { id, ...body } = row; if (DRY) { console.log("would restore", id); continue; } await patchRow("routes", id, body); console.log("restored", id); }
  process.exit(0);
}

const plan = JSON.parse(fs.readFileSync(args[0], "utf8"));
const rows = await read(plan.map(p => p.id));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const missing = plan.filter(p => !byId[p.id]);
if (missing.length) { console.error("unknown ids:", missing.map(p => p.id).join(", ")); process.exit(1); }

const out = [];
for (const p of plan) {
  const r = byId[p.id];
  if (r.road && r.road.walkMi != null) { console.error(`REFUSE ${p.id}: road.walkMi already ${r.road.walkMi}`); process.exit(1); }
  if (!(p.walkMi > 0)) { console.error(`REFUSE ${p.id}: walkMi must be > 0`); process.exit(1); }
  const body = {};
  const days = r.itinerary && Array.isArray(r.itinerary.days) ? r.itinerary.days : null;
  const daysWithMiles = days ? days.filter(d => d.miles != null).length : 0;
  if (days && days.length && daysWithMiles * 2 >= days.length) {
    const nd = days.map(d => ({ ...d }));
    const first = nd[0], last = nd[nd.length - 1];
    // `ends`: "both" (default, there and back), or "first"/"last" for a traverse that meets the closed road at one end only.
    const ends = p.ends || "both";
    if (ends !== "last") first.miles = +((first.miles || 0) + p.walkMi + (nd.length === 1 && ends === "both" ? p.walkMi : 0)).toFixed(1);
    if (ends !== "first" && (nd.length > 1 || ends === "last")) last.miles = +((last.miles || 0) + p.walkMi).toFixed(1);
    if (p.walkGainFt && first.gainFt != null && ends !== "last") first.gainFt = first.gainFt + p.walkGainFt;
    // The day's note must say the miles it now counts, or 12.5 mi sits over a note that starts at the trailhead.
    if (p.dayNotePrefix && ends !== "last" && typeof first.note === "string" && !first.note.startsWith(p.dayNotePrefix)) first.note = p.dayNotePrefix + " " + first.note;
    if (p.dayNoteSuffix && ends === "last" && typeof last.note === "string" && !last.note.endsWith(p.dayNoteSuffix)) last.note = last.note + " " + p.dayNoteSuffix;
    body.itinerary = { ...r.itinerary, days: nd };
  } else if (p.distKmNew != null) body.dist_km = p.distKmNew;
  else { console.error(`REFUSE ${p.id}: no itinerary day miles and no distKmNew in the plan`); process.exit(1); }
  if (p.walkGainFt) { if (r.gain_ft != null) body.gain_ft = r.gain_ft + p.walkGainFt; if (r.loss_ft != null) body.loss_ft = r.loss_ft + p.walkGainFt; }
  body.road = { ...(r.road || {}), ...(p.roadPatch || {}), walkMi: p.walkMi, ...(p.walkGainFt ? { walkGainFt: p.walkGainFt } : {}) };
  if (p.accessPatch) body.access = { ...(r.access || {}), ...p.accessPatch };
  if (p.variantPatches && p.variantPatches.length) {
    const vs = (r.approach_variants || []).map(v => (v ? { ...v } : v));
    for (const vp of p.variantPatches) { const v = vs[vp.index]; if (!v) { console.error(`REFUSE ${p.id}: no variant ${vp.index}`); process.exit(1); } Object.assign(v, vp.set || {}); for (const k of vp.unset || []) delete v[k]; }
    body.approach_variants = vs;
  }
  if (p.timingAdd && r.timing) {
    const t = { ...r.timing };
    for (const [k, add] of Object.entries(p.timingAdd)) if (typeof t[k] === "number") t[k] = +(t[k] + add).toFixed(1);
    body.timing = t;
  }
  const before = { id: r.id }; for (const k of Object.keys(body)) before[k] = r[k];
  out.push({ id: p.id, body, before });
  console.log(`${DRY ? "DRY " : ""}${p.id}: ${Object.keys(body).join(", ")}${body.itinerary ? " · day miles " + body.itinerary.days.map(d => d.miles).join("+") : ""}${body.gain_ft != null ? " · gain " + r.gain_ft + "→" + body.gain_ft : ""}${body.dist_km != null ? " · dist_km " + r.dist_km + "→" + body.dist_km : ""}`);
}
if (DRY) process.exit(0);
const rb = `scripts/rollback-closure-distance-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(out.map(o => o.before), null, 1));
console.log("rollback saved:", rb);
for (const o of out) await patchRow("routes", o.id, o.body);
const after = await read(out.map(o => o.id));
let bad = 0;
for (const o of out) { const a = after.find(x => x.id === o.id); if (!a || !a.road || a.road.walkMi !== o.body.road.walkMi) { bad++; console.error("NOT LANDED", o.id); } }
console.log(bad ? `${bad} row(s) did not land` : `${out.length} row(s) written and re-read`);
process.exit(bad ? 1 : 0);
