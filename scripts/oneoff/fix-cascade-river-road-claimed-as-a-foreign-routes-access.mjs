// Forty routes name a road they never drive as "the access road for these trailheads".
//
// One sentence, byte-identical on all forty:
//
//   "Cascade River Road (the access road for these trailheads) has a history of washouts/closures —
//    check current NPS road-conditions page each season."
//
// It is true about Cascade River Road, which serves Eldorado, Boston Basin and Cascade Pass out of
// Marblemount. It is filed on routes reached from Hannegan Pass Road, SR-20, Illabot Creek Road and
// Depot Creek Road in British Columbia — different drainages, some on the far side of the range. The
// parenthetical is what makes it a false claim rather than a stray note: it asserts this road is the
// way to THIS route's trailhead.
//
// IT IS THE CLOSURE LINE ON EIGHT OF THEM. RouteDetail.jsx:2828 renders closures as
// `ac.closures || ac.closure || ac.seasonal`, so where a row has no `closures` value this sentence is
// what a climber reads when they check the route for closures. Measured: 8 of the 40 render it, and
// 32 are shadowed by a real closures value — dormant rather than harmless, since clearing `closures`
// would surface it. Booker Mountain's two routes and Mount Chaval are among the eight, and their own
// roads are SR-20 to Colonial Creek and Illabot Creek Road (FR-16).
//
// THE FIELD IS CLEARED, NOT TRIMMED, and the deciding measurement is that the sentence is the ENTIRE
// value of access.seasonal on all forty — nothing else is in the field. Deleting only the false
// parenthetical would leave, as the whole of this route's seasonal-access record, a true statement
// about a road it will never touch, sitting in the slot a climber checks for closures. A foreign road
// there is worse than silence, and `access.seasonal` is a claim about THIS route's access, so a
// sentence about another one is not a partial truth but the wrong subject.
//
// CORROBORATION IS SIX FIELDS WIDE, and it is what keeps this safe. A row is only touched when its own
// road.name, road.driveNote, road.status, approach prose, approach_logistics.trailhead and
// approach_logistics.trailheadDirection ALL fail to mention Cascade River Road. 103 rows carry the road
// in their access block and 63 are corroborated that way — those keep the sentence, correctly, because
// for them it is their road. A sweep on the sentence alone would have wiped all 103.
//
// CLEARING IT CHANGES EXACTLY ONE THING, checked rather than assumed. `access.seasonal` has two readers:
// the closures chain above, and lib/routeTags.js:118, which folds it into a haystack scanned by
// /raptor|nesting closure|nesting season|peregrine|eagle|falcon|vulture/. This sentence contains none of
// those words, so no derived tag can change. The third hit, lib/objKeys.js:17, is a comment.
//
// Nothing is authored. The only value written is an empty string.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const SENT = "Cascade River Road (the access road for these trailheads) has a history of washouts/closures — check current NPS road-conditions page each season.";
const CRR = /cascade river road/i;
const norm = s => String(s || "").toLowerCase();

const rows = await selectAll("routes", "id,road,access,approach,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], kept = [];
for (const r of rows) {
  const a = r.access || {};
  if (String(a.seasonal ?? "").trim() !== SENT) continue;
  const own = [r.road?.name, r.road?.driveNote, r.road?.status, r.approach,
    r.approach_logistics?.trailhead, r.approach_logistics?.trailheadDirection].map(norm).join(" | ");
  if (CRR.test(own)) { kept.push(r.id); continue; }           // it really is this route's road
  const shown = String(a.closures ?? "").trim() || String(a.closure ?? "").trim() || String(a.seasonal ?? "").trim();
  plan.push({ id: r.id, row: r, renders: shown === SENT, road: String(r.road?.name || "(none)").slice(0, 60) });
}

console.log(`\nrows carrying the sentence: ${plan.length + kept.length}`);
console.log(`  kept — the row's own road/approach names Cascade River Road: ${kept.length}`);
console.log(`  to clear — no field on the row mentions it: ${plan.length}`);
console.log(`     ...of which it is the CLOSURE LINE on screen today: ${plan.filter(p => p.renders).length}`);
for (const p of plan.filter(x => x.renders)) console.log(`        ${p.id}  — own road: ${p.road}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const p of plan) { await patchRow("routes", p.id, { access: { ...p.row.access, seasonal: "" } }); wrote++; }
console.log(`\nwrote ${wrote}`);

const after = await selectAll("routes", "id,road,access,approach,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
let left = 0, still = 0;
for (const r of after) {
  if (String(r.access?.seasonal ?? "").trim() !== SENT) continue;
  left++;
  const own = [r.road?.name, r.road?.driveNote, r.road?.status, r.approach,
    r.approach_logistics?.trailhead, r.approach_logistics?.trailheadDirection].map(norm).join(" | ");
  if (!CRR.test(own)) still++;
}
console.log(`rows still carrying the sentence: ${left}  (expected ${kept.length}, all corroborated)`);
console.log(`  ...of which UNcorroborated: ${still}  (expected 0)`);
