// Mount Fairchild's pins 2-3 named Appleton Pass, a different trail (Sol Duc to Boulder Creek);
// the route's own text, a 2011 trip report and WTA's Bailey Range article all go Deer Lake - High
// Divide - Catwalk - Boston Charlie's. Replace them with Deer Lake at its GNIS coordinate
// (47.92666,-123.82380, the text's "Deer Lake (3.4 mi, ~3,527 ft)"). Rollback first, re-read.
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const ID = "wa_mount_fairchild_standard";
const key = requireServiceKey();
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=id,waypoints`, { headers: headers(key) })).json())[0];
const row = await get();
const w = row.waypoints;
if (w[2]?.name !== "Appleton Pass Trail junction" || w[3]?.name !== "Appleton Pass") throw new Error("live row differs; not writing");
fs.writeFileSync("scripts/rollback-fairchild-appleton-pins-2026-10-29.json", JSON.stringify(row, null, 1));
const deer = { ...w[1], type: "Water", name: "Deer Lake", lat: 47.92666, lng: -123.8238, elev: 3527 };
for (const k of ["note", "notes", "desc", "description"]) delete deer[k];
const next = [w[0], w[1], deer, ...w.slice(4)];
if (process.argv.includes("--dry")) { console.log(JSON.stringify(next.map(x => [x.type, x.name, x.lat, x.lng]))); process.exit(0); }
await patchRow("routes", ID, { waypoints: next }, { key });
const back = (await get()).waypoints;
console.log(back.length === next.length && back[2].name === "Deer Lake" ? "ok" : "RECONCILE FAIL", back.map(x => x.name).join(" | "));
