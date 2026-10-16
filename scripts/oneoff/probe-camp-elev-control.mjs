// CONTROL FIRST. The plan is: named place -> OSM coordinate -> USGS DEM elevation. The expected
// output of that pipeline is "a plausible elevation in feet", which is exactly what a broken
// pipeline emits, so it is worth nothing until a known answer comes back through it unchanged.
//
// Controls, each with an independently established height:
//   Shield Lake (Enchantments)  6,699 ft   researched separately before this ran
//   Perfect Pass (Pickets)      6,300 ft   already in this catalog, from the waypoint store
//   Luna Camp (Big Beaver)      2,500 ft   already in this catalog, from the waypoint store
//   Monte Cristo townsite       2,762 ft   already in this catalog, from the waypoint store
//
// The three catalog controls matter more than the researched one: they were placed by a different
// method entirely, so agreement is genuine corroboration rather than one claim counted twice.
import dns from "node:dns";
// overpass/OSM hosts publish AAAA records this machine cannot route; node prefers them and every
// request dies with a connect timeout that looks exactly like "nothing is mapped here". The
// waypoint-repair pass paid for this discovery — do not remove.
dns.setDefaultResultOrder("ipv4first");
import { elevationAt } from "../lib/terrain.mjs";

const UA = "ClimbMatch-camp-elevation/1.0 (climbing route catalog; contact via repo)";
const WA = { minLat: 45.5, maxLat: 49.05, minLng: -124.9, maxLng: -116.9 };

async function nominatim(name, box) {
  const b = box || WA;
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&viewbox=${b.minLng},${b.maxLat},${b.maxLng},${b.minLat}&bounded=1&q=${encodeURIComponent(name)}`;
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  return { rows: await r.json() };
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const CONTROLS = [
  { name: "Shield Lake", want: 6699, why: "researched independently" },
  { name: "Perfect Pass", want: 6300, why: "catalog waypoint" },
  { name: "Luna Camp", want: 2500, why: "catalog waypoint" },
  { name: "Monte Cristo", want: 2762, why: "catalog waypoint (townsite)" },
];

let pass = 0;
for (const c of CONTROLS) {
  const res = await nominatim(c.name);
  if (res.error) { console.log(`  ERROR ${c.name}: ${res.error}`); continue; }
  const rows = res.rows || [];
  // An empty result is NOT "this place does not exist" — it is also what a bounded query against
  // the wrong extract returns, with HTTP 200. Say which one this is.
  if (!rows.length) { console.log(`  NO MATCH  ${c.name}  (0 rows — cannot tell "unmapped" from "wrong extract")`); continue; }
  const hit = rows.find((x) => norm(x.name) === norm(c.name)) || rows[0];
  const ground = await elevationAt(Number(hit.lat), Number(hit.lon));
  const d = ground == null ? null : Math.round(ground - c.want);
  const ok = ground != null && Math.abs(ground - c.want) <= 200;
  if (ok) pass++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${c.name.padEnd(22)} osm "${String(hit.name).slice(0, 26).padEnd(26)}" ${String(hit.type || "").padEnd(12)} dem ${ground == null ? "—" : Math.round(ground)} ft  want ${c.want}  ${d == null ? "" : (d >= 0 ? "+" : "") + d} ft  [${c.why}]`);
  await new Promise((s) => setTimeout(s, 1100)); // Nominatim asks for <=1 req/sec.
}
console.log(`\n${pass}/${CONTROLS.length} controls reproduced within 200 ft`);
console.log(pass === CONTROLS.length
  ? "-> the name -> OSM -> DEM path is sound for this class. Proceed."
  : "-> DO NOT trust this pipeline's output until the controls pass. A plausible number is what a broken one emits.");
process.exit(pass === CONTROLS.length ? 0 : 1);
