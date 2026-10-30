// Group the census's trailhead pins by DISTINCT stored coordinate (many routes share one trailhead)
// and write research batches of ~SIZE coordinates each, grouped by state so one researcher sees
// neighbouring trailheads together. Read-only.
//   node scripts/oneoff/oos-waypoint-audit/trailhead-batches.mjs ROUTES.json CENSUS.json OUTDIR [SIZE]
import fs from "fs";
const [, , SNAP, CENSUS, OUTDIR, SIZE = "10"] = process.argv;
const routes = Object.fromEntries(JSON.parse(fs.readFileSync(SNAP, "utf8")).map(r => [r.id, r]));
const census = JSON.parse(fs.readFileSync(CENSUS, "utf8"));
const groups = new Map();
for (const r of census) for (const t of r.trailheads) {
  const k = `${t.at[0].toFixed(5)},${t.at[1].toFixed(5)}`;
  if (!groups.has(k)) groups.set(k, { lat: t.at[0], lng: t.at[1], state: r.state, ground_ft: t.ground_ft, pins: [], route_names: [], text: String(routes[r.id].approach_logistics || "").slice(0, 600) });
  const g = groups.get(k);
  g.pins.push({ id: r.id, i: t.i, name: t.name, elev: t.elev });
  if (g.route_names.length < 4) g.route_names.push(r.name);
  if (!g.text && routes[r.id].approach_logistics) g.text = String(routes[r.id].approach_logistics).slice(0, 600);
}
const all = [...groups.values()].sort((a, b) => a.state.localeCompare(b.state) || a.lat - b.lat);
fs.mkdirSync(OUTDIR, { recursive: true });
let n = 0;
for (let i = 0; i < all.length; i += +SIZE) fs.writeFileSync(`${OUTDIR}/trailheads-${++n}.json`, JSON.stringify(all.slice(i, i + +SIZE), null, 1));
console.log(all.length, "distinct trailhead coordinates over", census.reduce((a, r) => a + r.trailheads.length, 0), "pins ->", n, "batches");
