#!/usr/bin/env node
/* THE PROFILE TAB AND THE RÉSUMÉ IT OPENS MUST NOT CLAIM SOMETHING THE APP KNOWS IS UNTRUE.
 *
 * Two invariants, both fixed on 2026-09-03 (#1573, #1579), all of them CHANGES TO STRINGS
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
 *   2. THE SELF-AWARDED TICK. `onVerifyCourse` let the owner mark their own course verified. It was
 *      caveated "(demo)" until 2026-09-30, then REMOVED by owner decision; this section keeps it gone.
 *
 * SECTIONS 1 AND 2 SHARE ONE esbuild BUNDLE, the way check:outage-copy merged two probes rather
 * than reading one 400 kB file twice.
 *
 * Promoted from scripts/oneoff/probe-resume-self-reported-rows.mjs and
 * probe-resume-demo-verify-says-so.mjs, whose injection suites (4/4 and 4/4) are the evidence these assertions are not vacuous.
 */

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { readCoreSource, appSources } from "./lib/guard-sources.mjs";

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
import ReactDOM from "react-dom";
// Resume ends in createPortal(..., document.body), which the server renderer refuses: portals are
// PLACEMENT, and check:overlays owns that. Flattened and \`document.body\` stubbed for THIS call only,
// the same scoped patch check:units uses for FullProfile, so nothing else in the bundle moves.
function flat(fn) {
  const orig = ReactDOM.createPortal, hadDoc = "document" in globalThis;
  ReactDOM.createPortal = (children) => children;
  if (!hadDoc) globalThis.document = { body: {} };
  try { return fn(); } finally { ReactDOM.createPortal = orig; if (!hadDoc) delete globalThis.document; }
}
import { Resume } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const climber = { id: "u_9f1c2d", name: "Robin Belay", username: "robinbelay", avatar: "",
  location: "Bellingham, WA", vouches: [], certifications: [], courses: [], pyramid: {} };
const ROUTE = { id: "wa_x", name: "North Ridge", grade: "5.7", discipline: "trad", mountainId: null };
export function render(props) {
  return flat(() => renderToStaticMarkup(React.createElement(Resume, Object.assign(
    { climber, logs: [], onClose(){}, routeById: (id) => (id === "wa_x" ? ROUTE : null) }, props))));
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

console.log("\n--- the owner cannot verify their own credential ---");

// SINCE 2026-09-30 THERE IS NO SELF-VERIFY. The owner decided toasts and controls read as the
// finished app, and a finished app does not let a climber award their own avalanche cert a tick:
// "Verify (demo)" and its handler were REMOVED, not reworded. So this section now asserts the
// control stays gone, and that the two honest chips it sat between still render.
const realR = un(render({ editable: true, courses: [{ name: "WFR", org: "NOLS", date: "2025-04", verified: true }] }));
const selfR = un(render({ editable: true, courses: [{ name: "AIARE 1", org: "", date: "2024-12", self: true }] }));

if (realR.length < 900 || selfR.length < 900)
  fail("a course render came back thin — nothing in this section is meaningful");

if (/✓ verified/.test(realR)) ok("a genuinely verified credential still reads '✓ verified'");
else fail("the real verified chip was damaged");

if (/self-reported/i.test(selfR) && !/✓ verified/.test(selfR)) ok("a self-reported course reads 'self-reported', never verified");
else fail("the self-reported chip was lost, or a self-reported course now reads verified");

// The chip must not OPEN with a word character or it glues onto the course name in the announced
// text — "WFRverified" — the defect check:a11y-badges exists for.
const chip = realR.match(/>([^<>]*✓ verified[^<>]*)</);
if (!chip) fail("could not read the verified chip's own text back");
else if (/^\w/.test(chip[1])) fail(`the verified chip starts with a word character (${JSON.stringify(chip[1])}) — it glues onto the course name`);
else ok(`the verified chip opens with a non-word glyph (${JSON.stringify(chip[1])})`);

// AS SOURCE, comments stripped: no handler and no control may hand the owner a verification.
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const appSrc = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const coreSrc = readCoreSource();
const appCode = strip(appSrc), coreCode = strip(coreSrc);
if (/onVerifyCourse/.test(appCode) || /onVerifyCourse/.test(coreCode)) fail("an onVerifyCourse self-verify handler is back");
else ok("no self-verify handler is wired to the résumé");
if (/Verify \(demo\)|Mark verified/.test(coreCode)) fail("a self-verify button is back on the résumé or the guide dashboard");
else ok("no control offers to mark your own credential verified");

/* ---------------------- section 5: another climber's grade pyramid is not "climbs logged" */

console.log("\n--- the pyramid on somebody else's profile does not claim to be logged climbs ---");

/* FullProfile renders ONE section two ways. Viewing YOURSELF, AscentPyramid is handed
   `climber.__selfLogs` -- real logs -- and "Your sends by grade" is true of them. Viewing ANYONE
   ELSE that prop is undefined, so AscentPyramid takes its `else if(pyramid)` branch and totals
   `climber.pyramid`, a stored career summary. The caption there read "Climbs logged at each
   grade", and directly beneath it the same screen prints `Logged Climbs - N` off seedHistoryFor.
   Measured across every seed climber that renders the section: 0 of 5 agree, and the pyramid runs
   +22 to +120 ahead of the logged count (Sam Rivera 26 against 4, Jordan Park 126 against 6). So
   the caption asserted a provenance the data does not have AND contradicted the heading below it.

   DERIVED, NOT A PINNED PHRASE. The rule holds only while the non-self branch is fed by `pyramid`
   rather than by logs; wire real logs for other climbers and the precondition stops holding and
   this stops complaining, without anyone editing the rule. Same shape as the retired sections 3 and 4, which
   re-derive from the migrations. A guard pinned to today's wording would forbid improving it. */
const pyr = coreSrc.match(/climber\.__selfLogs\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"([\s\S]{0,600}?)<AscentPyramid\b([\s\S]{0,300}?)\/>/);
if (!pyr) fail("ANCHOR LOST: could not read the sends-by-grade caption beside <AscentPyramid> -- this section is blind");
else {
  const otherCap = un(pyr[2]);
  const tag = pyr[4];
  const pyramidFed = /logs=\{climber\.__selfLogs\}/.test(tag) && /pyramid=\{climber\.pyramid\}/.test(tag);

  if (!pyramidFed) {
    ok("the non-self pyramid is no longer fed by `climber.pyramid` -- this section's premise has moved, so it asserts nothing");
  } else {
    // THE CLAIM. With no logs prop, the numbers are the stored pyramid, so calling them logged
    // climbs is false -- and the Logged Climbs heading underneath states the real figure.
    if (/\blogg?ed\b|\blogs\b/i.test(otherCap))
      fail(`the caption shown on somebody else's profile says "${otherCap}" -- that section renders climber.pyramid, a stored summary, not logged climbs`);
    else ok("it does not describe another climber's stored pyramid as logged climbs");

    /* NON-VACUITY. Every assertion above is satisfied by an empty caption, and a rule that only
       forbids is satisfied by deleting the sentence -- so it must still say what the reader is
       looking at. */
    if (otherCap.trim().length >= 20 && /\bgrade|\bsend/i.test(otherCap))
      ok("...and still tells the reader the section is sends by grade");
    else
      fail(`the caption has been emptied rather than corrected: "${otherCap}"`);
  }
}

console.log(bad
  ? `\n${GUARD}: ${bad} problem(s) — a profile surface is claiming something the app knows is untrue.`
  : `\n${GUARD}: ok — the résumé and the profile state only what they can support.`);
process.exit(bad ? 1 : 0);
