// Bear Gulch Fire / North Fork Skokomish: checked, CORRECT, no edit — so stamp and move on.
//
// rank-open-ended-closures-by-age.mjs put this at the top of the queue: 6 values across 5 routes,
// one closure event, cause dated 14 months ago. The oldest repairable cause with no checked date.
//
// IT IS THE FOUNDING CASE OF THIS WHOLE AUDIT, which is why it was worth the query.
// audit:expiring-closures exists because wa_mount_hopper_standard once said "Closed indefinitely
// since October 2025 ... no confirmed 2026 reopening" after FS-24 and Staircase had reopened on
// 8 July 2026. So the question was whether the same rows had gone stale a second time.
//
// THEY HAVE NOT. All five routes make the distinction correctly and in their own words:
//   "The road is open, but the North Fork Skokomish trail out of Staircase remains CLOSED"
//   "FS-24 and the Staircase developed area reopened July 8, 2026 ... However, the North Fork ..."
// which is exactly CLAUDE.md's standing warning that THE ROAD IS NOT THE APPROACH — the trap that
// made clearing Hopper's road claim dangerous in the first place.
//
// CONFIRMED against WTA's North Fork Skokomish page, which carries a live alert: "The trail is
// closed from its intersection with the Staircase Rapids Loop to Home Sweet Home until further
// notice due to damage from the Bear Gulch Fire", and does not report the trailhead road as
// affected. NPS is the land manager here and could not confirm: its North Fork Skokomish page
// defers to a current-closures page that reads "This page is currently being worked on."
//
// ON THE STANDARD FOR STAMPING, because this case sits right on it. The rendered line promises
// "checked against a PUBLISHED source", and WTA is one — a maintained conditions publisher carrying
// a live alert. A land-manager page is preferred and was tried first. Refusing to stamp whenever a
// land manager's site is down would make the column dead exactly when it is most useful, and the
// claim on screen would still be true. What is NOT stamped is a check that came back UNSETTLEABLE:
// Harts Pass stays undated for that reason, and so would this have, had WTA carried nothing.
//
// NOTHING IS EDITED. "Correct, no edit" is a result, and this grind has produced it four times now
// (Hozomeen, nine of ten Cascade River Road rows, ~19 Suiattle rows, four of five Elbow Lake rows).
// The stamp is what changes: these rows now record that somebody looked.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const CHECKED = "2026-08-27T12:00:00Z";

const IDS = ["wa_mount_cruiser_south_corner", "wa_mount_hopper_standard", "wa_mount_lincoln_standard",
             "wa_the_horn_scramble", "wa_the_fin_scramble"];

/* Each row must still make the ROAD/TRAIL distinction, or the premise of this stamp has moved and it
   would be recording a check of something else. Re-asserted at apply time, never assumed. */
const ROAD_OPEN = /reopen|is open|road is open|have reopened/i;
const TRAIL_SHUT = /trail[^.]{0,80}(?:remains? )?clos|clos[^.]{0,80}trail/i;

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access,access_checked_at", `id=in.(${IDS.join(",")})`);
if (rows.length !== IDS.length) {
  const got = new Set(rows.map(r => r.id));
  console.error(`read ${rows.length} of ${IDS.length}; missing: ${IDS.filter(i => !got.has(i)).join(", ")}`);
  process.exit(1);
}

const textOf = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal].filter(v => typeof v === "string").join(" ");
};

let ok = true, toStamp = [], already = 0;
for (const r of rows) {
  const t = textOf(r);
  const road = ROAD_OPEN.test(t), trail = TRAIL_SHUT.test(t);
  if (!road || !trail) { console.log(`REFUSE  ${r.id} — no longer states road-open/trail-closed (road=${road} trail=${trail})`); ok = false; continue; }
  if (r.access_checked_at) { console.log(`already ${r.id} — ${r.access_checked_at}`); already++; continue; }
  console.log(`stamp   ${r.id} — states the road/trail distinction`);
  toStamp.push(r.id);
}

console.log(`\n${toStamp.length} to stamp, ${already} already dated, of ${IDS.length}.`);
if (!ok) { console.error("refusing while any row is refused"); process.exit(1); }
if (!toStamp.length) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const id of toStamp) await patchRow("routes", id, { access_checked_at: CHECKED });

const after = await selectAll("routes", "id,access_checked_at", `id=in.(${toStamp.join(",")})`);
const bad = after.filter(r => !r.access_checked_at);
console.log(bad.length ? `\n${bad.length} did not land` : `\nverified: ${after.length} route(s) now record that the Bear Gulch closure was checked and holds.`);
process.exit(bad.length ? 1 : 0);
