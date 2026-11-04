// Per-peak research packets for the agents: our routes as stored, Peakbagger's peak record, every
// logged ascent (date + route, for the SEASON research), and each harvested track with its trip
// report, stats and the mechanical pin checks from candidates.mjs. Read-only.
// Usage: node packets.mjs <candidates.json> <allascents.json> <outDir> <harvest.json>...
import fs from "fs";
import path from "path";
import { selectAll } from "../../lib/supabase-env.mjs";

const [candFile, allFile, outDir, ...files] = process.argv.slice(2);
const cands = JSON.parse(fs.readFileSync(candFile, "utf8"));
const all = JSON.parse(fs.readFileSync(allFile, "utf8"));
const found = r => r.pb && !r.pb.skip && r.pb.dm <= 2000;
const peaks = new Map();
for (const f of files) for (const rec of JSON.parse(fs.readFileSync(f, "utf8"))) if (found(rec) || !peaks.has(rec.area_id)) peaks.set(rec.area_id, rec);
fs.mkdirSync(outDir, { recursive: true });

const ids = cands.map(c => c.id);
const COLS = "id,name,area_id,discipline,grade,face,aspect,season,best_season,seasonal_guidance,overview,approach,descent_text,beta,waypoints,gain_ft,dist_km,high_point_ft,approach_logistics,what_to_bring,watch_out,pro_tips";
const rows = [];
for (let i = 0; i < ids.length; i += 60) rows.push(...await selectAll("routes", COLS, `id=in.(${ids.slice(i, i + 60).map(encodeURIComponent).join(",")})`, { pageSize: 1000 }));
const cut = (s, n) => (s == null ? null : String(s).length > n ? String(s).slice(0, n) + "…" : s);
const byArea = new Map();
for (const r of rows) (byArea.get(r.area_id) || byArea.set(r.area_id, []).get(r.area_id)).push(r);

const monthOf = d => { const m = /^\(?\d{4}-(\d{2})/.exec(d || ""); return m ? +m[1] : null; };
let n = 0;
for (const [area, rs] of byArea) {
  const rec = peaks.get(area); if (!rec?.pb?.pid) continue;
  const asc = (all[rec.pb.pid] || []).map(([date, ok, route, gain, mi, gps]) => ({ date, ok: !!ok, route, gain, mi, gps: !!gps }));
  const hist = {}; for (const a of asc) if (a.ok) { const m = monthOf(a.date); if (m) hist[m] = (hist[m] || 0) + 1; }
  const byRoute = {}; for (const a of asc) if (a.ok && a.route) { const k = a.route.trim(); const m = monthOf(a.date); (byRoute[k] ||= {}); if (m) byRoute[k][m] = (byRoute[k][m] || 0) + 1; }
  const packet = {
    area_id: area, peak: rec.name,
    peakbagger: { pid: rec.pb.pid, matchedName: rec.pb.nm, distFromOurAreaCoordM: rec.pb.dm, lat: rec.pb.lat, lng: rec.pb.lng, info: rec.pb.info || null },
    ascentMonthsAllRoutes: hist, ascentMonthsByLoggedRoute: byRoute, ascentCount: asc.length,
    routes: rs.map(r => ({
      id: r.id, name: r.name, discipline: r.discipline, grade: r.grade, face: r.face, aspect: r.aspect,
      season: r.season, best_season: r.best_season, optimalWindow: r.seasonal_guidance?.optimalWindow ?? null,
      monthBreakdown: r.seasonal_guidance?.monthBreakdown ?? null,
      overview: cut(r.overview, 700), approach: cut(r.approach, 1200), descent_text: cut(r.descent_text, 700), beta: cut(r.beta, 700),
      trailheadName: r.approach_logistics?.trailhead ?? null,
      waypoints: (r.waypoints || []).map(w => ({ type: w.type, name: w.name, lat: w.lat, lng: w.lng, elev: w.elev })),
      gain_ft: r.gain_ft, dist_km: r.dist_km, high_point_ft: r.high_point_ft,
      what_to_bring: r.what_to_bring, watch_out: r.watch_out, pro_tips: r.pro_tips,
      trackChecks: cands.find(c => c.id === r.id)?.cands ?? [], pinEvidence: cands.find(c => c.id === r.id)?.pin ?? null,
    })),
    tracks: (rec.tracks || []).map(t => {
      const pts = t.pts || [];
      const step = Math.max(1, Math.floor(pts.length / 40));
      const shape = pts.filter((_, i) => i % step === 0).concat(pts.length ? [pts.at(-1)] : []);
      const hi = pts.reduce((a, p) => (p[2] ?? -1e9) > (a?.[2] ?? -1e9) ? p : a, null);
      return { aid: t.aid, date: t.date, loggedRoute: t.route, stats: t.stats || [], hasTrack: pts.length >= 10,
        points: pts.length, start: pts[0] || null, end: pts.at(-1) || null, highest: hi, shape: pts.length ? shape : null,
        gpxWaypoints: t.wpts || [], tripReport: t.tr || "" };
    }),
  };
  // one coordinate per line would make a packet thousands of lines long: collapse point arrays
  const txt = JSON.stringify(packet, null, 1).replace(/\[\s*(-?[\d.]+|null),\s*(-?[\d.]+|null)(?:,\s*(-?[\d.]+|null|"[^"]*"))?\s*\]/g, (_, a, b, c) => `[${a},${b}${c === undefined ? "" : "," + c}]`);
  fs.writeFileSync(path.join(outDir, area + ".json"), txt);
  n++;
}
console.log("packets", n, "->", outDir);
