// Does a COMPUTED coordinate actually break the directions writer's gates, or is it harmless?
//
// 481 of 4,207 WA pins (11.4%) carry >8 decimal places — arithmetic residue, so the number is
// an average of other numbers rather than an observation. That is a provenance fact. It is NOT
// yet a defect: an average of the gpx points nearest a feature is a perfectly reasonable
// position, and would be indistinguishable from a survey by this test.
//
// The question that decides whether it matters: are routes carrying computed pins
// DISPROPORTIONATELY refused by the six geometric gates? Every gate is computed from these
// coordinates, so if averaging were producing bad geometry this is where it would show.
//
// If the refusal rate is the same either way, averaging is benign and the 11.4% is trivia.
// If it is much higher, then "coordinate impossible" and "backtracks" are largely a story
// about how the pins were MADE, and no amount of per-route reading will fix them — the repair
// is to re-derive the positions, not to re-order the arrays.
//
// Read-only.
import fs from "fs";
import { selectAll as _selectAll } from "../lib/supabase-env.mjs";

async function selectAll(t, s, f, o) {
  let last;
  for (let a = 1; a <= 8; a++) {
    try { const r = await _selectAll(t, s, f, o); if (a > 1) console.error(`  (retry ${a - 1} ok)`); return r; }
    catch (e) { last = e; if (a < 8) await new Promise((x) => setTimeout(x, 2000 * a)); }
  }
  throw new Error(`read failed after 8 attempts (${f || t}): ${last?.message}`);
}

import os from "os";
import path from "path";
// The 47k-row `areas` scan is the only read here that fails under contention (measured: eight
// consecutive 57014s while many sessions were live). Cache the WA id list — it is a list of
// ids, not measurements, so a stale one can only omit an area added since, and the age is
// printed rather than hidden.
const CACHE = path.join(os.tmpdir(), "climbmatch-wa-area-ids.json");
let waIds;
if (fs.existsSync(CACHE)) {
  const c = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  waIds = c.ids;
  console.log(`using cached WA area ids (${waIds.length}, written ${c.at})\n`);
} else {
  await selectAll("areas", "id", "id=eq.__warmup__", { pageSize: 1 }).catch(() => {});
  const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
  waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
  fs.writeFileSync(CACHE, JSON.stringify({ at: new Date().toISOString(), ids: waIds }));
}
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,waypoints", `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

const dp = (v) => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// The writer's six gates, replicated. Returns null (accept) or the gate name.
function gate(wps) {
  if (!Array.isArray(wps) || wps.length < 2) return "too few waypoints";
  for (let i = 1; i < wps.length; i++) {
    const d = hav(wps[0], wps[i]);
    if (d == null || wps[i].distMi == null) continue;
    const km = Number(wps[i].distMi) * 1.60934;
    if (km > 0 && d > km * 1.10) return "coordinate impossible";
  }
  const marks = wps.map((w) => (w && w.distMi != null ? Number(w.distMi) : null));
  if (marks.filter((m) => m != null).length >= 3) {
    let prev = null;
    for (const m of marks) { if (m == null) continue; if (prev != null && m < prev - 0.001) return "not in travel order"; prev = m; }
  }
  { let prev = null;
    for (let i = 0; i < wps.length; i++) {
      const d = hav(wps[0], wps[i]);
      if (d == null) continue;
      if (prev != null && prev - d > 2.0) return "backtracks toward the start";
      prev = d;
    } }
  const s = wps.findIndex((w) => /^(summit|topout)$/i.test(String((w && w.type) || "")));
  if (s > 0) {
    const dS = hav(wps[0], wps[s]);
    if (dS != null) for (let i = 1; i < s; i++) {
      const d = hav(wps[0], wps[i]);
      if (d != null && d > dS * 1.15) return "point before summit is beyond it";
    }
  }
  if (wps.findIndex((w) => /^trailhead$/i.test(String((w && w.type) || ""))) > 0) return "trailhead is not first";
  return null;
}

let A = { n: 0, refused: 0, by: new Map() };   // routes WITH a computed pin
let B = { n: 0, refused: 0, by: new Map() };   // routes with NO computed pin

for (const r of rows) {
  const wps = r.waypoints;
  if (!Array.isArray(wps) || wps.length < 3) continue;
  const located = wps.filter((w) => w && w.lat != null && w.lng != null);
  if (located.length < 2) continue;
  const computed = located.some((w) => Math.max(dp(w.lat), dp(w.lng)) > 8);
  const g = gate(wps);
  const t = computed ? A : B;
  t.n++;
  if (g) { t.refused++; t.by.set(g, (t.by.get(g) || 0) + 1); }
}

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");
console.log(`routes with >=3 waypoints and >=2 located pins: ${A.n + B.n}\n`);
console.log(`  WITH a computed pin   : ${String(A.n).padStart(4)} routes, ${String(A.refused).padStart(4)} refused  (${pct(A.refused, A.n)}%)`);
console.log(`  with NO computed pin  : ${String(B.n).padStart(4)} routes, ${String(B.refused).padStart(4)} refused  (${pct(B.refused, B.n)}%)`);

console.log(`\n--- refusal reason, WITH a computed pin ---`);
for (const [k, v] of [...A.by].sort((x, y) => y[1] - x[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`\n--- refusal reason, NO computed pin ---`);
for (const [k, v] of [...B.by].sort((x, y) => y[1] - x[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);

const ratio = B.refused / B.n ? (A.refused / A.n) / (B.refused / B.n) : null;
console.log(`\nrelative risk: a route with a computed pin is ${ratio ? ratio.toFixed(2) : "?"}x as likely to be refused.`);
console.log(ratio && ratio > 1.5
  ? `\nSo the averaging is NOT benign — it is a substantial part of why the gates refuse.`
  : `\nSo the averaging does NOT explain the refusals; the 11.4% is provenance trivia, not a cause.`);
