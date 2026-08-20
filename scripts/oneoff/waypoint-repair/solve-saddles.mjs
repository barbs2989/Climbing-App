// Locate named COLS, PASSES, NOTCHES and SADDLES from OpenStreetMap.
//
// WHY OSM AND NOT THE GAZETTEER. solve-gazetteer.mjs asked GNIS for all of these and got nothing,
// and a spot check confirmed the misses are real rather than a bug in the sweep: "Eye Col",
// "Y Notch", "Skyline Notch", "Ottohorn-Himmelhorn Col" are CLIMBERS' names. They live in guidebooks
// and in OSM, which the climbers themselves edit, and not in a federal gazetteer. The two GNIS hits
// in that bucket were a namesake 70 km away ("Red Pass") and an offset ("Williams Lake saddle").
//
// The DEM alternative was considered and is not this. A col between two named summits is genuinely
// computable -- it is the highest point on the lowest connecting path, a threshold/flood-fill problem
// -- but only ~5 distinct cols are of that shape, and the crude version of it is already recorded as
// a failure here: sampling the straight line between two summits landed 473 m off on a point that is
// not a saddle at all, because the ridge joining two peaks is not a straight line. Ask the cheap
// source first.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const OSM_MAP = "https://api.openstreetmap.org/api/0.6/map.json";
const MAX_SQDEG = 0.15;
const PAD_KM = 4, DUP_M = 30, CORRIDOR_KM = 10;
const ELEV_FLOOR_FT = 500, ELEV_FRAC = 0.08;

const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };

const OFFSET = /\b(above|below|beneath|under|near|beyond|between|past|toward|towards|approaching|en route|via|toe of|base of|head of|foot of|side of|mouth of|north of|south of|east of|west of|end of|edge of|start of|top of|bottom of|atop|up to|down to)\b/i;
// A NAME MATCH IS NOT AN IDENTITY MATCH, and prepositions are the weaker half of the test. The first
// run of this sweep matched 4 pins to named passes and every one denoted something AT or NEAR the
// pass: "Red Pass contour (~4,200 ft)" (the pass is at 5,389 ft), "Boundary Trail bend toward Apex
// Pass", "Boulder Creek crossing / Boulder Pass Trail junction" (5.24 km and 2,697 ft away), and
// "Glacier Gap crevasse crossing". Chasing prepositions would have caught one of the four. Test the
// OBJECT instead: if the pin name carries a STRUCTURE noun the matched feature's name does not, the
// pin is a different kind of thing standing near that feature.
//
// It is scoped to BORROWING a named feature's coordinate. It must NOT be applied to a solver that
// COMPUTES an intersection -- solve-junctions legitimately locates "X Trail / Y Trail junction" by
// intersecting the two trails, which is the junction itself and not a borrowed label. Checked
// against everything already applied: 0 would be refused.
const KIND = /\b(crossing|junction|contour|bend|traverse|trail|ford|camp|bivy|step|rappel|gully|chimney|bowl|moraine|toe|fork|turn|switchback|bypass|ledge|shoulder|knob|basin|meadow|lake|creek|glacier)\b/i;
function sameKind(pinName, featureName) {
  const a = (pinName.match(new RegExp(KIND, "gi")) || []).map(x => x.toLowerCase());
  const b = (featureName.match(new RegExp(KIND, "gi")) || []).map(x => x.toLowerCase());
  return a.filter(k => !b.includes(k));
}
const COLWORD = /\b(col|saddle|notch|pass|gap|divide)\b/i;
// A saddle in OSM. `natural=saddle` and `mountain_pass=yes` are the two tags in use; both must be
// NAMED, because an unnamed saddle cannot be matched to a named pin.
const SADDLE = e => (e.tags || {}).name &&
  ((e.tags || {}).natural === "saddle" || (e.tags || {}).mountain_pass === "yes" || (e.tags || {}).natural === "col");

// The landform word is interchangeable WITHIN this sweep and only within it: every candidate is
// already known to be a saddle, so "Eye Col" and "Eye Saddle" are the same place. Stripping it in a
// sweep that also held creeks would let "Cow Creek Pass" match "Cow Creek" -- the mistake the camp
// grader made when its stop-list swallowed real feature nouns.
const STOP = /\b(col|saddle|notch|pass|gap|divide|the|a|an|of|at|to|and|on|in)\b/gi;
const norm = s => String(s || "").toLowerCase().replace(/[‐-―]/g, "-")
  .replace(/[^a-z0-9\s-]/g, " ").replace(STOP, " ").replace(/[\s-]+/g, " ").trim();
const toks = s => norm(s).split(" ").filter(t => t.length >= 3);
// Every distinctive token of the shorter name must appear in the longer. A partial overlap is how a
// name match quietly becomes a different place.
function nameAgrees(a, b) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return false;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  return s.every(t => l.some(u => u.includes(t) || t.includes(u)));
}

function tiles(env) {
  const w = env.xmax - env.xmin, h = env.ymax - env.ymin;
  const n = Math.max(1, Math.ceil(Math.sqrt((w * h) / MAX_SQDEG)));
  const out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    out.push({ xmin: env.xmin + (w * i) / n, xmax: env.xmin + (w * (i + 1)) / n,
               ymin: env.ymin + (h * j) / n, ymax: env.ymin + (h * (j + 1)) / n });
  return out;
}

async function saddles(env) {
  let lastWhy = "?";
  const found = new Map();
  async function tile(t, depth) {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`${OSM_MAP}?bbox=${t.xmin},${t.ymin},${t.xmax},${t.ymax}`,
          { headers: { "User-Agent": "climbmatch-waypoint-audit/1.0" }, signal: AbortSignal.timeout(150000) });
        if (r.ok) {
          for (const e of (await r.json()).elements || []) {
            if (e.type !== "node" || !SADDLE(e)) continue;
            found.set(`node/${e.id}`, { id: `node/${e.id}`, name: e.tags.name, lat: e.lat, lng: e.lon, tags: e.tags });
          }
          return true;
        }
        if (r.status === 400 && depth < 4) {            // "ask for less", not "bad request"
          const mx = (t.xmin + t.xmax) / 2, my = (t.ymin + t.ymax) / 2;
          for (const q of [{ xmin: t.xmin, xmax: mx, ymin: t.ymin, ymax: my }, { xmin: mx, xmax: t.xmax, ymin: t.ymin, ymax: my },
                           { xmin: t.xmin, xmax: mx, ymin: my, ymax: t.ymax }, { xmin: mx, xmax: t.xmax, ymin: my, ymax: t.ymax }])
            if (!await tile(q, depth + 1)) return false;
          return true;
        }
        lastWhy = `HTTP ${r.status}`;
        if (r.status === 509) await new Promise(s => setTimeout(s, 60000));   // never asked != absent
      } catch (e) { lastWhy = `${e?.name}: ${e?.message}`; }
      await new Promise(s => setTimeout(s, 2000 * (a + 1)));
    }
    return false;
  }
  for (const t of tiles(env)) if (!await tile(t, 0)) return { err: `OSM map call failed (last: ${lastWhy})` };
  return { list: [...found.values()] };
}

// ---- CONTROL --------------------------------------------------------------------------------
// Expected output is a plausible coordinate, which is what a broken solver emits. Cascade Pass is
// one of the best-known passes in the North Cascades; if the sweep cannot see it, it can see nothing.
console.log("CONTROL");
const cc = await saddles({ xmin: -121.10, xmax: -120.95, ymin: 48.44, ymax: 48.52 });
if (cc.err) { console.log(`  Cascade Pass corridor: ${cc.err}\n\nCONTROL FAILED — refusing to sweep.`); process.exit(1); }
const hit = cc.list.find(s => /cascade/i.test(s.name));
console.log(`  saddles/passes found in the Cascade Pass corridor : ${cc.list.length}`);
cc.list.slice(0, 6).forEach(s => console.log(`     ${s.name}  ${s.lat.toFixed(5)},${s.lng.toFixed(5)}  ${JSON.stringify(s.tags).slice(0, 90)}`));
if (!hit) { console.log("\n  Cascade Pass itself was NOT returned — the predicate or the tiling is wrong.\nCONTROL FAILED."); process.exit(1); }
console.log(`  Cascade Pass -> ${hit.lat.toFixed(5)},${hit.lng.toFixed(5)}   control OK\n`);

// ---- candidates -----------------------------------------------------------------------------
const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const originElev = new Map();
for (const r of fab) for (const p of r.pins) originElev.set(`${r.id}#${p.i}`, p.elev);

let rows = [], from = "";
for (;;) {
  const u = `${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&waypoints=not.is.null&order=id.asc&limit=1000`
    + (from ? `&id=gt.${encodeURIComponent(from)}` : "");
  const r = await fetch(u, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  const page = await r.json();
  if (!page.length) break;
  rows.push(...page); from = page[page.length - 1].id;
  if (page.length < 1000) break;
}
if (!rows.length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const areaIds = [...new Set(rows.map(r => r.area_id).filter(Boolean))];
const areas = {};
for (let i = 0; i < areaIds.length; i += 40) {
  const b = areaIds.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED: areas " + r.status); process.exit(1); }
  for (const x of await r.json()) areas[x.id] = x;
}

const cands = [];
for (const r of rows) (r.waypoints || []).forEach((p, i) => {
  if (!p || p.lat == null) return;
  if (Math.max(dec(p.lat), dec(p.lng)) <= 8) return;          // not an arithmetic coordinate
  const nm = String(p.name || "");
  if (!COLWORD.test(nm) || OFFSET.test(nm)) return;           // an offset names a place RELATIVE to one
  if (!toks(nm).length) return;                               // nothing distinctive to match on
  cands.push({ route: r.id, i, name: nm, type: p.type, elev: originElev.get(`${r.id}#${i}`) ?? p.elev, lat: +p.lat, lng: +p.lng });
});
console.log(`candidate col/pass/notch pins (arithmetic coordinate, named, not an offset) : ${cands.length}\n`);

const solved = [], noMatch = [], ambiguous = [], dup = [], errs = [], kindMismatch = [];
const byRoute = new Map();
for (const c of cands) { if (!byRoute.has(c.route)) byRoute.set(c.route, []); byRoute.get(c.route).push(c); }

for (const [routeId, list] of byRoute) {
  const row = byId[routeId];
  const w = row.waypoints || [];
  const pts = w.filter(p => p && p.lat != null).map(p => ({ lat: +p.lat, lng: +p.lng }));
  const a = areas[row.area_id];
  if (a && a.lat != null) pts.push({ lat: +a.lat, lng: +a.lng });
  if (!pts.length) { list.forEach(c => errs.push({ c, err: "no coordinate to build a corridor from" })); continue; }
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = { xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
                ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat };
  const res = await saddles(env);
  if (res.err) { list.forEach(c => errs.push({ c, err: res.err })); continue; }

  for (const c of list) {
    const near = res.list.filter(s => nameAgrees(c.name, s.name));
    if (!near.length) { noMatch.push({ c, corridor: res.list.length }); continue; }
    const inCorridor = near.filter(s => pts.some(p => km(p, s) <= CORRIDOR_KM));
    if (!inCorridor.length) { noMatch.push({ c, corridor: res.list.length, why: "matched only outside the corridor" }); continue; }
    if (inCorridor.length > 1) { ambiguous.push({ c, n: inCorridor.length, names: inCorridor.map(s => `${s.name} ${s.lat.toFixed(5)},${s.lng.toFixed(5)}`) }); continue; }
    const pick = inCorridor[0];
    const extra = sameKind(c.name, pick.name);
    if (extra.length) { kindMismatch.push({ c, osmName: pick.name, extra, movedKm: +km({ lat: c.lat, lng: c.lng }, pick).toFixed(2) }); continue; }
    let clash = null;
    for (let j = 0; j < w.length; j++) {
      if (j === c.i || !w[j] || w[j].lat == null) continue;
      if (km({ lat: +w[j].lat, lng: +w[j].lng }, pick) * 1000 < DUP_M) { clash = w[j].name; break; }
    }
    if (clash) { dup.push({ c, clash }); continue; }
    const ground = await elevationAt(pick.lat, pick.lng);
    const elev = Number(c.elev);
    const elevOk = Number.isFinite(elev) && elev !== 0 && ground != null
      ? Math.abs(ground - elev) <= Math.max(ELEV_FLOOR_FT, elev * ELEV_FRAC) : null;
    solved.push({ route: c.route, i: c.i, name: c.name, osm: pick.id, osmName: pick.name,
      lat: pick.lat, lng: pick.lng, elev, ground: ground == null ? null : Math.round(ground), elevOk,
      movedKm: +km({ lat: c.lat, lng: c.lng }, pick).toFixed(2) });
  }
}

console.log(`  MATCHED a named OSM saddle : ${solved.length}`);
for (const s of solved) console.log(`  ${s.route}[${s.i}] ${s.name}\n      OSM ${s.osm} "${s.osmName}" -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}  (moves ${s.movedKm} km)`
  + `\n      claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no comparison)" : s.elevOk ? "AGREES" : "ELEVATION DISAGREES"}`);
console.log(`\n  ambiguous : ${ambiguous.length}`);
for (const x of ambiguous) { console.log(`  ${x.c.route}[${x.c.i}] ${x.c.name} — ${x.n} matches`); x.names.forEach(n => console.log(`        ${n}`)); }
console.log(`\n  REFUSED — the pin is a different KIND of thing standing near the match : ${kindMismatch.length}`);
for (const k of kindMismatch) console.log(`  ${k.c.route}[${k.c.i}] "${k.c.name}"\n      matched "${k.osmName}" ${k.movedKm} km away — the pin is a ${k.extra.join("/")}, which that feature is not`);
console.log(`\n  lands on an existing pin : ${dup.length}`);
for (const d of dup) console.log(`  ${d.c.route}[${d.c.i}] ${d.c.name} — clashes with "${d.clash}"`);
console.log(`\n  no named OSM saddle fits : ${noMatch.length}`);
for (const n of noMatch.slice(0, 40)) console.log(`  ${n.c.route}[${n.c.i}] ${n.c.name} — corridor held ${n.corridor} named saddle(s)${n.why ? "; " + n.why : ""}`);
if (noMatch.length > 40) console.log(`  … ${noMatch.length - 40} more`);
console.log(`\n  COULD NOT ASK (unknown, NOT a negative) : ${errs.length}`);
for (const e of errs.slice(0, 20)) console.log(`  ${e.c.route}[${e.c.i}] ${e.c.name} — ${e.err}`);

fs.writeFileSync(`${T}/saddle-solved.json`, JSON.stringify(solved, null, 1));
console.log(`\n-> saddle-solved.json (${solved.length}). Dry run — nothing written.`);
