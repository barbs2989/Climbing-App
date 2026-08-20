// Break the ambiguous fords with the CHORD INVARIANT, not with a preference.
//
// 20 fords found several real mapped crossings of the right creek and the claimed elevation could not
// separate them, so the solver refused. Bracketing between two clean neighbours would settle it, but
// only 2 of the 20 have both — measured before building, and too thin on its own.
//
// Ten have ONE clean neighbour, and that is enough for the invariant this repo already trusts
// (probe-trailhead-by-chain-geometry, audit:waypoint-distances): **a straight line cannot be longer
// than the trail that walks it.** Each waypoint records `distMi` along the route, so between a clean
// neighbour j and the ambiguous pin i the party walks |distMi_i - distMi_j| miles, and any candidate
// crossing further than that IN A STRAIGHT LINE is impossible — not unlikely, impossible.
//
// This is evidence about position that owes nothing to the fabricated coordinate: it comes from the
// waypoint ORDER and the recorded mileage, written by whoever listed the waypoints rather than by the
// interpolation that placed them.
//
// SLACK IS MEAN, and deliberately so. The Chikamin case in this repo's notes survived a 15% tolerance
// and then a 3% one because a 0.4 km floor covered its gap by 20 metres, and a threshold loose enough
// to admit the answer you already believe proves nothing. 15% covers a mileage rounded to one decimal
// and a hand-placed neighbour, and nothing else.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const SLACK = 1.15, DUP_M = 30, MERGE_M = 40, PAD_KM = 3;
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const NHD = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";
const TRANS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer";
const WAYS = [37, 31, 32, 35, 36];
async function arc(url, layer, where, env) {
  const u = `${url}/${layer}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=json`
    + `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&geometry=${encodeURIComponent(JSON.stringify(env))}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (!j.error) return { paths: (j.features || []).flatMap(f => f.geometry?.paths || []) }; }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 700 * (t + 1)));
  }
  return { err: "no answer after 3 attempts" };
}
function segInt(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-14) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { lng: p1.x + t * (p2.x - p1.x), lat: p1.y + t * (p2.y - p1.y) };
}

const log = fs.readFileSync(`${T}/ford-run.log`, "utf8");
const ambText = log.slice(log.indexOf("AMBIGUOUS"), log.indexOf("NO CROSSING FOUND"));
const amb = [...ambText.matchAll(/^\s{2}(\S+)\[(\d+)\]/gm)].map(m => ({ route: m[1], i: +m[2] }));
const allCands = JSON.parse(fs.readFileSync(`${T}/ford-candidates.json`, "utf8"));
const cands = amb.map(a => allCands.find(c => c.route === a.route && c.i === a.i)).filter(Boolean);

const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const origin = new Map();
for (const r of fab) for (const p of r.pins) origin.set(`${r.id}#${p.i}`, { lat: +p.lat, lng: +p.lng });

const ids = [...new Set(cands.map(c => c.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

function cleanNeighbour(routeId, w, j) {
  const p = w[j];
  if (!p || p.lat == null) return null;
  if (Math.max(dec(p.lat), dec(p.lng)) > 8) return null;
  const o = origin.get(`${routeId}#${j}`);
  if (o && Math.abs(+p.lat - o.lat) <= 1e-9 && Math.abs(+p.lng - o.lng) <= 1e-9) return null;  // still fabricated
  if (!Number.isFinite(Number(p.distMi))) return null;
  return { j, lat: +p.lat, lng: +p.lng, distMi: Number(p.distMi), name: p.name };
}

const solved = [], stillAmb = [], skipped = [];
for (const c of cands) {
  const w = (rows[c.route] || {}).waypoints || [];
  const mi = Number(c.distMi);
  if (!Number.isFinite(mi)) { skipped.push({ c, why: "the pin records no distMi, so no trail budget exists" }); continue; }
  const nb = cleanNeighbour(c.route, w, c.i - 1) || cleanNeighbour(c.route, w, c.i + 1);
  if (!nb) { skipped.push({ c, why: "no clean neighbour carrying a distMi to measure from" }); continue; }
  const budgetKm = Math.abs(mi - nb.distMi) * 1.60934 * SLACK;
  if (!(budgetKm > 0)) { skipped.push({ c, why: `the neighbour records the same mileage (${nb.distMi}), so the budget is zero` }); continue; }

  const pts = w.filter(p => p.lat != null).map(p => ({ lat: +p.lat, lng: +p.lng }));
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = { xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
                ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat,
                spatialReference: { wkid: 4326 } };
  const water = await arc(NHD, 6, `gnis_name='${c.water.replace(/'/g, "''")}'`, env);
  if (water.err || !water.paths.length) { skipped.push({ c, why: `NHD: ${water.err || "no geometry"}` }); continue; }
  const wayPaths = [];
  let bad = null;
  for (const L of WAYS) { const q = await arc(TRANS, L, "1=1", env); if (q.err) { bad = q.err; break; } wayPaths.push(...q.paths); }
  if (bad) { skipped.push({ c, why: `transportation: ${bad}` }); continue; }

  const hits = [];
  for (const rp of water.paths) for (let i = 0; i < rp.length - 1; i++)
    for (const tp of wayPaths) for (let j = 0; j < tp.length - 1; j++) {
      const p = segInt({ x: rp[i][0], y: rp[i][1] }, { x: rp[i + 1][0], y: rp[i + 1][1] },
                       { x: tp[j][0], y: tp[j][1] }, { x: tp[j + 1][0], y: tp[j + 1][1] });
      if (p) hits.push(p);
    }
  const uniq = [];
  for (const h of hits) if (!uniq.some(u => km(u, h) * 1000 < MERGE_M)) uniq.push(h);
  if (!uniq.length) { skipped.push({ c, why: "no crossing on this pass" }); continue; }

  const reachable = uniq.filter(h => km(nb, h) <= budgetKm);
  const note = `${uniq.length} crossings, ${reachable.length} within ${budgetKm.toFixed(1)} km of "${nb.name}" (${Math.abs(mi - nb.distMi).toFixed(1)} mi of trail)`;
  if (reachable.length !== 1) {
    stillAmb.push({ c, why: `${note} — still cannot choose`,
      detail: uniq.map(h => `${h.lat.toFixed(5)},${h.lng.toFixed(5)} ${km(nb, h).toFixed(1)} km from the neighbour`) });
    continue;
  }
  const pick = reachable[0];
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (km({ lat: +w[j].lat, lng: +w[j].lng }, pick) * 1000 < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { stillAmb.push({ c, why: `the surviving crossing lands on an existing pin: ${clash}` }); continue; }
  const ground = await elevationAt(pick.lat, pick.lng);
  const elev = Number(c.elev);
  const elevOk = Number.isFinite(elev) && elev !== 0 && ground != null ? Math.abs(ground - elev) <= Math.max(400, elev * 0.08) : null;
  solved.push({ ...c, lat: pick.lat, lng: pick.lng, ground: ground == null ? null : Math.round(ground), elevOk,
    note, from: nb.name, budgetKm: +budgetKm.toFixed(1) });
}

console.log(`ambiguous fords re-examined : ${cands.length}\n`);
console.log(`  BROKEN by the chord invariant : ${solved.length}`);
for (const s of solved) console.log(`  ${s.route}[${s.i}] ${s.name}\n      ${s.note}\n      -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}  claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no comparison)" : s.elevOk ? "AGREES" : "ELEVATION DISAGREES"}`);
console.log(`\n  still ambiguous : ${stillAmb.length}`);
for (const a of stillAmb) { console.log(`  ${a.c.route}[${a.c.i}] ${a.c.name} — ${a.why}`); (a.detail || []).forEach(d => console.log(`        ${d}`)); }
console.log(`\n  no budget to measure with : ${skipped.length}`);
for (const s of skipped) console.log(`  ${s.c.route}[${s.c.i}] ${s.c.name} — ${s.why}`);
fs.writeFileSync(`${T}/ford-broken.json`, JSON.stringify(solved, null, 1));
console.log(`\n-> ford-broken.json (${solved.length})`);
