#!/usr/bin/env node
// The résumé's "Verify (demo)" button already admits what it is. What it PRODUCED did not.
//
// The control is gated `edit && c.self && !c.verified`, its label reads "Verify (demo)", and its
// handler is a pure client-state flip — `{...c, verified:true, self:false}` — on `resumeCourses`,
// which is `useState(ME.courses||[])` and never persisted or sent anywhere. Nothing is checked.
//
// Yet it produced a green "✓ verified" chip identical to a real one, over a toast reading
// "✓ Credential verified — thanks for strengthening your profile" — asserted as fact, on
// avalanche and wilderness-first-responder certs, which is what a partner reads before going
// into the mountains with somebody.
//
// AND THE APP HAS A CLEAR CONVENTION IT WAS THE ONE OUTLIER TO. Seven-plus toasts say so:
// "Kudos noted — this preview doesn't deliver it", "Marked as requested — this preview doesn't
// route requests", "Reported — this preview doesn't route group reports to a moderator yet",
// "Request declined in this preview — not saved", and — on this very screen — "Résumé link
// copied … (simulated)" and "Résumé exported as PDF (simulated in this preview)". The app also
// has a REAL credential flow elsewhere (guide_documents + isGuideVerified with expiry), so two
// different things were wearing the same ✓.
//
// THE CHIP KEEPS ITS LEADING ✓ ON PURPOSE. The course name is an inline span and the chip is the
// next one, so a chip beginning with a word character glues into the announced text — "AIARE
// 1verified (demo)" — which is exactly the defect check:a11y-badges exists for. "✓" is not a word
// character, so the boundary stays clean; the greyed styling and the "(demo)" suffix carry the
// honesty instead.
//
//   node scripts/oneoff/probe-resume-demo-verify-says-so.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resume } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const climber = { id: "u_9f1c2d", name: "Robin Belay", username: "robinbelay", avatar: "",
  location: "Bellingham, WA", vouches: [], certifications: [], courses: [], pyramid: {} };
export function render(props) {
  return renderToStaticMarkup(React.createElement(Resume, Object.assign(
    { climber, logs: [], onClose(){}, routeById: () => null }, props)));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-demoverify-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const un = (h) => h.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const demoR = un(render({ editable: true, courses: [{ name: "AIARE 1", org: "", date: "2024-12", verified: true, demo: true }] }));
const realR = un(render({ editable: true, courses: [{ name: "WFR", org: "NOLS", date: "2025-04", verified: true }] }));
const selfR = un(render({ editable: true, courses: [{ name: "AIARE 1", org: "", date: "2024-12", self: true }] }));

for (const [nm, h] of [["demo", demoR], ["real", realR], ["self", selfR]]) {
  if (h.length < 900) fail(`the ${nm} render is only ${h.length} chars — nothing below is meaningful`);
}
if (!bad) ok(`rendered (demo ${demoR.length}, real ${realR.length}, self ${selfR.length} chars)`);

// ---- 1. A demo-awarded tick must SAY it is a demo.
if (/AIARE 1/.test(demoR)) ok("the demo-verified course reaches the page");
else fail("the demo course did not render — the rest of this run is vacuous");

if (/verified \(demo\)/.test(demoR)) ok("a demo-awarded credential is marked '(demo)'");
else fail("a demo-awarded credential renders identically to a real one");

// ---- 2. ...and a genuinely-verified one must NOT be, or the mark says nothing. This is the
// load-bearing control: seed climbers legitimately carry verified:true.
if (/✓ verified/.test(realR) && !/\(demo\)/.test(realR))
  ok("a genuinely verified credential still reads '✓ verified' with no demo mark");
else fail("the real verified chip was damaged, or now claims to be a demo");

// ---- 3. self-reported is untouched.
if (/self-reported/i.test(selfR)) ok("a self-reported course still reads 'self-reported'");
else fail("the self-reported chip was lost");

// ---- 4. THE CHIP MUST NOT OPEN WITH A WORD CHARACTER, or it glues onto the course name in the
// announced text. This is why the ✓ stays.
const m = demoR.match(/>([^<>]*verified \(demo\)[^<>]*)</);
if (!m) fail("could not read the demo chip's own text back");
else if (/^\w/.test(m[1])) fail(`the demo chip starts with a word character (${JSON.stringify(m[1])}) — it will glue onto the course name`);
else ok(`the demo chip opens with a non-word glyph (${JSON.stringify(m[1])})`);

// ---- 5. THE HANDLER, AS SOURCE. Rendering proves the chip can say "(demo)"; it cannot prove the
// button still SETS it, nor that the toast stopped asserting a verification. A merge that keeps
// the chip and drops `demo:true` restores the defect with every assertion above still green.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const h = app.match(/onVerifyCourse=\{[\s\S]{0,600}?\}\}/);
if (!h) fail("ANCHOR LOST: onVerifyCourse handler not found — the wiring is unchecked");
else {
  // COMMENTS STRIPPED FIRST. The fix's own comment beside the handler explains itself by naming
  // `demo:true` and quoting the old object — so with comments left in, DELETING the real
  // `demo:true` left the token sitting in the prose and this assertion passed. Injection case 2
  // MISSED because of it, on a tree where the defect was fully restored. Presence is not use;
  // check:correction-readers records the same false pass, and it is the third time in one
  // session that a checker was fooled by the comment written to explain it.
  const body = h[0].replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
  if (/demo:\s*true/.test(body)) ok("the handler marks the row demo:true");
  else fail("the handler no longer sets demo:true — the chip will claim a real verification again");
  if (/Credential verified/.test(body)) fail("the toast still asserts 'Credential verified' as fact");
  else ok("the toast no longer asserts a verification happened");
  if (/preview|simulated|demo/i.test(body)) ok("...and it says which, in the app's own preview wording");
  else fail("the toast does not say it is a preview");
}

// ---- 6. The BUTTON's own label is what this change is being made consistent with, so it must
// still be there — if it stops saying "(demo)" the whole argument moves.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
if (/Verify \(demo\)/.test(core)) ok("the button still reads 'Verify (demo)'");
else fail("the button no longer says '(demo)' — re-check what this control now claims");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
