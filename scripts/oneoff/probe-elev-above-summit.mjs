// A SEVENTH GATE candidate for write-waypoint-directions.mjs.
//
// wa_soviet_route passes all six existing gates and is still in the wrong order: waypoint 6
// is the Northeast Ridge traverse to the West Peak (9,410 ft) and waypoint 7 is the Southwest
// Peak summit (9,320 ft). Every prose column says you top out on the Southwest Peak at the end
// of pitch 14 and THEN traverse — so the array walks the descent before the summit.
//
// The six gates cannot see it. The beyond-summit gate compares straight-line DISTANCE from
// waypoint 0, and these two points are ~90 m apart, so the ratio is nowhere near 1.15. The
// backtrack gate needs a 2 km retreat. distMi is monotonic. The discriminator is ELEVATION,
// which no gate reads at all: a point listed BEFORE the summit cannot be HIGHER than it,
// because you would have had to descend to reach the summit.
//
// Measure the population before proposing it. A gate that fires on one route is a fix for one
// route; a gate is worth having only if it names a class.
//
// VERDICT, measured 2026-08-13: DO NOT SHIP THIS GATE. 11 of 640 WA routes hit it and most
// are CORRECT sequences. Chikamin-Dome Col (8,500 ft) legitimately precedes Gunsight Peak
// (8,198 ft); Burgundy Col (7,950) precedes Vasiliki Tower (7,663); Needle Pass (5,700)
// precedes The Fin (5,599); the Ruth Mountain bivy (7,115) precedes Icy Peak (7,073). Crossing
// a high col, or going over one peak, to reach a LOWER summit is ordinary alpine travel — the
// premise "a point before the summit cannot be higher than it" is simply false in this terrain.
//
// And no threshold rescues it. The two routes that ARE misordered sit at +90 ft (wa_soviet_route)
// and +53 ft (wa_mount_fury_west_west_ridge), BELOW six correct cases at +96 to +302 ft. The
// populations overlap, so precision cannot be bought with a margin.
//
// Kept as a record of a detector that was measured and rejected, so nobody re-derives it from
// the same plausible-sounding premise. Same discipline as the three area-parent detectors that
// were written, measured at 0 real hits, and not shipped.
//
// Read-only. Fails closed on a read that never succeeds.
import { selectAll as _selectAll } from "../lib/supabase-env.mjs";

async function selectAll(t, s, f, o) {
  let last;
  for (let a = 1; a <= 5; a++) {
    try { return await _selectAll(t, s, f, o); }
    catch (e) { last = e; if (a < 5) await new Promise((x) => setTimeout(x, 3000 * a)); }
  }
  throw new Error(`read failed after 5 attempts (${f || t}): ${last?.message}`);
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isSum = (w) => /^(summit|topout)$/i.test(String((w && w.type) || ""));

const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
const waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints", `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

// TOLERANCE. A gate needs a threshold that is defended rather than picked. Waypoint elevations
// in this catalog are a mix of measured and estimated, and a col or a shoulder legitimately
// sits within a few tens of feet of a summit's quoted height. So require a MARGIN: the point
// must be meaningfully higher, not merely higher by rounding. 50 ft is the smallest step the
// data uses; report the distribution so the number can be argued about rather than assumed.
const hits = [];
let considered = 0, noSummit = 0, noElev = 0;

for (const r of rows) {
  const wps = r.waypoints;
  if (!Array.isArray(wps) || wps.length < 3) continue;
  const s = wps.findIndex(isSum);
  if (s <= 0) { noSummit++; continue; }
  const sE = num(wps[s].elev);
  if (sE == null) { noElev++; continue; }
  considered++;
  for (let i = 1; i < s; i++) {
    const e = num(wps[i].elev);
    if (e == null) continue;
    if (e > sE) hits.push({ id: r.id, i, name: wps[i].name, type: wps[i].type, e, sE, over: e - sE, sName: wps[s].name });
  }
}

const byRoute = new Map();
for (const h of hits) if (!byRoute.has(h.id) || h.over > byRoute.get(h.id).over) byRoute.set(h.id, h);

console.log(`WA routes with a summit/topout at index > 0 carrying an elevation: ${considered}`);
console.log(`  (skipped: ${noSummit} no summit waypoint, ${noElev} summit carries no elev)\n`);
console.log(`routes with at least one PRE-SUMMIT point higher than the summit: ${byRoute.size}\n`);

const buckets = [[1, 25], [25, 100], [100, 300], [300, 1e9]];
for (const [lo, hi] of buckets) {
  const n = [...byRoute.values()].filter((h) => h.over >= lo && h.over < hi).length;
  console.log(`  over by ${String(lo).padStart(4)}-${hi > 1e8 ? "  + " : String(hi).padStart(4)} ft : ${n}`);
}

console.log(`\nworst 25 by margin:`);
for (const h of [...byRoute.values()].sort((a, b) => b.over - a.over).slice(0, 25))
  console.log(`  +${String(h.over).padStart(5)} ft  ${h.id.padEnd(44)} [${h.i}] ${String(h.type || "?").padEnd(10)} ${String(h.name || "").slice(0, 30).padEnd(30)} ${h.e} vs summit "${String(h.sName || "").slice(0, 22)}" ${h.sE}`);

const soviet = byRoute.get("wa_soviet_route");
console.log(`\nself-check — wa_soviet_route is ${soviet ? `CAUGHT (+${soviet.over} ft at index ${soviet.i})` : "NOT CAUGHT, the probe is broken"}`);
if (!soviet) process.exit(1);
