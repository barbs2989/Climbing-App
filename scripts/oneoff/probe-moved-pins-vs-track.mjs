// DID MOVING A PIN PUT IT OFF ITS OWN ROUTE'S TRACK?
//
// A coordinate repair can mint the very finding audit:waypoints exists for. This asks the question
// directly for the two pins fix-adjudicated-cross-route-pins.mjs moved, and it asks it BOTH WAYS:
// closest approach before and after, so an improvement is distinguishable from a regression.
//
// It also reports whether the "track" is genuine at all — 201 of 580 WA routes store a polyline
// that IS the waypoint list joined up, in which case a pin is on its track BY CONSTRUCTION and the
// measurement says nothing (lib/track.js, check:track-caveat).
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const CASES = [
  { id: "wa_magic_mountain_south_ridge", name: "Kool-Aid Lake", was: { lat: 48.452129, lng: -121.054323 } },
  { id: "wa_ptarmigan_traverse", name: "Cache Col", was: { lat: 48.4585, lng: -121.087 } },
];

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));

const H = headers(requireServiceKey());
for (const c of CASES) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,gpx&id=eq.${c.id}`, { headers: H });
  const [row] = await r.json();
  if (!row) { console.log(`${c.id}: no row`); continue; }
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const w = wps.find((x) => String(x.name || "").trim() === c.name);
  const now = { lat: Number(w.lat), lng: Number(w.lng) };

  const pts = (row.gpx || []).map((p) => ({ lat: Number(p.lat ?? p[0]), lng: Number(p.lng ?? p[1]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  console.log(`\n=== ${c.id}  "${c.name}"`);
  if (!pts.length) { console.log("   no gpx track — audit:waypoints cannot judge this pin at all"); continue; }

  // TWO ARGS, NOT AN OBJECT. The first version passed {gpx, waypoints} and therefore always got
  // false, so its silence was a bug in this probe rather than evidence about the row.
  const synth = trackIsJustTheWaypoints(row.gpx, wps);
  if (synth) console.log(`   the line IS the waypoint list joined up (${pts.length} pts) — on-track BY CONSTRUCTION, says nothing`);

  const near = (p) => Math.min(...pts.map((q) => metres(p, q)));
  const before = Math.round(near(c.was)), after = Math.round(near(now));
  console.log(`   closest approach to the track:  before ${before} m   after ${after} m   -> ${
    after < before ? "CLOSER (improved)" : after === before ? "unchanged" : "FURTHER — check this"}`);
}
