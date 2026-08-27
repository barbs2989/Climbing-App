#!/usr/bin/env node
// A fixed panel anchored to the bottom of the viewport must RESERVE THE SPACE IT COVERS.
//
// `position:fixed` takes a panel out of the layout, so nothing below it moves and scrolling
// never gets content out from under it -- the panel is pinned to the VIEWPORT, not the page.
// A dismissible panel is fine: you close it and the content is there. One that cannot be
// dismissed makes the bottom of every screen unreachable for as long as it is up.
//
// PolicyUpdateNotice is that panel, and it was doing exactly this. Measured at 390x844 by
// scripts/oneoff/probe-policy-notice-covers-content.mjs: 201px of an 844px viewport, hiding
// 39 controls across six tabs -- the whole app footer (Settings, Privacy, About us) on every
// one of them, so the notice asking you to review the Privacy Policy was covering the Privacy
// link. It is not a legacy-account state either: it fires for EVERY signed-in account every
// time POLICY_VERSION is bumped, which its own copy has a branch for.
//
// TWO RULES, AND THE SECOND IS WHY THIS IS WORTH HAVING FOR A CLASS OF ONE.
//
//   1  ANTI-REVERT. The reservation is one `paddingBottom` on #appscroll driven by the same
//      flag that mounts the panel. A merge from a stale base that keeps the flag and drops
//      that clause reads as a clean merge, changes no identifier, and is invisible to
//      audit:silent-reverts -- which says so in its own closing caveat. That is the recorded
//      recurring hazard in this repo, not a hypothetical. check:verification-fallback exists
//      for the same shape.
//   2  CLASS GROWTH. A SECOND bottom-anchored fixed panel has to be declared here with a
//      reason. So this is not only a detector for the one panel that exists: it makes the
//      next author answer the same question rather than rediscover it.
//
// A FULL-SCREEN overlay (top:0 AND bottom:0) is deliberately not in scope. It covers
// everything on purpose and carries its own close control; reserving space for it would be
// meaningless.
//
//   npm run check:bottom-panels
//
// Static, milliseconds. Gated by `npm run build`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:bottom-panels";

// Declared bottom-anchored fixed panels. A panel here that no longer exists fails as stale, so
// this cannot rot into a description of code that is gone.
const DECLARED = [
  {
    style: 'position:"fixed",left:0,right:0,bottom:0',
    file: "ClimbMatchCore.jsx",
    why: "PolicyUpdateNotice — non-dismissible by design, so it MUST reserve space; #appscroll's paddingBottom is the reservation",
    reserves: true,
  },
];

const files = appSources(ROOT, GUARD);
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]));

const fails = [];

// ---- rule 2: no undeclared bottom-anchored fixed panel -------------------------------------
// Matched on the style text rather than an AST: these are inline literals in a dense file, and
// the shape is what matters. Comments are not stripped because no comment in these files spells
// a style object; if one ever does, the fix is to name it here.
let found = 0;
const BOTTOM = /position:"fixed"[^}]{0,200}?bottom:0/g;
for (const [f, s] of Object.entries(src)) {
  for (const m of s.matchAll(BOTTOM)) {
    const text = m[0];
    if (/top:0/.test(text)) continue;                 // full-screen overlay, out of scope
    found++;
    // MATCHED BY OFFSET, NOT BY SUBSTRING, and injection case 2 is why. A declaration is a claim
    // about ONE panel; testing `text.includes(style)` let a brand-new panel whose style merely
    // starts the same way -- `...bottom:0,height:40` -- inherit the existing declaration and pass
    // silently. That is the exact failure this rule exists to prevent, committed by the rule.
    const d = DECLARED.find((x) => {
      if (x.file !== f) return false;
      const at = s.indexOf(x.style);
      return at >= 0 && at >= m.index && at < m.index + text.length;
    });
    if (!d) {
      const line = s.slice(0, m.index).split("\n").length;
      fails.push(`${f}:${line}  a bottom-anchored fixed panel that is not declared in ${GUARD}:\n      ${text.slice(0, 110)}\n      Declare it with a reason, and say how it reserves the space it covers — or make it dismissible.`);
    }
  }
}

// ---- rule 1: the declared reservations still exist ------------------------------------------
for (const d of DECLARED) {
  const s = src[d.file];
  const occurrences = s ? s.split(d.style).length - 1 : 0;
  if (occurrences > 1) {
    fails.push(`AMBIGUOUS declaration — ${JSON.stringify(d.style)} appears ${occurrences} times in ${d.file}, ` +
      "so it names no single panel and a second one could inherit it. Make the declared style specific to one.");
    continue;
  }
  if (!s || !s.includes(d.style)) {
    fails.push(`STALE declaration — ${d.file} no longer holds ${JSON.stringify(d.style)}. ` +
      `Either the panel moved (re-anchor it) or it is gone (drop the entry). ${d.why}`);
    continue;
  }
  if (!d.reserves) continue;
  const app = src["ClimbMatch.jsx"];
  // The reservation, spelled as the app spells it: #appscroll's paddingBottom, driven by the
  // same flag that mounts the panel. Both halves are required -- a paddingBottom that is not
  // gated on the flag would pad the page for everyone, and a flag with no paddingBottom is the
  // defect this guard exists for.
  const scroller = app.match(/<div id="appscroll"[^>]*>/);
  if (!scroller) {
    fails.push("ANCHOR LOST — ClimbMatch.jsx has no `<div id=\"appscroll\"`, so the reservation cannot be located. Update this guard.");
  } else if (!/paddingBottom:_needsPolicy&&policyH\?policyH:undefined/.test(scroller[0])) {
    fails.push(
      "PolicyUpdateNotice reserves no space: #appscroll carries no `paddingBottom` driven by `_needsPolicy`.\n" +
      "      The panel is fixed and cannot be dismissed, so without it the bottom ~200px of every\n" +
      "      screen is unreachable while it is up — measured at 39 controls across six tabs,\n" +
      "      including the whole footer. Re-run scripts/oneoff/probe-policy-notice-covers-content.mjs.");
  }
}

// FAILS CLOSED. This guard reports an absence, so a scan that matched nothing prints what a
// clean tree prints. One panel is the whole live class; zero means the style vocabulary moved.
if (!found) {
  console.error(`\n${GUARD} FAILED — found NO bottom-anchored fixed panel in ${files.length} file(s).`);
  console.error("There is at least one (PolicyUpdateNotice), so the scan is broken, not the app.");
  process.exit(1);
}

if (fails.length) {
  console.error(`\n${GUARD} FAILED — ${fails.length} problem(s):\n`);
  for (const f of fails) console.error("  " + f);
  process.exit(1);
}

console.log(`${GUARD}: ok — ${found} bottom-anchored fixed panel(s), each declared and each reserving the space it covers.`);

// INJECTION CASES — re-run after any change here.
//   1  drop the paddingBottom from #appscroll        -> fails naming PolicyUpdateNotice   (the REAL revert)
//   2  add a second bottom-anchored fixed panel      -> fails as undeclared
//   3  add a full-screen overlay (top:0 AND bottom:0)-> MUST PASS: covering everything is its job
//   4  rename the declared panel's style             -> fails as STALE, not silently
//   5  break the style vocabulary                    -> fails on the "found none" floor
