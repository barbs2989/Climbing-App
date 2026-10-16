// Does the partial-track caveat blame the TRACK when the two records simply describe DIFFERENT
// approaches to the same peak?
//
// wa_mount_barnes_scramble renders "it starts 18.9 km from the trailhead and stops 6.4 km short
// of the summit", which reads as an accusation against the line. It is wrong. That route's own
// approach text names TWO approaches — west via Sol Duc over the Bailey Range, east via the
// Elwha River Trail from Whiskey Bend — and its eight waypoints are all on the Sol Duc one while
// its 438-point gpx is the Elwha one. Both records are complete and correct; they are just not
// records of the same journey. Calling that line "partial" points the reader at the wrong half,
// which is the exact failure mode audit:map-pins already warns about for two-trailhead routes.
//
// The discriminator is whether ANY waypoint lies on the line. A genuinely climb-only track still
// carries its UPPER pins — summit, high camp, the col — because the recording covers that part
// of the journey; only the approach pins are off it. A track of a different approach carries
// NONE of them, because it never passes any of the places the pins name.
//
// Read-only. Measures how many of the 68 flagged routes are which.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackCoverage } from "../../lib/track.js";

const k = anonKey();
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const norm = (wps) => (Array.isArray(wps) ? wps : []).map((w) => ({ ...w, lat: num(w.lat), lng: num(w.lng) }));
/* Same per-type tolerances the off-track audits use — a Bailout pin is SUPPOSED to be off the
   line, so counting it as "on the track" or "off it" on a flat 120 m would mis-classify. */
const TOL = { Trailhead: 250, Summit: 250, Junction: 250, Topout: 250, Water: 400, Campsite: 500, Hazard: 600, Bailout: 2000 };
const tolOf = (t) => TOL[t] ?? 300;

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=like.wa_*&gpx=not.is.null&waypoints=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const partial = [], different = [];
for (const r of rows) {
  const wps = norm(r.waypoints);
  const cov = trackCoverage(r.gpx, wps);
  if (!cov) continue;
  const line = (r.gpx || []).map((p) => Array.isArray(p) ? { lat: Number(p[0]), lng: Number(p[1]) } : null).filter((p) => p && Number.isFinite(p.lat));
  const placed = wps.filter((w) => w.lat != null);
  const on = placed.filter((w) => Math.min(...line.map((q) => hvM({ lat: w.lat, lng: w.lng }, q))) <= tolOf(String(w.type)));
  const rec = { id: r.id, name: r.name, pins: placed.length, on: on.length, cov };
  (on.length ? partial : different).push(rec);
}

console.log(`\n=== of the routes the partial-track caveat fires on, which are actually partial? ===`);
console.log(`  ${partial.length} PARTIAL — at least one of the route's own pins is on the line, so it is the same journey, recorded incompletely`);
console.log(`  ${different.length} DIFFERENT APPROACH — NOT ONE pin is on the line; the two records describe different ways up the peak\n`);
console.log(`--- DIFFERENT APPROACH (the caveat currently blames the track on these, and should not) ---`);
for (const f of different) console.log(`  ${f.id.padEnd(46)} ${f.on}/${f.pins} pins on the line`);
console.log(`\n--- PARTIAL (correctly flagged), first 15 of ${partial.length} ---`);
for (const f of partial.slice(0, 15)) console.log(`  ${f.id.padEnd(46)} ${f.on}/${f.pins} pins on the line`);
