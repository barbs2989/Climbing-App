// IS THE PROPOSED "col" ACTUALLY A COL?
//
// The straight line between two summits is not the ridge that joins them, so taking the minimum
// along that line finds whatever basin the line cuts through. My first recomputation did exactly
// that, landed 473 m from the agent's proposal on a point that is not a saddle at all (ground rose
// on one side and fell on the other), and that result says nothing about the proposal — it is a
// failure of my method, not a disproof of the claim. Recording it as a disproof would have been the
// worse error: refusing a correct pin on the strength of a test too crude to judge it.
//
// The proper test is LOCAL and needs no ridge orientation. Walk a ring of bearings around the point
// and classify each sample as higher or lower than the centre. Going once around the circle:
//   summit  -> every sample lower            (0 sign changes)
//   pit     -> every sample higher           (0 sign changes)
//   slope   -> one rising arc, one falling   (2 sign changes)
//   SADDLE  -> two rising arcs opposite each other, two falling  (4 sign changes)
// That is the textbook discriminator, and it is exactly what "a col" means: the pass rises to the
// ridge on two opposing sides and drops into a valley on the other two.
import fs from "fs";
import { elevationAt } from "../../lib/terrain.mjs";

const R = 6371000, rad = Math.PI / 180;
const offset = (lat, lng, mm, bearing) => {
  const d = mm / R, b = bearing * rad, p1 = lat * rad, l1 = lng * rad;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / rad, l2 / rad];
};
const NOISE_FT = 8;    // DEM jitter; below this a sample is "level", not a rise or a fall

async function classify(lat, lng, ringM = 120, n = 16) {
  const c = await elevationAt(lat, lng);
  if (c == null) return { err: "DEM did not answer at the centre" };
  const ring = [];
  for (let i = 0; i < n; i++) {
    const [y, x] = offset(lat, lng, ringM, (360 / n) * i);
    const v = await elevationAt(y, x);
    if (v == null) return { err: `DEM did not answer at bearing ${(360 / n) * i}` };
    ring.push(v);
  }
  const sign = ring.map(v => v - c > NOISE_FT ? 1 : (c - v > NOISE_FT ? -1 : 0));
  // Sign changes around the closed circle, ignoring level samples.
  const nz = sign.filter(s => s !== 0);
  let changes = 0;
  for (let i = 0; i < nz.length; i++) if (nz[i] !== nz[(i + 1) % nz.length]) changes++;
  const up = sign.filter(s => s === 1).length, down = sign.filter(s => s === -1).length;
  const shape = nz.length === 0 ? "flat"
    : changes === 0 ? (nz[0] === 1 ? "pit" : "summit")
      : changes === 2 ? "slope or spur"
        : changes >= 4 ? "SADDLE" : "unclear";
  return { centre: c, ring, sign, changes, up, down, shape };
}

const dir = process.env.WP_DATA_DIR || "./waypoint-repair-data/research";
const refused = JSON.parse(fs.readFileSync(`${dir}/refused.json`, "utf8"));
const x = refused.find(r => r.route === "wa_mount_crowder_southwest_route" && r.i === 4);

const targets = [
  { label: "the AGENT'S proposal", lat: +x.lat, lng: +x.lng },
  { label: "my straight-line minimum (expected NOT to be a saddle)", lat: 48.807893, lng: -121.347527 },
  { label: "CONTROL: Mount Crowder summit (must read 'summit')", lat: 48.7977056, lng: -121.3519083 },
];

for (const t of targets) {
  const r = await classify(t.lat, t.lng);
  if (r.err) { console.log(`${t.label}: ${r.err}`); continue; }
  console.log(`${t.label}`);
  console.log(`  ${t.lat.toFixed(6)},${t.lng.toFixed(6)}  centre ${Math.round(r.centre)} ft`);
  console.log(`  ring: ${r.ring.map(v => Math.round(v)).join(" ")}`);
  console.log(`  signs: ${r.sign.map(s => s > 0 ? "+" : s < 0 ? "-" : ".").join("")}   changes=${r.changes}  up=${r.up} down=${r.down}`);
  console.log(`  -> ${r.shape}\n`);
}
