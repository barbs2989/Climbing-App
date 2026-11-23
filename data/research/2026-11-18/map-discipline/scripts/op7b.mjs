import fs from "fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
async function op(q) { for (let i = 0; i < 6; i++) { try { const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "User-Agent": "trailhead-research/1.0", Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); const t = await res.text(); if (res.ok) return JSON.parse(t).elements; } catch { /* retry */ } await sleep(12000 * (i + 1)); } return null; }
const P = JSON.parse(process.argv[2]);
const out = {};
for (const [k, lat, lng, r] of P) {
  const a = `(around:${r},${lat},${lng})`;
  const els = await op(`[out:json][timeout:40];(nwr${a}[amenity=parking];nwr${a}[highway=trailhead];nwr${a}[information];nwr${a}[barrier=gate];way${a}[highway~"path|footway|track"][name];);out center tags;`);
  out[k] = els; console.log("##", k, els === null ? "FAILED" : els.length);
  for (const e of (els || []).slice(0, 12)) { const c = e.center || e; const t = e.tags || {}; console.log("  ", Math.round(m({ lat, lng }, { lat: c.lat, lng: c.lon })), "m |", t.name || "-", "|", t.amenity || t.information || t.barrier || t.highway, e.type + "/" + e.id, c.lat.toFixed(6) + "," + c.lon.toFixed(6)); }
  await sleep(3000);
}
fs.writeFileSync(process.argv[3] || "op7b.json", JSON.stringify(out));
