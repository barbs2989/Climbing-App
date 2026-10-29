// The same target list as targets-wa.mjs, built WITHOUT the database (it was timing out on
// 2026-10-29) from the pin snapshot taken earlier that day. Whether a route's current track is
// already complete is left to apply.mjs, which re-reads each row and skips complete ones.
import fs from "fs";
const D = "research-data/gpx-tracks-fkt-wa-2026-10-29";
fs.mkdirSync(D, { recursive: true });
const pins = JSON.parse(fs.readFileSync("research-data/gpx-named-pins-2026-10-29/all-pins.json", "utf8"));
const by = {};
for (const p of pins) if (p.id.startsWith("wa_")) (by[p.id] ||= { id: p.id, name: p.route, discipline: p.disc, waypoints: [] }).waypoints.push({ type: p.type, name: p.name, lat: p.lat, lng: p.lng });
const out = Object.values(by).filter(r => r.waypoints.some(w => /trailhead/i.test(w.type || "")) && r.waypoints.some(w => /summit/i.test(w.type || "")));
fs.writeFileSync(`${D}/targets.json`, JSON.stringify(out));
console.log(Object.keys(by).length, "WA routes with pins;", out.length, "have a trailhead and a summit pin");
