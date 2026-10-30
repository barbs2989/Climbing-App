// Is an FKT route-page GPX a RECORDING or a DRAWN line? FKT's own how-to lets a route submitter
// upload either: a watch file, or "a route on Strava" exported as GPX. The owner's rule (2026-10-25)
// is a recorded track or nothing, and "only use gpx tracks where the person reached the summit" —
// a drawn line proves neither. Evidence per file:
//   recorded: track points (<trkpt>) that carry <time>, and the times run forward
//   drawn:    no per-point times, or only <rtept> route points, or a route-planner creator
// The times are read ONLY to classify the file; they are never stored (FKT times are record pace).
// Usage: node audit-recorded.mjs <gpx dir> [<gpx dir> ...]  -> prints counts, writes recorded-audit.json
import fs from "fs";
import path from "path";
const PLANNERS = /strava ?route|route ?builder|caltopo|gaia ?gps|ridewithgps|plotaroute|komoot|alltrails|onx|gpsies|mapmyrun|footpath|openrunner|google|bikemap|outdooractive|mapometer|gpx\.studio|routeconverter|basecamp/i;
const out = {};
for (const dir of process.argv.slice(2)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".gpx"))) {
  const xml = fs.readFileSync(path.join(dir, f), "utf8");
  const creator = (/<gpx\b[^>]*\bcreator="([^"]*)"/i.exec(xml) || [])[1] || "";
  const trk = (xml.match(/<trkpt\b/g) || []).length, rte = (xml.match(/<rtept\b/g) || []).length;
  // one point at a time (a lazy match across the file is quadratic when there are no <time> tags)
  const times = [];
  for (const seg of xml.split(/<trkpt\b/).slice(1)) {
    const body = seg.slice(0, seg.indexOf("</trkpt>") >= 0 ? seg.indexOf("</trkpt>") : 0);
    const m = /<time>([^<]+)<\/time>/.exec(body);
    if (m) { const t = Date.parse(m[1]); if (Number.isFinite(t)) times.push(t); }
  }
  let forward = 0; for (let i = 1; i < times.length; i++) if (times[i] >= times[i - 1]) forward++;
  const timed = trk > 0 && times.length >= trk * 0.9 && forward >= (times.length - 1) * 0.98 && times.at(-1) - times[0] > 10 * 60 * 1000;
  const verdict = timed && !PLANNERS.test(creator) ? "recorded" : timed ? "recorded?planner-creator" : "drawn";
  out[f.slice(0, -4)] = { verdict, creator, trk, rte, timed: times.length };
}
const dir0 = "research-data/gpx-tracks-fkt-wa-2026-10-29";
fs.writeFileSync(`${dir0}/recorded-audit.json`, JSON.stringify(out, null, 1));
const n = {}; for (const v of Object.values(out)) n[v.verdict] = (n[v.verdict] || 0) + 1;
console.log(Object.keys(out).length, "files", n);
const cr = {}; for (const v of Object.values(out)) if (v.verdict !== "recorded") { const k = v.creator.slice(0, 40) || "(none)"; cr[k] = (cr[k] || 0) + 1; }
console.log("creators of non-recorded files:", Object.entries(cr).sort((a, b) => b[1] - a[1]).slice(0, 15));
