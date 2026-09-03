// THE RULE STATED AS WHAT IT MEANS, RATHER THAN AS A PICKED LENGTH.
//
// measure-two-vertex-slack.mjs showed two-of-slack is strictly additive at every minimum length
// tried (LOST 0) and gains exactly the eight stranded routes. Picking 5, 6 or 7 out of that is
// fitting a number to the answer. The invariant behind it is sayable:
//
//     a line is "just the waypoints" when at most two of its points are stranded AND a STRICT
//     MAJORITY of them still sit on a pin
//
// which derives the minimum length instead of choosing it (2 stranded is a minority only from 5
// points up), and applies the same test to the pin side -- a line touching neither of two pins is
// not "straight lines between this route's waypoints", it is a line about something else, and the
// caption would be a false claim.
//
// Confirms: same 8 gained, 0 lost, and no gained line dense enough to be a recording.
import { selectAll } from "../lib/supabase-env.mjs";

const R = 6371000, rad = (d) => (d * Math.PI) / 180;
function metres(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const num = (v) => (v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
const ON = 5, MAXPTS = 40;

// How much slack a set of n things may have while the ones that matched stay a strict majority.
const slackFor = (n) => (n < 3 ? 0 : n - 2 > n / 2 ? 2 : 1);

const today = (line, pins) => {
  const on = line.filter((v) => pins.some((p) => metres(v, p) <= ON)).length;
  const vertexOk = line.length >= 3 ? on >= line.length - 1 : on === line.length;
  return vertexOk && pins.filter((p) => line.some((v) => metres(v, p) <= ON)).length >= pins.length - 1;
};
const cand = (line, pins) => {
  const on = line.filter((v) => pins.some((p) => metres(v, p) <= ON)).length;
  const hit = pins.filter((p) => line.some((v) => metres(v, p) <= ON)).length;
  return on >= line.length - slackFor(line.length) && hit >= pins.length - Math.max(1, slackFor(pins.length));
};

console.log("slack by count:", [2, 3, 4, 5, 6, 7, 8].map((n) => `${n}->${slackFor(n)}`).join(" "));

const rows = await selectAll("routes", "id,gpx,waypoints", "gpx=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing."); process.exit(1); }

let gained = [], lost = [], both = 0, considered = 0;
for (const r of rows) {
  const line = (Array.isArray(r.gpx) ? r.gpx : []).map((p) => [num(p[0] ?? p.lat), num(p[1] ?? p.lng)]).filter((p) => p[0] !== null && p[1] !== null);
  const pins = (Array.isArray(r.waypoints) ? r.waypoints : []).map((w) => [num(w.lat), num(w.lng)]).filter((p) => p[0] !== null && p[1] !== null);
  if (line.length < 2 || line.length > MAXPTS || !pins.length) continue;
  considered++;
  const a = today(line, pins), b = cand(line, pins);
  if (a && b) both++;
  else if (!a && b) {
    const gaps = line.slice(1).map((p, i) => metres(line[i], p)).sort((x, y) => x - y);
    gained.push({ id: r.id, n: line.length, med: Math.round(gaps[Math.floor(gaps.length / 2)]) });
  } else if (a && !b) lost.push(r.id);
}
console.log(`\n${considered} line(s) considered · ${both} captioned by both · GAINED ${gained.length} · LOST ${lost.length}`);
for (const g of gained) console.log(`   GAINED  ${g.id}  ${g.n} vertices, median gap ${g.med} m`);
for (const id of lost) console.log(`   LOST    ${id}   <-- a widening that loses a caveat is a regression`);
const dense = gained.filter((g) => g.med < 200);
console.log(dense.length ? `\n!! ${dense.length} gained line(s) could be recordings (median gap under 200 m)`
  : `\nno gained line has a median gap under 200 m — none of them could be a recording (real tracks sit at 8-47 m)`);
process.exit(lost.length || dense.length ? 1 : 0);
