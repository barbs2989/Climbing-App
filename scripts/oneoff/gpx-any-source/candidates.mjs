// Peakbagger harvest files -> per-route track candidates, judged MECHANICALLY against the route's
// own pins (the same 300 m rule apply.mjs enforces). Route IDENTITY is not decided here: that is
// research, done per candidate by an agent that reads our route text against the ascent's route
// name, trip report and line. Read-only.
// Usage: node candidates.mjs <worklist.json> <out.json> <harvest.json>...
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
import { assessTrack, haversineM } from "../gpx-tracks-fkt/rule.mjs";

const [wlFile, out, ...files] = process.argv.slice(2);
const wl = JSON.parse(fs.readFileSync(wlFile, "utf8"));
const peaks = new Map();
// later files win (re-runs), but a record that found no peak (a skipped or failed lookup) never
// replaces one that did
const found = r => r.pb && !r.pb.skip && r.pb.dm <= 2000;
for (const f of files) for (const rec of JSON.parse(fs.readFileSync(f, "utf8"))) if (found(rec) || !peaks.has(rec.area_id)) peaks.set(rec.area_id, rec);
// one ascent once: a peak harvested twice, or a resumed worker, repeats ascents
for (const rec of peaks.values()) if (Array.isArray(rec.tracks)) { const seen = new Set(); rec.tracks = rec.tracks.filter(t => !seen.has(String(t.aid)) && seen.add(String(t.aid))); }
const ids = wl.filter(r => peaks.get(r.area_id)?.tracks?.some(t => t.pts)).map(r => r.id);
const rows = [];
for (let i = 0; i < ids.length; i += 80)
  rows.push(...await selectAll("routes", "id,name,area_id,discipline,waypoints", `id=in.(${ids.slice(i, i + 80).map(encodeURIComponent).join(",")})`, { pageSize: 1000 }));
const stat = (t, k) => (t.stats || []).find(s => s[1] === k)?.[2] || "";
const result = [];
for (const r of rows) {
  const rec = peaks.get(r.area_id);
  const wps = (r.waypoints || []).filter(w => w.lat != null && w.lng != null);
  const th = wps.filter(w => /trailhead/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  let sm = wps.filter(w => /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const summitFromPeak = !sm.length && rec.pb?.lat != null;
  if (summitFromPeak) sm = [[rec.pb.lat, rec.pb.lng]];
  const cands = [];
  for (const t of rec.tracks || []) {
    if (!t.pts || t.pts.length < 10) continue;
    const type = stat(t, "Ascent Type");
    const summited = /Successful Summit/i.test(type) || (!type && t.ok);
    const pts = t.pts.map(p => [p[0], p[1]]);
    let sumM = Infinity; for (const q of pts) for (const s of sm) sumM = Math.min(sumM, haversineM(q, s));
    const startTh = th.length ? Math.min(...th.map(x => haversineM(pts[0], x))) : null;
    const endTh = th.length ? Math.min(...th.map(x => haversineM(pts.at(-1), x))) : null;
    const loop = haversineM(pts[0], pts.at(-1));
    const complete = th.length && sm.length ? assessTrack(pts, wps).complete : false;
    const oneway = startTh != null && startTh <= 300 && sumM <= 300;
    cands.push({ aid: t.aid, date: t.date, route: t.route, summited, ascentType: type, n: t.n, kept: t.pts.length,
      startThM: startTh == null ? null : Math.round(startTh), endThM: endTh == null ? null : Math.round(endTh),
      summitM: Number.isFinite(sumM) ? Math.round(sumM) : null, loopM: Math.round(loop), complete, oneway,
      // no trailhead pin: a track that closes on itself and reaches the summit is a round trip from SOME
      // trailhead, which research must name before a Trailhead pin is added
      needsTrailhead: !th.length && sumM <= 300 && loop <= 300 });
  }
  const usable = cands.filter(c => c.summited && (c.complete || c.oneway || c.needsTrailhead));
  // PIN EVIDENCE (owner 2026-11-04: "if our pins are wrong fix them"). Never decided here: an agent
  // researches it. Starts of summited recordings that agree with each other (<=300 m) but sit far
  // from our trailhead pin; the highest point of each summited recording vs our summit pin and
  // Peakbagger's own summit coordinate (a round trip's summit is its HIGHEST point, not its farthest).
  const good = (rec.tracks || []).filter(t => t.pts && t.pts.length >= 10 && cands.find(c => c.aid === t.aid)?.summited);
  const starts = good.map(t => [t.pts[0][0], t.pts[0][1]]);
  const startClusters = [];
  for (const s of starts) { const c = startClusters.find(c => haversineM(c.at, s) <= 300); if (c) c.n++; else startClusters.push({ at: s, n: 1 }); }
  const highs = good.filter(t => t.pts.some(p => p[2] != null)).map(t => { const h = t.pts.reduce((a, p) => (p[2] ?? -1e9) > (a[2] ?? -1e9) ? p : a); return { aid: t.aid, at: [h[0], h[1]], eleM: h[2] }; });
  const pin = {
    startClusters: startClusters.filter(c => c.n >= 2).map(c => ({ at: c.at, n: c.n, fromOurThM: th.length ? Math.round(Math.min(...th.map(x => haversineM(c.at, x)))) : null })),
    highs: highs.map(h => ({ ...h, fromOurSummitM: !summitFromPeak && sm.length ? Math.round(Math.min(...sm.map(s => haversineM(h.at, s)))) : null, fromPbM: rec.pb?.lat != null ? Math.round(haversineM(h.at, [rec.pb.lat, rec.pb.lng])) : null })),
    ourSummitFromPbM: !summitFromPeak && sm.length && rec.pb?.lat != null ? Math.round(Math.min(...sm.map(s => haversineM(s, [rec.pb.lat, rec.pb.lng])))) : null,
  };
  pin.suspect = pin.startClusters.some(c => c.fromOurThM != null && c.fromOurThM > 300) || (pin.ourSummitFromPbM != null && pin.ourSummitFromPbM > 150 && pin.highs.filter(h => h.fromPbM <= 150).length >= 1);
  result.push({ id: r.id, name: r.name, area_id: r.area_id, discipline: r.discipline, peak: rec.name,
    pb: rec.pb && { pid: rec.pb.pid, dm: rec.pb.dm }, hasTh: th.length > 0, summitFromPeak, cands, usable: usable.length, pin });
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
const n = result.filter(x => x.usable).length;
console.log("routes with any harvested track", result.length, "with a usable (summited, passes pins) candidate", n, "pin suspect", result.filter(x => x.pin.suspect).length);
