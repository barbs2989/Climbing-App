// For the 8 elevation disagreements whose solver provenance is gone (earlier passes, outputs not on
// this machine), decide the same question the provenance would have answered: IS THE COORDINATE
// FIXED BY A NAME?
//
//   fixed by a name  -> the position is settled independently of elevation, so a ground contradiction
//                       indicts the stored ELEVATION.
//   computed         -> the coordinate and the elevation come from the same act, so a contradiction
//                       indicts the COORDINATE. Leave both alone.
//
// This re-asks the authority at the coordinate the row now holds, rather than inferring the class
// from the pin's name. That is gate 6 -- the same test the repairs themselves were held to -- and it
// can come back NO, which inferring from a name cannot.
import fs from "fs";
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
const NEAR_M = 200;

const STOP = /\b(camp|campsite|bivy|the|a|an|of|at|to|and|on|in|junction|ford|crossing|trailhead)\b/gi;
const toks = s => String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(STOP, " ")
  .split(/[\s-]+/).filter(t => t.length >= 3);
function nameAgrees(a, b) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return false;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  return s.every(t => l.some(u => u.includes(t) || t.includes(u)));
}

async function osmNear(lat, lng) {
  const d = 0.01;
  const u = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${lng - d},${lat - d},${lng + d},${lat + d}`;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "climbmatch-waypoint-audit/1.0" }, signal: AbortSignal.timeout(120000) });
      if (r.ok) {
        const out = [];
        for (const e of (await r.json()).elements || []) {
          if (e.type !== "node" || !(e.tags || {}).name) continue;
          out.push({ name: e.tags.name, lat: e.lat, lng: e.lon, tags: e.tags });
        }
        return { list: out };
      }
      if (r.status === 509) await new Promise(s => setTimeout(s, 60000));
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 2000 * (a + 1)));
  }
  return { err: "could not ask OSM" };   // an unknown, never a negative
}
async function gnisNear(name) {
  const out = [];
  for (const L of [5, 7, 3]) {
    const where = `gaz_name='${String(name).replace(/'/g, "''")}' AND state_alpha='WA'`;
    const u = `https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/${L}/query?where=${encodeURIComponent(where)}&outFields=gaz_name&returnGeometry=true&outSR=4326&f=json`;
    try {
      const j = await (await fetch(u, { signal: AbortSignal.timeout(30000) })).json();
      for (const f of j.features || []) {
        const g = f.geometry;
        const c = Number.isFinite(g?.x) ? { lat: g.y, lng: g.x } : (g?.points?.[0] ? { lat: g.points[0][1], lng: g.points[0][0] } : null);
        if (c) out.push({ name: f.attributes.gaz_name, ...c });
      }
    } catch { /* a miss on one layer is not a negative overall */ }
  }
  return out;
}

const buckets = JSON.parse(fs.readFileSync(`${T}/confirmed-pin-elevations.json`, "utf8"));
const all = [...(buckets.off1000 || []), ...(buckets.off400 || [])];
// ONE rule over ALL 13. An earlier pass split them -- 4 decided from solver provenance, 8 from this
// re-query -- and two decision procedures for one question is how a wrong answer gets in through the
// weaker one. Provenance is the weaker one here: it says which script wrote the pin, not whether the
// coordinate is independently confirmable today. This asks the authority about every one of them.
const todo = all;

console.log(`re-asking the authority at ${todo.length} coordinate(s)\n`);
const confirmed = [], notConfirmed = [], couldNotAsk = [];
for (const p of todo) {
  const g = await gnisNear(p.name.replace(/\s*\([^)]*\)\s*$/, ""));
  const gHit = g.find(h => km(h, p) * 1000 <= NEAR_M);
  if (gHit) { confirmed.push({ ...p, by: `GNIS "${gHit.name}" ${Math.round(km(gHit, p) * 1000)} m away` }); continue; }
  const o = await osmNear(p.lat, p.lng);
  if (o.err) { couldNotAsk.push({ ...p, why: o.err }); continue; }
  const oHit = o.list.filter(h => nameAgrees(p.name, h.name)).map(h => ({ h, d: km(h, p) * 1000 })).filter(x => x.d <= NEAR_M).sort((a, b) => a.d - b.d)[0];
  if (oHit) confirmed.push({ ...p, by: `OSM "${oHit.h.name}" ${Math.round(oHit.d)} m away` });
  else notConfirmed.push({ ...p, near: o.list.length });
}

console.log(`  COORDINATE CONFIRMED by a name at that spot — the elevation is the defect : ${confirmed.length}`);
for (const c of confirmed) console.log(`  ${c.route}[${c.i}] ${c.name}\n      ${c.by}\n      stored ${c.elev} ft / ground ${c.ground} ft (${c.delta > 0 ? "+" : ""}${c.delta})`);
console.log(`\n  NOT confirmed — leave the row alone, both halves are in doubt : ${notConfirmed.length}`);
for (const n of notConfirmed) console.log(`  ${n.route}[${n.i}] ${n.name} — no matching named feature within ${NEAR_M} m (${n.near} named node(s) nearby)`);
console.log(`\n  COULD NOT ASK (unknown, NOT a negative) : ${couldNotAsk.length}`);
for (const c of couldNotAsk) console.log(`  ${c.route}[${c.i}] ${c.name} — ${c.why}`);

fs.writeFileSync(`${T}/elev-confirmed.json`, JSON.stringify(confirmed, null, 1));
console.log(`\n-> elev-confirmed.json (${confirmed.length}). Nothing written.`);
