// Mount Stickney: clear the Second Switchback pin's coordinate. #2159 set the road walk to the stated 4.8 mi (summit 6.5
//   mi), which made audit:waypoint-distances list the summit: 1.7 mi stored from this pin, 3.2 mi in a straight line.
//   The coordinate is the wrong record, convicted twice: the ground there is 3,023 ft against the 3,700 ft the pin and
//   its prose state, and it sits 0.50 mi off the route's own gpx, at 1.63 mi along it rather than 4.8. Its decimals are
//   a vertex average, not a surveyed point. Name, height, distance and note stay; only lat/lng go to null.
//   node scripts/oneoff/clear-stickney-switchback-coord.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ID = "wa_mount_stickney_scramble", AREA = "wa_mount_stickney", PIN = "Junction|Second Switchback / Climbers' Path";
const OLD = { lat: 47.932818269230765, lng: -121.6600875 };
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/stickney-rollback.json", import.meta.url);

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
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints&id=eq.${ID}`, { headers: headers(KEY) })).json())[0];

const row = await get();
if (!row || row.area_id !== AREA) throw new Error(`${ID}: not on ${AREA}`);
const wp = structuredClone(row.waypoints), pin = wp.find((w) => sig(w) === PIN);
if (!pin) throw new Error(`${PIN} not found`);
if (pin.lat == null && pin.lng == null) { console.log("already applied"); process.exit(0); }
if (pin.lat !== OLD.lat || pin.lng !== OLD.lng) throw new Error(`pin is at ${pin.lat},${pin.lng}, expected ${OLD.lat},${OLD.lng}`);

const before = impossible(row.waypoints);
pin.lat = null; pin.lng = null;
const after = impossible(wp), added = [...after].filter((s) => !before.has(s));
console.log(`impossible before: ${[...before].join(", ") || "none"}; after: ${[...after].join(", ") || "none"}`);
if (added.length) throw new Error(`would make ${added.join(", ")} impossible`);
console.log(`plan ${ID}: ${PIN} coordinate ${OLD.lat},${OLD.lng} -> null`);
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify({ [ID]: { waypoints: row.waypoints } }, null, 1));
await patchRow("routes", ID, { waypoints: wp });
const rp = (await get()).waypoints.find((w) => sig(w) === PIN);
const good = rp.lat == null && rp.lng == null && Number(rp.distMi) === 4.8;
console.log(good ? "verified: re-read shows the coordinate cleared, distMi 4.8 kept" : "MISMATCH on re-read");
if (!good) process.exit(1);
