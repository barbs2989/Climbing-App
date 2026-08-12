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
//
// ANCESTRY IS RESOLVED, NOT GUESSED. The first version answered "is this pane inside a flex
// column?" by looking back a fixed 3,000 characters for `flexDirection:"column"`, and when it
// found none it dropped the pane with a bare `continue`. That is proximity, not ancestry, and
// on this codebase the difference is most of the coverage: the longest single line in
// ClimbMatch.jsx is 58,365 characters, so a parent can be one physical line and several
// thousand characters away. Measured on the commit before this one, **28 of 50** overflow
// panes had no `flexDirection:"column"` within the window and were therefore never evaluated,
// against 22 that were — and nothing said so, because a skipped pane and a clean pane printed
// identically. CLAUDE.md already records the rule for check:overlay-discovery ("balance the
// braces, never take a fixed window … there is no safe window size"); scripts/lib/jsx-ancestors.mjs
// applies it to ancestry.
//
// The count of panes that actually depend on flex shrinking is PRINTED, so "nothing to check"
// and "everything checked out" cannot read the same. There is no longer an "unevaluated"
// bucket to report: ancestry comes from the AST, so every pane resolves or the parse failed.
import fs from "fs";
import path from "path";
import url from "url";
import { appSources } from "./lib/guard-sources.mjs";
import { walkElements, styleProps, hasStyle } from "./lib/jsx-ancestors.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
// Names its inputs and fails if a required one is missing, per scripts/lib/guard-sources.mjs
// — a guard that quietly reads a shorter list is a guard you do not have.
const files = appSources(ROOT, "check:flex-scroll").map(f => path.join(ROOT, f));

let elements = 0, panes = 0, evaluated = 0;
const hits = [];

const isScroll = v => /^["'](auto|scroll)["']$/.test(String(v || "").trim());
const outOfFlow = v => /^["'](fixed|absolute)["']$/.test(String(v || "").trim());
const isZero = v => String(v || "").trim() === "0";
const isAuto = v => /^["']?auto["']?$/.test(String(v || "").trim());
const isColumn = v => /^["']column["']$/.test(String(v || "").trim());
// `height`/`maxHeight` ONLY. Reading properties from the AST means `lineHeight` can no longer
// be mistaken for a height, which the previous regex did: /(max)?[Hh]eight:/ is unanchored and
// matched the tail of `lineHeight:`, exempting the pane as though it had been given a height.
// That exempted 0 real panes when measured — latent, not live — and is now impossible.
const hasHeight = st => ["height", "maxHeight"].some(k => st[k] != null && !isAuto(st[k]));
const capped = st => ["height", "maxHeight"].some(k => st[k] != null);

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  walkElements(code, (open, ancestors) => {
    elements++;
    if (!hasStyle(open, code)) return;   // cheap: skips the ~93% with no inline style
    const st = styleProps(open, code);
    if (!st) return;
    const ov = st.overflowY != null ? st.overflowY : st.overflow;
    if (!isScroll(ov)) return;
    panes++;
    if (outOfFlow(st.position)) return;   // out of flow: flex shrinking never applied
    if (isZero(st.minHeight)) return;     // already sized to shrink
    if (hasHeight(st)) return;            // does not depend on flex shrinking
    evaluated++;
    const bad = ancestors().some(a => {
      const as = styleProps(a, code);
      return as && isColumn(as.flexDirection) && capped(as);
    });
    if (!bad) return;
    const line = code.slice(0, open.start).split("\n").length;
    hits.push(`${path.basename(f)}:${line}  ` + JSON.stringify(st).slice(0, 150) + "…");
  });
}

console.log(`check:flex-scroll — read ${files.length} file(s), ${elements} elements, ${panes} scroll pane(s)`);
console.log(`  ${evaluated} pane(s) depend on flex shrinking; ancestry resolved from the AST, so none are skipped`);
if (!files.length || !elements) {
  console.error("FAIL: nothing scanned — the guard read no app source.");
  process.exit(1);
}
if (!panes) {
  console.error("FAIL: zero scroll panes found — the walk broke, this app has many.");
  process.exit(1);
}
if (!hits.length) {
  console.log("ok — every overflow pane inside a height-capped flex column can shrink to scroll.");
  process.exit(0);
}
console.error(`\nFAIL: ${hits.length} scroll pane(s) inside a height-capped flex column with neither minHeight:0 nor an explicit height.`);
console.error("A flex child defaults to min-height:auto, so these will not scroll — the container overflows instead.\n");
hits.forEach(h => console.error("  " + h));
process.exit(1);
