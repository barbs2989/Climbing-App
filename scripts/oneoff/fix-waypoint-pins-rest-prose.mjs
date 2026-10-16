// Prose that states the height a waypoint repair (audits/waypoint-pins-rest) just corrected, so the
// page would contradict its own pin. Each replacement is an exact substring that must occur once.
//   Snowgrass Flat: 6,400 -> 5,800 (WTA "Highest Point 5,800 feet" for the Snowgrass Flat hike; GNIS
//     ground 5,813). 6,400 is the PCT high point beyond it.
//   Azurite Mine: 5,900 -> 4,440 (WA DNR OFR 2002-3: the Wenatchee tunnel "main haulage level at an
//     elevation of 4440 feet"; ground at the mine 4,442).
//   node scripts/oneoff/fix-waypoint-pins-rest-prose.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/prose-rollback.json", import.meta.url);
const EDITS = [
  { id: "wa_old_snowy_mountain_r1", col: "approach", from: "(~3.9-4 miles, ~6,400 ft)", to: "(~3.9-4 miles, ~5,800 ft)" },
  { id: "wa_old_snowy_mountain_r1", col: "approach_variants", at: [0, "notes"], from: "about 3.9-4 miles and 6,400 ft", to: "about 3.9-4 miles and 5,800 ft" },
  { id: "wa_mount_ballard_south", col: "approach_variants", at: [0, "baseFinding"], from: "old Azurite Mine site around 5,900 ft", to: "old Azurite Mine site around 4,440 ft" },
];
const get = async (id, cols) => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols}&id=eq.${id}`, { headers: headers(KEY) })).json())[0];

const patches = {}, rb = {};
for (const e of EDITS) {
  const row = await get(e.id, e.col);
  const val = patches[e.id]?.[e.col] ?? structuredClone(row[e.col]);
  rb[e.id] ??= {}; rb[e.id][e.col] ??= row[e.col];
  let holder = val, key = null;
  if (e.at) { for (const k of e.at.slice(0, -1)) holder = holder[k]; key = e.at.at(-1); }
  const s = e.at ? holder[key] : val;
  const n = s.split(e.from).length - 1;
  if (n !== 1) { if (s.includes(e.to)) { console.log(`  already applied: ${e.id}.${e.col}`); continue; } throw new Error(`${e.id}.${e.col}: "${e.from}" occurs ${n} times`); }
  const out = s.replace(e.from, e.to);
  if (e.at) holder[key] = out;
  (patches[e.id] ??= {})[e.col] = e.at ? val : out;
  console.log(`  plan ${e.id}.${e.col}${e.at ? "[" + e.at.join(".") + "]" : ""}: "${e.from}" -> "${e.to}"`);
}
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }
if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify(rb, null, 1));
for (const [id, p] of Object.entries(patches)) await patchRow("routes", id, p);
let ok = 0, want = 0;
for (const e of EDITS) { want++; const r = await get(e.id, e.col); if (JSON.stringify(r[e.col]).includes(e.to.replace(/"/g, '\\"'))) ok++; else console.log(`  MISMATCH ${e.id}.${e.col}`); }
console.log(`verified: ${ok} of ${want} edits re-read.`);
