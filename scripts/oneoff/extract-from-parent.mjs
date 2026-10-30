// Mechanical half of a component extraction (docs/refactor-progress.md, PR57 on).
//
//   node scripts/oneoff/extract-from-parent.mjs component <Name> [--with h1,h2] [--parent RouteDetail.jsx]
//   node scripts/oneoff/extract-from-parent.mjs lib <lib/file.js> h1,h2 [--parent RouteDetail.jsx]
//
// `component` cuts <Name> (plus the page-local helpers named in --with, which nothing else may read)
// out of the parent BY OFFSET, verbatim with their leading comments, into src/components/<Name>.tsx
// behind the imports their free identifiers need, and imports the new file back into the parent.
// `lib` cuts shared helpers into a lib/ module as named exports and imports them back wherever the
// parent still reads them. Either way it REFUSES when the moved code reads a page-local binding it
// was not told to take, or when something left behind still reads a helper it was told to take.
// Import specifiers that only the moved code used are pruned from the parent. Types are added by
// hand afterwards; verify-extraction.mjs then proves the moved code equals the base's, modulo types.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseM from "@babel/traverse";
const traverse = traverseM.default || traverseM;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const mode = argv[0];
const parent = opt("--parent") || "RouteDetail.jsx";
const parentP = path.join(ROOT, parent);
// An import written INTO the parent, relative to the parent's own directory (a parent may live in lib/).
const fromParent = rel => { let r = path.relative(path.dirname(parentP), path.join(ROOT, rel)); if (!r.startsWith(".")) r = "./" + r; return r; };
const die = m => { console.error("REFUSED: " + m); process.exit(1); };

function analyse(src) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const stmts = []; // {node, names[], start, end, exported}
  let prog;
  traverse(ast, { Program(p) { prog = p; p.stop(); } });
  for (const st of ast.program.body) {
    let n = st, exported = false;
    if (st.type === "ExportNamedDeclaration" && st.declaration) { n = st.declaration; exported = true; }
    const names = n.type === "FunctionDeclaration" && n.id ? [n.id.name]
      : n.type === "VariableDeclaration" ? n.declarations.flatMap(d => d.id.type === "Identifier" ? [d.id.name] : []) : [];
    stmts.push({ node: st, decl: n, names, exported });
  }
  return { ast, prog, stmts };
}
// Leading comments that are the statement's own: they start on a line of their own after the
// previous statement ended (a comment trailing the previous statement on its line stays with it).
function ownStart(src, stmts, i) {
  const st = stmts[i].node, prevEnd = i ? stmts[i - 1].node.end : 0;
  let start = st.start;
  // Only the comment directly above (or before, on its line) the declaration: comments further up
  // are often orphans an earlier move left behind, and belong to something else.
  const cs = (st.leadingComments || []).filter(c => c.start >= prevEnd && (!prevEnd || /\n/.test(src.slice(prevEnd, c.start))));
  const c = cs[cs.length - 1];
  if (c && !src.slice(c.end, st.start).trim() && (src.slice(c.end, st.start).match(/\n/g) || []).length <= 1) start = c.start;
  // A block of `//` lines is one comment node PER LINE: take the whole contiguous run, not only its
  // last line (PR64 found three such blocks orphaned in the parent by the old rule).
  if (start === (c && c.start)) for (let k = cs.length - 2; k >= 0; k--) { const gap = src.slice(cs[k].end, cs[k + 1].start); if (gap.trim() || (gap.match(/\n/g) || []).length !== 1) break; start = cs[k].start; }
  return start;
}
// A comment after the declaration on its own line (and nothing else there) goes with it.
function ownEnd(src, stmts, i) {
  const e = stmts[i].node.end; const le = src.indexOf("\n", e); const rest = src.slice(e, le < 0 ? src.length : le);
  return /^\s*(\/\*[^]*?\*\/|\/\/.*)\s*$/.test(rest) && !(stmts[i + 1] && stmts[i + 1].node.start < (le < 0 ? src.length : le)) ? e + rest.length : e;
}
// Free identifiers of a set of statements that resolve to module scope.
function freeOf(an, idxs) {
  const free = new Set(); const own = new Set(idxs.flatMap(i => an.stmts[i].names));
  for (const i of idxs) {
    const path0 = an.prog.get("body")[i];
    path0.traverse({
      ReferencedIdentifier(ip) { const nm = ip.node.name; const b = ip.scope.getBinding(nm); if (b && b.scope === an.prog.scope && !own.has(nm)) free.add(nm); },
    });
  }
  return free;
}
function readersOutside(an, name, idxs) {
  const b = an.prog.scope.getBinding(name); if (!b) return [];
  const inside = new Set(idxs.map(i => an.stmts[i].node));
  return b.referencePaths.filter(r => { const t = r.findParent(q => q.parentPath && q.parentPath.isProgram()); return !inside.has(t && t.node); });
}
function importSpec(an, name) {
  const b = an.prog.scope.getBinding(name);
  if (!b || b.kind !== "module") return null;
  const decl = b.path.parentPath.node, s = b.path.node;
  const kind = s.type === "ImportDefaultSpecifier" ? "default" : s.type === "ImportNamespaceSpecifier" ? "ns" : "named";
  return { source: decl.source.value, kind, imported: kind === "named" ? (s.imported.name || s.imported.value) : null, local: name };
}
function relFrom(fromDir, source) {
  if (!source.startsWith(".")) return source;
  let r = path.relative(fromDir, path.resolve(path.dirname(parentP), source));
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}
function importLines(specs, fromDir) {
  const by = new Map();
  for (const s of specs) { const k = relFrom(fromDir, s.source); if (!by.has(k)) by.set(k, []); by.get(k).push(s); }
  const lines = [];
  for (const [src, ss] of by) {
    const def = ss.find(s => s.kind === "default"), ns = ss.find(s => s.kind === "ns");
    const named = ss.filter(s => s.kind === "named").map(s => s.imported === s.local ? s.local : `${s.imported} as ${s.local}`);
    if (ns) lines.push(`import * as ${ns.local} from "${src}";`);
    const parts = [def ? def.local : null, named.length ? `{ ${named.join(", ")} }` : null].filter(Boolean);
    if (parts.length) lines.push(`import ${parts.join(", ")} from "${src}";`);
  }
  return lines;
}
// Cut ranges out of src; a line left holding only whitespace goes too.
function cut(src, ranges) {
  ranges.sort((a, b) => b[0] - a[0]);
  for (const [a, b] of ranges) {
    let s = a, e = b;
    const ls = src.lastIndexOf("\n", s - 1) + 1; const le = src.indexOf("\n", e); const lineEnd = le < 0 ? src.length : le;
    if (!src.slice(ls, s).trim() && !src.slice(e, lineEnd).trim()) { s = ls; e = le < 0 ? lineEnd : lineEnd + 1; }
    src = src.slice(0, s) + src.slice(e);
  }
  return src;
}
// Remove import specifiers nothing reads any more (only those in `cands`).
function prune(src, cands) {
  const an = analyse(src); const ranges = []; const edits = [];
  for (const st of an.stmts) {
    if (st.node.type !== "ImportDeclaration") continue;
    const dead = st.node.specifiers.filter(s => cands.has(s.local.name) && !an.prog.scope.getBinding(s.local.name).referenced);
    if (!dead.length) continue;
    if (dead.length === st.node.specifiers.length) { ranges.push([st.node.start, st.node.end]); continue; }
    edits.push({ st: st.node, keep: st.node.specifiers.filter(s => !dead.includes(s)) });
  }
  // rewrite partial imports textually by removing each dead specifier's text and a comma
  const all = [];
  for (const e of edits) for (const s of e.st.specifiers) if (!e.keep.includes(s)) all.push(s);
  all.sort((a, b) => b.start - a.start);
  let out = src;
  for (const s of all) {
    let a = s.start, b = s.end;
    const after = out.slice(b).match(/^\s*,\s*/);
    if (after) b += after[0].length; else { const before = out.slice(0, a).match(/,\s*$/); if (before) a -= before[0].length; }
    out = out.slice(0, a) + out.slice(b);
  }
  if (ranges.length) { const an2 = analyse(out); const r2 = [];
    for (const st of an2.stmts) if (st.node.type === "ImportDeclaration" && st.node.specifiers.every(s => cands.has(s.local.name) && !an2.prog.scope.getBinding(s.local.name).referenced) && st.node.specifiers.length) r2.push([st.node.start, st.node.end]);
    out = cut(out, r2); }
  return out;
}
function addImport(src, line) {
  const an = analyse(src); const imps = an.stmts.filter(s => s.node.type === "ImportDeclaration");
  const last = imps[imps.length - 1].node; const eol = src.indexOf("\n", last.end);
  return src.slice(0, eol + 1) + line + "\n" + src.slice(eol + 1);
}

let src = fs.readFileSync(parentP, "utf8");
const an = analyse(src);
const idxOf = name => { const i = an.stmts.findIndex(s => s.names.includes(name)); if (i < 0) die(`${name} is not a top-level declaration of ${parent}`); return i; };

if (mode === "component") {
  const name = argv[1]; const withs = (opt("--with") || "").split(",").filter(Boolean);
  const idxs = [...new Set([...withs.map(idxOf), idxOf(name)])].sort((a, b) => a - b);
  for (const i of idxs) { const extra = an.stmts[i].names.filter(n => n !== name && !withs.includes(n)); if (extra.length) die(`statement declaring ${an.stmts[i].names} also declares ${extra} — name them in --with`); }
  for (const h of withs) { const r = readersOutside(an, h, idxs); if (r.length) die(`${h} is still read outside the moved set (line ${r[0].node.loc.start.line}) — move it to lib/ first`); }
  const free = freeOf(an, idxs); const specs = []; const locals = [];
  for (const f of free) { const s = importSpec(an, f); if (s) specs.push(s); else locals.push(f); }
  if (locals.length) die(`the moved code reads page-local ${locals.join(", ")} — add to --with, or move to lib/ first`);
  const outDir = path.join(ROOT, "src/components");
  const outP = path.join(outDir, name + ".tsx");
  if (fs.existsSync(outP)) die(outP + " exists");
  const pieces = idxs.map(i => { let t = src.slice(ownStart(src, an.stmts, i), ownEnd(src, an.stmts, i)); if (an.stmts[i].names.includes(name)) {
    t = t.replace(new RegExp(`(^|\\n)(export )?function ${name}\\(`), (m, a) => `${a}export default function ${name}(`);
    if (!t.includes(`export default function ${name}(`)) die(`${name} is not declared as \`function ${name}(\``);
  } else t = t.replace(/^((?:\/\*[\s\S]*?\*\/|\/\/[^\n]*|\s)*)export /, "$1"); return t; });
  const wasExported = an.stmts[idxOf(name)].exported;
  const header = importLines(specs, outDir).join("\n");
  fs.writeFileSync(outP, header + "\n\n" + pieces.join("\n") + "\n");
  src = cut(src, idxs.map(i => [ownStart(src, an.stmts, i), ownEnd(src, an.stmts, i)]));
  src = prune(src, new Set(specs.map(s => s.local)));
  const stillRead = analyse(src).prog.scope.getBinding(name) === undefined && /\b/.test(name);
  src = addImport(src, `import ${name} from "${fromParent("src/components/" + name + ".tsx")}";` + (wasExported ? `\nexport { ${name} };` : ""));
  fs.writeFileSync(parentP, src);
  console.log(`moved ${idxs.map(i => an.stmts[i].names.join("+")).join(", ")} -> src/components/${name}.tsx (${specs.length} imports)${wasExported ? " — re-exported from " + parent : ""}${stillRead ? "" : ""}`);
} else if (mode === "lib") {
  const file = argv[1]; const names = argv[2].split(",");
  const idxs = [...new Set(names.map(idxOf))].sort((a, b) => a - b);
  for (const i of idxs) { const extra = an.stmts[i].names.filter(n => !names.includes(n)); if (extra.length) die(`statement declaring ${an.stmts[i].names} also declares ${extra} — name them too`); }
  const free = freeOf(an, idxs); const specs = []; const locals = [];
  for (const f of free) { const s = importSpec(an, f); if (s) specs.push(s); else locals.push(f); }
  if (locals.length) die(`the helpers read page-local ${locals.join(", ")} — name them too`);
  const libP = path.join(ROOT, file); if (fs.existsSync(libP)) die(file + " exists");
  const pieces = idxs.map(i => { const t = src.slice(ownStart(src, an.stmts, i), ownEnd(src, an.stmts, i));
    if (an.stmts[i].exported) return t; const off = an.stmts[i].node.start - ownStart(src, an.stmts, i); return t.slice(0, off) + "export " + t.slice(off); });
  const header = importLines(specs, path.dirname(libP)).join("\n");
  fs.writeFileSync(libP, (header ? header + "\n\n" : "") + pieces.join("\n") + "\n");
  const used = names.filter(n => readersOutside(an, n, idxs).length || an.stmts[idxOf(n)].exported);
  src = cut(src, idxs.map(i => [ownStart(src, an.stmts, i), ownEnd(src, an.stmts, i)]));
  src = prune(src, new Set(specs.map(s => s.local)));
  const reexp = names.filter(n => an.stmts[idxOf(n)].exported);
  if (used.length) src = addImport(src, `import { ${used.join(", ")} } from "${fromParent(file)}";` + (reexp.length ? `\nexport { ${reexp.join(", ")} };` : ""));
  fs.writeFileSync(parentP, src);
  console.log(`moved ${names.join(", ")} -> ${file}; parent imports back ${used.join(", ") || "nothing"}`);
} else if (mode === "branch") {
  // node extract-from-parent.mjs branch <Name> '<anchor>' [--in RouteDetail]
  // Lifts the CONSEQUENT of the conditional whose source starts with <anchor> (e.g. `tab==="photos"?`)
  // inside function --in into src/components/<Name>.tsx, as `return <consequent>;`. Every binding it
  // reads from the enclosing function becomes a prop of the same name, passed back as `name={name}`;
  // module-scope reads become imports. REFUSES if the consequent assigns to a captured binding, calls
  // a hook, reads a page-local module binding (move it to lib/ first), or captures `key`/`ref`.
  const name = argv[1], anchor = argv[2], inFn = opt("--in") || "RouteDetail";
  const outP = path.join(ROOT, "src/components", name + ".tsx"); if (fs.existsSync(outP)) die(outP + " exists");
  let target = null;
  // An anchor ending in `?` names a conditional (its consequent is lifted); one ending in `&&` names a
  // `cond&&<jsx>` (its right-hand JSX is lifted) — App draws most of its screens the second way.
  const isJ = n => n && (n.type === "JSXElement" || n.type === "JSXFragment");
  const inside = p => { let f = p.getFunctionParent(); while (f && !(f.node.id && f.node.id.name === inFn)) f = f.getFunctionParent(); return !!f; };
  const hit = p => { if (src.slice(p.node.start, p.node.start + anchor.length) === anchor && inside(p)) { if (target) die(`anchor ${anchor} matches twice`); target = p; } };
  an.prog.traverse({ ConditionalExpression(p) { if (!anchor.endsWith("&&")) hit(p); }, LogicalExpression(p) { if (anchor.endsWith("&&") && p.node.operator === "&&" && isJ(p.node.right)) hit(p); } });
  if (!target) die(`no conditional inside ${inFn} starts with ${anchor}`);
  const cons = target.get(target.isLogicalExpression() ? "right" : "consequent");
  const props = new Set(), mods = new Set();
  cons.traverse({
    ReferencedIdentifier(ip) { const nm = ip.node.name; const b = ip.scope.getBinding(nm); if (!b) return;
      if (b.scope === an.prog.scope) { mods.add(nm); return; }
      // a binding declared inside the consequent stays inside it
      if (b.path.findParent(q => q === cons) || b.path === cons) return;
      props.add(nm); },
    "AssignmentExpression|UpdateExpression"(ap) { const t = ap.node.left || ap.node.argument; if (t && t.type === "Identifier") { const b = ap.scope.getBinding(t.name); if (b && !b.path.findParent(q => q === cons)) die(`the branch assigns to captured \`${t.name}\` (line ${ap.node.loc.start.line})`); } },
    CallExpression(cp) { const c = cp.node.callee; if (c.type === "Identifier" && /^use[A-Z]/.test(c.name)) die(`the branch calls hook ${c.name} (line ${cp.node.loc.start.line})`); },
  });
  for (const k of ["key", "ref"]) if (props.has(k)) die(`the branch captures \`${k}\`, which cannot be a prop`);
  const specs = [], locals = [];
  for (const m of mods) { const s = importSpec(an, m); if (s) specs.push(s); else locals.push(m); }
  if (locals.length) die(`the branch reads page-local ${locals.join(", ")} — move to lib/ first (\`lib\` mode)`);
  const ps = [...props].sort();
  if (argv.includes("--dry")) { console.log(`${ps.length} props: ${ps.join(",")}`); process.exit(0); }
  const body = src.slice(cons.node.start, cons.node.end);
  const header = importLines(specs, path.join(ROOT, "src/components")).join("\n");
  fs.writeFileSync(outP, `${header}\n\n/* ${anchor} — the body of that branch of ${inFn}, lifted verbatim by extract-from-parent.mjs (branch mode);\n   every binding it read from ${inFn} is a prop of the same name. */\nexport default function ${name}({${ps.join(",")}}){\n  return ${body};\n}\n`);
  src = src.slice(0, cons.node.start) + `<${name} ${ps.map(p => `${p}={${p}}`).join(" ")}/>` + src.slice(cons.node.end);
  src = prune(src, new Set(specs.map(s => s.local)));
  src = addImport(src, `import ${name} from "${fromParent("src/components/" + name + ".tsx")}";`);
  fs.writeFileSync(parentP, src);
  console.log(`lifted ${anchor} -> src/components/${name}.tsx (${ps.length} props, ${specs.length} imports)`);
} else if (mode === "closure") {
  // node extract-from-parent.mjs closure <Name> <fn> [--in RouteDetail]
  // `const fn=(a,b)=><jsx>` declared inside --in becomes src/components/<Name>.tsx returning that
  // body; its parameters AND every binding it reads from --in become props of the same name, and
  // every call `fn(x,y)` becomes `<Name a={x} b={y} …/>`. Same refusals as branch mode, plus: the
  // arrow must have an expression body and plain identifier parameters, and fn may only be CALLED.
  const name = argv[1], fnName = argv[2], inFn = opt("--in") || "RouteDetail";
  const outP = path.join(ROOT, "src/components", name + ".tsx"); if (fs.existsSync(outP)) die(outP + " exists");
  let decl = null;
  an.prog.traverse({ VariableDeclarator(p) { if (p.node.id.type === "Identifier" && p.node.id.name === fnName) { let f = p.getFunctionParent(); while (f && !(f.node.id && f.node.id.name === inFn)) f = f.getFunctionParent(); if (f) decl = p; } } });
  if (!decl) die(`no \`const ${fnName}=\` inside ${inFn}`);
  const fn = decl.get("init");
  if (!fn.isArrowFunctionExpression() || fn.node.body.type === "BlockStatement") die(`${fnName} is not an arrow with an expression body`);
  const params = fn.node.params.map(q => { if (q.type !== "Identifier") die(`${fnName} has a non-identifier parameter`); return q.name; });
  const props = new Set(params), mods = new Set();
  fn.get("body").traverse({
    ReferencedIdentifier(ip) { const nm = ip.node.name; const b = ip.scope.getBinding(nm); if (!b) return;
      if (b.scope === an.prog.scope) { mods.add(nm); return; }
      if (b.scope === fn.scope && params.includes(nm)) return;
      if (b.path.findParent(q => q === fn)) return;
      props.add(nm); },
    "AssignmentExpression|UpdateExpression"(ap) { const t = ap.node.left || ap.node.argument; if (t && t.type === "Identifier") { const b = ap.scope.getBinding(t.name); if (b && !b.path.findParent(q => q === fn)) die(`${fnName} assigns to captured \`${t.name}\``); } },
    CallExpression(cp) { const c = cp.node.callee; if (c.type === "Identifier" && /^use[A-Z]/.test(c.name)) die(`${fnName} calls hook ${c.name}`); },
  });
  for (const k of ["key", "ref"]) if (props.has(k)) die(`${fnName} reads \`${k}\`, which cannot be a prop`);
  const refs = decl.scope.getBinding(fnName).referencePaths;
  // --keep: the closure stays, its body becomes the element — for a render closure App also hands
  // to other components as a value (renderObjectives), whose callers must not change.
  const keep = argv.includes("--keep");
  if (keep && params.length) die(`--keep needs a closure with no parameters`);
  if (!keep) for (const r of refs) if (!(r.parentPath.isCallExpression() && r.parentPath.node.callee === r.node)) die(`${fnName} is used other than by a call (line ${r.node.loc.start.line})`);
  const specs = [], locals = [];
  for (const m of mods) { const s = importSpec(an, m); if (s) specs.push(s); else locals.push(m); }
  if (locals.length) die(`${fnName} reads page-local ${locals.join(", ")} — move to lib/ first (\`lib\` mode)`);
  const captured = [...props].filter(p => !params.includes(p)).sort();
  const body = src.slice(fn.node.body.start, fn.node.body.end);
  const header = importLines(specs, path.join(ROOT, "src/components")).join("\n");
  fs.writeFileSync(outP, `${header}\n\n/* ${fnName} — the body of that closure of ${inFn}, lifted verbatim by extract-from-parent.mjs (closure mode);\n   its parameters (${params.join(", ")}) and every binding it read from ${inFn} are props of the same name. */\nexport default function ${name}({${[...params, ...captured].join(",")}}){\n  return ${body};\n}\n`);
  // Edit from the end so earlier offsets hold: each call, then the declaration.
  const edits = keep ? [] : refs.map(r => { const call = r.parentPath.node; return { s: call.start, e: call.end, t: `<${name} ${params.map((q, i) => `${q}={${call.arguments[i] ? src.slice(call.arguments[i].start, call.arguments[i].end) : "undefined"}}`).concat(captured.map(c => `${c}={${c}}`)).join(" ")}/>` }; });
  const st = decl.parentPath.node; if (st.declarations.length !== 1) die(`${fnName} shares its const with other names`);
  edits.push(keep ? { s: fn.node.body.start, e: fn.node.body.end, t: `<${name} ${captured.map(c => `${c}={${c}}`).join(" ")}/>` } : { s: st.start, e: st.end, t: "" });
  edits.sort((a, b) => b.s - a.s);
  for (const e of edits) src = src.slice(0, e.s) + e.t + src.slice(e.e);
  src = prune(src, new Set(specs.map(s => s.local)));
  src = addImport(src, `import ${name} from "${fromParent("src/components/" + name + ".tsx")}";`);
  fs.writeFileSync(parentP, src);
  console.log(`lifted ${fnName} -> src/components/${name}.tsx (${params.length} params + ${captured.length} captured props, ${refs.length} call(s) rewritten)`);
} else if (mode === "deps") {
  // node extract-from-parent.mjs deps <Name> — the transitive page-local closure of <Name>, and for
  // each helper in it the top-level declarations OUTSIDE the closure that also read it (those must
  // go to lib/ first, or move with whatever reads them).
  const name = argv[1]; const seen = new Set([idxOf(name)]); const q = [idxOf(name)];
  while (q.length) { const i = q.pop(); for (const f of freeOf(an, [i])) { if (importSpec(an, f)) continue; const j = idxOf(f); if (!seen.has(j)) { seen.add(j); q.push(j); } } }
  const idxs = [...seen].sort((a, b) => a - b);
  const topName = r => { const t = r.findParent(q2 => q2.parentPath && q2.parentPath.isProgram()); const s = an.stmts.find(x => x.node === (t && t.node)); return s ? s.names.join("+") : "?"; };
  for (const i of idxs) { const nm = an.stmts[i].names; if (nm.includes(name)) continue;
    const outside = [...new Set(nm.flatMap(n => readersOutside(an, n, idxs).map(topName)))];
    console.log(`${nm.join("+")}  ${an.stmts[i].node.end - an.stmts[i].node.start}b  ${outside.length ? "SHARED with " + outside.join(", ") : "only here"}`); }
} else die("mode is `component`, `lib` or `deps`");
