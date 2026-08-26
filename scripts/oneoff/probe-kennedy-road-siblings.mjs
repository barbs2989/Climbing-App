// The one EXPIRED closure claim: wa_glacier_peak_kennedy_glacier asserts "Closed MP 3.7 to end"
// on the strength of an order it says ran "through at least Dec 31, 2025".
//
// Before touching it, ask what every OTHER route on the same road says — the donor pattern
// audit:trailhead-road uses. A sibling with a later or contradicting record is evidence; agreement
// is not a fix, but it says whether this row is an outlier or the whole cluster is stale.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,access,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const subject = rows.find(r => r.id === "wa_glacier_peak_kennedy_glacier");
if (!subject) { console.error("subject route not found"); process.exit(1); }
console.log(`SUBJECT ${subject.id}`);
console.log(`   road.name   ${subject.road && subject.road.name}`);
console.log(`   road.status ${subject.road && subject.road.status}`);
console.log(`   trailhead   ${subject.approach_logistics && subject.approach_logistics.trailhead}\n`);

// Any route whose road prose names the same road. Matched on the distinctive proper noun, never
// the bare word "road" — a generic token makes this vacuous in the WIDE direction.
const NEEDLES = [/white\s*chuck/i, /\bFR[- ]?23\b/i, /forest road 23\b/i, /sloan\s*creek/i];
const hits = [];
for (const r of rows) {
  const blobs = [r.road && r.road.name, r.road && r.road.status, r.road && r.road.driveNote,
    r.road && r.road.seasonalGate, r.access && r.access.closures].filter(v => typeof v === "string");
  const text = blobs.join(" || ");
  if (!NEEDLES.some(n => n.test(text))) continue;
  hits.push({ id: r.id, name: r.name, status: (r.road && r.road.status) || "", closures: (r.access && r.access.closures) || "" });
}
console.log(`${hits.length} route(s) whose road/access prose names the same road\n`);
for (const h of hits) {
  console.log(`${h.id}  —  ${h.name}`);
  if (h.status) console.log(`   status:   ${h.status.slice(0, 200)}`);
  if (h.closures) console.log(`   closures: ${h.closures.slice(0, 200)}`);
  console.log("");
}
