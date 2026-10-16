// One-shot edit: wrap both <GPXMap/> call sites in RouteDetail.jsx in the ref'd div the
// waypoint rows scroll back into view, and hand the map the focus token. Scripted for the
// same reason as the waypoint-list swap — both sites sit on dense lines and a hand edit
// keys on the wrong occurrence. Refuses to write unless it matched exactly twice.
import fs from "fs";

const F = "RouteDetail.jsx";
const src = fs.readFileSync(F, "utf8");

const OPEN = "<GPXMap pts={route.gpxPts}";
const CLOSE = "/>";

let out = "", i = 0, n = 0;
for (;;) {
  const a = src.indexOf(OPEN, i);
  if (a < 0) { out += src.slice(i); break; }
  const b = src.indexOf(CLOSE, a);
  if (b < 0) throw new Error("unterminated <GPXMap");
  const tag = src.slice(a, b + CLOSE.length);
  if (tag.includes("focusWp=")) throw new Error("already wired — refusing to double-wrap");
  out += src.slice(i, a);
  out += `<div ref={mapWrapRef}>` + tag.slice(0, -CLOSE.length) + ` focusWp={wpFocus}` + CLOSE + `</div>`;
  i = b + CLOSE.length;
  n++;
}
if (n !== 2) throw new Error(`expected exactly 2 <GPXMap/> sites, matched ${n} — refusing to write`);
fs.writeFileSync(F, out);
console.log(`wired ${n} GPXMap call sites for waypoint focus`);
