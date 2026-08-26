// check:clickable — a control you can only operate with a mouse.
//
// This app has no CSS framework and no component library, so every control is built by
// hand from inline styles. That is fine for a <button>, which the platform makes
// focusable, operable by Enter and Space, and announced as a button for free. It is not
// fine for `<div onClick={…}>`, which the platform gives none of those things:
//
//   - it is not in the tab order, so a keyboard user cannot reach it at all;
//   - Enter and Space do nothing, because there is no default action to trigger;
//   - a screen reader announces its text as prose, with no indication it can be used.
//
// This is not a nitpick about markup. The route list, the area list and the climber
// cards are all `<div onClick={openRoute}>`, so at the time this check was written the
// primary way to navigate the app — opening a climb — could not be done from a keyboard.
//
// The fix is the standard triad, and all three parts are load-bearing:
//
//   <div role="button" tabIndex={0} onClick={go} onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go())}>
//
//   role      what a screen reader announces it as
//   tabIndex  whether a keyboard can reach it
//   onKeyDown whether pressing a key does anything once it is reached
//
// A div with `role="button"` and no `tabIndex` is arguably worse than a bare div: it is
// announced as a button and then cannot be used, so this requires all three rather than
// treating role alone as progress.
//
// WHAT THIS CANNOT SEE. The baseline is a per-file COUNT, so it is a ratchet: the number
// may go down and never up. It cannot see a one-for-one swap — fixing one control while
// adding another in the same file leaves the count unchanged. A stable per-control key
// would be better, but this codebase packs many declarations onto one physical line, so
// line numbers do not identify a control and handler text repeats verbatim
// (`()=>openRoute(r)` appears many times). A ratchet that is honest about its blind spot
// beats a key that silently stops matching.
//
//   node scripts/check-clickable-divs.mjs [--update]
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "clickable-divs-baseline.json");
const UPDATE = process.argv.includes("--update");

// Roles that promise the user a control they can operate. Deliberately excludes structural
// roles (dialog, region, status, banner, navigation, group, alert), which need neither a tab
// stop nor a key handler and are correct as written.
const INTERACTIVE_ROLES = new Set([
  "button", "checkbox", "link", "menuitem", "menuitemcheckbox", "menuitemradio",
  "option", "radio", "switch", "tab",
]);
const inert = [];

// Elements the platform already makes focusable and operable. A click handler on any of
// these is fine; <label> is here because clicking it operates the control it labels.
const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);

const KEY_HANDLERS = ["onKeyDown", "onKeyUp", "onKeyPress"];

const files = appSources(ROOT, "check:clickable").filter((f) => f.endsWith(".jsx"));

const offenders = [];
let candidates = 0;

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error(`\ncheck:clickable FAILED — could not parse ${rel}: ${e.message}\n`); process.exit(1); }

  traverse(ast, {
    JSXOpeningElement(p) {
      const name = p.node.name;
      // Only host elements. <Foo onClick/> is a component whose own JSX is checked
      // where it is defined, so flagging the call site would double-count it.
      if (!name || name.type !== "JSXIdentifier") return;
      const tag = name.name;
      if (!/^[a-z]/.test(tag) || NATIVE.has(tag)) return;

      const attrs = new Set(
        p.node.attributes
          .filter((a) => a.type === "JSXAttribute" && a.name && a.name.type === "JSXIdentifier")
          .map((a) => a.name.name)
      );

      // `{...clickable(fn)}` supplies role, tabIndex, onClick and onKeyDown together.
      // It has to be recognised explicitly: a spread carries no attribute names, so
      // without this a FIXED control stops looking like a control at all — it would
      // drop out of `candidates` and read as one fewer thing to check, rather than as
      // one more thing fixed.
      const viaHelper = p.node.attributes.some(
        (a) => a.type === "JSXSpreadAttribute" && a.argument &&
          a.argument.type === "CallExpression" && a.argument.callee &&
          a.argument.callee.name === "clickable"
      );
      if (viaHelper) { candidates++; return; }

      const onClick = p.node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "onClick"
      );
      if (!onClick) return;

      // `onClick={e => e.stopPropagation()}` is not a control — it is a shield that stops
      // a click inside a sheet from reaching the backdrop that closes it. Demanding a role
      // and a tab stop there would put an announced, focusable "button" that does nothing
      // in front of every modal's content.
      //
      // Matched on what the handler DOES, not on which syntax it happens to be written in.
      // The first version tested for an arrow function with an expression body and nothing
      // else, but this codebase writes its shields as `function(e){e.stopPropagation();}` —
      // a FunctionExpression with a BLOCK body — so all 13 of them were counted as
      // mouse-only controls. That is the "too-narrow proxy" failure, and here it points the
      // wrong way round: it does not hide a defect, it manufactures 13, every one of them an
      // element the note above says must NEVER be given a tab stop. An author working the
      // baseline down would have been told to break exactly the thing the exemption exists
      // to protect.
      //
      // The body must be that one call and NOTHING else. A handler that stops propagation
      // and then does real work IS a control, and widening far enough to swallow it would
      // hide a genuine defect — the direction that actually matters.
      const ex = onClick.value && onClick.value.type === "JSXExpressionContainer" && onClick.value.expression;
      const isStopCall = (n) =>
        n && n.type === "CallExpression" && n.callee &&
        n.callee.type === "MemberExpression" &&
        n.callee.property && n.callee.property.name === "stopPropagation";
      const isShield = (() => {
        if (!ex) return false;
        if (ex.type !== "ArrowFunctionExpression" && ex.type !== "FunctionExpression") return false;
        if (isStopCall(ex.body)) return true; // `e => e.stopPropagation()`
        if (ex.body && ex.body.type === "BlockStatement") {
          const b = ex.body.body; // `function(e){ e.stopPropagation(); }` — one statement only
          return b.length === 1 && b[0].type === "ExpressionStatement" && isStopCall(b[0].expression);
        }
        return false;
      })();
      if (isShield) return;

      candidates++;

      const missing = [];
      if (!attrs.has("role")) missing.push("role");
      if (!attrs.has("tabIndex")) missing.push("tabIndex");
      if (!KEY_HANDLERS.some((k) => attrs.has(k))) missing.push("a key handler");

      // A SEPARATE, WORSE CLASS, held at zero rather than baselined.
      //
      // A bare <div onClick> is invisible to a screen reader: it is announced as prose and
      // skipped. An element carrying an INTERACTIVE role is announced as a control -- so the
      // app states that it works -- and if it has no key handler, or no tab stop, it does
      // not. Being told a button exists and having it do nothing is worse than never being
      // offered it, which is why this is not allowed to sit in a baseline and be worked off
      // "eventually". There was exactly one (the reaction chip in ClimbMatchCore, announced
      // "Add a reaction", reachable by Tab, inert on Enter); it is fixed, so zero is holdable.
      //
      // Scoped to interactive roles ON PURPOSE. `role="dialog"` on a modal container needs no
      // tab stop and no key handler, and there are ~54 of those across these files: a check
      // that flagged them would be telling authors to break correct markup, which is the
      // failure this file already records twice.
      const roleAttr = p.node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "role"
      );
      const roleVal = roleAttr && roleAttr.value && roleAttr.value.type === "StringLiteral" ? roleAttr.value.value : null;
      if (roleVal && INTERACTIVE_ROLES.has(roleVal)) {
        const broken = [];
        if (!attrs.has("tabIndex")) broken.push("no tab stop");
        if (!KEY_HANDLERS.some((k) => attrs.has(k))) broken.push("no key handler");
        if (broken.length) {
          inert.push({
            file: rel, line: p.node.loc.start.line, tag, role: roleVal,
            why: broken.join(" + "),
            handler: src.slice(onClick.start, onClick.end).replace(/\s+/g, " ").slice(0, 60),
          });
        }
      }

      // Is this a BACKDROP? position:fixed covering the viewport, whose click dismisses.
      // Resolved through {...styles.overlay} spreads and quote-normalised, because
      // GpsSubmissionModal writes position:'fixed' single-quoted in a shared style object —
      // reading only the inline literal called its two overlays real controls, contradicting
      // CLAUDE.md, and CLAUDE.md was right.
      const styleAttr = p.node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "style"
      );
      let styleTxt = styleAttr ? src.slice(styleAttr.start, styleAttr.end).replace(/\s+/g, "") : "";
      for (const m of styleTxt.matchAll(/\.\.\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g)) {
        const re = new RegExp("(^|[^\\w$])" + m[2] + "\\s*:\\s*\\{", "m");
        const hit = re.exec(src);
        if (!hit) continue;
        const i0 = src.indexOf("{", hit.index + hit[0].length - 1);
        let d = 0, e0 = i0;
        for (let k = i0; k < src.length; k++) {
          if (src[k] === "{") d++;
          else if (src[k] === "}") { d--; if (!d) { e0 = k; break; } }
        }
        styleTxt += src.slice(i0, e0 + 1).replace(/\s+/g, "");
      }
      styleTxt = styleTxt.replace(/'/g, '"');
      const isBackdrop = /position:"fixed"/.test(styleTxt) &&
        (/inset:0/.test(styleTxt) ||
         (/top:0/.test(styleTxt) && /left:0/.test(styleTxt) && /right:0/.test(styleTxt)));

      if (missing.length) {
        offenders.push({
          file: rel, line: p.node.loc.start.line, tag, missing: missing.join(" + "), isBackdrop,
          // The handler text is what identifies a control in a file that packs many
          // declarations onto one line — a line number does not.
          handler: src.slice(onClick.start, onClick.end).replace(/\s+/g, " ").slice(0, 70),
        });
      }
    },
  });
}

// Fail closed. This app is built almost entirely from clickable non-native elements, so a
// scan that finds none of them did not find a clean codebase — it broke. Same stance as
// check:a11y-badges, and the reason guard-sources.mjs exists.
if (!candidates) {
  console.error("\ncheck:clickable FAILED — found no clickable non-native elements at all across");
  console.error(`${files.length} file(s). This app is built from them, so the scan is broken, not the code.\n`);
  process.exit(1);
}

const counts = {};
for (const o of offenders) counts[o.file] = (counts[o.file] || 0) + 1;

if (process.argv.includes("--list")) {
  for (const o of offenders) console.log(`${o.file}:${o.line}\t<${o.tag}>\t${o.handler}`);
  process.exit(0);
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + "\n");
  console.log(`Baseline updated: ${offenders.length} mouse-only control(s) across ${Object.keys(counts).length} file(s).`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : {};
// Reported BEFORE the count tests, and the order is load-bearing: those blocks exit, so an
// inert control announced in the same commit that added a mouse-only one was silently never
// reported. The injections caught that -- both real-defect cases came back "guard pass".
// This class is the more severe one, so it must not be masked by a count it is unrelated to.
if (inert.length) {
  console.error("\ncheck:clickable FAILED — control(s) that ANNOUNCE themselves and do not work:\n");
  for (const r of inert) {
    console.error(`  ${r.file}:${r.line}  <${r.tag} role="${r.role}">  ${r.why}`);
    console.error(`      ${r.handler}`);
  }
  console.error(`
An interactive role tells a screen reader this is a usable control. Without a tab stop it
cannot be reached; without a key handler Enter and Space do nothing. Either way the app is
claiming something false, which is worse than a bare <div onClick> that is simply skipped.

Spread the shared helper — {...clickable(fn)} — which supplies role, tabIndex and the key
handler together, and keep any aria-label beside it (the helper names nothing).

This is NOT baselined. It is held at zero.\n`);
  process.exit(1);
}

// Placed BEFORE the count tests, and the order is load-bearing: those blocks exit, so a
// swap that also perturbs the count fired the regression block and never reached this
// one. The injections caught it — case 2 came back "guard pass".
// EVERY REMAINING MOUSE-ONLY CONTROL IS EITHER A BACKDROP OR DECLARED HERE.
//
// The baseline is a COUNT, so it cannot see a one-for-one swap: fix one control, add another
// in the same file, and the number is unchanged. That blind spot was unavoidable at 247
// remaining. It is not now — the sweep is finished, so the remainder is small enough to
// classify, and a control that is neither a backdrop nor declared below is a NEW defect
// whatever the count says.
//
// Keyed on the handler text, which identifies a control in a file that packs many
// declarations onto one physical line where a line number does not. A STALE entry fails, so
// this cannot rot into a description of code that is gone.
const DUPLICATES = {
  "ClimbMatch.jsx": [
    ["()=>{setSharedRoute(null);setProfileModal(c);}",
     "avatar beside a sibling running the identical handler and already named — a second tab stop to the same profile is noise, not access"],
  ],
  "ClimbMatchCore.jsx": [
    ["()=>onViewProfile(c)",
     "same shape: the climber's NAME beside it carries the tab stop"],
  ],
};

const undeclared = [], staleDup = [];
for (const [file, rows] of Object.entries(DUPLICATES)) {
  for (const [handler, why] of rows) {
    const hit = offenders.some((o) => o.file === file && !o.isBackdrop && o.handler.replace(/\s+/g, "").includes(handler.replace(/\s+/g, "")));
    if (!hit) staleDup.push(`${file}: ${handler}  (${why})`);
  }
}
for (const o of offenders) {
  if (o.isBackdrop) continue;
  const rows = DUPLICATES[o.file] || [];
  const declared = rows.some(([h]) => o.handler.replace(/\s+/g, "").includes(h.replace(/\s+/g, "")));
  if (!declared) undeclared.push(o);
}
if (undeclared.length || staleDup.length) {
  console.error("\ncheck:clickable FAILED — the remainder is no longer fully accounted for:\n");
  for (const o of undeclared) {
    console.error(`  NEW mouse-only control  ${o.file}:${o.line}  <${o.tag}>  missing ${o.missing}`);
    console.error(`      ${o.handler}`);
  }
  for (const t of staleDup) console.error(`  STALE declaration (nothing matches it any more)  ${t}`);
  console.error(`
Every remaining mouse-only control must be a BACKDROP — position:fixed covering the
viewport, which must never get a tab stop — or declared in DUPLICATES with a reason.

This catches what the baseline COUNT cannot: fixing one control while adding another leaves
the number unchanged, and the sweep is finished, so a new unclassified control is a defect
rather than backlog. Give it {...clickable(fn)}, or declare why it must stay mouse-only.\n`);
  process.exit(1);
}

const regressions = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] || 0;
  if (n > allowed) regressions.push({ file, n, allowed });
}

console.log(`  scanned  ${files.length} file(s), ${candidates} clickable non-native element(s)`);
console.log(`  mouse-only ${offenders.length} (baseline allows ${Object.values(baseline).reduce((a, b) => a + b, 0)})`);

if (regressions.length) {
  console.error("\ncheck:clickable FAILED — new control(s) that a keyboard cannot operate:\n");
  for (const r of regressions) {
    console.error(`  ${r.file}: ${r.n} mouse-only control(s), baseline allows ${r.allowed}`);
    for (const o of offenders.filter((x) => x.file === r.file).slice(0, 8)) {
      console.error(`    line ${o.line}  <${o.tag} onClick>  missing ${o.missing}`);
    }
  }
  console.error(`
Give it the full triad — role="button", tabIndex={0}, and an onKeyDown that fires on
Enter and Space. role alone is worse than nothing: it announces a button that cannot
be used. Run with --update only when lowering the baseline.\n`);
  process.exit(1);
}


// A baseline that is higher than reality is stale bookkeeping: it silently re-opens room
// for regressions someone already paid to close.

const stale = Object.entries(baseline).filter(([f, n]) => (counts[f] || 0) < n);
if (stale.length) {
  console.error("\ncheck:clickable FAILED — the baseline is stale, which quietly allows regressions:\n");
  for (const [f, n] of stale) console.error(`  ${f}: baseline allows ${n}, actual is ${counts[f] || 0}`);
  console.error("\nRun `node scripts/check-clickable-divs.mjs --update` to lower it.\n");
  process.exit(1);
}

console.log(`\ncheck:clickable: ok — no new mouse-only controls (${offenders.length} known, awaiting fixes).`);
