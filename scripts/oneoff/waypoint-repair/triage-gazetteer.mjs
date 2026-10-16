// Triage the gazetteer hits before any of them is applied.
//
// RULE 1 -- a label point cannot locate an EDGE. GNIS gives ONE coordinate per feature. For a
// point-like feature (Summit, Gap, Lake, Falls) that coordinate IS the place. For a LINEAR feature
// (Stream, Ridge, Canyon) or an AREAL one (Basin, Flat, Swamp, Valley) it is a cartographic label,
// and the pin is somewhere on the edge or along the length -- which the label cannot say. Layer 6
// is named "Streams (MOUTH)" outright: it returns where the creek ENDS, which is the one point on
// it a route never crosses.
//
// RULE 2 -- which test flagged this pin? The decimal test says the coordinate was ARITHMETIC
// (>8 decimals is the residue of dividing a span). The run test says the pin lies on a line, which
// is also true of the two ANCHORS the line was drawn between. A pin flagged only by the run test
// and landing metres from a real named feature was never interpolated -- it is an anchor, and the
// right verdict is CONFIRMED, not repaired.
import fs from "fs";
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";

const POINTLIKE = new Set(["Summit", "Gap", "Lake", "Falls", "Spring", "Well", "Pillar", "Crossing", "Locale", "Reservoir"]);
const LINEAR = new Set(["Stream", "Ridge", "Canyon", "Arroyo", "Channel", "Trail", "Valley", "Rapids"]);
const AREAL = new Set(["Basin", "Flat", "Swamp", "Area", "Woods", "Bench", "Slope", "Bar", "Plain", "Glacier", "Island", "Range", "Cliff"]);

const solved = JSON.parse(fs.readFileSync(`${T}/gazetteer-solved.json`, "utf8"));
const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };
const orig = new Map();
for (const r of fab) for (const p of r.pins) orig.set(`${r.id}#${p.i}`, p);

const CONFIRM_M = 150;   // an interpolation does not land this close to a named feature by chance

const apply = [], confirm = [], reject = [], hold = [];
for (const s of solved) {
  const o = orig.get(`${s.route}#${s.i}`) || {};
  const decimals = Math.max(dec(o.lat), dec(o.lng));
  const byDecimal = decimals > 8;
  const shape = POINTLIKE.has(s.cls) ? "point" : LINEAR.has(s.cls) ? "linear" : AREAL.has(s.cls) ? "areal" : "unknown";
  const rec = { ...s, decimals, byDecimal, shape, movedM: Math.round(s.movedKm * 1000) };

  if (shape === "linear") { reject.push({ ...rec, why: `${s.cls} is LINEAR -- GNIS returns a label point${s.layer === 6 ? " (layer 6 is the stream MOUTH)" : ""}, not where the route meets it` }); continue; }
  if (shape === "areal") { reject.push({ ...rec, why: `${s.cls} is AREAL -- the label point is not the pin` }); continue; }
  if (shape === "unknown") { hold.push({ ...rec, why: `feature class "${s.cls}" is not classified -- decide by hand` }); continue; }

  if (rec.movedM <= CONFIRM_M) {
    confirm.push({ ...rec, why: byDecimal
      ? `an ARITHMETIC coordinate (${decimals} dp) landing ${rec.movedM} m from the real feature -- suspicious, read it`
      : `run-test-only flag, ${rec.movedM} m from the gazetteer feature -- this pin was an ANCHOR, never interpolated` });
    continue;
  }
  if (s.elevOk === false) { hold.push({ ...rec, why: `moves ${rec.movedM} m AND the ground contradicts the stored elevation -- the wrong feature may have been found` }); continue; }
  apply.push(rec);
}

const line = r => `  ${r.route}[${r.i}] ${String(r.name).slice(0, 44)}\n      [${r.cls}/${r.shape}] moves ${r.movedM} m, ${r.decimals} dp, flagged by ${r.byDecimal ? "DECIMAL+run" : "run only"}, elev ${r.elevOk === null ? "n/a" : r.elevOk ? "agrees" : "DISAGREES"}\n      ${r.why || ""}`;

console.log(`gazetteer hits triaged : ${solved.length}\n`);
console.log(`APPLY -- point feature, genuinely relocates, elevation not contradicted : ${apply.length}`);
apply.forEach(r => console.log(line(r)));
console.log(`\nCONFIRMED, not repaired -- the pin was already right : ${confirm.length}`);
confirm.forEach(r => console.log(line(r)));
console.log(`\nHOLD : ${hold.length}`);
hold.forEach(r => console.log(line(r)));
console.log(`\nREJECT -- the gazetteer cannot locate this kind of feature : ${reject.length}`);
reject.forEach(r => console.log(line(r)));

fs.writeFileSync(`${T}/gazetteer-apply.json`, JSON.stringify(apply, null, 1));
fs.writeFileSync(`${T}/gazetteer-confirmed.json`, JSON.stringify(confirm, null, 1));
console.log(`\n-> gazetteer-apply.json (${apply.length}), gazetteer-confirmed.json (${confirm.length})`);
