// IS EVERY CAMP ON THE ROUTE MAP, AND IS ITS PIN ON THE ROUTE'S TRACK?  (audit:camp-pins)
//
// Owner note, 2026-10-25: "Are all campgrounds waypoints there and on the route track for all
// routes? Audit all routes and add those."
//
// CAMPING & BIVY lists two stores merged (RouteDetail campSites): the researched `bivy` sites and
// the route's Campsite WAYPOINTS. A site that pairs with a pin is stamped "Marked on the track"
// (`onTrack: !!pin`). So the question has three parts, and this asks each through the panel's OWN
// campSites() — bundled with esbuild exactly as check:camping does — rather than a second copy of
// its pairing rule (exact name, else samePlaceCamp), which would drift:
//
//   1. MISSING PIN     a site the panel lists that no Campsite pin backs. It is not on the map.
//   2. NO COORDINATE   a pin backs it, but the pin has no lat/lng — the map cannot draw it, and the
//                      panel still says "Marked on the track". That chip is then a false claim.
//   3. OFF THE TRACK   the pin is drawn, but more than WP_TOL from the route's RECORDED track (the
//                      only line the map draws — lib/track.js recordedTrackPts). 500 m is the
//                      tolerance audit:waypoints already uses for "on the route".
//
// What it cannot judge, and says so instead of passing:
//   - A route with NO recorded track has no line to be on. Its pins are counted as NO TRACK.
//   - A camp BELOW its trailhead is a valley car-campground you drive to (camping.md: 72% of those
//     carry roadside vocabulary). It is not ON the walk, so an off-track reading there is reported
//     as ROADSIDE, not as a defect.
//   - A dispersed zone ("Boston Basin bivies", "pullouts") has no single point to pin
//     (scripts/lib/camp-names.mjs unresolvable()). Those are counted as NO SINGLE POINT, never
//     "missing": a pin for one would invent precision the record cannot carry.
//
// Read-only, anon key. Fails closed on an empty read.
//   npm run audit:camp-pins                 summary + the first 25 of each class
//   npm run audit:camp-pins -- --verbose    every finding
//   npm run audit:camp-pins -- --json out.json
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import { recordedTrackPts, pointOf } from "../lib/track.js";
import { unresolvable } from "./lib/camp-names.mjs";
import { distanceToTrackM, trackLine } from "./lib/track-geometry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose");
const JSON_OUT = (() => { const i = argv.indexOf("--json"); return i >= 0 ? argv[i + 1] : null; })();
const WP_TOL = 500;

// The panel's own campSites(), not a copy of it.
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-camppins-")), "bundle.cjs");
await build({
  stdin: { contents: `export { campSites, samePlaceCamp } from "./RouteDetail.jsx";`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { campSites, samePlaceCamp } = createRequire(import.meta.url)(out);

const H = headers(anonKey());
let scanFailed = false;
async function q(p, opts) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H, signal: AbortSignal.timeout(60000) });
      if (r.ok) return r.json();
    } catch { /* backed off below */ }
    await new Promise((res) => setTimeout(res, 15000 * (t + 1)));
  }
  if (opts && opts.soft) { scanFailed = true; return null; }
  console.log(`FAIL: read failed (${p.slice(0, 80)}) — this is NOT "every camp is pinned".`);
  process.exit(1);
}
// IDS FIRST, COLUMNS BY PRIMARY KEY. Selecting bivy + waypoints for every match in one statement
// is a scan carrying ~750 rows of prose, and it hit the statement timeout whenever the database was
// busy (2026-10-28, with a dozen sessions on it). The scans return only ids; the heavy columns come
// in small primary-key chunks that cannot time out.
// The two scans are sequential over 315k rows and can still time out on a busy database. With
// --ids-cache, a successful run saves the id list and a failed scan falls back to it, SAYING SO —
// the set of camp-bearing routes changes only when camps are added, and every row is still read live.
const IDS_CACHE = (() => { const i = argv.indexOf("--ids-cache"); return i >= 0 ? argv[i + 1] : null; })();
async function scanIds() {
  return [...new Set([
    ...(await q(`routes?select=id&bivy=not.is.null&limit=5000`, { soft: true }) || []).map((r) => r.id),
    ...(await q(`routes?select=id&waypoints=cs.${encodeURIComponent('[{"type":"Campsite"}]')}&limit=5000`, { soft: true }) || []).map((r) => r.id),
  ])];
}
let ids = await scanIds();
if (scanFailed) {
  if (!IDS_CACHE || !fs.existsSync(IDS_CACHE)) { console.log("FAIL: read failed — this is NOT \"every camp is pinned\"."); process.exit(1); }
  ids = JSON.parse(fs.readFileSync(IDS_CACHE, "utf8"));
  console.log(`WARNING: the id scan timed out; using the ${ids.length} route ids saved by the last successful run (rows themselves are read live)`);
} else if (IDS_CACHE) fs.writeFileSync(IDS_CACHE, JSON.stringify(ids));
if (!ids.length) { console.log("FAIL: read no routes carrying camps — an empty audit proves nothing"); process.exit(1); }
const byId = new Map();
for (let i = 0; i < ids.length; i += 15) {
  const chunk = ids.slice(i, i + 15).map((x) => `"${x}"`).join(",");
  for (const r of await q(`routes?select=id,name,area_id,bivy,waypoints,gpx&id=in.(${encodeURIComponent(chunk)})`)) byId.set(r.id, r);
}
const routes = [...byId.values()];
if (routes.length !== ids.length) { console.log(`FAIL: matched ${ids.length} routes but read ${routes.length} — a partial read is not a clean catalog`); process.exit(1); }

const key = (v) => String(v == null ? "" : v).trim().toLowerCase();
const isCampPin = (w) => w && /^camp(site)?$/i.test(String(w.type || "").trim());
const elevFt = (s) => (s == null ? null : s.elev != null ? Number(s.elev) : s.elevM != null ? Number(s.elevM) * 3.28084 : null);
const thFt = (r) => { const w = (r.waypoints || []).find((x) => /trailhead/i.test(String(x && x.type || ""))); return w ? elevFt(w) : null; };

const F = { missing: [], noPoint: [], noCoord: [], off: [], roadside: [], dup: [] };
let sites = 0, pinned = 0, onLine = 0, noTrack = 0, routesWithFinding = new Set();
for (const r of routes) {
  const route = { ...r, bivy: Array.isArray(r.bivy) ? r.bivy : [], waypoints: Array.isArray(r.waypoints) ? r.waypoints : [] };
  const pins = route.waypoints.filter(isCampPin);
  // One camp pinned twice under one name draws two pins for one place (and is what a repair run from
  // a stale census would leave behind).
  for (const [k, n] of pins.reduce((m, w) => m.set(key(w.name), (m.get(key(w.name)) || 0) + 1), new Map())) if (k && n > 1) { F.dup.push({ id: r.id, pin: k, n }); routesWithFinding.add(r.id); }
  // A "track" of fewer than two usable points is no line at all (wa_mount_adams_mazama_glacier_headwall
  // measured its pin as Infinity m off one), so it counts with the routes that have none.
  const rec = recordedTrackPts(r.gpx, route.waypoints);
  const track = rec && trackLine(rec).length >= 2 ? rec : null;
  const th = thFt(route);
  for (const s of campSites(route)) {
    sites++;
    const pin = s.role === "route"
      ? pins.find((w) => key(w.name) === key(s.name))
      : pins.find((w) => key(w.name) === key(s.name)) || pins.find((w) => samePlaceCamp(route.bivy.find((b) => key(b.name) === key(s.name)) || s, w));
    const row = { id: r.id, route: r.name, camp: s.name, elev: s.elev == null ? null : Math.round(s.elev) };
    if (!pin) {
      const why = unresolvable(s.name);
      if (why) F.noPoint.push({ ...row, why }); else F.missing.push(row);
      routesWithFinding.add(r.id);
      continue;
    }
    pinned++;
    const p = pointOf(pin);
    if (!p) { F.noCoord.push({ ...row, pin: pin.name }); routesWithFinding.add(r.id); continue; }
    if (!track) { noTrack++; continue; }
    const d = distanceToTrackM(p, track);
    if (d <= WP_TOL) { onLine++; continue; }
    const below = th != null && s.elev != null && s.elev < th;
    (below ? F.roadside : F.off).push({ ...row, pin: pin.name, offM: Math.round(d) });
    if (!below) routesWithFinding.add(r.id);
  }
}

const show = (title, list, fmt) => {
  console.log(`\n-- ${title}: ${list.length}`);
  for (const x of (VERBOSE ? list : list.slice(0, 25))) console.log("   " + fmt(x));
  if (!VERBOSE && list.length > 25) console.log(`   ... ${list.length - 25} more (--verbose)`);
};
console.log(`camp-bearing routes : ${routes.length}`);
console.log(`camps listed        : ${sites}  (CAMPING & BIVY rows, the panel's own campSites())`);
console.log(`backed by a pin     : ${pinned}`);
console.log(`  pin on its track  : ${onLine}  (within ${WP_TOL} m of the recorded track)`);
console.log(`  pin, no track     : ${noTrack}  (the route has no recorded track to be on)`);
show("MISSING PIN — listed, not on the map", F.missing, (x) => `${x.id}  "${x.camp}"${x.elev != null ? ` ${x.elev} ft` : ""}`);
show("NO COORDINATE — a pin with no lat/lng, still stamped \"Marked on the track\"", F.noCoord, (x) => `${x.id}  "${x.pin}"`);
show(`OFF THE TRACK — pin more than ${WP_TOL} m from the recorded track`, F.off, (x) => `${x.id}  "${x.pin}"  ${x.offM} m`);
show("ROADSIDE — below the trailhead, off the walk (not a defect)", F.roadside, (x) => `${x.id}  "${x.pin}"  ${x.offM} m`);
show("PINNED TWICE — two Campsite pins with one name", F.dup, (x) => `${x.id}  "${x.pin}" x${x.n}`);
show("NO SINGLE POINT — a dispersed zone or two places (cannot be one pin)", F.noPoint, (x) => `${x.id}  "${x.camp}" — ${x.why}`);
console.log(`\nroutes with a finding: ${routesWithFinding.size} of ${routes.length}`);
// Every Campsite pin read, so the solver (scripts/oneoff/add-camp-pins.mjs) has its donor set without
// running the containment scan again — a seq scan of 315k rows that times out when the DB is busy.
const pinsRead = routes.flatMap((r) => (Array.isArray(r.waypoints) ? r.waypoints : []).filter(isCampPin).map((w) => ({ rid: r.id, w })));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ WP_TOL, totals: { routes: routes.length, sites, pinned, onLine, noTrack }, ...F, pins: pinsRead }, null, 1));
