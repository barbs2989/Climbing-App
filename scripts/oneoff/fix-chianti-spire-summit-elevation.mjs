// Chianti Spire is stored at 8,459 ft and nothing agrees with that number.
//
// THE EVIDENCE, and note that no two lines of it share a source:
//   * the routes' OWN summit pins say 8,400 (twice) and 8,420 (once) — never 8,459
//   * the gain arithmetic is coherent with the PIN, not the column: wa_chianti_spire_lichen_bouquet
//     and _north_face both store gain_ft 4450, and 8400 - 4250 + the row's own stated 300 ft
//     re-gain is exactly 4450. Against 8459 it does not come out.
//   * every external figure found agrees with the pin — MP 8,400; SummitPost ~8,400;
//     ListsOfJohn 8,420; a trip report 8,380. Nothing gives 8,459.
//
// WHY THE PEAK MOVES TOO, and why this was not done as a row repair when it was first found:
// `areas.elevation_ft` for Chianti Spire ALSO reads 8459. Correcting only the three routes would
// leave the peak record asserting a fourth number and put two answers on one screen — the
// [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape this repo keeps
// recording. Deciding it means deciding the PEAK's height, which is a record every future route on
// it inherits, so it needed the nod it now has.
//
// 8,400 rather than 8,420: it is what two of the three pins say and what the two strongest external
// sources say, and it is the value the gain arithmetic reproduces exactly.
//
// THE 8,420 PIN IS DELIBERATELY LEFT. A 20 ft spread is below what the terrain data can resolve —
// this repo already records that "a spread below the instrument is a CONSISTENCY defect, not an
// ACCURACY one", and asking the DEM would be worse than useless here: a 10 m grid cannot see the
// top of a spire, so it would answer low with total confidence. That is a separate question about
// which record wins, not this one.
//
// Declared-state contract: every current value is declared and the run REFUSES if any has moved.
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const WAS = 8459, NOW = 8400;

const ROUTES = ["wa_chianti_spire_east_face", "wa_chianti_spire_lichen_bouquet", "wa_chianti_spire_north_face"];
const AREA = "wa_chianti_spire";

const KEY = APPLY ? requireServiceKey() : anonKey();
const rUrl = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ROUTES.join(",")})&select=id,name,high_point_ft`;
const aUrl = `${SUPABASE_URL}/rest/v1/areas?id=eq.${AREA}&select=id,name,elevation_ft`;

const [rq, aq] = await Promise.all([fetch(rUrl, { headers: headers(KEY) }), fetch(aUrl, { headers: headers(KEY) })]);
if (!rq.ok || !aq.ok) { console.error(`read failed: routes ${rq.status}, areas ${aq.status}`); process.exit(1); }
const rows = await rq.json(), areas = await aq.json();

const refusals = [];
if (rows.length !== ROUTES.length) refusals.push(`read returned ${rows.length} route(s) for ${ROUTES.length} id(s)`);
if (areas.length !== 1) refusals.push(`read returned ${areas.length} area(s), expected 1`);
for (const r of rows) if (r.high_point_ft !== WAS) refusals.push(`${r.id}: high_point_ft is ${r.high_point_ft}, declaration expects ${WAS}`);
for (const a of areas) if (a.elevation_ft !== WAS) refusals.push(`${a.id}: elevation_ft is ${a.elevation_ft}, declaration expects ${WAS}`);
if (refusals.length) {
  console.error(`REFUSED - the records have MOVED:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read before changing the declaration.");
  process.exit(1);
}

console.log(`peak  ${AREA}  elevation_ft  ${WAS} -> ${NOW}`);
for (const r of rows) console.log(`route ${r.id.padEnd(34)} high_point_ft ${WAS} -> ${NOW}   (${r.name})`);
console.log(`\n4 record(s); the peak and every route on it move TOGETHER, so no screen is left with two answers.`);
if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

await patchRow("areas", AREA, { elevation_ft: NOW });
for (const r of rows) await patchRow("routes", r.id, { high_point_ft: NOW });
console.log("\nwrote 4 record(s).");

// Verify by re-reading: a 200 is not evidence the data changed.
const [rv, av] = await Promise.all([fetch(rUrl, { headers: headers(KEY) }), fetch(aUrl, { headers: headers(KEY) })]);
const after = await rv.json(), aAfter = await av.json();
let bad = 0;
for (const r of after) if (r.high_point_ft !== NOW) { console.error(`NOT APPLIED: ${r.id} reads ${r.high_point_ft}`); bad++; }
for (const a of aAfter) if (a.elevation_ft !== NOW) { console.error(`NOT APPLIED: ${a.id} reads ${a.elevation_ft}`); bad++; }
console.log(bad ? `\nVERIFY FAILED: ${bad} record(s) did not land.`
                : `\nverified: the peak and all three routes re-read at ${NOW} ft — one answer, four records.`);
process.exit(bad ? 1 : 0);
