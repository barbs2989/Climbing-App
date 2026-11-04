// Compare every pin NAMED for a point-like feature (a pass, gap, col, notch, saddle or lake) with
// the GNIS coordinate of that feature. Read-only: it writes candidates for a person to judge.
//
// Gates carried over from solve-gazetteer.mjs: both geometry shapes; an outage is not "not found";
// an OFFSET name ("below X Pass") or a STRUCTURE noun ("X Pass trail junction") is a different
// thing standing near the feature, so it is never compared; a namesake further than CORRIDOR_KM
// from the route's own pins is a different place.
import fs from "fs";
const D = "research-data/gpx-named-pins-2026-10-29";
const pins = JSON.parse(fs.readFileSync(`${D}/all-pins.json`, "utf8"));
const CACHE = `${D}/gnis-cache.json`;
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";
const LAYERS = [5, 7];                    // Landforms (passes, gaps, saddles), Other Hydrographic (lakes)
const CORRIDOR_KM = 12;
const TOL_M = { pass: 500, gap: 500, col: 500, notch: 500, saddle: 500, lake: 1000, lakes: 1500 };
const KIND = /\b(Pass|Gap|Col|Notch|Saddle|Lakes?)$/;
const OFFSET = /\b(above|below|beneath|under|near|beyond|between|past|toe|base|head|foot|side|mouth|north|south|east|west|end|edge|start|top|bottom|shore|outlet|inlet|approach|toward|towards|via|from|to)\b/i;
const STRUCT = /\b(trail|junction|jct|crossing|ford|contour|bend|camp|campsite|bivy|trailhead|road|bridge|switchback|spur|basin|meadow|meadows|ridge|creek|bench|moraine|slope|gully|couloir|glacier|tarn|tarns|point|viewpoint|outlook|high|low|upper|lower|parking|lot|sign|cairn|knob|shoulder)\b/i;
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
// BOTH geometry shapes: layer 5 answers {points:[[x,y]]}, layer 7 {x,y}.
function xy(g) { if (!g) return null; if (Number.isFinite(g.x)) return { lat: g.y, lng: g.x }; const p = g.points && g.points[0]; return p ? { lat: p[1], lng: p[0] } : null; }
async function gnis(layer, name, state) {
  const where = `gaz_name='${name.replace(/'/g, "''")}' AND state_alpha='${state}'`;
  const u = `${GNIS}/${layer}/query?where=${encodeURIComponent(where)}&outFields=gaz_id,gaz_name,gaz_featureclass&returnGeometry=true&outSR=4326&f=json`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        const j = await r.json();
        if (j.error) return { err: j.error.message };
        return { hits: (j.features || []).map(f => ({ ...xy(f.geometry), ...f.attributes, layer })).filter(h => Number.isFinite(h.lat)) };
      }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 1000 * (t + 1)));
  }
  return { err: "no answer" };
}
// The feature a pin denotes: the whole name (parentheses and a trailing elevation dropped) must BE
// "<Words> Pass|Lake|...", so "Hannegan Pass" counts and "Hannegan Pass trail junction" does not.
function feature(name) {
  const s = name.replace(/\([^)]*\)/g, " ").replace(/\s[–—-]\s.*$/, " ").replace(/,?\s*[\d,.]+\s*(ft|')\s*$/i, " ").replace(/\s+/g, " ").trim();
  const m = s.match(/^((?:[A-Z][\w'.]*\s){1,4}(Pass|Gap|Col|Notch|Saddle|Lakes?))$/);
  if (!m) return null;
  const stem = m[1].replace(KIND, "");
  if (OFFSET.test(stem) || STRUCT.test(stem)) return null;
  return { q: m[1].trim(), kind: m[2].toLowerCase() };
}
const byRoute = {}; for (const p of pins) (byRoute[p.id] ||= []).push(p);
const cand = pins.map(p => ({ p, f: feature(p.name) })).filter(x => x.f);
// GNIS is US-only, and asked per state: a route id starts with its state's code.
const US = new Set("al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy".split(" "));
const st = p => p.id.slice(0, 2);
const ck = (p, f) => st(p) === "wa" ? f.q : `${st(p).toUpperCase()}|${f.q}`;   // WA keys predate the other states
const names = [...new Set(cand.filter(x => US.has(st(x.p))).map(x => ck(x.p, x.f)))];
console.log(cand.length, "pins name a point feature;", names.length, "distinct names");
for (const n of names) {
  if (cache[n]) continue;
  const [s0, q0] = n.includes("|") ? n.split("|") : ["WA", n];
  const all = []; let err = null;
  for (const L of LAYERS) { const r = await gnis(L, q0, s0); if (r.err) { err = r.err; break; } all.push(...r.hits); await new Promise(s => setTimeout(s, 250)); }
  if (err) { console.log("GNIS error for", n, err); continue; }
  cache[n] = all; fs.writeFileSync(CACHE, JSON.stringify(cache));
}
const out = [];
for (const { p, f } of cand) {
  if (!US.has(st(p))) continue;
  const hits = cache[ck(p, f)]; if (!hits) { out.push({ ...p, feature: f.q, verdict: "unasked" }); continue; }
  const near = hits.filter(h => byRoute[p.id].some(q => km(q, h) <= CORRIDOR_KM));
  if (!near.length) { out.push({ ...p, feature: f.q, verdict: hits.length ? "namesake-elsewhere" : "not-in-gnis" }); continue; }
  const best = near.reduce((a, b) => km(p, a) <= km(p, b) ? a : b);
  const m = Math.round(km(p, best) * 1000);
  out.push({ ...p, feature: f.q, kind: f.kind, gnis: { lat: best.lat, lng: best.lng, id: best.gaz_id, cls: best.gaz_featureclass }, off_m: m, nNear: near.length, verdict: m > TOL_M[f.kind] ? "OFF" : "ok" });
}
fs.writeFileSync(`${D}/named-pin-matches.json`, JSON.stringify(out, null, 1));
const c = {}; for (const o of out) c[o.verdict] = (c[o.verdict] || 0) + 1; console.log(c);
for (const o of out.filter(o => o.verdict === "OFF").sort((a, b) => b.off_m - a.off_m)) console.log(o.off_m, o.id, "#" + o.i, o.type, "|", o.name, "| gnis", o.gnis.cls, o.nNear);
