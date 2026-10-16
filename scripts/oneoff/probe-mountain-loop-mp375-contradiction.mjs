// ITS OWN OPEN/CLOSED VERDICT IS NOISE — read probe-mp375-landslide-claims.mjs for the finding.
// This one matches the whole Mountain Loop / FR 49 corridor and reported 8 "open" against 6
// "closed"; nearly all of that is routes describing the MONTE CRISTO ROAD, separately and
// legitimately vehicle-closed for years, or an ordinary seasonal winter gate. A drive has several
// named legs, and audit:trailhead-road needed six tightenings to learn it. Kept for the ONE thing
// it measures that the narrow probe cannot: how many distinct trailheads sit on this corridor,
// which is what shows the coverage gap below.
//
// THE COVERAGE GAP: audit:trailhead-road's own header says "the unit of truth is the ROAD, not the
// route" — and it clusters by TRAILHEAD COORDINATE within 500 m. A road serves many trailheads, so
// two routes describing one closure from different trailheads never land in the same cluster. That
// is why it reports 0 across all 205,543 routes while the catalog contradicts itself about the MP
// 37.5 landslide.
//
// Prints every route naming the Mountain Loop Highway or FR 49, with its trailhead, so the spread
// of trailheads along one road is visible.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,access,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const NEEDLE = /mountain\s*loop|\bFR[- ]?49\b|forest road 49\b|north fork sauk|sloan\s*creek/i;
const OPEN = /\breopen|\bopen\b(?! (?:to (?:foot|bike)|until))/i;
const CLOSED = /\bclosed\b|\bblocks? (?:all )?(?:vehicle )?access|landslide/i;

const hits = [];
for (const r of rows) {
  const al = r.approach_logistics || {};
  const fields = {
    "road.name": r.road && r.road.name, "road.status": r.road && r.road.status,
    "road.driveNote": r.road && r.road.driveNote, "road.seasonalGate": r.road && r.road.seasonalGate,
    "access.closures": r.access && r.access.closures,
  };
  const text = Object.values(fields).filter(v => typeof v === "string").join(" || ");
  if (!NEEDLE.test(text)) continue;
  hits.push({
    id: r.id, name: r.name, fields, text,
    th: al.trailhead || "(none)",
    lat: al.trailheadLat, lng: al.trailheadLng,
    saysOpen: OPEN.test(text), saysClosed: CLOSED.test(text),
  });
}

console.log(`${hits.length} route(s) name the Mountain Loop Highway / FR 49 corridor\n`);
for (const h of hits) {
  console.log(`${h.id}  —  ${h.name}`);
  console.log(`   trailhead: ${h.th}   @${h.lat},${h.lng}`);
  console.log(`   verdict:   ${h.saysOpen ? "SAYS OPEN " : ""}${h.saysClosed ? "SAYS CLOSED" : ""}${!h.saysOpen && !h.saysClosed ? "(neither)" : ""}`);
  for (const [k, v] of Object.entries(h.fields)) if (typeof v === "string" && NEEDLE.test(v)) console.log(`   ${k}: ${v.slice(0, 260)}`);
  console.log("");
}

const open = hits.filter(h => h.saysOpen && !h.saysClosed), closed = hits.filter(h => h.saysClosed && !h.saysOpen);
console.log(`unambiguously OPEN: ${open.map(h => h.id).join(", ") || "(none)"}`);
console.log(`unambiguously CLOSED: ${closed.map(h => h.id).join(", ") || "(none)"}`);

// Did they share a trailhead cluster? That is what decides whether audit:trailhead-road COULD have
// seen this, and it is the whole point of the probe.
const coords = hits.filter(h => h.lat != null && h.lng != null);
console.log(`\n${coords.length} of ${hits.length} carry a trailhead coordinate; distinct trailhead names: ${new Set(hits.map(h => h.th)).size}`);
console.log(`audit:trailhead-road clusters within 500 m of one another, so routes on different\ntrailheads along the same highway never meet — which is why it reports 0 here.`);
