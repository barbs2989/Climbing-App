// SOLVE FORDS BY COMPUTATION. No agent, no narrative, no self-reported confidence.
//
// A ford is the one fabricated-pin class that a machine can locate outright: a named watercourse and
// a mapped trail or road cross where they cross, and USGS publishes both geometries. Proven already
// on wa_luahna_peak_east_slopes[4], where re-intersecting NHD against TNM landed 0 m from a
// researched proposal that had cost an agent a full batch slot.
//
// These pins were never even OFFERED to research. The worklist rejected any name containing a verb
// of motion as "an instruction, not a place", so every "X Creek crossing" fell out -- the verb says
// how you get there, the noun still says where it is. A deny-list detector fails as a SHORTER
// WORKLIST, and a shorter worklist reads exactly like a finished one.
//
// HOW A CANDIDATE IS DECIDED, and what each step is allowed to prove:
//   1. Envelope. The bbox of the route's own pins, padded. This only BOUNDS the search -- it can
//      never supply an answer, because every answer must be a real mapped intersection.
//   2. Intersect the named watercourse against every mapped trail and road in the envelope.
//   3. Disambiguate on the DEM, NOT on proximity to the fabricated pin. The fabricated pin is the
//      thing being replaced; using it to choose among candidates would let the defect pick its own
//      repair. The route's CLAIMED ELEVATION is independent of the fabricated coordinate -- it came
//      from a different field -- so the ground at each candidate crossing settles which one it is.
//   4. Exactly one survivor -> propose. Several -> AMBIGUOUS and reported, never guessed. None ->
//      reported. Refusing to choose is a result.
//   5. Duplicate gate against the live row, same 30 m as the main pass.
//
// FAILS CLOSED throughout: a service that will not answer is an unknown, never an empty valley.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7);
const ro = headers(anonKey());
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const PAD_KM = 3, DUP_M = 30, MERGE_M = 40;
const ELEV_FT = 400, ELEV_REL = 0.08;
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const NHD = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer";
const TRANS = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer";
const WAYS = [37, 31, 32, 35, 36];        // Trails, Local Connecting Roads, Local Roads, 4WD, Closed

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

// --candidates= lets a CONTROL file be run through the identical path. The expected output of this
// solver is "a plausible-looking coordinate", which is exactly what a broken one also produces, so
// it is pointed at an answer already established by other means before it is trusted on 64 unknowns.
const CANDS = (process.argv.find(a => a.startsWith("--candidates=")) || "--candidates=ford-candidates.json").slice(13);
const cands = JSON.parse(fs.readFileSync(`${T}/${CANDS}`, "utf8"))
  .filter(c => !ONLY || c.route === ONLY);
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
  if (!pts.length) { errored.push({ c, why: "route has no located pins to bound the search" }); continue; }
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = {
    xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
    ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat,
    spatialReference: { wkid: 4326 }
  };

  const water = await arc(NHD, 6, `gnis_name='${c.water.replace(/'/g, "''")}'`, env);
  if (water.err) { errored.push({ c, why: `NHD: ${water.err}` }); continue; }
  if (!water.paths.length) { nothing.push({ c, why: `NHD maps no '${c.water}' in this route's corridor` }); continue; }

  const wayPaths = [];
  let wayErr = null;
  for (const L of WAYS) {
    const q = await arc(TRANS, L, "1=1", env);
    if (q.err) { wayErr = `transportation layer ${L}: ${q.err}`; break; }
    wayPaths.push(...q.paths);
  }
  if (wayErr) { errored.push({ c, why: wayErr }); continue; }
  if (!wayPaths.length) { nothing.push({ c, why: "no mapped trail or road in this corridor at all" }); continue; }

  const hits = [];
  for (const rp of water.paths) for (let i = 0; i < rp.length - 1; i++) {
    const a = { x: rp[i][0], y: rp[i][1] }, b = { x: rp[i + 1][0], y: rp[i + 1][1] };
    for (const tp of wayPaths) for (let j = 0; j < tp.length - 1; j++) {
      const p = segInt(a, b, { x: tp[j][0], y: tp[j][1] }, { x: tp[j + 1][0], y: tp[j + 1][1] });
      if (p) hits.push(p);
    }
  }
  const uniq = [];
  for (const h of hits) if (!uniq.some(u => m(u, h) < MERGE_M)) uniq.push(h);
  if (!uniq.length) { nothing.push({ c, why: `'${c.water}' and the mapped ways do not cross in this corridor` }); continue; }

  // Disambiguate on the GROUND against the route's own claimed elevation -- a different field from
  // the fabricated coordinate, so this is not the defect choosing its own repair.
  const elev = Number(c.elev);
  let keep = uniq, note = `${uniq.length} crossing(s)`;
  if (uniq.length > 1) {
    if (!Number.isFinite(elev) || elev === 0) { ambiguous.push({ c, uniq, why: `${uniq.length} crossings and the pin records no elevation to choose between them` }); continue; }
    const tol = Math.max(ELEV_FT, elev * ELEV_REL);
    const scored = [];
    for (const h of uniq) { const g = await elevationAt(h.lat, h.lng); scored.push({ h, g }); }
    if (scored.some(s => s.g == null)) { errored.push({ c, why: "DEM did not answer for every candidate crossing" }); continue; }
    keep = scored.filter(s => Math.abs(s.g - elev) <= tol).map(s => s.h);
    note = `${uniq.length} crossings, ${keep.length} within ${Math.round(tol)} ft of the claimed ${elev} ft`;
    if (keep.length !== 1) {
      ambiguous.push({ c, uniq, why: `${note} — refusing to choose`, detail: scored.map(s => `${s.h.lat.toFixed(5)},${s.h.lng.toFixed(5)} ground ${Math.round(s.g)} ft`) });
      continue;
    }
  }
  const pick = keep[0];
  const ground = await elevationAt(pick.lat, pick.lng);
  if (ground == null) { errored.push({ c, why: "DEM did not answer at the chosen crossing" }); continue; }
  // Duplicate gate against the live row.
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (m({ lat: +w[j].lat, lng: +w[j].lng }, pick) < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { ambiguous.push({ c, uniq, why: `the crossing lands on an existing pin: ${clash}` }); continue; }
  const elevOk = Number.isFinite(elev) && elev !== 0 ? Math.abs(ground - elev) <= Math.max(ELEV_FT, elev * ELEV_REL) : null;
  solved.push({ ...c, lat: pick.lat, lng: pick.lng, ground: Math.round(ground), note, elevOk });
}

const say = (t, n) => console.log(`\n${t} : ${n}`);
say("SOLVED   (a single mapped crossing, duplicate-checked)", solved.length);
for (const s of solved)
  console.log(`  ${s.route}[${s.i}] ${s.name}\n      ${s.water} x mapped way -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}   ${s.note}`
    + `\n      claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no elevation recorded)" : s.elevOk ? "AGREES" : "ELEVATION STILL WRONG"}`);
say("AMBIGUOUS (found crossings, refused to choose)", ambiguous.length);
for (const a of ambiguous) { console.log(`  ${a.c.route}[${a.c.i}] ${a.c.name} — ${a.why}`); (a.detail || []).forEach(d => console.log(`        ${d}`)); }
say("NO CROSSING FOUND", nothing.length);
for (const n of nothing) console.log(`  ${n.c.route}[${n.c.i}] ${n.c.name} — ${n.why}`);
say("COULD NOT ASK (unknown, NOT a negative)", errored.length);
for (const e of errored) console.log(`  ${e.c.route}[${e.c.i}] ${e.c.name} — ${e.why}`);

fs.writeFileSync(`${T}/ford-solved.json`, JSON.stringify(solved, null, 1));
if (!APPLY || !solved.length) { console.log(`\n-> ford-solved.json (${solved.length}). Dry run — nothing written.`); process.exit(0); }

const key = requireServiceKey();
const byRoute = {};
for (const s of solved) (byRoute[s.route] = byRoute[s.route] || []).push(s);
let wrote = 0, ok = 0;
for (const [id, edits] of Object.entries(byRoute)) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`, { headers: ro });
  const [row] = await r.json();
  if (!row) { console.log(`${id}: row vanished`); continue; }
  const wps = (row.waypoints || []).slice();
  let touched = 0;
  for (const e of edits) {
    if (!wps[e.i] || String(wps[e.i].name || "") !== String(e.name)) { console.log(`${id}[${e.i}]: waypoint changed underneath — refusing`); continue; }
    wps[e.i] = { ...wps[e.i], lat: +e.lat.toFixed(6), lng: +e.lng.toFixed(6) };
    touched++; wrote++;
  }
  if (!touched) continue;
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...headers(key), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ waypoints: wps })
  });
  const back = await pr.json();
  if (pr.ok && Array.isArray(back) && back.length === 1) ok++; else console.log(`FAILED ${id}: ${pr.status}`);
}
console.log(`\nPATCHed ${ok} route(s), ${wrote} pin(s). Re-reading through the ANON role…`);
let good = 0;
for (const s of solved) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints&id=eq.${encodeURIComponent(s.route)}`, { headers: ro });
  const [row] = await r.json();
  const w = (row.waypoints || [])[s.i] || {};
  if (Math.abs(+w.lat - +s.lat.toFixed(6)) < 1e-6 && Math.abs(+w.lng - +s.lng.toFixed(6)) < 1e-6) good++;
  else console.log(`MISMATCH ${s.route}[${s.i}]`);
}
console.log(`${good}/${solved.length} verified via anon`);
