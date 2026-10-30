// Every placed SUMMIT pin on a WA alpine / mountaineering / scrambling route, compared with the
// GNIS Summit of the same name (the pin's own name, else the peak area's name) within 8 km.
// Read-only; writes candidates. The 2026-10-29 pass (#3017) compared passes and lakes only.
//   node scripts/oneoff/wa-waypoint-audit/summit-gnis.mjs SNAPSHOT.json AREAS.json OUT.json
import fs from "fs";
const [, , SNAP, AREAS, OUT] = process.argv;
const rows = JSON.parse(fs.readFileSync(SNAP, "utf8")).filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
const areas = Object.fromEntries(JSON.parse(fs.readFileSync(AREAS, "utf8")).map(a => [a.id, a]));
const CACHE = "research-data/wa-waypoint-audit-2026-10-30/gnis-summits-cache.json";
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query";
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
async function gnis(name) {
  if (cache[name]) return cache[name];
  const where = `gaz_name='${name.replace(/'/g, "''")}' AND state_alpha='WA' AND gaz_featureclass='Summit'`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${GNIS}?where=${encodeURIComponent(where)}&outFields=gaz_id,gaz_name&returnGeometry=true&outSR=4326&f=json`, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (!j.error) { const hits = (j.features || []).map(f => ({ id: f.attributes.gaz_id, lat: f.geometry.points[0][1], lng: f.geometry.points[0][0] })); cache[name] = hits; fs.writeFileSync(CACHE, JSON.stringify(cache)); await new Promise(s => setTimeout(s, 200)); return hits; } }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 1500 * (t + 1)));
  }
  return null;
}
// Candidate names: the pin's name cut at the first qualifier, and the area's name.
const clean = s => String(s || "").replace(/\([^)]*\)/g, " ").replace(/\s[–—-]\s.*$/, " ").replace(/,.*$/, "").replace(/\s+(summit|true summit|high point|main summit)\b.*$/i, "").replace(/^Mt\.?\s/, "Mount ").replace(/\s+/g, " ").trim();
const out = [];
for (const r of rows) for (const [i, w] of (r.waypoints || []).entries()) {
  if (!/^summit$/i.test(w.type || "") || w.lat == null || w.lng == null) continue;
  const p = { lat: +w.lat, lng: +w.lng };
  const names = [...new Set([clean(w.name), clean(areas[r.area_id] && areas[r.area_id].name)].filter(n => n && n.length > 2))];
  let best = null, asked = 0;
  for (const n of names) {
    const hits = await gnis(n); if (hits == null) continue; asked++;
    for (const h of hits) { const d = km(p, h); if (d <= 8 && (!best || d < best.d)) best = { ...h, d, name: n }; }
  }
  out.push({ id: r.id, i, pin: w.name, elev: w.elev ?? null, from: [p.lat, p.lng], area: r.area_id, gnis: best && { id: best.id, name: best.name, lat: best.lat, lng: best.lng }, off_m: best ? Math.round(best.d * 1000) : null, asked });
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const m = out.filter(o => o.gnis);
console.log(out.length, "summit pins;", m.length, "matched a GNIS summit within 8 km");
const bands = [100, 300, 1000, 8001]; for (const b of bands) console.log(` <= ${b} m:`, m.filter(o => o.off_m <= b).length);
for (const o of m.filter(o => o.off_m > 300).sort((a, b) => b.off_m - a.off_m)) console.log(o.off_m, "m", o.id, "#" + o.i, "|", o.pin, "| GNIS", o.gnis.name, o.gnis.id);
