// AN INDEPENDENT CHECK ON A PROPOSED VERTEX MOVE: DOES THE PIN FIT THE LINE'S OWN SEQUENCE?
//
// fix-stranded-track-vertices pairs a stranded vertex with an orphan pin by DISTANCE and a
// confidence ratio. On the six routes it can now partially repair, distance does not separate the
// unarguable pairs from the weak ones — 26 m at 776x sits beside 2,640 m at 3.0x, and the second is
// exactly the "pin REPLACED rather than refined" class this catalog refuses.
//
// A sketched line is drawn THROUGH its pins in some order, so a stranded vertex has neighbours that
// are still on pins, and the pin that belongs at that position should sit between them. That is a
// property of the line's own shape rather than of how far anything moved, so it is a second opinion
// rather than the same claim restated.
//
// Reported per candidate, decided by a person. Read-only, no writes.
import { selectAll } from "../lib/supabase-env.mjs";

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};
const NEAR_M = 5;

// The six the repair script proposes, with the pin it proposes and its own confidence.
const CAND = {
  wa_andersons_thumb_standard:    { i: 1, pin: "Anderson Pass", d: 26, x: 776 },
  wa_inner_constance_standard:    { i: 7, pin: "Inner Constance", d: 85, x: 80 },
  wa_mount_despair_east_route:    { i: 4, pin: "Triumph Pass", d: 690, x: 3.9 },
  wa_mount_fury_west_west_ridge:  { i: 6, pin: "Luna Col", d: 2640, x: 3.0 },
  wa_mount_lyall_south_route:     { i: 1, pin: "Holden Lake Trail turnoff (Hart/Lyman Lake Trail junction)", d: 1071, x: 18.4 },
  wa_mount_rainier_liberty_ridge: { i: 4, pin: "Liberty Cap", d: 2103, x: 5.3 },
};

const ids = Object.keys(CAND);
const rows = await selectAll("routes", "id,gpx,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 60 });
if (rows.length !== ids.length) { console.error(`FAIL-CLOSED: read ${rows.length} of ${ids.length} routes.`); process.exit(1); }

for (const id of ids) {
  const c = CAND[id];
  const r = rows.find((x) => x.id === id);
  const line = (r.gpx || []).map(pointOf);
  const pins = (r.waypoints || []).map((w) => { const p = pointOf(w); return p ? { ...p, name: w.name } : null; }).filter(Boolean);
  const target = pins.find((p) => p.name === c.pin);
  const v = line[c.i];
  console.log(`\n${id}  vertex ${c.i} -> "${c.pin}"   ${c.d} m, ${c.x}x`);
  if (!v || !target) { console.log("   cannot read the candidate — skipped"); continue; }

  // The neighbours that are still explained by a pin.
  const nameAt = (j) => {
    const p = line[j] && pins.find((q) => metres(line[j], q) < NEAR_M);
    return p ? p.name : null;
  };
  const prev = c.i > 0 ? nameAt(c.i - 1) : null;
  const next = c.i + 1 < line.length ? nameAt(c.i + 1) : null;
  console.log(`   neighbours: [${c.i - 1}] ${prev || "(adrift/none)"}   [${c.i + 1}] ${next || "(adrift/none)"}`);

  // DOES THE PIN SIT BETWEEN THEM? Compared against where the vertex sits today, so the question is
  // "does the move make the line's own sequence more sensible or less".
  const a = c.i > 0 ? line[c.i - 1] : null, b = c.i + 1 < line.length ? line[c.i + 1] : null;
  if (a && b) {
    const span = metres(a, b);
    const viaNow = metres(a, v) + metres(v, b);
    const viaPin = metres(a, target) + metres(target, b);
    // A detour ratio of 1 means the point is on the straight run between its neighbours; the larger
    // it is, the further the line doubles back to visit it.
    console.log(`   neighbour span ${Math.round(span)} m · detour via the vertex today ${(viaNow / span).toFixed(2)}x · via the pin ${(viaPin / span).toFixed(2)}x`);
    console.log(viaPin < viaNow
      ? `   => the pin fits the sequence BETTER than the vertex does — the move is corroborated`
      : `   => the pin fits the sequence WORSE (${(viaPin / viaNow).toFixed(2)}x) — distance is the ONLY evidence for this move`);
  } else {
    console.log("   => an endpoint vertex has only one neighbour, so the sequence says nothing here");
  }
}
