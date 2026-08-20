// Resolve still-fabricated waypoints against the GNIS gazetteer -- properly this time.
//
// WHY THIS EXISTS. probe-gnis-classD.mjs concluded that the class-D names were not in GNIS. It was
// reading `f.geometry.y` on every layer, and layer 5 (Landforms) does not return `{x,y}` -- it
// returns `{points:[[x,y]]}`. So every landform hit came back undefined, and the probe CRASHED on
// the first one ("Spider Meadow") after printing three "(not in GNIS)" lines. The verdict for the
// class came from a run that stopped four names in. Layer 5 is exactly where passes, basins,
// ridges, notches and summits live, i.e. most of what class D is made of.
//
// Same shape as every other false negative in this repo: a wrong column, a group layer, an
// unescaped body. The endpoint answered; the reader could not hear it.
//
// EVIDENCE, then GATES. A gazetteer match is a claim that a NAME denotes a PLACE. It is only
// evidence about THIS pin if the place is on this route, at the height the row claims, and the pin
// is not merely named relative to it.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";
const LAYERS = [5, 7, 3, 6];               // Landforms, Other Hydrographic, Populated Places, Streams(Mouth)
const CORRIDOR_KM = 12;                    // a named feature on THIS route, not its namesake elsewhere
const DUP_M = 30;
const ELEV_FLOOR_FT = 400, ELEV_FRAC = 0.08;

const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

// A name can be an OFFSET from a feature rather than the feature. "Campsite below Tungsten Creek
// ford" is not the ford. Writing the feature's coordinate there is worse than leaving it fabricated:
// a fabricated pin looks odd, a real ford standing in for the camp beside it reads as data.
const OFFSET = /\b(above|below|beneath|under|near|beyond|between|past|toe of|base of|head of|foot of|side of|mouth of|north of|south of|east of|west of|end of|edge of|start of|top of|bottom of)\b/i;

// BOTH geometry shapes. This is the whole point of the rewrite.
function xy(g) {
  if (!g) return null;
  if (Number.isFinite(g.x) && Number.isFinite(g.y)) return { lat: g.y, lng: g.x };
  const p = g.points && g.points[0];
  if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return { lat: p[1], lng: p[0] };
  return null;
}

async function gnis(layer, name) {
  const where = `gaz_name='${name.replace(/'/g, "''")}' AND state_alpha='WA'`;
  const u = `${GNIS}/${layer}/query?where=${encodeURIComponent(where)}`
    + `&outFields=gaz_id,gaz_name,gaz_featureclass,county_name&returnGeometry=true&outSR=4326&f=json`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        const j = await r.json();
        if (j.error) return { err: j.error.message || String(j.error.code) };
        const out = [];
        for (const f of j.features || []) {
          const c = xy(f.geometry);
          if (c) out.push({ ...c, ...f.attributes, layer });
        }
        return { hits: out };
      }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 700 * (t + 1)));
  }
  return { err: "no answer after 3 attempts" };
}

async function lookup(name) {
  const all = [];
  for (const L of LAYERS) {
    const r = await gnis(L, name);
    if (r.err) return { err: `layer ${L}: ${r.err}` };   // an outage must not read as "not in GNIS"
    all.push(...r.hits);
  }
  // one physical feature can be listed on two layers; merge anything co-located
  const uniq = [];
  for (const h of all) if (!uniq.some(u => km(u, h) * 1000 < 50)) uniq.push(h);
  return { hits: uniq };
}

// What NAME should be asked of the gazetteer? Conservative on purpose -- an exact gazetteer name is
// strong evidence and a fuzzy one is how this class writes wrong data. Only two candidate forms:
// the name as written, and the name with a trailing parenthetical dropped.
function askNames(raw) {
  const s = String(raw || "").trim();
  const out = [s.replace(/\s*\([^)]*\)\s*$/, "").trim()];
  if (!out.includes(s)) out.push(s);
  return [...new Set(out.filter(x => x.length > 3))];
}

// ---- load: originals, live rows, route anchor ------------------------------------------------
const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const ids = fab.map(r => r.id);
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED: routes read " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty routes read"); process.exit(1); }

const areaIds = [...new Set(fab.map(r => r.area_id).filter(Boolean))];
const areas = {};
for (let i = 0; i < areaIds.length; i += 40) {
  const b = areaIds.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED: areas read " + r.status); process.exit(1); }
  for (const x of await r.json()) areas[x.id] = x;
}

const origin = new Map();
for (const r of fab) for (const p of r.pins) origin.set(`${r.id}#${p.i}`, { lat: +p.lat, lng: +p.lng });
const stillFab = (routeId, i, live) => {
  const o = origin.get(`${routeId}#${i}`);
  return o && Math.abs(+live.lat - o.lat) <= 1e-9 && Math.abs(+live.lng - o.lng) <= 1e-9;
};

// The corridor is built from records this pin did NOT write: the peak's own areas row, plus any
// waypoint on the route that is no longer fabricated.
function anchors(routeId) {
  const row = rows[routeId] || {};
  const out = [];
  const a = areas[row.area_id];
  if (a && a.lat != null) out.push({ lat: +a.lat, lng: +a.lng, what: `peak ${a.name}` });
  (row.waypoints || []).forEach((p, i) => {
    if (p && p.lat != null && !stillFab(routeId, i, p)) out.push({ lat: +p.lat, lng: +p.lng, what: `pin "${p.name}"` });
  });
  return out;
}

// ---- CONTROL: reproduce coordinates that are already known, through this exact path -------------
const CONTROLS = [
  { name: "Mount Olympus", near: { lat: 47.80132, lng: -123.71063 } },
  { name: "Royal Lake", near: { lat: 47.83202, lng: -123.21075 } },
  { name: "Spider Meadow", near: null },
];
console.log("CONTROL (a solver's expected output is a plausible coordinate, which is what a broken one emits)");
let controlOk = true;
for (const c of CONTROLS) {
  const r = await lookup(c.name);
  if (r.err) { console.log(`  ${c.name}: ERROR ${r.err}`); controlOk = false; continue; }
  if (!r.hits.length) { console.log(`  ${c.name}: NO HIT -- the reader is still deaf`); controlOk = false; continue; }
  const h = r.hits[0];
  const d = c.near ? km(h, c.near) * 1000 : null;
  console.log(`  ${c.name}: ${r.hits.length} hit(s), first ${h.lat.toFixed(5)},${h.lng.toFixed(5)} [${h.gaz_featureclass}]`
    + (d == null ? "" : `  ${Math.round(d)} m from the known value`));
  if (d != null && d > 200) controlOk = false;
}
if (!controlOk) { console.log("\nCONTROL FAILED -- refusing to run the sweep."); process.exit(1); }
console.log("");

// ---- sweep ------------------------------------------------------------------------------------
const solved = [], offset = [], noHit = [], ambiguous = [], outOfCorridor = [], dup = [], errs = [], unnamed = [];
for (const route of fab) {
  const row = rows[route.id];
  if (!row) continue;
  const w = row.waypoints || [];
  const anch = anchors(route.id);
  for (const pin of route.pins) {
    const live = w[pin.i];
    if (!live || live.lat == null) continue;
    if (!stillFab(route.id, pin.i, live)) continue;              // already repaired
    const nm = String(live.name || "");
    if (!nm || nm.length < 4) { unnamed.push({ route: route.id, i: pin.i, name: nm }); continue; }
    if (OFFSET.test(nm)) { offset.push({ route: route.id, i: pin.i, name: nm }); continue; }

    let hits = null, err = null;
    for (const ask of askNames(nm)) {
      const r = await lookup(ask);
      if (r.err) { err = r.err; break; }
      if (r.hits.length) { hits = r.hits.map(h => ({ ...h, asked: ask })); break; }
    }
    if (err) { errs.push({ route: route.id, i: pin.i, name: nm, err }); continue; }
    if (!hits) { noHit.push({ route: route.id, i: pin.i, name: nm }); continue; }

    if (!anch.length) { outOfCorridor.push({ route: route.id, i: pin.i, name: nm, why: "no anchor to judge against" }); continue; }
    const near = hits.filter(h => anch.some(a => km(a, h) <= CORRIDOR_KM));
    if (!near.length) {
      const best = Math.min(...hits.map(h => Math.min(...anch.map(a => km(a, h)))));
      outOfCorridor.push({ route: route.id, i: pin.i, name: nm, why: `${hits.length} GNIS hit(s), nearest ${best.toFixed(1)} km from any anchor -- namesake` });
      continue;
    }
    if (near.length > 1) { ambiguous.push({ route: route.id, i: pin.i, name: nm, n: near.length }); continue; }

    const pick = near[0];
    let clash = null;
    for (let j = 0; j < w.length; j++) {
      if (j === pin.i || !w[j] || w[j].lat == null) continue;
      if (km({ lat: +w[j].lat, lng: +w[j].lng }, pick) * 1000 < DUP_M) { clash = w[j].name; break; }
    }
    if (clash) { dup.push({ route: route.id, i: pin.i, name: nm, clash }); continue; }

    const ground = await elevationAt(pick.lat, pick.lng);
    const elev = Number(pin.elev);
    const elevOk = Number.isFinite(elev) && elev !== 0 && ground != null
      ? Math.abs(ground - elev) <= Math.max(ELEV_FLOOR_FT, elev * ELEV_FRAC) : null;
    const moved = km({ lat: +live.lat, lng: +live.lng }, pick);
    solved.push({ route: route.id, i: pin.i, name: nm, asked: pick.asked, lat: pick.lat, lng: pick.lng,
      gaz_id: pick.gaz_id, cls: pick.gaz_featureclass, county: pick.county_name, layer: pick.layer,
      elev, ground: ground == null ? null : Math.round(ground), elevOk, movedKm: +moved.toFixed(2) });
  }
}

const still = fab.reduce((s, r) => s + r.pins.filter(p => {
  const live = ((rows[r.id] || {}).waypoints || [])[p.i];
  return live && live.lat != null && stillFab(r.id, p.i, live);
}).length, 0);

console.log(`still-fabricated pins examined : ${still}\n`);
console.log(`  RESOLVED by gazetteer : ${solved.length}`);
for (const s of solved) console.log(`  ${s.route}[${s.i}] ${s.name}`
  + `\n      GNIS ${s.gaz_id} "${s.asked}" [${s.cls}, ${s.county} Co, layer ${s.layer}] -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}  (moves ${s.movedKm} km)`
  + `\n      claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no comparison)" : s.elevOk ? "AGREES" : "ELEVATION DISAGREES"}`);
console.log(`\n  ambiguous, several in corridor : ${ambiguous.length}`);
for (const a of ambiguous) console.log(`  ${a.route}[${a.i}] ${a.name} -- ${a.n} candidates`);
console.log(`\n  namesake / outside the corridor : ${outOfCorridor.length}`);
for (const o of outOfCorridor.slice(0, 25)) console.log(`  ${o.route}[${o.i}] ${o.name} -- ${o.why}`);
console.log(`\n  lands on an existing pin : ${dup.length}`);
for (const d of dup) console.log(`  ${d.route}[${d.i}] ${d.name} -- clashes with "${d.clash}"`);
console.log(`\n  OFFSET name, refused : ${offset.length}`);
console.log(`  not in GNIS : ${noHit.length}`);
console.log(`  unnamed : ${unnamed.length}`);
console.log(`  COULD NOT ASK (unknown, NOT a negative) : ${errs.length}`);
for (const e of errs.slice(0, 15)) console.log(`  ${e.route}[${e.i}] ${e.name} -- ${e.err}`);

fs.writeFileSync(`${T}/gazetteer-solved.json`, JSON.stringify(solved, null, 1));
console.log(`\n-> gazetteer-solved.json (${solved.length}). Dry run -- nothing written.`);
