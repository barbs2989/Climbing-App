#!/usr/bin/env node
// DOES EVERY INJECTION CASE STILL LAND?
//
// An injection suite is the PROOF that a guard can fail. A case whose anchor no longer occurs in
// its target file proves nothing at all: the harness reports "edit never landed" or HARNESS BUG,
// and nothing runs `scripts/oneoff/`, so it says so unread. The guard it belongs to goes on
// printing `ok` with one of its rules exercised by nobody.
//
// THIS HAS HAPPENED FOUR TIMES AND EVERY ONE WAS FOUND BY ACCIDENT. CLAUDE.md records the
// `check:units` promotion finding TWO cases still naming `lib/units-pref.js` after the guarded
// read/write folded into `lib/prefs.js` — "reported HARNESS BUG on every run, of which there were
// none" — and `audit:rappel-claims`' `--inject=capacity` handing its guard a self-contradictory
// route and printing `ok`. The date-format suite then took the identical fold and nobody noticed,
// and `check:preview-claims` had its RULE rewritten by 0178 while its case stayed on the old one.
// *A suite nobody runs rots exactly like a guard nobody runs*, so the rot has to be visible from
// somewhere that DOES run.
//
// Static — one Babel parse per suite, no browser, no database, and no guard executed — so it sits
// in `npm run build`.
//
// WHAT IT DOES NOT PROVE, stated rather than implied: that a case still reproduces the defect it
// names. An anchor can match while the surrounding code has moved on, which is the
// `--inject=capacity` shape, and only running the suite finds that. This answers the mechanical
// half — the edit still has somewhere to land — which is the half answerable without running
// anything. It is also silent about a case whose `expect` has gone stale, which is how the
// preview-claims heading was rotted TWICE OVER.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "scripts", "oneoff");

const files = fs.readdirSync(DIR).filter((f) => f.startsWith("inject-") && f.endsWith(".mjs")).sort();
// Fails CLOSED: a walk that found almost nothing prints the same clean line as a clean tree.
if (files.length < 50) {
  console.error(`FAIL: only ${files.length} inject-* suites under scripts/oneoff — broken walk, not a clean sweep.`);
  process.exit(1);
}

const PATHISH = /\.(jsx?|mjs|json|sql|md)$/;
const ANCHOR_KEYS = new Set(["find", "from"]);          // a literal anchor
const EDIT_KEYS = new Set(["edit", "then", "also"]);     // an arrow doing the edit itself
const REPLACERS = new Set(["replace", "replaceAll", "split"]);

const lit = (n) => {
  if (!n) return null;
  if (n.type === "StringLiteral") return n.value;
  if (n.type === "TemplateLiteral" && n.expressions.length === 0) return n.quasis.map((q) => q.value.cooked).join("");
  return null;
};
const cache = new Map();
const read = (rel) => {
  if (!cache.has(rel)) {
    const p = path.join(ROOT, rel);
    cache.set(rel, fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
  }
  return cache.get(rel);
};
const countIn = (body, a) => {
  if (a.re) {
    try { return (body.match(new RegExp(a.re.pattern, a.re.flags.includes("g") ? a.re.flags : a.re.flags + "g")) || []).length; }
    catch { return -1; }
  }
  return body.split(a.str).length - 1;
};

// Visits every node INCLUDING the root — see the note at the edit-key handler below.
const walk = (node, cb) => {
  if (!node || typeof node.type !== "string") return;
  cb(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "leadingComments" || k === "trailingComments") continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) walk(c, cb); }
    else if (v && typeof v === "object" && typeof v.type === "string") walk(v, cb);
  }
};

const rotted = [], ambiguous = [], unparsed = [], noAnchor = [];
let suites = 0, cases = 0, anchors = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    unparsed.push(`${f} — does not parse: ${e.message.slice(0, 80)}`);
    continue;
  }

  const cnodes = {};
  for (const st of ast.program.body) {
    const d = st.type === "VariableDeclaration" ? st
      : (st.type === "ExportNamedDeclaration" && st.declaration && st.declaration.type === "VariableDeclaration" ? st.declaration : null);
    if (!d) continue;
    for (const de of d.declarations) if (de.id.type === "Identifier" && de.init) cnodes[de.id.name] = de.init;
  }

  // `ROOT` is a sentinel rather than a path: every suite computes it from import.meta.url, and a
  // repo-absolute prefix would make every target miss.
  const ROOTSENT = "\x00ROOT";
  const seen = new Set();
  const resolve = (n) => {
    if (!n) return null;
    const v = lit(n);
    if (v !== null) return v;
    if (n.type === "BinaryExpression" && n.operator === "+") {
      const l = resolve(n.left), r = resolve(n.right);
      return l === null || r === null ? null : l + r;
    }
    if (n.type === "Identifier") {
      if (n.name === "ROOT") return ROOTSENT;
      if (seen.has(n.name) || !(n.name in cnodes)) return null;
      seen.add(n.name);
      const r = resolve(cnodes[n.name]);
      seen.delete(n.name);
      return r;
    }
    if (n.type === "MemberExpression" && !n.computed && n.property.name === "pathname") return resolve(n.object);
    if (n.type === "NewExpression" && n.callee.type === "Identifier" && n.callee.name === "URL") {
      const rel = lit(n.arguments[0]);
      return rel === null ? null : path.posix.normalize(path.posix.join("scripts/oneoff", rel));
    }
    const isPathCall = n.type === "CallExpression" && (
      (n.callee.type === "MemberExpression" && n.callee.object.type === "Identifier" &&
       n.callee.object.name === "path" && ["join", "resolve"].includes(n.callee.property.name)) ||
      (n.callee.type === "Identifier" && ["join", "resolve"].includes(n.callee.name)));
    if (isPathCall) {
      const parts = [];
      for (const a of n.arguments) {
        const r = resolve(a);
        if (r === null) return null;
        if (r === ROOTSENT || r === ".." || r === "." || r === "../..") continue;
        parts.push(r);
      }
      return parts.join("/");
    }
    return null;
  };

  // A suite may build its path by concatenation (`ROOT + "/lib/x.js"`) rather than path.join,
  // which leaves the sentinel glued to the front.
  const unroot = (v) => (v === null ? null : v.startsWith(ROOTSENT) ? v.slice(ROOTSENT.length).replace(/^\/+/, "") : v);

  // Every path this suite names: consts, `FILES = [...]` arrays, and `{core: …}` maps. A case that
  // does not say which file it edits is checked against all of them — an anchor matching NONE of
  // the suite's own targets is rotted whichever one it meant.
  const targets = new Set();
  const maps = {};
  for (const [nm, node] of Object.entries(cnodes)) {
    const v = unroot(resolve(node));
    if (v !== null && PATHISH.test(v)) { targets.add(v); continue; }
    if (node && node.type === "ArrayExpression") {
      for (const el of node.elements) { const e = unroot(resolve(el)); if (e !== null && PATHISH.test(e)) targets.add(e); }
    }
    if (node && node.type === "ObjectExpression") {
      const m = {};
      for (const pr of node.properties) {
        if (pr.type !== "ObjectProperty" || pr.computed) continue;
        const pv = unroot(resolve(pr.value));
        if (pv !== null && PATHISH.test(pv)) { m[pr.key.name || pr.key.value] = pv; targets.add(pv); }
      }
      if (Object.keys(m).length) maps[nm] = m;
    }
  }
  const lookupKey = (k) => { for (const m of Object.values(maps)) if (k in m) return m[k]; return null; };

  const found = [];
  traverse(ast, {
    ObjectExpression(p) {
      const props = {};
      for (const pr of p.node.properties) {
        if (pr.type !== "ObjectProperty" || pr.computed) continue;
        props[pr.key.name || pr.key.value] = pr.value;
      }
      const anchorKeys = Object.keys(props).filter((k) => ANCHOR_KEYS.has(k));
      const editKeys = Object.keys(props).filter((k) => EDIT_KEYS.has(k));
      if (!anchorKeys.length && !editKeys.length) return;

      const list = [];
      for (const k of anchorKeys) {
        const s = resolve(props[k]);
        list.push(s === null ? { bad: props[k].type } : { str: s });
      }
      // `edit: (s) => s.replace("…", "…")` is an anchor under another name.
      for (const k of editKeys) {
        const fn = props[k];
        if (fn.type === "ArrayExpression") {
          // `also: [[find, repl], ...]` — a list of pairs, each of whose first element is an anchor
          for (const pair of fn.elements) {
            if (!pair || pair.type !== "ArrayExpression") { list.push({ bad: pair ? pair.type : "hole" }); continue; }
            const a = resolve(pair.elements[0]);
            list.push(a === null ? { bad: pair.elements[0] ? pair.elements[0].type : "hole" } : { str: a });
          }
          continue;
        }
        if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") {
          // a `then:`/`also:` object is handled as its own case by this same visitor
          if (fn.type !== "ObjectExpression") list.push({ bad: fn.type });
          continue;
        }
        // A MANUAL WALK, not babel's traverse: traverse never visits the node it is given, so for
        // the common `edit: (s) => s.replace(A, B)` the OUTERMOST replace is skipped and its
        // anchor is silently not checked. That undercounted this guard's own coverage until an
        // anchor it had missed turned up rotted in a sibling case.
        let hits = 0;
        walk(fn.body, (n) => {
          if (n.type !== "CallExpression") return;
          const c = n.callee;
          if (c.type !== "MemberExpression" || c.computed || !c.property || !REPLACERS.has(c.property.name)) return;
          const a0 = n.arguments[0];
          if (!a0) return;
          const glob = c.property.name !== "replace";  // split/replaceAll are global by construction
          const s = resolve(a0);
          if (s !== null) { list.push({ str: s, glob }); hits++; return; }
          if (a0.type === "RegExpLiteral") { list.push({ re: { pattern: a0.pattern, flags: a0.flags } }); hits++; }
        });
        // An edit that replaces the WHOLE file (git show, a generated string) has no anchor to rot.
        if (!hits) noAnchor.push(`${f}:${p.node.loc.start.line}`);
      }
      if (!list.length) return;

      let file = props.file ? unroot(resolve(props.file)) : null;
      if (file !== null && !PATHISH.test(file)) file = lookupKey(file) || file;
      if (file === null && !props.file) {
        let up = p.parentPath;
        while (up && file === null) {
          if (up.node.type === "ObjectExpression") {
            for (const pr of up.node.properties) {
              if (pr.type === "ObjectProperty" && !pr.computed && (pr.key.name || pr.key.value) === "file") file = resolve(pr.value);
            }
          }
          up = up.parentPath;
        }
      }
      found.push({ name: lit(props.name) || "(a sub-edit)", line: p.node.loc.start.line, file, list });
    },
  });

  if (!found.length) continue;
  suites++;

  for (const c of found) {
    cases++;
    const where = `${f}:${c.line}  ${c.name}`;
    const scope = c.file !== null ? [c.file] : [...targets];
    if (!scope.length) { unparsed.push(`${where} — cannot tell which file this case edits`); continue; }

    for (const a of c.list) {
      anchors++;
      if (a.bad) { unparsed.push(`${where} — an anchor is a ${a.bad} this guard cannot resolve`); continue; }
      let best = 0, missingFile = null;
      for (const t of scope) {
        const body = read(t);
        if (body === null) { missingFile = t; continue; }
        const n = countIn(body, a);
        if (n > best) best = n;
      }
      const shown = a.re ? `/${a.re.pattern}/${a.re.flags}` : JSON.stringify(a.str.slice(0, 90));
      if (missingFile && best === 0) { rotted.push(`${where}\n      -> ${missingFile} does not exist`); continue; }
      if (best === 0) rotted.push(`${where}\n      -> 0 matches in ${scope.join(", ")}: ${shown}`);
      else if (best > 1 && !a.re && !a.glob) ambiguous.push(`${where} -> ${best} matches in ${scope.join(", ")}`);
    }
  }
}

// Fails CLOSED again: the conventions could be renamed out from under this and leave it reporting
// a clean sweep over almost nothing.
if (cases < 250 || anchors < 300) {
  console.error(`FAIL: only ${cases} cases / ${anchors} anchors parsed across ${suites} suites — the harness conventions moved, so this proved almost nothing.`);
  process.exit(1);
}

if (ambiguous.length) {
  console.log(`${ambiguous.length} anchor(s) matching MORE THAN ONCE — a reading list, not a defect:`);
  console.log(`  (harmless where any match serves the case; a first-match replace can edit the wrong line)`);
  for (const a of ambiguous) console.log(`    ${a}`);
  console.log("");
}

if (rotted.length || unparsed.length) {
  for (const r of rotted) console.log(`ROTTED    ${r}`);
  for (const u of unparsed) console.log(`UNPARSED  ${u}`);
  console.error(
    `\nFAIL: ${rotted.length} injection anchor(s) can no longer land and ${unparsed.length} could not be read.\n` +
    `  An anchor that matches nothing proves NOTHING — its guard still prints ok with that rule unexercised.\n` +
    `  Three causes, in likelihood order:\n` +
    `    1. the code MOVED (a fold into a shared module is the recorded one) — repoint the case, or\n` +
    `       delete it and cite the suite that now covers the property, if one does.\n` +
    `    2. the guard's RULE was rewritten and the case was not brought with it. Check what the guard\n` +
    `       asserts TODAY before repointing, and check the case's \`expect\` against the guard's\n` +
    `       current failure text — a stale expectation reads as WRONG FAILURE, not as a miss.\n` +
    `    3. the case is genuinely spent — delete it, and say in the suite what stopped being provable.\n` +
    `  Do NOT satisfy this by deleting a case whose property nothing else proves.`);
  process.exit(1);
}

console.log(`ok — every injection anchor still lands.`);
console.log(`  ${anchors} anchors across ${cases} cases in ${suites} suite(s); ${ambiguous.length} match more than once.`);
console.log(`  ${noAnchor.length} case(s) replace a whole file and have no anchor to rot.`);
