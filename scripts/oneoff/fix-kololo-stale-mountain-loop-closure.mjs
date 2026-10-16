// wa_kololo_peaks_standard tells climbers the Mountain Loop Highway is blocked at MP 37.5. The
// catalog itself records that it REOPENED, in three other rows:
//
//   wa_indian_head_peak_southwest_slopes road.status
//     "Open (Mountain Loop Highway reopened mid-May 2026 after a landslide closure near milepost
//      37.5 that had blocked all access to FR 49 and the North Fork Sauk/Sloan Creek trails …)"
//   wa_painted_mountain_scramble road.driveNote
//     "…closed the Mountain Loop Highway at milepost 37.5 … from around December 2025 until
//      repairs reopened it in mid-May 2026"
//   wa_glacier_peak_kennedy_glacier road.driveNote
//     "…it was reported fully open for the season as of mid-May 2026"
//
// Three rows against one, and the reopening is the LATER claim — Kololo's own text dates itself to
// December 2025. This is not research: every fact written here is already in the catalog.
//
// NO NEW DATED CLOSURE IS ADDED. a-transient-closure-in-a-permanent-field-becomes-a-lie is exactly
// what produced this row; the replacement states a completed, dated PAST event plus the standing
// advice to verify, which does not rot the same way.
//
// Exact find -> replace, refused unless `find` matches EXACTLY ONCE in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_kololo_peaks_standard";

// Corroborating rows, re-asserted at apply time rather than trusted: if the catalog no longer
// records the reopening, this script has no basis and must refuse.
const WITNESSES = [
  { id: "wa_indian_head_peak_southwest_slopes", col: "road", key: "status", must: /reopened mid-May 2026/i },
  { id: "wa_painted_mountain_scramble", col: "road", key: "driveNote", must: /reopened it in mid-May 2026/i },
];

const EDITS = [
  { col: "road", key: "status",
    find: "Closed as of Dec 2025 - Mountain Loop Highway landslide at MP 37.5 blocks access to FR 49 and the North Fork Sauk Trailhead; verify current status before driving",
    repl: "Open — the Mountain Loop Highway landslide at MP 37.5 that blocked FR 49 and the North Fork Sauk Trailhead from December 2025 was repaired and the highway reopened in mid-May 2026; verify current status before driving" },
  { col: "access", key: "closures",
    find: "As of December 2025, a landslide closes the Mountain Loop Highway at milepost 37.5 (~15.5 mi south of Darrington), blocking all vehicle access to FR 49 and the North Fork Sauk/Sloan Creek trailheads - check Mount Baker-Snoqualmie NF alerts before planning the west approach.",
    repl: "A landslide closed the Mountain Loop Highway at milepost 37.5 (~15.5 mi south of Darrington) from December 2025, blocking vehicle access to FR 49 and the North Fork Sauk/Sloan Creek trailheads; repairs reopened the highway in mid-May 2026. Check Mount Baker-Snoqualmie NF alerts before planning the west approach." },
];

if (APPLY) requireServiceKey();

const ids = [ID, ...WITNESSES.map(w => w.id)];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const w of WITNESSES) {
  const v = byId[w.id] && byId[w.id][w.col] && byId[w.id][w.col][w.key];
  if (typeof v !== "string" || !w.must.test(v)) { console.log(`REFUSE — witness ${w.id} ${w.col}.${w.key} no longer records the reopening`); ok = false; }
  else console.log(`witness ok  ${w.id} ${w.col}.${w.key}`);
}
if (!ok) process.exit(1);

const subject = byId[ID];
const patches = new Map();
for (const e of EDITS) {
  const working = patches.get(e.col) || { ...subject[e.col] };
  const cur = working[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.col}.${e.key} — find matched ${hits}x, expected exactly 1`); ok = false; continue; }
  working[e.key] = cur.replace(e.find, e.repl);
  patches.set(e.col, working);
  console.log(`\n${ID}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${working[e.key]}`);
}
if (!ok) { console.error("\nrefusing to apply"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const [col, obj] of patches) await patchRow("routes", ID, { [col]: obj });

const after = await selectAll("routes", "id,road,access", `id=eq.${ID}`);
const a = after[0];
const still = [a.road && a.road.status, a.access && a.access.closures]
  .filter(v => typeof v === "string" && /blocks? access|closes the Mountain Loop|Closed as of Dec 2025/i.test(v));
console.log(still.length ? `\nSTILL CLAIMS A CURRENT CLOSURE — not clean` : `\nverified: ${ID} no longer asserts the MP 37.5 closure is in force.`);
process.exit(still.length ? 1 : 0);
