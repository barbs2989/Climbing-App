#!/usr/bin/env node
import { fileURLToPath } from "node:url";
// check:no-purple-text — the app draws no PURPLE text. Owner, 2026-11-25: "I don't like the purple text".
//
// Purple (the palette's old C.purple #a371f7, and anything of its hue) was the colour of the Trad
// discipline badge, the Expert level pill, avatar initials, the Prominence / High point stats, the
// crew organiser tag, five tick-list tags, the UV "extreme" reading and a dozen other labels. All
// of them now take a palette colour that is not purple, and C has NO purple token any more.
//
// What this checks, in every app file, comments blanked first:
//   1. no `C.purple` / `C.purpleBg` / `C.violet…` token, and no palette NAME "purple"/"violet" in a
//      string (TagChip and the area page resolve a tag's colour by NAME: C[t.color]);
//   2. no quoted hex colour whose hue is violet-to-purple (250°–320°, saturated, not near-black or
//      near-white) — #a371f7 and every shade of it, written as a literal;
//   3. C.magenta (the one purple-adjacent token left) only where it is a drawn MARK, not text.
// EXCEPT the drawn graphics in ALLOW, which are not text and whose colour is a map convention or was
// spaced against its neighbours by another guard. Each is (file, hex) and says why.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP = /^(ClimbMatch\.jsx|ClimbMatchCore\.jsx|RouteDetail\.jsx|EnrichmentPanels\.jsx|main\.jsx|index\.html|lib\/.*\.(jsx?|tsx?)|src\/.*\.(jsx?|tsx?))$/;
const ALLOW = [
  ["ClimbMatchCore.jsx", "#a371f7", "WP_STYLE Campsite: a MAP PIN and its legend glyph; check:wp-styles spaced all twelve pins around it"],
  ["lib/topoMarks.jsx", "#a371f7", "the topo's rappel-station MARK, a disc drawn on the photo"],
  ["lib/mapKit.jsx", "#9b3fbf", "slope-angle shading 45°+, the CalTopo / Gaia GPS map convention"],
  ["lib/fire.js", "#8f3f97", "the EPA's own 'Very unhealthy' smoke band, painted on the map"],
  ["lib/routeTracks.js", "#e64cff", "a recorded track LINE on the map"],
  ["ClimbMatchCore.jsx", "#e05fd8", "the C.magenta token itself, kept for the topo crux mark (rule 3)"],
];
const MAGENTA_OK = new Set(["lib/topoMarks.jsx"]);

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => APP.test(f));
// Fails CLOSED: "nothing found" is also what a broken walk prints.
if (files.length < 100 || !files.includes("ClimbMatchCore.jsx")) {
  console.error(`check:no-purple-text FAILED — only ${files.length} app file(s) found; a broken walk, not a small app.`);
  process.exit(1);
}
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, pre) => pre + " ".repeat(m.length - pre.length));

function isPurple(hex) {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  h = h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return false;
  const s = d / (1 - Math.abs(2 * l - 1));
  let hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return hue >= 250 && hue <= 320 && s > 0.3 && l > 0.2 && l < 0.85;
}

// Self-test: the colour the owner objected to and its neighbours are caught; the app's other hues are not.
for (const [hex, want] of [["#a371f7", true], ["#1e1240", false], ["#8957e5", true], ["#e05fd8", true], ["#7d7cf5", false], ["#62aee8", false], ["#f778ba", false], ["#f0883e", false], ["#2cc9b8", false]]) {
  if (isPurple(hex) !== want) { console.error(`check:no-purple-text FAILED — its own hue test misreads ${hex}`); process.exit(1); }
}

const hits = [];
let allowed = 0;
for (const f of files) {
  let src;
  try { src = readFileSync(ROOT + f, "utf8"); } catch { continue; }
  stripComments(src).split("\n").forEach((ln, i) => {
    const at = (m, why) => hits.push(`  ${f}:${i + 1}  ${why}   …${ln.slice(Math.max(0, m.index - 50), m.index + 40).trim()}…`);
    for (const m of ln.matchAll(/\bC\.(purple|violet)\w*/g)) at(m, m[0]);
    for (const m of ln.matchAll(/["'](purple|violet)["']/gi)) at(m, `palette name ${m[0]}`);
    if (!MAGENTA_OK.has(f)) for (const m of ln.matchAll(/\bC\.magenta\b/g)) at(m, "C.magenta outside a drawn mark");
    for (const m of ln.matchAll(/["'`](#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|#[0-9a-fA-F]{3})(?=["'`])/g)) {
      if (!isPurple(m[1])) continue;
      if (ALLOW.some(([af, ah]) => af === f && ah === m[1].slice(0, 7).toLowerCase())) { allowed++; continue; }
      at(m, m[1]);
    }
  });
}
if (hits.length) {
  console.error(`check:no-purple-text FAILED — ${hits.length} purple colour(s) the app would draw (owner 2026-11-25: "I don't like the purple text"):\n`);
  for (const h of hits) console.error(h);
  console.error("\nUse a palette colour that is not purple (C.blue, C.teal, C.amber, C.green, C.red, C.orange…).");
  console.error("A drawn MAP or TOPO mark that must stay purple goes in ALLOW in this script, with its reason.");
  process.exit(1);
}
if (allowed < 4) { console.error(`check:no-purple-text FAILED — only ${allowed} allowed mark(s) seen; an ALLOW entry no longer matches its file, so prune it.`); process.exit(1); }
console.log(`check:no-purple-text ok — ${files.length} app files, 0 purple text colours (${allowed} allowed drawn mark(s): map pin, topo marks, map conventions).`);
