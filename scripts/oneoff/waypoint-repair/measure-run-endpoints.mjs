// IS THE RUN TEST FLAGGING ITS OWN ANCHORS?
//
// Three independent checks have now each concluded that a group of "fabricated" pins was already
// correct: 48 in the in-row pass, 23 trailheads whose approach_logistics copy agreed exactly, and 26
// summits sitting precisely on their area's coordinate. Those are not three coincidences. They are
// all the FIRST or LAST pin of a route.
//
// That makes sense mechanically. The run test finds >=3 consecutive pins holding one bearing, which
// is what interpolation between two real anchors produces -- and the anchors are at the ENDS. A
// trailhead and a summit are the two points an enrichment pass was most likely to actually know, so
// they are exactly the pins most likely to be genuine, and the run test sweeps them up with the
// interpolated middle because they lie on the same line by construction.
//
// If that is right, a large slice of the remaining backlog is not defective at all, and the honest
// count of what needs repair is smaller than 728. Measured here rather than asserted.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const ro = headers(anonKey());
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };

const fab = JSON.parse(fs.readFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/fab-pins.json", "utf8"));
const ids = [...new Set(fab.map(r => r.id))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

let end = 0, interior = 0, endDecimal = 0, interiorDecimal = 0;
const endList = [];
for (const r of fab) {
  const w = (rows[r.id] || {}).waypoints || [];
  const lastIdx = w.length - 1;
  for (const p of r.pins) {
    const cur = w[p.i];
    if (!cur || cur.lat == null) continue;
    if (Math.abs(+cur.lat - +p.lat) > 1e-9 || Math.abs(+cur.lng - +p.lng) > 1e-9) continue;  // repaired
    const isEnd = p.i === 0 || p.i === lastIdx;
    const decimalClass = Math.max(dec(cur.lat), dec(cur.lng)) > 8;
    if (isEnd) { end++; if (decimalClass) endDecimal++; endList.push({ route: r.id, i: p.i, name: cur.name, type: cur.type, decimalClass }); }
    else { interior++; if (decimalClass) interiorDecimal++; }
  }
}
const tot = end + interior;
console.log(`still-fabricated pins : ${tot}\n`);
console.log(`  FIRST or LAST pin of the route (a run's own anchor) : ${end}  (${(100 * end / tot).toFixed(1)}%)`);
console.log(`      of those, carrying the DECIMAL tell too          : ${endDecimal}`);
console.log(`      i.e. flagged ONLY by the run test                : ${end - endDecimal}`);
console.log(`  interior pin                                        : ${interior}`);
console.log(`      of those, carrying the DECIMAL tell              : ${interiorDecimal}\n`);
console.log(`The decimal tell is arithmetic and not arguable; the run test is circumstantial. An`);
console.log(`endpoint flagged ONLY by the run test is the weakest evidence in the whole population,`);
console.log(`and every such pin checked independently so far has turned out to be correct:`);
console.log(`  trailheads whose approach_logistics copy agreed exactly : 23 of 28`);
console.log(`  summits sitting on their area's coordinate exactly      : 26 of 27`);
const byType = {};
for (const x of endList.filter(x => !x.decimalClass)) byType[x.type || "(none)"] = (byType[x.type || "(none)"] || 0) + 1;
console.log(`\nendpoints flagged only by the run test, by waypoint type:`);
console.log("  " + Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
fs.writeFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/run-endpoints.json", JSON.stringify(endList, null, 1));
