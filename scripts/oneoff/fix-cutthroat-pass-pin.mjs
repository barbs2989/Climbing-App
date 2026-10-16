// One proven off-track pin repair.
//
// wa_tower_mountain_southwest_route's "Cutthroat Pass" junction was stored at
// 48.55635,-120.65475 — 2,464 m from the route's own recorded track. USGS GNIS puts Cutthroat
// Pass at 48.5545805,-120.7001052, and substituting that lands the pin **36 m** from the
// track, inside the 120 m junction tolerance.
//
// That agreement is the evidence, not the lookup. A published coordinate matching a gpx line
// nobody consulted while publishing it is not something a wrong answer does by luck — which
// is exactly why the same check REFUSED the Longs Pass repair on wa_argonaut_peak_east_ridge,
// where the USGS coordinate is further from that route's track than the stored one.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_tower_mountain_southwest_route";
const WP = "Cutthroat Pass";
const LAT = 48.5545805, LNG = -120.7001052;
const WAS = { lat: 48.55635, lng: -120.65475 };

const k = anonKey();
const row = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!row) throw new Error("route not found");
const wps = row.waypoints || [];
const idx = wps.findIndex((w) => w && w.name === WP);
if (idx < 0) throw new Error(`no waypoint named "${WP}" — refusing`);
if (Math.abs(Number(wps[idx].lat) - WAS.lat) > 1e-5 || Math.abs(Number(wps[idx].lng) - WAS.lng) > 1e-5) {
  console.log(`SKIP: pin is at ${wps[idx].lat},${wps[idx].lng}, not the value this fix was written against — already repaired or changed; refusing`);
  process.exit(0);
}

console.log(`${ID} — [${wps[idx].type}] "${WP}"`);
console.log(`    ${wps[idx].lat},${wps[idx].lng}  ->  ${LAT},${LNG}`);
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

const next = wps.map((w, i) => (i === idx ? { ...w, lat: LAT, lng: LNG } : w));
await patchRow("routes", ID, { waypoints: next });

const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const aw = after.waypoints || [];
const got = aw.find((w) => w && w.name === WP);
if (aw.length !== wps.length) { console.error(`VERIFY FAILED: waypoint count ${wps.length} -> ${aw.length}`); process.exit(1); }
if (!got || Math.abs(Number(got.lat) - LAT) > 1e-9 || Math.abs(Number(got.lng) - LNG) > 1e-9) { console.error(`VERIFY FAILED: pin is ${got && got.lat},${got && got.lng}`); process.exit(1); }
console.log(`    verified: "${WP}" now at ${got.lat},${got.lng}; ${aw.length} waypoints, unchanged`);
