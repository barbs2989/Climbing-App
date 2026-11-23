import fs from "fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
async function op(q) { for (let i = 0; i < 6; i++) { try { const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "User-Agent": "trailhead-research/1.0", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); const t = await res.text(); if (res.ok) return JSON.parse(t).elements; } catch { /* retry */ } await sleep(15000 * (i + 1)); } return null; }
const P = JSON.parse(process.argv[2]); const out = {};
for (const [k, re, lat, lon, r] of P) {
  const els = await op(`[out:json][timeout:40];way(around:${r},${lat},${lon})[highway][name~"${re}",i];out geom tags;`);
  out[k] = els; console.log("##", k, els === null ? "FAILED" : els.length);
  for (const e of els || []) { const g = e.geometry, a = g[0], b = g[g.length - 1]; const near = g.map(p => m(p, { lat, lon })).reduce((x, y) => Math.min(x, y)); console.log("  ", e.tags.name, e.tags.highway, "way/" + e.id, "| ends", a.lat.toFixed(6) + "," + a.lon.toFixed(6), Math.round(m(a, { lat, lon })) + " m ;", b.lat.toFixed(6) + "," + b.lon.toFixed(6), Math.round(m(b, { lat, lon })) + " m | nearest vertex", Math.round(near), "m"); }
  await sleep(4000);
}
fs.writeFileSync(process.argv[3] || "opgeom.json", JSON.stringify(out));
