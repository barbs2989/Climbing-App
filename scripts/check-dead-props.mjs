// check:dead-props — a prop is either read by the component or it should not be there.
//
// Two questions, both about write paths that do not exist:
//
//   1. Does a component destructure a prop and never reference it?
//   2. Does a JSX call site pass a prop the component never destructures?
//
// (2) is the one that bites at runtime: <Foo onSave={...}/> where Foo reads `onSubmit`
// looks correct at both ends and silently does nothing. (1) is slower-acting but did
// real damage here: #656 deferred list persistence partly because `Challenges` received
// `setUserLists` -- and never called it. Dead wiring is how a reader concludes a feature
// is already plumbed. #667 swept both categories to zero; this keeps them there.
//
// What a pass does NOT mean: that a referenced prop is USED meaningfully. A prop
// forwarded straight to a child counts as referenced, which is correct (that is the
// normal React idiom) but means this guard cannot see a handler wired to a button that
// never renders. It answers "is this prop connected at all", not "does it do anything".
//
// Components that spread ...rest are skipped for (2) -- they legitimately accept
// anything. Names defined in more than one file are resolved against the definition in
// the CALLING file, and skipped when that is ambiguous, because `LoginScreen`, `Pill`
// and `SL` each exist twice in this repo and a name-keyed lookup silently picks one.
//
// Walks the tree rather than naming files: a guard with a hardcoded list silently
// covered 24% of this repo after the app was split into three files (#547).
//
//   node scripts/check-dead-props.mjs            # fail on anything not in the baseline
//   node scripts/check-dead-props.mjs --update   # rewrite the baseline
//
// Injection-tested. Three defects in the first draft each made it report a clean sweep
// while real findings existed, so if you change the traversal, re-run the injections in
// the block comment at the bottom of this file before trusting a green result.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { assertCovered } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(ROOT, "scripts", "dead-props-baseline.json");
const UPDATE = process.argv.includes("--update");

// Props React itself consumes, or that a call site may set without the component reading.
const BUILTIN = new Set(["key", "ref", "children", "dangerouslySetInnerHTML"]);

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".jsx")) files.push(p);
  }
})(ROOT);
assertCovered(files, ROOT, "check:dead-props");

const asts = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  try {
    asts.push([rel, parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] })]);
  } catch (e) {
    console.error(`check:dead-props — could not parse ${rel}: ${e.message}`);
    process.exit(1);
  }
}

const byName = new Map(); // Name -> [{name, rel, line, props, rest}]
const uses = []; // {comp, attr, rel, line}

for (const [rel, ast] of asts) {
  traverse(ast, {
    Function(path) {
      let name = path.node.id?.name;
      if (!name && path.parent.type === "VariableDeclarator") name = path.parent.id?.name;
      if (!/^[A-Z]/.test(name || "")) return;

      const pattern = path.node.params[0];
      if (!pattern || pattern.type !== "ObjectPattern") return;

      const props = new Map();
      const declNodes = new Set();
      let rest = false;
      for (const prop of pattern.properties) {
        if (prop.type === "RestElement") { rest = true; continue; }
        if (prop.type !== "ObjectProperty") continue;
        const local = prop.value.type === "AssignmentPattern" ? prop.value.left : prop.value;
        const key = prop.key.name ?? prop.key.value;
        props.set(key, { local: local.type === "Identifier" ? local.name : null, referenced: false });
        // Skip the destructure by NODE IDENTITY. In shorthand `{foo}` Babel gives the
        // property a distinct key node AND value node, and the value node IS the binding
        // declaration -- matching only `parent.key` lets every prop mark itself referenced,
        // which made an earlier draft of this guard incapable of reporting anything.
        declNodes.add(prop.key);
        declNodes.add(local);
      }
      if (!props.size && !rest) return;

      const byLocal = new Map();
      for (const [, info] of props) if (info.local) byLocal.set(info.local, info);

      const mark = (p, ident) => {
        const info = byLocal.get(ident);
        if (!info) return;
        if (declNodes.has(p.node)) return;
        if (p.parentPath.isMemberExpression() && p.parent.property === p.node && !p.parent.computed) return;
        const binding = p.scope.getBinding(ident);
        if (binding && binding.scope.block !== path.node) return; // shadowed by an inner binding
        info.referenced = true;
      };

      path.traverse({
        Identifier(p) { mark(p, p.node.name); },
        // A prop rendered as <ActionIcon/> is a JSXIdentifier, NOT an Identifier. An
        // Identifier-only visitor reports every component-valued prop as dead.
        JSXIdentifier(p) {
          if (!p.parentPath.isJSXOpeningElement() && !p.parentPath.isJSXClosingElement()) return;
          mark(p, p.node.name);
        },
      });

      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ name, rel, line: path.node.loc.start.line, props, rest });
    },
  });
}

for (const [rel, ast] of asts) {
  traverse(ast, {
    JSXOpeningElement(path) {
      const el = path.node.name;
      if (el.type !== "JSXIdentifier" || !/^[A-Z]/.test(el.name)) return;
      for (const attr of path.node.attributes) {
        if (attr.type !== "JSXAttribute") continue;
        uses.push({ comp: el.name, attr: attr.name.name, rel, line: attr.loc.start.line });
      }
    },
  });
}

const findings = [];
for (const [, defs] of byName) {
  for (const def of defs) {
    for (const [prop, info] of def.props) {
      if (info.referenced) continue;
      findings.push({ kind: "dead", key: `dead:${def.rel}:${def.name}:${prop}`, rel: def.rel, line: def.line,
        text: `${def.name}({ ${prop} }) is destructured and never referenced` });
    }
  }
}
const seenUse = new Set();
for (const use of uses) {
  if (BUILTIN.has(use.attr)) continue;
  const defs = byName.get(use.comp) || [];
  // prefer the definition in the calling file; otherwise only judge an unambiguous name
  const def = defs.find((d) => d.rel === use.rel) || (defs.length === 1 ? defs[0] : null);
  if (!def || def.rest || def.props.has(use.attr)) continue;
  const key = `ghost:${def.rel}:${use.comp}:${use.attr}`;
  if (seenUse.has(key)) continue;
  seenUse.add(key);
  findings.push({ kind: "ghost", key, rel: use.rel, line: use.line,
    text: `<${use.comp} ${use.attr}={...}> — ${use.comp} never destructures ${use.attr}` });
}

if (UPDATE) {
  writeFileSync(BASELINE, JSON.stringify(findings.map((f) => f.key).sort(), null, 2) + "\n");
  console.log(`check:dead-props — baseline rewritten with ${findings.length} known exception(s).`);
  process.exit(0);
}

const baseline = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : []);
const fresh = findings.filter((f) => !baseline.has(f.key));
const seen = new Set(findings.map((f) => f.key));
const stale = [...baseline].filter((k) => !seen.has(k));

if (fresh.length) {
  const dead = fresh.filter((f) => f.kind === "dead").length;
  const ghost = fresh.length - dead;
  console.error(`\ncheck:dead-props — ${fresh.length} prop(s) passed or declared but never read:\n`);
  for (const f of fresh) console.error(`  ${f.rel}:${f.line}  ${f.text}`);
  console.error(`
${dead} destructured-but-unread, ${ghost} passed-but-not-a-prop.

Remove the prop at BOTH ends. Removals cascade -- deleting a param strands the wiring
that existed only to feed it -- so re-run until this is clean rather than once.

A passed-but-not-a-prop finding is often a rename that only landed on one side, which
is a silently dead interaction rather than a tidiness problem. Check the spelling
against the component's signature before assuming it is harmless.

If a prop genuinely must stay unread, record it:

  node scripts/check-dead-props.mjs --update
`);
  process.exit(1);
}
if (stale.length) console.log(`check:dead-props — ${stale.length} baseline entry(ies) no longer present; run --update to shrink it.`);
console.log(`check:dead-props: ok — every prop is read by the component that receives it (${baseline.size} known exception(s)).`);

/* Injection tests — each of these must FAIL the guard. All three were real defects.
 *
 *   1. dead param:   const EditIconButton=({onClick,title,zzDead})=>...      -> "dead" finding
 *   2. ghost prop:   <EditIconButton onClick={x} title="y" zzGhost={1}/>     -> "ghost" finding
 *   3. JSX-valued:   a prop used ONLY as <ActionIcon/> must NOT be reported  -> stays clean
 *
 * (3) is the false-positive direction: an Identifier-only visitor called 6 live props dead.
 */
