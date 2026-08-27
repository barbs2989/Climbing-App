// probe-mute-group-candidates — button groups that mark a selection with COLOUR and announce
// nothing, found STATICALLY so that reachability stops mattering.
//
// check:selected-state is behavioural and can only report a screen it OPENS. Two findings in two
// days came from that hole rather than from the detector: the Inbox modal's Friends/Crews bar
// (#1233, an overlay nothing discovered) and the Plan tab's pack-weight selector (#1271, a click
// past where the walk stopped). Its own header says a hole in coverage is invisible by
// construction, because nothing reports a screen that was never opened.
//
// This asks the same question with no browser, so a control behind a non-default sub-tab, a
// rarely-opened overlay or a discipline gate is as visible as one on Home.
//
// IT IS A CANDIDATE LIST, NOT A DETECTOR, and that is not modesty -- check:selected-state's header
// records WHY markup cannot decide this: a tab bar, an independent toggle and a plain action
// button are all "a <button> with a conditional background", and only DOING it separates them.
// The first behavioural draft flagged [Accept | Decline] and [Edit profile | Settings] on exactly
// that confusion. So this narrows to a reviewable list and a human reads it.
//
// The shape: two or more sibling button-like elements, at least one carrying a background (or
// colour/borderColor) driven by a CONDITIONAL, and NONE of the siblings carrying any of the five
// announcing attributes.
//
// MEASURED 2026-08-26: 672 groups examined, 9 candidates, ONE real -- and the 8 rejects are worth
// knowing, because they are the whole reason this cannot be a gate:
//
//   FIVE are ACTION PAIRS -- [Cancel | Confirm], [Cancel | Save]. One is styled as the primary
//   action and the other as secondary, which looks identical in markup to a selection and is not
//   one. The behavioural draft of check:selected-state flagged exactly this class.
//   TWO announce their state through their own TEXT: {logged?"✓ Logged":"Log ascent?"} and the
//   connect button's {fstate==="friends"?...}. The name carries the state, so nothing is missing.
//   ONE is a submit button whose background tracks form validity and which carries `disabled`,
//   the correct announcement for that.
//
// The real one was the recap flow's [Showed | No-show] per crew member -- a partner-reliability
// record whose own copy says it "feeds the trust score", marked by colour alone. Fixed with
// aria-pressed plus a name carrying m.name, since N members each render a button labelled
// "Showed" and a row of identically-named controls announces as indistinguishable.
//
// WHY check:selected-state MISSED IT, which matters more than the finding: that guard DOES walk
// overlay:recapId. The marks render inside `_mem.map(...)`, one row per crew member, so a recap
// with no members renders no rows, no group exists, and nothing is measured. That is not the
// "a screen nobody opened" hole -- it is the screen-opens-but-content-does-not shape, the same
// zero-row blindness check:field-renders records. A behavioural guard cannot see a control its
// fixture gives it no data to render; a static scan can.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "../lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = new URL("../..", import.meta.url).pathname;
const SAYS = ["aria-current", "aria-selected", "aria-pressed", "aria-expanded", "aria-checked"];

const attr = (open, name) => open.attributes.find(
  (a) => a.type === "JSXAttribute" && a.name && a.name.name === name);

const INTERACTIVE = ["button", "tab", "checkbox", "switch", "radio", "option", "menuitem"];
const isButtonLike = (open) => {
  if (open.name.type !== "JSXIdentifier") return false;
  if (open.name.name === "button") return true;
  const role = attr(open, "role");
  return !!(role && role.value && role.value.type === "StringLiteral"
    && INTERACTIVE.includes(role.value.value));
};

const announces = (open) => SAYS.some((s) => attr(open, s));

// A selection marked by STYLE: a conditional feeding background / colour / border. Read from the
// AST, NOT from the source text, and the regex it replaces was wrong in two ways that a revert
// test caught and reading never would have:
//
//   - it sliced to the first ">" to find the opening tag, and onClick={()=>...} puts a ">" inside
//     an ARROW FUNCTION, so the slice ended before style= was even reached;
//   - its [^,}]* could not cross a comma, so background:slotOn(m,d[0],p)?A:B -- a condition that
//     is a CALL with arguments -- never matched.
//
// Between them the probe was blind to the Crew tab's availability grid, which is precisely the
// shape it exists to find. An object property either holds a ConditionalExpression or it does not.
const STYLE_KEYS = new Set(["background", "backgroundColor", "borderColor", "color", "border"]);
const holdsConditional = (n, depth = 0) => {
  if (!n || depth > 6) return false;
  if (n.type === "ConditionalExpression") return true;
  if (n.type === "BinaryExpression") return holdsConditional(n.left, depth + 1) || holdsConditional(n.right, depth + 1);
  if (n.type === "LogicalExpression") return holdsConditional(n.left, depth + 1) || holdsConditional(n.right, depth + 1);
  if (n.type === "TemplateLiteral") return n.expressions.some((e) => holdsConditional(e, depth + 1));
  return false;
};
const styleIsConditional = (open) => {
  const st = open.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "style");
  if (!st || !st.value || st.value.type !== "JSXExpressionContainer") return false;
  const obj = st.value.expression;
  const props = obj.type === "ObjectExpression" ? obj.properties
    : (obj.type === "ConditionalExpression" ? [] : []);
  if (obj.type === "ConditionalExpression") return true;   // the whole style object is switched
  for (const pr of props) {
    if (pr.type !== "ObjectProperty" || !pr.key) continue;
    const k = pr.key.name || pr.key.value;
    if (!STYLE_KEYS.has(k)) continue;
    if (holdsConditional(pr.value)) return true;
  }
  return false;
};

const files = appSources(ROOT, "probe-mute-group-candidates").map((f) => ROOT + f);
let groupsSeen = 0;
const findings = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error("FAIL: parse " + f + " — " + e.message); process.exit(1); }
  const short = f.replace(/.*\/(?=[^/]*$)/, "");

  traverse(ast, {
    JSXElement(path) {
      // Siblings of a shared parent, the same grouping the browser guard uses.
      const kids = path.node.children.filter(
        (c) => c.type === "JSXElement" && isButtonLike(c.openingElement));
      // A .map() over options renders a group from ONE element, so a single templated child whose
      // style is conditional counts too -- that is how most of these bars are actually written.
      const mapped = path.node.children.filter((c) => c.type === "JSXExpressionContainer"
        && c.expression.type === "CallExpression"
        && c.expression.callee.type === "MemberExpression"
        && c.expression.callee.property.name === "map");
      if (kids.length < 2 && !mapped.length) return;
      groupsSeen++;

      const members = kids.slice();
      // A .map() arrow can return a TERNARY, and that is not a corner case -- it is how the Crew
      // tab's weekly availability grid is written: {DOW.map(d => m._me ? <button .../> : <div/>)}.
      // A version that only accepted a bare JSXElement body walked straight past it, so a real
      // 14-cell mute grid was missed by the very probe written to find mute grids. Descend into
      // both branches of a conditional, and into a logical expression's right-hand side.
      const jsxFrom = (node, out = []) => {
        if (!node) return out;
        if (node.type === "JSXElement") { out.push(node); return out; }
        if (node.type === "ConditionalExpression") { jsxFrom(node.consequent, out); jsxFrom(node.alternate, out); return out; }
        if (node.type === "LogicalExpression") { jsxFrom(node.right, out); return out; }
        if (node.type === "JSXFragment") { for (const c of node.children) jsxFrom(c, out); return out; }
        return out;
      };
      for (const m of mapped) {
        const fn = m.expression.arguments[0];
        if (!fn || !fn.body) continue;
        // A BLOCK body is not a rarity to skip -- it is how a bar that needs a local is written:
        // SCOPES.map(x=>{const on=scope===x[0]; return <button .../>}). Skipping it hid the Ranks
        // tab's [Overall|Near me|Friends|By area] bar, which the browser guard then found the
        // moment its tab list was corrected. THIRD narrowing bug in this probe, and every one of
        // them failed the same way: as a silently shorter worklist.
        const bodies = fn.body.type === "BlockStatement"
          ? fn.body.body.filter((st) => st.type === "ReturnStatement").map((st) => st.argument)
          : [fn.body];
        for (const b of bodies) {
          for (const el of jsxFrom(b)) {
            if (isButtonLike(el.openingElement)) members.push(el);
          }
        }
      }
      if (members.length < 2 && !mapped.length) return;
      if (!members.length) return;

      // PRECISION: a SELECTION styles every member conditionally; an ACTION PAIR styles one.
      //
      // [Cancel | Confirm] has a static Cancel and a Confirm whose background tracks disabled or
      // busy, so "any member is conditional" describes it perfectly and describes a tab bar
      // equally well. Reading the AST instead of the old broken regex took the raw count from 8 to
      // 47, and nearly all of the new ones are that pair. Requiring TWO conditional members
      // separates them, because a bar marks the selected one AND the unselected ones from the same
      // expression.
      //
      // A .map() is exempt from the count: one JSX element renders every member, so a single
      // conditional member there IS all of them. That is how most real bars in this app are
      // written, and demanding two would hide exactly the shape this probe exists for.
      // A control carrying `disabled` is not a selection: its conditional background tracks form
      // VALIDITY (disabled={!ok}, background:ok?blue:grey), and `disabled` is already the correct
      // announcement for that. Counting them made a submit button look like a mute tab.
      const usable = members.filter((m) => !m.openingElement.attributes.some(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "disabled"));
      if (!usable.length) return;
      const condCount = usable.filter((m) => styleIsConditional(m.openingElement)).length;
      const anyConditional = mapped.length ? condCount >= 1 : condCount >= 2;
      if (!anyConditional) return;
      if (usable.some((m) => announces(m.openingElement))) return;

      findings.push({
        where: short + ":" + path.node.openingElement.loc.start.line,
        n: usable.length,
        sample: src.slice(usable[0].start, Math.min(usable[0].end, usable[0].start + 150)).replace(/\s+/g, " "),
      });
    },
  });
}

if (!groupsSeen) { console.error("FAIL: found NO sibling control groups — the scan broke"); process.exit(1); }
console.log("sibling control groups examined: " + groupsSeen);
console.log("groups marking a selection by STYLE with no announcing attribute: " + findings.length + "\n");
for (const x of findings) console.log("  " + x.where + "  (" + x.n + " member(s))\n      " + x.sample + "\n");
