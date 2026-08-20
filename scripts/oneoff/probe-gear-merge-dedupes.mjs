// Does merging what_to_bring into the standard kit actually remove the duplicates, and does
// it remove anything it should not?
//
// The three functions are EXTRACTED from RouteDetail.jsx rather than copied here. A copy
// would agree with the source on the day it was written and measure a fossil ever after —
// and the whole question is whether the real merge behaves. ANCHOR LOST if any of them is
// renamed, so this cannot quietly measure nothing.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");

// Balance braces over raw source from the declaration onwards.
function lift(name) {
  const at = src.indexOf(`function ${name}(`);
  if (at < 0) throw new Error(`ANCHOR LOST: function ${name}( is not in RouteDetail.jsx — this probe measured nothing`);
  let i = src.indexOf("{", at), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) throw new Error(`ANCHOR LOST: could not balance ${name}`);
  return src.slice(at, end);
}

const mod = new Function(`${lift("gearKey")}\n${lift("sameGear")}\n${lift("mergeGearList")}\nreturn {gearKey,sameGear,mergeGearList};`)();
const { gearKey, mergeGearList } = mod;

// The stock lists, lifted the same way rather than retyped.
const dm = src.match(/const DISC_ASSUMED=(\{[\s\S]*?\});/);
if (!dm) throw new Error("ANCHOR LOST: const DISC_ASSUMED= is gone");
const DISC_ASSUMED = new Function(`return ${dm[1]};`)();

// --- 1. the unit cases the merge exists for -------------------------------------------
let bad = 0;
const eq = (label, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { console.log(`  MISMATCH ${label}\n     got  ${g}\n     want ${w}`); bad++; } else console.log(`  ok  ${label}`); };

console.log("\n--- keys collapse the qualifier, not the item ---");
for (const [a, b] of [
  ["Crampons", "Crampons (early/mid-season or lingering-snow years)"],
  ["Ice axe", "ice axe (early season)"],
  ["Navigation", "navigation (map/gps)"],
  ["Helmet", "Helmet — rock at this new crag is still loose/sharp in places"],
  ["Rope", "ropes"],
]) {
  const same = gearKey(a) === gearKey(b) || mod.sameGear(gearKey(a), gearKey(b));
  console.log(`  ${same ? "ok " : "MISS"}  "${a}"  ==  "${b}"   (${gearKey(a)} | ${gearKey(b)})`);
  if (!same) bad++;
}

console.log("\n--- and do NOT collapse genuinely different gear ---");
for (const [a, b] of [["Ice axe", "Ice tools"], ["Helmet", "Harness"], ["Warm layers", "Weatherproof shell jacket and pants"], ["Chalk", "Crampons"]]) {
  const same = gearKey(a) === gearKey(b) || mod.sameGear(gearKey(a), gearKey(b));
  console.log(`  ${same ? "WRONGLY MERGED" : "ok "}  "${a}"  vs  "${b}"`);
  if (same) bad++;
}

console.log("\n--- the conditional block keeps sole ownership of its items ---");
{
  const out = mergeGearList(["Helmet", "Harness"], ["Crampons (early season)", "Helmet", "Light 30m rope"], ["Crampons"]);
  eq("crampons stay in the conditional block only", out, ["Helmet", "Harness", "Light 30m rope"]);
}

console.log("\n--- a route entry replaces the stock wording IN PLACE ---");
{
  const out = mergeGearList(["Rope", "Helmet"], ["Light 30m rope for the crux slot"], []);
  eq("richer text wins, position kept", out, ["Light 30m rope for the crux slot", "Helmet"]);
}

// --- 2. against the live catalog --------------------------------------------------------
const k = anonKey();
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,what_to_bring&what_to_bring=not.is.null&id=like.wa_*&limit=600`,
  { headers: headers(k) }
);
if (!res.ok) { console.error(`\nFAIL — DB read ${res.status}; the catalog half measured nothing`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.error("\nFAIL — 0 rows with what_to_bring; a clean answer would be vacuous"); process.exit(1); }

let beforeTotal = 0, afterTotal = 0, routesWithDupes = 0, lost = 0;
const examples = [];
for (const r of rows) {
  const disc = String(r.discipline || "").toLowerCase();
  const assumed = (DISC_ASSUMED[disc] || DISC_ASSUMED.alpine || []).concat(["First aid kit"]);
  const wb = Array.isArray(r.what_to_bring) ? r.what_to_bring.filter(Boolean) : [];
  if (!wb.length) continue;
  const before = assumed.length + wb.length;      // what the two sections printed between them
  const after = mergeGearList(assumed, wb, []).length;
  beforeTotal += before; afterTotal += after;
  if (after < before) { routesWithDupes++; if (examples.length < 6) examples.push({ id: r.id, before, after, wb }); }
  // Nothing may vanish outright: every merged list must be at least as long as the stock kit.
  if (after < assumed.length) { console.log(`  LOST GEAR on ${r.id}: ${after} < stock ${assumed.length}`); lost++; bad++; }
}
console.log(`\n--- live catalog: ${rows.length} WA routes carrying what_to_bring ---`);
console.log(`  lines printed before the merge: ${beforeTotal}`);
console.log(`  lines printed after:            ${afterTotal}   (${beforeTotal - afterTotal} duplicate lines removed)`);
console.log(`  routes that had at least one duplicate: ${routesWithDupes} of ${rows.length}`);
console.log(`  routes where the merge dropped a stock item: ${lost}`);
for (const e of examples) console.log(`   e.g. ${e.id}: ${e.before} → ${e.after}   [${e.wb.slice(0, 4).join(" | ")}]`);

console.log(bad ? `\n${bad} problem(s).` : "\nok — the merge removes duplicates and loses no gear.");
process.exit(bad ? 1 : 0);
