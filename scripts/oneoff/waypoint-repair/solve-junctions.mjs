// TRAIL JUNCTIONS -- the same computation as the fords, with two named ways instead of a creek and a
// way. 16 pins, and like the fords they were never offered to research: "Anthem Creek Trail junction"
// contains no motion verb but "Leave Mineral Creek Trail for brush/gully ascent" does, and the
// worklist's deny-list threw the latter out as an instruction while it plainly names a trail.
//
// THREE SHAPES, decided by what the pin's own name contains:
//   two named trails  -> intersect trail A with trail B
//   a trail + a creek -> intersect the trail with the NHD flowline of that creek
//   one named trail   -> intersect it with every OTHER mapped trail in the corridor. A junction needs
//                        two ways and the pin names only one, so the second is whatever meets it.
//
// The gates are the ford solver's, unchanged: disambiguate on the DEM against the pin's own claimed
// elevation (a different field from the fabricated coordinate, so the defect cannot choose its own
// repair), refuse rather than guess when more than one survives, then the 30 m duplicate gate.
//
// PCT is spelled out. TNM carries it as "Pacific Crest National Scenic Trail"; searching the acronym
// finds nothing and would report a mapped junction as unmapped.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const PAD_KM = 3, DUP_M = 30, MERGE_M = 40, ELEV_FT = 400, ELEV_REL = 0.08;
const ro = headers(anonKey());
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const NHD = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";
const TRANS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer";
async function arc(url, layer, where, env) {
  const u = `${url}/${layer}/query?where=${encodeURIComponent(where)}&outFields=name&returnGeometry=true&outSR=4326&f=json`
    + `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&geometry=${encodeURIComponent(JSON.stringify(env))}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (!j.error) return { feats: j.features || [] }; }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 700 * (t + 1)));
  }
  return { err: "no answer after 3 attempts" };
}
const pathsOf = fs2 => fs2.flatMap(f => f.geometry?.paths || []);

function segInt(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-14) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { lng: p1.x + t * (p2.x - p1.x), lat: p1.y + t * (p2.y - p1.y) };
}
function crossings(A, B) {
  const hits = [];
  for (const a of A) for (let i = 0; i < a.length - 1; i++)
    for (const b of B) for (let j = 0; j < b.length - 1; j++) {
      const p = segInt({ x: a[i][0], y: a[i][1] }, { x: a[i + 1][0], y: a[i + 1][1] },
                       { x: b[j][0], y: b[j][1] }, { x: b[j + 1][0], y: b[j + 1][1] });
      if (p) hits.push(p);
    }
  const uniq = [];
  for (const h of hits) if (!uniq.some(u => m(u, h) < MERGE_M)) uniq.push(h);
  return uniq;
}

const TRAIL_RE = /\b((?:[A-Z][A-Za-z'\-]+\s+){1,3}Trail)\b/g;
const CREEK_RE = /\b((?:(?:North|South|East|West|Middle|Upper|Lower)\s+Fork\s+)?(?:[A-Z][a-z']+\s+){1,2}(?:Creek|River))\b/;
const sqlSafe = s => s.replace(/'/g, "''");

const cands = JSON.parse(fs.readFileSync(`${T}/remaining-classes.json`, "utf8")).twoNamedWays;
const ids = [...new Set(cands.map(c => c.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const solved = [], ambiguous = [], nothing = [], errored = [];
for (const c of cands) {
  const w = (rows[c.route] || {}).waypoints || [];
  const pts = w.filter(p => p.lat != null).map(p => ({ lat: +p.lat, lng: +p.lng }));
  if (!pts.length) { errored.push({ c, why: "no located pins to bound the search" }); continue; }
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = { xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
                ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat,
                spatialReference: { wkid: 4326 } };

  const bare = c.name.replace(/\(([^)]*)\)/g, " $1 ");
  let trails = [...new Set((bare.match(TRAIL_RE) || []).map(s => s.trim()))]
    .filter(t => !/^Leave\b/i.test(t)).map(t => t.replace(/^(Leave|Regain)\s+/i, ""));
  if (/\bPCT\b|Pacific Crest/.test(bare)) trails.push("Pacific Crest National Scenic Trail");
  trails = [...new Set(trails)];
  // THE CREEK MUST NOT BE THE TRAIL'S OWN NAME. "Anthem Creek Trail junction" matches a trail
  // ("Anthem Creek Trail") and a creek ("Anthem Creek") out of the very same words, so the naive
  // reading intersects a trail with the creek it is named after -- which finds wherever that trail
  // fords that creek, not the junction the pin means. Four candidates took that branch and were only
  // saved by NHD being busy at the time. Strip the trail names first, then look for a creek.
  let residue = bare;
  for (const t of trails) residue = residue.split(t).join(" ");
  const creek = (residue.match(CREEK_RE) || [])[1];
  if (!trails.length) { nothing.push({ c, why: "no trail name could be read out of the pin name" }); continue; }

  const A = await arc(TRANS, 37, `name LIKE '%${sqlSafe(trails[0].replace(/\s+Trail$/, ""))}%'`, env);
  if (A.err) { errored.push({ c, why: `trail A: ${A.err}` }); continue; }
  if (!A.feats.length) { nothing.push({ c, why: `TNM maps no trail matching "${trails[0]}" in this corridor` }); continue; }
  const Ap = pathsOf(A.feats);

  let Bp = null, how = "";
  if (trails.length > 1) {
    const Bq = await arc(TRANS, 37, `name LIKE '%${sqlSafe(trails[1].replace(/\s+Trail$/, ""))}%'`, env);
    if (Bq.err) { errored.push({ c, why: `trail B: ${Bq.err}` }); continue; }
    if (!Bq.feats.length) { nothing.push({ c, why: `TNM maps no trail matching "${trails[1]}" in this corridor` }); continue; }
    Bp = pathsOf(Bq.feats); how = `${trails[0]} x ${trails[1]}`;
  } else if (creek) {
    const Bq = await arc(NHD, 6, `gnis_name='${sqlSafe(creek)}'`, env);
    if (Bq.err) { errored.push({ c, why: `creek: ${Bq.err}` }); continue; }
    if (!Bq.feats.length) { nothing.push({ c, why: `NHD maps no '${creek}' in this corridor` }); continue; }
    Bp = pathsOf(Bq.feats); how = `${trails[0]} x ${creek}`;
  } else {
    // One named trail: the junction is wherever any OTHER mapped trail meets it.
    const Bq = await arc(TRANS, 37, "1=1", env);
    if (Bq.err) { errored.push({ c, why: `other trails: ${Bq.err}` }); continue; }
    const key = trails[0].replace(/\s+Trail$/, "").toLowerCase();
    Bp = pathsOf(Bq.feats.filter(f => !String(f.attributes?.name || "").toLowerCase().includes(key)));
    how = `${trails[0]} x any other mapped trail`;
    if (!Bp.length) { nothing.push({ c, why: "no other mapped trail in this corridor to form a junction with" }); continue; }
  }

  const uniq = crossings(Ap, Bp);
  if (!uniq.length) { nothing.push({ c, why: `${how}: they do not meet in this corridor` }); continue; }
  const elev = Number(c.elev);
  let keep = uniq, note = `${uniq.length} junction(s)`;
  if (uniq.length > 1) {
    if (!Number.isFinite(elev) || elev === 0) { ambiguous.push({ c, why: `${uniq.length} junctions and no elevation to choose between them` }); continue; }
    const tol = Math.max(ELEV_FT, elev * ELEV_REL);
    const scored = [];
    for (const h of uniq) scored.push({ h, g: await elevationAt(h.lat, h.lng) });
    if (scored.some(s => s.g == null)) { errored.push({ c, why: "DEM did not answer for every junction" }); continue; }
    keep = scored.filter(s => Math.abs(s.g - elev) <= tol).map(s => s.h);
    note = `${uniq.length} junctions, ${keep.length} within ${Math.round(tol)} ft of the claimed ${elev} ft`;
    if (keep.length !== 1) { ambiguous.push({ c, why: `${note} — refusing to choose`, detail: scored.map(s => `${s.h.lat.toFixed(5)},${s.h.lng.toFixed(5)} ground ${Math.round(s.g)} ft`) }); continue; }
  }
  const pick = keep[0];
  const ground = await elevationAt(pick.lat, pick.lng);
  if (ground == null) { errored.push({ c, why: "DEM did not answer at the chosen junction" }); continue; }
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (m({ lat: +w[j].lat, lng: +w[j].lng }, pick) < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { ambiguous.push({ c, why: `lands on an existing pin: ${clash}` }); continue; }
  const elevOk = Number.isFinite(elev) && elev !== 0 ? Math.abs(ground - elev) <= Math.max(ELEV_FT, elev * ELEV_REL) : null;
  solved.push({ ...c, lat: pick.lat, lng: pick.lng, ground: Math.round(ground), note: `${how} — ${note}`, elevOk });
}

const say = (t, n) => console.log(`\n${t} : ${n}`);
say("SOLVED", solved.length);
for (const s of solved) console.log(`  ${s.route}[${s.i}] ${s.name}\n      ${s.note}\n      -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}  claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no elevation)" : s.elevOk ? "AGREES" : "ELEVATION STILL WRONG"}`);
say("AMBIGUOUS", ambiguous.length);
for (const a of ambiguous) { console.log(`  ${a.c.route}[${a.c.i}] ${a.c.name} — ${a.why}`); (a.detail || []).forEach(d => console.log(`        ${d}`)); }
say("NOT FOUND", nothing.length);
for (const n of nothing) console.log(`  ${n.c.route}[${n.c.i}] ${n.c.name} — ${n.why}`);
say("COULD NOT ASK", errored.length);
for (const e of errored) console.log(`  ${e.c.route}[${e.c.i}] ${e.c.name} — ${e.why}`);
fs.writeFileSync(`${T}/junction-solved.json`, JSON.stringify(solved, null, 1));
console.log(`\n-> junction-solved.json (${solved.length})`);
