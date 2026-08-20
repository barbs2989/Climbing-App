// Five road blocks describing a road their route does not drive — the rest of the class #1086
// opened, verified against the Forest Service, NPS, Snohomish County and WTA before writing.
//
// ─── THREE AT THE NORTH FORK SAUK TRAILHEAD ────────────────────────────────────────────────────
//
// All three sit at the North Fork Sauk River Trailhead (~48.058, -121.288), whose road is Sloan
// Creek Road / FR 49 off the Mountain Loop Highway. They named other roads entirely:
//
//   disappointment_peak_cleaver   "Chiwawa River Road (FR 6200) to Trinity"   — the far side of the
//                                 range, out of Lake Wenatchee
//   sitkum_glacier                "White Chuck Road (FR 23)"                  — the north approach
//   frostbite_ridge               "White Chuck Road (FR 23)"                  — likewise
//
// `disappointment_peak_cleaver`'s own `access.seasonal` already said "the Mountain Loop Highway/FR
// 49 corridor TO THIS TRAILHEAD", so the row contradicted its own road block.
//
// FR 49 IS THE ROUTE'S ROAD AND IT IS OPEN. The Forest Service lists the North Fork Sauk Trailhead
// as "Site Open" (6 July 2026) and FR 49 appears on no current MBS closure; the 2025 Red Mountain
// Fire order that closed FR 49 at MP 3 expired 31 October 2025. The Mountain Loop Highway's gated
// Deer Creek–Bedal section reopened fully on 15 May 2026 (Snohomish County), on its usual mid-May
// pattern.
//
// THE DECEMBER 2025 STORM IS REAL AND IS ABOUT THE OTHER ROADS. It closed Suiattle River Road (FSR
// 26) at MP 4.5 — a 70-foot ravine across the road — and FSR 23 at MP 3.7. **No source places
// damage on FR 49 either way**, so nothing is asserted about it here. That distinction is the whole
// point: the White Chuck closure these rows carried is TRUE, and true about a road they do not use.
//
// NOT WRITTEN: the Miner's Fire (lightning, 13 Aug 2026) closed the Suiattle drainage through
// 31 Dec 2026. Its order does not list FR 49 or North Fork Sauk Trail 649 — and it is an EXPIRING
// closure, which is exactly what must not go into a standing field. That is the defect repaired in
// #1086 (Staircase said "closed indefinitely" a year after its road reopened) and reproducing it
// here would be committing the error I had just finished fixing.
//
// ─── TWO AT THE NORTH FORK QUINAULT TRAILHEAD ──────────────────────────────────────────────────
//
//   meany   named Whiskey Bend Road AND Graves Creek Road — three roads, none of them this one
//   noyes   named "North Fork Quinault Road (South Shore Road)" — right road, WRONG parent
//
// NPS (updated 5 May 2026): North Fork Quinault Road is OPEN and reachable **from North Shore Road
// only**, 4 miles from the North/South Shore intersection, gravel and narrow. South Shore Road has
// been closed by a washout ~8 miles from US-101 since 13 Nov 2025 — so `noyes` names the one
// approach that does not work.
//
// Section 2 of the audit caught the three Glacier Peak rows and MISSED both of these, for a reason
// worth recording: `meany`'s road.name lists three roads and one of them contains "Quinault", so it
// matched the cluster's shared token. A name naming several roads defeats a token test.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const SAUK_NOTE = "From Darrington, follow the Mountain Loop Highway about 19.7 miles to Sloan Creek Road (FR 49), then about 6.6 miles to the North Fork Sauk River Trailhead.";
const SAUK_GATE = "The Mountain Loop Highway's Deer Creek to Bedal section is gated through the winter and typically reopens in mid-May; FR 49 can hold snow into early summer in heavy years.";
const QUIN_NOTE = "From US-101 at Lake Quinault take North Shore Road about 14 miles to the North/South Shore intersection, then North Fork Quinault Road about 4 miles to the trailhead and ranger station. North Shore is currently the only way in: South Shore Road is closed by a washout roughly 8 miles from US-101.";

const PLAN = [
  {
    id: "wa_glacier_peak_disappointment_peak_cleaver", th: /north fork sauk/i, was: /chiwawa/i,
    road: r => ({ ...r.road, name: "North Fork Sauk Road / Sloan Creek Road (FR 49)",
      status: "Gravel, with rough and washed-out sections; medium or high clearance is recommended and a low-clearance car may not clear them.",
      driveNote: SAUK_NOTE, seasonalGate: SAUK_GATE }),
  },
  {
    id: "wa_glacier_peak_sitkum_glacier", th: /north fork sauk/i, was: /white chuck/i,
    road: r => ({ ...r.road, name: "North Fork Sauk Road / Sloan Creek Road (FR 49)",
      status: "Gravel, with rough and washed-out sections; medium or high clearance is recommended and a low-clearance car may not clear them.",
      driveNote: SAUK_NOTE + " The White Chuck Road (FR 23) approach from the north is a different start and is closed at milepost 3.7.",
      seasonalGate: SAUK_GATE }),
  },
  {
    id: "wa_glacier_peak_frostbite_ridge", th: /north fork sauk/i, was: /white chuck/i,
    road: r => ({ ...r.road, name: "North Fork Sauk Road / Sloan Creek Road (FR 49)",
      status: "Gravel, with rough and washed-out sections; medium or high clearance is recommended and a low-clearance car may not clear them.",
      driveNote: SAUK_NOTE + " The White Chuck Road (FR 23) approach from the north is a different start and is closed at milepost 3.7.",
      seasonalGate: SAUK_GATE }),
  },
  {
    id: "wa_mount_meany_standard", th: /north fork quinault/i, was: /whiskey bend/i,
    road: r => ({ ...r.road, name: "North Fork Quinault Road (via North Shore Road)",
      status: "Open; the final 4 miles are gravel, narrow and winding, and are not recommended for RVs or trailers.",
      driveNote: QUIN_NOTE + " The Elwha approach via Whiskey Bend is a genuine alternative and is currently foot and bike only: Olympic Hot Springs Road has been shut to vehicles beyond Madison Falls since a washout, adding roughly 6 miles each way.",
      seasonalGate: "May close during winter storms; NPS publishes no fixed gate dates, so check current road conditions before travelling." }),
  },
  {
    id: "wa_mount_noyes_standard", th: /north fork quinault/i, was: /south shore/i,
    road: r => ({ ...r.road, name: "North Fork Quinault Road (via North Shore Road)",
      status: "Open; the final 4 miles are gravel, narrow and winding, and are not recommended for RVs or trailers.",
      driveNote: QUIN_NOTE,
      seasonalGate: "May close during winter storms; NPS publishes no fixed gate dates, so check current road conditions before travelling." }),
  },
];

let wrote = 0, skipped = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,road,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  const th = String((r.approach_logistics || {}).trailhead || "");
  // The trailhead is the premise of the whole repair — check it, never assume it.
  if (!p.th.test(th)) { console.error(`${p.id}: trailhead is "${th}", not what this plan expects — refusing`); process.exit(1); }
  if (!p.was.test(String((r.road || {}).name || ""))) {
    console.log(`${p.id}: road.name is "${(r.road || {}).name}" — no longer the wrong road, skipping`); skipped++; continue;
  }
  const next = p.road(r);
  console.log(`\n${p.id}   [${th}]`);
  console.log(`   was: ${(r.road || {}).name}`);
  console.log(`   now: ${next.name}`);
  if (!APPLY) { console.log("   (dry run)"); continue; }

  await patchRow("routes", p.id, { road: next });
  const [chk] = await selectAll("routes", "id,road", `id=eq.${p.id}`, { pageSize: 3, key });
  const cr = chk.road || {};
  if (cr.name !== next.name || cr.status !== next.status || cr.driveNote !== next.driveNote) {
    console.error("   RECONCILE FAILED"); process.exit(1);
  }
  // A targeted edit, not a replacement: no key of the original road block may vanish.
  for (const k of Object.keys(r.road || {})) if (!(k in next)) { console.error(`   LOST road.${k}`); process.exit(1); }
  console.log("   reconciled, and no road key was lost");
  wrote++;
}
console.log(`\n${APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned.`}`);
