// Magic Mountain South Ridge: null the three distances past Kool-Aid Lake. They were measured from the old 5.5 mi lake
//   (col 6.0, corkscrew 6.2, summit 6.4); with the lake at 5.9 (#2166) the col sits 0.1 mi past it for a 1,000 ft climb,
//   and the summit's 0.5 mi from the lake is shorter than the 0.55 mi straight line. No source states these legs, and
//   shifting each by 0.4 would be a computed value, so they go to null. Names, heights, coordinates and notes stay.
//   node scripts/oneoff/null-magic-past-lake-distances.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ID = "wa_magic_mountain_south_ridge", AREA = "wa_magic_mountain";
const PINS = { "Junction|Magic Mountain–Hurry-up Peak col": 6, "Hazard|Corkscrew ledges below false summit": 6.2, "Summit|Magic Mountain": 6.4 };
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/magic-past-lake-rollback.json", import.meta.url);

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&id=eq.${ID}`, { headers: headers(KEY) })).json())[0];

const row = await get();
if (!row || row.area_id !== AREA) throw new Error(`${ID}: not on ${AREA}`);
const lake = row.waypoints.find((w) => sig(w) === "Campsite|Kool-Aid Lake");
if (Number(lake?.distMi) !== 5.9) throw new Error(`Kool-Aid Lake is at ${lake?.distMi}, expected 5.9 (#2166 first)`);
const wp = structuredClone(row.waypoints), targets = Object.keys(PINS).map((s) => wp.find((w) => sig(w) === s));
if (targets.some((t) => !t)) throw new Error("a target pin is missing");
if (targets.every((t) => t.distMi == null)) { console.log("already applied"); process.exit(0); }
for (const t of targets) if (Number(t.distMi) !== PINS[sig(t)]) throw new Error(`${sig(t)} is at ${t.distMi}, expected ${PINS[sig(t)]}`);
for (const t of targets) t.distMi = null;
console.log(`plan ${ID}: ${Object.entries(PINS).map(([s, d]) => `${s} ${d} -> null`).join("; ")}`);
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify({ [ID]: { waypoints: row.waypoints } }, null, 1));
await patchRow("routes", ID, { waypoints: wp });
const re = (await get()).waypoints, good = Object.keys(PINS).every((s) => re.find((w) => sig(w) === s).distMi == null)
  && Number(re.find((w) => sig(w) === "Campsite|Kool-Aid Lake").distMi) === 5.9;
console.log(good ? "verified: re-read shows all three distances null, lake still 5.9" : "MISMATCH on re-read");
if (!good) process.exit(1);
