// Route finder filter audit: the UI's own filter→args code (lifted from RouteFinderPanel.tsx) drives the live
// routes_in_subtree / routes_in_subtree_count RPCs, and every answer is compared with ground truth computed from
// the area's full route list (same rules as the SQL and lib/offline.js). Usage:
// The live mode reads production: take the DB slot first (~/dev/db-throttle/dbslot.mjs acquire <name>).
//   node scripts/oneoff/audit-route-finder-filters.mjs . matrix            -- UI-only: which filters/sorts each discipline gets
//   node scripts/oneoff/audit-route-finder-filters.mjs . live <query>...   -- live checks for areas found by name (needs the DB slot)
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const WT = path.resolve(process.argv[2] || "."), MODE = process.argv[3], QUERIES = process.argv.slice(4);
const require = createRequire(path.join(WT, "package.json"));
const esbuild = require("esbuild");
const TMP = fs.mkdtempSync(path.join((await import("os")).tmpdir(), "finder-audit-"));

// ── 1. the UI's code ────────────────────────────────────────────────────────────────────────────
const srcLines = fs.readFileSync(path.join(WT, "src/components/RouteFinderPanel.tsx"), "utf8").split("\n");
const a = srcLines.findIndex(l => l.startsWith("const LEN_BUCKETS"));
const b = srcLines.findIndex(l => l.startsWith("export default function RouteFinderPanel"));
let slice = srcLines.slice(a, b).join("\n").replace(/^export const /gm, "const ");
slice = "type RouteFinderPanelFilters = any; type RouteFinderPanelLen = any; type RouteFinderPanelRange = any; type RouteFinderPanelMin = any; type RouteFinderPanelGrade = any; type RouteFinderPanelProps = any; type RouteFinderPanelPair = any;\n" + slice +
  "\nexport { LEN_BUCKETS, GAIN_BUCKETS, TRIP_BUCKETS, PEAK_ELEV_MINS, PROM_MINS, WITHIN, GRADE_SCALES, DISC_GRADE_SCALES, gradeScalesFor, finderArgs, sortFor, sortsFor, fitsDiscs, dropUnfit, FINDER_SORTS };\n";
const js = esbuild.transformSync(slice, { loader: "ts", format: "esm" }).code;
const modPath = path.join(TMP, "finder-ui-lifted.mjs");
fs.writeFileSync(modPath, js);
const UI = await import(pathToFileURL(modPath).href);
const DISCS = ["sport", "trad", "toprope", "bouldering", "alpine", "ice", "mixed", "mountaineering", "aid", "scrambling"];
const DEF = { discs: [], sortBy: "lr", minStars: 0, minPitches: 0, len: "any", gSys: "", gLo: "", gHi: "", gain: "any", trip: "any", elev: "any", prom: "any", near: null, within: "w2" };

if (MODE === "matrix") {
  const keys = ["minPitches", "len", "gain", "trip", "elev", "prom"];
  console.log("discipline".padEnd(16) + keys.map(k => k.padEnd(11)).join("") + "grade scales        sorts");
  for (const d of [null, ...DISCS]) {
    const ds = d ? [d] : [];
    console.log((d || "(none)").padEnd(16) + keys.map(k => (UI.fitsDiscs(ds, k) ? "show" : "-").padEnd(11)).join("") + (UI.gradeScalesFor(ds).join(",") || "(pick one)").padEnd(20) + UI.sortsFor(ds).map(s => s[1]).join(" | "));
  }
  for (const ds of [["sport", "alpine"], ["bouldering", "sport"], ["alpine", "mountaineering", "scrambling"], ["toprope", "sport"], ["bouldering", "alpine"]]) {
    console.log(ds.join("+").padEnd(16) + keys.map(k => (UI.fitsDiscs(ds, k) ? "show" : "-").padEnd(11)).join("") + (UI.gradeScalesFor(ds).join(",") || "(none shared)").padEnd(20) + UI.sortsFor(ds).map(s => s[1]).join(" | "));
  }
  // dropUnfit clears hidden values
  const f = UI.dropUnfit({ ...DEF, discs: ["bouldering"], minPitches: 2, len: "200", gain: "g2", trip: "t1", elev: "e1", prom: "p1" });
  console.log("dropUnfit(bouldering + every value set):", JSON.stringify({ minPitches: f.minPitches, len: f.len, gain: f.gain, trip: f.trip, elev: f.elev, prom: f.prom }));
  const g = UI.dropUnfit({ ...DEF, discs: ["sport", "alpine"], minPitches: 2, len: "200", gain: "g2" });
  console.log("dropUnfit(sport+alpine, values kept):", JSON.stringify({ minPitches: g.minPitches, len: g.len, gain: g.gain }));
  process.exit(0);
}

// ── 2. live ─────────────────────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(fs.readFileSync(path.join(WT, ".env.local"), "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL0 = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function req(url, opt = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    calls++;
    await sleep(120);
    try {
      const r = await fetch(url, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
      const t = await r.text();
      if (r.ok) return JSON.parse(t);
      if (attempt === 2) throw new Error(r.status + " " + t.slice(0, 200));
    } catch (e) { if (attempt === 2) throw e; }
    await sleep(5000 * (attempt + 1)); // never retry fast
  }
}
const rest = (q) => req(URL0 + "/rest/v1/" + q);
const rpc = (fn, body) => req(URL0 + "/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(body) });

const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const itinDays = r => (r && r.itinerary && Array.isArray(r.itinerary.days) ? r.itinerary.days : null);
function gainFt(r) { const g = num(r.gain_ft); if (g != null && g > 0) return g; const d = itinDays(r); if (!d) return null; const s = d.reduce((a, x) => a + (typeof (x && x.gainFt) === "number" ? x.gainFt : 0), 0); return s || null; }
function tripKm(r) {
  const d = itinDays(r);
  if (d && d.length && d.filter(x => typeof (x && x.miles) === "number").length * 2 >= d.length) { const mi = d.reduce((a, x) => a + (typeof (x && x.miles) === "number" ? x.miles : 0), 0); if (mi) return mi * 1.60934; }
  const km = num(r.dist_km); if (km == null || !(km > 0)) return null;
  return r.outing_shape === "loop" || r.outing_shape === "point" ? km : km * 2;
}
function kmBetween(lat1, lng1, lat2, lng2) { const rad = Math.PI / 180, s1 = Math.sin((lat2 - lat1) * rad / 2), s2 = Math.sin((lng2 - lng1) * rad / 2); return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(s1 * s1 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * s2 * s2))); }
const PER = { wi: "ice_grade_num", m: "mixed_grade_num", aid: "aid_grade_num", snow: "snow_grade_num" };
function why(r, ar, x) { // null = passes; else the failed rule
  if (x.minElevFt != null && !(num(ar.elevation_ft) >= x.minElevFt)) return "elev";
  if (x.minPromFt != null && !(num(ar.prominence_ft) >= x.minPromFt)) return "prom";
  if (x.withinKm != null) { if (ar.lat == null || kmBetween(x.nearLat, x.nearLng, +ar.lat, +ar.lng) > x.withinKm) return "near"; }
  if (x.disc && !x.disc.split(",").includes(r.discipline)) return "disc";
  if (x.gradeSys && PER[x.gradeSys]) {
    const gn = num(r[PER[x.gradeSys]]);
    if (gn == null) return "grade(scale)";
    if (x.minGrade != null && gn < x.minGrade) return "grade(min)";
    if (x.maxGrade != null && gn > x.maxGrade) return "grade(max)";
  } else {
    if (x.gradeSys && r.grade_system !== x.gradeSys) return "grade(sys)";
    const gn = num(r.grade_num);
    if (x.minGrade != null && !(gn != null && gn >= x.minGrade)) return "grade(min)";
    if (x.maxGrade != null && !(gn != null && gn <= x.maxGrade)) return "grade(max)";
  }
  if (x.minStars != null) { const s = num(r.stars) ?? 0; if (s !== 0 && s < x.minStars) return "stars"; }
  if (x.minPitches != null) { const raw = num(r.pitches); const p = raw ? raw : (r.discipline === "bouldering" ? 0 : 1); if (p < x.minPitches) return "pitches"; }
  const lm = num(r.length_m);
  if (x.minLengthM != null && !(lm != null && lm >= x.minLengthM)) return "len(min)";
  if (x.maxLengthM != null && !(lm != null && lm <= x.maxLengthM)) return "len(max)";
  if (x.minGainFt != null || x.maxGainFt != null) { const g = gainFt(r); if (g == null || (x.minGainFt != null && g < x.minGainFt) || (x.maxGainFt != null && g > x.maxGainFt)) return "gain"; }
  if (x.minTripKm != null || x.maxTripKm != null) { const t = tripKm(r); if (t == null || (x.minTripKm != null && t < x.minTripKm) || (x.maxTripKm != null && t > x.maxTripKm)) return "trip"; }
  return null;
}
// Postgres en_US collation ignores case/punctuation at the first level: compare loosely so only real misorders count.
const loose = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const cmpL = (p, q) => (loose(p) < loose(q) ? -1 : loose(p) > loose(q) ? 1 : 0);
const nl = (p, q, desc) => (p == null && q == null ? 0 : p == null ? 1 : q == null ? -1 : desc ? (q < p ? -1 : q > p ? 1 : 0) : (p < q ? -1 : p > q ? 1 : 0));
function primaryCmp(sortBy, areaOf, x) {
  const an = r => (areaOf.get(r.area_id) || {}).name, km = r => { const ar = areaOf.get(r.area_id); return ar && ar.lat != null && x.nearLat != null ? kmBetween(x.nearLat, x.nearLng, +ar.lat, +ar.lng) : null; };
  if (sortBy === "near") return (p, q) => nl(km(p), km(q)) || cmpL(an(p), an(q));
  if (sortBy === "area") return (p, q) => cmpL(an(p), an(q));
  if (sortBy === "lr" || sortBy === "rl") return (p, q) => cmpL(an(p), an(q)) || (p.area_id === q.area_id ? nl(num(p.sort_order), num(q.sort_order), sortBy === "rl") : 0);
  if (sortBy === "grade_asc") return (p, q) => nl(num(p.grade_num), num(q.grade_num));
  if (sortBy === "grade_desc") return (p, q) => nl(num(p.grade_num), num(q.grade_num), true);
  if (sortBy === "stars_desc") return (p, q) => nl(num(p.stars), num(q.stars), true);
  if (sortBy === "name_desc") return (p, q) => -cmpL(p.name, q.name);
  return (p, q) => cmpL(p.name, q.name);
}

const COLS = "id,name,discipline,grade,grade_num,grade_system,ice_grade_num,mixed_grade_num,aid_grade_num,snow_grade_num,stars,pitches,length_m,gain_ft,itinerary,dist_km,outing_shape,sort_order,area_id";
async function groundTruth(root) {
  const areas = [];
  for (let off = 0; ; off += 1000) { const p = await rest("areas?select=id,name,path,lat,lng,elevation_ft,prominence_ft&path=cd." + encodeURIComponent(root.path) + "&order=id&limit=1000&offset=" + off); areas.push(...p); if (p.length < 1000) break; }
  const routes = [];
  for (let i = 0; i < areas.length; i += 60) {
    const ids = areas.slice(i, i + 60).map(a => '"' + a.id + '"').join(",");
    for (let off = 0; ; off += 1000) { const p = await rest("routes?select=" + COLS + "&area_id=in.(" + encodeURIComponent(ids) + ")&order=id&limit=1000&offset=" + off); routes.push(...p); if (p.length < 1000) break; }
  }
  return { areas, routes, areaOf: new Map(areas.map(a => [a.id, a])) };
}

const rnd = (() => { let s = 20261114; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
const pick = arr => arr[Math.floor(rnd() * arr.length)];
function variations(present, center) {
  const V = [];
  const add = (label, f) => V.push({ label, f: { ...DEF, ...f } });
  const groups = [[], ...present.map(d => [d])];
  const pairs = [["sport", "trad"], ["sport", "trad", "toprope"], ["alpine", "mountaineering", "scrambling"], ["ice", "mixed"], ["bouldering", "sport"], ["aid", "trad"], ["sport", "alpine"]].filter(p => p.every(d => present.includes(d)));
  for (const ds of [...groups, ...pairs]) {
    const tag = ds.join("+") || "all";
    for (const s of [...UI.sortsFor(ds).map(o => o[0]), ...(ds.length ? ["grade_asc", "grade_desc"] : [])]) add(tag + " sort=" + s, { discs: ds, sortBy: s });
    for (const sys of UI.gradeScalesFor(ds)) {
      const sc = UI.GRADE_SCALES[sys], n = sc.length;
      const lo = sc[Math.floor(n * 0.25)][0], hi = sc[Math.floor(n * 0.6)][0];
      add(tag + " grade " + sys + " " + lo + "–" + hi, { discs: ds, gSys: sys, gLo: lo, gHi: hi, sortBy: "grade_asc" });
      add(tag + " grade " + sys + " ≥" + sc[Math.floor(n * 0.4)][0], { discs: ds, gSys: sys, gLo: sc[Math.floor(n * 0.4)][0] });
      add(tag + " grade " + sys + " ≤" + sc[Math.floor(n * 0.3)][0], { discs: ds, gSys: sys, gHi: sc[Math.floor(n * 0.3)][0], sortBy: "grade_desc" });
      add(tag + " grade " + sys + " exactly " + sc[Math.floor(n * 0.35)][0], { discs: ds, gSys: sys, gLo: sc[Math.floor(n * 0.35)][0], gHi: sc[Math.floor(n * 0.35)][0] });
    }
    if (UI.fitsDiscs(ds, "minPitches")) for (const p of [1, 2, 3, 5, 10]) add(tag + " pitches " + p + "+", { discs: ds, minPitches: p });
    if (UI.fitsDiscs(ds, "len")) for (const l of UI.LEN_BUCKETS.slice(1)) add(tag + " length " + l[0], { discs: ds, len: l[0] });
    for (const s of [2, 3, 4]) add(tag + " stars " + s + "+", { discs: ds, minStars: s, sortBy: "stars_desc" });
    if (UI.fitsDiscs(ds, "gain")) {
      for (const g of UI.GAIN_BUCKETS.slice(1)) add(tag + " gain " + g[0], { discs: ds, gain: g[0] });
      for (const t of UI.TRIP_BUCKETS.slice(1)) add(tag + " trip " + t[0], { discs: ds, trip: t[0] });
      for (const e of UI.PEAK_ELEV_MINS.slice(1)) add(tag + " elev " + e[0], { discs: ds, elev: e[0] });
      for (const p of UI.PROM_MINS.slice(1)) add(tag + " prom " + p[0], { discs: ds, prom: p[0] });
    }
    if (center) for (const w of UI.WITHIN) add(tag + " near " + w[0], { discs: ds, near: center, within: w[0], sortBy: "near" });
    // random mixes of everything the sheet would show for these disciplines
    for (let i = 0; i < 6; i++) {
      const f = { discs: ds };
      const scs = UI.gradeScalesFor(ds);
      if (scs.length && rnd() < 0.6) { const sys = pick(scs), sc = UI.GRADE_SCALES[sys], i1 = Math.floor(rnd() * sc.length), i2 = i1 + Math.floor(rnd() * (sc.length - i1)); Object.assign(f, { gSys: sys, gLo: sc[i1][0], gHi: sc[i2][0] }); }
      if (rnd() < 0.4) f.minStars = pick([2, 3, 4]);
      if (UI.fitsDiscs(ds, "minPitches") && rnd() < 0.4) f.minPitches = pick([1, 2, 3]);
      if (UI.fitsDiscs(ds, "len") && rnd() < 0.4) f.len = pick(UI.LEN_BUCKETS.slice(1))[0];
      if (UI.fitsDiscs(ds, "gain") && rnd() < 0.3) f.gain = pick(UI.GAIN_BUCKETS.slice(1))[0];
      if (UI.fitsDiscs(ds, "elev") && rnd() < 0.3) f.elev = pick(UI.PEAK_ELEV_MINS.slice(1))[0];
      if (center && rnd() < 0.3) Object.assign(f, { near: center, within: pick(UI.WITHIN)[0] });
      f.sortBy = pick([...UI.sortsFor(ds).map(o => o[0]), ...(ds.length ? ["grade_asc", "grade_desc"] : [])]);
      add(tag + " mix#" + (i + 1) + " " + JSON.stringify(Object.fromEntries(Object.entries(f).filter(([k, v]) => k !== "discs" && v !== DEF[k]))), f);
    }
  }
  return V;
}

const argsToRpc = (x, lim, off, rootId) => ({ root_id: rootId, q: null, disc: x.disc || null, grade_sys: x.gradeSys || null, min_grade: x.minGrade ?? null, max_grade: x.maxGrade ?? null, min_stars: x.minStars ?? null, min_pitches: x.minPitches ?? null, min_length_m: x.minLengthM ?? null, max_length_m: x.maxLengthM ?? null, min_gain_ft: x.minGainFt ?? null, max_gain_ft: x.maxGainFt ?? null, min_trip_km: x.minTripKm ?? null, max_trip_km: x.maxTripKm ?? null, min_elev_ft: x.minElevFt ?? null, min_prom_ft: x.minPromFt ?? null, near_lat: x.nearLat ?? null, near_lng: x.nearLng ?? null, within_km: x.withinKm ?? null, sort_by: x.sortBy || "name", lim, off });
const countArgs = (x, rootId) => { const o = argsToRpc(x, 0, 0, rootId); delete o.sort_by; delete o.lim; delete o.off; return o; };

const report = [];
for (const qn of QUERIES) {
  const hits = await rest("areas?select=id,name,path,area_type,route_count,lat,lng&name_search=ilike." + encodeURIComponent("*" + qn.toLowerCase() + "*") + "&order=route_count.desc&limit=3");
  const root = hits[0];
  if (!root) { console.log("NO AREA for " + qn); continue; }
  const gt = await groundTruth(root);
  const present = DISCS.filter(d => gt.routes.some(r => r.discipline === d));
  console.log(`\n=== ${root.name} (${root.id}) — ${gt.areas.length} areas, ${gt.routes.length} routes; disciplines: ${present.map(d => d + ":" + gt.routes.filter(r => r.discipline === d).length).join(", ")}`);
  const center = root.lat != null ? { lat: +root.lat + 0.03, lng: +root.lng - 0.03, label: "test point" } : null;
  const V = variations(present, center);
  let pass = 0, fail = 0, empty = 0;
  for (const v of V) {
    for (const metric of [false, true]) {
      if (metric && !["gain", "trip", "elev", "prom", "near"].some(k => v.f[k] && v.f[k] !== DEF[k])) continue; // units only change these
      const x = UI.finderArgs("", v.f, metric);
      const expect = gt.routes.filter(r => why(r, gt.areaOf.get(r.area_id) || {}, x) === null);
      if (expect.length > 3000) { console.log("  skip (too big " + expect.length + "): " + v.label); continue; }
      const runs = [];
      for (let run = 0; run < 2; run++) {
        const cnt = await rpc("routes_in_subtree_count", countArgs(x, root.id));
        const got = [];
        for (let off = 0; ; off += 500) { const p = await rpc("routes_in_subtree", argsToRpc(x, 500, off, root.id)); got.push(...p); if (p.length < 500) break; }
        runs.push({ cnt, got });
      }
      const problems = [];
      for (const [ri, { cnt, got }] of runs.entries()) {
        const ids = got.map(r => r.id), set = new Set(ids), exp = new Set(expect.map(r => r.id));
        if (set.size !== ids.length) problems.push(`run${ri + 1}: ${ids.length - set.size} duplicate rows across pages`);
        if (Number(cnt) !== expect.length) problems.push(`run${ri + 1}: count ${cnt} ≠ expected ${expect.length}`);
        const extra = got.filter(r => !exp.has(r.id)), missing = expect.filter(r => !set.has(r.id));
        if (extra.length) problems.push(`run${ri + 1}: ${extra.length} extra, e.g. ${extra.slice(0, 3).map(r => r.name + " [" + why(gt.routes.find(g => g.id === r.id) || r, gt.areaOf.get(r.area_id) || {}, x) + "]").join("; ")}`);
        if (missing.length) problems.push(`run${ri + 1}: ${missing.length} missing, e.g. ${missing.slice(0, 3).map(r => r.name + " (" + r.discipline + " " + (r.grade || "") + ")").join("; ")}`);
        const pc = primaryCmp(x.sortBy, gt.areaOf, x);
        let inv = 0, ex = "";
        for (let i = 1; i < got.length; i++) if (pc(got[i - 1], got[i]) > 0) { inv++; if (!ex) ex = `${got[i - 1].name} > ${got[i].name}`; }
        if (inv) problems.push(`run${ri + 1}: ${inv} out-of-order pairs for sort ${x.sortBy}, e.g. ${ex}`);
      }
      if (runs[0].got.map(r => r.id).join() !== runs[1].got.map(r => r.id).join()) problems.push("run1 and run2 returned different lists/orders");
      const label = v.label + (metric ? " [metric]" : "");
      if (problems.length) { fail++; console.log("  FAIL " + label + " → " + problems.join(" | ")); report.push({ area: root.name, label, problems }); }
      else { pass++; if (!expect.length) empty++; }
    }
  }
  console.log(`  ${root.name}: ${pass} passed (${empty} of them correctly empty), ${fail} failed; ${calls} API calls so far`);
}
fs.writeFileSync(path.join(TMP, "finder-audit-report.json"), JSON.stringify(report, null, 1));
console.log("\nDONE: " + report.length + " failing variations; " + calls + " API calls");
