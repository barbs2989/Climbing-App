#!/usr/bin/env node
// With no track on any of the 16 routes, what evidence is left for an unplaced pin?
//
// Three records could stand in, each already used elsewhere in this repo:
//   elev  — the waypoint's own stated height, checkable against the DEM (the ground is a third
//           record; audit:waypoint-elevations and the camp-elevation solver both lean on it)
//   sibs  — the route's OTHER placed pins, which is how audit:waypoint-geometry reaches routes
//           with no gpx at all
//   peak  — the route's own area coordinate, the anchor audit:waypoints uses for trackOffItsPeak
//
// A pin with none of these cannot be verified by anything, and a coordinate written for it would
// be a claim resting on a name match alone — the failure this catalog has paid for repeatedly.
import { selectAll } from "../lib/supabase-env.mjs";

const placed = (w) => {
  if (!w) return false;
  const { lat: la, lng: ln } = w;
  if (la == null || ln == null || la === "" || ln === "") return false;
  return Number.isFinite(Number(la)) && Number.isFinite(Number(ln));
};

const rows = await selectAll("routes", "id,name,area_id,waypoints", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }
const touched = rows.filter((r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => !placed(w)));
const areaIds = [...new Set(touched.map((r) => r.area_id).filter(Boolean))];
const areas = await selectAll("areas", "id,name,lat,lng", `id=in.(${areaIds.join(",")})`, { pageSize: 1000 });
const areaById = new Map(areas.map((a) => [a.id, a]));

// POINT-LIKE means one coordinate IS the place. A ridge, a traverse, a cliff band or a drainage is
// a LINE or an AREA — a label point cannot locate an edge, which is why 8 of the gazetteer's 15
// hits were unusable.
const LINEAR = /ridge\b|traverse|cliff|band\b|drainage|streambed|slopes\b|flank|gully|couloir|basin\b|wall\b|cirque|headwaters|step\b|barrier|chasm|road\b|crest\b/i;
const POINTY = /\bcol\b|\bpass\b|saddle|notch|gap\b|summit|lake\b|camp\b|junction|trailhead/i;

let n = 0;
const rowsOut = [];
for (const r of touched) {
  const wps = r.waypoints;
  const sibs = wps.filter(placed).length;
  const area = areaById.get(r.area_id);
  for (const w of wps.filter((x) => !placed(x))) {
    n++;
    const nm = String(w.name ?? "").trim();
    const shape = LINEAR.test(nm) ? "LINEAR/AREAL" : POINTY.test(nm) ? "point-like" : "unclear";
    const elev = w.elev ?? w.elevM ?? null;
    rowsOut.push({ route: r.id, nm, type: w.type, shape, elev, sibs, peak: area && area.lat != null ? "yes" : "no" });
  }
}

const pointy = rowsOut.filter((x) => x.shape === "point-like");
console.log(`${n} unplaced pins.\n`);
console.log(`by shape:   point-like ${pointy.length}   LINEAR/AREAL ${rowsOut.filter((x) => x.shape === "LINEAR/AREAL").length}   unclear ${rowsOut.filter((x) => x.shape === "unclear").length}`);
console.log(`stated elev: ${rowsOut.filter((x) => x.elev != null).length} of ${n}   (point-like: ${pointy.filter((x) => x.elev != null).length} of ${pointy.length})`);
console.log(`placed siblings >=2: ${rowsOut.filter((x) => x.sibs >= 2).length}   peak coord: ${rowsOut.filter((x) => x.peak === "yes").length}\n`);

console.log("POINT-LIKE pins — the only ones a gazetteer could locate at all:\n");
for (const x of pointy) {
  console.log(`  ${x.route.padEnd(44)} [${String(x.type ?? "?").padEnd(9)}] ${x.nm}`);
  console.log(`     elev=${x.elev ?? "—"}   placed siblings=${x.sibs}   peak coord=${x.peak}`);
}
