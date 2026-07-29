// Sweep WA peaks for duplicate route rows, the way Mount Adams turned out to have three
// rows for its one standard route.
//
// Read-only. Prints candidates and writes JSON; changes nothing.
//
// Three independent signals, because no single one is reliable:
//
//   1. NAME COLLISION — two routes in the same area whose names normalise to the same
//      string. "South Climb (South Spur)" and "South Spur Route" both reduce to a bag of
//      significant words that overlaps heavily. Parenthetical aliases are the usual tell.
//   2. ID CONVENTION SPLIT — the same trailing slug under both id conventions, e.g.
//      `adams_northwest_ridge` beside `wa_mount_adams_northwest_ridge`. Sometimes a real
//      duplicate, sometimes two genuinely different lines (Adams' Northwest Ridge vs North
//      Face of Northwest Ridge), so this only ever flags for review.
//   3. STUB ROWS — rows with almost nothing populated sitting in an area that has richer
//      rows. `wa_mount_adams_south_side` had 3 of 22 fields and no discipline, grade,
//      distance, gain, hazards or track.
//
// Deliberately NOT flagged: distance/gain disagreements alone. Two rows for the same line
// often differ because one figure is one-way and the other round trip — which is a data bug
// worth fixing, but on its own it doesn't prove the rows are duplicates.

import { selectAll } from "./lib/supabase-env.mjs";

const STOP = new Set(["the","a","of","route","climb","via","and"]);

// A first pass at this stripped parentheticals and treated modifiers as noise, and it was
// wrong in the most misleading direction: it called "Liberty Crack" and "Liberty Crack
// (Free)" duplicates, along with "North Face" vs "North Face Var. Right (Directisimo)" and
// "South Buttress" vs "Complete South Buttress". Those are distinct lines, and the very words
// it discarded are what distinguish a variation from its parent.
//
// So modifiers are now DISTINGUISHERS: if one name carries one the other doesn't, the two are
// treated as different routes, not duplicates. Aspect words stay significant for the same
// reason — north and south faces are different climbs.
const DISTINGUISHER = new Set(["direct","directisimo","direct2","complete","free","var","variation",
  "center","centre","central","left","right","upper","lower","integral","original","true","full",
  "alternate","alt","finish","start","exit","entry","winter","summer","ski","linkup","traverse"]);

const words = s => String(s || "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .split(" ").filter(w => w && !STOP.has(w));

const distinguishers = s => new Set(words(s).filter(w => DISTINGUISHER.has(w)));
const core = s => words(s).filter(w => !DISTINGUISHER.has(w));

// Only a pair whose CORE words match exactly AND whose distinguisher sets match is a
// candidate. Anything else is a variation, or a different line.
const sameRoute = (a, b) => {
  const da = distinguishers(a), db = distinguishers(b);
  if (da.size !== db.size || [...da].some(w => !db.has(w))) return false;
  // ORDER MATTERS. Sorting these first made Hozomeen's "South Ridge (North Peak)" and
  // "North Ridge (South Peak)" compare equal — different summits of the same mountain,
  // identical word sets. Compare the sequences as written.
  const ca = core(a), cb = core(b);
  return ca.length > 0 && ca.length === cb.length && ca.every((w, i) => w === cb[i]);
};

const FIELDS = ["name","discipline","grade","pitches","dist_km","gain_ft","high_point_ft","season",
  "approach","descent","access","hazards","gear","gpx","waypoints","itinerary","overview","beta"];
const populated = r => FIELDS.filter(k => {
  const v = r[k];
  return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
}).length;

const areas = await selectAll("areas", "id,name,area_type", "area_type=eq.peak");
const waPeaks = areas.filter(a => a.id.startsWith("wa_"));
console.log(`${waPeaks.length} WA peak areas\n`);

const rows = await selectAll("routes", `id,name,area_id,${FIELDS.join(",")}`,
  "id=gte.wa_&id=lt.wa%60", { pageSize: 500 });
// Old-convention ids (adams_*, etc.) fall outside the wa_ range, so pull anything whose area
// is a WA peak regardless of its own id prefix.
const extra = await selectAll("routes", `id,name,area_id,${FIELDS.join(",")}`,
  `area_id=in.(${waPeaks.map(a => a.id).join(",")})`, { pageSize: 500 });
const all = [...rows, ...extra.filter(e => !rows.some(r => r.id === e.id))];

const byArea = {};
for (const r of all) {
  if (!waPeaks.some(a => a.id === r.area_id)) continue;
  (byArea[r.area_id] = byArea[r.area_id] || []).push(r);
}
const areaName = Object.fromEntries(waPeaks.map(a => [a.id, a.name]));

const nameHits = [], convHits = [], stubs = [];
for (const [aid, list] of Object.entries(byArea)) {
  const med = list.map(populated).sort((a, b) => a - b)[Math.floor(list.length / 2)];
  for (const r of list) {
    const n = populated(r);
    if (list.length > 1 && n <= 4 && n < med - 4) stubs.push({ area: areaName[aid], id: r.id, name: r.name, populated: n, areaMedian: med });
  }
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    const slug = x => x.id.replace(/^wa_/, "").replace(new RegExp("^" + aid.replace(/^wa_/, "") + "_?"), "");
    if (slug(a) && slug(a) === slug(b)) {
      convHits.push({ area: areaName[aid], a: a.id, b: b.id, aName: a.name, bName: b.name });
      continue;
    }
    if (sameRoute(a.name, b.name)) nameHits.push({ area: areaName[aid], a: a.id, b: b.id, aName: a.name, bName: b.name,
      aPop: populated(a), bPop: populated(b), aDist: a.dist_km, bDist: b.dist_km,
      // The Adams tell: same line, one figure round trip and the other one-way.
      distRatio: (a.dist_km && b.dist_km) ? +(Math.max(a.dist_km, b.dist_km) / Math.min(a.dist_km, b.dist_km)).toFixed(2) : null });
  }
}

const show = (title, arr, fmt) => {
  console.log("=".repeat(78)); console.log(`${title}: ${arr.length}`); console.log("=".repeat(78));
  arr.slice(0, 30).forEach(fmt);
  if (arr.length > 30) console.log(`… ${arr.length - 30} more in the JSON`);
  console.log("");
};

show("NAME COLLISIONS (same area, names reduce to the same words)", nameHits, h => {
  console.log(`${h.area}`);
  console.log(`   ${h.a.padEnd(44)} "${h.aName}"   ${h.aPop} fields, dist=${h.aDist}${h.distRatio?"  (ratio "+h.distRatio+")":""}`);
  console.log(`   ${h.b.padEnd(44)} "${h.bName}"   ${h.bPop} fields, dist=${h.bDist}`);
});
show("ID-CONVENTION SPLITS (same slug, both conventions) — review, may be distinct lines", convHits, h => {
  console.log(`${h.area}\n   ${h.a}  "${h.aName}"\n   ${h.b}  "${h.bName}"`);
});
show("STUB ROWS (nearly empty, beside richer rows in the same area)", stubs, s => {
  console.log(`${String(s.area).padEnd(28)} ${s.id.padEnd(44)} "${s.name}"  ${s.populated}/${FIELDS.length} fields (area median ${s.areaMedian})`);
});

const fs = await import("fs");
fs.writeFileSync(new URL("../research/duplicate-route-audit.json", import.meta.url),
  JSON.stringify({ generated: "2026-07-29", waPeakAreas: waPeaks.length, routesExamined: all.length,
    nameCollisions: nameHits, idConventionSplits: convHits, stubRows: stubs }, null, 1));
console.log("wrote research/duplicate-route-audit.json");
process.exit(0);
