// wa_forbidden_peak_east_ridge tells climbers they can drive to the Cascade Pass trailhead. They
// cannot, and have not been able to all season.
//
// Two of its fields say "Open to vehicles for the 2026 season all the way to the Boston Basin/
// Cascade Pass trailhead, per NPS Road Conditions (updated July 3, 2026)".
//
// NPS reporting for the 2026 season: the road is GATED AT MILEPOST 20, the Eldorado Trailhead,
// after spring landslide damage near MP 18 that crews finished clearing on 10 June. Bikes and
// pedestrians may pass the gate; it is a further 3 miles and ~1,500 vertical feet to the road's end
// at the Cascade Pass Trailhead.
//
// The catalog agrees with NPS and disagrees with this row. wa_boston_peak_west_face:
//   "Open to Eldorado Trailhead (MP 20) as of mid-2026; gated there following spring-2026
//    landslide/storm damage near MP 18"
// and its driveNote: "no vehicle access beyond MP 20."
//
// WHY THIS ONE MATTERS MORE THAN THE REST OF THE BATCH. Every other row in this cluster describes
// the ROUTINE winter gate at MP 20 correctly — that is permanent, correct information, not a stale
// closure. This row is the only one asserting the gate is OPEN. Forbidden's East Ridge is one of
// the most travelled alpine rock routes in the range, and a party planning off this row arrives
// expecting to park 3 miles and 1,500 ft higher than they can.
//
// A NEAR MISS worth recording: a first scan also flagged
// wa_johannesburg_mountain_northeast_rib_1951_route for "drive ... to the Cascade Pass trailhead".
// That row is CORRECT — it is a drive-time description, and its own seasonalGate and
// access.closures both explain the MP 20 gate. A description of the full drive is not a claim the
// road is open today; flagging it would have told an author to break a correct row.
//
// Exact find -> replace, refused unless `find` matches EXACTLY once, with the sibling re-asserted
// at apply time.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const SUBJECT = "wa_forbidden_peak_east_ridge";
const WITNESS = "wa_boston_peak_west_face";

const EDITS = [
  { col: "road", key: "status",
    find: "Open to vehicles for the 2026 season all the way to the Boston Basin/Cascade Pass trailhead, per NPS Road Conditions (updated July 3, 2026); has been closed by washouts in past years (e.g. at MP20 in late 2025), so reconfirm before driving.",
    repl: "Gated at Eldorado Creek (MP 20) for the 2026 season following spring landslide damage near MP 18; bikes and pedestrians may pass the gate, but it is a further 3 miles and about 1,500 ft of road to the Cascade Pass trailhead. Reconfirm on the NPS Road Conditions page before driving." },
  { col: "access", key: "closures",
    find: "As of the 2026 season, Cascade River Road is open to vehicles all the way to the Boston Basin/Cascade Pass trailhead, per NPS's official Road Conditions page (last updated July 3, 2026); check that page before driving, since the road has been closed by winter storm/washout damage in past years (e.g. at Eldorado/MP20 in late 2025).",
    repl: "Cascade River Road is gated to vehicles at Eldorado Creek (MP 20) for the 2026 season after spring landslide damage near MP 18. Bikes and pedestrians may continue past the gate; the Boston Basin and Cascade Pass trailheads are a further 3 miles and about 1,500 ft of road walking. Check the NPS Road Conditions page before driving." },
];

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access", `id=in.(${SUBJECT},${WITNESS})`);
if (rows.length !== 2) { console.error(`read ${rows.length} of 2 routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

// The sibling must still disagree with the subject, or this script has no in-catalog basis.
const wStatus = (byId[WITNESS].road || {}).status || "";
const witnessOk = /gated/i.test(wStatus) && /MP ?20|milepost 20/i.test(wStatus);
console.log(`${witnessOk ? "witness ok  " : "REFUSE      "}${WITNESS} road.status records the MP 20 gate for 2026`);
console.log(`            "${wStatus.slice(0, 150)}"`);
if (!witnessOk) { console.error("\nrefusing — the catalog no longer records the gate this relies on"); process.exit(1); }

let ok = true;
const patches = new Map();
for (const e of EDITS) {
  const working = patches.get(e.col) || { ...byId[SUBJECT][e.col] };
  const cur = working[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (/open to vehicles all the way|open all the way to/i.test(next)) { console.log(`REFUSE ${e.col}.${e.key} — result still claims through access`); ok = false; continue; }
  working[e.key] = next;
  patches.set(e.col, working);
  console.log(`\n${SUBJECT}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
if (!ok) { console.error("\nrefusing to apply"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const [col, obj] of patches) await patchRow("routes", SUBJECT, { [col]: obj });

const after = await selectAll("routes", "id,road,access", `id=eq.${SUBJECT}`);
const a = after[0];
const still = [(a.road || {}).status, (a.access || {}).closures]
  .filter(v => typeof v === "string" && /open to vehicles all the way|open all the way to/i.test(v));
console.log(still.length ? `\nSTILL CLAIMS THROUGH ACCESS — not clean` : `\nverified: ${SUBJECT} no longer tells climbers they can drive past the Eldorado gate.`);
process.exit(still.length ? 1 : 0);
