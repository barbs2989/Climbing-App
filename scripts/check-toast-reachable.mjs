#!/usr/bin/env node
// Every screen `App` can return must be able to SHOW A TOAST.
//
// `showToast` sets state; the toast only appears if the renderer is mounted in whatever App
// returned. App returns early on nine screens — legal, session restore, auth, password
// recovery, the profile editor, both guide screens, the calendar — and until now the toast
// rendered ONLY in the final return. So on those nine screens the message was set into state
// that nothing rendered, and the 2.6s timer then cleared it. Thirteen messages could never
// reach a user:
//
//   * ALL 11 guide-dashboard messages, including four RLS-failure warnings. A guide edits
//     their day rate, taps Save, and the screen does nothing whether the write succeeded or
//     the database refused it. The handlers were wrapped in try/catch precisely because "the
//     rejection became an unhandled promise and the button did nothing at all" — the wrap
//     landed and the toast still could not render.
//   * The guide application's SUBMIT FAILURE. Its success path calls onClose() and so the
//     toast appears; the catch does not, so the one message that matters is the one that
//     cannot render.
//   * "Join a group to create events" — the DEFAULT outcome of the Calendar's "+ Create an
//     event" button. `GROUPS` is empty behind DEMO_FILLERS and `joinedGroups` starts empty,
//     and the early `return` skips setCalOpen(false). Not an edge case; it is the zero state.
//
// NO EXISTING GUARD COVERS THIS, and the near-misses are instructive: `check:zindex` enforces
// that the toast beats every other z-index, and `check:overlay-portals` enforces that it
// escapes the stacking context. Both are about whether a MOUNTED toast is visible. Neither
// asks whether it is mounted at all. A toast can satisfy every ceiling and portal rule in the
// app and still be absent from the screen that fired it.
//
// Static (no browser, no DB), so it sits in `npm run build`.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "ClimbMatch.jsx");

const src = readFileSync(FILE, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });

// The toast element identifier. Named rather than inferred: if the declaration is renamed,
// this must fail loudly instead of finding zero returns and reporting a clean app.
const TOAST_ID = "_toastEl";

let appFn = null;
traverse(ast, {
  FunctionDeclaration(p) { if (p.node.id && p.node.id.name === "App") appFn = p; },
});
if (!appFn) {
  console.error("check:toast-reachable FAILED — no `function App(` found in ClimbMatch.jsx.");
  console.error("The scan cannot have checked anything; this is a broken guard, not a clean app.");
  process.exit(1);
}

// Is the toast declared at all, and declared ABOVE the first early return? Declaring it below
// would be a ReferenceError at runtime, but a `var`-style hoist or a rename could make this
// silently vacuous, so assert position rather than mere presence.
const declIdx = src.indexOf(`const ${TOAST_ID}=`);
if (declIdx < 0) {
  console.error(`check:toast-reachable FAILED — no \`const ${TOAST_ID}=\` declaration.`);
  console.error("Either the toast was inlined back into the final return, or it was renamed.");
  process.exit(1);
}

// App's OWN top-level returns — not those of nested components or callbacks defined inside it.
// Scoping matters: ClimbMatch.jsx defines several components and many inline arrow functions,
// and a `return null` inside one of those is not a screen.
const returns = [];
appFn.traverse({
  ReturnStatement(p) {
    let fn = p.getFunctionParent();
    if (fn && fn.node === appFn.node) returns.push(p);
  },
});

if (returns.length < 5) {
  console.error(`check:toast-reachable FAILED — found only ${returns.length} top-level return(s) in App.`);
  console.error("App has ~10. A scan this short did not read the component; do not read this as a pass.");
  process.exit(1);
}

// A return that yields no UI (`return null`, `return;`) cannot show a toast and is not
// expected to — it is a guard clause, not a screen.
const screens = returns.filter((p) => {
  const a = p.node.argument;
  return a && !(a.type === "NullLiteral") && !(a.type === "Identifier" && a.name === "undefined");
});

const bare = [];
for (const p of screens) {
  let has = false;
  p.traverse({ Identifier(q) { if (q.node.name === TOAST_ID) has = true; } });
  // traverse() skips the node itself, so check a bare `return _toastEl` too.
  if (p.node.argument.type === "Identifier" && p.node.argument.name === TOAST_ID) has = true;
  if (!has) bare.push(p.node.loc.start.line);
}

console.log(`  App top-level returns : ${returns.length}  (${screens.length} render a screen)`);
console.log(`  rendering the toast   : ${screens.length - bare.length}`);

if (bare.length) {
  console.error(`\ncheck:toast-reachable FAILED — ${bare.length} screen(s) render no toast:`);
  for (const l of bare) console.error(`  ClimbMatch.jsx:${l}  ${src.split("\n")[l - 1].trim().slice(0, 100)}`);
  console.error(`\nAny showToast() reached from one of these sets state that nothing renders,`);
  console.error(`and the dismiss timer then clears it. Wrap the return: return <>{${TOAST_ID}}…</>;`);
  process.exit(1);
}

console.log(`\ncheck:toast-reachable: ok — every screen App returns can show a toast.`);

// INJECTION CASES (re-run after any change to the traversal):
//   1. Unwrap one early return (drop `{_toastEl}` from the `calOpen` branch) -> must FAIL
//      naming that line.
//   2. Rename the declaration to `_toastX` -> must FAIL on the missing declaration, NOT pass
//      with 0 screens checked.
//   3. Rename `function App(` -> must FAIL saying the scan checked nothing.
//   4. Add `if(x)return null;` inside App -> must still PASS (a guard clause is not a screen).
//   5. Add a nested `function Foo(){return <div/>}` inside App -> must still PASS (its return
//      is not App's).
