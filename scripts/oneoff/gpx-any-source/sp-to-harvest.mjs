// SummitPost harvest (sp-harvester.js) -> the Peakbagger harvest shape candidates/packets/apply-verdicts read.
// Usage: node sp-to-harvest.mjs <sp-wa.json> <sp-wa-dates2.json> <out pb-wa-sp.json> [sp-wa-recorded.json]
//   sp-wa-dates2.json: { "<gpx file id>": "YYYY-MM-DD" } — the date of the FIRST TRACK POINT (never <metadata>:
//   that is the export date — 2013-09-25..27 on ten files), used only for the season rule; no time is written.
//   sp-wa-recorded.json: { "<f>": { n, nt, distinct, spanH, mono, creator } } (README "Then SummitPost").
// RECORDED OR NOTHING (memory route-map-line-is-a-recorded-track-or-nothing). WA 2026-11-04: every GPSies file
// had model-smooth elevation (direction reversals < 0.13 a point vs 0.14-0.26 on GPS recordings) and SYNTHETIC
// times (Mount Baker in 1.2 h, Glacier Peak in 2.4 h, a 2010-01-01 stamp): drawn or resampled, so refused. A date
// is kept only when the times look real (half of them distinct, span 0.5-120 h); a time-less recording gets no date, so its season is
// unproven unless the research finds one.
// A SummitPost GPX hangs off a ROUTE page and carries no ascent type. The owner's rule is "the person
// summited", so a track is stamped a summit ONLY when its line passes within SUMMIT_M of the SummitPost
// peak coordinate (which harvesting already matched to ours within 2 km). Everything else is "Not proven".
import fs from "fs";
import { haversineM } from "../gpx-tracks-fkt/rule.mjs";

const SUMMIT_M = 100;
const [spFile, datesFile, out, recFile] = process.argv.slice(2);
let recd = recFile && fs.existsSync(recFile) ? JSON.parse(fs.readFileSync(recFile, "utf8")) : {};
const eleRev = P => { let r = 0; for (let i = 2; i < P.length; i++) { if (P[i][2] == null || P[i - 1][2] == null || P[i - 2][2] == null) continue; if ((P[i - 1][2] - P[i - 2][2]) * (P[i][2] - P[i - 1][2]) < 0) r++; } return r / P.length; };
if (!out) { console.error("usage: node sp-to-harvest.mjs <sp-wa.json> <sp-wa-dates2.json> <out.json> [sp-wa-recorded.json]"); process.exit(1); }
const sp = JSON.parse(fs.readFileSync(spFile, "utf8"));
const dates = fs.existsSync(datesFile) ? JSON.parse(fs.readFileSync(datesFile, "utf8")) : {};
// sp-gpx-meta.js writes ONE file of objects: pass it as the dates file and it serves as both
if (Object.values(dates).some(v => v && typeof v === "object")) { recd = { ...dates }; for (const k of Object.keys(recd)) dates[k] = recd[k].date || ""; }
const recs = [], n = { peaks: 0, tracks: 0, summited: 0, dated: 0, notRecorded: 0 };
for (const p of sp) {
  if (!p.found) continue;
  n.peaks++;
  const top = p.sp.ll;
  const all = [...(p.gpx || []).map(g => ({ g, route: "", page: p.sp })), ...(p.routes || []).flatMap(r => (r.gpx || []).map(g => ({ g, route: r.info?.title || r.slug, page: r })))];
  const seen = new Set(), tracks = [];
  for (const { g, route, page } of all) {
    if (seen.has(g.f) || !g.pts || g.pts.length < 10) continue;
    seen.add(g.f); n.tracks++;
    const closest = Math.min(...g.pts.map(q => haversineM([q[0], q[1]], top)));
    const summited = closest <= SUMMIT_M;
    if (summited) n.summited++;
    const meta = recd[g.f] || {}, rev = eleRev(g.pts), drawn = /gpsies/i.test(meta.creator || "") || rev < 0.1;
    const realTimes = meta.nt > 0 && meta.distinct >= 0.5 * meta.nt && meta.spanH >= 0.5 && meta.spanH <= 120;
    if (drawn) { n.notRecorded++; continue; }
    const date = realTimes ? dates[g.f] || "" : ""; if (date) n.dated++;
    tracks.push({
      aid: `sp${g.f}`, date, ok: summited, gps: true, route, src: "summitpost", spRouteId: page.id || null,
      pts: g.pts, wpts: g.wpts || [], n: g.pts.length,
      closestToSummitM: Math.round(closest), eleReversals: +rev.toFixed(2), creator: meta.creator || "",
      stats: [["", "Ascent Type", summited ? "Successful Summit Attained" : `Not proven (closest point ${Math.round(closest)} m from the summit)`], ["", "Route", route], ["", "Date", date]],
    });
  }
  recs.push({ area_id: p.area_id, name: p.name, pb: { pid: `sp${p.sp.id}`, nm: p.sp.info?.title || p.name, lat: top[0], lng: top[1], dm: p.sp.dM }, tracks, spSections: p.sections, spRoutes: (p.routes || []).map(r => ({ id: r.id, title: r.info?.title, info: r.info, sections: r.sections, hasGpx: (r.gpx || []).length > 0 })) });
}
fs.writeFileSync(out, JSON.stringify(recs));
console.log(JSON.stringify(n), "->", out);
