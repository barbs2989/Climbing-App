// Census of every pin on the out-of-state routes in the snapshot. Read-only: the database is not
// touched (it reads snapshot.mjs's files), only USGS GNIS and 3DEP.
//   node scripts/oneoff/oos-waypoint-audit/census.mjs ROUTES.json AREAS.json OUT.json
// Per route: its state (the ancestor under the country), then
//   - every TRAILHEAD pin: ground under it vs its stated elev (the research worklist, phase 1);
//   - every SUMMIT pin: the GNIS Summit of the same name in that state, distance to it, the ground
//     under the pin, and whether the pin is a 3DEP local maximum (phase 2);
//   - impossible distance pairs and every other pin whose ground is far from its elev (phase 3).
import fs from "fs";
import { elevationAt, summitProbe } from "../../lib/terrain.mjs";
const [, , SNAP, AREAS, OUT] = process.argv;
const routes = JSON.parse(fs.readFileSync(SNAP, "utf8"));
const areas = Object.fromEntries(JSON.parse(fs.readFileSync(AREAS, "utf8")).map(a => [a.id, a]));
const ALPHA = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY" };
const chain = id => { const out = []; for (let a = areas[id], g = 0; a && g < 30; a = areas[a.parent_id], g++) out.push(a); return out; };
const stateOf = r => { const c = chain(r.area_id); const s = c.find(a => ALPHA[a.name] || /^(British Columbia|Alberta|Yukon|Ontario|Quebec)$/.test(a.name)); return s ? s.name : (c.at(-2) || {}).name || "?"; };
const peakOf = r => chain(r.area_id).find(a => a.lat != null && a.elevation_ft != null) || null;
const CACHE = "research-data/oos-waypoint-audit-2026-10-30/gnis-cache.json";
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query";
const rad = Math.PI / 180;
const km = (a, b) => 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
async function gnis(name, st) {
  const k = `${st}|${name}`; if (cache[k]) return cache[k];
  const where = `gaz_name='${name.replace(/'/g, "''")}' AND state_alpha='${st}' AND gaz_featureclass='Summit'`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${GNIS}?where=${encodeURIComponent(where)}&outFields=gaz_id,gaz_name&returnGeometry=true&outSR=4326&f=json`, { signal: AbortSignal.timeout(30000) });
      if (r.ok) { const j = await r.json(); if (!j.error) { const hits = (j.features || []).map(f => ({ id: f.attributes.gaz_id, lat: f.geometry.points[0][1], lng: f.geometry.points[0][0] })); cache[k] = hits; fs.writeFileSync(CACHE, JSON.stringify(cache)); await new Promise(s => setTimeout(s, 200)); return hits; } }
    } catch { /* retried */ }
    await new Promise(s => setTimeout(s, 1500 * (t + 1)));
  }
  return null;
}
const clean = s => String(s || "").replace(/\([^)]*\)/g, " ").replace(/\s[–—-]\s.*$/, " ").replace(/,.*$/, "").replace(/\s+(summit|true summit|high point|main summit)\b.*$/i, "").replace(/^Mt\.?\s/, "Mount ").replace(/\s+/g, " ").trim();
const placed = w => w && w.lat != null && w.lng != null && Number.isFinite(+w.lat) && Number.isFinite(+w.lng);
const mi = (a, b) => km(a, b) / 1.609344;
const GCACHE = "research-data/oos-waypoint-audit-2026-10-30/ground-cache.json";
const gcache = fs.existsSync(GCACHE) ? JSON.parse(fs.readFileSync(GCACHE, "utf8")) : {};
async function ground(lat, lng) {
  const k = `${(+lat).toFixed(5)},${(+lng).toFixed(5)}`; if (k in gcache) return gcache[k];
  const g = await elevationAt(+lat, +lng); gcache[k] = g == null ? null : Math.round(g); fs.writeFileSync(GCACHE, JSON.stringify(gcache)); return gcache[k];
}
const out = [];
let n = 0;
for (const r of routes) {
  const st = stateOf(r), alpha = ALPHA[st] || null, peak = peakOf(r);
  const rec = { id: r.id, name: r.name, discipline: r.discipline, state: st, area: r.area_id, peak: peak && { id: peak.id, name: peak.name, lat: peak.lat, lng: peak.lng, elev: peak.elevation_ft }, trailheads: [], summits: [], offGround: [], impossible: [] };
  const w = r.waypoints;
  for (const [i, p] of w.entries()) {
    if (!placed(p)) continue;
    const t = String(p.type || "").toLowerCase();
    const g = await ground(p.lat, p.lng);
    const gap = g != null && p.elev != null && p.elev !== "" ? Math.round(g - +p.elev) : null;
    if (t === "trailhead") rec.trailheads.push({ i, name: p.name, at: [+p.lat, +p.lng], elev: p.elev ?? null, ground_ft: g, gap });
    else if (t === "summit") {
      const s = { i, name: p.name, at: [+p.lat, +p.lng], elev: p.elev ?? null, ground_ft: g, gap };
      if (alpha) {
        let best = null;
        for (const nm of [...new Set([clean(p.name), clean(peak && peak.name)].filter(x => x && x.length > 2))]) {
          const hits = await gnis(nm, alpha); for (const h of hits || []) { const d = km({ lat: +p.lat, lng: +p.lng }, h); if (d <= 8 && (!best || d < best.d)) best = { ...h, d, name: nm }; }
        }
        if (best) { s.gnis = { id: best.id, name: best.name, lat: best.lat, lng: best.lng }; s.gnis_m = Math.round(best.d * 1000); }
      }
      if (peak) s.peak_m = Math.round(km({ lat: +p.lat, lng: +p.lng }, { lat: +peak.lat, lng: +peak.lng }) * 1000);
      const pr = await summitProbe(+p.lat, +p.lng); s.isMax = pr.isMax;
      rec.summits.push(s);
    } else if (gap != null && Math.abs(gap) > Math.max(300, 0.15 * +p.elev)) rec.offGround.push({ i, name: p.name, type: p.type, at: [+p.lat, +p.lng], elev: p.elev, ground_ft: g, gap });
  }
  const m = w.map((x, i) => ({ i, x, d: x && x.distMi != null && x.distMi !== "" ? Number(x.distMi) : null })).filter(o => placed(o.x) && Number.isFinite(o.d));
  for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) {
    const trail = m[b].d - m[a].d; if (trail < 0) continue;
    const chord = mi({ lat: +m[a].x.lat, lng: +m[a].x.lng }, { lat: +m[b].x.lat, lng: +m[b].x.lng });
    if (chord > trail + Math.max(0.25, 0.1 * trail)) rec.impossible.push(`#${m[a].i} ${m[a].x.name} -> #${m[b].i} ${m[b].x.name}: trail ${trail.toFixed(2)} mi, chord ${chord.toFixed(2)} mi`);
  }
  out.push(rec);
  if (++n % 25 === 0) { console.log(n, "/", routes.length); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const S = out.flatMap(r => r.summits), T = out.flatMap(r => r.trailheads);
console.log(out.length, "routes;", T.length, "trailhead pins;", S.length, "summit pins");
console.log(" summits matched GNIS:", S.filter(s => s.gnis).length, "| >300 m:", S.filter(s => s.gnis_m > 300).length, "| not a local max:", S.filter(s => s.isMax === false).length);
console.log(" trailheads ground off >300 ft:", T.filter(t => t.gap != null && Math.abs(t.gap) > 300).length);
console.log(" routes with impossible pairs:", out.filter(r => r.impossible.length).length, "| other pins off-ground:", out.reduce((a, r) => a + r.offGround.length, 0));
const byState = {}; for (const r of out) byState[r.state] = (byState[r.state] || 0) + 1; console.log(JSON.stringify(byState));
