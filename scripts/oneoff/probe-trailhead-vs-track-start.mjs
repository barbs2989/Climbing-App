// For a trailhead pin that disagrees with its name-group, which side does the route's OWN
// evidence take?
//
// probe-trailhead-consensus.mjs finds outliers by majority, and majority has already been wrong
// twice here (the Alpental/Rainier "Snow Lake" pair, and Esmeralda where the lone pin was the
// correct one). So it cannot be the deciding vote.
//
// The route's own gpx TRACK START is independent of both the pin and the consensus: it was
// written by a different enrichment pass, and a trailhead is where the track begins. If the
// track starts at the consensus, the outlier pin is wrong. If it starts at the outlier, the
// consensus is wrong for THIS route — which is what a legitimately different start looks like.
//
// Prints both distances and refuses to conclude when the route has no usable track. Read-only.
// Usage: node scripts/oneoff/probe-trailhead-vs-track-start.mjs <route_id>=<consLat>,<consLng> ...
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
if (!args.length) { console.error("usage: <route_id>=<lat>,<lng> ..."); process.exit(1); }
const key = requireServiceKey();
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

for (const a of args) {
  const [id, coords] = a.split("=");
  const [cLat, cLng] = coords.split(",").map(Number);
  const [r] = await selectAll("routes", "id,name,gpx,waypoints,approach", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.log(`${id}  NOT FOUND\n`); continue; }
  const th = (r.waypoints || []).find(w => String(w.type || "").toLowerCase() === "trailhead");
  const g = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && Number.isFinite(+p[0]));
  console.log(`### ${id}  "${r.name}"`);
  console.log(`   pin       ${th ? `${th.lat},${th.lng}  "${th.name}"` : "NO TRAILHEAD PIN"}`);
  console.log(`   consensus ${cLat},${cLng}`);
  if (!g.length) {
    console.log(`   track     NONE — this route cannot vote; read its prose instead`);
  } else {
    const s = g[0];
    const dPin = th ? Math.round(hav(+th.lat, +th.lng, s[0], s[1])) : null;
    const dCons = Math.round(hav(cLat, cLng, s[0], s[1]));
    console.log(`   track start ${s[0]},${s[1]}  (${g.length} pts)`);
    console.log(`      -> ${String(dPin).padStart(6)} m from the PIN`);
    console.log(`      -> ${String(dCons).padStart(6)} m from the CONSENSUS`);
    /* THE TRACK ONLY VOTES IF IT IS INDEPENDENT OF THE PIN, and often it is not: on 4 of the 5
       Goodell Creek routes the track's first point EQUALS the trailhead pin to the digit, because
       the track was generated FROM the waypoints. Distance 0 is not agreement, it is the same
       number twice, and reporting "the track backs the pin" there would be dressing one claim up
       as two. Short tracks are the tell — those four carry 2-8 points. */
    if (dPin === 0) {
      console.log(`      NO VOTE: the track STARTS at the pin, to the digit — it was derived from`);
      console.log(`               the waypoints, so it is the same claim, not corroboration.`);
    } else if (dPin < 50 && g.length < 12) {
      console.log(`      NO VOTE: ${g.length}-point track starting ${dPin} m from the pin — almost`);
      console.log(`               certainly derived from it. Read the prose instead.`);
    } else {
      console.log(`      VERDICT: ${dCons < dPin ? "track backs the CONSENSUS (pin is wrong)"
        : "track backs the PIN (consensus is wrong for this route)"}`);
    }
  }
  console.log(`   approach: ${String(r.approach || "(none)").replace(/\s+/g, " ").slice(0, 170)}\n`);
}
