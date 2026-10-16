#!/usr/bin/env node
// What ARE the waypoints with no coordinate? Sized before any research is attempted.
//
// These render as a row saying "No coordinate on file — this point is not on the map above" and
// are deliberately not tappable (check:waypoint-placement pins that). The question here is whether
// a coordinate is FINDABLE — and the honest answer for a name like "~Mile 10 on FR-63" is no, so
// the refusals matter as much as the hits.
import { selectAll } from "../lib/supabase-env.mjs";

// Mirrors ClimbMatchCore's wpPlaced(): a coordinate exists only if both halves are finite numbers.
// Contributed rows store lat/lng as STRINGS, and "" coerces to a finite 0.
const placed = (w) => {
  if (!w) return false;
  const { lat: la, lng: ln } = w;
  if (la == null || ln == null || la === "" || ln === "") return false;
  return Number.isFinite(Number(la)) && Number.isFinite(Number(ln));
};

const rows = await selectAll("routes", "id,name,area_id,waypoints", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let total = 0;
const out = [];
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (!wps.length) continue;
  total += wps.length;
  const bad = wps.filter((w) => !placed(w));
  if (bad.length) out.push({ id: r.id, area: r.area_id, n: wps.length, bad });
}

const nBad = out.reduce((n, r) => n + r.bad.length, 0);
console.log(`${rows.length} routes carry waypoints; ${total} waypoints in all.`);
console.log(`${nBad} unplaced across ${out.length} route(s).\n`);

// Group by the SHAPE of the name, because that decides whether research is even possible.
const kinds = [
  [/\bmile\s*~?\s*[\d.]+|~\s*mile|\bmp\s*[\d.]+|milepost/i, "a POINT ALONG A ROAD — no publisher gives a coordinate for a mile mark"],
  [/junction|crossing|bend|switchback|turn[- ]?off|fork\b/i, "a JUNCTION — locatable only by intersecting two named ways"],
  [/\bcamp\b|bivy|bivouac/i, "a CAMP"],
  [/summit|peak\b|top\b|topout/i, "a SUMMIT"],
  [/trailhead|\bth\b|parking/i, "a TRAILHEAD"],
  [/lake|creek|river|spring|water/i, "WATER"],
  [/col\b|pass\b|notch|saddle|gap\b/i, "a COL or PASS"],
];
const bucket = new Map();
for (const r of out) for (const w of r.bad) {
  const nm = String(w.name ?? "").trim();
  const k = (kinds.find(([re]) => re.test(nm)) || [null, "other"])[1];
  if (!bucket.has(k)) bucket.set(k, []);
  bucket.get(k).push({ route: r.id, nm, type: w.type, note: w.note });
}
for (const [k, v] of [...bucket.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`── ${v.length}  ${k}`);
  for (const x of v) console.log(`     ${x.route}  [${x.type ?? "?"}]  ${x.nm || "(unnamed)"}`);
  console.log("");
}
