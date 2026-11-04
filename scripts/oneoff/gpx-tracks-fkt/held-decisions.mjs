// Turn the HELD-peak verdicts (research-data/gpx-tracks-fkt-oneway-2026-10-30/held/verdict-*.json) into
// apply-peaks.mjs decisions: the summit pin at the catalog area at the track's top, the trailhead only
// where research confirmed it. Offline; needs the batch files beside the verdicts and a snapshot of
// areas (id, name, lat, lng) as the 2nd argument.
// Usage: node held-decisions.mjs <areas.json> <out decisions.json> [reject routeId ...]
import fs from "fs";
const D = "research-data/gpx-tracks-fkt-oneway-2026-10-30/held";
const [areasF, out, ...reject] = process.argv.slice(2);
const areas = new Map(JSON.parse(fs.readFileSync(areasF, "utf8")).map(a => [a.id, a]));
const batch = new Map(), dec = [];
for (const f of fs.readdirSync(D).filter(f => /^batch-\d+\.json$/.test(f))) for (const t of JSON.parse(fs.readFileSync(`${D}/${f}`, "utf8"))) batch.set(t.slug, t);
for (const f of fs.readdirSync(D).filter(f => /^verdict-\d+\.json$/.test(f))) for (const v of JSON.parse(fs.readFileSync(`${D}/${f}`, "utf8"))) {
  if (!v.routeId || reject.includes(v.routeId)) continue;
  const t = batch.get(v.slug), r = t.routes.find(x => x.id === v.routeId);
  if (!r) { console.log(`SKIP ${v.slug}: ${v.routeId} is not one of its routes`); continue; }
  const top = areas.get(t.summitArea.id);
  dec.push({ id: r.id, slug: v.slug, tier: t.tier, why: v.reason,
    peak: { id: r.area_id ?? null, name: top.name, lat: top.lat, lng: top.lng, elevation_ft: top.elevation_ft ?? null },
    ...(v.trailheadConfirmed && v.trailhead ? { trailhead: { name: v.trailhead, confirmed: true } } : {}) });
}
fs.writeFileSync(out, JSON.stringify(dec, null, 1));
console.log(dec.map(d => `${d.id} <- ${d.slug} (${d.tier})${d.trailhead ? " +TH " + d.trailhead.name : ""}`).join("\n"));
