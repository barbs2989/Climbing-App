// Null two pin distances audit:waypoint-distances proves impossible and no source states.
//   wa_east_face_6, "PCT Junction near Lemah Meadows" 5.3 mi: 0.8 mi from Pete Lake, 1.2 mi apart in a straight line. 5.3
//     is USFS's "4 miles to Pete Lake" + "1.3 miles to a junction with Lemah Meadow Trail #1323.2" — the Lemah Meadow Trail
//     junction, not the PCT, which WTA puts a further "0.9 mile" on. No source states trailhead -> PCT as one figure.
//   wa_lena_lake_to_mt_stone_traverse, "St. Peter's Gate" 10.3 mi: 1.8 mi from Scout Pass, 2.2 mi apart. No source states
//     this leg; a 2024 party had walked 10.5 mi and camped short of the Gate.
//   Coordinates, heights and notes stay; only distMi goes to null.
//   node scripts/oneoff/null-two-impossible-leg-distances.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const FIX = [
  { id: "wa_east_face_6", area: "wa_chimney_rock", pin: "Junction|PCT Junction near Lemah Meadows", old: 5.3 },
  { id: "wa_lena_lake_to_mt_stone_traverse", area: "wa_mount_stone", pin: "Junction|St. Peter's Gate", old: 10.3 },
];
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/two-legs-rollback.json", import.meta.url);

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const hav = (a, b) => { const R = 3958.7613, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
// The audit:waypoint-distances test, as fix-magic-kool-aid-distance.mjs runs it.
function impossible(w) {
  const d = w.map((x) => (x && x.distMi != null ? Number(x.distMi) : null)), bad = new Set();
  const ok = (x) => x && x.lat != null && x.lng != null;
  if (!ok(w[0]) || d[0] !== 0) return bad;
  for (let i = 1; i < w.length; i++) {
    if (!Number.isFinite(d[i]) || d[i] === 0 || !ok(w[i])) continue;
    const fromTh = hav(w[0], w[i]) - d[i];
    let leg = -Infinity, j0 = -1;
    for (let j = i - 1; j >= 0; j--) { if (!Number.isFinite(d[j]) || (j > 0 && d[j] === 0) || !ok(w[j])) continue; leg = hav(w[j], w[i]) - (d[i] - d[j]); j0 = j; break; }
    const useLeg = leg > fromTh, short = useLeg ? leg : fromTh, stored = useLeg ? d[i] - d[j0] : d[i];
    if (short > 0.25 && short > Math.max(stored, 0) * 0.1) bad.add(sig(w[i]));
  }
  return bad;
}
const get = async (id) => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&id=eq.${id}`, { headers: headers(KEY) })).json())[0];

const plans = [];
for (const f of FIX) {
  const row = await get(f.id);
  if (!row || row.area_id !== f.area) throw new Error(`${f.id}: not on ${f.area}`);
  const wp = structuredClone(row.waypoints), pin = wp.find((w) => sig(w) === f.pin);
  if (!pin) throw new Error(`${f.id}: ${f.pin} not found`);
  if (pin.distMi == null) { console.log(`${f.id}: already applied`); continue; }
  if (Number(pin.distMi) !== f.old) throw new Error(`${f.id}: ${f.pin} is at ${pin.distMi}, expected ${f.old}`);
  const before = impossible(row.waypoints);
  pin.distMi = null;
  const after = impossible(wp), added = [...after].filter((s) => !before.has(s));
  console.log(`${f.id}: impossible before: ${[...before].join(", ") || "none"}; after: ${[...after].join(", ") || "none"}`);
  if (added.length) throw new Error(`${f.id}: would make ${added.join(", ")} impossible`);
  console.log(`plan ${f.id}: ${f.pin} ${f.old} -> null`);
  plans.push({ f, row, wp });
}
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify(Object.fromEntries(plans.map((p) => [p.f.id, { waypoints: p.row.waypoints }])), null, 1));
let good = true;
for (const { f, wp } of plans) {
  await patchRow("routes", f.id, { waypoints: wp });
  const ok = (await get(f.id)).waypoints.find((w) => sig(w) === f.pin).distMi == null;
  console.log(`${f.id}: ${ok ? "verified: re-read shows distMi null" : "MISMATCH on re-read"}`);
  good &&= ok;
}
if (!good) process.exit(1);
