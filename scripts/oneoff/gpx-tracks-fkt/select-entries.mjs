// Pick, per route, an athlete's FKT ENTRY recording that is a full trailhead -> summit -> trailhead
// round trip (owner, 2026-10-29: "we only want the routes that actually start at the trailhead to the
// summit and back to the trailhead"). A file qualifies only when:
//   - it is a RECORDING: track points with forward-running <time> (read to classify, never stored);
//   - it starts AND ends within 300 m of the route's Trailhead pin;
//   - it passes within 300 m of the route's Summit pin.
// Among qualifying files the densest recording wins. Usage:
//   node select-entries.mjs <pairs.json: [{id, slug}]> <entries gpx dir> <targets.json>  -> prints, writes <pairs>.chosen.json
import fs from "fs";
import path from "path";
import { haversineM } from "./rule.mjs";
const [pairsF, gdir, targetsF] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsF, "utf8"));
const targets = new Map(JSON.parse(fs.readFileSync(targetsF, "utf8")).map(r => [r.id, r]));
function read(f) {
  const xml = fs.readFileSync(f, "utf8");
  const pts = [], times = [];
  for (const seg of xml.split(/<trkpt\b/).slice(1)) {
    const head = seg.slice(0, seg.indexOf(">")), end = seg.indexOf("</trkpt>"), body = end >= 0 ? seg.slice(0, end) : "";
    const la = /\blat="([-\d.]+)"/.exec(head), lo = /\blon="([-\d.]+)"/.exec(head);
    if (!la || !lo) continue;
    pts.push([+la[1], +lo[1]]);
    const t = /<time>([^<]+)<\/time>/.exec(body); if (t && Number.isFinite(Date.parse(t[1]))) times.push(Date.parse(t[1]));
  }
  let fwd = 0; for (let i = 1; i < times.length; i++) if (times[i] >= times[i - 1]) fwd++;
  const recorded = pts.length >= 10 && times.length >= pts.length * 0.9 && fwd >= (times.length - 1) * 0.98 && times.at(-1) - times[0] > 600000;
  return { pts, recorded };
}
const chosen = [];
for (const { id, slug } of pairs) {
  const r = targets.get(id);
  if (!r) { console.log(`${id}: no pins in targets`); continue; }
  const th = r.waypoints.filter(w => /trailhead/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const sm = r.waypoints.filter(w => /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const files = fs.readdirSync(gdir).filter(f => f.startsWith(slug + "--") && f.endsWith(".gpx"));
  const rows = [];
  for (const f of files) {
    const { pts, recorded } = read(path.join(gdir, f));
    if (!pts.length) { rows.push({ f, why: "no track points" }); continue; }
    const s = Math.min(...th.map(p => haversineM(pts[0], p))), e = Math.min(...th.map(p => haversineM(pts.at(-1), p)));
    let su = Infinity; for (const q of pts) for (const p of sm) su = Math.min(su, haversineM(q, p));
    const ok = recorded && s <= 300 && e <= 300 && su <= 300;
    rows.push({ f, n: pts.length, recorded, startM: Math.round(s), endM: Math.round(e), summitM: Math.round(su), ok });
  }
  const best = rows.filter(x => x.ok).sort((a, b) => b.n - a.n)[0];
  console.log(`${id} <- ${slug}: ${files.length} entry files, ${rows.filter(x => x.ok).length} qualify${best ? ` -> ${best.f} (${best.n} pts)` : ""}`);
  for (const x of rows.filter(x => !x.ok)) console.log(`    no: ${x.f} ${x.why || `recorded=${x.recorded} start ${x.startM} m, end ${x.endM} m, summit ${x.summitM} m`}`);
  chosen.push({ id, slug, entryFile: best ? best.f : null });
}
fs.writeFileSync(pairsF.replace(/\.json$/, ".chosen.json"), JSON.stringify(chosen, null, 1));
