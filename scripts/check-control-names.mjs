// check:control-names — a control must say WHAT IT IS, and a switch must say WHAT IT IS SET TO.
//
// Found by reading check:selected-state's own skipped-control counter: it reported "14 control(s)
// skipped as unnameable" on the Crew tab and pointed the reader at check:a11y-names. That advice
// was wrong, and the wrongness is the reason this guard exists — NO guard covered these:
//
//   check:a11y-names   covers FORM controls (input/select/textarea). It can never report a button.
//   check:clickable    covers NON-NATIVE clickables (a div with onClick). Not a <button> either.
//   check:selected-state needs TWO button-like siblings on one ROW to form a group, so a lone
//                      switch beside its text label is a group of one and drops out before it is
//                      ever measured. Every one of the nine switches was invisible to it.
//
// SECTION 1 — every button-like element has an accessible name.
// SECTION 2 — every switch announces its state.
//
// The nine switches are all PRIVACY or VISIBILITY settings — leaderboards, real name, precise
// location, partner-browse listing, online status, résumé visibility. Three announced no name at
// all and eight announced no state, so a screen reader user was told "button" and could not learn
// whether their real name was being shown. That is the worst possible place for this defect.
//
// Static (Babel over the app sources), so it sits in npm run build.
//
//   node scripts/check-control-names.mjs
//   node scripts/check-control-names.mjs --list   # print every control it scanned
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = new URL("..", import.meta.url).pathname;
const LIST = process.argv.includes("--list");

const attr = (open, name) => open.attributes.find(
  (a) => a.type === "JSXAttribute" && a.name && a.name.name === name);

// aria-label, aria-labelledby and title all name a control. Reading only aria-label is the
// too-narrow proxy this repo keeps paying for.
const namedItself = (open) =>
  !!(attr(open, "aria-label") || attr(open, "aria-labelledby") || attr(open, "title"));

// <Lbl s={"..."}/> is THIS APP'S OWN label component: it maps a leading icon character to an
// ActionIcon and renders THE REST OF THE STRING as text, so it genuinely names its button — the
// back buttons announce as "Back". Components are opaque by default and that default is RIGHT,
// because <Av/> and <ActionIcon/> render no text and that is precisely why an icon-only button
// announces as nothing. But treating this one as opaque reported EIGHT correctly-named buttons as
// unnamed — 11 findings where the truth was 3 — so it is recognised by name. It has to be checked
// in BOTH child positions: these buttons write it as {<Lbl .../>}, inside an expression container,
// not as a bare child, and a version that only looked at bare children still reported all eight.
const isLbl = (n) => !!n && n.type === "JSXElement"
  && n.openingElement.name.type === "JSXIdentifier"
  && n.openingElement.name.name === "Lbl";

// An accessible name is computed from ALL DESCENDANT TEXT. CLAUDE.md records check:clickable's
// name test being too narrow three separate times — direct children only, fragments not
// descended, components opaque — so all three are handled here.
const hasText = (children) => {
  for (const c of children) {
    if (c.type === "JSXText" && c.value.trim()) return true;
    if (c.type === "JSXExpressionContainer") {
      const e = c.expression;
      if (e.type === "JSXEmptyExpression") continue;
      if (isLbl(e)) return true;
      // Any non-element expression may build a string at runtime, so it counts as a possible
      // name. Being generous keeps this a FLOOR: what it reports is unnamed under every reading.
      if (e.type !== "JSXElement" && e.type !== "JSXFragment") return true;
      if (hasText(e.children || [])) return true;
      continue;
    }
    if (c.type === "JSXFragment" && hasText(c.children)) return true;
    if (c.type === "JSXElement") {
      if (isLbl(c)) return true;
      if (hasText(c.children)) return true;
    }
  }
  return false;
};

const INTERACTIVE = ["button", "tab", "checkbox", "switch", "radio", "option", "menuitem"];

const isButtonLike = (open) => {
  if (open.name.type !== "JSXIdentifier") return false;
  if (open.name.name === "button") return true;
  const role = attr(open, "role");
  return !!(role && role.value && role.value.type === "StringLiteral"
    && INTERACTIVE.includes(role.value.value));
};

const files = appSources(ROOT, "check:control-names").map((f) => ROOT + f);

let scanned = 0, switches = 0;
const unnamed = [], mute = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    console.error("check:control-names FAILED — could not parse " + f + ": " + e.message);
    console.error("Nothing was checked. This is a coverage failure, not a clean tree.");
    process.exit(1);
  }
  const short = f.replace(/.*\/(?=[^/]*$)/, "");
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      if (!isButtonLike(open)) return;
      scanned++;
      const text = src.slice(path.node.start, path.node.end);
      const where = short + ":" + open.loc.start.line;
      const head = text.slice(0, text.indexOf("style=") > 0 ? text.indexOf("style=") : 90).replace(/\s+/g, " ");

      // SECTION 1 — is it named at all?
      if (!namedItself(open) && !hasText(path.node.children)) unnamed.push({ where, head });

      // SECTION 2 — the switch shape, matched on the control's OWN inline geometry rather than
      // on a variable name, because these are written inline with no class and no component.
      if (/width:46,\s*height:26,\s*borderRadius:13/.test(text)) {
        switches++;
        const role = attr(open, "role");
        const roleIsSwitch = role && role.value && role.value.type === "StringLiteral"
          && role.value.value === "switch";
        // aria-checked is what role="switch" uses. aria-pressed also announces a boolean and is
        // accepted rather than demanded: a guard that insists on ONE spelling tells the author to
        // swap working markup for different working markup, which this check already did once.
        const statey = !!(attr(open, "aria-checked") || attr(open, "aria-pressed"));
        if (!roleIsSwitch || !statey) mute.push({ where, head, roleIsSwitch: !!roleIsSwitch, statey });
      }
      if (LIST) console.log("  " + where + "  " + head.slice(0, 100));
    },
  });
}

// FAIL CLOSED. The expected output of this guard is "no findings", which is exactly what a broken
// scan prints. Both floors matter: zero controls means the traversal broke, and zero switches
// means the shape test no longer matches anything — a restyle would otherwise silently retire
// section 2 while the guard went on reporting ok.
if (scanned < 200) {
  console.error("check:control-names FAILED — only " + scanned + " button-like element(s) found.");
  console.error("That is a broken scan, not a clean app (818 at the time of writing).");
  process.exit(1);
}
// The floor is 5 against a real 9, and "at least one" was measurably NOT ENOUGH: injection case 6
// restyles the geometry in ClimbMatch.jsx only, the lone switch in ClimbMatchCore.jsx kept a
// zero-test satisfied, and the guard reported ok having checked 1 of 9. A partial restyle is the
// realistic way this shape test dies, not a simultaneous one. Well below 9 so ordinary churn does
// not trip it, well above what any partial restyle leaves behind.
if (switches < 5) {
  console.error("check:control-names FAILED — the switch shape matched only " + switches + " control(s).");
  console.error("Section 2 checked almost nothing. If the switches were restyled, update the shape");
  console.error("test here; do not read this as 'every switch announces its state'.");
  process.exit(1);
}

if (unnamed.length) {
  console.error("\n" + unnamed.length + " button-like control(s) announce NO NAME at all:");
  for (const u of unnamed) console.error("  " + u.where + "\n      " + u.head.slice(0, 150));
  console.error("\nA screen reader announces these as just \"button\". Name one from the expression");
  console.error("the row ALREADY renders, never a restatement, so the two cannot drift apart.");
}
if (mute.length) {
  console.error("\n" + mute.length + " switch(es) do not announce their state:");
  for (const m of mute) {
    console.error("  " + m.where + (m.roleIsSwitch ? "" : "  [no role=\"switch\"]")
      + (m.statey ? "" : "  [no aria-checked]") + "\n      " + m.head.slice(0, 150));
  }
  console.error("\nA switch whose only state signal is a green background is unreadable to a screen");
  console.error("reader and to anyone who cannot separate the two colours. Take aria-checked from");
  console.error("the control's OWN background condition — never invent a second one.");
}
if (unnamed.length || mute.length) process.exit(1);

console.log("check:control-names: ok — " + scanned + " button-like control(s) named, "
  + switches + " switch(es) announce their state.");
