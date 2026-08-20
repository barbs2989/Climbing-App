// Does the derived-trailhead block actually DRAW, and does it stay silent when it should?
//
// The marker is created inside GPXMap's useEffect via Leaflet, so `renderToStaticMarkup` cannot see
// it -- effects do not run there, which is why check:bare can prove nothing about this. Rather than
// leave the logic unverified until somebody has a browser and remembers, the block is EXTRACTED from
// the real source and run against a stub `L` that records what was drawn.
//
// What this proves: the gate, the two markers, the tooltip/popup, and that map bounds are extended.
// What it does NOT prove: that Leaflet paints them on a real tile layer. That needs a browser.
import fs from "fs";

const SRC = new URL("../../ClimbMatchCore.jsx", import.meta.url).pathname;
const src = fs.readFileSync(SRC, "utf8");
// Anchor on the COMMENT and take the `if(` that follows it, deliberately NOT on the gate expression
// itself. Anchoring on the gate makes any change to it report ANCHOR LOST — fail-closed and safe,
// but it means the one edit most worth catching (widening the gate, which would put a lone marker on
// the 10 routes that correctly draw no map) can never be TESTED, only refused. Injection case 2
// found exactly that.
const ANCHOR = "/* THE START POINT THE DIRECTIONS BUTTON USES,";
const at = src.indexOf(ANCHOR);
if (at < 0) { console.log("ANCHOR LOST: the derived-trailhead block is not where this probe expects it.\nNothing below was checked."); process.exit(1); }
const i = src.indexOf("if(", src.indexOf("*/", at));
if (i < 0) { console.log("ANCHOR LOST: no `if(` follows the derived-trailhead comment.\nNothing below was checked."); process.exit(1); }
let d = 0, started = false, j = i;
for (; j < src.length; j++) {
  if (src[j] === "{") { d++; started = true; }
  else if (src[j] === "}") { d--; if (started && d === 0) { j++; break; } }
}
const block = src.slice(i, j);
// Only test for what proves the EXTRACTION worked. `b.extend` was in here once, and deleting it from
// the app made this print "extraction is wrong" for a real defect the assertions below catch and
// name properly — a guard sending its reader to the wrong repair, which is worse than one that says
// nothing. A missing marker means the extraction broke; a missing bounds call is a finding.
if (!/circleMarker/.test(block)) {
  console.log("the extracted block draws no marker at all — extraction is wrong, not the app.");
  process.exit(1);
}

// A stub Leaflet that records rather than renders.
function run({ hasPts, wpPts, derivedTrailhead, startBounds }) {
  const drawn = [];
  const mkMarker = (ll, opts) => {
    const rec = { ll, opts, popup: null, tooltip: null, added: false };
    const self = {
      bindPopup(h) { rec.popup = h; return self; },
      bindTooltip(t) { rec.tooltip = t; return self; },
      addTo() { rec.added = true; drawn.push(rec); return self; },
    };
    return self;
  };
  const L = { circleMarker: mkMarker, latLngBounds: ll => ({ _pts: [...ll], isValid: () => true, extend(p) { this._pts.push(p); } }) };
  const map = {};
  const wc = { Trailhead: "#2ecc71" };
  const C = { green: "#2ecc71" };
  let b = startBounds;
  // `b` is reassigned inside the block when it starts out null, so it has to come back out; `drawn`
  // is filled through the stub's closure and needs no plumbing.
  const fn = new Function("hasPts", "wpPts", "derivedTrailhead", "L", "map", "wc", "C", "b", `${block} return b;`);
  return { drawn, b: fn(hasPts, wpPts, derivedTrailhead, L, map, wc, C, b) };
}

const TH = { lat: 48.51454, lng: -120.64332, name: "SR-20 hairpin / pond pullout", derived: true };
let fails = 0;
const check = (label, cond, detail) => { console.log(`  ${cond ? "ok  " : "FAIL"}  ${label}${detail ? " — " + detail : ""}`); if (!cond) fails++; };

console.log("the derived trailhead DRAWS when the map already has content");
{
  const bounds = { _pts: [[48.5, -120.6]], isValid: () => true, extend(p) { this._pts.push(p); } };
  const { drawn, b } = run({ hasPts: false, wpPts: [{ lat: 48.5, lng: -120.6 }], derivedTrailhead: TH, startBounds: bounds });
  check("two markers are added (a 14px tap target and the visible 7px ring)", drawn.length === 2, `${drawn.length} added`);
  const ring = drawn.find(m => m.opts && m.opts.radius === 7);
  check("the visible marker is DERIVED-styled: dashed and hollow, not a solid waypoint pin",
    !!ring && ring.opts.dashArray === "3,3" && ring.opts.fillOpacity < 0.5,
    ring ? `dashArray=${ring.opts.dashArray} fillOpacity=${ring.opts.fillOpacity}` : "no 7px ring");
  check("it does not imitate a waypoint pin (those are radius 6, white ring, fillOpacity 0.95)",
    !!ring && !(ring.opts.radius === 6 && ring.opts.color === "#ffffff"));
  check("both markers carry the popup and the tooltip", drawn.every(m => m.popup && m.tooltip));
  check("the popup says the point is not in the waypoint list", drawn.some(m => /not in the list below/.test(m.popup || "")));
  check("the tooltip names it as derived", drawn.some(m => /approach logistics/i.test(m.tooltip || "")));
  check("map bounds were extended to include it", b && b._pts.length === 2, b ? `${b._pts.length} point(s)` : "no bounds");
}

console.log("\nand stays SILENT where it would be wrong");
{
  const r1 = run({ hasPts: false, wpPts: [], derivedTrailhead: TH, startBounds: null });
  check("no map content (no track, no placed pins) — the 10 routes that draw no map are untouched", r1.drawn.length === 0, `${r1.drawn.length} drawn`);
  const r2 = run({ hasPts: true, wpPts: [], derivedTrailhead: null, startBounds: null });
  check("no derived trailhead — nothing is invented", r2.drawn.length === 0, `${r2.drawn.length} drawn`);
  const r3 = run({ hasPts: true, wpPts: [], derivedTrailhead: { lat: 48.5, lng: null }, startBounds: null });
  check("a half-null coordinate is refused rather than drawn at 0", r3.drawn.length === 0, `${r3.drawn.length} drawn`);
}

console.log(fails ? `\n${fails} assertion(s) failed.` : "\nok — the derived trailhead draws distinctly when it should and not otherwise.\n(Leaflet actually painting it still needs a browser; this proves the logic, not the pixels.)");
process.exit(fails ? 1 : 0);

// INJECTION-TESTED 3/3 against ClimbMatchCore.jsx, each restored to sha 3bb5dcee afterwards:
//
//  1. make the derived marker imitate a recorded waypoint pin (radius 6, white ring, fillOpacity
//     0.95)  ->  2 assertions fail, naming the style. This is the defect that matters most: the
//     whole point of the choice was that the marker must NOT read as an N+1st waypoint.
//  2. drop the `hasPts||wpPts.length>0` content gate  ->  fails, naming the 10 routes that
//     correctly draw no map. This case is why the anchor is the COMMENT and not the gate: anchored
//     on the gate, this edit reported ANCHOR LOST and the gate could never be tested, only refused.
//  3. delete the `b.extend(dll)` bounds call  ->  fails, naming the bounds. This one first printed
//     "extraction is wrong", sending the reader after the probe instead of the defect; the
//     extraction sanity check now tests only for a marker, which is what actually proves extraction.
//
// A cosmetic change (a different colour) must stay quiet — the assertions test the SHAPE that says
// "derived" (dashed, hollow, not a waypoint pin), never a particular hue.
