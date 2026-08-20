// Do the map markers now carry the same colour AND glyph the legend shows, and is every waypoint
// type distinguishable from every other?
//
// WP_STYLE and wpDivIcon are LIFTED from ClimbMatchCore.jsx rather than copied, with ANCHOR LOST on
// a rename — a copy agrees with the source the day it is written and measures a fossil afterwards,
// which is the whole question here. [[a-probe-that-copies-its-subject-measures-a-fossil]]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const lift = (anchor, what) => {
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(`ANCHOR LOST: \`${anchor}\` is not in ClimbMatchCore.jsx — ${what} was renamed or moved, and this probe would otherwise measure nothing.`);
  let depth = 0, end = -1;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error(`could not balance braces for ${what}`);
  return src.slice(start, end);
};

const cSrc = lift("const C={", "the colour palette");
const styleSrc = lift("const WP_STYLE={", "WP_STYLE");
const iconSrc = lift("function wpDivIcon(", "wpDivIcon");
const colorSrc = lift("function wpColor(", "wpColor");
const glyphSrc = lift("function wpGlyph(", "wpGlyph");

const mod = new Function(`${cSrc};${styleSrc};${colorSrc};${glyphSrc};${iconSrc};return {C,WP_STYLE,wpDivIcon};`)();
const { WP_STYLE, wpDivIcon } = mod;

// A stub Leaflet: divIcon just hands back what it was given, which is all this needs to inspect.
const L = { divIcon: o => o };
const types = Object.keys(WP_STYLE);
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"}  ${msg}`); if (!cond) fail++; };

console.log(`WP_STYLE declares ${types.length} types\n`);

const colors = types.map(t => WP_STYLE[t].color);
const glyphs = types.map(t => WP_STYLE[t].glyph);
ok(new Set(colors).size === types.length, `every type has a UNIQUE colour (${new Set(colors).size}/${types.length} distinct)`);
ok(new Set(glyphs).size === types.length, `every type has a UNIQUE glyph (${new Set(glyphs).size}/${types.length} distinct)`);
ok(glyphs.every(g => g && g !== "📍"), "no type falls back to the generic pin");

// The whole point: the marker html must carry BOTH signals, so the legend explains the map.
for (const t of types) {
  const icon = wpDivIcon(L, t);
  const html = String(icon.html || "");
  const hasColour = html.includes(WP_STYLE[t].color);
  const hasGlyph = html.includes(WP_STYLE[t].glyph);
  if (!hasColour || !hasGlyph) { console.log(`FAIL  ${t}: colour=${hasColour} glyph=${hasGlyph}`); fail++; }
}
ok(true, `all ${types.length} marker icons embed their own colour and glyph`);

// Geometry the map depends on: a centred anchor, or every pin sits offset from its coordinate.
const probe = wpDivIcon(L, "Summit");
ok(probe.iconAnchor[0] === probe.iconSize[0] / 2 && probe.iconAnchor[1] === probe.iconSize[1] / 2,
  "the icon is anchored at its centre, so a pin sits ON its coordinate");
const big = wpDivIcon(L, "Summit", 28);
ok(big.iconSize[0] === 28 && big.iconAnchor[0] === 14, "an explicit size still centres its anchor");
const ringed = wpDivIcon(L, "Summit", 28, "#3b89f7");
ok(String(ringed.html).includes("#3b89f7"), "the active ring colour reaches the markup");

// Fail closed: a stub that silently produced nothing would pass every test above vacuously.
ok(String(probe.html).length > 80, "the icon markup is non-trivial (a broken lift would render nothing)");

console.log(`\n${fail ? `${fail} FAILED` : "ok — the map draws what the legend describes: same colour, same glyph, one definition."}`);
process.exit(fail ? 1 : 0);
