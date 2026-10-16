// probe-label-vs-visible-text — does any control's aria-label CONTRADICT what it visibly says?
//
// CLAUDE.md's rule is "name a control from the expression the row ALREADY renders, never a
// restatement", because a restatement drifts when one side is edited. This asks whether any
// restatement already HAS drifted: a screen reader user then hears something different from what
// is on screen, and neither is obviously wrong to whoever edits next.
//
// PRECISION IS THE WHOLE PROBLEM HERE, and the rule is deliberately weak. An aria-label
// legitimately ADDS context the visible text cannot carry -- "Open Alex's profile" against a
// visible "Alex" is correct and common, and a guard flagging it would be telling authors to make
// their labels worse. So this reports only where the two share NO significant word at all, which
// is the shape that cannot be an elaboration.
//
// MEASURED 2026-08-26: 92 controls carry both a literal aria-label and literal visible text, and
// ZERO share no significant word. The class is EMPTY in this app -- kept as the measurement so
// nobody re-derives it, not because there is a backlog behind it.
//
// The first run said 12, and every one was a CONTAINER rather than a control: a <select> labelled
// "Filter by state" holding <option>All states</option>, a dialog labelled "Help" holding a Cancel
// button. A container is SUPPOSED to differ from its contents. Scoping to controls took 12 -> 0,
// which is the [[when-an-audit-reports-zero-ask-its-denominator]] lesson from the other end: ask
// what a non-zero count is a count OF before believing it is work.
//
// Report-only. Fails closed on a parse or an empty walk.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "../lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = new URL("../..", import.meta.url).pathname;

const attr = (open, name) => open.attributes.find(
  (a) => a.type === "JSXAttribute" && a.name && a.name.name === name);

// Words too common to count as agreement. Sharing only "the" is not sharing anything.
const STOP = new Set(["the", "a", "an", "to", "of", "and", "or", "for", "in", "on", "at", "my",
  "me", "your", "you", "is", "it", "this", "that", "with", "from", "by", "as", "all", "show",
  "hide", "open", "close", "view", "see", "toggle", "add", "new", "edit", "back", "next", "more"]);

const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

// Visible text from STRING LITERALS only. A dynamic expression cannot be compared without running
// the app, and guessing at it is how a probe manufactures findings.
const literalText = (children, out = []) => {
  for (const c of children) {
    if (c.type === "JSXText" && c.value.trim()) out.push(c.value.trim());
    if (c.type === "JSXExpressionContainer") {
      const e = c.expression;
      if (e.type === "StringLiteral") out.push(e.value);
      if (e.type === "JSXElement") literalText(e.children, out);
      if (e.type === "JSXFragment") literalText(e.children, out);
    }
    if (c.type === "JSXElement") literalText(c.children, out);
    if (c.type === "JSXFragment") literalText(c.children, out);
  }
  return out;
};

const INTERACTIVE = ["button", "tab", "checkbox", "switch", "radio", "option", "menuitem"];
const isButtonLike = (open) => {
  if (open.name.type !== "JSXIdentifier") return false;
  if (open.name.name === "button") return true;
  const role = attr(open, "role");
  return !!(role && role.value && role.value.type === "StringLiteral"
    && INTERACTIVE.includes(role.value.value));
};

const files = appSources(ROOT, "probe-label-vs-visible-text").map((f) => ROOT + f);
let pairs = 0;
const findings = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error("FAIL: parse " + f + " — " + e.message); process.exit(1); }
  const short = f.replace(/.*\/(?=[^/]*$)/, "");
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      // A CONTAINER is supposed to differ from its contents: <select aria-label="Filter by
      // state"> holds <option>All states</option>, and a dialog labelled "Help" holds a Cancel
      // button. Only a CONTROL announces itself and its own visible text as one thing, so only a
      // control can contradict itself. Scoping this took the count from 12 to its real value.
      if (!isButtonLike(open)) return;
      const al = attr(open, "aria-label");
      if (!al || !al.value || al.value.type !== "StringLiteral") return;
      const vis = literalText(path.node.children).join(" ").trim();
      if (!vis) return;                       // icon-only: nothing to contradict
      pairs++;
      const lw = words(al.value.value), vw = words(vis);
      if (!lw.size || !vw.size) return;       // one side is all stop-words: no signal either way
      let shared = 0;
      for (const w of lw) if (vw.has(w)) shared++;
      if (shared === 0) findings.push({
        where: short + ":" + open.loc.start.line,
        label: al.value.value,
        visible: vis.slice(0, 60),
      });
    },
  });
}

if (!pairs) { console.error("FAIL: found NO control with both a literal aria-label and literal text — the scan broke"); process.exit(1); }
console.log("controls with a literal aria-label AND literal visible text: " + pairs);
console.log("sharing NO significant word: " + findings.length + "\n");
for (const x of findings) {
  console.log("  " + x.where);
  console.log("      announced: " + x.label);
  console.log("      on screen: " + x.visible + "\n");
}
