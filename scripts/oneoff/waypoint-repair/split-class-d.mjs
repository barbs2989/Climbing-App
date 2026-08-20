// Class D is 239 pins naming "some other feature". Before trying to look any of them up, split them
// by whether the named thing HAS a single defensible coordinate.
//
// This is gate 5's rule applied before the work instead of after it. A glacier, a basin, a ridge or a
// meadow is AREAL: GNIS and OSM publish one representative label point for it, and that point is not
// the pin's meaning -- "Inspiration Glacier (rope-up)" is a place ON the glacier, and the glacier's
// centroid is not where anyone ropes up. Two Mary Green Glacier pins were refused for exactly this.
// A creek or a river is LINEAR: same problem along one dimension.
//
// A lake, a pass, a col, a summit, a waterfall, a mine, a lookout -- those are points. Those are the
// ones worth asking a gazetteer about, and the rest should not be attempted at all rather than
// attempted and quietly filled with a centroid.
import fs from "fs";
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";

// The FEATURE WORD NEAREST THE END of the name is the thing the pin is: "Left Rim of Church Lake
// Basin" is a basin, not a lake. Scanning for the first match reads that one backwards.
const POINT = /\b(lakes?|tarn|pond|pass|col|saddle|notch|gap|peak|mountain|butte|dome|spire|summit|falls|spring|mine|cabin|lookout|bridge|knoll|trailhead|dock)\b/gi;
const AREAL = /\b(glacier|basin|meadows?|ridge|buttress|face|wall|cirque|moraine|snowfield|bowl|slopes?|rim|flats?|plateau|icefield|couloir|gully|headwall|bergschrund)\b/gi;
const LINEAR = /\b(creek|river|fork|drainage|valley|canyon)\b/gi;

function lastHit(name, re) {
  re.lastIndex = 0;
  let last = null, m;
  while ((m = re.exec(name))) last = { word: m[1], at: m.index };
  return last;
}

// A NAME CAN BE AN OFFSET FROM A FEATURE RATHER THAN THE FEATURE. "Notch below Pyramid Peak",
// "Meadows above Ruta Lake", "Col southwest of Shellrock Pass", "Spring below Little Giant Pass" all
// carry a perfectly good point-feature name whose coordinate is NOT where the pin goes -- the pin is
// somewhere else, defined by its offset. Looking the feature up and writing its coordinate would
// silently put the pin on the wrong thing, which is worse than leaving it fabricated: a fabricated
// pin looks odd, and a real lake in place of the meadows above it reads as data.
//
// This is gate 5 again ("a representative label point cannot locate a named PART of the feature"),
// one step out: it cannot locate a named OFFSET from it either.
const OFFSET = /\b(above|below|beneath|under|over|north of|south of|east of|west of|northeast of|northwest of|southeast of|southwest of|near|beyond|between|past|toe of|base of|head of|foot of|top of|end of|side of|rim of)\b/i;
// Names that are really a junction or a turn-off, which the junction solver's method fits, not this.
const JUNCTIONY = /\b(junction|jct|split|spur|turnoff|turn-off|fork|contour|traverse|access)\b/i;
// Trailheads have already had three dedicated passes; they are not this solver's business.
const TRAILHEADY = /\b(trailhead|parking|pullout|put-?in|road end|dock|turnout)\b/i;

const B = JSON.parse(fs.readFileSync(`${T}/remaining-classes.json`, "utf8"));
const out = { point: [], areal: [], linear: [], unclear: [], offset: [], junctiony: [], trailheady: [] };
for (const x of B.gnisNamed) {
  const nm = String(x.name || "");
  if (TRAILHEADY.test(nm)) { out.trailheady.push(x); continue; }
  if (OFFSET.test(nm)) { out.offset.push(x); continue; }
  if (JUNCTIONY.test(nm)) { out.junctiony.push(x); continue; }
  const cands = [lastHit(nm, POINT), lastHit(nm, AREAL), lastHit(nm, LINEAR)].filter(Boolean);
  if (!cands.length) { out.unclear.push(x); continue; }
  const win = cands.sort((a, b) => b.at - a.at)[0];
  const bucket = POINT.test(win.word) ? "point" : AREAL.test(win.word) ? "areal" : "linear";
  POINT.lastIndex = AREAL.lastIndex = LINEAR.lastIndex = 0;
  out[/^(lakes?|tarn|pond|pass|col|saddle|notch|gap|peak|mountain|butte|dome|spire|summit|falls|spring|mine|cabin|lookout|bridge|knoll|trailhead|dock)$/i.test(win.word) ? "point"
    : /^(glacier|basin|meadows?|ridge|buttress|face|wall|cirque|moraine|snowfield|bowl|slopes?|rim|flats?|plateau|icefield|couloir|gully|headwall|bergschrund)$/i.test(win.word) ? "areal" : "linear"]
    .push({ ...x, feature: win.word });
}
const n = B.gnisNamed.length;
console.log(`class D : ${n}\n`);
console.log(`  POINT feature, named BARE — has one defensible coordinate       : ${out.point.length}`);
console.log(`  OFFSET from a feature — the feature is not the pin              : ${out.offset.length}`);
console.log(`  a junction / split / turn-off — the junction method, not this   : ${out.junctiony.length}`);
console.log(`  a trailhead — already had three dedicated passes                : ${out.trailheady.length}`);
console.log(`  AREAL feature — a label point is NOT what the pin means         : ${out.areal.length}`);
console.log(`  LINEAR feature — a creek has no single point                    : ${out.linear.length}`);
console.log(`  unclear                                                          : ${out.unclear.length}`);

const kinds = {};
for (const x of out.point) kinds[x.feature.toLowerCase()] = (kinds[x.feature.toLowerCase()] || 0) + 1;
console.log(`\npoint features by kind: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  ")}`);
console.log(`\n--- POINT, in full ---`);
for (const x of out.point) console.log(`  ${x.route}[${x.i}]  ${x.name}   [${x.feature}] elev=${x.elev}`);
console.log(`\n--- AREAL sample (deliberately NOT attempted) ---`);
for (const x of out.areal.slice(0, 15)) console.log(`  ${x.name}   [${x.feature}]`);
fs.writeFileSync(`${T}/class-d-point.json`, JSON.stringify(out.point, null, 1));
console.log(`\n-> class-d-point.json (${out.point.length})`);
