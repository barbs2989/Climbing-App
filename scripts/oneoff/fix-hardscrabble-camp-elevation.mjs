// ONE CONFIRMED ELEVATION DEFECT, found by audit-camp-elevations.mjs on its first full run.
//
// "Hardscrabble Horse Camp, Middle Fork Snoqualmie" stores 1,400 ft on 21 rows. Two independent
// records say that is the TRAILHEAD's elevation, not the camp's:
//
//   1. The USGS DEM at the camp's OSM coordinate reads 2,828 ft. That OSM record is not a guess —
//      the waypoint-repair pass lists Hardscrabble Horse Camp as one of its CONTROLS, confirmed
//      by re-fetching the record by id at 0 m.
//   2. A published description of the walk gives the trailhead at 1,400 ft, then 4.5 miles
//      gaining 400 ft to the hot springs turnoff, then ~3 more miles gaining over 1,000 ft to the
//      camp. 1,400 + 400 + 1,000 = ~2,800 ft.
//
// The two agree to ~28 ft by completely different methods, and 1,400 is exactly the number the
// first of them names as the START. That is a recognisable failure: the trailhead's height
// written into the camp's field.
//
// This is the ONLY value being changed. The audit is report-only by design — a disagreement says
// one record is wrong, not which — so a write needs positive evidence for which one, and that is
// what the two sources above provide. Everything else the audit flagged stays untouched.
//
// The script declares the EXPECTED CURRENT VALUE and refuses if the row no longer holds it, so a
// stale plan cannot half-apply over someone else's correction.
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const NAME_MATCH = /^hardscrabble horse camp/i;
const EXPECT = 1400;
const CORRECT = 2828;

const ro = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: ro });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,bivy&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const targets = [];
let otherValue = 0;
for (const r of rows) {
  arr(r.bivy).forEach((b, i) => {
    if (!b || !NAME_MATCH.test(String(b.name || ""))) return;
    if (Number(b.elev) !== EXPECT) { otherValue++; return; }
    targets.push({ routeId: r.id, idx: i, name: b.name });
  });
}
console.log(`matched ${targets.length} site(s) holding ${EXPECT} ft; ${otherValue} carry something else and are left alone\n`);
targets.slice(0, 5).forEach((t) => console.log(`   ${t.routeId}  "${String(t.name).slice(0, 56)}"`));
if (!targets.length) { console.log("\nnothing to do — already corrected, or the name changed"); process.exit(0); }
if (!APPLY) { console.log(`\ndry run — would set ${EXPECT} -> ${CORRECT} ft. Pass --apply to write.`); process.exit(0); }

const svc = headers(requireServiceKey());
const byRoute = new Map();
for (const t of targets) {
  if (!byRoute.has(t.routeId)) byRoute.set(t.routeId, []);
  byRoute.get(t.routeId).push(t.idx);
}
let patched = 0;
for (const [routeId, idxs] of byRoute) {
  const cur = (await q(`routes?select=bivy&id=eq.${encodeURIComponent(routeId)}`))[0];
  if (!cur) { console.log(`  MISSING ${routeId}`); continue; }
  const bivy = arr(cur.bivy).map((b) => ({ ...b }));
  let touched = 0;
  for (const i of idxs) {
    // Re-assert against the live row: the read above may be seconds stale, and this must never
    // overwrite a value somebody else has since corrected.
    if (!bivy[i] || Number(bivy[i].elev) !== EXPECT) continue;
    bivy[i].elev = CORRECT;
    touched++;
  }
  if (!touched) continue;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(routeId)}`, {
    method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ bivy }),
  });
  const back = r.ok ? await r.json() : null;
  if (!r.ok || !Array.isArray(back) || back.length !== 1) { console.log(`  FAILED ${routeId} (${r.status})`); continue; }
  patched += touched;
}
console.log(`\npatched ${patched} site(s)`);

// Re-read through the ANON role. A 200 is not evidence the data changed.
let confirmed = 0, stale = 0;
for (const [routeId] of byRoute) {
  const cur = (await q(`routes?select=bivy&id=eq.${encodeURIComponent(routeId)}`))[0];
  for (const b of arr(cur && cur.bivy)) {
    if (!NAME_MATCH.test(String((b && b.name) || ""))) continue;
    if (Number(b.elev) === CORRECT) confirmed++;
    else if (Number(b.elev) === EXPECT) stale++;
  }
}
console.log(`re-read: ${confirmed} now ${CORRECT} ft, ${stale} still ${EXPECT} ft`);
process.exit(stale ? 1 : 0);
