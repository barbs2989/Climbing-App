#!/usr/bin/env node
// Could a researched coordinate for an unplaced pin be CORROBORATED at all?
//
// This repo's bar for writing a researched pin is that it lands on the route's own track
// (verify-researched-pin-coords.mjs) — Cutthroat Pass went 2,464 m off to 36 m on substituting the
// USGS value, which is agreement with a record nobody consulted while publishing it. The same
// check REFUSED Longs Pass, where the USGS coordinate was further from the track than the stored
// one. So: no track, no corroboration, and per this repo's own discipline no write.
//
// A track that is merely the route's own waypoints joined up is NOT a second opinion — lib/track.js
// exists for exactly that, and 201 of 580 WA gpx routes are that shape.
import { selectAll } from "../lib/supabase-env.mjs";

const placed = (w) => {
  if (!w) return false;
  const { lat: la, lng: ln } = w;
  if (la == null || ln == null || la === "" || ln === "") return false;
  return Number.isFinite(Number(la)) && Number.isFinite(Number(ln));
};

const rows = await selectAll("routes", "id,name,area_id,waypoints,gpx", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const near = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

let withTrack = 0, synthetic = 0, noTrack = 0, pinsCorroborable = 0, pinsNot = 0;
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const bad = wps.filter((w) => !placed(w));
  if (!bad.length) continue;

  const pts = Array.isArray(r.gpx) ? r.gpx.filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })) : [];
  let verdict;
  if (pts.length < 2) { verdict = "NO TRACK"; noTrack++; }
  else {
    // Is the line just the pins joined up? Every vertex within 30 m of one of this route's own
    // placed waypoints means the track is a copy of the pins, not an independent record.
    const own = wps.filter(placed).map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) }));
    const isCopy = own.length > 0 && pts.every((p) => own.some((o) => near(p, o) < 30));
    if (isCopy) { verdict = `SYNTHETIC track (${pts.length} pts, = its own pins)`; synthetic++; }
    else { verdict = `track ${pts.length} pts`; withTrack++; }
  }
  const ok = verdict.startsWith("track");
  ok ? (pinsCorroborable += bad.length) : (pinsNot += bad.length);
  console.log(`${ok ? "  " : "**"} ${r.id.padEnd(46)} ${String(bad.length).padStart(2)} unplaced   ${verdict}`);
}
console.log(`\nroutes: ${withTrack} with a real track, ${synthetic} whose track is its own pins, ${noTrack} with none.`);
console.log(`pins:   ${pinsCorroborable} could be checked against a track, ${pinsNot} could not.`);
