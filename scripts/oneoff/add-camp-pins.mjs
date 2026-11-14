// PIN EVERY CAMP THAT CAN BE PINNED HONESTLY — the repair half of audit:camp-pins.
//
// Owner note, 2026-10-25: "Are all campgrounds waypoints there and on the route track for all
// routes? Audit all routes and add those." audit:camp-pins found 1,028 camps listed under CAMPING &
// BIVY with no pin behind them, and 48 pins with no coordinate that the panel still stamps "Marked
// on the track". This places a pin for each one it can PROVE, and lists the rest.
//
// A COORDINATE IS NEVER COMPUTED HERE. This catalog has already repaired 427 pins that were
// interpolated on a line (fabricated-waypoint-pins hub), so nothing is snapped onto a track,
// spaced between two pins, or derived from a height. A pin comes from exactly one of these records:
//   OFFICIAL   a named camp point published by the land manager (NPS wilderness camps, USFS
//              recreation sites — run dir/official/*.json), matched on the camp's name identity
//              (camp-names.mjs ident(), which ignores a trailing "camp"). Tried first: the agency
//              that issues the permit for a camp is the best record of where it is.
//   DONOR      a surveyed Campsite pin for the same camp on another route nearby (same name, or
//              samePlaceCamp's height-agreeing match — the panel's own rule), not itself computed.
//   GAZETTEER  an OSM feature found by the camp's own name inside a box around the route, with
//              the gates scripts/lib/camp-names.mjs already enforces for camp elevations, PLUS an
//              extent gate: a feature wider than EXTENT_M (a big lake, a valley) has no point that
//              is "the camp", so its centroid is refused.
// And is then VERIFIED against two independent records before it is written:
//   GROUND     USGS 3DEP at the candidate agrees with the camp's stated height within TOL_FT
//              (audit:camp-elevations' tolerance). A camp with no stated height is accepted only if
//              the feature is itself a camp (camp_site / hut / shelter) or the track corroborates it.
//   TRACK      on a route with a RECORDED track (lib/track.js recordedTrackPts), the pin must lie
//              within WP_TOL of it — the tolerance audit:waypoints uses. A camp below the trailhead
//              is a drive-to campground (camping.md: roadside vocabulary on 72% of them), not on the
//              walk, so it must instead lie within ROADSIDE_KM of the trailhead pin.
// A candidate that fails any gate is REPORTED with the reason, never written.
//
// TRAIL DISTANCE (distMi) is written only when it is MEASURED: the walked distance along a recorded
// track from the trailhead pin's position on it to the camp's. Otherwise it is left out — the panel
// shows no distance rather than a chord (camping.md, injection case 7).
//
//   node scripts/oneoff/add-camp-pins.mjs                 # dry run: writes the plan, changes nothing
//   node scripts/oneoff/add-camp-pins.mjs --apply         # writes the plan's routes, paced, with rollback
//   --audit <file>   audit:camp-pins --json output to work from (default: run dir/camp-pins-before.json)
//   --limit N        only the first N camps (a pilot)
//   --research <f>   coordinates proposed by research for camps neither record could place:
//                    [{id, camp, lat, lng}]. A proposal is only a CANDIDATE — it passes the same
//                    ground, track and distance gates as the other two, and self-reported
//                    confidence gates nothing (researched-pins-agents-propose-machines-verify).
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import fs from "fs";
import path from "path";
import { build } from "esbuild";
import { createRequire } from "module";
import os from "os";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { norm, ident, placeOf, searchCandidates, unresolvable, LINEAR, SUBFEATURE } from "../lib/camp-names.mjs";
import { recordedTrackPts, pointOf, metresBetween, coordinateIsComputed } from "../../lib/track.js";
import { orderWaypoints } from "../../lib/waypoints.js";
import { GROUND_DISAGREEMENTS } from "../../lib/ground-checked-pins.js";
import { nearestOnTrack, trackLine } from "../lib/track-geometry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const RUN = process.env.CAMP_PINS_RUN || path.join(os.homedir(), "dev/camp-pins-run");
const AUDIT = arg("audit", path.join(RUN, "camp-pins-before.json"));
const LIMIT = Number(arg("limit", "100000"));
const RESEARCH = arg("research", null);
const proposals = new Map();
if (RESEARCH) for (const x of JSON.parse(fs.readFileSync(RESEARCH, "utf8"))) {
  if (x && x.id && x.camp && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng))) proposals.set(`${x.id}|${String(x.camp).trim().toLowerCase()}`, x);
}
// Official camp points, one JSON array per dataset: [{name, lat, lng, src}].
const OFFICIAL_DIR = path.join(RUN, "official");
const official = fs.existsSync(OFFICIAL_DIR)
  ? fs.readdirSync(OFFICIAL_DIR).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(OFFICIAL_DIR, f), "utf8")))
      .filter((x) => x && x.name && Number.isFinite(x.lat) && Number.isFinite(x.lng)).map((x) => ({ ...x, id: ident(x.name) }))
  : [];
// USGS GNIS, point-like classes only (lake, gap, spring, flat, summit, falls) — the federal name
// record. It carries no feature EXTENT, so a GNIS candidate must fit the ground at the camp's stated
// height more tightly (GNIS_TOL_FT) than an OSM one whose extent was checked.
const GNIS_FILE = path.join(RUN, "gnis", "gnis-wa.json");
const gnis = fs.existsSync(GNIS_FILE) ? JSON.parse(fs.readFileSync(GNIS_FILE, "utf8")).map((x) => ({ ...x, id: ident(x.name) })) : [];
const GNIS_TOL_FT = 200;
const NOT_A_CAMP = /\b(no overnight|day[- ]use only|no camping|camping (is )?(prohibited|banned|not allowed))\b/i;
// THE SAME NAME AS AGENCIES SPELL IT, tried only after the exact identity fails: "Mt" is "Mount", a
// possessive "s" is dropped ("Boston Charlie's" -> "boston charlie"), and a plural last word is made
// singular ("Thornton Lakes" / NPS "Thornton Lake", "Andrews Pass" / GNIS "Andrew Pass"; never a
// "-ss" word like "pass"). Null for a one-word key: one word is not an identity (camp-names.mjs).
function variantKey(id) {
  const t = String(id || "").replace(/\bmt\b/g, "mount").split(" ").filter((w) => w && w !== "s");
  if (t.length < 2) return null;
  return t.map((w) => (/[^s]s$/.test(w) && w.length > 3 ? w.slice(0, -1) : w)).join(" ");
}
const PACE_MS = Number(arg("pace-ms", "1100"));
const TOL_FT = 400, WP_TOL = 500, EXTENT_M = 1000, ROADSIDE_KM = 25, NEAR_KM = 15, DONOR_ELEV_FT = 300;
const UA = "ClimbMatch-camp-pin-solver/1.0 (climbing route catalog; contact via repo)";
fs.mkdirSync(RUN, { recursive: true });

// The panel's own pairing rule, not a copy (same bundle check:camping builds).
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-campsolve-")), "bundle.cjs");
await build({
  stdin: { contents: `export { samePlaceCamp } from "./RouteDetail.jsx";`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: bundle, logLevel: "error",
});
const { samePlaceCamp } = createRequire(import.meta.url)(bundle);

const audit = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
// A census older than the last write lists camps that write already pinned. Applying from it would
// pin them twice (2026-10-28: a timed-out audit left the previous census in place and the next run
// started solving from it). Refuse unless the census was taken after the newest rollback.
if (APPLY) {
  const rbs = fs.readdirSync(RUN).filter((f) => f.startsWith("rollback-camp-pins-")).map((f) => fs.statSync(path.join(RUN, f)).mtimeMs);
  if (rbs.length && fs.statSync(AUDIT).mtimeMs < Math.max(...rbs)) throw new Error(`${AUDIT} predates the last write — rerun audit:camp-pins --json first`);
}
const H = headers(anonKey());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(p) {
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
    } catch { /* backed off below */ }
    await sleep(60000 * (t + 1)); // never retry fast into a struggling database
  }
  throw new Error(`read failed: ${p.slice(0, 100)}`);
}

// ---- caches, outside any job dir so a restarted session does not repeat 1,000 lookups
const cacheFile = path.join(RUN, "lookup-cache.json");
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : { nom: {}, dem: {} };
const saveCache = () => fs.writeFileSync(cacheFile, JSON.stringify(cache));
async function nominatim(query, box) {
  const k = `${query}|${box.map((v) => v.toFixed(2)).join(",")}`;
  if (k in cache.nom) return cache.nom[k];
  const [minLat, maxLat, minLng, maxLng] = box;
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1&q=${encodeURIComponent(query)}`;
  let out = null;
  for (let t = 0; t < 4 && out == null; t++) {
    let status = "error";
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
      status = r.status;
      if (r.ok) out = await r.json();
    } catch (e) { status = e.name; }
    // Nominatim's policy is one request a second. A refusal (429/403) means slow down, not skip:
    // retrying at 1 s would make it worse, and giving up would record "not in the gazetteer" for a
    // name the gazetteer holds.
    if (out == null) { console.error(`nominatim ${status} for "${query}" — backing off`); await sleep(60000 * (t + 1)); }
    else await sleep(1100);
  }
  if (out != null) { cache.nom[k] = out; saveCache(); }
  return out;
}
async function ground(lat, lng) {
  const k = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (k in cache.dem) return cache.dem[k];
  const v = await elevationAt(lat, lng, 6);
  if (v != null) { cache.dem[k] = Math.round(v); saveCache(); }
  return v == null ? null : Math.round(v);
}

// ---- the routes the audit named, read fresh
const work = [
  ...audit.missing.map((x) => ({ ...x, kind: "missing" })),
  ...audit.noCoord.map((x) => ({ ...x, kind: "noCoord" })),
  // Zone-worded names, for the OFFICIAL source only (candidates() admits nothing else for them).
  ...(audit.noPoint || []).filter((x) => /^dispersed zone/.test(x.why)).map((x) => ({ ...x, kind: "missing" })),
].slice(0, LIMIT);
const routeIds = [...new Set(work.map((x) => x.id))];
const routes = new Map();
for (let i = 0; i < routeIds.length; i += 15) {
  const chunk = routeIds.slice(i, i + 15).map((x) => `"${x}"`).join(",");
  for (const r of await q(`routes?select=id,name,area_id,bivy,waypoints,gpx&id=in.(${encodeURIComponent(chunk)})`)) routes.set(r.id, r);
}
const areaIds = [...new Set([...routes.values()].map((r) => r.area_id).filter(Boolean))];
const areas = new Map();
for (let i = 0; i < areaIds.length; i += 100) {
  const chunk = areaIds.slice(i, i + 100).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,lat,lng&id=in.(${encodeURIComponent(chunk)})`)) areas.set(a.id, a);
}
// Every Campsite pin in the catalog is a potential donor.
// The audit saved every Campsite pin it read; rerun the audit if this is missing.
if (!Array.isArray(audit.pins) || !audit.pins.length) throw new Error("the audit JSON carries no pins — rerun audit:camp-pins --json");
const isCampPin = (w) => w && /^camp(site)?$/i.test(String(w.type || "").trim());
const elevFt = (s) => (s == null ? null : s.elev != null && s.elev !== "" ? Number(s.elev) : s.elevM != null && s.elevM !== "" ? Number(s.elevM) * 3.28084 : null);
const flagged = (rid, p) => (GROUND_DISAGREEMENTS[rid] || []).some((g) => Math.abs(g.lat - p.lat) < 1e-6 && Math.abs(g.lng - p.lng) < 1e-6);
const donors = [];
for (const { rid, w } of audit.pins) {
  const p = pointOf(w);
  if (isCampPin(w) && p && !coordinateIsComputed(w) && !flagged(rid, p)) donors.push({ rid, w, p });
}
const key = (v) => String(v == null ? "" : v).trim().toLowerCase();

function anchorsOf(r) {
  const pts = (r.waypoints || []).map(pointOf).filter(Boolean);
  const a = areas.get(r.area_id);
  if (a && a.lat != null && a.lng != null) pts.push({ lat: Number(a.lat), lng: Number(a.lng) });
  return pts;
}
const nearKm = (p, anchors) => Math.min(...anchors.map((a) => metresBetween(p, a) / 1000));
const thPin = (r) => (r.waypoints || []).find((w) => /trailhead/i.test(String(w && w.type || "")) && pointOf(w));
const summitPin = (r) => (r.waypoints || []).find((w) => /summit/i.test(String(w && w.type || "")) && pointOf(w));
function trackOf(r) {
  const rec = recordedTrackPts(r.gpx, r.waypoints);
  return rec && trackLine(rec).length >= 2 ? rec : null;
}

// The site record the panel lists, so a pin is judged against the camp's own stated height.
function siteOf(r, item) {
  const b = (r.bivy || []).find((x) => key(x && x.name) === key(item.camp));
  if (b) return b;
  const w = (r.waypoints || []).find((x) => isCampPin(x) && key(x.name) === key(item.pin || item.camp));
  return w || { name: item.camp };
}

async function candidates(r, site) {
  const out = [];
  const anchors = anchorsOf(r);
  if (!anchors.length) return out;
  // A site that says it is NOT a place to sleep ("Alpine Lookout — day use only, no overnight") is
  // listed as a warning; a Campsite pin for it would say the opposite on the map.
  if (NOT_A_CAMP.test(site.name)) return [{ from: "name", refused: "the site says it is not a place to camp" }];
  const want = elevFt(site);
  // OFFICIAL — the land manager's own point for a camp of this name near the route. Two same-named
  // points both in reach is not an identity, so an ambiguous name is skipped rather than guessed.
  // A name the ZONE vocabulary flags ("Glacier Meadows", "Royal Basin camps") is still ONE camp when
  // the land manager publishes a camp point under exactly that name — the agency's record outranks a
  // word list. Two places in one name, or a purely relative one, never are.
  const why = unresolvable(site.name);
  const officialOk = !why || /^dispersed zone/.test(why);
  const sid = ident(placeOf(site.name));
  if (sid && officialOk) {
    // The same camp published by two agencies (or twice in one file) is one hit, not an ambiguity.
    const near = (pred) => official.filter((x) => pred(x) && nearKm(x, anchors) <= NEAR_KM)
      .filter((x, i, a) => a.findIndex((y) => metresBetween(x, y) < 300) === i);
    let hits = near((x) => x.id === sid);
    let how = "";
    // Only when the exact identity finds nothing: the same name spelled the way agencies spell it.
    if (!hits.length && variantKey(sid)) { hits = near((x) => variantKey(x.id) === variantKey(sid)); how = " (spelling variant)"; }
    if (hits.length === 1) out.push({ from: "official", lat: hits[0].lat, lng: hits[0].lng, official: `${hits[0].src}: ${hits[0].name}${how}`, campLike: true });
  }
  // A zone-worded name gets the agency's point or nothing: a donor pin for "Perfect Pass cross-country
  // zone" is one arbitrary spot in a zone, and copying it spreads that spot to every route (measured on
  // the first variant run: 15 of 22 donor matches were zone names).
  if (why) return out.length ? out : [{ from: "official", refused: why }];
  // DONOR — same camp pinned on another route nearby.
  for (const d of donors) {
    if (d.rid === r.id) continue;
    const named = key(d.w.name) === key(site.name);
    if (!named && !samePlaceCamp(site, d.w)) continue;
    if (nearKm(d.p, anchors) > NEAR_KM) continue;
    const de = elevFt(d.w);
    if (want != null && de != null && Math.abs(de - want) > DONOR_ELEV_FT) continue;
    out.push({ from: "donor", lat: d.p.lat, lng: d.p.lng, donor: d.rid, donorName: d.w.name, campLike: true });
  }
  // GAZETTEER — the camp's own name in a box around the route.
  if (!out.length && !unresolvable(site.name)) {
    const lats = anchors.map((a) => a.lat), lngs = anchors.map((a) => a.lng);
    const box = [Math.min(...lats) - 0.12, Math.max(...lats) + 0.12, Math.min(...lngs) - 0.18, Math.max(...lngs) + 0.18];
    for (const cand of searchCandidates(site.name)) {
      const hits = await nominatim(cand, box);
      const hit = (hits || []).find((h) => norm(h.name) === norm(cand));
      if (!hit) continue;
      const type = String(hit.type || "");
      if (LINEAR.has(type)) { out.push({ from: "gazetteer", refused: `linear feature (${type})`, query: cand }); break; }
      if (/^(peak|mountain|volcano)$/i.test(type) && SUBFEATURE.test(site.name)) { out.push({ from: "gazetteer", refused: "a summit, but the camp names a part of it", query: cand }); break; }
      const bb = (hit.boundingbox || []).map(Number);
      const extent = bb.length === 4 ? metresBetween({ lat: bb[0], lng: bb[2] }, { lat: bb[1], lng: bb[3] }) : 0;
      if (extent > EXTENT_M) { out.push({ from: "gazetteer", refused: `feature ${Math.round(extent)} m across — no single point is the camp`, query: cand }); break; }
      out.push({ from: "gazetteer", lat: Number(hit.lat), lng: Number(hit.lon), query: cand, osm: `${hit.category}/${type}`,
        campLike: /^(camp_site|alpine_hut|wilderness_hut|shelter|cabin|caravan_site)$/.test(type) });
      break;
    }
  }
  // GNIS — only when nothing above offered a usable point, through the same candidate names and
  // shape refusals as the OSM search.
  // A feature OSM already REFUSED for its shape (too wide, linear, a summit) is not rescued here:
  // GNIS carries no extent, so it would hand back the same feature's centroid without the check —
  // measured on the first full run, where Waptus Lake (2 km long) came back through GNIS.
  if (!out.length && !unresolvable(site.name)) {
    for (const cand of searchCandidates(site.name)) {
      const id = ident(cand);
      const inReach = (pred) => gnis.filter((x) => pred(x) && nearKm(x, anchors) <= NEAR_KM)
        .filter((x, i, a) => a.findIndex((y) => metresBetween(x, y) < 300) === i);
      let hits = inReach((x) => x.id === id);
      if (!hits.length && variantKey(id)) hits = inReach((x) => variantKey(x.id) === variantKey(id));
      if (!hits.length) continue;
      if (hits.length > 1) { out.push({ from: "gnis", refused: `${hits.length} GNIS features of that name in reach`, query: cand }); break; }
      if (hits[0].cls === "Summit" && SUBFEATURE.test(site.name)) { out.push({ from: "gnis", refused: "a summit, but the camp names a part of it", query: cand }); break; }
      out.push({ from: "gnis", lat: hits[0].lat, lng: hits[0].lng, query: cand, gnis: hits[0].cls, tolFt: GNIS_TOL_FT, campLike: false });
      break;
    }
  }
  // RESEARCH — a proposed coordinate, verified below exactly like the others.
  const prop = proposals.get(`${r.id}|${key(site.name)}`);
  if (prop) out.push({ from: "research", lat: Number(prop.lat), lng: Number(prop.lng), campLike: false });
  return out;
}

async function judge(r, site, c) {
  if (c.refused) return { ok: false, why: c.refused };
  const p = { lat: c.lat, lng: c.lng };
  const anchors = anchorsOf(r);
  if (nearKm(p, anchors) > NEAR_KM) return { ok: false, why: `${nearKm(p, anchors).toFixed(1)} km from every pin of the route` };
  const want = elevFt(site);
  const g = await ground(c.lat, c.lng);
  if (g == null) return { ok: false, why: "no ground reading" };
  const th = thPin(r), thFt = th ? elevFt(th) : null;
  const roadside = want != null && thFt != null && want < thFt;
  const track = trackOf(r);
  const near = track ? nearestOnTrack(p, track) : null;
  if (want != null && Math.abs(g - want) > (c.tolFt || TOL_FT)) return { ok: false, why: `ground ${g} ft vs stated ${Math.round(want)} ft` };
  if (track && !roadside && near.d > WP_TOL) return { ok: false, why: `${Math.round(near.d)} m off the recorded track` };
  if (roadside) {
    if (!th) return { ok: false, why: "below the trailhead, and no trailhead pin to measure the drive from" };
    const km = metresBetween(p, pointOf(th)) / 1000;
    if (km > ROADSIDE_KM) return { ok: false, why: `roadside camp ${km.toFixed(1)} km from the trailhead` };
  }
  if (want == null && !c.campLike && !(near && near.d <= WP_TOL)) return { ok: false, why: "no stated height to check the ground against, and nothing else corroborates it" };
  let distMi = null;
  if (near && near.d <= WP_TOL && !roadside && th) {
    const thOn = nearestOnTrack(pointOf(th), track);
    if (thOn && thOn.d <= 400) {
      const mi = Math.abs(near.alongM - thOn.alongM) / 1609.34;
      // A walked distance can never be shorter than the straight line — if it is, the projection
      // landed on the wrong leg, and no number is better than that one.
      if (mi * 1609.34 + 50 >= metresBetween(pointOf(th), p)) distMi = Math.round(mi * 10) / 10;
    }
  }
  return { ok: true, ground: g, elev: want != null ? Math.round(want) : g, offTrackM: near ? Math.round(near.d) : null, roadside, distMi };
}

// Where a new pin goes in the stored list. With a measured distance it is appended and the reader
// sorts (orderWaypoints). Without one the reader cannot sort the list at all, so it is stored in
// the walking order the reader WOULD have shown, and the camp is placed by height: after the last
// pin on the way up that is no higher than it, before the summit; a roadside camp before the
// trailhead, where the trip begins.
function insert(wps, pin, roadside) {
  const all = wps.every((w) => w && typeof w.distMi === "number" && Number.isFinite(w.distMi));
  if (all && typeof pin.distMi === "number") return [...wps, pin];
  const list = orderWaypoints(wps.slice());
  const thI = list.findIndex((w) => /trailhead/i.test(String(w && w.type || "")));
  if (roadside) { const i = thI >= 0 ? thI : 0; return [...list.slice(0, i), pin, ...list.slice(i)]; }
  let sumI = list.findIndex((w) => /summit/i.test(String(w && w.type || "")));
  if (sumI < 0) sumI = list.length;
  let at = Math.max(thI + 1, 0);
  for (let i = at; i < sumI; i++) { const e = elevFt(list[i]); if (e != null && pin.elev != null && e <= pin.elev) at = i + 1; }
  if (pin.elev == null) at = sumI;
  return [...list.slice(0, at), pin, ...list.slice(at)];
}

// ---- solve
const plan = new Map(); // route id -> { before, after, adds: [] }
const refused = [];
let n = 0;
for (const item of work) {
  n++;
  const r = routes.get(item.id);
  if (!r) { refused.push({ ...item, why: "route not readable" }); continue; }
  const site = siteOf(r, item);
  const cands = await candidates(r, site);
  if (!cands.length) { refused.push({ ...item, why: unresolvable(site.name) || "no donor pin and not in the gazetteer" }); continue; }
  let done = null, why = null;
  // In order — donor, gazetteer, research — so a proposal is tried only once both records have
  // failed to place the camp, and never out-ranks a surveyed pin.
  for (const c of cands) {
    const v = await judge(r, site, c);
    if (v.ok) { done = { c, v }; break; }
    why = why || `${c.from}: ${v.why}`;
  }
  if (!done) { refused.push({ ...item, why }); continue; }
  const cur = plan.get(r.id) || { before: r.waypoints || [], after: (r.waypoints || []).slice(), adds: [] };
  const p = { lat: Number(done.c.lat.toFixed(6)), lng: Number(done.c.lng.toFixed(6)) };
  // A second pin at the same spot reads as one place twice (dedupeWaypoints would merge them).
  // Judged on the LIVE row, whatever the census said: a camp already pinned under its own name is
  // never pinned again.
  if (item.kind === "missing" && cur.after.some((w) => isCampPin(w) && key(w.name) === key(item.camp))) { refused.push({ ...item, why: "already pinned on the live route" }); continue; }
  const clash = cur.after.find((w) => isCampPin(w) && pointOf(w) && metresBetween(pointOf(w), p) < 150 && key(w.name) !== key(item.pin || item.camp));
  if (clash) { refused.push({ ...item, why: `another camp pin, "${clash.name}", already stands within 150 m` }); continue; }
  if (item.kind === "noCoord") {
    cur.after = cur.after.map((w) => (isCampPin(w) && key(w.name) === key(item.pin) && !pointOf(w) ? { ...w, ...p, ...(w.elev == null ? { elev: done.v.elev } : {}), ...(w.distMi == null && done.v.distMi != null ? { distMi: done.v.distMi } : {}) } : w));
  } else {
    const pin = { type: "Campsite", name: site.name, ...p, elev: done.v.elev, ...(done.v.distMi != null ? { distMi: done.v.distMi } : {}) };
    cur.after = insert(cur.after, pin, done.v.roadside);
  }
  cur.adds.push({ kind: item.kind, camp: item.pin || item.camp, ...p, from: done.c.from, donor: done.c.donor, official: done.c.official, osm: done.c.osm, gnis: done.c.gnis, query: done.c.query,
    stated: elevFt(site) != null ? Math.round(elevFt(site)) : null, ground: done.v.ground, offTrackM: done.v.offTrackM, roadside: done.v.roadside, distMi: done.v.distMi });
  plan.set(r.id, cur);
  if (n % 25 === 0) console.error(`solved ${n}/${work.length}  routes ${plan.size}  refused ${refused.length}`);
}

const planFile = path.join(RUN, "plan.json");
fs.writeFileSync(planFile, JSON.stringify({ made: new Date().toISOString(), routes: Object.fromEntries(plan), refused }, null, 1));
const adds = [...plan.values()].flatMap((x) => x.adds);
console.log(`camps worked : ${work.length}`);
console.log(`pinnable     : ${adds.length} on ${plan.size} routes  (${["official", "donor", "gazetteer", "gnis", "research"].map((f) => `${f} ${adds.filter((a) => a.from === f).length}`).join(", ")})`);
console.log(`refused      : ${refused.length}`);
const tally = {};
for (const x of refused) { const k = String(x.why).replace(/[\d,.]+/g, "N").slice(0, 70); tally[k] = (tally[k] || 0) + 1; }
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`   ${String(v).padStart(4)}  ${k}`);
console.log(`plan: ${planFile}`);

if (!APPLY) process.exit(0);

// jsonb stores object keys in its OWN order, so what we write never string-equals what we read back.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));

// patchRow() asks for the whole changed row back — on a route that is the gpx track and every prose
// column, hundreds of KB per write. Only the id is needed to prove exactly one row changed.
async function patchWaypoints(id, waypoints) {
  const key = requireServiceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id`, {
    method: "PATCH", signal: AbortSignal.timeout(60000),
    headers: headers(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ waypoints }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${id} -> ${res.status} ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`PATCH ${id} changed ${Array.isArray(rows) ? rows.length : "?"} rows, expected 1 — wrong id, or RLS rejected it`);
}

// ---- apply: one PATCH per route, paced, each guarded by a re-read, rollback written first
const rollbackFile = path.join(RUN, `rollback-camp-pins-${Date.now()}.json`);
const rollback = {};
let written = 0, skipped = 0;
for (const [id, x] of plan) {
  const [now] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`);
  if (canon((now && now.waypoints) || []) !== canon(x.before)) { skipped++; console.error(`skip ${id}: waypoints changed since the plan was made`); continue; }
  rollback[id] = x.before;
  fs.writeFileSync(rollbackFile, JSON.stringify(rollback));
  const t0 = Date.now();
  try {
    await patchWaypoints(id, x.after);
  } catch (e) {
    console.error(`write failed ${id}: ${e.message} — backing off a minute`);
    delete rollback[id]; fs.writeFileSync(rollbackFile, JSON.stringify(rollback));
    await sleep(60000); continue;
  }
  written++;
  // THE LIVE APP'S READS COME FIRST (owner's rule for bulk writes). Every 20 writes, time the
  // cheapest read the app makes; if it is slow, stop writing until it is not.
  if (written % 20 === 0) {
    for (;;) {
      const h0 = Date.now();
      let ok = false;
      try { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&limit=1`, { headers: H, signal: AbortSignal.timeout(20000) }); await r.text(); ok = r.ok; } catch { ok = false; }
      if (ok && Date.now() - h0 < 3000) break;
      console.error(`app reads slow (${Date.now() - h0} ms) — pausing two minutes`);
      await sleep(120000);
    }
    console.error(`written ${written}/${plan.size}`);
  }
  const took = Date.now() - t0;
  // A write this slow means the database is struggling: STOP, never push on (2026-10-28: one write
  // took 112 s mid-run while a dozen sessions shared the database).
  if (took > 15000) { console.error(`write took ${took} ms — STOPPING; rerun once the database is healthy`); break; }
  if (took > 4000) { console.error(`slow write (${took} ms) — pausing a minute so the app's reads are not starved`); await sleep(60000); }
  await sleep(PACE_MS);
}
// Reconcile: a 200 is not evidence the data changed.
let landed = 0;
for (const id of Object.keys(rollback)) {
  const [now] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`);
  if (canon((now && now.waypoints) || []) === canon(plan.get(id).after)) landed++;
  else console.error(`NOT LANDED ${id}`);
  await sleep(150);
}
console.log(`written ${written}, skipped ${skipped}, re-read and confirmed ${landed}/${Object.keys(rollback).length}`);
console.log(`rollback: ${rollbackFile}`);
