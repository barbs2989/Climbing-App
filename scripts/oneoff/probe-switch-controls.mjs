// probe-switch-controls — every iOS-style switch in the app, and what it announces.
//
// The shape is a <button> 46x26 with borderRadius 13 holding one absolutely-positioned knob div
// and NO text. Its visible label lives in a SIBLING div, so nothing links the two: a screen
// reader gets "button", with no name and no on/off state.
//
// Neither existing guard can see this. check:a11y-names covers FORM controls (input/select/
// textarea). check:clickable covers NON-NATIVE clickables (a div with onClick). And
// check:selected-state needs TWO button-like siblings on one row to form a group, so a lone
// switch beside a text div is a group of one and drops out before it is ever measured.
//
// Reports. Fails closed on a parse or a zero walk.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "../lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = new URL("../..", import.meta.url).pathname;

const attr = (open, name) => open.attributes.find(
  (a) => a.type === "JSXAttribute" && a.name && a.name.name === name);

const files = appSources(ROOT, "probe-switch-controls").map((f) => ROOT + f);
let scanned = 0;
const rows = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error("FAIL: parse " + f + " — " + e.message); process.exit(1); }
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      if (open.name.type !== "JSXIdentifier" || open.name.name !== "button") return;
      const text = src.slice(path.node.start, path.node.end);
      // The switch shape, matched on its own inline geometry rather than on a name.
      if (!/width:46,\s*height:26,\s*borderRadius:13/.test(text)) return;
      scanned++;
      const handler = (text.match(/onClick=\{[^}]*\}/) || [""])[0].slice(0, 70);
      rows.push({
        file: f.replace(/.*\/(?=[^/]*$)/, ""),
        handler,
        label: !!attr(open, "aria-label"),
        labelledby: !!attr(open, "aria-labelledby"),
        role: attr(open, "role") ? "yes" : "-",
        checked: attr(open, "aria-checked") ? "yes" : "-",
        pressed: attr(open, "aria-pressed") ? "yes" : "-",
      });
    },
  });
}

if (!scanned) { console.error("FAIL: found NO switch-shaped buttons — the shape test matches nothing"); process.exit(1); }

console.log("switch-shaped buttons found: " + scanned + "\n");
console.log("  named  role  a-checked  a-pressed  handler");
for (const r of rows) {
  const named = (r.label || r.labelledby) ? "yes" : "NO ";
  console.log("  " + named + "    " + r.role.padEnd(5) + " " + r.checked.padEnd(10) + " "
    + r.pressed.padEnd(10) + " " + r.handler);
}
const mute = rows.filter((r) => !(r.label || r.labelledby) || (r.checked === "-" && r.pressed === "-"));
console.log("\nswitches announcing NO name or NO state: " + mute.length + " of " + scanned);
