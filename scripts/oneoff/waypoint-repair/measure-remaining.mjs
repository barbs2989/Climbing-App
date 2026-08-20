// How much of the fabricated-pin population is left? The audit counts ROUTES, and a route stays
// flagged while ANY of its pins is still fabricated — so per-route numbers understate per-pin repair
// badly when the work is spread across many routes. Count both.
import fs from "fs";
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const K = anonKey(), H = { apikey: K, Authorization: "Bearer " + K };
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };

const fab = JSON.parse(fs.readFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/fab-pins.json", "utf8"));
const ids = [...new Set(fab.map(r => r.id))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: H });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// MEASURE THE ACTUAL CHANGE, NOT A PROXY. A first version asked "does this pin now have <=8
// decimals?" and reported 754 of 1,155 repaired against 372 writes — nonsense, because fab-pins.json
// flags pins by BOTH tells and a pin sitting inside an interpolated RUN was often written to 5
// decimals all along. It was never decimal-class, so it counted as repaired without anything having
// happened to it. fab-pins.json records each pin's ORIGINAL coordinate; compare against that.
let flagged = 0, changed = 0, unchanged = 0, noCoord = 0, stillFab = 0;
const routesLeft = new Set();
for (const r of fab) {
  const w = (rows[r.id] || {}).waypoints || [];
  for (const p of r.pins) {
    flagged++;
    const cur = w[p.i];
    if (!cur || cur.lat == null) { noCoord++; continue; }
    const moved = Math.abs(+cur.lat - +p.lat) > 1e-9 || Math.abs(+cur.lng - +p.lng) > 1e-9;
    if (moved) changed++; else { unchanged++; routesLeft.add(r.id); }
    if (Math.max(dec(cur.lat), dec(cur.lng)) > 8) stillFab++;
  }
}
const repaired = changed;
console.log(`pins originally flagged as fabricated : ${flagged}  across ${ids.length} routes`);
console.log(`  coordinate actually REPLACED        : ${changed}`);
console.log(`  untouched (still the generated value): ${unchanged}  across ${routesLeft.size} routes`);
console.log(`  no coordinate at all                : ${noCoord}`);
console.log(`  still >8 decimals (decimal tell)    : ${stillFab}`);
console.log(`\nper-pin progress: ${(100 * changed / (flagged - noCoord)).toFixed(1)}% of the flagged population`);
