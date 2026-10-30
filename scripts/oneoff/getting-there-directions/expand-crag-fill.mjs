// A crag's checked parking, drive and walk (nc-check-*-out.json, CRAG_BRIEF.md) is the same fact
// for every backlog route on that crag: expand each entry onto those routes (neither.json), as
// second-check rows the route applier reads through prepare-fill-apply.mjs. The text is the CRAG's
// way in, so it stops at the base of the crag; nothing route-specific is invented.
//   node expand-crag-fill.mjs nc-check-X-out.json > nc-X-routes-check.json
//   SRC=remaining.json node expand-crag-fill.mjs nr-crags-check-out.json > nr-crags-routes-check.json
// When the second check lists `appliesTo` (route NAMES a page shows this way in reaching), only
// those routes get the text: a crag whose routes are reached different ways must not hand one
// walk to all of them (Tumwater, 2026-10-29: the walk reaches 2 of its 5 climbs).
import fs from "fs";
const groups = new Map(JSON.parse(fs.readFileSync(new URL("./" + (process.env.SRC || "neither.json"), import.meta.url), "utf8")).map(g => [g.area_id, g]));
const out = [];
for (const e of JSON.parse(fs.readFileSync(process.argv[2], "utf8"))) {
  const areaId = e.area_id || e.id; // a checker may keep only `id`, which was set to the area id
  const g = groups.get(areaId);
  if (!g) throw new Error("area not in neither.json: " + areaId);
  const only = Array.isArray(e.appliesTo) ? new Set(e.appliesTo) : null;
  for (const r of g.routes) if (!only || only.has(r.name)) out.push({ ...e, area_id: areaId, id: r.id, crag: g.area });
}
process.stdout.write(JSON.stringify(out, null, 1));
