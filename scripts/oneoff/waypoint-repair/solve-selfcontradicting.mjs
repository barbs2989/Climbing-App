// Can the pins that audit:waypoint-geometry --ground says are NOT PLACED be given a real coordinate?
//
// Category 2 proves a contradiction (two pins, one coordinate, elevations >100 ft apart) and
// --ground names which half is wrong. That is an attribution, not a repair: the losing pin still
// has no coordinate of its own, and inventing one is the defect this whole audit family exists to
// catch. #1211 widened the category 13 -> 20 findings and nobody re-ran the adjudication, so the 7
// new pairs had never been asked this question at all.
//
// Same gates as solve-gazetteer.mjs, and for the same reasons:
//   OFFSET     a name that is an offset FROM a feature is not the feature ("end of NF-77").
//   POINTLIKE  a label point cannot locate an EDGE. GNIS publishes one coordinate per feature; for
//              a Summit/Gap/Lake that coordinate IS the place, for a Ridge/Flat/Basin/Stream it is
//              a cartographic label somewhere along the length.
//   KIND       a structure noun the matched feature's name lacks means a different KIND of thing
//              standing near it (solve-saddles.mjs). Test the OBJECT, not the preposition.
//   CORRIDOR   a namesake elsewhere in the state is not this pin.
//   ELEV       the ground under the candidate must agree with the elevation the row already states.
//
// Read-only. Writes nothing; prints what a repair WOULD be, for a human to decide.
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const ro = headers(anonKey());
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";
const LAYERS = [5, 7, 3, 6];
const CORRIDOR_KM = 12, DUP_M = 30, ELEV_FLOOR_FT = 400, ELEV_FRAC = 0.08;

const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const OFFSET = /\b(above|below|beneath|under|near|beyond|between|past|toe of|base of|head of|foot of|side of|mouth of|north of|south of|east of|west of|end of|edge of|start of|top of|bottom of)\b/i;
const POINTLIKE = /^(Summit|Gap|Lake|Falls|Spring|Well|Dam|Locale|Post Office|Populated Place|Reservoir|Crossing|Bench|Pillar|Tower|Rock|Cliff|Island)$/i;
const KIND = /\b(crossing|junction|contour|bend|traverse|trail|ford|camp|bivy|step|rappel|gully|chimney|bowl|moraine|toe|fork|turn|switchback|bypass|ledge|shoulder|knob|basin|meadow|lake|creek|glacier|topout|base|wall|face|buttress|spire|formation|pullout|parking)\b/gi;

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
        for (const f of j.features || []) { const c = xy(f.geometry); if (c) out.push({ ...c, ...f.attributes, layer }); }
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
  const uniq = [];
  for (const h of all) if (!uniq.some(u => km(u, h) * 1000 < 50)) uniq.push(h);
  return { hits: uniq };
}
function askNames(raw) {
  const s = String(raw || "").trim();
  const out = [s.replace(/\s*\([^)]*\)\s*$/, "").trim()];
  if (!out.includes(s)) out.push(s);
  return [...new Set(out.filter(x => x.length > 3))];
}
const kinds = s => [...new Set(String(s).toLowerCase().match(KIND) || [])];

// The nine attributions from `npm run audit:waypoint-geometry -- --state wa --ground`.
// `loser` is the pin the GROUND says is not placed there — matched by NAME against the live row, so
// a reordered waypoints array cannot silently move the target.
const CASES = [
  { route: "wa_little_tahoma_east_shoulder", loser: "Summerland" },
  { route: "wa_j_tnar", loser: "Jötunheim Wall Topout (Middle Peak)" },
  { route: "wa_gato_negro", loser: "Whine Spire (Gato Negro topout)" },
  { route: "wa_bowling_alley_aka_regular_route", loser: "Pinto Rock base (end of NF-77)" },
  { route: "wa_cobbles_101", loser: "Pinto Rock base (end of NF-77)" },
  { route: "wa_ephemeral", loser: "Ice Box right side topout" },
  { route: "wa_ephemeral", loser: "Ice Box (right side) formation, Hairpin Crags" },
  { route: "wa_slippery_slab_tower_ne_face", loser: "Slippery Slab Tower NE Face Topout" },
  { route: "wa_slippery_slab_tower_ne_face", loser: "Slippery Slab Tower" },
];

const ids = [...new Set(CASES.map(c => c.route))];
const r0 = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: ro });
if (!r0.ok) { console.log("FAIL-CLOSED: routes read " + r0.status); process.exit(1); }
const rows = {}; for (const x of await r0.json()) rows[x.id] = x;
if (Object.keys(rows).length !== ids.length) { console.log(`FAIL-CLOSED: asked for ${ids.length} routes, got ${Object.keys(rows).length}`); process.exit(1); }

const areaIds = [...new Set(Object.values(rows).map(r => r.area_id).filter(Boolean))];
const r1 = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=in.(${areaIds.map(encodeURIComponent).join(",")})`, { headers: ro });
if (!r1.ok) { console.log("FAIL-CLOSED: areas read " + r1.status); process.exit(1); }
const areas = {}; for (const x of await r1.json()) areas[x.id] = x;

// CONTROL — the expected output of this solver is "a plausible coordinate", which is exactly what a
// broken one emits. Reproduce coordinates already known, through this exact path, or do not run.
console.log("CONTROL");
let ok = true;
for (const c of [{ name: "Mount Olympus", near: { lat: 47.80132, lng: -123.71063 } },
                 { name: "Royal Lake", near: { lat: 47.83202, lng: -123.21075 } }]) {
  const r = await lookup(c.name);
  if (r.err || !r.hits.length) { console.log(`  ${c.name}: ${r.err || "NO HIT"}`); ok = false; continue; }
  const d = km(r.hits[0], c.near) * 1000;
  console.log(`  ${c.name}: ${Math.round(d)} m from the known value [${r.hits[0].gaz_featureclass}]`);
  if (d > 200) ok = false;
}
if (!ok) { console.log("\nCONTROL FAILED — refusing to run the sweep."); process.exit(1); }

console.log("\nSWEEP — 9 pins the ground says are not placed where they sit\n");
const verdict = { solved: 0, refused: 0 };
for (const c of CASES) {
  const row = rows[c.route];
  const w = row.waypoints || [];
  const i = w.findIndex(p => String(p?.name || p?.label || "") === c.loser);
  if (i < 0) { console.log(`  SKIP    ${c.route} — no pin named ${JSON.stringify(c.loser)} (the row moved on)`); verdict.refused++; continue; }
  const pin = w[i];
  const hdr = `${c.route}  "${c.loser}"  (${pin.type}, ${pin.elev ?? "—"} ft)`;

  if (OFFSET.test(c.loser)) { console.log(`  REFUSE  ${hdr}\n          the name is an OFFSET from a feature, not the feature`); verdict.refused++; continue; }

  let hits = null, err = null;
  for (const a of askNames(c.loser)) { const r = await lookup(a); if (r.err) { err = r.err; break; } if (r.hits.length) { hits = r.hits; break; } }
  if (err) { console.log(`  ERROR   ${hdr}\n          ${err} — an outage must not read as "not in GNIS"`); verdict.refused++; continue; }
  if (!hits) { console.log(`  REFUSE  ${hdr}\n          no GNIS feature of that name in WA — a climbers' name, not a federal one`); verdict.refused++; continue; }

  const anch = [];
  const a = areas[row.area_id]; if (a && a.lat != null) anch.push({ lat: +a.lat, lng: +a.lng });
  w.forEach((p, j) => { if (j !== i && p && p.lat != null) anch.push({ lat: +p.lat, lng: +p.lng }); });
  const near = hits.filter(h => anch.some(x => km(x, h) <= CORRIDOR_KM));
  if (!near.length) {
    const best = Math.min(...hits.map(h => Math.min(...anch.map(x => km(x, h)))));
    console.log(`  REFUSE  ${hdr}\n          ${hits.length} GNIS hit(s), nearest ${best.toFixed(1)} km away — a namesake elsewhere`); verdict.refused++; continue;
  }
  if (near.length > 1) { console.log(`  REFUSE  ${hdr}\n          ${near.length} features of that name in the corridor — one match cannot be the wrong one of several`); verdict.refused++; continue; }

  const pick = near[0];
  if (!POINTLIKE.test(pick.gaz_featureclass || "")) {
    console.log(`  REFUSE  ${hdr}\n          GNIS class "${pick.gaz_featureclass}" is LINEAR/AREAL — its coordinate is a cartographic label, not the place`); verdict.refused++; continue;
  }
  const missing = kinds(c.loser).filter(k => !kinds(pick.gaz_name).includes(k));
  if (missing.length) {
    console.log(`  REFUSE  ${hdr}\n          matched "${pick.gaz_name}" but the pin names a ${missing.join("/")} that feature is not — a different KIND of thing standing near it`); verdict.refused++; continue;
  }
  let clash = null;
  for (let j = 0; j < w.length; j++) { if (j !== i && w[j]?.lat != null && km({ lat: +w[j].lat, lng: +w[j].lng }, pick) * 1000 < DUP_M) { clash = w[j].name; break; } }
  if (clash) { console.log(`  REFUSE  ${hdr}\n          lands on the existing pin "${clash}" — that is the contradiction again, not a fix`); verdict.refused++; continue; }

  const ground = await elevationAt(pick.lat, pick.lng);
  const elev = Number(pin.elev);
  const tol = Math.max(ELEV_FLOOR_FT, elev * ELEV_FRAC);
  if (!Number.isFinite(elev) || elev === 0 || ground == null) {
    console.log(`  REFUSE  ${hdr}\n          no stated elevation to corroborate against (ground ${ground ?? "unreadable"})`); verdict.refused++; continue;
  }
  if (Math.abs(ground - elev) > tol) {
    console.log(`  REFUSE  ${hdr}\n          "${pick.gaz_name}" sits on ground at ${Math.round(ground)} ft, the row states ${elev} — ${Math.round(Math.abs(ground - elev))} ft apart, over the ${Math.round(tol)} ft bar`); verdict.refused++; continue;
  }
  console.log(`  SOLVE   ${hdr}\n          "${pick.gaz_name}" [${pick.gaz_featureclass}, ${pick.county_name}] ${pick.lat.toFixed(5)},${pick.lng.toFixed(5)}`
    + `\n          ground ${Math.round(ground)} ft vs stated ${elev} ft (${Math.round(Math.abs(ground - elev))} apart)`
    + `\n          moves the pin ${(km({ lat: +pin.lat, lng: +pin.lng }, pick)).toFixed(2)} km off the coordinate it was copied onto`);
  verdict.solved++;
}
console.log(`\n${verdict.solved} solvable, ${verdict.refused} refused, of ${CASES.length}`);
console.log("The refusals ARE the result: a pin with no source stays where it is.");
