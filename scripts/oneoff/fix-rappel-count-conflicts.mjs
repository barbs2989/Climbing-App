// Three routes state a rappel count that contradicts their own rappel table. #687 put both
// on the same screen, so the contradiction is now visible in one glance.
//
// Only these three are actioned. A prose parser over the other 150 summaries proved
// unreliable — "Two ~200-ft rappels" reads as 200, "6 total: 3 rappels… 3 rappels" reads as
// 3 — so the audit is restricted to summaries that are a BARE INTEGER, where there is
// nothing to misparse. Of those, exactly three disagree with their table.
//
// In all three the table is the researched artifact and each row's own rappel_count_note
// already resolves the conflict in the table's favour:
//
//  wa_liberty_bell_nw_face   2 -> 3  note: "descent text describes 3 distinct rappels
//                                     (a short ~20ft lower plus two longer ones); the
//                                     metadata likely counts only the two main ones"
//                                     table: 5m + 55m + 30m
//  wa_liberty_crack          4 -> 2  note: "two rappels of roughly 25-30m … The four-rap
//                                     M&M Ledge/East-Face line is real but belongs to Thin
//                                     Red Line."  <- contamination from another route
//                                     table: 25m + 25m
//  wa_pernod_spire_standard  5 -> 3  note: "1 rappel off the true summit … then 2
//                                     double-rope rappels down that line" = 3
//                                     table: 65m + 30m + 30m
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const FIXES = [
  { id: "wa_liberty_bell_nw_face", from: "2", to: "3", tableRows: 3 },
  { id: "wa_liberty_crack", from: "4", to: "2", tableRows: 2 },
  { id: "wa_pernod_spire_standard", from: "5", to: "3", tableRows: 3 },
];
const APPLY = process.argv.includes("--apply");
const key = anonKey();
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,rappels,rappel_detail&id=eq.${id}`, { headers: headers(key) });
  return JSON.parse(await r.text())[0];
};

for (const f of FIXES) {
  const before = await get(f.id);
  if (!before) throw new Error(`${f.id} not in the live DB — refusing to write.`);
  const rows = (before.rappel_detail || []).length;
  // Guard both ends: the stale value must still be what we measured, and the table must
  // still hold the count we are adopting. Either drifting means re-audit, not write.
  if (String(before.rappels) !== f.from) throw new Error(`${f.id}: expected rappels ${JSON.stringify(f.from)}, found ${JSON.stringify(before.rappels)} — someone changed it.`);
  if (rows !== f.tableRows) throw new Error(`${f.id}: expected ${f.tableRows} table rows, found ${rows} — re-audit.`);
  console.log(`${f.id.padEnd(30)} rappels ${f.from} -> ${f.to}   (table has ${rows})`);
  if (!APPLY) continue;
  await patchRow("routes", f.id, { rappels: f.to }, { filter: "rappels=eq." + encodeURIComponent(f.from) });
  const after = await get(f.id);
  if (String(after.rappels) !== f.to) throw new Error(`${f.id}: read-back shows ${JSON.stringify(after.rappels)} — the write did not land.`);
  console.log(`  reconciled: now ${JSON.stringify(after.rappels)}`);
}
if (!APPLY) console.log("\ndry run — re-run with --apply to write.");
