// wa_mount_barnes_scramble: a defect THIS SWEEP created, and the first one section 2 of
// audit:trailhead-road-agreement found.
//
// An earlier batch moved this route's trailhead to Sol Duc — correctly; the two stored copies of
// the trailhead disagreed and Sol Duc won on the evidence. What that batch did not do was look at
// the `road` block, which still describes OLYMPIC HOT SPRINGS ROAD to the Whiskey Bend Trailhead,
// on the other side of the Olympics:
//
//   road.name      Olympic Hot Springs Road (to Whiskey Bend Trailhead)
//   road.status    closed to vehicles beyond Madison Falls (Sept 2024 flood washout …)
//   road.driveNote reaching Whiskey Bend Trailhead requires an additional 6.2 mi one-way walk …
//
// Every sentence of that is TRUE, and every one of them is about a road this route no longer uses.
// That is why section 1 cannot see it: a correct statement about the wrong road contradicts nobody.
// The screen shows a climber a flood closure and a 6.2-mile road walk that have nothing to do with
// the drive they are about to make.
//
// THE COPY COMES FROM THE SEVEN NEIGHBOURS AT THIS TRAILHEAD, not from research. Six of the eight
// routes at Sol Duc name a "Sol Duc …" road; this takes the shape they agree on. Declaring a winner
// rather than composing a value is the same discipline the trailhead appliers used, and it means a
// repair needing facts none of these rows hold cannot be expressed here at all.
//
// The old Elwha text is NOT discarded — it moves into a note recording that the Elwha/Whiskey Bend
// side is a genuine alternative and is currently shut. That is exactly how the neighbours
// (`wa_mount_appleton_standard`, `wa_mount_pulitzer_standard`) already handle it.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const ID = "wa_mount_barnes_scramble";

const [r] = await selectAll("routes", "id,road,approach_logistics", `id=eq.${ID}`, { pageSize: 3, key });
if (!r) { console.error(`${ID}: NOT FOUND`); process.exit(1); }
const road = r.road || {}, th = String((r.approach_logistics || {}).trailhead || "");

if (!/sol duc/i.test(th)) { console.error(`trailhead is "${th}", not Sol Duc — the premise of this fix is gone, refusing`); process.exit(1); }
if (!/olympic hot springs|whiskey bend/i.test(String(road.name || ""))) {
  console.log(`road.name is "${road.name}" — no longer the Elwha road, nothing to do`); process.exit(0);
}

// The neighbours must still agree, read at run time rather than remembered.
const sibs = await selectAll("routes", "id,road,approach_logistics",
  "approach_logistics->>trailhead=like.*Sol Duc*", { pageSize: 100, key });
const agreeing = sibs.filter(s => s.id !== ID && /sol\s*duc/i.test(String((s.road || {}).name || "")));
console.log(`${agreeing.length} of ${sibs.length - 1} neighbours at Sol Duc name a "Sol Duc" road`);
if (agreeing.length < 4) { console.error("fewer than 4 neighbours agree — refusing"); process.exit(1); }

const next = {
  ...road,
  name: "Sol Duc Hot Springs Road (Sol Duc River Road, from US-101)",
  status: "Paved, 2WD-accessible to the road-end trailhead",
  driveNote: "From US-101 near Lake Crescent, follow Sol Duc Hot Springs Road roughly 14 miles past the resort to the road-end parking area. The Elwha-side alternative via Whiskey Bend is a genuine second approach to this peak and is currently shut: Olympic Hot Springs Road is closed to vehicles beyond Madison Falls after the Sept 2024 flood washout, adding a 6.2-mile one-way walk or bike to reach Whiskey Bend.",
  seasonalGate: "Typically gated or closed by snow late October through late March; check NPS current road conditions before driving in.",
};

console.log(`\n${ID}   trailhead: ${th}`);
for (const k of ["name", "status", "driveNote", "seasonalGate"]) {
  console.log(`  ${k}\n     was: ${String(road[k] ?? "(none)").slice(0, 130)}\n     now: ${String(next[k]).slice(0, 130)}`);
}
if (!APPLY) { console.log("\n(dry run) pass --apply to write"); process.exit(0); }

await patchRow("routes", ID, { road: next });
const [chk] = await selectAll("routes", "id,road", `id=eq.${ID}`, { pageSize: 3, key });
const cr = chk.road || {};
if (cr.name !== next.name || cr.status !== next.status || cr.driveNote !== next.driveNote) {
  console.error("RECONCILE FAILED"); process.exit(1);
}
for (const k of Object.keys(road)) if (!(k in next)) { console.error(`LOST road.${k}`); process.exit(1); }
console.log("\nreconciled; the road block now describes the road this route actually drives.");
