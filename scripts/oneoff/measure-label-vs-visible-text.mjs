// Does any control ANNOUNCE something different from what it SHOWS?
//
// `aria-label` REPLACES the accessible name entirely, so a hardcoded label on a control that also
// renders visible text means a screen-reader user hears one thing and a sighted user reads
// another. It also breaks voice control: "click <visible words>" cannot match a name those words
// are not in.
//
// CLAUDE.md states the rule in prose — "Build that label FROM the same expression the chip
// renders, not from a restatement of it — otherwise the announced name and the visible text drift
// apart the next time one is edited" — and nothing enforces it. check:a11y-names asks whether a
// control HAS a name; check:a11y-badges asks whether that name is two fragments welded together;
// check:control-names asks whether a switch says what it is SET TO. A label that cleanly
// contradicts its own visible text passes all three.
//
// MEASUREMENT ONLY. Sizing the class before deciding whether it deserves a guard — the discipline
// audit:area-parents records after its first draft shipped 12 real findings out of 41.
//
// THE ANSWER IS ZERO, measured 2026-09-02, and NO GUARD WAS BUILT. 424 aria-labels across the
// three app files; 333 are hardcoded; 100 of those sit on a button-like control; 4 of THOSE also
// render literal visible text; and not one announces something its visible text contradicts.
//
// The scoping is the result, not a detail. Unscoped the first run reported 29 and every one was
// correct markup:
//   - a <select> whose aria-label names the FIELD ("Who can see your profile") while its children
//     are the <option> values ("Everyone", "Friends only");
//   - a dialog whose aria-label names the SHEET while its children are the whole screen.
// Both are exactly what aria-label is for. A guard reporting them would tell an author to break
// working markup, which is how a guard gets ignored.
//
// WHAT THIS DOES NOT COVER, stated rather than implied: the 91 labels built from an EXPRESSION.
// Those cannot be compared without executing them — and they are the ones already following
// CLAUDE.md's rule, since they are built from the same expression the control renders. The
// drift this looks for is a RESTATEMENT going stale, and a restatement is a string literal.
//
// Re-run it after a batch of new controls. Do not turn it into a guard on this evidence: a
// detector for a class of zero is the thing this repo keeps refusing to build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter((w) => w.length > 2);

let scanned = 0, withText = 0;
const findings = [];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

  traverse(ast, {
    JSXOpeningElement(p) {
      const attr = p.node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "aria-label" &&
               a.value && a.value.type === "StringLiteral");
      if (!attr) return;

      // BUTTON-LIKE ONLY, and the first run is why. Unscoped it reported 29, dominated by two
      // shapes where a label that does not repeat the children is exactly RIGHT:
      //   - a <select>, whose aria-label names the FIELD ("Who can see your profile") while its
      //     children are the <option> values ("Everyone", "Friends only");
      //   - a dialog, whose aria-label names the SHEET while its children are the whole screen.
      // Reporting either tells an author to break correct markup, which is how a guard gets
      // ignored — the trade check:selected-state already had to learn.
      const tag = p.node.name && p.node.name.type === "JSXIdentifier" ? p.node.name.name : "";
      const roleAttr = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "role" && a.value && a.value.type === "StringLiteral");
      const role = roleAttr ? roleAttr.value.value : "";
      const BUTTONISH = new Set(["button", "tab", "menuitem", "link", "option", "checkbox", "switch", "radio"]);
      const isControl = tag === "button" || tag === "summary" || tag === "a" || BUTTONISH.has(role);
      if (!isControl) return;

      scanned++;
      const label = attr.value.value;

      // Visible text = literal JSXText in the element's own subtree. Deliberately NOT expressions:
      // {name} could render anything, so it cannot be compared without executing it, and guessing
      // would manufacture findings. This under-reports on purpose.
      const el = p.parentPath.node;
      let text = "";
      const walk = (n) => {
        if (!n || typeof n !== "object") return;
        if (n.type === "JSXText") { text += " " + n.value; return; }
        // do not descend into a NESTED element that carries its own aria-label: its text belongs
        // to that control's name, not to this one's.
        if (n.type === "JSXElement" && n !== el && n.openingElement &&
            n.openingElement.attributes.some((a) => a.type === "JSXAttribute" && a.name && a.name.name === "aria-label")) return;
        for (const k of Object.keys(n)) {
          const v = n[k];
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === "object" && v.type) walk(v);
        }
      };
      (el.children || []).forEach(walk);

      const vis = norm(text);
      if (!vis || vis.length < 3) return;   // icon-only: a label is the whole point
      withText++;

      const lab = norm(label);
      if (lab.includes(vis) || vis.includes(lab)) return;      // one contains the other: agrees
      const vw = words(text), lw = new Set(words(label));
      // NOTHING COMPARABLE IS NOT A FINDING. The markdown toolbar's numbered-list button shows the
      // glyph "1 2 3" and is labelled "Numbered list" — correct, and the only "finding" of the
      // scoped run until this returned instead of falling through. A control whose visible text is
      // digits or symbols has no words to carry into its name.
      if (!vw.length) return;
      const shared = vw.filter((w) => lw.has(w));
      if (shared.length / vw.length >= 0.5) return; // most visible words present

      findings.push({
        file: f,
        line: attr.loc ? attr.loc.start.line : 0,
        label,
        visible: text.trim().replace(/\s+/g, " ").slice(0, 60),
        shared: shared.length,
        of: vw.length,
      });
    },
  });
}

console.log(`literal aria-labels scanned: ${scanned}`);
console.log(`  ...of which the control also renders literal visible text: ${withText}`);
console.log(`  ...where the label does NOT carry that text: ${findings.length}\n`);
for (const x of findings) {
  console.log(`  ${x.file}:${x.line}`);
  console.log(`      announced: "${x.label}"`);
  console.log(`      shows:     "${x.visible}"`);
  console.log(`      ${x.shared}/${x.of} visible word(s) appear in the announced name`);
}
if (!scanned) { console.error("\nscanned nothing — the walk broke"); process.exit(1); }
