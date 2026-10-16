// What is actually LEFT in check:clickable's baseline, and how much of it should never
// be fixed?
//
// The baseline is one number per file, so it says nothing about what those controls ARE.
// That matters before anyone sweeps ClimbMatchCore.jsx (130) or ClimbMatch.jsx (68): a
// modal backdrop must NEVER get a tab stop -- a focusable control that does nothing, in
// front of every sheet, is worse than none -- and CLAUDE.md already records five in lib/
// that were deliberately left. Nobody has measured how many more of that shape remain, so
// "211 left to fix" is not a target, it is an upper bound of unknown tightness.
//
// Classifies by MEASURED inline style, never by what the handler is called. That
// distinction is load-bearing and was proven on RouteDetail: setView(null) reads like a
// close button and is a backdrop; setPhotoLightbox({ph,key}) reads similar and is a real
// control. Naming would have put both in the wrong bucket, in opposite directions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/clickable-divs-baseline.json"), "utf8"));
const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);
const isStop = (n) => n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression" &&
  n.callee.property && n.callee.property.name === "stopPropagation";

const summary = [];
let totalBack = 0, totalCtrl = 0;

for (const rel of Object.keys(BASELINE)) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  const back = [], ctrl = [];
  traverse(ast, {
    JSXOpeningElement(p) {
      const nn = p.node.name;
      if (!nn || nn.type !== "JSXIdentifier") return;
      const tag = nn.name;
      if (NATIVE.has(tag) || tag[0] === tag[0].toUpperCase()) return;
      const oc = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "onClick");
      if (!oc) return;
      const ex = oc.value && oc.value.type === "JSXExpressionContainer" && oc.value.expression;
      if (!ex) return;
      let shield = false;
      if (ex.type === "ArrowFunctionExpression" || ex.type === "FunctionExpression") {
        if (isStop(ex.body)) shield = true;
        else if (ex.body && ex.body.type === "BlockStatement") {
          const b = ex.body.body;
          shield = b.length === 1 && b[0].type === "ExpressionStatement" && isStop(b[0].expression);
        }
      }
      if (shield) return;
      const attrs = p.node.attributes.filter((a) => a.type === "JSXAttribute");
      const names = new Set(attrs.map((a) => a.name.name));
      if (names.has("role") && names.has("tabIndex")) return; // already fixed
      const styleAttr = attrs.find((a) => a.name.name === "style");
      let style = styleAttr ? src.slice(styleAttr.start, styleAttr.end).replace(/\s+/g, "") : "";
      // Resolve `style={{...styles.overlay}}`. Without this a backdrop whose style lives in a
      // shared object reads as a REAL CONTROL -- exactly how this script first contradicted
      // CLAUDE.md about GpsSubmissionModal's two overlays, and CLAUDE.md was right. Quotes are
      // normalised too: that file writes position:'fixed', single-quoted, which the original
      // double-quoted regex could never match.
      for (const m of style.matchAll(/\.\.\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g)) {
        const re = new RegExp("(^|[^\\w$])" + m[2] + "\\s*:\\s*\\{", "m");
        const hit = re.exec(src);
        if (!hit) continue;
        const i = src.indexOf("{", hit.index + hit[0].length - 1);
        let depth = 0, end = i;
        for (let k = i; k < src.length; k++) {
          if (src[k] === "{") depth++;
          else if (src[k] === "}") { depth--; if (!depth) { end = k; break; } }
        }
        style += src.slice(i, end + 1).replace(/\s+/g, "");
      }
      style = style.replace(/'/g, '"');
      const fixed = /position:"fixed"/.test(style);
      const full = /inset:0/.test(style) || (/top:0/.test(style) && /left:0/.test(style) && /right:0/.test(style));
      const row = { line: p.node.loc.start.line, tag, handler: src.slice(ex.start, ex.end).replace(/\s+/g, " ").slice(0, 52) };
      (fixed && full ? back : ctrl).push(row);
    },
  });
  const claimed = BASELINE[rel];
  const found = back.length + ctrl.length;
  summary.push({ rel, claimed, found, back: back.length, ctrl: ctrl.length, rows: ctrl });
  totalBack += back.length; totalCtrl += ctrl.length;
}

console.log("file                        baseline  found  BACKDROP(never fix)  REAL");
for (const s of summary) {
  const drift = s.claimed === s.found ? "" : `   <-- baseline says ${s.claimed}, scan found ${s.found}`;
  console.log(`${s.rel.padEnd(28)}${String(s.claimed).padStart(6)}${String(s.found).padStart(7)}${String(s.back).padStart(21)}${String(s.ctrl).padStart(6)}${drift}`);
}
console.log(`\n${totalBack} of ${totalBack + totalCtrl} remaining are BACKDROPS that must never get a tab stop.`);
console.log(`The real remaining work is ${totalCtrl} control(s), not ${totalBack + totalCtrl}.`);

if (process.argv.includes("--list")) {
  for (const s of summary) {
    if (!s.rows.length) continue;
    console.log(`\n--- ${s.rel}: ${s.rows.length} real control(s) ---`);
    for (const r of s.rows) console.log(`  ${String(r.line).padStart(5)}  <${r.tag}>  ${r.handler}`);
  }
}
if (!totalBack && !totalCtrl) { console.error("\nSCAN FOUND NOTHING — it broke; do not read this as a clean app."); process.exit(1); }
