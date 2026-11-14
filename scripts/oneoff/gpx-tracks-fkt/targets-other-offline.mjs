// Targets outside Washington, the same way targets-wa-offline.mjs builds Washington's: routes with a
// Trailhead and a Summit pin, from the 2026-10-29 pin snapshot. No database.
// Usage: FKT_DIR=research-data/gpx-tracks-fkt-other-2026-10-29 node targets-other-offline.mjs
import fs from "fs";
const D = process.env.FKT_DIR || "research-data/gpx-tracks-fkt-other-2026-10-29";
fs.mkdirSync(D, { recursive: true });
const STATES = new Set(["ca", "co", "or", "bc", "id", "mt", "wy"]);
const pins = JSON.parse(fs.readFileSync("research-data/gpx-named-pins-2026-10-29/all-pins.json", "utf8"));
const by = {};
for (const p of pins) if (STATES.has(p.id.slice(0, 2)) && p.id[2] === "_") (by[p.id] ||= { id: p.id, name: p.route, discipline: p.disc, waypoints: [] }).waypoints.push({ type: p.type, name: p.name, lat: p.lat, lng: p.lng });
const out = Object.values(by).filter(r => r.waypoints.some(w => /trailhead/i.test(w.type || "")) && r.waypoints.some(w => /summit/i.test(w.type || "")));
fs.writeFileSync(`${D}/targets.json`, JSON.stringify(out));
console.log(Object.keys(by).length, "routes with pins in", [...STATES].join(","), "->", out.length, "with a trailhead and a summit pin");
