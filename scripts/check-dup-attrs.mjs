#!/usr/bin/env node
// A declaration written twice in one place: the later one silently wins and the earlier one is
// DEAD. Two shapes, one rule.
//
//   <button aria-current={a} ... aria-current={b}>     the JSX attribute
//   style={{ ..., border:"1px ...", ..., border:"1.5px ..." }}   the object key
//
// WHY A GATE AND NOT A WARNING. esbuild already reports both, and `npm run build` prints them --
// which is exactly why this went unnoticed. All three instances shipped to main under a build
// that said `ok`, because a warning in a sixty-second log is not a check. This repo's whole
// premise is that the failure mode here is not a build error but a screen that renders wrong,
// and a warning is indistinguishable from noise. Static, milliseconds, so it sits in the build.
//
// THE THREE IT WAS WRITTEN AGAINST WERE REAL, and they split cleanly by severity:
//
//   ClimbMatch.jsx / ClimbMatchCore.jsx -- aria-current declared twice with the IDENTICAL
//     expression. Harmless today, and the fingerprint of an applier that double-applied: two
//     accessibility sweeps reached the same control and neither checked whether the attribute
//     was already there. The same slip with two DIFFERENT expressions announces the wrong state
//     with nothing on screen to show for it.
//   ClimbMatchCore.jsx:2884 -- `border:"1px solid "+C.blueDim` followed by
//     `border:"1.5px solid "+C.blueDim` in one style object. The 1px is dead; the chip renders
//     at 1.5px, matching the float-plan button beside it. A silent style override.
//
// NO EXEMPTIONS, DELIBERATELY. There is no correct reason to write one name twice in one
// element or one object literal -- React itself warns about the first, and the second is dead
// code in every case. Overriding a SPREAD is a different shape (`{...base, color:"red"}` is a
// spread and a key, not two keys) and is not reported. A rule with no exemption list cannot rot
// into a description of code that is gone.
//
//   npm run check:dup-attrs
//
// Gated by `npm run build`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:dup-attrs";

const files = appSources(ROOT, GUARD);
const findings = [];
let elements = 0, objects = 0;

const oneLine = (s) => s.replace(/\s+/g, " ").trim();

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  let ast;
  try {
    // errorRecovery is off on purpose: a file this guard cannot parse is a file it cannot
    // report on, and a partial parse would quietly narrow the scan.
    ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    console.error(`\n${GUARD} FAILED — could not parse ${rel}: ${String(e.message).split("\n")[0]}`);
    console.error("Nothing in that file was scanned, so a clean result would be about the rest of the app.");
    process.exit(1);
  }

  traverse(ast, {
    JSXOpeningElement(p) {
      elements++;
      const seen = new Map();
      for (const a of p.node.attributes) {
        // A spread carries no attribute name, so it can neither collide nor be collided with.
        if (a.type !== "JSXAttribute" || !a.name || a.name.type !== "JSXIdentifier") continue;
        const n = a.name.name;
        const prev = seen.get(n);
        if (prev) {
          const tag = src.slice(p.node.name.start, p.node.name.end);
          findings.push({
            rel, line: a.loc.start.line, kind: "attribute", name: n, tag,
            first: oneLine(src.slice(prev.start, prev.end)).slice(0, 88),
            second: oneLine(src.slice(a.start, a.end)).slice(0, 88),
          });
        }
        seen.set(n, a);
      }
    },
    ObjectExpression(p) {
      objects++;
      const seen = new Map();
      for (const pr of p.node.properties) {
        // Spreads are skipped for the same reason as above; a computed key is not a literal
        // name and two of them are not knowably the same key.
        if (pr.type !== "ObjectProperty" || pr.computed) continue;
        const k = pr.key.type === "Identifier" ? pr.key.name
          : pr.key.type === "StringLiteral" ? pr.key.value : null;
        if (k === null) continue;
        const prev = seen.get(k);
        if (prev) {
          findings.push({
            rel, line: pr.loc.start.line, kind: "object key", name: k, tag: null,
            first: oneLine(src.slice(prev.start, prev.end)).slice(0, 88),
            second: oneLine(src.slice(pr.start, pr.end)).slice(0, 88),
          });
        }
        seen.set(k, pr);
      }
    },
  });
}

// FAILS CLOSED. This guard reports an ABSENCE, so a scan that traversed nothing prints exactly
// what a clean tree prints. The floors are well below reality (this app has ~4,500 JSX elements
// and ~9,000 object literals) and well above what a broken visitor leaves.
if (elements < 500 || objects < 500) {
  console.error(`\n${GUARD} FAILED — the traversal is broken, not the app.`);
  console.error(`Saw ${elements} JSX element(s) and ${objects} object literal(s) across ${files.length} file(s);`);
  console.error("both should be in the thousands. A guard that reports absence must not report it having looked at nothing.");
  process.exit(1);
}

if (findings.length) {
  console.error(`\n${GUARD} FAILED — ${findings.length} declaration(s) are written twice in one place:\n`);
  for (const f of findings) {
    console.error(`  ${f.rel}:${f.line}  duplicate ${f.kind} ${JSON.stringify(f.name)}` +
      (f.tag ? ` on <${f.tag}>` : ""));
    console.error(`      dead   ${f.first}`);
    console.error(`      wins   ${f.second}`);
  }
  console.error("\nThe LATER one wins and the earlier one never runs. If the two agree, delete either;");
  console.error("if they disagree, decide which was meant — the rendered behaviour today is the later one.");
  process.exit(1);
}

console.log(`${GUARD}: ok — no duplicate attribute or key across ${elements} JSX element(s) and ${objects} object literal(s) in ${files.length} file(s).`);

// INJECTION CASES — run these after ANY change to the traversal. Each must fail with a message
// naming its own defect; a run that dies for another reason is not a catch.
//
//   1  restore ClimbMatchCore.jsx to 8cce78d  -> fails naming border + aria-current  (REAL defect)
//   2  restore ClimbMatch.jsx to 8cce78d      -> fails naming aria-current           (REAL defect)
//   3  add `<div x={1} {...r} x={2}/>`        -> fails: a spread between them changes nothing
//   4  add `{...base, color:"red"}`           -> MUST PASS: a spread and a key are not two keys
//   5  add a computed pair `{[k]:1,[k]:2}`    -> MUST PASS: not knowably the same key
//   6  break the visitor (return early)       -> fails on the element/object floor
//
// WHAT THE FLOOR DOES NOT PROVE, learned from case 6 rather than assumed: it asks whether the
// traversal RAN, not whether the detection ran. The first version of that case returned AFTER
// `elements++`, so the counter still saw thousands and the guard passed with duplicate-finding
// disabled -- correct behaviour for a floor that means "did this read the app", and a reminder
// that it is not a substitute for the cases above.
