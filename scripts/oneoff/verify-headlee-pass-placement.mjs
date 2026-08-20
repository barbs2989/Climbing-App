#!/usr/bin/env node
// A fourth check on the one applicable pin, before and after writing it.
//
// GNIS gave the coordinate, the DEM gave the ground, the row gave the elevation — three records
// agreeing to 42 ft. This adds the one audit:waypoint-geometry can make without a gpx track: does
// the pin sit sensibly among the route's OWN placed pins? A pass on the approach must lie between
// the trailhead and the summit, and be lower than both ends of the climb.
import { selectAll } from "../lib/supabase-env.mjs";

const ROUTE = "wa_vesper_peak_north_face_ragged_edge";
const placed = (w) => w && w.lat != null && w.lng != null && w.lat !== "" && w.lng !== ""
  && Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng));
const dist = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const [r] = await selectAll("routes", "id,name,area_id,waypoints", `id=eq.${ROUTE}`, { pageSize: 10 });
if (!r) { console.error(`FAIL — ${ROUTE} not found.`); process.exit(1); }
const [area] = await selectAll("areas", "id,name,lat,lng", `id=eq.${r.area_id}`, { pageSize: 10 });

const wps = r.waypoints || [];
console.log(`${r.name}  (${r.id})   peak ${area?.name}\n`);
const pt = (w) => ({ lat: Number(w.lat), lng: Number(w.lng) });
const th = wps.find((w) => placed(w) && /trailhead/i.test(w.type || w.name || ""));
const su = wps.find((w) => placed(w) && /summit/i.test(w.type || w.name || ""));
const hp = wps.find((w) => /headlee/i.test(w.name || ""));

for (const w of wps) {
  const tag = placed(w) ? `${Number(w.lat).toFixed(5)},${Number(w.lng).toFixed(5)}` : "— UNPLACED —";
  console.log(`  [${String(w.type ?? "?").padEnd(10)}] ${String(w.name ?? "").padEnd(38)} ${tag}   elev ${w.elev ?? "—"}`);
}

if (!placed(hp)) { console.log("\nHeadlee Pass is still unplaced — run the solver with --apply."); process.exit(0); }
console.log("\ngeometry:");
if (th && placed(th)) console.log(`  trailhead -> pass : ${(dist(pt(th), pt(hp)) / 1000).toFixed(2)} km`);
if (su && placed(su)) console.log(`  pass -> summit    : ${(dist(pt(hp), pt(su)) / 1000).toFixed(2)} km`);
if (th && su && placed(th) && placed(su)) {
  const direct = dist(pt(th), pt(su)) / 1000;
  const via = (dist(pt(th), pt(hp)) + dist(pt(hp), pt(su))) / 1000;
  console.log(`  trailhead -> summit direct ${direct.toFixed(2)} km, via the pass ${via.toFixed(2)} km`);
  console.log(via <= direct * 1.35
    ? `  OK — the pass is ON the way (detour ${((via / direct - 1) * 100).toFixed(0)}%), which is what a pass on an approach must be.`
    : `  ** the pass is well off the direct line (detour ${((via / direct - 1) * 100).toFixed(0)}%) — read the row before trusting it.`);
}
const elevs = wps.filter((w) => w.elev != null).map((w) => ({ n: w.name, e: Number(w.elev) }));
console.log(`  elevations on this route: ${elevs.map((x) => `${x.n} ${x.e}`).join(" | ")}`);
