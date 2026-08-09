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
      const ex = onClick.value && onClick.value.type === "JSXExpressionContainer" && onClick.value.expression;
      const isShield =
        ex && ex.type === "ArrowFunctionExpression" && ex.body &&
        ex.body.type === "CallExpression" && ex.body.callee &&
        ex.body.callee.type === "MemberExpression" &&
        ex.body.callee.property && ex.body.callee.property.name === "stopPropagation";
      if (isShield) return;

      candidates++;

      const missing = [];
      if (!attrs.has("role")) missing.push("role");
      if (!attrs.has("tabIndex")) missing.push("tabIndex");
      if (!KEY_HANDLERS.some((k) => attrs.has(k))) missing.push("a key handler");
      if (missing.length) {
        offenders.push({
          file: rel, line: p.node.loc.start.line, tag, missing: missing.join(" + "),
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
