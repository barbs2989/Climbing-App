// wa_mount_cruiser_south_corner told a party a 50 m rope is "generally sufficient" for rappels its
// own table records at 25, 30 and 30 m. A rope doubled through an anchor reaches HALF its length, so
// 50 m reaches 25 m and comes up short at two of the three stations.
//
// THREE RECORDS IN THE SAME ROW REFUTE IT, which is what makes this a deletion rather than research:
//   * rappel_detail lengths          25, 30, 30 m
//   * rappel_detail[2].notes         "a single 60m rope used doubled covers all three rappel distances"
//   * gear                           "60 m rope (or two shorter ropes) for the rappel"
// 60 m doubled is exactly 30 m, so the row already carries the correct answer twice over. Only the
// `rappels` field disagrees, and it is the field phrased as advice.
//
// THE REPAIR IS A DELETION AND NOTHING ELSE. The false clause comes out; the true clause beside it
// ("the older Olympic Mountains climbing guide recommends two ropes") stays, and is promoted from a
// semicolon continuation to its own sentence, which is punctuation rather than composition. No rope
// size is chosen here and no sentence is written -- substituting "60" for "50" would be picking kit,
// and grafting the rappel_detail note into this field would be moving prose between records. A
// reader still meets the 60 m answer, in gear and in the station note, both untouched.
//
// Declared-state contract, as every applier in this audit: the exact find string must match EXACTLY
// ONCE, every premise is re-asserted against the live row at apply time, the write is verified by
// re-read, and a second run is a no-op.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_mount_cruiser_south_corner";
const FIND = " A single 50m (165 ft) rope with one intermediate station is generally sufficient; the older Olympic Mountains climbing guide recommends two ropes.";
const REPL = " The older Olympic Mountains climbing guide recommends two ropes.";

const DRY = !process.argv.includes("--apply");
requireServiceKey();

const rows = await selectAll("routes", "id,rappels,rappel_detail,gear", `id=eq.${ID}`, { pageSize: 5 });
if (rows.length !== 1) { console.error(`FAIL: expected exactly 1 row for ${ID}, got ${rows.length}`); process.exit(1); }
const r = rows[0];
const cur = String(r.rappels ?? "");

// --- idempotence: a second run must do nothing, and must say which state it found ----------------
if (cur.includes(REPL.trim()) && !cur.includes("50m (165 ft)")) {
  console.log("already applied — the false clause is gone and the guide's recommendation stands. No-op.");
  process.exit(0);
}

// --- re-assert every premise against the LIVE row ------------------------------------------------
const fail = m => { console.error("REFUSING: " + m); process.exit(1); };

const occurrences = cur.split(FIND).length - 1;
if (occurrences !== 1) fail(`the declared clause matches ${occurrences} times in \`rappels\`, not exactly once. The field has changed; re-read it before editing.`);

const stations = Array.isArray(r.rappel_detail) ? r.rappel_detail.map(d => Number(d && d.lengthM)) : [];
if (stations.length !== 3 || !stations.every(Number.isFinite)) fail(`expected 3 numeric stations, found ${JSON.stringify(stations)}. The premise that a 50 m rope falls short rests on them.`);
const over25 = stations.filter(s => s > 25);
if (!over25.length) fail(`no station exceeds the 25 m a 50 m rope reaches doubled — the claim being deleted would not be false. Stations: ${stations.join(", ")}`);

const notes = (r.rappel_detail || []).map(d => String(d && d.notes || "")).join(" ");
if (!/60\s?m rope used doubled covers all three/i.test(notes)) fail("the rappel_detail note naming a 60 m rope is gone. That note is one of the two records that make this a deletion rather than a judgement.");

const gear = (Array.isArray(r.gear) ? r.gear : []).join(" | ");
if (!/60\s?m rope/i.test(gear)) fail("the gear line naming a 60 m rope is gone. Without it the correct answer no longer reaches the reader and a bare deletion would leave the field silent on rope length.");

console.log(`route:    ${ID}`);
console.log(`stations: ${stations.join(", ")} m   (a 50 m rope doubled reaches 25 m; ${over25.length} station(s) exceed that)`);
console.log(`\nBEFORE: ${cur}`);
const next = cur.replace(FIND, REPL);
console.log(`\nAFTER:  ${next}`);

if (DRY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

await patchRow("routes", ID, { rappels: next });

// --- verify by re-read, never by the write's own status -----------------------------------------
const after = await selectAll("routes", "id,rappels", `id=eq.${ID}`, { pageSize: 5 });
const got = String(after[0]?.rappels ?? "");
if (got !== next) { console.error("FAIL: re-read does not match what was written."); process.exit(1); }
if (/50m \(165 ft\)/.test(got)) { console.error("FAIL: the false clause survives in the live row."); process.exit(1); }
console.log("\nverified by re-read: the 50 m claim is gone, the guide's two-rope recommendation stands.");
