// Which routes drive to the Elbow Lake Trailhead and do not record that the road is cut at MP 7?
//
// FSR 38 is closed at Mile Post 7 by a washout, per a Mt. Baker-Snoqualmie alert dated 27 July 2026,
// blocking Elbow Lake Trail 697 and Ridley Creek Trail 696. Four Little Sister routes record it.
// This asks who else drives there and says nothing.
//
// UNLIKE THE THREE QUEENS FIRE, THIS ONE BELONGS IN THE CATALOG, and the distinction is the point:
//   - a fire closure is transient and moving, has no road-specific cause, and lifts on its own. The
//     app's live fire panel is the right surface for it, and writing it into road.status makes a lie
//     with a nine-week fuse.
//   - a WASHOUT is a physical change to the road with no announced end. That is exactly what
//     road.status is for, and the catalog already carries the form: the Dosewallips road has been
//     recorded as "closed to motor vehicles indefinitely" since a January 2002 washout.
// The alert DATE is what keeps it honest — a reader can judge a claim dated 27 July 2026 in a way
// they cannot judge "currently".
//
// Report-only, read-only, anon key. Fails closed on an empty read and on a broken needle.
import { selectAll } from "../lib/supabase-env.mjs";

const USES = /elbow lake trailhead|elbow lake trail|FSR? ?38\b|FR[- ]?38\b/i;
const KNOWS = /milepost 7|MP 7|27 July 2026/i;

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const textOf = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.name, rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal]
    .filter(v => typeof v === "string").join(" — ");
};

const aware = [], silent = [];
for (const r of rows) {
  const t = textOf(r);
  if (!USES.test(t)) continue;
  (KNOWS.test(t) ? aware : silent).push({ id: r.id, name: r.name, t });
}
if (!aware.length && !silent.length) { console.error("FAIL — no route mentions FR 38; the needle broke"); process.exit(1); }
if (!aware.length) { console.error("FAIL — not one route records the MP 7 closure. Either it has been swept out of the\ncatalog or the needle is wrong; refusing to report a worklist built on that."); process.exit(1); }

console.log(`${aware.length + silent.length} WA route(s) describe FR 38 / the Elbow Lake Trailhead.`);
console.log(`   ${aware.length} record the MP 7 washout.`);
console.log(`   ${silent.length} do not.\n`);
for (const s of silent) {
  console.log(`   ${s.id}  —  ${s.name}`);
  const snip = (s.t.match(/[^—]*(?:elbow lake|FSR? ?38|FR[- ]?38)[^—]*/i) || [s.t])[0];
  console.log(`      ${snip.replace(/\s+/g, " ").trim().slice(0, 190)}\n`);
}
console.log(`AWARE: ${aware.map(a => a.id).join(", ")}\n`);
console.log(`READ BEFORE ACTING. Naming FR 38 is not the same as driving it — a row may reach the peak
from the west, or name the road only as a landmark. And the alternate southern approach via FR 12 to
Pioneer Camp is a different road with its own gates, so a route that uses it is not affected.`);
