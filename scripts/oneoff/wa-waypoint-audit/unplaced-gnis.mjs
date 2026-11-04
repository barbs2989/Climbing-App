// WA alpine / mountaineering / scrambling pins that carry NO coordinate (cleared by earlier passes
// because the coordinate was computed, or never placed) but whose whole name IS a point feature
// GNIS holds: a pass, gap, col, notch, saddle, lake or summit. Read-only; writes candidates.
//   node scripts/oneoff/wa-waypoint-audit/unplaced-gnis.mjs SNAPSHOT.json OUT.json
// Same name rules and GNIS service as gpx-named-pins/match-gnis.mjs (#3017). The route's own
// PLACED pins are the corridor: a namesake further than CORRIDOR_KM from all of them is elsewhere.
import fs from "fs";
const [, , SNAP, OUT] = process.argv;
const rows = JSON.parse(fs.readFileSync(SNAP, "utf8")).filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
const CACHE = "research-data/wa-waypoint-audit-2026-10-30/gnis-cache.json";
fs.mkdirSync("research-data/wa-waypoint-audit-2026-10-30", { recursive: true });
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";
const LAYERS = [5, 7];
const CORRIDOR_KM = 12;
const KIND = /\b(Pass|Gap|Col|Notch|Saddle|Lakes?|Peak|Mountain|Butte|Dome|Spire|Tower|Needle)$/;
const OFFSET = /\b(above|below|beneath|under|near|beyond|between|past|toe|base|head|foot|side|mouth|north|south|east|west|end|edge|start|top|bottom|shore|outlet|inlet|approach|toward|towards|via|from|to)\b/i;
const STRUCT = /\b(trail|junction|jct|crossing|ford|contour|bend|camp|campsite|bivy|trailhead|road|bridge|switchback|spur|basin|meadow|meadows|ridge|creek|bench|moraine|slope|gully|couloir|glacier|tarn|tarns|point|viewpoint|outlook|high|low|upper|lower|parking|lot|sign|cairn|knob|shoulder|summit)\b/i;
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
function xy(g) { if (!g) return null; if (Number.isFinite(g.x)) return { lat: g.y, lng: g.x }; const p = g.points && g.points[0]; return p ? { lat: p[1], lng: p[0] } : null; }
async function gnis(layer, name) {
  const where = `gaz_name='${name.replace(/'/g, "''")}' AND state_alpha='WA'`;
  const u = `${GNIS}/${layer}/query?where=${encodeURIComponent(where)}&outFields=gaz_id,gaz_name,gaz_featureclass&returnGeometry=true&outSR=4326&f=json`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (j.error) return { err: j.error.message }; return { hits: (j.features || []).map(f => ({ ...xy(f.geometry), ...f.attributes, layer })).filter(h => Number.isFinite(h.lat)) }; }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 1000 * (t + 1)));
  }
  return { err: "no answer" };
}
// A pin named "<Feature> summit" denotes the summit of <Feature>; otherwise the whole name must BE the feature.
function feature(name) {
  let s = String(name || "").replace(/\([^)]*\)/g, " ").replace(/\s[–—-]\s.*$/, " ").replace(/,?\s*[\d,.]+\s*(ft|')\s*$/i, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/\s+summit$/i, "").replace(/^(Mt\.?)\s/, "Mount ");
  const m = s.match(/^((?:[A-Z][\w'.]*\s){1,4}(Pass|Gap|Col|Notch|Saddle|Lakes?|Peak|Mountain|Butte|Dome|Spire|Tower|Needle))$/);
  if (!m) return null;
  const stem = m[1].replace(KIND, "");
  if (OFFSET.test(stem) || STRUCT.test(stem)) return null;
  return { q: m[1].trim(), kind: m[2].toLowerCase() };
}
const placed = w => Number.isFinite(+w.lat) && Number.isFinite(+w.lng) && w.lat !== null && w.lng !== null;
const cand = [];
for (const r of rows) (r.waypoints || []).forEach((w, i) => { if (!placed(w)) { const f = feature(w.name); cand.push({ id: r.id, route: r.name, i, type: w.type, name: w.name, elev: w.elev ?? null, f }); } });
console.log(cand.length, "unplaced pins in scope;", cand.filter(c => c.f).length, "whose name is a point feature");
for (const n of [...new Set(cand.filter(c => c.f).map(c => c.f.q))]) {
  if (cache[n]) continue;
  const all = []; let err = null;
  for (const L of LAYERS) { const r = await gnis(L, n); if (r.err) { err = r.err; break; } all.push(...r.hits); await new Promise(s => setTimeout(s, 250)); }
  if (err) { console.log("GNIS error for", n, err); continue; }
  cache[n] = all; fs.writeFileSync(CACHE, JSON.stringify(cache));
}
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const out = [];
for (const c of cand) {
  if (!c.f) { out.push({ ...c, verdict: "not-a-point-feature" }); continue; }
  const hits = cache[c.f.q]; if (!hits) { out.push({ ...c, verdict: "unasked" }); continue; }
  const anchors = (byId[c.id].waypoints || []).filter(placed).map(w => ({ lat: +w.lat, lng: +w.lng }));
  if (!anchors.length) { out.push({ ...c, verdict: "route-has-no-placed-pin" }); continue; }
  const near = hits.filter(h => anchors.some(a => km(a, h) <= CORRIDOR_KM));
  if (!near.length) { out.push({ ...c, verdict: hits.length ? "namesake-elsewhere" : "not-in-gnis" }); continue; }
  if (near.length > 1 && near.some(h => h.gaz_id !== near[0].gaz_id)) { out.push({ ...c, verdict: "ambiguous", near }); continue; }
  out.push({ ...c, verdict: "MATCH", gnis: { lat: near[0].lat, lng: near[0].lng, id: near[0].gaz_id, cls: near[0].gaz_featureclass } });
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const k = {}; for (const o of out) k[o.verdict] = (k[o.verdict] || 0) + 1; console.log(k);
for (const o of out.filter(o => o.verdict === "MATCH")) console.log(o.id, "#" + o.i, o.type, "|", o.name, "|", o.gnis.cls, "stated", o.elev);
