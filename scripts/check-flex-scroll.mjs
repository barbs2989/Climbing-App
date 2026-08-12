// A scroll pane inside a flex column that cannot actually scroll.
//
// The Filter routes sheet is the case that found this. Its body was
//   <div style={{padding:…, overflowY:"auto"}}>
// inside a `flexDirection:"column"` sheet capped at maxHeight:88vh. A flex child defaults to
// min-height:auto, so it will not shrink below its content — the pane never scrolls, the
// sheet grows past its own cap, and because the sheet is bottom-aligned in a fixed inset-0
// layer, its own header slides off the TOP of the screen. That is exactly how it was
// reported: "Filters is cut off at the top", and it feels stuck because nothing scrolls.
//
// overflow:auto without flex:1 AND minHeight:0 is the fingerprint. Static, no browser, so it
// sits alongside the other build guards rather than in the browser suite.
import fs from "fs";
import path from "path";
import url from "url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
// Names its inputs and fails if a required one is missing, per scripts/lib/guard-sources.mjs
// — a guard that quietly reads a shorter list is a guard you do not have.
const files = appSources(ROOT, "check:flex-scroll").map(f => path.join(ROOT, f));
let scanned = 0, found = 0;
const hits = [];

// Style literals are inline objects on one very long line, so walk braces rather than
// regex-matching a window: `{{ … }}` nests, and a fixed window truncates mid-object.
function styleObjects(src) {
  const out = [];
  let i = 0;
  for (;;) {
    i = src.indexOf("style={{", i);
    if (i < 0) break;
    let depth = 0, j = i + 7, end = -1;
    for (; j < src.length && j < i + 20000; j++) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end < 0) { i += 8; continue; }
    out.push({ start: i, end, text: src.slice(i, end + 1) });
    i = end;
  }
  return out;
}

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const objs = styleObjects(src);
  scanned += objs.length;
  for (const o of objs) {
    if (!/overflow(?:Y)?\s*:\s*["'](auto|scroll)["']/.test(o.text)) continue;
    // position:fixed takes the element out of flow entirely, so flex shrinking never
    // applied to it and min-height:auto cannot trap it. A full-screen overlay is not this bug.
    if (/position\s*:\s*["'](fixed|absolute)["']/.test(o.text)) continue;
    // Already sized to shrink? Then it is fine.
    if (/minHeight\s*:\s*0/.test(o.text)) continue;
    // A pane with its own explicit height/maxHeight does not depend on flex shrinking.
    if (/(max)?[Hh]eight\s*:\s*(?!["']?auto)/.test(o.text.replace(/minHeight\s*:[^,}]*/g, ""))) continue;
    // Is the nearest enclosing element a flex column? Look back for the parent's style.
    const before = src.slice(Math.max(0, o.start - 3000), o.start);
    const lastCol = before.lastIndexOf('flexDirection:"column"');
    if (lastCol < 0) continue;
    // …and does that ancestor cap its height, so shrinking is what makes the child scroll?
    const around = before.slice(lastCol - 400 < 0 ? 0 : lastCol - 400, lastCol + 400);
    if (!/(maxHeight|height)\s*:/.test(around)) continue;
    found++;
    const line = src.slice(0, o.start).split("\n").length;
    hits.push(`${path.basename(f)}:${line}  ${o.text.slice(0, 160).replace(/\s+/g, " ")}…`);
  }
}

console.log(`check:flex-scroll — read ${files.length} file(s), ${scanned} style objects`);
if (!files.length || !scanned) {
  console.error("FAIL: nothing scanned — the guard read no app source.");
  process.exit(1);
}
if (!hits.length) {
  console.log("ok — every overflow pane inside a capped flex column can shrink to scroll.");
  process.exit(0);
}
console.error(`\nFAIL: ${found} scroll pane(s) inside a height-capped flex column with neither minHeight:0 nor an explicit height.`);
console.error("A flex child defaults to min-height:auto, so these will not scroll — the container overflows instead.\n");
hits.forEach(h => console.error("  " + h));
process.exit(1);
