#!/usr/bin/env node
/* THE PROFILE TAB AND THE RÉSUMÉ IT OPENS MUST NOT CLAIM SOMETHING THE APP KNOWS IS UNTRUE.
 *
 * Three invariants, all fixed on 2026-09-03 (#1573, #1579, #1580), all of them CHANGES TO STRINGS
 * AND CONDITIONS RATHER THAN TO NAMES — which is exactly the shape `audit:silent-reverts` says in
 * its own closing caveat it cannot see: "a merge that kept a name and dropped its guard clause is
 * invisible here". A stale-base squash could restore all three with every existing gate green.
 * That is the same argument that promoted check:verification-fallback and check:topo-outage-copy,
 * and the reason these are a build gate rather than three probes nobody runs.
 *
 *   1. THE RÉSUMÉ'S PROVENANCE. It is a SHARED and EXPORTED document (Share résumé / Export PDF),
 *      and it claimed "partner- and community-corroborated" unconditionally — false of everything
 *      on an empty page. Its EXPERIENCE list is `[...baked, ...live, ...extra]`, where `extra` is
 *      the "Add to résumé" form (six free-text inputs, no route id, no verification) rendered
 *      through the SAME row as a logged ascent.
 *   2. THE DEMO TICK. `onVerifyCourse` flips session-only state; the button says "Verify (demo)"
 *      and the chip it produced said "✓ verified" over a toast asserting a verification as fact.
 *   3. "RAISE IT WITH:". A fixed row of three offered "Verify email" to a climber whose own
 *      résumé, two inches away, reads "✓ Email verified".
 *
 * SECTIONS 1 AND 2 SHARE ONE esbuild BUNDLE, the way check:outage-copy merged two probes rather
 * than reading one 400 kB file twice. Section 3 needs no render at all.
 *
 * PARSED WITH BABEL, NOT MATCHED WITH A REGEX, in section 3. Three separate checkers were fooled
 * in one session by the comment written to explain the fix they were checking — twice a false
 * FAILURE, once a false PASS on a fully-restored defect. An AST does not see comments, which
 * removes the trap rather than working around it.
 *
 * Promoted from scripts/oneoff/probe-resume-self-reported-rows.mjs,
 * probe-resume-demo-verify-says-so.mjs and probe-raise-it-with-hides-done-steps.mjs, whose
 * injection suites (4/4, 4/4 and 4/4) are the evidence these assertions are not vacuous.
 */

import { build } from "esbuild";
import { parse } from "@babel/parser";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const GUARD = "check:profile-claims";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

// Fails closed naming any required app source it could not find, rather than quietly reading
// fewer files — the #547 shape.
const files = appSources(ROOT, GUARD);
if (files.length < 5) {
  console.error(`${GUARD}: only ${files.length} app sources resolved — this guard has gone blind.`);
  process.exit(1);
}

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const un = (h) => h.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/* ------------------------------------------------------------------ sections 1 & 2: the résumé */

// A DB-backed climber: a uuid-ish id, so seedHistoryFor contributes nothing and `baked` is empty.
// Whatever the EXPERIENCE list holds is therefore exactly what this guard put there.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resume } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const climber = { id: "u_9f1c2d", name: "Robin Belay", username: "robinbelay", avatar: "",
  location: "Bellingham, WA", vouches: [], certifications: [], courses: [], pyramid: {} };
const ROUTE = { id: "wa_x", name: "North Ridge", grade: "5.7", discipline: "trad", mountainId: null };
export function render(props) {
  return renderToStaticMarkup(React.createElement(Resume, Object.assign(
    { climber, logs: [], onClose(){}, routeById: (id) => (id === "wa_x" ? ROUTE : null) }, props)));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-profile-claims-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

console.log("\n--- the résumé states what it is built from, and nothing more ---");

const LOGGED = { date: "2026-06-14", routeId: "wa_x", tickType: "Lead", partners: [] };
const TYPED = { date: "2026-05", name: "The Nose", area: "El Capitan", grade: "5.9",
                disc: "trad", role: "Lead", partner: null };

const emptyR = un(render({ editable: true }));
const loggedR = un(render({ editable: true, logs: [LOGGED] }));
const typedR = un(render({ editable: true, extra: [TYPED] }));
const bothR = un(render({ editable: true, logs: [LOGGED], extra: [TYPED] }));

// FAIL CLOSED: every "must NOT contain" assertion below passes against a page that rendered
// nothing at all.
for (const [nm, h] of [["empty", emptyR], ["logged", loggedR], ["typed", typedR]]) {
  if (h.length < 900) fail(`the ${nm} render is only ${h.length} chars — nothing below is meaningful`);
}
if (!bad) ok(`rendered (empty ${emptyR.length}, logged ${loggedR.length}, typed ${typedR.length})`);

if (/The Nose/.test(typedR)) ok("a hand-typed entry reaches the EXPERIENCE list");
else fail("the hand-typed entry did not render — the next assertion would be vacuous");

if (/added by hand/i.test(typedR)) ok("...and is marked 'added by hand'");
else fail("a hand-typed entry renders identically to a logged ascent");

if (/North Ridge/.test(loggedR)) ok("a logged climb reaches the EXPERIENCE list");
else fail("the logged climb did not render — the next assertion would be vacuous");

// The load-bearing control: a mark applied to everything says nothing.
if (!/added by hand/i.test(loggedR)) ok("...and a logged climb is NOT marked");
else fail("a logged climb carries the mark too, so the mark says nothing");

const marks = (bothR.match(/added by hand/gi) || []).length;
if (marks === 1) ok("with one typed and one logged row, exactly one is marked");
else fail(`with one typed and one logged row, ${marks} rows are marked`);

if (!/partner- and community-corroborated/.test(emptyR))
  ok("an empty résumé does not claim partner- and community-corroboration");
else fail("an empty résumé claims 'partner- and community-corroborated'");

if (!/partner- and community-corroborated/.test(typedR))
  ok("nor does one built from hand-typed entries");
else fail("a résumé of hand-typed entries claims 'partner- and community-corroborated'");

// ...and the honest half must SURVIVE. A rewrite saying nothing at all satisfies every assertion
// above, which is the direction that deletes a real feature.
if (/ClimbMatch/.test(emptyR)) ok("the footer still says where the document came from");
else fail("the footer lost its provenance line entirely");

console.log("\n--- a demo-awarded credential says it is a demo ---");

const demoR = un(render({ editable: true, courses: [{ name: "AIARE 1", org: "", date: "2024-12", verified: true, demo: true }] }));
const realR = un(render({ editable: true, courses: [{ name: "WFR", org: "NOLS", date: "2025-04", verified: true }] }));
const selfR = un(render({ editable: true, courses: [{ name: "AIARE 1", org: "", date: "2024-12", self: true }] }));

if (demoR.length < 900 || realR.length < 900 || selfR.length < 900)
  fail("a course render came back thin — nothing in this section is meaningful");

if (/verified \(demo\)/.test(demoR)) ok("a demo-awarded credential is marked '(demo)'");
else fail("a demo-awarded credential renders identically to a real one");

if (/✓ verified/.test(realR) && !/\(demo\)/.test(realR))
  ok("a genuinely verified credential still reads '✓ verified' with no demo mark");
else fail("the real verified chip was damaged, or now claims to be a demo");

if (/self-reported/i.test(selfR)) ok("a self-reported course still reads 'self-reported'");
else fail("the self-reported chip was lost");

// The chip must not OPEN with a word character or it glues onto the course name in the announced
// text — "AIARE 1verified (demo)" — the defect check:a11y-badges exists for. This is why the ✓
// stays on the demo chip.
const chip = demoR.match(/>([^<>]*verified \(demo\)[^<>]*)</);
if (!chip) fail("could not read the demo chip's own text back");
else if (/^\w/.test(chip[1])) fail(`the demo chip starts with a word character (${JSON.stringify(chip[1])}) — it glues onto the course name`);
else ok(`the demo chip opens with a non-word glyph (${JSON.stringify(chip[1])})`);

// THE WIRING, AS SOURCE. Rendering proves the chip CAN say "(demo)"; it cannot prove the button
// still sets it, nor that the toast stopped asserting a verification — dropping either leaves
// every render assertion above green. COMMENTS ARE STRIPPED, because the fix's own comment names
// `demo:true` and an injection deleting the real one passed on the strength of the prose.
const appSrc = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const handler = appSrc.match(/onVerifyCourse=\{[\s\S]{0,900}?\}\}/);
if (!handler) fail("ANCHOR LOST: the onVerifyCourse handler is gone — its wiring is unchecked");
else {
  const body = handler[0].replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
  if (/demo:\s*true/.test(body)) ok("the handler marks the row demo:true");
  else fail("the handler no longer sets demo:true — the chip will claim a real verification again");
  if (/Credential verified/.test(body)) fail("the toast asserts 'Credential verified' as fact again");
  else ok("the toast does not assert a verification happened");
  if (/preview|simulated|demo/i.test(body)) ok("...and says which, in the app's own preview wording");
  else fail("the toast does not say it is a preview");
}

const coreSrc = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
if (/Verify \(demo\)/.test(coreSrc)) ok("the button still reads 'Verify (demo)'");
else fail("the button no longer says '(demo)' — re-check what this control now claims");

/* ------------------------------------------- section 3: "Raise it with:" hides completed steps */

console.log('\n--- "Raise it with:" does not offer a step already done ---');

const ast = parse(appSrc, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });

let arr = null, filtered = false, arrays = 0;
(function walk(n, parent) {
  if (!n || typeof n.type !== "string") return;
  if (n.type === "ArrayExpression") {
    arrays++;
    const first = n.elements[0];
    if (first && first.type === "ArrayExpression" && first.elements[0] &&
        first.elements[0].type === "StringLiteral" && first.elements[0].value === "Log a route") {
      arr = n;
      if (parent && parent.type === "MemberExpression" && parent.object === n &&
          parent.property.type === "Identifier" && parent.property.name === "filter") filtered = true;
    }
  }
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, n));
    else if (v && typeof v.type === "string") walk(v, n);
  }
})(ast.program, null);

if (arrays < 200) fail(`only ${arrays} array literals parsed — the walk is broken`);
if (!arr) fail('ANCHOR LOST: no "Raise it with" list (first entry "Log a route") — this section is blind');
else {
  const entries = arr.elements.map((e) => ({
    label: e && e.elements && e.elements[0] && e.elements[0].value,
    cond: e && e.elements && e.elements[2] ? appSrc.slice(e.elements[2].start, e.elements[2].end) : null,
  }));
  ok(`found the list: ${entries.map((e) => `${e.label} -> ${e.cond === null ? "(always)" : e.cond}`).join(" | ")}`);

  const ve = entries.find((e) => e.label === "Verify email");
  if (!ve) fail('the "Verify email" entry is gone — re-check what this list now offers');
  else if (ve.cond === null) fail('"Verify email" is UNCONDITIONAL — a verified climber is told to verify');
  else if (/verified/.test(ve.cond)) ok(`"Verify email" is gated on ${ve.cond}`);
  else fail(`"Verify email" carries a condition that does not mention verified: ${ve.cond}`);

  // Over-reach in the other direction: gating these would hide advice that is always valid.
  for (const label of ["Log a route", "Add a cert"]) {
    const e = entries.find((x) => x.label === label);
    if (!e) fail(`the "${label}" entry is gone`);
    else if (e.cond === null) ok(`"${label}" stays unconditional`);
    else fail(`"${label}" gained a condition (${e.cond}) — it is always worth doing`);
  }

  if (filtered) ok("the list is filtered on that condition before rendering");
  else fail("the array carries conditions but nothing filters on them — the gate is dead");
}

// The precedent this rests on: Home's setup checklist gates its own verify row. If that stops
// being true, the argument for section 3 moves and somebody should know.
if (/if\(!ME\.verified\)gaps\.push\(/.test(appSrc))
  ok("CONTROL — Home's setup checklist still gates its verify row on !ME.verified");
else fail("CONTROL — Home no longer gates its verify row; re-check which surface is right");

console.log(bad
  ? `\n${GUARD}: ${bad} problem(s) — a profile surface is claiming something the app knows is untrue.`
  : `\n${GUARD}: ok — the résumé and the trust card state only what they can support.`);
process.exit(bad ? 1 : 0);
