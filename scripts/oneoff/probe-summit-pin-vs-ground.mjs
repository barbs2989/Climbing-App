#!/usr/bin/env node
// Which record is wrong when a route's Summit pin and its own `high_point_ft` disagree?
//
// The two columns describe the same place — where this route tops out — and 10 of the 855 WA routes
// carrying both disagree by more than 200 ft. Neither column can adjudicate the other, so this asks
// a THIRD record that owes nothing to either: the USGS DEM under the pin's own coordinate. Same
// method `audit:peak-coords` uses, and the same reason — the ground is not a second opinion written
// by the same pass.
//
// THE GROUND CONFIRMS A PIN'S PLACEMENT, NOT ITS BELONGING, and that distinction is the whole
// result. On 4 of the 10 the DEM matches the pin to within 30 ft — and the pin is still wrong for
// this route, because it names a REAL, CORRECTLY-PLACED PEAK THAT THE ROUTE DOES NOT CLIMB.
// `wa_andersons_thumb_standard` climbs Anderson's Thumb (6,785 ft) and pins "Mount Anderson summit"
// (7,330 ft, ground 7,304). Junior's Farm is eight pitches on the Mossness Wall and pins Tyler Peak
// 1,423 ft above it. A verdict of "the pin checks out, so high_point_ft is the suspect" sends you
// to change the correct column.
//
// So the fourth verdict is the important one: pin confirmed by the ground AND more than 250 ft
// above where the route tops out means the pin is not this route's summit at all. For a TRAVERSE
// that is correct data — `wa_tooth_chair_traverse` pins The Tooth and carries Chair Peak's height
// as its high point — so it is a reading list, never a repair instruction.
//
// AND DO NOT "CORRECT" A SUMMIT ELEVATION TO THE DEM. Every feature here is a sharp rock spire, the
// one place a DEM is least trustworthy: a 10 m cell averages across the summit block, so it reads
// low on a pinnacle and high on a notch. That is why `audit:waypoint-elevations` carries TOL = 2000.
// The ground is a third record for a COORDINATE on broad terrain; it is not a survey of a spire.
import { selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const rows = await selectAll("routes", "id,name,area_id,discipline,high_point_ft,waypoints",
  "id=like.wa_*&high_point_ft=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const hits = [];
let comparable = 0;
for (const r of rows) {
  if (typeof r.high_point_ft !== "number" || !Array.isArray(r.waypoints)) continue;
  const s = r.waypoints.find(w => w && /^summit$/i.test(String(w.type || "").trim()));
  if (!s) continue;
  const e = typeof s.elev === "number" ? s.elev : (typeof s.elevFt === "number" ? s.elevFt : null);
  if (e == null || typeof s.lat !== "number" || typeof s.lng !== "number") continue;
  comparable++;
  if (Math.abs(e - r.high_point_ft) > 200) hits.push({ r, s, e });
}
console.log(`${comparable} WA routes carry both a high_point_ft and a placed Summit pin with an elevation.`);
console.log(`${hits.length} disagree by more than 200 ft. Asking the ground under each pin…\n`);

for (const h of hits.sort((a, b) => (b.e - b.r.high_point_ft) - (a.e - a.r.high_point_ft))) {
  let g = null;
  try { g = await elevationAt(h.s.lat, h.s.lng); } catch (err) { g = null; }
  const dPin = g == null ? null : Math.round(Math.abs(g - h.e));
  const dHp = g == null ? null : Math.round(Math.abs(g - h.r.high_point_ft));
  let verdict = "ground unavailable";
  if (g != null) {
    const pinOk = dPin <= 250, hpOk = dHp <= 250;
    const gap = h.e - h.r.high_point_ft;
    // Order matters: the ambiguous case (the ground vouches for BOTH) has to be taken first, or a
    // route where the two numbers are 400 ft apart and the DEM sits between them is reported as a
    // confident finding. wa_lone_wolf is exactly that, and an earlier ordering mislabelled it.
    if (pinOk && hpOk) verdict = "ground cannot separate them — both within 250 ft of it";
    else if (pinOk && gap > 250) verdict = "PIN IS A REAL PEAK ABOVE WHERE THE ROUTE TOPS OUT — placed correctly, and not this route's summit";
    else if (pinOk && gap < -250) verdict = "pin is a real LOWER summit — correct on a traverse; otherwise high_point_ft belongs to a different peak";
    else if (hpOk) verdict = "ground agrees with high_point_ft; the pin's elevation is the outlier — read the DEM caveat before changing it";
    else verdict = "GROUND AGREES WITH NEITHER — suspect the pin's COORDINATE";
  }
  console.log(`${h.r.id}  [${h.r.discipline}]  area=${h.r.area_id}`);
  console.log(`   high_point_ft ${h.r.high_point_ft}   pin "${h.s.name}" ${h.e}   ground ${g == null ? "n/a" : Math.round(g)}`);
  console.log(`   |ground-pin| ${dPin ?? "n/a"}   |ground-hp| ${dHp ?? "n/a"}`);
  console.log(`   -> ${verdict}\n`);
}
process.exitCode = 0;
