#!/usr/bin/env node
// check:jsx-comments — a comment in JSX CHILDREN position is not a comment, it is copy.
//
// `{/* note */}` is a comment. `/* note */` sitting between two elements is JSX TEXT, and React
// renders it to the user verbatim. Nothing in this repo could see the difference: it is valid JS,
// every identifier is bound, the screen renders, `check:refs` and `check:hooks` are satisfied, and
// the build is clean. It reaches production as visible prose.
//
// IT WAS LIVE ON MAIN WHEN THIS WAS WRITTEN. The Logbook's MY OBJECTIVES section rendered, to
// every user, directly under its own explanatory copy:
//
//   /* With logs down the badge stops saying how many are LEFT, but nothing else would say why no
//   climb is ticked -- and the line right above promises that logged climbs show a check. A
//   missing tick and an unclimbed route look identical, so say which it is. */
//
// A note about a failure mode, addressed to a developer, printed on the screen it was about.
//
// WHY NO EXISTING GUARD CATCHES IT, which is the argument for a new one rather than widening an
// old one. `check:ui` walks 20 screens in a browser and scans rendered copy — but it scans for
// `NaN`, `undefined`, `null` and `[object Object]`, the four things that mean a VALUE went wrong.
// A leaked comment is not a broken value; it is correct text in the wrong place, and it reads to
// any content check as ordinary prose. The browser walk had this in its snapshot the whole time.
//
// It is also the mirror of a defect this codebase already took the other way round: #890 left a
// JSX fragment unclosed and turned `;if(inboxOpen)return ` into TEXT, making the Messages screen
// unreachable — see [[fragment-wrap-turned-ternaries-into-jsx-text]]. Same root cause, opposite
// symptom: there code became text, here a comment became text.
//
// Structural, via Babel: a regex cannot tell a comment from prose that happens to contain a
// slash-star, and the blanker other guards use is unsafe over JSX bodies full of apostrophes.
// Static, so it sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:jsx-comments";

// The shared list, not a tree walk: a walk here would pick up `enrichment-wip/` and `catalog/`,
// which are data dumps that are not even valid modules, and one of them fails to parse. Guards
// that name their inputs must prove they read them — appSources() bails if any is missing.
const files = appSources(ROOT, GUARD);

let failures = 0;
let textNodes = 0;
const hits = [];

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) {
    console.log(`${GUARD}: FAILED to parse ${rel} — ${e.message}`);
    console.log(`  A guard that cannot read a file has not checked it. Failing closed.`);
    process.exit(1);
  }
  traverse(ast, {
    JSXText(p) {
      textNodes++;
      const raw = p.node.value;
      // BOTH delimiters required. A leaked comment always carries its own `/*` and `*/`, while
      // prose could legitimately contain one of them (a path, a footnote marker) — demanding the
      // pair keeps this from reporting real copy, which is what teaches people to ignore a guard.
      if (!raw.includes("/*") || !raw.includes("*/")) return;
      hits.push({ rel, line: p.node.loc.start.line, body: raw.replace(/\s+/g, " ").trim() });
    },
  });
}

console.log(`${GUARD}\n`);

// Fail closed. Zero JSX text nodes across three files that are almost entirely JSX means the
// traversal broke, and "no findings" is exactly what that looks like from here.
if (textNodes < 100) {
  console.log(`  FAIL  found only ${textNodes} JSX text node(s) — the traversal broke, not the app is clean.`);
  process.exit(1);
}
console.log(`  ok    read ${files.length} source file(s), ${textNodes} JSX text nodes`);

for (const h of hits) {
  failures++;
  console.log(`  FAIL  ${h.rel}:${h.line} renders a comment to the user:`);
  console.log(`        ${h.body.slice(0, 160)}${h.body.length > 160 ? "…" : ""}`);
  console.log(`        Wrap it: {/* … */}  — in children position the braces ARE the comment.`);
}

if (failures) {
  console.log(`\n${failures} leaked comment(s).`);
  process.exit(1);
}
console.log(`  ok    no comment is rendered as copy`);
console.log(`\nok — every comment in JSX children position is wrapped in braces.`);

// Injection-tested — scripts/oneoff/inject-jsx-comment-cases.mjs, each case proving its edit
// landed by checksum before judging the guard:
//   1. restore the real defect (unwrap the MY OBJECTIVES comment)  -> fails naming file+line
//   2. `/* x */` between two sibling elements in RouteDetail       -> fails naming file+line
//   3. the traversal sees no JSXText                               -> "the traversal broke", exit 1
//   4. children text with `/*` and NO closer                       -> must PASS; one delimiter is
//                                                                     not a comment, and flagging
//                                                                     it would flag real copy
// 1, 3 and 4 came back green from the harness. CASE 2 WAS VERIFIED BY HAND, not by the harness:
// that run was killed mid-case on a box at load 508 and reported an empty guard output, which the
// harness cannot distinguish from a miss. Run by hand it fails correctly at RouteDetail.jsx:2497,
// exit 1. Re-run the harness on a quiet machine before trusting a 4/4 from it.
//
// Two earlier versions of case 2 were wrong in a way worth keeping: the first injected before
// `<WaypointList`, which sits inside `{…}` — an EXPRESSION container, where `/* */` genuinely IS
// a comment — so the guard correctly ignored it and the case read as a miss. And renaming the
// visitor key to disable it makes babel-traverse THROW on an unknown node type, so the guard dies
// with a stack trace instead of reaching its own fail-closed branch, proving nothing about it.
