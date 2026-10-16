// One row calls FR 38 a good road. It is closed at milepost 7.
//
// wa_cinderella_peak_scramble:
//   road.status  "Good gravel/paved forest road when open; check Mt. Baker-Snoqualmie NF alerts for
//                 washouts before driving."
//   road.driveNote  "... drive about 11 miles of forest road to the Elbow Lake Trailhead."
//
// FSR 38 is closed at Mile Post 7 by a washout, per a Mt. Baker-Snoqualmie alert dated 27 July 2026,
// blocking Elbow Lake Trail 697. Eleven miles is four miles past the gate.
//
// "CHECK ALERTS FOR WASHOUTS" IS NOT A CLOSURE NOTICE, and that is what makes this row worse than a
// silent one. It gestures at exactly the right source, so it reads as though somebody has looked —
// while the affirmative half ("good gravel/paved forest road") is the sentence a climber acts on.
//
// THE OTHER FOUR ROUTES ON THIS TRAILHEAD ARE CORRECT AND ARE LEFT ALONE. wa_little_sister_scramble,
// wa_skookum_peak_twinsisters_scramble, wa_south_twin_sister_north_ridge and _west_ridge all already
// say FR 38 is washed out with no announced repair timeline. They lack the milepost and the alert
// date, which would be an improvement rather than a correction — and this catalog's repeated lesson
// is that a cluster's SIZE is not its defect count. Cascade River Road: 10 routes, 1 bad. Suiattle:
// ~20, 1 flagged. Elbow Lake: 5, 1.
//
// Every fact written is copied from wa_little_sister_south_couloir, a sibling on the same road whose
// block is exemplary, and re-asserted at apply time. Nothing is researched into the catalog here.
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const SUBJECT = "wa_cinderella_peak_scramble";
const WITNESS = "wa_little_sister_south_couloir";

const EDITS = [
  { col: "road", key: "status",
    find: "Good gravel/paved forest road when open; check Mt. Baker-Snoqualmie NF alerts for washouts before driving.",
    repl: "CLOSED at milepost 7 by a washout, per a Mt. Baker-Snoqualmie National Forest alert dated 27 July 2026 — this blocks vehicle access to the Elbow Lake Trailhead, which is about 11 miles in. No reopening estimate has been published. Good gravel and paved forest road when open; check the forest's alerts page before driving." },
  { col: "access", key: "closures",
    find: "— check MBS National Forest road status before driving.",
    repl: "— and FR 38 is separately closed at milepost 7 by a washout, per a Forest Service alert dated 27 July 2026, which blocks vehicle access to the trailhead entirely. Check MBS National Forest road status before driving." },
];

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access", `id=in.(${SUBJECT},${WITNESS})`);
if (rows.length !== 2) { console.error(`read ${rows.length} of 2 routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const w = [byId[WITNESS].road && byId[WITNESS].road.status, byId[WITNESS].access && byId[WITNESS].access.closures]
  .filter(v => typeof v === "string").join(" ");
const wOk = /27 July 2026/.test(w) && /milepost 7|MP 7/i.test(w) && /elbow lake trailhead/i.test(w);
console.log(`${wOk ? "witness ok  " : "REFUSE      "}${WITNESS} — records the 27 July 2026 alert, MP 7 and the blocked trailhead`);
if (!wOk) { console.error("\nrefusing — the catalog no longer records the closure this copies"); process.exit(1); }

let ok = true;
const patches = new Map();
for (const e of EDITS) {
  const working = patches.get(e.col) || { ...byId[SUBJECT][e.col] };
  const cur = working[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (!/27 July 2026/.test(next)) { console.log(`REFUSE ${e.col}.${e.key} — result carries no alert date`); ok = false; continue; }
  working[e.key] = next;
  patches.set(e.col, working);
  console.log(`\n${SUBJECT}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
// The road.status must not still OPEN with a reassurance — that is the defect being repaired.
const st = (patches.get("road") || {}).status;
if (typeof st === "string" && /^Good /.test(st)) { console.log("REFUSE — road.status still opens by calling the road good"); ok = false; }

if (!ok) { console.error("\nrefusing to apply"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const [col, obj] of patches) await patchRow("routes", SUBJECT, { [col]: obj });

const after = await selectAll("routes", "id,road,access", `id=eq.${SUBJECT}`);
const a = after[0];
const bad = !/27 July 2026/.test((a.road || {}).status || "") || !/27 July 2026/.test((a.access || {}).closures || "");
console.log(bad ? `\nedit did not land` : `\nverified: ${SUBJECT} no longer calls a closed road good.`);
process.exit(bad ? 1 : 0);
