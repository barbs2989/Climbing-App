// Row fixes found during the 2026-11-11 trip-plan research (owner: "do 1"). Only fixes the row's OWN
// data proves; nothing here comes from a source alone.
//   high_point_ft null on a summit route whose sibling routes on the same peak all store one value:
//     wa_cannon_mountain_northwest_ridge -> 8638 (South Slopes, NE Ridge and its own summit pin say 8638)
//     wa_old_guard_peak_east_side_route  -> 8260 (West Side route says 8260; peak area 8260)
//   wa_cannon_mountain_northwest_ridge's summit pin was named "(NE Ridge route point)" on the NW Ridge row.
// Not fixed, on purpose: gain_ft "shortfalls" (gain_ft is APPROACH gain; pins minus pitches agree, and a
// gain repair needs a source - docs/guards/planner-and-rappels.md), dist_km conventions (never normalised
// in bulk - route-identity.md), and ids that name the wrong peak (ids are never renamed; the area is right).
// Guards: the current value must still be what was read (null / the old pin name), a before-file is
// written, patchRow throws unless exactly one row changed, every row is re-read. Dry run by default.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
// jsonb reorders object keys, so compare with keys sorted.
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const OLD_PIN = "Cannon Mountain summit (NE Ridge route point)";
const read = async (id) => {
  const r = await fetch(SUPABASE_URL + "/rest/v1/routes?select=id,area_id,high_point_ft,waypoints&id=eq." + id, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status);
  const [x] = await r.json(); if (!x) throw new Error("no row " + id); return x;
};

const fixes = [];
const cannon = await read("wa_cannon_mountain_northwest_ridge");
const old = await read("wa_old_guard_peak_east_side_route");
const before = { [cannon.id]: { high_point_ft: cannon.high_point_ft, waypoints: cannon.waypoints }, [old.id]: { high_point_ft: old.high_point_ft } };

if (cannon.area_id !== "wa_cannon_mountain") throw new Error("cannon row moved");
if (old.area_id !== "wa_old_guard_peak") throw new Error("old guard row moved");
const pins = (cannon.waypoints || []).map((w) => ({ ...w }));
const pin = pins.find((w) => w.name === OLD_PIN);
const cannonPatch = {};
if (cannon.high_point_ft == null) cannonPatch.high_point_ft = 8638; else console.log("cannon high_point_ft already " + cannon.high_point_ft + "; left");
if (pin) { pin.name = "Cannon Mountain summit"; cannonPatch.waypoints = pins; } else console.log("cannon pin name already changed; left");
if (Object.keys(cannonPatch).length) fixes.push({ id: cannon.id, patch: cannonPatch });
if (old.high_point_ft == null) fixes.push({ id: old.id, patch: { high_point_ft: 8260 } }); else console.log("old guard high_point_ft already " + old.high_point_ft + "; left");

for (const f of fixes) console.log(f.id, Object.keys(f.patch).map((k) => k + (k === "waypoints" ? " (summit pin renamed)" : " = " + f.patch[k])).join(", "));
if (!APPLY) { console.log("dry run; --apply to write"); process.exit(0); }

fs.writeFileSync("research-data/route-row-fixes-2026-11-11-before.json", JSON.stringify(before, null, 1));
for (const f of fixes) await patchRow("routes", f.id, f.patch);
let bad = 0;
for (const f of fixes) {
  const now = await read(f.id);
  for (const [k, v] of Object.entries(f.patch)) if (JSON.stringify(canon(now[k])) !== JSON.stringify(canon(v))) { bad++; console.error("MISMATCH " + f.id + " " + k); }
}
console.log("wrote " + fixes.length + ", re-read " + (bad ? bad + " mismatches" : "matching"));
if (bad) process.exit(1);
