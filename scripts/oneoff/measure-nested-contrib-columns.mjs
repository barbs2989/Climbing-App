// The last three uncorrectable route facts: climate, seasonal_hazards, sling_rack.
//
// All three are nested or polymorphic, which is why they were left until last. The question for
// each is the same one the rest of this sweep answered from the data rather than by taste: is
// there a flat set of keys a climber can actually fill in, and are any of them enumerable?
//
// It matters for the consensus loop, not for tidiness. The merge gate needs three contributors in
// ONE cluster, so a picker or a number is reachable and free prose is not.
//
// sling_rack is the one with a trap already recorded: fmtSlingRack returns NULL for a plain
// string, so a text box there would be contributable and render nothing — the very defect this
// sweep exists to remove. What it accepts is measured here rather than assumed.

import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,climate,seasonal_hazards,sling_rack", "", { pageSize: 1000 });
if (!rows.length) { console.error("empty read."); process.exit(1); }
console.log(`${rows.length} routes read\n`);

function shape(name, pick) {
  const vals = rows.map(pick).filter((v) => v != null && !(typeof v === "string" && !v.trim()));
  console.log(`=== ${name}: ${vals.length} populated`);
  if (!vals.length) { console.log("   nothing stored\n"); return []; }
  const types = {};
  for (const v of vals) types[Array.isArray(v) ? "array" : typeof v] = (types[Array.isArray(v) ? "array" : typeof v] || 0) + 1;
  console.log("   JS types:", JSON.stringify(types));
  const keyCount = {};
  for (const v of vals) {
    if (Array.isArray(v)) { for (const el of v) if (el && typeof el === "object") for (const k of Object.keys(el)) keyCount["[]." + k] = (keyCount["[]." + k] || 0) + 1; }
    else if (v && typeof v === "object") for (const k of Object.keys(v)) keyCount[k] = (keyCount[k] || 0) + 1;
  }
  const ks = Object.entries(keyCount).sort((a, b) => b[1] - a[1]);
  for (const [k, n] of ks.slice(0, 12)) console.log(`   ${String(n).padStart(5)}x  ${k}`);
  return vals;
}

const cl = shape("climate", (r) => r.climate);
// climate nests under bySeason on some rows and at the top level on others — the reader does
// `cl[k] || _bs[k]`, so both spellings are live and a form must not pick one blindly.
const seasonKeys = {};
for (const v of cl) {
  const bs = (v && v.bySeason && typeof v.bySeason === "object") ? v.bySeason : {};
  for (const k of Object.keys(bs)) seasonKeys["bySeason." + k] = (seasonKeys["bySeason." + k] || 0) + 1;
}
if (Object.keys(seasonKeys).length) {
  console.log("   nested under bySeason:");
  for (const [k, n] of Object.entries(seasonKeys).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${String(n).padStart(5)}x  ${k}`);
  const ex = cl.find((v) => v && v.bySeason && Object.values(v.bySeason)[0]);
  if (ex) console.log("   a bySeason value looks like:", JSON.stringify(Object.values(ex.bySeason)[0]).slice(0, 160));
}
console.log();

const sh = shape("seasonal_hazards", (r) => r.seasonal_hazards);
const avy = sh.map((v) => v && v.avalanche).filter(Boolean);
console.log(`   avalanche present on ${avy.length}; example:`, JSON.stringify(avy[0] || null).slice(0, 220));
console.log();

const sr = shape("sling_rack", (r) => r.sling_rack);
console.log("   examples:");
for (const v of sr.slice(0, 5)) console.log("     " + JSON.stringify(v).slice(0, 150));
