// How big is the FKT wave outside Washington? Offline: routes with a Trailhead and a Summit pin
// per state (from the 2026-10-29 pin snapshot), and FKT routes per state (from the crawl log).
// Usage: node size-other-states.mjs <crawl state.tsv>
import fs from "fs";
const pins = JSON.parse(fs.readFileSync("research-data/gpx-named-pins-2026-10-29/all-pins.json", "utf8"));
const by = {};
for (const p of pins) {
  if (p.id.startsWith("wa_")) continue;
  const s = (by[p.id] ||= new Set());
  if (/trailhead/i.test(p.type || "")) s.add("T");
  if (/summit/i.test(p.type || "")) s.add("S");
}
const st = {};
for (const [id, s] of Object.entries(by)) if (s.has("T") && s.has("S")) st[id.slice(0, 2)] = (st[id.slice(0, 2)] || 0) + 1;
console.log("non-WA routes with trailhead + summit pins, by id prefix:", st);
const fkt = {};
for (const line of fs.readFileSync(process.argv[2], "utf8").split("\n")) { const s = line.split("\t")[2]; if (s) fkt[s] = (fkt[s] || 0) + 1; }
console.log("FKT routes by state (top 15):", Object.entries(fkt).sort((a, b) => b[1] - a[1]).slice(0, 15));
