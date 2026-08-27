// BOTH APPROACHES TO THESE PEAKS ARE CLOSED, AND THREE ROWS SAY ONE OF THEM IS OPEN.
//
// Bonanza, North Star and Copper are reached either from the east — Lake Chelan ferry to Lucerne,
// then FSR 8301 to Holden Village — or from the west over Spider Gap from the Phelps Creek /
// Trinity trailheads. Both are shut, under two different orders:
//
//   east:  #06-17-05-26-04, FSR 8301 from the Lucerne commercial dock, 28 Jan 2026 - 31 Dec 2027
//   west:  #06-17-07-2026-11, FR 6200 at milepost 18.2 past Atkinson Flat, 20 May 2026 - 31 Dec 2027
//
// The catalog records both, accurately, on different routes — and three rows respond to the east
// closure by sending parties west as though the west were open:
//
//   wa_north_star_mountain_east_route          "the practical current approach is via the Phelps
//                                               Creek Trailhead over Spider Gap instead"
//   wa_north_star_mountain_cloudy_peak_traverse "reach via the west (Phelps Creek/Spider Gap)
//                                               approach instead"
//   wa_copper_peak_south_route                  "the Spider Gap cross-country alternative ... is the
//                                               ONLY current access option"
//
// This is the wa_forbidden_peak_east_ridge defect one step worse. There the row said you could drive
// somewhere you could not; here the row is the party's FALLBACK, offered precisely because the first
// choice failed, and it is presented as the thing that still works.
//
// NOTHING HERE COULD SEE IT. Both halves are populated, plausible, self-limiting and rendered, and
// each is CORRECT ON ITS OWN ROW — the contradiction is between two routes about two different
// roads, which is a pair no audit in this repo forms. audit:trailhead-road clusters by trailhead and
// by milepost, so two roads in two drainages never meet.
//
// THE ALTERNATIVE IS NOT DELETED. Spider Gap is genuinely how a party reaches these peaks without
// Holden; what is wrong is presenting it as a drive-to start. The rows now say the west road is
// gated too, and where they claimed it was "the only current access option" they no longer claim
// anything is open.
//
// Every fact written here is copied from the catalog's own rows and re-asserted at apply time — no
// order number, milepost or date is typed that some other route does not already record.
// [[a-transient-closure-in-a-permanent-field-becomes-a-lie]]
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

/* The west-side closure, quoted from rows that are not being edited. Split by what each evidences,
   the correction the FR 6200 applier had to make. */
const WITNESSES = [
  { id: "wa_carne_mountain_trail_route", col: "road", key: "status", needs: "the FR 6200 gate at milepost 18.2",
    re: /milepost 18\.2/i },
  { id: "wa_carne_mountain_trail_route", col: "road", key: "status", needs: "the west-side order number",
    re: /06-17-07-2026-11/ },
  { id: "wa_cloudy_peak_southwest_slopes", col: "road", key: "status", needs: "that the gate cuts off Phelps Creek",
    re: /phelps creek/i },
];

/* A standalone SENTENCE, not a clause. The first draft spliced it into each host with "— but ...",
   which produced a comma splice in one row and a doubled dash in another: the inserted text has to
   read as prose on a route page, not as a patch. */
const WEST = "That is not a drive-to alternative either: FR 6200 is gated at milepost 18.2 past Atkinson Flat under USFS order #06-17-07-2026-11, cutting off both the Phelps Creek and Trinity trailheads, so the Spider Gap approach itself now begins with several miles of closed road.";

const EDITS = [
  { id: "wa_north_star_mountain_east_route", col: "road", key: "driveNote",
    find: "so the practical current approach is via the Phelps Creek Trailhead over Spider Gap instead.",
    repl: `so the remaining line is the Phelps Creek Trailhead over Spider Gap. ${WEST}` },

  { id: "wa_north_star_mountain_cloudy_peak_traverse", col: "access", key: "closures",
    find: "reach via the west (Phelps Creek/Spider Gap) approach instead.",
    repl: `the west (Phelps Creek/Spider Gap) approach is the remaining line. ${WEST}` },

  { id: "wa_copper_peak_south_route", col: "road", key: "seasonalGate",
    find: "the Spider Gap cross-country alternative from the Phelps Creek/Trinity trailhead is the only current access option (itself snow-covered/avalanche-prone outside summer-fall).",
    repl: `the Spider Gap cross-country route from the Phelps Creek/Trinity trailhead is the only remaining line, and it is snow-covered and avalanche-prone outside summer and fall. ${WEST}` },
];

if (APPLY) requireServiceKey();

const ids = [...new Set([...EDITS.map(e => e.id), ...WITNESSES.map(w => w.id)])];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const w of WITNESSES) {
  const v = byId[w.id] && byId[w.id][w.col] && byId[w.id][w.col][w.key];
  const good = typeof v === "string" && w.re.test(v);
  console.log(`${good ? "witness ok  " : "REFUSE      "}${w.id} ${w.col}.${w.key} — records ${w.needs}`);
  if (!good) ok = false;
}
if (!ok) { console.error("\nrefusing — the catalog no longer records the west-side closure this relies on"); process.exit(1); }

const patches = new Map();
for (const e of EDITS) {
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...byId[e.id][e.col] } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  // The result must actually carry the west-side gate, and must no longer offer the trailhead as
  // something you reach by car.
  if (!/milepost 18\.2/.test(next)) { console.log(`REFUSE ${e.id} — result does not state the west-side gate`); ok = false; continue; }
  if (/only current access option/i.test(next)) { console.log(`REFUSE ${e.id} — result still claims something is open`); ok = false; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
console.log(`\n${EDITS.length} edit(s) across ${patches.size} row-object(s)`);
if (!ok) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road,access", `id=in.(${EDITS.map(e => e.id).join(",")})`);
let bad = 0;
for (const e of EDITS) {
  const r = after.find(x => x.id === e.id);
  const v = r && r[e.col] && r[e.col][e.key];
  if (typeof v !== "string" || !/milepost 18\.2/.test(v)) { console.log(`NOT WRITTEN  ${e.id} ${e.col}.${e.key}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: no row now offers Spider Gap as a drive-to alternative.`);
process.exit(bad ? 1 : 0);
