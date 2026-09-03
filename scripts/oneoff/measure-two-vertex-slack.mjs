// SHOULD THE SKETCH CAVEAT REACH A LINE WITH *TWO* STRANDED VERTICES?
//
// #1541 gave `trackIsJustTheWaypoints` ONE vertex of slack, because a pin repair leaves the drawn
// line behind and one stranded vertex was deleting the caveat outright. Eight routes still have
// TWO stranded, so the line poses as a recorded GPS track with Download GPX beneath it.
//
// The recorded objection to a looser rule is precise and must be honoured: a threshold on the
// FRACTION of vertices that are waypoints "would condemn genuine tracks that happen to be sparse".
// And a flat two-of-slack was measured and rejected once already -- on a THREE-point line it means
// only one vertex need be a pin, which is not a sketch test at all. check:track-caveat pins that.
//
// So this measures a rule with the length condition made EXPLICIT rather than implied:
//
//     at most 2 stranded, AND the line has enough vertices for that to still mean "mostly pins"
//
// and it reports, for the whole catalog:
//   GAINED  lines that would newly be captioned (with their vertex count and spacing)
//   LOST    lines that carry the caveat today and would not  -- MUST BE ZERO
//
// A summary count alone hid a real loss last time (34 two-point lines), so the LOST set is printed
// in full and the script exits 1 if it is not empty. Read-only.
import { selectAll } from "../lib/supabase-env.mjs";

const R = 6371000, rad = (d) => (d * Math.PI) / 180;
function metres(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const num = (v) => (v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
const ON = 5, MAXPTS = 40;

// TODAY (lib/track.js, #1541): <=40 points, at most one stranded vertex, at most one orphan pin.
const today = (line, pins) => {
  const on = line.filter((v) => pins.some((p) => metres(v, p) <= ON)).length;
  const vertexOk = line.length >= 3 ? on >= line.length - 1 : on === line.length;
  return vertexOk && pins.filter((p) => line.some((v) => metres(v, p) <= ON)).length >= pins.length - 1;
};
// CANDIDATE: two of slack, but only where two is still a small minority of the line.
const cand = (line, pins, minLen) => {
  const on = line.filter((v) => pins.some((p) => metres(v, p) <= ON)).length;
  const slack = line.length >= minLen ? 2 : line.length >= 3 ? 1 : 0;
  const vertexOk = on >= line.length - slack;
  return vertexOk && pins.filter((p) => line.some((v) => metres(v, p) <= ON)).length >= pins.length - 2;
};

const rows = await selectAll("routes", "id,gpx,waypoints", "gpx=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing."); process.exit(1); }

for (const MINLEN of [5, 6, 7]) {
  let gained = [], lost = [], both = 0, considered = 0;
  for (const r of rows) {
    const line = (Array.isArray(r.gpx) ? r.gpx : []).map((p) => [num(p[0] ?? p.lat), num(p[1] ?? p.lng)]).filter((p) => p[0] !== null && p[1] !== null);
    const pins = (Array.isArray(r.waypoints) ? r.waypoints : []).map((w) => [num(w.lat), num(w.lng)]).filter((p) => p[0] !== null && p[1] !== null);
    if (line.length < 2 || line.length > MAXPTS || !pins.length) continue;
    considered++;
    const a = today(line, pins), b = cand(line, pins, MINLEN);
    if (a && b) both++;
    else if (!a && b) {
      const gaps = line.slice(1).map((p, i) => metres(line[i], p)).sort((x, y) => x - y);
      gained.push({ id: r.id, n: line.length, med: Math.round(gaps[Math.floor(gaps.length / 2)]) });
    } else if (a && !b) lost.push(r.id);
  }
  console.log(`\n=== minimum line length for two-of-slack: ${MINLEN} ===`);
  console.log(`${considered} line(s) considered · ${both} captioned by both rules · GAINED ${gained.length} · LOST ${lost.length}`);
  // MEDIAN VERTEX SPACING IS THE EVIDENCE THAT A GAINED LINE CANNOT BE A RECORDING. A real GPS
  // track sits at 8-47 m between points; anything in the kilometres is a line somebody drew.
  const dense = gained.filter((g) => g.med < 200);
  for (const g of gained.slice(0, 12)) console.log(`   GAINED  ${g.id}  ${g.n} vertices, median gap ${g.med} m`);
  if (gained.length > 12) console.log(`   ... and ${gained.length - 12} more`);
  if (dense.length) console.log(`   !! ${dense.length} gained line(s) have a median gap under 200 m — those could be recordings, NOT sketches`);
  for (const id of lost) console.log(`   LOST    ${id}`);
  if (lost.length) console.log("   ^^ a widening that LOSES a caveat is a regression, not a widening.");
}
