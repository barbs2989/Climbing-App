// The 26 trailheads neither their own route nor the rest of the catalog could supply, looked up in
// OSM. Same corridor sweep as the camp solver, different tags: OSM marks these as
// highway=trailhead, information=trailhead, or a NAMED amenity=parking at a trail's start.
//
// A trailhead is waypoint [0] on almost every one of these routes -- where you park, and the pin a
// climber actually navigates to before anything else. It is the one worth the extra pass.
//
// THE NAMESAKE GATE APPLIES HERE TOO, and harder than for camps, because trailhead names repeat
// across the state far more than camp names do. A matched record must also lie within reach of THIS
// route's own summit; that is a fact about this row and no OSM record can supply it.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const PAD_KM = 4, DUP_M = 30, MAX_APPROACH_KM = 35;
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const GENERIC = new Set(["trailhead", "trail", "head", "parking", "lot", "pullout", "north", "south",
  "east", "west", "upper", "lower", "the", "and", "access", "road", "put", "boat", "dock", "milepost",
  "mile", "exit", "campground", "junction", "roadside", "washout", "end", "area", "site", "no"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const key = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !GENERIC.has(t)));
function fits(recName, pinName) {
  const A = key(recName), B = key(pinName);
  if (!A.size) return false;
  for (const t of A) if (!B.has(t)) return false;   // every distinctive token of the RECORD is in the pin
  return true;
}

const OSM_MAP = "https://api.openstreetmap.org/api/0.6/map.json";
const MAX_SQDEG = 0.15;
const THISH = e => {
  const t = e.tags || {};
  if (!t.name) return false;
  return t.highway === "trailhead" || t.information === "trailhead"
    || (t.amenity === "parking" && /trail|climber|hiker/i.test(`${t.name} ${t.access || ""} ${t.description || ""}`))
    || t.tourism === "information" && t.information === "trailhead";
};
function tiles(env) {
  const w = env.xmax - env.xmin, h = env.ymax - env.ymin;
  const n = Math.max(1, Math.ceil(Math.sqrt((w * h) / MAX_SQDEG)));
  const out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    out.push({ xmin: env.xmin + (w * i) / n, xmax: env.xmin + (w * (i + 1)) / n,
               ymin: env.ymin + (h * j) / n, ymax: env.ymin + (h * (j + 1)) / n });
  return out;
}
async function sweep(env) {
  let lastWhy = "?";
  const found = new Map();
  async function tile(t, depth) {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`${OSM_MAP}?bbox=${t.xmin},${t.ymin},${t.xmax},${t.ymax}`,
          { headers: { "User-Agent": "climbmatch-waypoint-audit/1.0" }, signal: AbortSignal.timeout(150000) });
        if (r.ok) {
          const els = (await r.json()).elements || [];
          const node = new Map();
          for (const e of els) if (e.type === "node") node.set(e.id, e);
          for (const e of els) {
            if (!THISH(e)) continue;
            let lat = e.lat, lng = e.lon;
            if (lat == null && e.type === "way") {
              const pts = (e.nodes || []).map(id => node.get(id)).filter(Boolean);
              if (!pts.length) continue;
              lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
              lng = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
            }
            if (lat == null) continue;
            found.set(`${e.type}/${e.id}`, { id: `${e.type}/${e.id}`, name: e.tags.name, lat, lng, tags: e.tags });
          }
          return true;
        }
        if (r.status === 400 && depth < 4) {   // "too many nodes" -> ask for less, not an error
          const mx = (t.xmin + t.xmax) / 2, my = (t.ymin + t.ymax) / 2;
          for (const q of [{ xmin: t.xmin, xmax: mx, ymin: t.ymin, ymax: my }, { xmin: mx, xmax: t.xmax, ymin: t.ymin, ymax: my },
                           { xmin: t.xmin, xmax: mx, ymin: my, ymax: t.ymax }, { xmin: mx, xmax: t.xmax, ymin: my, ymax: t.ymax }])
            if (!await tile(q, depth + 1)) return false;
          return true;
        }
        lastWhy = `HTTP ${r.status}`;
        // 509 = bandwidth limit. The corridor was never asked about, so it is an unknown and not an
        // absence; the first camp run lost 35 of 91 pins to this. Back off properly rather than
        // burning the three attempts inside a few seconds.
        if (r.status === 509) await new Promise(s => setTimeout(s, 60000));
      } catch (e) { lastWhy = `${e?.name}: ${e?.cause?.code || e?.message}`; }
      await new Promise(s => setTimeout(s, 2000 * (a + 1)));
    }
    return false;
  }
  for (const t of tiles(env)) if (!await tile(t, 0)) return { err: `OSM map call failed (last: ${lastWhy})` };
  return { list: [...found.values()] };
}

const B = JSON.parse(fs.readFileSync(`${T}/remaining-classes.json`, "utf8"));
const all = [].concat(B.ford, B.twoNamedWays, B.campNamed, B.gnisNamed, B.descriptive);
const TH = /\b(trailhead|parking|pullout|put-?in|road end|trail ?head)\b/i;
const solvedAlready = new Set([
  ...JSON.parse(fs.readFileSync(`${T}/trailhead-inrow.json`, "utf8")).map(x => `${x.route}#${x.i}`),
  ...JSON.parse(fs.readFileSync(`${T}/trailhead-sibling.json`, "utf8")).map(x => `${x.route}#${x.i}`),
]);
const cands = all.filter(x => TH.test(x.name) && !solvedAlready.has(`${x.route}#${x.i}`));

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
  const row = rows[c.route] || {};
  const w = row.waypoints || [];
  const pin = w[c.i];
  if (!pin) { errored.push({ c, why: "waypoint missing" }); continue; }
  const pts = w.filter(p => p.lat != null).map(p => ({ lat: +p.lat, lng: +p.lng }));
  if (!pts.length) { errored.push({ c, why: "no located pins to bound the search" }); continue; }
  const s = w.find(p => String(p.type || "") === "Summit" && p.lat != null);
  const summit = s ? { lat: +s.lat, lng: +s.lng } : null;
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = { xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
                ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat };
  const got = await sweep(env);
  if (got.err) { errored.push({ c, why: got.err }); continue; }
  console.log(`[control] ${c.route}: ${got.list.length} named trailhead/parking record(s) in the corridor`);
  let hits = got.list.filter(x => fits(x.name, c.name));
  if (!hits.length) { nothing.push({ c, why: `no mapped trailhead whose name fits (corridor held ${got.list.length})` }); continue; }
  if (summit) {
    const near = hits.filter(h => km(h, summit) <= MAX_APPROACH_KM);
    if (!near.length) { ambiguous.push({ c, why: `every match is >${MAX_APPROACH_KM} km from this route's summit — a namesake` }); continue; }
    hits = near;
  }
  if (hits.length > 1) { ambiguous.push({ c, why: `${hits.length} matches`, detail: hits.map(h => `${h.name} ${h.id}`) }); continue; }
  const pick = hits[0];
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (km({ lat: +w[j].lat, lng: +w[j].lng }, pick) * 1000 < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { ambiguous.push({ c, why: `lands on an existing pin: ${clash}` }); continue; }
  const ground = await elevationAt(pick.lat, pick.lng);
  const elev = Number(c.elev);
  const elevOk = Number.isFinite(elev) && elev !== 0 && ground != null ? Math.abs(ground - elev) <= Math.max(400, elev * 0.08) : null;
  solved.push({ ...c, lat: pick.lat, lng: pick.lng, osm: pick.id, osmName: pick.name,
    ground: ground == null ? null : Math.round(ground), elevOk,
    movesKm: +km({ lat: +pin.lat, lng: +pin.lng }, pick).toFixed(2) });
}

const say = (t, n) => console.log(`\n${t} : ${n}`);
say("SOLVED", solved.length);
for (const s of solved) console.log(`  ${s.route}[${s.i}] ${s.name}\n      OSM ${s.osm} "${s.osmName}" -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)} (moves ${s.movesKm} km)`
  + `\n      claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no comparison)" : s.elevOk ? "AGREES" : "ELEVATION STILL WRONG"}`);
say("AMBIGUOUS", ambiguous.length);
for (const a of ambiguous) { console.log(`  ${a.c.route}[${a.c.i}] ${a.c.name} — ${a.why}`); (a.detail || []).forEach(d => console.log(`        ${d}`)); }
say("NOT MAPPED BY NAME", nothing.length);
for (const n of nothing) console.log(`  ${n.c.route}[${n.c.i}] ${n.c.name} — ${n.why}`);
say("COULD NOT ASK", errored.length);
for (const e of errored) console.log(`  ${e.c.route}[${e.c.i}] ${e.c.name} — ${e.why}`);
fs.writeFileSync(`${T}/trailhead-osm.json`, JSON.stringify(solved, null, 1));
console.log(`\n-> trailhead-osm.json (${solved.length})`);
