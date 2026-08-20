// The last two section-2 findings in Washington. Both are settled by evidence INSIDE the rows —
// no external research was needed, because each row contradicts either itself or eight neighbours.
//
// ─── wa_rimrock_ridge_scramble — the row argues with ITSELF ─────────────────────────────────────
//
//   trailhead      High Bridge (Stehekin Valley Road)
//   road.name      Suiattle River Road (Forest Road 26)
//   road.status    Closed to motor vehicles at MP 4.5 due to a December 2025 flood washout …
//   road.driveNote No road connects Stehekin to the outside highway network — access is by the
//                  Lady of the Lake ferry from Chelan, by floatplane, or on foot over Cascade Pass
//
// The name and status are the Suiattle December 2025 washout — the same closure that was sitting
// wrongly on the Glacier Peak routes — while the driveNote is a correct and detailed description of
// Stehekin. Eight neighbours at High Bridge all name Stehekin Valley Road. The driveNote is KEPT
// because it is already right; only the name and status are replaced.
//
// ─── wa_ragged_ridge — 150 km wrong, and the dangerous one ──────────────────────────────────────
//
//   trailhead      Easy Pass Trailhead (SR-20)  @48.5879,-120.8029
//   road.name      PCT Trailhead, Snoqualmie Pass (I-90 Exit 52)
//   road.status    Fully paved access; large parking lot with a public toilet directly off I-90.
//   road.driveNote About 45-60 minutes east of Seattle via I-90 to Exit 52.
//
// A climber heading for Easy Pass on the North Cascades Highway is told to drive I-90 to Snoqualmie
// Pass. Only `seasonalGate` is right — it describes the Washington Pass snow closure, which is SR-20.
// Six neighbours at this trailhead name the North Cascades Highway; `wa_katsuk_peak_gully` gives
// milepost 151 and the gate zone, so it is the donor.
//
// PURE WINNER-COPY: every value written below is lifted verbatim from a neighbour at the same
// trailhead. Nothing is composed, so a repair needing a fact none of these rows hold cannot be
// expressed here — the discipline the trailhead appliers used.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  {
    id: "wa_rimrock_ridge_scramble", donor: "wa_needle_peak_south_route",
    th: /high bridge|stehekin/i, was: /suiattle/i,
    // Keep this row's own driveNote: it already describes Stehekin correctly and in more detail.
    take: ["name", "status", "seasonalGate"],
  },
  {
    id: "wa_ragged_ridge", donor: "wa_katsuk_peak_gully",
    th: /easy pass/i, was: /snoqualmie|i-90/i,
    // Everything but the gate is about the wrong pass, and the donor's gate is the more precise of
    // the two (it names MP 151 and the closure zone), so take all four.
    take: ["name", "status", "driveNote", "seasonalGate"],
  },
];

let wrote = 0, skipped = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,road,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  const [d] = await selectAll("routes", "id,road,approach_logistics", `id=eq.${p.donor}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  if (!d) { console.error(`${p.donor}: donor NOT FOUND — refusing`); process.exit(1); }

  const th = String((r.approach_logistics || {}).trailhead || "");
  const dth = String((d.approach_logistics || {}).trailhead || "");
  if (!p.th.test(th)) { console.error(`${p.id}: trailhead is "${th}" — not what this plan expects, refusing`); process.exit(1); }
  // The donor only means anything if it shares the trailhead. Check, never assume.
  if (!p.th.test(dth)) { console.error(`${p.donor}: donor trailhead is "${dth}", not the same one — refusing`); process.exit(1); }
  if (!p.was.test(String((r.road || {}).name || ""))) {
    console.log(`${p.id}: road.name is "${(r.road || {}).name}" — already repaired, skipping`); skipped++; continue;
  }

  const next = { ...r.road };
  for (const k of p.take) next[k] = (d.road || {})[k];
  console.log(`\n${p.id}   [${th}]   donor ${p.donor}`);
  for (const k of p.take) {
    console.log(`   ${k}\n      was: ${String((r.road || {})[k] ?? "(none)").slice(0, 120)}\n      now: ${String(next[k] ?? "(none)").slice(0, 120)}`);
  }
  if (!APPLY) { console.log("   (dry run)"); continue; }

  await patchRow("routes", p.id, { road: next });
  const [chk] = await selectAll("routes", "id,road", `id=eq.${p.id}`, { pageSize: 3, key });
  const cr = chk.road || {};
  for (const k of p.take) if (cr[k] !== next[k]) { console.error(`   RECONCILE FAILED on ${k}`); process.exit(1); }
  for (const k of Object.keys(r.road || {})) if (!(k in next)) { console.error(`   LOST road.${k}`); process.exit(1); }
  console.log("   reconciled, and no road key was lost");
  wrote++;
}
console.log(`\n${APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned.`}`);
