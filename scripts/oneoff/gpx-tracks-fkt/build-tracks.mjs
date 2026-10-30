// Parse a folder of FKT .gpx files (and their saved pages, for the title) into tracks.json:
// [{ slug, title, pts: [[lat, lng], ...] }]. Points only: no <time>, ever (FKT times are record
// pace, not a normal party's). Files under 10 points are left out, as the map would refuse them.
// Usage: node build-tracks.mjs <gpx dir> <pages dir> <out tracks.json>
import fs from "fs";
import path from "path";
// optional 4th argument: a file of slugs, one per line, to build ONE state at a time
const [gdir, pdir, out, only] = process.argv.slice(2);
const keep = only ? new Set(fs.readFileSync(only, "utf8").split("\n").map(s => s.trim()).filter(Boolean)) : null;
const tracks = [];
for (const f of fs.readdirSync(gdir).filter(f => f.endsWith(".gpx") && (!keep || keep.has(f.slice(0, -4))))) {
  const slug = f.slice(0, -4);
  const xml = fs.readFileSync(path.join(gdir, f), "utf8");
  const pts = [];
  for (const m of xml.matchAll(/<(trkpt|rtept)\b([^>]*)/g)) {
    const la = /\blat="([-\d.]+)"/.exec(m[2]), lo = /\blon="([-\d.]+)"/.exec(m[2]);
    if (la && lo) pts.push([+la[1], +lo[1]]);
  }
  if (pts.length < 10) continue;
  // matching needs the shape to ~300 m, not every fix: thin to at most MAX_PTS, keeping both ends
  // (2,166 full-resolution files did not fit in memory)
  const MAX_PTS = 3000;
  if (pts.length > MAX_PTS) { const step = pts.length / MAX_PTS, last = pts.at(-1); const thin = []; for (let i = 0; i < pts.length; i += step) thin.push(pts[Math.floor(i)]); thin.push(last); pts.length = 0; pts.push(...thin); }
  let title = slug;
  const page = path.join(pdir, slug + ".html");
  if (fs.existsSync(page)) { const t = /<title>([^<]*)/.exec(fs.readFileSync(page, "utf8")); if (t) title = t[1].replace(/\s*\|.*$/, "").trim(); }
  tracks.push({ slug, title, pts });
}
fs.writeFileSync(out, JSON.stringify(tracks));
console.log(tracks.length, "tracks");
