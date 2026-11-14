// Write the 2026-10-29 RE-CHECK of the dated road closures in drive lines (closure-recheck.json).
// --dry by default; pass --apply to write.
//
// Same rails as apply-direction-corrections.mjs, but keyed on the exact OLD TEXT as it stands live
// today rather than on an existing.json index (several of these texts were written after that
// snapshot): one narrow server-side read of the drive lines that mention a closure finds the rows,
// each row is compare-and-swapped on the exact old text, paced, and re-read to reconcile.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, requireServiceKey, selectAll } from "../../lib/supabase-env.mjs";
import { trailheadDirectionProblem } from "../../../lib/trailheadDirectionShape.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
if (APPLY) requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(path.join(here, "closure-recheck.json"), "utf8"));
const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", "")).sort();
const SOURCE_RE = /\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger|wta|wtahikers|onx)\b|\bper (a|the) /i;

let refused = 0;
for (const x of fixes) {
  const why = JSON.stringify(nums(x.text)) !== JSON.stringify([...new Set(x.numbersUsed)].sort()) ? "numbers do not match numbersUsed " + JSON.stringify(nums(x.text))
    : SOURCE_RE.test(x.text) ? "a source is named in the text" : trailheadDirectionProblem(x.text);
  if (why) { refused++; console.log("REFUSE " + x.road + " — " + why); x.refused = true; }
}
const rows = await selectAll("routes", "id,dir:approach_logistics->>trailheadDirection",
  "id=like.wa_*&approach_logistics->>trailheadDirection=ilike.*clos*", { pageSize: 1000 });
const live = new Map();
for (const r of rows) { const a = live.get(r.dir) || []; a.push(r.id); live.set(r.dir, a); }
for (const x of fixes) { x.ids = live.get(x.old) || []; console.log(`${x.refused ? "skip" : "fix "} ${x.road}: ${x.ids.length} route(s) ${x.ids.join(", ")}`); if (!x.ids.length) console.log("   (no live row holds the old text)"); }
if (!APPLY || refused) process.exit(refused ? 1 : 0);

const read = async (ids) => selectAll("routes", "id,approach_logistics", `id=in.(${ids.map(encodeURIComponent).join(",")})`);
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let written = 0, moved = 0, bad = 0;
for (const x of fixes) {
  if (!x.ids.length) continue;
  for (const r of await read(x.ids)) {
    if (r.approach_logistics?.trailheadDirection !== x.old) { moved++; console.log("  skip " + r.id + " — its text changed since the read"); continue; }
    for (let attempt = 0; ; attempt++) {
      try { await patchRow("routes", r.id, { approach_logistics: Object.assign({}, r.approach_logistics, { trailheadDirection: x.text }) }); written++; break; }
      catch (err) {
        const timeout = /57014|timeout|timed out|503|504/i.test(String(err.message));
        if (!timeout || attempt >= 1) { console.error("STOP at " + r.id + ": " + err.message); process.exit(1); }
        console.error("timeout at " + r.id + " — backing off 60 s"); await sleep(60000);
      }
    }
    await sleep(1000);
  }
  for (const r of await read(x.ids)) if (r.approach_logistics?.trailheadDirection !== x.text) { bad++; console.error("NOT LANDED: " + r.id); }
}
console.log("written " + written + ", skipped as changed " + moved + ", not landed " + bad);
if (bad) process.exit(1);
