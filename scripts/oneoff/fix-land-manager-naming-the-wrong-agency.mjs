// One fact stored twice under two spellings, and on four rows the one that DISPLAYS names the wrong agency.
//
// `access` carries both `land_manager` and `landManager`, and the route page reads
// `ac.land_manager || ac.landManager` — so the snake_case value wins. On four Ruth Creek valley routes
// (Blood Orgy, Ellation, Hail Satan, Woodland Critter Christmas, all on Mamie Peak) it reads
// "National Park Service — North Cascades National Park (Stephen Mather Wilderness)" while the hidden
// camelCase value reads "Mount Baker-Snoqualmie National Forest (Mount Baker Ranger District / Glacier
// Public Service Center)". Those are different agencies, different offices and different permits, so a
// climber reading the screen is sent to the wrong one.
//
// THE ROW SETTLES IT, FOUR TIMES OVER, so nothing is researched and no agency is asserted by this script:
//   road.name              "Hannegan Pass Trailhead (end of FS-32), off Mt. Baker Highway (SR-542)"
//   approach_logistics     "Hannegan Pass Trailhead (Trail #674, FR-32)"      — FS/FR are Forest roads
//   access.fees            "$5 per vehicle/day (or $30 annual) day-use fee"   — the Northwest Forest
//                                                                              Pass, a USFS product
//   access.permit          "...a backcountry permit from the Glacier Public Service Center is required
//                           only for overnight stays within N[OCA]"           — the Glacier PSC is the
//                          Mt Baker Ranger District office, and that sentence scopes the NPS permit to
//                          overnight stays INSIDE the park, i.e. not to this climb.
// Five records point to the Forest Service and one to the Park Service, and the one is the outlier.
//
// AND IT IS THE SAME CONTAMINATING PASS AS THE TWO REPAIRS BEFORE IT. "Stephen Mather Wilderness" is the
// NPS designation that also appeared on wa_jack_mountain_south_face's land_manager, alongside the Cascade
// River Road access sentence cleared from 40 rows and the Boston Basin group-size example cleared from 48.
// Four fields, one boilerplate, one origin.
//
// THE REPAIR IS A COPY WITHIN THE ROW: land_manager := landManager. No text is typed, the value written
// already exists in the row, and afterwards both spellings agree so the display cannot depend on which
// one a reader happens to consult.
//
// THE CLASS IS FOUR, MEASURED, AND THE MEASUREMENT IS MOST OF THE VALUE. 650 WA rows carry both spellings
// and 581 DIFFER — but almost all of those are phrasing, not contradiction ("Okanogan-Wenatchee National
// Forest (Methow Valley Ranger District)" against "Okanogan-Wenatchee National Forest, Methow Valley
// Ranger District"), and the SHOWN value is generally the more specific of the two. Sweeping the 581
// would have overwritten hundreds of better values with worse ones. Asking instead whether the two name
// DISJOINT AGENCIES — NPS against USFS, which is a real difference in where you buy a permit — takes it
// to 4. That is the whole difference between a defect and a difference in wording.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const NPS = /national park service|\bnps\b|national park\b|national recreation area/i;
const USFS = /national forest|\busfs\b|forest service|ranger district/i;
// the row's own corroborating markers — a Forest road, a Forest pass, a Forest office
const FOREST_MARK = /\bFS-?\d|\bFR-?\d|forest service|ranger district|public service center|northwest forest pass|\$5 per vehicle/i;

const rows = await selectAll("routes", "id,access,road,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [];
for (const r of rows) {
  const a = r.access || {};
  const shown = String(a.land_manager ?? "").trim(), hidden = String(a.landManager ?? "").trim();
  if (!shown || !hidden || shown === hidden) continue;
  // the displayed value must name the Park Service and ONLY the Park Service; the hidden one the Forest
  // Service and ONLY the Forest Service. A value naming both is a boundary description, not a clash.
  if (!(NPS.test(shown) && !USFS.test(shown))) continue;
  if (!(USFS.test(hidden) && !NPS.test(hidden))) continue;
  // ...and the rest of the row must corroborate the Forest Service, or this script has no basis
  const own = [r.road?.name, r.road?.driveNote, r.approach_logistics?.trailhead, a.fees, a.permit, a.passRequired]
    .map(x => String(x || "")).join(" | ");
  if (!FOREST_MARK.test(own)) { console.log(`  SKIPPED ${r.id}: nothing else on the row corroborates the Forest Service`); continue; }
  console.log(`\n  ${r.id}`);
  console.log(`     shown  land_manager: ${JSON.stringify(shown.slice(0, 120))}`);
  console.log(`     hidden landManager : ${JSON.stringify(hidden.slice(0, 120))}`);
  console.log(`     corroborated by    : ${JSON.stringify((own.match(FOREST_MARK) || [""])[0])} in the row's own road/permit/fees`);
  plan.push({ id: r.id, access: a, to: hidden });
}

console.log(`\nrows to repair: ${plan.length}`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { access: { ...p.access, land_manager: p.to } });
const after = await selectAll("routes", "id,access", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let ok = 0;
for (const r of after) {
  const s = String(r.access?.land_manager ?? "").trim(), c = String(r.access?.landManager ?? "").trim();
  if (s === c && USFS.test(s) && !NPS.test(s)) ok++; else console.log(`NOT APPLIED — ${r.id}`);
}
console.log(`\nverified: ${ok} of ${plan.length} rows now display the Forest Service, matching the rest of the row`);
