// Print the distance-relevant fields of routes by id: node peek.mjs id1 id2 ...
import { SUPABASE_URL, requireServiceKey, headers } from '../lib/supabase-env.mjs';
import { effDistKm, effDistIsWholeTrip } from '../../lib/outing.js';
const k = requireServiceKey();
const ids = process.argv.slice(2);
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,dist_km,gain_ft,loss_ft,outing_shape,itinerary,road,approach,approach_variants,timing&id=in.(${ids.join(",")})`, { headers: headers(k) });
const rows = await r.json();
for (const x of rows) {
  const c = { distKm: x.dist_km, outingShape: x.outing_shape, itinerary: x.itinerary };
  const km = effDistKm(c);
  console.log(`\n=== ${x.id} — ${x.name} [${x.discipline}]`);
  console.log(`dist_km=${x.dist_km} gain=${x.gain_ft} loss=${x.loss_ft} shape=${x.outing_shape} TILE one-way=${km ? (km / 1.609).toFixed(1) : null} mi whole=${effDistIsWholeTrip(c)}`);
  if (x.itinerary && x.itinerary.days) x.itinerary.days.forEach((d, i) => console.log(`  day${i + 1}: miles=${d.miles} gainFt=${d.gainFt} ${String(d.label || d.title || "").slice(0, 60)} | ${String(d.note || "").slice(0, 160)}`));
  console.log(`road: ${JSON.stringify(x.road || {}).slice(0, 500)}`);
  console.log(`timing: ${JSON.stringify(x.timing || {}).slice(0, 300)}`);
  console.log(`approach: ${String(x.approach || "").slice(0, 500)}`);
  (x.approach_variants || []).forEach((v, i) => v && console.log(`  var${i}: ${v.name} | primary=${v.primary} longForm=${v.longForm} distMi=${v.distMi} gainFt=${v.gainFt} hours=${v.hours} trip=${v.trip ? "Y" : ""} via=${v.viaRouteId || ""} | season=${v.season} | why=${v.whyThisWay || ""}`));
}
