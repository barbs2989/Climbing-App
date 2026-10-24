#!/usr/bin/env node
// check:overlay-portals — every full-screen overlay reachable from inside #appscroll must
// be portalled to document.body.
//
// Why. index.html sets `.cm-fadein { animation: cm-fadein .22s ease both; }` and App puts
// that class on `<div id="appscroll">`, the per-tab scroll container. `animation-fill-mode:
// both` means the animation's effect applies indefinitely, which makes #appscroll a
// PERMANENT stacking context at `z-index: auto` — even though its computed opacity is 1 and
// it sets no z-index of its own. The app header + primary nav is a sibling that comes
// EARLIER in DOM order with `zIndex: 30`. 30 beats auto, so every `position:fixed` overlay
// rendered inside #appscroll is painted underneath the header and tabs, whatever z-index it
// asks for. Raising the z-index does nothing. The fix is always a portal.
//
// That is #687: the Route finder's Filters sheet opened with its top 81px — the whole title
// row and the × close button — behind the tabs, and the × was not clickable. check:zindex
// could not see it; it only enforces a ceiling below Z_TOAST, and the sheet's 300 was fine.
//
// Overlays rendered OUTSIDE #appscroll (App's own modal block, which sits before it in the
// tree) are unaffected and are not required to portal — hence the reachability analysis
// rather than a blanket rule.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;
import { assertCovered } from "./lib/guard-sources.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts", "audits"]);
// Walk the tree rather than naming files — a guard with a hardcoded list silently narrows
// every time the code moves (that is how check:refs came to read 24% of the app for a week).
// `.jsx` only: every component in this app is .jsx, while loose `.js` under scratch dirs like
// enrichment-wip/ is generated snippets that do not parse as modules.
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue; // a dot entry is never app source,
    // and a guard temp file that vanishes between this readdir and the stat below would
    // otherwise kill this walk — the guards now run concurrently.
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.[jt]sx$/.test(name)) out.push(p);
  }
  return out;
};

const files = assertCovered(walk(ROOT), ROOT, "check:overlays");
const graph = new Map();      // component name -> Set of component names it renders
const overlays = [];          // {component, file, line, z, portalled}
let appscrollSeed = null;     // Set of component names rendered inside #appscroll
// A default import may rename the component: ClimbMatch.jsx renders `<AuthModal>`, and the function in
// lib/AuthModal.jsx is `LoginScreen`. The graph is keyed by function name, so without this the edge
// ended at a name no overlay carries and the sign-in modal read as "outside #appscroll".
const defaultExport = new Map(); // file path without extension -> its default-exported function's name
const defaultImports = [];       // {local, target: path without extension}
const noExt = (f) => f.replace(/\.[jt]sx?$/, "");

const componentNameOf = (path) => {
  let p = path;
  while (p) {
    if (p.isFunctionDeclaration() && p.node.id) return p.node.id.name;
    if ((p.isFunctionExpression() || p.isArrowFunctionExpression()) &&
        p.parentPath && p.parentPath.isVariableDeclarator() && p.parentPath.node.id.name) {
      return p.parentPath.node.id.name;
    }
    p = p.parentPath;
  }
  return null;
};

// Is this JSX element (or an ancestor) the argument of a createPortal(...) call?
const isPortalCall = (n) => {
  const c = n.callee;
  return (c.type === "Identifier" && c.name === "createPortal") ||
    (c.type === "MemberExpression" && c.property && c.property.name === "createPortal");
};
const insidePortal = (path) => {
  let p = path;
  while (p) {
    if (p.isCallExpression() && isPortalCall(p.node)) return true;
    // `const ui = <div style={full ? {position:"fixed",...} : ...}>` then `createPortal(ui, document.body)`:
    // GPXMap builds its full-screen map that way, so the element is portalled through its variable.
    if (p.isVariableDeclarator() && p.node.id.type === "Identifier") {
      const b = p.scope.getBinding(p.node.id.name);
      if (b && b.referencePaths.some((r) => r.parentPath.isCallExpression() && isPortalCall(r.parentPath.node) && r.parentPath.node.arguments[0] === r.node)) return true;
    }
    p = p.parentPath;
  }
  return false;
};

// The style objects an element can render with. A plain `style={{...}}` is one; `style={cond ? {...} : {...}}`
// is BOTH branches. Reading only the plain shape let the sign-in modal through (lib/AuthModal.jsx, whose
// style is `gate ? {full page} : {sheet}`): it renders inside #appscroll unportalled, so the app header
// painted over its ✕ -- found 2026-10-24 by check:pinned-dismiss, not by this guard.
const styleObjects = (attr) => {
  if (!attr || attr.name?.name !== "style") return [];
  const v = attr.value;
  if (!v || v.type !== "JSXExpressionContainer") return [];
  const out = [];
  const take = (e) => {
    if (!e) return;
    if (e.type === "ObjectExpression") out.push(e);
    else if (e.type === "ConditionalExpression") { take(e.consequent); take(e.alternate); }
    else if (e.type === "LogicalExpression") take(e.right);
  };
  take(v.expression);
  return out;
};
const propOf = (obj, k) => obj.properties.find((p) => p.type === "ObjectProperty" && (p.key.name === k || p.key.value === k));

const styleHasFixed = (attr) =>
  // style={{position:"fixed", ...}}, in any branch
  styleObjects(attr).some((obj) => { const p = propOf(obj, "position"); return !!p && p.value.type === "StringLiteral" && p.value.value === "fixed"; });
const zOf = (attr) => {
  for (const obj of styleObjects(attr)) {
    const p = propOf(obj, "zIndex");
    if (!p) continue;
    if (p.value.type === "NumericLiteral") return p.value.value;
    if (p.value.type === "Identifier") return p.value.name;
  }
  return null;
};
// A full-screen overlay: `inset` OR all four of top/right/bottom/left. Both spellings are
// in use — ClimbMatchCore's Help sheet writes `left:0,right:0,top:0,bottom:0`, and an
// inset-only test silently passed it. Anything narrower (a map's fullscreen button, a
// floating action pill) is position:fixed too but is not a modal and must not be flagged.
const isFullScreen = (attr) => styleObjects(attr).some((obj) => {
  const has = (k) => !!propOf(obj, k);
  return has("inset") || (has("top") && has("right") && has("bottom") && has("left"));
});

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
  catch (e) { console.error(`  parse error ${relative(ROOT, file)}: ${e.message}`); process.exit(1); }
  const rel = relative(ROOT, file);

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const d = path.node.declaration;
      if (d && d.id && d.id.name) defaultExport.set(noExt(file), d.id.name);
    },
    ImportDeclaration(path) {
      const src = path.node.source.value;
      if (!src.startsWith(".")) return;
      for (const sp of path.node.specifiers) {
        if (sp.type === "ImportDefaultSpecifier") defaultImports.push({ local: sp.local.name, target: noExt(resolve(dirname(file), src)) });
      }
    },
    JSXOpeningElement(path) {
      const owner = componentNameOf(path) || "(module)";
      // record the render edge
      const nameNode = path.node.name;
      const rendered = nameNode.type === "JSXIdentifier" ? nameNode.name : null;
      if (rendered && /^[A-Z]/.test(rendered)) {
        if (!graph.has(owner)) graph.set(owner, new Set());
        graph.get(owner).add(rendered);
      }
      // the #appscroll seed: everything rendered under that element
      const idAttr = path.node.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "id" &&
        a.value && a.value.type === "StringLiteral" && a.value.value === "appscroll");
      if (idAttr) {
        appscrollSeed = new Set();
        const el = path.parentPath; // JSXElement
        el.traverse({
          JSXOpeningElement(inner) {
            const n = inner.node.name;
            if (n.type === "JSXIdentifier" && /^[A-Z]/.test(n.name)) appscrollSeed.add(n.name);
          },
        });
      }
      // the overlay itself
      const styleAttr = path.node.attributes.find((a) => a.type === "JSXAttribute" && a.name?.name === "style");
      if (styleHasFixed(styleAttr) && isFullScreen(styleAttr)) {
        overlays.push({
          component: owner, file: rel, line: path.node.loc.start.line,
          z: zOf(styleAttr), portalled: insidePortal(path),
        });
      }
    },
  });
}

if (!appscrollSeed) {
  console.error("check:overlay-portals FAILED — no element with id=\"appscroll\" found.");
  console.error("The check locates the tab scroll container by that id; if it was renamed, update this script.");
  process.exit(1);
}

for (const { local, target } of defaultImports) {
  const real = defaultExport.get(target);
  if (real && real !== local) { if (!graph.has(local)) graph.set(local, new Set()); graph.get(local).add(real); }
}

// Transitive closure: every component reachable from inside #appscroll.
const inside = new Set(appscrollSeed);
const queue = [...appscrollSeed];
while (queue.length) {
  const n = queue.pop();
  for (const child of graph.get(n) || []) if (!inside.has(child)) { inside.add(child); queue.push(child); }
}

const offenders = overlays.filter((o) => !o.portalled && inside.has(o.component));
const okInside = overlays.filter((o) => o.portalled && inside.has(o.component));
const outside = overlays.filter((o) => !inside.has(o.component));

console.log(`  ok    ${overlays.length} full-screen overlay(s) found`);
console.log(`  ok    ${inside.size} component(s) reachable from inside #appscroll`);
console.log(`  ok    ${outside.length} overlay(s) render outside #appscroll (portal not required)`);
console.log(`  ok    ${okInside.length} overlay(s) inside #appscroll are portalled`);

if (offenders.length) {
  console.log("");
  for (const o of offenders) {
    console.log(`  FAIL  ${o.file}:${o.line} <${o.component}> z=${o.z} — reachable from #appscroll and NOT portalled;`);
    console.log(`        it will paint UNDER the header/nav. Wrap it in createPortal(..., document.body).`);
  }
  console.log(`\ncheck:overlay-portals — ${offenders.length} overlay(s) trapped under the app header.`);
  process.exit(1);
}
console.log("\ncheck:overlay-portals: ok — every overlay inside #appscroll escapes to document.body.");
