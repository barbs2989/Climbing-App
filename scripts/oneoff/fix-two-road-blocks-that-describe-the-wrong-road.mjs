// The two repairable findings from audit:trailhead-road-agreement, both verified against NPS,
// USFS and WSDOT before anything was written.
//
// THE AUDIT DELIBERATELY DOES NOT PICK A WINNER, and that restraint paid for itself here. I read
// the Staircase finding as "one row says closed, a sibling wrongly says year-round". It is the
// CLOSED row that is stale. Had the audit chosen, it would have chosen wrong.
//
// ─── 1. wa_mount_rainier_ptarmigan_ridge — the road block describes the OTHER approach ─────────
//
// `approach_logistics.trailhead` is "White River Campground"; `road.name` is "Mowich Lake Road".
// Ptarmigan Ridge genuinely has two approaches and BOTH are documented — Mowich Lake via Spray
// Park is shorter, White River via St. Elmo Pass avoids the car shuttle that a Mowich start forces
// (the climb normally descends the Emmons to White River). So the TRAILHEAD is not the wrong half,
// which is what I first assumed; the road block is simply describing the road this row does not use.
//
// The other three routes at this trailhead all name White River Road. `wa_mount_rainier_willis_wall`
// is the model, because it faces the same two-approach situation and resolves it correctly: it
// names White River as its road AND carries the Fairfax closure as context. This copies that shape
// and PRESERVES the existing Mowich text as the alternative-approach note rather than deleting it —
// that text is accurate and materially affects planning, it is just not this route's road.
//
// ─── 2. Staircase — "closed indefinitely" is STALE, but the trail really is shut ────────────────
//
// `wa_mount_hopper_standard.road.seasonalGate` says "Closed indefinitely since October 2025 due to
// Bear Gulch Fire damage; no confirmed 2026 reopening". Two things are wrong: the fire ignited
// 6 July 2025, not October, and FS-24 and the Staircase developed area REOPENED on 8 July 2026
// after a year-long closure (NPS release; USFS Bear Gulch Fire page, both updated 8 July 2026).
//
// BUT THE ROAD IS NOT THE APPROACH. The North Fork Skokomish trail out of Staircase — the actual
// corridor for both these peaks — remains CLOSED with no reopening date, along with Flapjack Lakes,
// Six Ridge, Wagonwheel Lake and Home Sweet Home, while crews assess hazard trees and repair
// backcountry infrastructure. So the fix moves the road to open and KEEPS the closure that still
// stops a climber, in `access.closures` where a trail closure belongs. Hopper's driveNote pointing
// at Duckabush stays for the same reason: the trail closure is what made it the viable approach,
// and that has not changed.
//
// WHAT IS DELIBERATELY *NOT* WRITTEN, and it is the more important half:
// White River Road and Sunrise Road are closed RIGHT NOW for the Grand Park 2 Fire (NPS, 13 Aug
// 2026). That is not written into `road.status` for any route, because a transient closure in a
// field nothing re-checks is exactly how the Staircase row became a lie — somebody recorded a live
// fire closure as a standing fact and no process ever revisited it. Recording this fire the same
// way would reproduce the defect this script is repairing. A closure that expires needs a freshness
// signal the schema does not have; a permanently closed bridge does not.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const WR_NOTE = "Accessed via the White River/Sunrise entrance off SR 410. The Mowich Lake approach via Spray Park is shorter but forces a car shuttle, and is in any case cut off: SR-165's Fairfax/Carbon River Bridge was permanently closed by WSDOT in April 2025, with no detour and no funded reopening timeline.";

const PLAN = [
  {
    id: "wa_mount_rainier_ptarmigan_ridge",
    // Refuse unless the row still shows the defect: a Mowich road block on a White River trailhead.
    guard: r => /mowich/i.test(String((r.road || {}).name || "")) && /white river/i.test(String((r.approach_logistics || {}).trailhead || "")),
    guardWhy: "road.name should still say Mowich while the trailhead says White River",
    road: r => ({
      ...r.road,
      name: "White River Road (off SR 410)",
      status: "Paved, seasonal — typically open late June to early October; this is the approach the stored trailhead uses",
      driveNote: WR_NOTE,
      seasonalGate: "Gated in winter and spring until plowed; early-season parties may walk in from the gate",
    }),
  },
  {
    id: "wa_mount_hopper_standard",
    guard: r => /closed indefinitely/i.test(String((r.road || {}).seasonalGate || "")),
    guardWhy: "road.seasonalGate should still claim an indefinite closure",
    road: r => ({
      ...r.road,
      status: "Open — FS-24 and the Staircase developed area reopened 8 July 2026 after a year-long closure following the 2025 Bear Gulch Fire",
      seasonalGate: "Open; the road itself is no longer gated for the fire. Verify before travel.",
    }),
    access: r => ({
      ...r.access,
      closures: "The road is open, but the approach is not: the North Fork Skokomish trail out of Staircase remains CLOSED with no stated reopening date while crews assess hazard trees and repair backcountry infrastructure after the 2025 Bear Gulch Fire (20,233 acres, contained 12 Nov 2025). Flapjack Lakes, Six Ridge, Wagonwheel Lake and Home Sweet Home are closed as well.",
    }),
  },
  {
    id: "wa_mount_cruiser_south_corner",
    guard: r => /closed as of 2026/i.test(String((r.road || {}).status || "")),
    guardWhy: "road.status should still claim a 2026 fire closure",
    road: r => ({
      ...r.road,
      status: "Open — FS-24 reopened 8 July 2026 after the 2025 Bear Gulch Fire closure. Verify before driving out.",
    }),
    access: r => ({
      ...r.access,
      closures: "The road is open, but the North Fork Skokomish trail out of Staircase remains CLOSED with no stated reopening date after the 2025 Bear Gulch Fire — check current trail status before committing to this approach.",
    }),
  },
];

let wrote = 0, skipped = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,road,access,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  if (!p.guard(r)) {
    console.log(`${p.id}: does not show the defect — skipping (${p.guardWhy})`);
    skipped++; continue;
  }
  const road = p.road(r), access = p.access ? p.access(r) : null;
  console.log(`\n${p.id}`);
  console.log(`   road.name   was: ${(r.road || {}).name}`);
  console.log(`               now: ${road.name}`);
  console.log(`   road.status was: ${String((r.road || {}).status || "").slice(0, 100)}`);
  console.log(`               now: ${String(road.status).slice(0, 100)}`);
  if (!APPLY) { console.log("   (dry run)"); continue; }

  const body = access ? { road, access } : { road };
  await patchRow("routes", p.id, body);
  const [chk] = await selectAll("routes", "id,road,access", `id=eq.${p.id}`, { pageSize: 3, key });
  const cr = chk.road || {}, ca = chk.access || {};
  if (cr.status !== road.status || cr.name !== road.name) { console.error("   RECONCILE FAILED"); process.exit(1); }
  if (access && ca.closures !== access.closures) { console.error("   RECONCILE FAILED on access.closures"); process.exit(1); }
  // Nothing outside the keys this plan names may change — a targeted edit, not a replacement.
  for (const k of Object.keys(r.road || {})) if (!(k in road) ) { console.error(`   LOST road.${k}`); process.exit(1); }
  for (const k of Object.keys(r.access || {})) if (JSON.stringify(ca[k]) !== JSON.stringify((access || r.access)[k])) { console.error(`   LOST access.${k}`); process.exit(1); }
  console.log("   reconciled, and every other road/access key survived");
  wrote++;
}
console.log(`\n${APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned.`}`);
