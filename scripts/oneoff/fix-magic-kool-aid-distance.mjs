// Owner decision (2026-10-01): Magic Mountain South Ridge reaches Kool-Aid Lake at 5.9 mi, not 5.5.
//   NPS: 3.7 mi trailhead -> Cascade Pass; Gaia hike 297828: 2.2 mi Cascade Pass -> Kool-Aid Lake. Both pins sit at
//   their GNIS coordinates, 5.88 mi apart in a straight line, so 5.5 was impossible (audit:waypoint-distances).
//   The same one-way figure is stored four times — the pin, itinerary days 1 and 3, and dist_km — and all four move.
//   node scripts/oneoff/fix-magic-kool-aid-distance.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ID = "wa_magic_mountain_south_ridge", AREA = "wa_magic_mountain", PIN = "Campsite|Kool-Aid Lake";
const OLD = { mi: 5.5, km: 8.9 }, NEW = { mi: 5.9, km: 9.5 };
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/magic-rollback.json", import.meta.url);

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const hav = (a, b) => { const R = 3958.7613, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
// The audit:waypoint-distances test, as fix-waypoint-elevation-backlog.mjs runs it.
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
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,dist_km,waypoints,itinerary&id=eq.${ID}`, { headers: headers(KEY) })).json())[0];

const row = await get();
if (!row || row.area_id !== AREA) throw new Error(`${ID}: not on ${AREA}`);
const wp = structuredClone(row.waypoints), it = structuredClone(row.itinerary);
const pin = wp.find((w) => sig(w) === PIN);
const days = [it.days[0], it.days[2]];
const already = Number(pin?.distMi) === NEW.mi && Number(row.dist_km) === NEW.km && days.every((d) => Number(d.miles) === NEW.mi);
if (already) { console.log("already applied"); process.exit(0); }
if (!pin || Number(pin.distMi) !== OLD.mi) throw new Error(`pin distMi is ${pin?.distMi}, expected ${OLD.mi}`);
if (Number(row.dist_km) !== OLD.km) throw new Error(`dist_km is ${row.dist_km}, expected ${OLD.km}`);
for (const d of days) if (Number(d.miles) !== OLD.mi || !/Kool-Aid|reverse the approach/i.test(`${d.title} ${d.objective} ${d.note}`)) throw new Error(`day ${d.n} is not the ${OLD.mi} mi Kool-Aid Lake leg`);

const before = impossible(row.waypoints);
pin.distMi = NEW.mi; for (const d of days) d.miles = NEW.mi;
const after = impossible(wp), added = [...after].filter((s) => !before.has(s));
console.log(`impossible before: ${[...before].join(", ") || "none"}; after: ${[...after].join(", ") || "none"}`);
if (added.length) throw new Error(`would make ${added.join(", ")} impossible`);
console.log(`plan ${ID}: Kool-Aid Lake ${OLD.mi} -> ${NEW.mi} mi; days ${days.map((d) => d.n).join(" and ")} miles ${OLD.mi} -> ${NEW.mi}; dist_km ${OLD.km} -> ${NEW.km}`);
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify({ [ID]: { dist_km: row.dist_km, waypoints: row.waypoints, itinerary: row.itinerary } }, null, 1));
await patchRow("routes", ID, { waypoints: wp, itinerary: it, dist_km: NEW.km });
const re = await get(), rp = re.waypoints.find((w) => sig(w) === PIN);
const good = Number(rp.distMi) === NEW.mi && Number(re.dist_km) === NEW.km && Number(re.itinerary.days[0].miles) === NEW.mi && Number(re.itinerary.days[2].miles) === NEW.mi;
console.log(good ? "verified: re-read matches all four values" : "MISMATCH on re-read");
if (!good) process.exit(1);
