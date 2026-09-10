// Mount Stuart's own routes place its summit FIVE ways, and the peak's `areas` row is party to
// the disagreement. `audit:summit-splits` reports the split and deliberately refuses to pick;
// this is the diagnosis that refusal leaves to a reader, so nobody has to derive it again.
//
// Measured 2026-09-09 (USGS 3DEP via terrain.mjs, GNIS via the ArcGIS gazetteer):
//
//   ground  isMax  coordinate                 who
//   9,416   YES    47.475139,-120.902372      wa_mount_stuart_girth_pillar          17 m from GNIS
//   9,333   YES    47.475,-120.9022           north_face, the_gendarme               4 m from GNIS
//   9,208   no     47.4751179,-120.9031444    the AREA ROW + 8 routes               68 m from GNIS
//   8,870   no     47.475,-120.904            cascadian_couloir, north_ridge,      132 m from GNIS
//                                             west_ridge
//
// Every one of those pins states 9,415 ft except girth_pillar's, which states 9,416.
//
// THREE THINGS THIS SETTLES AND ONE IT DOES NOT.
//
//   1. The 3-route cluster at 47.475,-120.904 is NOT the summit: 545 ft below on the ground with
//      FIVE of its eight ring neighbours higher, and the furthest of the four from the federal
//      coordinate. Those are Stuart's Cascadian Couloir, North Ridge and West Ridge — the three
//      most-climbed lines on the peak, and `buildGpx` writes that pin into the file a climber
//      carries.
//   2. The dominant cluster — the one the peak's own `areas` row sits on, shared by 8 routes —
//      is ALSO not a local maximum: 2 of 8 neighbours are higher, by up to 182 ft.
//   3. `wa_mount_stuart_girth_pillar`'s pin IS a local maximum, matches its own stated 9,416 ft
//      to a foot, and sits 17 m from GNIS's Mount Stuart. Three records, no shared input.
//
// WHAT IT DOES NOT SETTLE IS WHAT TO DO, and the reason is recorded rather than guessed.
// `audit:peak-coords` has already investigated this exact peak: its TOL comment says the DEM
// maximum sits "70 m away matching the stored elevation" and that snapping to it was REJECTED
// because it would DERIVE a coordinate rather than copy an existing record. The new fact here is
// that a stored route pin sits on a local maximum 58 m from the area row, matching its own stated
// elevation to a foot — very likely the same high point that grid search found, though the two
// were sampled differently, so this does not claim they are identical. COPYING is therefore
// available where deriving was not — which changes the calculus that decision was made on, and is therefore a decision to
// re-take rather than one to overturn quietly.
//
// AND EVERY REPAIR PATH TRIPS A GATE, which is the gates saying Stuart is not settled:
// `fix-summit-pins-on-the-flank.mjs` requires the donor's ground within 200 ft of the peak's
// stated elevation (the dominant cluster is 207 ft off) AND the donor within 25 m of the area row
// (girth_pillar's pin is 58 m). Moving the three outliers onto the dominant cluster would put
// them on a point that is not the summit either; moving them onto girth_pillar would make three
// routes agree with one and disagree with eight. Reported, not repaired.
//
// Read-only. Run it to re-take the measurement; it writes nothing.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { summitProbe } from "../lib/terrain.mjs";
import { gnis } from "./probe-gnis-reachable.mjs";

const AREA = "wa_mount_stuart";
const k = anonKey();
const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${AREA}&select=id,name,lat,lng,elevation_ft`, { headers: headers(k) });
const area = (await ar.json())[0];
if (!area) { console.error(`FAIL — ${AREA} not found`); process.exit(1); }
const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes?area_id=eq.${AREA}&select=id,waypoints`, { headers: headers(k) });
const routes = await rr.json();
if (!routes.length) { console.error(`FAIL — 0 routes on ${AREA}. A broken read, not a clean peak.`); process.exit(1); }

const g = new Map();
for (const r of routes) for (const w of (r.waypoints || []).filter(Boolean)) {
  if (!/^summit$/i.test(String(w.type || ""))) continue;
  const la = num(w.lat), ln = num(w.lng);
  if (la == null || ln == null) continue;
  const key = `${la},${ln}`;
  if (!g.has(key)) g.set(key, { la, ln, ids: [], fts: new Set(), names: new Set() });
  const c = g.get(key); c.ids.push(r.id); c.fts.add(num(w.elev)); c.names.add(String(w.name || ""));
}
if (g.size < 2) { console.error(`FAIL — ${g.size} distinct summit coordinate(s); the split this diagnoses is gone, or the read broke.`); process.exit(1); }

let feat = null;
for (const layer of [5, 7]) {
  try { const hits = await gnis("STUART", [-120.95, 47.44, -120.86, 47.51], layer);
    const s = hits.filter((h) => /summit/i.test(h.cls || "") && /mount stuart/i.test(h.name || ""));
    if (s.length) { feat = s[0]; break; } } catch { /* reported below */ }
}

console.log(`\n${area.name} states ${area.elevation_ft} ft; its areas row is at ${area.lat},${area.lng}`);
console.log(feat ? `GNIS "${feat.name}" is at ${feat.lat.toFixed(6)},${feat.lng.toFixed(6)}\n`
                 : `GNIS could not be read — the gazetteer column below is not a verdict\n`);

const rows = [];
for (const c of g.values()) {
  const p = await summitProbe(c.la, c.ln, 12);
  rows.push({ ...c, p });
}
if (rows.some((r) => r.p.centre == null)) { console.error("FAIL — 3DEP could not answer for every cluster. No evidence is not agreement; re-run."); process.exit(1); }
rows.sort((a, b) => b.p.centre - a.p.centre);
for (const r of rows) {
  const dArea = (area.lat != null) ? `${String(Math.round(D(r.la, r.ln, num(area.lat), num(area.lng)))).padStart(3)} m from the area row` : "";
  const dG = feat ? `${String(Math.round(D(r.la, r.ln, feat.lat, feat.lng))).padStart(3)} m from GNIS` : "";
  console.log(`  ${String(Math.round(r.p.centre)).padStart(5)} ft ground  isMax=${String(r.p.isMax).padEnd(5)} ${r.p.note.padEnd(28)} ${`${r.la},${r.ln}`.padEnd(26)} ${dArea}  ${dG}`);
  console.log(`         states ${[...r.fts].join("/")} ft   ${r.ids.join(", ")}`);
}
console.log(`\nRead the header: this is a diagnosis, not a repair. Every path trips a gate in`);
console.log(`fix-summit-pins-on-the-flank.mjs, and audit:peak-coords has a recorded decision on this peak.`);
