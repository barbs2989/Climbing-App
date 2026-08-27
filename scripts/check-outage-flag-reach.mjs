#!/usr/bin/env node
// check:outage-flag-reach — an outage flag that is COMPUTED and never CONSUMED leaves a screen
// still saying you have nothing, while the code reads as though it were gated.
//
// 18 `xUnavailable` flags now live across the three app files, added by ~10 PRs from parallel
// sessions all editing the SAME two dense lines. Each is
// `const xUnavailable = !!(uid && q && q.isError)` — the declaration is the easy half, and the flag
// only does anything if a component READS it.
//
// NOTHING ELSE CAN SEE A DEAD ONE, and the three near misses are the argument for this guard:
//
//   * `check:outage` compares a healthy walk against a failing one. A flag that reaches no screen
//     changes no copy, so that screen compares EQUAL and is skipped — reported as "seed-backed,
//     proves nothing" rather than as a defect. Its verdict on a dead flag is silence.
//   * `check:dead-props` asks about props a component declares or a call site passes. These are
//     local `const`s in a 400kB component; it never looks at them.
//   * `audit:silent-reverts` gained an `outage-flag` pattern precisely because these flags are the
//     shape a stale-base squash drops — but it tracks NAMES. A merge that keeps the declaration and
//     drops the JSX read leaves the name in place, so it reports nothing. That audit's own closing
//     caveat says so: "a merge that kept a name and dropped its guard clause is invisible here."
//     This is that shape, one column over. `scripts/oneoff/probe-outage-flag-pattern-shapes.mjs`
//     is the COMPLEMENT rather than an overlap: it asks whether that audit can collect and detect
//     a flag's DECLARATION at all. Neither it nor the audit ever asks whether anything reads one.
//
// Static — no browser, no database, milliseconds — so it sits in `npm run build`.
//
// COUNTED AS IDENTIFIER NODES, NEVER AS TEXT, and that is a measured defect in this script's own
// first draft rather than caution. It began as a regex over comment-stripped source, and stripping
// block comments with a lazy `[\s\S]*?` pattern removed 101,636 characters from RouteDetail.jsx —
// 21% of the file — because a comment-opening sequence inside a STRING LITERAL starts a phantom
// comment that runs to the next real close-comment marker. One casualty was the live read of
// `toposUnavailable`, so the scan reported a WORKING flag as DEAD: the direction that sends an
// author to "fix" correct code. A hand-rolled scanner tracking quotes to dodge that desynchronises
// on an apostrophe in JSX text (`don't`). An AST has neither failure mode, and it needs no comment
// mask at all — a comment naming a flag is not an identifier, so it cannot credit a dead flag with
// the prose describing it. Nor can a string.
//
// WHAT A PASS DOES NOT MEAN, stated rather than implied: that the component receiving the flag
// reads the prop, or that the copy it flips is honest. A flag handed to `<X unavailable={f}/>` is
// genuinely used HERE; whether X reads it is `check:dead-props`' question, and whether the sentence
// is true is `check:outage`'s. This guard answers exactly one thing — is anything at all consuming
// the value.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const FLAG = /^[A-Za-z_$][A-Za-z0-9_$]*Unavailable$/;
// A SETTER is not a flag. `setDmThreadsUnavailable` matches the name shape and would sit in the
// table as though it were one — and a dead setter needs a different repair from a dead flag.
const isSetter = (n) => /^set[A-Z]/.test(n);

const dead = (what) => {
  console.error(`\ncheck:outage-flag-reach FAILED — ${what}.`);
  console.error("Nothing below was checked. This guard reports absence, so a broken scan");
  console.error("would otherwise read as a clean sweep.\n");
  process.exit(1);
};

// name -> { decls: [{file,line}], reads: [{file,line}] }
const flags = new Map();
const get = (n) => { if (!flags.has(n)) flags.set(n, { decls: [], reads: [] }); return flags.get(n); };
// Section 2's findings: a binding derived from `isError` that does NOT carry the convention.
const offConvention = [];

for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) dead(`${f} does not exist — the app moved, or this list is stale`);
  const src = fs.readFileSync(abs, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { dead(`could not parse ${f}: ${e.message}`); }

  const record = (p, file) => {
    const n = p.node.name;
    if (!FLAG.test(n) || isSetter(n)) return;
    const par = p.parent;
    // A JSX ATTRIBUTE NAME is not a variable reference. `<Inbox dmUnavailable={dmThreadsUnavailable}/>`
    // holds one read — the value — and the attribute name happens to match the convention. Counting
    // it credited a prop-passed flag with a phantom read at its own call site.
    if (par && par.type === "JSXAttribute" && par.name === p.node) return;
    // A property KEY is not a reference to the binding (`{xUnavailable: 1}`); a shorthand is.
    if (par && par.type === "ObjectProperty" && par.key === p.node && !par.shorthand) return;
    // THE DECLARATION IS RESOLVED THROUGH SCOPE, never by matching `VariableDeclarator.id`, and
    // that narrower test was wrong in BOTH shapes this app actually uses: `const [x, setX] =
    // useState()` puts the name inside an ArrayPattern, and a flag delivered as a PROP is declared
    // by destructuring in the receiving component's parameter list. Both reported as "referenced
    // but never declared" — a confident accusation against two healthy flags.
    const binding = p.scope.getBinding(n);
    const isDecl = !!binding && binding.identifier === p.node;
    const where = { file, line: p.node.loc ? p.node.loc.start.line : 0 };
    (isDecl ? get(n).decls : get(n).reads).push(where);
  };

  traverse(ast, {
    Identifier(p) { record(p, f); },
    JSXIdentifier(p) { record(p, f); },
    // SECTION 2 — the naming key is ENFORCED, not assumed. Section 1 finds flags by the
    // `*Unavailable` suffix, so a future flag called `photosBroken` would be invisible to it and the
    // guard would print `ok` — the false-pass direction, and the too-narrow-proxy trap this repo
    // records repeatedly. Measured across all three files: 18 `.isError` references, 14 of them
    // named bindings and ALL 14 already on the convention, so this rule has zero counterexamples
    // today. The other 4 are inline uses in an `if`/`return`, consumed on the spot — not bindings,
    // so they cannot go dead and are correctly out of scope rather than exempted.
    VariableDeclarator(p) {
      const id = p.node.id;
      if (!p.node.init || id.type !== "Identifier") return;
      if (FLAG.test(id.name)) return;
      const init = src.slice(p.node.init.start, p.node.init.end);
      if (!/\bisError\b/.test(init)) return;
      offConvention.push({ file: f, line: id.loc ? id.loc.start.line : 0, name: id.name });
    },
  });
}

const names = [...flags.keys()].sort();
if (names.length < 10) dead(`found only ${names.length} flag(s); the naming convention moved, or the walk broke`);

const rows = names.map((n) => ({ n, ...flags.get(n) }))
  .sort((a, b) => a.reads.length - b.reads.length || a.n.localeCompare(b.n));

console.log(`check:outage-flag-reach — ${names.length} outage flag(s) across ${FILES.length} app files\n`);
console.log("reads  flag                          declared at");
for (const r of rows) {
  const d = r.decls[0] ? `${r.decls[0].file}:${r.decls[0].line}` : "(no declaration found)";
  console.log(String(r.reads.length).padStart(5) + "  " + r.n.padEnd(30) + d + (r.reads.length === 0 ? "   ** DEAD" : ""));
}

// A flag with no declaration is its own defect: the name is consumed but nothing computes it, which
// is a ReferenceError waiting on a code path. Report it rather than letting it hide among the
// healthy rows, since the repair is the opposite one.
const undeclared = rows.filter((r) => r.decls.length === 0);
const unread = rows.filter((r) => r.reads.length === 0);

console.log("");
for (const r of offConvention) {
  console.log(`  FAIL  ${r.file}:${r.line} — \`${r.name}\` derives from isError but is not named *Unavailable,`);
  console.log(`        so section 1 cannot see it and a dead one would report as ok. Rename it.`);
}
for (const r of undeclared) console.log(`  FAIL  ${r.n} is referenced but never declared`);
if (unread.length) {
  for (const r of unread) console.log(`  FAIL  ${r.n} is declared at ${r.decls[0].file}:${r.decls[0].line} and READ NOWHERE`);
  console.log("");
  console.log("A flag nobody reads means the screen it was added for is STILL telling a climber");
  console.log("they have nothing when the read simply failed. Either wire it to the copy it was");
  console.log("added for, or remove it — a declaration on its own is not a gate.");
}

if (undeclared.length || unread.length || offConvention.length) process.exit(1);
console.log(`ok — every outage flag reaches at least one consumer (${rows.reduce((a, r) => a + r.reads.length, 0)} reads),`);
console.log("     and every isError-derived binding carries the name section 1 searches for.");

// Injection-tested; the cases are in scripts/oneoff/inject-outage-flag-reach-cases.mjs.
//   1. drop the JSX read of `toposUnavailable`, keeping the declaration — the real stale-base
//      squash shape, and the one `audit:silent-reverts` structurally cannot see. Must FAIL.
//   2. remove a flag ENTIRELY, declaration and read together. Must PASS — a removed flag is
//      `audit:silent-reverts`' subject, not this guard's, and failing here would make two guards
//      argue over one commit.
//   3. drop the read AND add a comment naming the flag. Must FAIL — a comment is not a consumer,
//      and the first draft of this script credited one.
//   4. drop the read AND add a string literal holding the flag name. Must FAIL, same reason.
//   5. rename every flag off the convention. Must report a BROKEN SCAN, never a clean sweep.
//   6. rename ONE flag off-convention, consistently — the app still works and section 1 goes blind.
//      Section 2 must catch it; this is the hole that makes a name-keyed guard print a false ok.
