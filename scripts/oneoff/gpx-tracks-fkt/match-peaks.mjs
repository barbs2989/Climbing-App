// Match FKT tracks to routes that have NO trailhead/summit pins, by the PEAK's own coordinate.
// A track is a candidate for a peak when it passes within SUMMIT_M of the peak's summit point and
// is a loop or out-and-back (ends within LOOP_M of where it starts: a trailhead-summit-trailhead
// trip) or reaches the summit from far below (one-way). Each candidate lists EVERY route on that
// peak, because the track is one line and research must decide which route, if any, it is.
// Offline. Usage: node match-peaks.mjs <tracks.json> [<tracks.json> ...]
import fs from "fs";
import { haversineM } from "./rule.mjs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const OUT = process.env.FKT_OUT || D;   // FKT_OUT: write candidates elsewhere, keeping the round-trip wave's record
const SUMMIT_M = 150, LOOP_M = 300;
const routes = JSON.parse(fs.readFileSync(`${D}/routes.json`, "utf8"));
const peaks = JSON.parse(fs.readFileSync(`${D}/peaks.json`, "utf8"));
const pinned = new Set(JSON.parse(fs.readFileSync("research-data/gpx-tracks-fkt-wa-2026-10-29/targets.json", "utf8")).map(r => r.id)
  .concat(fs.existsSync("research-data/gpx-tracks-fkt-other-2026-10-29/targets.json") ? JSON.parse(fs.readFileSync("research-data/gpx-tracks-fkt-other-2026-10-29/targets.json", "utf8")).map(r => r.id) : []));
const byPeak = {};
for (const r of routes) if (!pinned.has(r.id)) (byPeak[r.area_id] ||= []).push(r);
const peakList = peaks.filter(p => byPeak[p.id]);
const tracks = process.argv.slice(2).flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));
const out = [];
for (const t of tracks) {
  let a = 90, b = -90, c = 180, d = -180;
  for (const p of t.pts) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; if (p[1] < c) c = p[1]; if (p[1] > d) d = p[1]; }
  const loop = haversineM(t.pts[0], t.pts.at(-1)) <= LOOP_M;
  for (const pk of peakList) {
    if (pk.lat < a - 0.01 || pk.lat > b + 0.01 || pk.lng < c - 0.01 || pk.lng > d + 0.01) continue;
    let best = Infinity; for (const q of t.pts) { const m = haversineM(q, [pk.lat, pk.lng]); if (m < best) best = m; }
    if (best > SUMMIT_M) continue;
    // owner 2026-10-30: one-way tracks are allowed too, but only trailhead -> summit: one that goes on
    // past the summit is a traverse or another descent, so a one-way must END at the summit
    if (!loop && haversineM(t.pts.at(-1), [pk.lat, pk.lng]) > LOOP_M) continue;
    out.push({ slug: t.slug, fktTitle: t.title, peak: pk.id, peakName: pk.name, summitM: Math.round(best), tier: loop ? "round" : "oneway",
      routes: byPeak[pk.id].map(r => ({ id: r.id, name: r.name, discipline: r.discipline, grade: r.grade })) });
  }
}
fs.writeFileSync(`${OUT}/candidates.json`, JSON.stringify(out, null, 1));
// PER PEAK (owner, 2026-10-30): one research item per peak, holding all our routes on it and every
// FKT round trip that reaches its summit, so a reviewer assigns each track to the ONE route whose
// line it follows, or to none.
const peaksOut = {};
for (const o of out) {
  const g = (peaksOut[o.peak] ||= { peak: o.peak, peakName: o.peakName, routes: o.routes, tracks: [] });
  g.tracks.push({ slug: o.slug, fktTitle: o.fktTitle, summitM: o.summitM, tier: o.tier });
}
fs.writeFileSync(`${OUT}/peaks-to-research.json`, JSON.stringify(Object.values(peaksOut), null, 1));
const nr = out.reduce((s, o) => s + o.routes.length, 0);
console.log(`tracks ${tracks.length}; peaks with unpinned routes ${peakList.length}; track-peak pairs ${out.length} (round ${out.filter(o => o.tier === "round").length}, oneway ${out.filter(o => o.tier === "oneway").length}); route candidates ${nr}; peaks reached ${new Set(out.map(o => o.peak)).size}`);
