// One-shot edit: replace the two byte-identical inline waypoint lists in RouteDetail.jsx
// with <WaypointList/>. Done by script rather than by hand because both live on dense
// 40,000-character lines where a hand edit keys on the wrong occurrence — the trap
// CLAUDE.md records for check:log's injection case 2. Refuses to write unless it matched
// exactly twice.
import fs from "fs";

const F = "RouteDetail.jsx";
const src = fs.readFileSync(F, "utf8");

const START = "{(route.waypoints&&route.waypoints.length)?route.waypoints.map(";
const END = ">Add waypoints</button></div>}";

let out = "";
let i = 0, n = 0;
for (;;) {
  const a = src.indexOf(START, i);
  if (a < 0) { out += src.slice(i); break; }
  const b = src.indexOf(END, a);
  if (b < 0) throw new Error("found a start with no matching end — refusing to write");
  const block = src.slice(a, b + END.length);

  const m = block.match(/>(No named waypoints yet[^<]*)</);
  if (!m) throw new Error("could not lift the empty-state copy out of block " + (n + 1));
  const empty = m[1];

  out += src.slice(i, a);
  out += `{<WaypointList waypoints={route.waypoints} onFocus={focusWaypoint} emptyCopy={${JSON.stringify(empty)}} onAdd={function(){setFixOpenSection("waypoints");setFixOpen(true);}}/>}`;
  i = b + END.length;
  n++;
}

if (n !== 2) throw new Error(`expected exactly 2 inline waypoint lists, matched ${n} — refusing to write`);
fs.writeFileSync(F, out);
console.log(`replaced ${n} inline waypoint lists with <WaypointList/>`);
console.log(`file ${src.length} -> ${out.length} chars`);
