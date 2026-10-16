// Independent confirmation that the 7 elevation writes landed and nothing else moved.
// Read through ANON -- the role the app uses -- and check the whole waypoint array of every touched
// route, not just the pins that were edited: patchRow rewrites the entire array, so the risk worth
// testing is a NEIGHBOUR that changed, which a per-pin check cannot see.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const want = JSON.parse(fs.readFileSync(`${T}/elev-confirmed.json`, "utf8"));
const before = JSON.parse(fs.readFileSync(`${T}/confirmed-pin-elevations.json`, "utf8"));
const ids = [...new Set(want.map(w => w.route))];

const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// what the pins looked like before this pass, from the measurement snapshot
const priorElev = new Map();
for (const b of [...(before.off1000 || []), ...(before.off400 || []), ...(before.agree || []), ...(before.noElev || [])])
  priorElev.set(`${b.route}#${b.i}`, b.elev);

let ok = 0; const bad = [], collateral = [];
for (const w of want) {
  const p = ((rows[w.route] || {}).waypoints || [])[w.i];
  if (p && Number(p.elev) === Number(w.ground)) ok++;
  else bad.push(`${w.route}[${w.i}] reads ${p ? p.elev : "(gone)"}, expected ${w.ground}`);
}
// every OTHER pin on a touched route must be exactly as it was
const edited = new Set(want.map(w => `${w.route}#${w.i}`));
for (const id of ids) for (const [i, p] of ((rows[id] || {}).waypoints || []).entries()) {
  const k = `${id}#${i}`;
  if (edited.has(k) || !priorElev.has(k)) continue;
  if (Number(p.elev) !== Number(priorElev.get(k))) collateral.push(`${k} was ${priorElev.get(k)}, now ${p.elev}`);
}
console.log(`routes touched : ${ids.length}`);
console.log(`  pins written and verified : ${ok} of ${want.length}`);
for (const b of bad) console.log(`    MISMATCH ${b}`);
console.log(`  neighbouring pins changed by collateral : ${collateral.length}`);
for (const c of collateral) console.log(`    ${c}`);
console.log(`\n  every waypoint on each touched route, as it now reads:`);
for (const id of ids) {
  console.log(`  ${id}`);
  for (const [i, p] of ((rows[id] || {}).waypoints || []).entries())
    console.log(`     [${i}] ${String(p.name || "").slice(0, 40).padEnd(40)} ${p.lat == null ? "(no coord)" : `${(+p.lat).toFixed(5)},${(+p.lng).toFixed(5)}`}  ${p.elev ?? "—"} ft${edited.has(`${id}#${i}`) ? "   <- written" : ""}`);
}
process.exit(bad.length || collateral.length ? 1 : 0);
