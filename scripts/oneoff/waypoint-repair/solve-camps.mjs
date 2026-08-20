// SOLVE NAMED CAMPS FROM OSM. Same principle as the ford solver: locate the pin from a public record
// that names it, and let the machine decide.
//
// This class is 91 of the 795 pins still fabricated, and its tractability is already demonstrated --
// Graybeal Camp, Hardscrabble Horse Camp and Skagit Queen Camp were each confirmed by re-fetching an
// OSM record by id, at 0 m. Those three are this solver's CONTROL: it must reproduce them.
//
// WHY OVERPASS AND WHICH HOST. The main OSM API takes a bbox but cannot filter by tag, which over a
// route corridor is a large download per route. Overpass filters server-side. The host matters:
// `overpass.osm.ch` serves a SWITZERLAND-ONLY extract and answers Washington queries with
// `elements: []` and HTTP 200 -- an empty answer indistinguishable from "no camp is mapped here". It
// was recommended in three agent briefs before one command settled it. `overpass-api.de` is proven
// to return Washington data, and a CONTROL COUNT is printed per route so an empty corridor cannot
// pass silently as a negative result.
//
// GATES, in the order they run:
//   1. The OSM record's distinctive name tokens must all appear in the pin's name. Direction matters:
//      the pin may carry extra words ("Boston Basin HIGH Camp", "Luna Cirque high camp (near Lousy
//      Lake)"); the record may not carry words the pin lacks.
//   2. Several matches -> disambiguate on the DEM against the pin's CLAIMED ELEVATION, which is a
//      different field from the fabricated coordinate. Never on proximity to the pin being replaced.
//   3. Still several -> AMBIGUOUS, reported, not guessed.
//   4. Duplicate gate against the live row, 30 m, same as every other pass.
import fs from "fs";
import dns from "node:dns";
// overpass-api.de publishes AAAA records this machine cannot route. node resolves those first and
// every request died with UND_ERR_CONNECT_TIMEOUT / ETIMEDOUT while the identical query through curl
// returned data in seconds. That is the third distinct way this one endpoint has produced a false
// "nothing is mapped here" in this effort -- a Switzerland-only mirror, a mis-encoded POST body, and
// now address-family selection. None of the three looks like a failure from the caller's side.
dns.setDefaultResultOrder("ipv4first");
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const CANDS = (process.argv.find(a => a.startsWith("--candidates=")) || "--candidates=").slice(13);
const ro = headers(anonKey());
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const PAD_KM = 4, DUP_M = 30, ELEV_FT = 400, ELEV_REL = 0.08;
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

// Words that describe a camp without naming one. "High camp", "bivy", "camp" itself: if these were
// treated as distinctive, every camp in a corridor would match every camp pin.
const GENERIC = new Set(["camp", "camps", "campsite", "campground", "bivy", "bivouac", "high", "low",
  "upper", "lower", "the", "and", "near", "above", "below", "toe", "site", "hiker", "horse", "backcountry",
  "north", "south", "east", "west", "middle", "basin", "ridge", "creek", "lake", "glacier", "point"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const distinctive = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !GENERIC.has(t)));
function recordFitsPin(recName, pinName) {
  const A = distinctive(recName), B = distinctive(pinName);
  if (!A.size) return false;                 // record has no distinctive name of its own
  for (const t of A) if (!B.has(t)) return false;
  return true;
}

// THE MAIN OSM API, NOT OVERPASS -- and the reason is worth keeping, because Overpass is the obvious
// choice here and it cost several hours. It filters server-side, which is exactly what this wants,
// but in this environment it produced THREE different false "nothing is mapped here" results in a
// row: a Switzerland-only mirror answering Washington queries with `elements: []` and HTTP 200; a
// hand-built form body that left the query's regex characters unescaped and drew a flat 406; and
// finally an outright block after a handful of requests, since the host advertises two slots and
// counts retries against them. Each failure looked, from the caller's side, exactly like an empty
// valley. api.openstreetmap.org has no tag filter and a 50,000-node ceiling per call, so the corridor
// is TILED -- more bytes, but it answers, and it answers the same way every time.
const OSM_MAP = "https://api.openstreetmap.org/api/0.6/map.json";
const MAX_SQDEG = 0.15;                 // under the API's 0.25 limit, with room for a wide corridor
const CAMPY = e => (e.tags || {}).name &&
  (/^(camp_site|wilderness_hut|alpine_hut)$/.test((e.tags || {}).tourism || "") || (e.tags || {}).amenity === "shelter");

function tiles(env) {
  const w = env.xmax - env.xmin, h = env.ymax - env.ymin;
  const n = Math.max(1, Math.ceil(Math.sqrt((w * h) / MAX_SQDEG)));
  const out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    out.push({ xmin: env.xmin + (w * i) / n, xmax: env.xmin + (w * (i + 1)) / n,
               ymin: env.ymin + (h * j) / n, ymax: env.ymin + (h * (j + 1)) / n });
  return out;
}

async function camps(env) {
  let lastWhy = "?";
  const found = new Map();
  // A 400 from this endpoint is "you asked for too many nodes", not "your request is wrong" -- so it
  // is a signal to ask for LESS, not a failure. Treating it as an error is how a dense corridor turns
  // into a false "no camp is mapped here". Depth is capped so a genuinely malformed request cannot
  // recurse forever and must surface.
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
            if (!CAMPY(e)) continue;
            let lat = e.lat, lng = e.lon;
            if (lat == null && e.type === "way") {              // a camp mapped as an area: centroid
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
        if (r.status === 400 && depth < 4) {
          const mx = (t.xmin + t.xmax) / 2, my = (t.ymin + t.ymax) / 2;
          for (const q of [{ xmin: t.xmin, xmax: mx, ymin: t.ymin, ymax: my }, { xmin: mx, xmax: t.xmax, ymin: t.ymin, ymax: my },
                           { xmin: t.xmin, xmax: mx, ymin: my, ymax: t.ymax }, { xmin: mx, xmax: t.xmax, ymin: my, ymax: t.ymax }])
            if (!await tile(q, depth + 1)) return false;
          return true;
        }
        lastWhy = `HTTP ${r.status}${r.status === 400 ? " (still too large at max subdivision)" : ""}`;
        // 509 is "bandwidth limit exceeded" -- the corridor was never actually asked about, so it is
        // an unknown and not an absence. The first full run lost 35 of 91 pins to this and every one
        // was reported as "could not ask", which is the only reason they were recoverable: had they
        // been filed as "no camp is mapped here" the class would have looked exhausted at 15.
        if (r.status === 509) await new Promise(s => setTimeout(s, 60000));
      } catch (e) { lastWhy = `${e?.name}: ${e?.message}${e?.cause ? " <- " + (e.cause.code || e.cause.message) : ""}`; }
      await new Promise(s => setTimeout(s, 2000 * (a + 1)));
    }
    return false;
  }
  for (const t of tiles(env)) if (!await tile(t, 0)) return { err: `OSM map call failed for a corridor tile (last: ${lastWhy})` };
  return { list: [...found.values()] };
}

const cands = CANDS
  ? JSON.parse(fs.readFileSync(`${T}/${CANDS}`, "utf8"))
  : JSON.parse(fs.readFileSync(`${T}/remaining-classes.json`, "utf8")).campNamed;

const ids = [...new Set(cands.map(c => c.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const byRoute = {};
for (const c of cands) (byRoute[c.route] = byRoute[c.route] || []).push(c);

const solved = [], ambiguous = [], nothing = [], errored = [];
for (const [id, list] of Object.entries(byRoute)) {
  const w = (rows[id] || {}).waypoints || [];
  const pts = w.filter(p => p.lat != null).map(p => ({ lat: +p.lat, lng: +p.lng }));
  if (!pts.length) { for (const c of list) errored.push({ c, why: "route has no located pins to bound the search" }); continue; }
  const dLat = PAD_KM / 111, dLng = PAD_KM / (111 * Math.cos(pts[0].lat * rad));
  const env = { xmin: Math.min(...pts.map(p => p.lng)) - dLng, xmax: Math.max(...pts.map(p => p.lng)) + dLng,
                ymin: Math.min(...pts.map(p => p.lat)) - dLat, ymax: Math.max(...pts.map(p => p.lat)) + dLat };
  const got = await camps(env);
  if (got.err) { for (const c of list) errored.push({ c, why: got.err }); continue; }
  console.log(`[control] ${id}: OSM corridor sweep returned ${got.list.length} named camp/shelter record(s) in the corridor`);
  for (const c of list) {
    const hits = got.list.filter(x => recordFitsPin(x.name, c.name));
    if (!hits.length) { nothing.push({ c, why: `no mapped camp in the corridor whose name fits (corridor held ${got.list.length})` }); continue; }
    let keep = hits, note = `${hits.length} name match(es)`;
    const elev = Number(c.elev);
    if (hits.length > 1) {
      if (!Number.isFinite(elev) || elev === 0) { ambiguous.push({ c, why: `${hits.length} name matches and no elevation to choose between them`, detail: hits.map(h => `${h.name} ${h.id}`) }); continue; }
      const tol = Math.max(ELEV_FT, elev * ELEV_REL);
      const scored = [];
      for (const h of hits) scored.push({ h, g: await elevationAt(h.lat, h.lng) });
      if (scored.some(s => s.g == null)) { errored.push({ c, why: "DEM did not answer for every candidate" }); continue; }
      keep = scored.filter(s => Math.abs(s.g - elev) <= tol).map(s => s.h);
      note = `${hits.length} matches, ${keep.length} within ${Math.round(tol)} ft of the claimed ${elev} ft`;
      if (keep.length !== 1) { ambiguous.push({ c, why: `${note} — refusing to choose`, detail: scored.map(s => `${s.h.name} ${s.h.id} ground ${s.g == null ? "?" : Math.round(s.g)} ft`) }); continue; }
    }
    const pick = keep[0];
    const ground = await elevationAt(pick.lat, pick.lng);
    if (ground == null) { errored.push({ c, why: "DEM did not answer at the chosen record" }); continue; }
    let clash = null;
    for (let j = 0; j < w.length; j++) {
      if (j === c.i || w[j].lat == null) continue;
      if (m({ lat: +w[j].lat, lng: +w[j].lng }, pick) < DUP_M) { clash = w[j].name; break; }
    }
    if (clash) { ambiguous.push({ c, why: `the record lands on an existing pin: ${clash}` }); continue; }
    const elevOk = Number.isFinite(elev) && elev !== 0 ? Math.abs(ground - elev) <= Math.max(ELEV_FT, elev * ELEV_REL) : null;
    solved.push({ ...c, lat: pick.lat, lng: pick.lng, osm: pick.id, osmName: pick.name, ground: Math.round(ground), note, elevOk });
  }
}

const say = (t, n) => console.log(`\n${t} : ${n}`);
say("SOLVED   (one mapped camp fits the name, duplicate-checked)", solved.length);
for (const s of solved)
  console.log(`  ${s.route}[${s.i}] ${s.name}\n      OSM ${s.osm} "${s.osmName}" -> ${s.lat.toFixed(6)},${s.lng.toFixed(6)}   ${s.note}`
    + `\n      claims ${s.elev} ft / ground ${s.ground} ft  ${s.elevOk === null ? "(no elevation recorded)" : s.elevOk ? "AGREES" : "ELEVATION STILL WRONG"}`);
say("AMBIGUOUS (matched, refused to choose)", ambiguous.length);
for (const a of ambiguous) { console.log(`  ${a.c.route}[${a.c.i}] ${a.c.name} — ${a.why}`); (a.detail || []).forEach(d => console.log(`        ${d}`)); }
say("NO MAPPED CAMP FITS THE NAME", nothing.length);
for (const n of nothing) console.log(`  ${n.c.route}[${n.c.i}] ${n.c.name} — ${n.why}`);
say("COULD NOT ASK (unknown, NOT a negative)", errored.length);
for (const e of errored) console.log(`  ${e.c.route}[${e.c.i}] ${e.c.name} — ${e.why}`);

fs.writeFileSync(`${T}/camp-solved.json`, JSON.stringify(solved, null, 1));
if (!APPLY || !solved.length) { console.log(`\n-> camp-solved.json (${solved.length}). Dry run — nothing written.`); process.exit(0); }

const key = requireServiceKey();
const grp = {};
for (const s of solved) (grp[s.route] = grp[s.route] || []).push(s);
let wrote = 0, ok = 0;
for (const [id, edits] of Object.entries(grp)) {
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
