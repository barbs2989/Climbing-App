// The one EXPIRED claim audit:expiring-closures reports: wa_glacier_peak_kennedy_glacier's
// road.status asserts "Closed MP 3.7 to end per MBS National Forest order (Dec 2024 flood damage;
// in effect through at least Dec 31, 2025)". Today is well past that window.
//
// Note this is about WHITE CHUCK ROAD (FR 23), NOT the Mountain Loop — that row's own driveNote
// already records the Mountain Loop reopening, and the two are different approaches to Glacier
// Peak. Conflating them is exactly the "a drive has several named legs" trap.
//
// Before touching it, ask what every other route on FR 23 says. A sibling with a later record is
// evidence; agreement across the cluster says the whole cluster is stale rather than this one row.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,access,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

// FR 23 / White Chuck specifically. Deliberately NOT the Mountain Loop or FR 49 needles.
const NEEDLE = /white\s*chuck|\bFR[- ]?23\b|forest road 23\b|\bFS[- ]?23\b/i;
const hits = [];
for (const r of rows) {
  const rd = r.road || {}, ac = r.access || {};
  const fields = { "road.name": rd.name, "road.status": rd.status, "road.driveNote": rd.driveNote,
    "road.seasonalGate": rd.seasonalGate, "access.closures": ac.closures, "access.seasonal": ac.seasonal };
  const named = Object.entries(fields).filter(([, v]) => typeof v === "string" && NEEDLE.test(v));
  if (!named.length) continue;
  hits.push({ id: r.id, name: r.name, named,
    th: (r.approach_logistics && r.approach_logistics.trailhead) || "(none)" });
}
console.log(`${hits.length} route(s) name White Chuck Road / FR 23\n`);
for (const h of hits) {
  console.log(`${h.id}  —  ${h.name}`);
  console.log(`   trailhead: ${h.th}`);
  for (const [k, v] of h.named) console.log(`   ${k}: ${v.slice(0, 240)}`);
  console.log("");
}
/* RESOLVED 2026-08-26, and by a parallel session rather than by this probe — the row now reads
   "Closed MP 3.7 to end per MBS National Forest order (Dec 2024 flood damage; Forest Order
   #06-05-25-02, still closed as of spring 2026 per Mt. Baker-Snoqualmie NF alerts)". The closure
   was never the problem: only its stated window had gone stale, and the sibling on the SAME
   trailhead (wa_sitkum_spire_standard) had the current record all along.

   "FR 23" IS AT LEAST FOUR DIFFERENT ROADS IN WASHINGTON, and that is the durable finding here:
   White Chuck River Road (Darrington), the Randle/Gifford Pinchot FR 23 (EZ Way, Ives Peak), the
   Mount Adams NW approach to Killen Creek, and one in the Olympics (Mount Olson, South Fork
   Skokomish). The `a name is not an identity` root cause this repo records for route ids, arriving
   at road NUMBERS. Choose a road donor by SHARED TRAILHEAD, never by road number — and note that
   audit:trailhead-road section 3 is safe from it only because its cluster key needs a shared
   distinctive WORD ("white"/"chuck" vs "killen"), which a bare number cannot supply. */
console.log(`Read these before changing the Kennedy Glacier row. If no sibling records a reopening,\nthere is no in-catalog evidence and the honest repair is to stop asserting a CURRENT closure\nrather than to assert the opposite — "date it or drop the claim".`);
