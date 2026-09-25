// Replace a route's `gpx` line with a RECORDED GPS track, and fill `elev_pts` from the same recording.
//
// Source: the reference tracks published for Washington routes on fastestknowntime.com, downloaded
// by hand into a directory passed as --gpx-dir (files named <slug>__<n>.gpx). Nothing here names
// that source to a climber — the app shows no sources anywhere — and `gps_contributor_name` is left
// alone for the same reason.
//
// WHICH TRACK IS WHICH ROUTE WAS DECIDED BY GEOMETRY, NOT BY NAME. Every track was scored against
// every route on its peak: trailhead pin to the nearer track end, summit pin to the track, and the
// share of the route's own waypoints lying on the line. Where two routes share one approach (Baker's
// Easton and Squak both leave Schreiber's Meadow) the tie was broken by where the line actually goes
// (Easton climbs the Railroad Grade at lng -121.84; Squak climbs east of it at -121.81). Tracks that
// match no route's line — a different trailhead (Bacon, Hinman, Twin Sisters, Oval), a multi-peak
// link-up of single-peak routes (Gardner, Clark-Luahna, Craggy), a loop variant (Windy) — are NOT
// applied, because a correct line on the wrong route is the contamination this catalog keeps paying for.
//
// SHAPE. A summit route's line runs TRAILHEAD → SUMMIT, the convention lib/track.js measures against
// (trackCoverage) and ElevChart labels (first point = start elevation, last = the top). The recordings
// are mostly round trips, so for `ascent` the line is cut at the first pass of the summit. A traverse
// keeps the whole recording (`full`). Both are resampled at EQUAL DISTANCE so `elev_pts` — which
// ElevChart spaces evenly by index — lines up with the map.
//
// A recording with no elevation (three hand-drawn lines) writes `gpx` only and leaves `elev_pts`.
//
//   node scripts/oneoff/apply-recorded-wa-tracks.mjs --gpx-dir DIR            # dry run: prints the plan
//   node scripts/oneoff/apply-recorded-wa-tracks.mjs --gpx-dir DIR --write    # writes + rollback + re-read
//   node scripts/oneoff/apply-recorded-wa-tracks.mjs --gpx-dir DIR --emit OUT # processes the NEW-route tracks only
//   add --batch 2 to run PLAN2 (link-ups cut to one peak) instead; its rollback is ...-2.json
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const PLAN = [
  // [track file stem, mode, [route ids]]
  ["abernathy-peak-wa__1", "ascent", ["wa_abernathy_peak_south_ridge"]],
  ["black-peak-wa__1", "ascent", ["wa_south_ridge_3"]],
  ["bonanza-peak-0__1", "ascent", ["wa_bonanza_peak_mary_green_glacier"]],
  ["brothers-wa__1", "ascent", ["wa_the_brothers_south_couloir"]],
  ["chelan-butte-wa__1", "ascent", ["wa_chelan_butte_chelan_butte_trail"]],
  ["crater-mountain-wa__1", "ascent", ["wa_crater_mountain_standard_route"]],
  ["dragontail-peak-wa__1", "ascent", ["wa_dragontail_peak_east_ridge_aasgard_pass"]],
  ["eldorado-peak-wa__1", "ascent", ["wa_eldorado_peak_east_ridge"]],
  ["fisher-chimneys-mt-shuksan__1", "ascent", ["wa_mount_shuksan_fisher_chimneys"]],
  ["glacier-peak-wa__1", "ascent", ["wa_glacier_peak_cool_glacier_gerdine"]],
  ["goode-mountain-northeast-buttress__1", "ascent", ["wa_mount_goode_northeast_buttress"]],
  ["hadley-peak-wa__1", "ascent", ["wa_hadley_peak_skyline_divide"]],
  ["jack-mountain-wa__1", "ascent", ["wa_jack_mountain_south_face"]],
  ["kaleetan-peak-wa__1", "ascent", ["wa_kaleetan_peak_south_ridge"]],
  ["little-annapurna-wa__1", "ascent", ["wa_little_annapurna_south_slopes"]],
  ["little-tahoma-peak-wa__1", "ascent", ["wa_little_tahoma_east_shoulder", "wa_frying_pan_whitman_glaciers"]],
  ["mount-baker-wa__1", "ascent", ["wa_mount_baker_easton_glacier"]],
  ["mount-baker-wa__2", "ascent", ["wa_mount_baker_squak_glacier"]],
  ["mount-cruiser-0__1", "ascent", ["wa_mount_cruiser_south_corner"]],
  ["mount-deception-wa__1", "ascent", ["wa_mount_deception_standard"]],
  ["mount-pugh__1", "ascent", ["wa_mount_pugh_stujack"]],
  ["mount-terror-wa__1", "ascent", ["wa_mount_terror_west_ridge"]],
  ["mt-adams-wa__1", "ascent", ["wa_mount_adams_south_climb"]],
  ["mt-daniel-wa__1", "ascent", ["wa_mount_daniel_daniel_glacier"]],
  ["mt-pilchuck__1", "ascent", ["wa_mount_pilchuck_standard_route"]],
  ["mt-rainier-wa__1", "ascent", ["wa_mount_rainier_disappointment_cleaver"]],
  ["mt-shuksan-sulphide-glacier-wa__1", "ascent", ["wa_mount_shuksan_sulphide_glacier"]],
  ["mt-st-helens-wa__1", "ascent", ["wa_mount_st_helens_monitor_ridge"]],
  ["mt-stone-wa__1", "ascent", ["wa_mount_stone_lake_of_angels", "wa_mount_stone_putvin"]],
  ["mt-stuart__1", "ascent", ["wa_mount_stuart_cascadian_couloir"]],
  ["mt-thomson-west-ridge-wa__1", "ascent", ["wa_mount_thomson_west_ridge"]],
  ["mt-washington-olympic-peninsula__1", "ascent", ["wa_mount_washington_olympic_standard"]],
  ["northeast-buttress__1", "ascent", ["wa_johannesburg_mountain_northeast_rib_1951_route"]],
  ["ptarmigan-traverse-wa__1", "full", ["wa_ptarmigan_traverse"]],
  ["ragged-ridge-wa__1", "full", ["wa_ragged_ridge"]],
  ["robinson-mountain-wa__1", "ascent", ["wa_robinson_mountain_southeast_ridge"]],
  ["ruby-mountain__1", "ascent", ["wa_ruby_mountain_south_ridge"]],
  ["ruth-mountain-wa__1", "ascent", ["wa_ruth_mountain_south_slopes"]],
  ["snowfield-peak-wa__1", "ascent", ["wa_snowfield_peak_neve_glacier"]],
  ["west-mcmillan-spire__1", "ascent", ["wa_mcmillan_spire_west_west_ridge"]],
  ["west-ridge-forbidden-peak-c2c__1", "ascent", ["wa_forbidden_peak_west_ridge"]],
];
// BATCH 2 (--batch 2): tracks that record MORE than one route, or start somewhere else, cut down to
// the part that IS the route. Loop order was read off the recording, never assumed:
//   forward  start -> first pass of the summit, never re-oriented (a loop's end can sit nearer the
//            trailhead than its start, and flipping it would hand a peak the OTHER peak's leg)
//   reverse  last pass of the summit -> end, flipped to run trailhead -> summit: the descent leg,
//            used for the SECOND peak of a loop so its line does not run over the first peak
//   trim     the ascent from the point nearest the route's trailhead pin (the recording began lower)
// Checked and NOT applied: Oval Peak — both recordings start 6.9 km from our trailhead pin, and a
// third recording described as starting at Eagle Creek TH starts 20 m from that pin, so ours is right
// and those runners used another trailhead. Luahna — the Clark–Luahna double reaches it by a
// different approach (our Napeequa ford pin is 1.2 km off it).
const PLAN2 = [
  ["clark-and-luahna-peak-double-wa__1", "forward", ["wa_clark_mountain_west_ridge"]],
  ["big-craggy-west-craggy-loop-wa__1", "forward", ["wa_big_craggy_peak_scramble"]],
  ["big-craggy-west-craggy-loop-wa__1", "reverse", ["wa_west_craggy_peak_standard_route"]],
  ["gardner-north-gardner-wa__3", "forward", ["wa_gardner_mountain_west_ridge"]],        // tops Gardner at 43% of the recording
  ["gardner-north-gardner-wa__3", "reverse", ["wa_north_gardner_mountain_southwest"]],   // then North Gardner at 49%; two recordings descend it on one line (median 7 m apart)
  ["mount-ellinor-roundtrip__1", "trim", ["wa_mount_ellinor_standard"]],                 // began at the lower trailhead
];
// New routes, inserted by a separate step; processed here so the insert uses the same shaping.
// [stem, mode, summit/end coordinate for an ascent cut or null]
const NEW = [
  ["vesper-peak__1", "ascent"],
  ["big-chiwaukum__1", "ascent"],
  ["inspiration-traverse-wa__1", "full"],
  ["enchantment-enchainment-wa__1", "full"],
  ["painted-traverse-wa__1", "full"],
];

// Gates, applied AFTER shaping. A line that fails them is refused, not bent to fit.
const MAX_TRAILHEAD_GAP_M = 500;   // trailhead pin to the line's start
const MAX_SUMMIT_GAP_M = 200;      // summit pin to the line's end (ascent) / nearest point (full)
const MAX_POINTS = 800;

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = opt("--gpx-dir"), WRITE = args.includes("--write"), EMIT = opt("--emit"), BATCH = opt("--batch") || "1";
if (!DIR) { console.error("--gpx-dir DIR is required"); process.exit(2); }

const R = 6371000, rad = x => x * Math.PI / 180;
const dist = (a, b) => { const dLa = rad(b[0] - a[0]), dLo = rad(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

function parseGpx(file) {
  const s = fs.readFileSync(file, "utf8"), out = [];
  const re = /<(trkpt|rtept)\s+([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g; let m;
  while ((m = re.exec(s))) {
    const la = +(/lat="([^"]+)"/.exec(m[2]) || [])[1], lo = +(/lon="([^"]+)"/.exec(m[2]) || [])[1];
    const e = m[4] ? /<ele>([^<]+)<\/ele>/.exec(m[4]) : null;
    if (Number.isFinite(la) && Number.isFinite(lo)) out.push([la, lo, e && Number.isFinite(+e[1]) ? +e[1] : null]);
  }
  return out;
}

// Equal-distance resample; elevation interpolated where present, then a 5-point moving average to
// take out GPS jitter without flattening the shape.
function resample(pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const len = cum[cum.length - 1];
  const n = Math.max(2, Math.min(MAX_POINTS, Math.ceil(len / 15) + 1)), step = len / (n - 1);
  const eleIdx = pts.map((p, i) => p[2] != null ? i : -1).filter(i => i >= 0);
  const hasEle = eleIdx.length >= 0.9 * pts.length;
  const out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const d = k * step; while (j < pts.length - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j], t = seg > 0 ? Math.min(1, Math.max(0, (d - cum[j]) / seg)) : 0;
    const a = pts[j], b = pts[j + 1];
    let e = null;
    if (hasEle) { const ea = a[2] ?? b[2], eb = b[2] ?? a[2]; e = ea == null ? null : ea + (eb - ea) * t; }
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, e]);
  }
  let elev = null;
  if (hasEle && out.every(p => p[2] != null)) {
    elev = out.map((_, i) => { const w = out.slice(Math.max(0, i - 2), i + 3); return Math.round(w.reduce((s, p) => s + p[2], 0) / w.length * 3.28084); });
  }
  return { gpx: out.map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]), elev, lenM: len };
}

// Orient to start at the trailhead, then (ascent) cut at the FIRST pass of the summit.
function shape(raw, mode, th, summit) {
  if (mode === "forward" || mode === "reverse" || mode === "trim") {
    let best = Infinity; for (const p of raw) best = Math.min(best, dist(summit, p));
    const near = raw.map(p => dist(summit, p) <= best + 25);
    const first = near.indexOf(true), last = near.lastIndexOf(true);
    if (mode === "reverse") return raw.slice(last).reverse();
    let from = 0;
    if (mode === "trim" && th) for (let i = 0; i <= first; i++) if (dist(th, raw[i]) < dist(th, raw[from])) from = i;
    return raw.slice(from, first + 1);
  }
  let pts = raw.slice();
  if (th && dist(th, pts[pts.length - 1]) < dist(th, pts[0])) pts.reverse();
  if (mode === "ascent" && summit) {
    let best = Infinity; for (const p of pts) best = Math.min(best, dist(summit, p));
    const s = pts.findIndex(p => dist(summit, p) <= best + 25);
    pts = pts.slice(0, s + 1);
  }
  return pts;
}

const k = requireServiceKey();
const q = async path => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${path} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const placed = w => w && typeof w.lat === "number" && typeof w.lng === "number";
const pinOf = (wps, re) => { const w = (wps || []).find(x => placed(x) && re.test(String(x.type || ""))); return w ? [w.lat, w.lng] : null; };

if (EMIT) {
  const out = {};
  for (const [stem, mode] of NEW) {
    const raw = parseGpx(`${DIR}/${stem}.gpx`);
    // A new route has no summit pin yet, so an ascent is cut at the recording's HIGHEST point —
    // on a single-peak out-and-back that is the summit, and it is where the pin will come from.
    const top = raw.reduce((b, p) => (p[2] != null && (b == null || p[2] > b[2]) ? p : b), null);
    const r = resample(shape(raw, mode, raw[0], mode === "ascent" && top ? top : null));
    out[stem] = { mode, ...r, rawPts: raw.length, top, start: raw[0] };
    console.log(`${stem}: ${raw.length} raw -> ${r.gpx.length} pts, ${(r.lenM / 1000).toFixed(1)} km, elev ${r.elev ? r.elev[0] + "→" + Math.max(...r.elev) + " ft" : "no"}, top ${top ? top.map(x => +(+x).toFixed(5)).join(",") : "—"}`);
  }
  fs.writeFileSync(EMIT, JSON.stringify(out));
  process.exit(0);
}

const plan = BATCH === "2" ? PLAN2 : PLAN;
const ids = plan.flatMap(p => p[2]);
const rows = await q(`routes?select=id,name,area_id,waypoints,approach_logistics,gpx,elev_pts&id=in.(${ids.join(",")})`);
const byId = new Map(rows.map(r => [r.id, r]));
const missing = ids.filter(id => !byId.has(id));
if (missing.length) { console.error("ROUTES NOT FOUND — refusing:", missing); process.exit(1); }
const areaIds = [...new Set(rows.map(r => r.area_id))];
const areas = new Map((await q(`areas?select=id,name,lat,lng&id=in.(${areaIds.join(",")})`)).map(a => [a.id, a]));

const writes = [], refused = [];
for (const [stem, mode, targets] of plan) {
  const raw = parseGpx(`${DIR}/${stem}.gpx`);
  if (raw.length < 2) { refused.push([stem, "empty recording"]); continue; }
  for (const id of targets) {
    const r = byId.get(id), a = areas.get(r.area_id);
    const al = r.approach_logistics || {};
    const th = pinOf(r.waypoints, /trailhead/i) || (typeof al.trailheadLat === "number" ? [al.trailheadLat, al.trailheadLng] : null);
    const summit = pinOf(r.waypoints, /summit|topout/i) || (a && typeof a.lat === "number" ? [a.lat, a.lng] : null);
    const line = shape(raw, mode, th, summit);
    const res = resample(line);
    const g = res.gpx, thGap = th ? dist(th, g[0]) : null;
    const sumGap = summit ? (mode === "ascent" ? dist(summit, g[g.length - 1]) : Math.min(...g.map(p => dist(summit, p)))) : null;
    const why = [];
    if (thGap != null && thGap > MAX_TRAILHEAD_GAP_M) why.push(`trailhead ${Math.round(thGap)} m from the line's start`);
    if (sumGap != null && mode === "ascent" && sumGap > MAX_SUMMIT_GAP_M) why.push(`summit ${Math.round(sumGap)} m from the line's end`);
    const tag = `${id.padEnd(50)} ${stem.padEnd(38)} ${mode.padEnd(6)} ${String(g.length).padStart(4)} pts ${(res.lenM / 1609.34).toFixed(1).padStart(5)} mi  TH ${thGap == null ? "—" : Math.round(thGap) + "m"}  top ${sumGap == null ? "—" : Math.round(sumGap) + "m"}  elev ${res.elev ? res.elev[0] + "→" + Math.max(...res.elev) + " ft" : "none"}  (was ${(r.gpx || []).length} pts)`;
    if (why.length) { refused.push([id, why.join("; ")]); console.log("REFUSE " + tag); continue; }
    console.log("  ok   " + tag);
    const body = { gpx: g }; if (res.elev) body.elev_pts = res.elev;
    writes.push({ id, body, before: { gpx: r.gpx ?? null, elev_pts: r.elev_pts ?? null } });
  }
}
console.log(`\n${writes.length} to write, ${refused.length} refused`);
for (const [x, why] of refused) console.log("  refused:", x, "—", why);
if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }

const rb = new URL(BATCH === "2" ? "../rollback-recorded-wa-tracks-2.json" : "../rollback-recorded-wa-tracks.json", import.meta.url);
fs.writeFileSync(rb, JSON.stringify({ note: "gpx/elev_pts before apply-recorded-wa-tracks.mjs; restore with patchRow(routes, id, before)", at: new Date().toISOString(), rows: writes.map(w => ({ id: w.id, before: w.before })) }, null, 1));
console.log("rollback written:", rb.pathname);
for (const w of writes) await patchRow("routes", w.id, w.body);

// A 200 is not evidence. Re-read and compare.
const after = new Map((await q(`routes?select=id,gpx,elev_pts&id=in.(${writes.map(w => w.id).join(",")})`)).map(r => [r.id, r]));
let bad = 0;
for (const w of writes) {
  const a = after.get(w.id);
  const ok = a && JSON.stringify(a.gpx) === JSON.stringify(w.body.gpx) && (!w.body.elev_pts || JSON.stringify(a.elev_pts) === JSON.stringify(w.body.elev_pts));
  if (!ok) { bad++; console.log("NOT LANDED:", w.id); }
}
console.log(`re-read: ${writes.length - bad}/${writes.length} landed`);
if (bad) process.exit(1);
