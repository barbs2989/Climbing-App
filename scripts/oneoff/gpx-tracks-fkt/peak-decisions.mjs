// Turn per-peak verdicts into apply-peaks.mjs decisions: one track per route (the reviewer's
// "best" when a route got several), with the peak's coordinate for the Summit pin and the
// reviewer's confirmed trailhead name for the Trailhead pin. Offline.
// Usage: node peak-decisions.mjs <out decisions.json> <peak-verdict-N.json> [...]
import fs from "fs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const [out, ...files] = process.argv.slice(2);
const peaks = new Map(JSON.parse(fs.readFileSync(`${D}/peaks.json`, "utf8")).map(p => [p.id, p]));
const byRoute = new Map();
for (const f of files) for (const v of JSON.parse(fs.readFileSync(f, "utf8"))) {
  if (!v.routeId) continue;
  const cur = byRoute.get(v.routeId);
  if (!cur || (v.best && !cur.best)) byRoute.set(v.routeId, v);
}
const dec = [];
for (const v of byRoute.values()) {
  const pk = peaks.get(v.peak);
  if (!pk) { console.log(`no peak coordinate for ${v.peak}`); continue; }
  dec.push({ id: v.routeId, slug: v.slug, tier: "round", why: v.reason,
    peak: { id: pk.id, name: pk.name, lat: pk.lat, lng: pk.lng, elevation_ft: pk.elevation_ft ?? null },
    ...(v.trailheadConfirmed && v.trailhead ? { trailhead: { name: v.trailhead, confirmed: true } } : {}) });
}
fs.writeFileSync(out, JSON.stringify(dec, null, 1));
console.log(dec.map(d => `${d.id} <- ${d.slug}${d.trailhead ? " +TH " + d.trailhead.name : ""}`).join("\n"));
