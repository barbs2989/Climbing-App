#!/usr/bin/env node
// A hand-typed résumé entry must not render as a logged ascent, and the page must not claim a
// corroboration it does not have.
//
// The résumé's EXPERIENCE list is `all = [...baked, ...live, ...extra]`. `live` comes from the
// climber's own climb_logs rows and carries a route id; `extra` comes from the "Add to résumé"
// form, which is six free-text/select inputs (`{date,name,area,grade,disc,role,partner:null}`)
// with no route id, no verification and no source marker. The two render THROUGH THE SAME ROW,
// so a typed line is visually indistinguishable from a climb the app has a record of.
//
// Meanwhile the page makes the same claim twice, unconditionally:
//   header  "Generated <date> · built from logged climbs & verified credentials"
//   footer  "Built from logged climbs and verified credentials in ClimbMatch ·
//            partner- and community-corroborated"
// On an empty résumé both are false of everything on the page; with a typed row they are false of
// that row. And this document has SHARE RÉSUMÉ and EXPORT PDF on it, so the claim travels.
//
// THE APP ALREADY HAD THE ANSWER ONE SECTION UP. Courses render `✓ verified` or `self-reported`
// per row; Experience did not — the minority surface is the defect, and the page-level claim was
// covering for it. Same shape as the two page-level graders (ProvenancePanel's DATA CONFIDENCE,
// EnrichmentPanels' DATA QUALITY) that were deleted because a per-section signal must beat a
// blanket one.
//
// THE MARK IS "added by hand", DELIBERATELY NOT "self-reported". A logged climb is self-reported
// too, so reusing the courses vocabulary would imply `live` rows are corroborated. What actually
// separates them is that a logged climb is a record against a route id; an `extra` is free text.
//
// Measured 2026-09-03: 4 of these assertions failed before the fix and both controls passed, so
// the probe is specific rather than firing on any change.
//
//   node scripts/oneoff/probe-resume-self-reported-rows.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// A DB-backed climber: a uuid-ish id, so seedHistoryFor contributes nothing and `baked` is empty.
// Whatever the EXPERIENCE list holds is therefore exactly what this probe put there.
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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-resume-sr-")), "bundle.cjs");
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

// A LOGGED climb: carries a routeId, so it resolves through routeById to a real route.
const LOGGED = { date: "2026-06-14", routeId: "wa_x", tickType: "Lead", partners: [] };
// A HAND-TYPED entry: exactly the shape addClimb() builds from the form.
const TYPED  = { date: "2026-05", name: "The Nose", area: "El Capitan", grade: "5.9",
                 disc: "trad", role: "Lead", partner: null };

const emptyR  = un(render({ editable: true }));
const loggedR = un(render({ editable: true, logs: [LOGGED] }));
const typedR  = un(render({ editable: true, extra: [TYPED] }));
const bothR   = un(render({ editable: true, logs: [LOGGED], extra: [TYPED] }));

// Fail closed: every "must NOT contain" assertion below passes against a page that rendered
// nothing at all.
for (const [nm, h] of [["empty", emptyR], ["logged", loggedR], ["typed", typedR]]) {
  if (h.length < 900) fail(`the ${nm} render is only ${h.length} chars — nothing below is meaningful`);
}
if (!bad) ok(`rendered (empty ${emptyR.length}, logged ${loggedR.length}, typed ${typedR.length}, both ${bothR.length} chars)`);

// ---- 1. A typed row must SAY it was added by hand.
if (/The Nose/.test(typedR)) ok("the typed entry reaches the EXPERIENCE list");
else fail("the typed entry did not render at all — the rest of this run is vacuous");

if (/added by hand/i.test(typedR)) ok("a hand-typed entry is marked 'added by hand'");
else fail("a hand-typed entry renders identically to a logged ascent");

// ---- 2. ...and a LOGGED row must NOT be, or the mark means nothing.
if (/North Ridge/.test(loggedR)) ok("the logged climb reaches the EXPERIENCE list");
else fail("the logged climb did not render — the next assertion would be vacuous");

if (!/added by hand/i.test(loggedR)) ok("a logged climb is NOT marked 'added by hand'");
else fail("a logged climb carries the mark too, so the mark says nothing");

// ---- 3. With both present, exactly one row carries the mark.
const marks = (bothR.match(/added by hand/gi) || []).length;
if (marks === 1) ok("with one typed and one logged row, exactly one is marked");
else fail(`with one typed and one logged row, ${marks} rows are marked`);

// ---- 4. The page-level claims must not assert what the page cannot support.
if (!/partner- and community-corroborated/.test(emptyR))
  ok("an empty résumé does not claim partner- and community-corroboration");
else fail("an empty résumé still claims 'partner- and community-corroborated'");

if (!/partner- and community-corroborated/.test(typedR))
  ok("a résumé of typed entries does not claim corroboration either");
else fail("a résumé of hand-typed entries claims 'partner- and community-corroborated'");

// ---- 5. ...and the honest half must SURVIVE. A rewrite that says nothing at all would satisfy
// every assertion above, which is the direction that deletes a real feature.
if (/ClimbMatch/.test(emptyR)) ok("the footer still identifies where the document came from");
else fail("the footer lost its provenance line entirely");

// ---- 6. CONTROL: the courses section's existing per-row honesty is untouched.
const coursesR = un(render({ editable: true,
  courses: [{ name: "WFR", org: "NOLS", date: "2025-04", verified: true },
            { name: "AIARE 1", org: "", date: "2024-12", self: true }] }));
if (/verified/.test(coursesR) && /self-reported/i.test(coursesR))
  ok("CONTROL — courses still render ✓ verified and self-reported per row");
else fail("CONTROL — the courses section lost its per-row marks");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
