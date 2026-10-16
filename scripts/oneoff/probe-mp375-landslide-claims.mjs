// Narrow to ONE fact: the Mountain Loop Highway landslide at milepost 37.5. The corridor-wide
// version of this probe reported 8 "open" against 6 "closed" and nearly all of it was noise —
// routes describing the Monte Cristo Road (separately and legitimately vehicle-closed for years),
// or an ordinary seasonal winter gate. A drive has several named legs, and a needle that cannot
// tell them apart manufactures contradictions; audit:trailhead-road needed six tightenings to
// learn that. Match the MILEPOST, which names this landslide and nothing else.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const MP375 = /milepost 37\.5|\bMP ?37\.5|mile ?post ?37\.5/i;
const hits = [];
for (const r of rows) {
  const fields = {
    "road.status": r.road && r.road.status, "road.driveNote": r.road && r.road.driveNote,
    "road.seasonalGate": r.road && r.road.seasonalGate, "access.closures": r.access && r.access.closures,
  };
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string" && MP375.test(v)) hits.push({ id: r.id, name: r.name, field: k, v });
  }
}
console.log(`${hits.length} value(s) name the MP 37.5 landslide\n`);
for (const h of hits) console.log(`${h.id}  ${h.field}\n   ${h.v}\n`);

const reopened = [...new Set(hits.filter(h => /reopen/i.test(h.v)).map(h => h.id))];
const blocked = [...new Set(hits.filter(h => !/reopen/i.test(h.v) && /block|closed/i.test(h.v)).map(h => h.id))];
console.log(`says REOPENED:      ${reopened.join(", ") || "(none)"}`);
console.log(`says STILL BLOCKED: ${blocked.join(", ") || "(none)"}`);
console.log(reopened.length && blocked.length
  ? `\nOne road, one landslide, one milepost — and the catalog says both. The reopening record names\na LATER date, so the blocked rows are the stale half.`
  : `\nNo contradiction on this milepost.`);
