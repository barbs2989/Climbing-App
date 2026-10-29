// Offline half of enrich-approach-rappel-bivy's refusals for a thin descent/approach batch: the copy
// check against every listed source, and the ALL-CAPS check. Needs no database, so a batch can be
// cleared while production is down. The applier still re-runs both, and asserts area_id, at write time.
//   node scripts/oneoff/thin-da-offline-check.mjs <batch.json>...
import fs from "fs";
import { checkEntry } from "../lib/source-overlap.mjs";
import { shoutedStrings } from "../lib/shouted-prose.mjs";

let bad = 0;
for (const file of process.argv.slice(2)) {
  const batch = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [id, e] of Object.entries(batch)) {
    if (!e.set) continue;
    const r = await checkEntry({ review: e.review, ...e.set });
    for (const u of r.unread) console.log(`warn ${id} — could not read ${u}`);
    for (const h of r.hits) { bad++; console.log(`COPY ${id} ${h.path}: "${h.runs[0]}"`); }
    for (const s of shoutedStrings(e.set)) { bad++; console.log(`CAPS ${id} ${s.path}: ${s.fragments.slice(0, 4).join(" ")}`); }
  }
  console.log(`${file}: checked`);
}
process.exitCode = bad ? 1 : 0;
