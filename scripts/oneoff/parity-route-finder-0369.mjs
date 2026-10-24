// 0369 parity: do the SQL helpers (route_trip_km / route_gain_ft), lib/offline.js's mirror of them,
// and the route page's OWN headline arithmetic (lib/outing.js effDistKm + routeAscentFt) agree on
// every route that carries a distance, a gain or an itinerary?
// Input: the JSON `npx supabase db query --linked` prints for
//   select id, gain_ft, dist_km, outing_shape, itinerary, route_trip_km(dist_km, outing_shape, itinerary) as sql_trip,
//          route_gain_ft(gain_ft, itinerary) as sql_gain from routes where dist_km > 0 or gain_ft > 0 or itinerary is not null;
// lib/offline.js imports the app's Supabase client, so bundle it first:
//   npx esbuild scripts/oneoff/parity-route-finder-0369.mjs --bundle --platform=node --format=esm --define:import.meta.env={} --outfile=OUT.mjs && node OUT.mjs rows.json
// 2026-10-24: 950 rows, all four comparisons 0.
import fs from "fs";
import { routeTripKm, routeGainFt } from "../../lib/offline.js";
import { effDistKm, effDistIsWholeTrip } from "../../lib/outing.js";

const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).rows;
// routeAscentFt (ClimbMatchCore), copied: core cannot be imported outside the app bundle.
const routeAscentFt = r => { if (r.gainFt != null && r.gainFt > 0) return r.gainFt; const itin = (r.itinerary && r.itinerary.days && r.itinerary.days.length) ? r.itinerary.days.reduce((a, d) => a + (d.gainFt || 0), 0) : 0; return itin || r.gainFt || null; };
const near = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 0.01);
let n = 0, sqlJs = [], jsPage = [], gSqlJs = [], gPage = [];
for (const r of rows) {
  n++;
  const js = routeTripKm(r), sql = r.sql_trip == null ? null : Number(r.sql_trip);
  if (!near(js, sql)) sqlJs.push([r.id, sql, js]);
  const ek = effDistKm(r), page = ek > 0 ? (effDistIsWholeTrip(r) ? ek : ek * 2) : null;
  if (!near(js, page)) jsPage.push([r.id, js, page]);
  const g = routeGainFt(r), gs = r.sql_gain == null ? null : Number(r.sql_gain);
  if (!near(g, gs)) gSqlJs.push([r.id, gs, g]);
  const gp = routeAscentFt({ gainFt: r.gain_ft, itinerary: r.itinerary });
  if (!near(g, gp || null)) gPage.push([r.id, g, gp]);
}
console.log(`${n} rows. trip SQL≠JS ${sqlJs.length}, trip JS≠route page ${jsPage.length}, gain SQL≠JS ${gSqlJs.length}, gain JS≠route page ${gPage.length}`);
for (const [k, l] of [["trip SQL≠JS", sqlJs], ["trip JS≠page", jsPage], ["gain SQL≠JS", gSqlJs], ["gain JS≠page", gPage]]) if (l.length) console.log(k, JSON.stringify(l.slice(0, 5)));
process.exit(sqlJs.length || gSqlJs.length ? 1 : 0);
