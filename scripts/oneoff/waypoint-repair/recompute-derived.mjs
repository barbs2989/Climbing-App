// The last two rescuable refusals cite a COMPUTATION, not a record, so gate 6 cannot re-fetch them.
// The honest check is to redo the computation from the same primary sources and see whether it lands
// where the agent said. A recomputation that agrees is worth more than a citation, because it can
// disagree — and if it disagrees the proposal dies here.
//
//  A. wa_luahna_peak_east_slopes[4] "Napeequa River ford" — claimed as the unique crossing of the
//     TNM 'Boulder Pass' trail centreline over the NHD Napeequa River flowline. Recomputed by
//     fetching both geometries and intersecting every segment pair.
//  B. wa_mount_crowder_southwest_route[4] "Col between Phantom Peak and Crowder" — claimed as the
//     3DEP saddle on the connecting ridge. Recomputed by sampling the DEM along the line between
//     the two summits and taking the minimum, then checking it really is a pass: lower than both
//     ends along the ridge, and rising away to either SIDE of it.
import fs from "fs";
import { elevationAt } from "../../lib/terrain.mjs";

const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

// ---------------------------------------------------------------- A. the ford
const TNM = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";
const TRAILS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer";

async function arcQuery(url, layer, where, extra = "") {
  const u = `${url}/${layer}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=json${extra}`;
  const r = await fetch(u);
  if (!r.ok) return { err: `HTTP ${r.status}` };
  const j = await r.json();
  if (j.error) return { err: `${j.error.code}: ${j.error.message}` };
  return j;
}

// Segment intersection in lat/lng treated as a plane — fine at this scale (a few km).
function segInt(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-14) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { lng: p1.x + t * (p2.x - p1.x), lat: p1.y + t * (p2.y - p1.y) };
}
const paths = j => (j.features || []).flatMap(f => (f.geometry?.paths || []));

async function ford(proposal) {
  // Bound the search to the upper Napeequa valley so the query is small and the "unique crossing"
  // claim is tested where it was made.
  const env = "&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects"
    + "&geometry=" + encodeURIComponent(JSON.stringify({ xmin: -121.02, ymin: 48.01, xmax: -120.85, ymax: 48.11, spatialReference: { wkid: 4326 } }));
  // LAYER 6, not 2. Layer 2 is "Line - Large Scale"; flowlines are "Flowline - Large Scale".
  // Querying 2 returned zero features, which reads exactly like "the river is not mapped here" --
  // the same false negative the GNIS group layer produced. Control-checked below.
  const river = await arcQuery(TNM, 6, "gnis_name='Napeequa River'", env);   // NHDFlowline
  if (river.err) return { err: `river: ${river.err}` };
  const trail = await arcQuery(TRAILS, 37, "name LIKE '%Boulder Pass%'", env);
  if (trail.err) return { err: `trail: ${trail.err}` };
  const rp = paths(river), tp = paths(trail);
  if (!rp.length) return { err: "NHD returned no Napeequa River geometry in this envelope" };
  if (!tp.length) return { err: "TNM returned no Boulder Pass trail geometry in this envelope" };
  console.log(`  [control] NHD layer 6 returned ${rp.length} river path(s); TNM layer 37 returned ${tp.length} trail path(s) — both endpoints answer`);
  const hits = [];
  for (const rpath of rp) for (let i = 0; i < rpath.length - 1; i++) {
    const a = { x: rpath[i][0], y: rpath[i][1] }, b = { x: rpath[i + 1][0], y: rpath[i + 1][1] };
    for (const tpath of tp) for (let j = 0; j < tpath.length - 1; j++) {
      const c = { x: tpath[j][0], y: tpath[j][1] }, d = { x: tpath[j + 1][0], y: tpath[j + 1][1] };
      const p = segInt(a, b, c, d);
      if (p) hits.push(p);
    }
  }
  // Collapse hits within 40 m of each other — one crossing digitised as several coincident vertices.
  const uniq = [];
  for (const h of hits) if (!uniq.some(u => m(u, h) < 40)) uniq.push(h);
  return { river: rp.length, trail: tp.length, hits: uniq };
}

// ---------------------------------------------------------------- B. the col
async function col(aSummit, bSummit, proposal) {
  const N = 25;
  const line = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    line.push({ lat: aSummit.lat + t * (bSummit.lat - aSummit.lat), lng: aSummit.lng + t * (bSummit.lng - aSummit.lng) });
  }
  const ev = [];
  for (const p of line) { ev.push(await elevationAt(p.lat, p.lng)); }
  if (ev.some(v => v == null)) return { err: "DEM did not answer for the whole profile" };
  // The saddle is the interior minimum. Ends excluded: they are the summits.
  let lo = 1, k = 1;
  for (let i = 1; i < ev.length - 1; i++) if (ev[i] < ev[lo]) { lo = i; }
  const saddle = line[lo], sEv = ev[lo];
  // A pass must RISE to either side, across the ridge as well as along it.
  const off = (p, mm, bearing) => {
    const d = mm / R, b = bearing * rad, φ1 = p.lat * rad, λ1 = p.lng * rad;
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
    const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
    return { lat: φ2 / rad, lng: λ2 / rad };
  };
  const bear = Math.atan2(bSummit.lng - aSummit.lng, bSummit.lat - aSummit.lat) / rad;
  const s1 = await elevationAt(off(saddle, 120, bear + 90).lat, off(saddle, 120, bear + 90).lng);
  const s2 = await elevationAt(off(saddle, 120, bear - 90).lat, off(saddle, 120, bear - 90).lng);
  return { saddle, sEv, ends: [ev[0], ev[ev.length - 1]], sides: [s1, s2],
           dropsToSides: s1 != null && s2 != null && s1 < sEv && s2 < sEv,
           mFromProposal: Math.round(m(saddle, proposal)) };
}

const dir = process.env.WP_DATA_DIR || "./waypoint-repair-data/research";
const refused = JSON.parse(fs.readFileSync(`${dir}/refused.json`, "utf8"));
const get = (route, i) => refused.find(x => x.route === route && x.i === i);

console.log("=== A. Napeequa River ford — recomputed trail x river intersection ===");
const fx = get("wa_luahna_peak_east_slopes", 4);
const fr = await ford({ lat: +fx.lat, lng: +fx.lng });
if (fr.err) console.log("  could not recompute: " + fr.err);
else {
  console.log(`  river paths ${fr.river}, trail paths ${fr.trail}, distinct crossings ${fr.hits.length}`);
  for (const h of fr.hits) console.log(`    crossing ${h.lat.toFixed(6)},${h.lng.toFixed(6)}  ${Math.round(m(h, { lat: +fx.lat, lng: +fx.lng }))} m from the proposal`);
}

console.log("\n=== B. Col between Phantom Peak and Crowder — recomputed DEM saddle ===");
const cx = get("wa_mount_crowder_southwest_route", 4);
// Phantom Peak GNIS point, quoted in the basis; Crowder summit read from the route's own row below.
const PHANTOM = { lat: 48.81893, lng: -121.34278 };
const { SUPABASE_URL, headers, anonKey } = await import("../../lib/supabase-env.mjs");
const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.wa_mount_crowder_southwest_route`, { headers: headers(anonKey()) });
const [crow] = await rr.json();
// KEY ON THE TYPE, NOT THE NAME. The summit pin here is called "Mount Crowder"; a /summit/i test
// against the name found nothing and reported "no summit pin on the route", which is false.
const summit = (crow?.waypoints || []).find(w => String(w.type || "") === "Summit" && w.lat != null)
  || (crow?.waypoints || []).find(w => /summit/i.test(String(w.name || "")) && w.lat != null);
if (!summit) console.log("  no summit pin on the route — cannot anchor the ridge");
else {
  console.log(`  anchors: Phantom ${PHANTOM.lat},${PHANTOM.lng}   Crowder summit "${summit.name}" ${summit.lat},${summit.lng}`);
  const cr = await col(PHANTOM, { lat: +summit.lat, lng: +summit.lng }, { lat: +cx.lat, lng: +cx.lng });
  if (cr.err) console.log("  " + cr.err);
  else {
    console.log(`  profile ends ${Math.round(cr.ends[0])} / ${Math.round(cr.ends[1])} ft`);
    console.log(`  lowest point on the connecting line: ${cr.saddle.lat.toFixed(6)},${cr.saddle.lng.toFixed(6)} at ${Math.round(cr.sEv)} ft`);
    console.log(`  ground falls away to both sides of it: ${cr.dropsToSides}  (sides ${cr.sides.map(v => v == null ? "?" : Math.round(v)).join(" / ")} ft)`);
    console.log(`  ${cr.mFromProposal} m from the agent's proposal`);
  }
}
