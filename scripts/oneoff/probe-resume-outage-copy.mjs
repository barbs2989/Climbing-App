#!/usr/bin/env node
// Another climber's résumé must tell a FAILED READ from a private logbook.
//
// `resumeLogsQ` (useUserLogs for someone else) was one of the unflagged query handles. A failed
// read empties `live`, and `baked` is empty for a real DB climber, so `all` is empty and the
// résumé says "<Name> hasn't shared any climbs here" — a statement about what that person has
// done, on their own page.
//
// The sentence after it already hedges: "Logbooks are private unless their owner publishes them,
// so an empty list is not a claim they haven't climbed." That hedge is about PRIVACY — RLS makes a
// logbook invisible unless published — and it is right for the case it covers. It says nothing
// about a read that failed, which is a different sentence.
//
// WHY A PROBE AND NOT check:outage. That guard walks the seven tabs and a few sub-views; a second
// climber's résumé is behind an OVERLAY, which its own header lists as out of frame. And the
// fixture has no second-climber résumé to open, so even a widened walk would compare an empty
// section against an empty section — an absence the fixture shares is unmeasurable, not absent.
//
// THE RENDER HAPPENS INSIDE THE BUNDLE, which is not a style choice. Importing react-dom/server
// separately gives the renderer a DIFFERENT React instance from the one esbuild inlines, and the
// dispatcher on the bundled copy is null: any component using hooks dies with "Cannot read
// properties of null (reading 'useState')" — and on a loaded box it exhausts the heap first, so it
// presents as an OOM. Resume calls useState; the trust-panel probe next door does not, which is
// why that one works with the simpler shape. check:bare has the correct pattern and this copies
// it: an stdin entry that imports React, the renderer and the component together.
//
//   node scripts/oneoff/probe-resume-outage-copy.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// A DB-backed climber: a uuid-ish id, so seedHistoryFor contributes nothing and the tick list is
// exactly what the read returned.
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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-resume-")), "bundle.cjs");
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

// renderToStaticMarkup ESCAPES a straight apostrophe as &#x27;, so "hasn't" and "Tap 'Log a
// climb'" never match the source string. The failed-read copy uses a CURLY apostrophe, which is
// not escaped — which is why that assertion passed while the two controls failed and looked like
// app defects. Decode before testing; see [[ssr-probes-must-match-escaped-html]].
const un = (h) => h.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const failed = un(render({ unavailable: true }));
const empty = un(render({ unavailable: false }));
const mine = un(render({ unavailable: false, editable: true }));

if (failed.length < 600) fail(`the failed-read render is only ${failed.length} chars — nothing below is meaningful`);
else ok(`rendered (${failed.length} chars)`);

if (/Couldn’t load this climber’s logbook/.test(failed)) ok("a failed read SAYS the read failed");
else fail("a failed read does not say so");
if (!/hasn't shared any climbs/.test(failed)) ok("and it no longer asserts they have shared nothing");
else fail("it still asserts 'hasn't shared any climbs' under a failed read");

// The other two states must be UNCHANGED. A guard that turned a correct empty state into an error
// message would be worse than the defect — the mistake check:topo-outage-copy records for its own
// case 3, where deleting the invitation from BOTH states silenced the real assertion too.
if (/hasn't shared any climbs/.test(empty)) ok("a genuinely empty logbook still says so, with the privacy hedge");
else fail("the ordinary empty state lost its copy");
if (!/Couldn’t load/.test(empty)) ok("and does not claim a failure that did not happen");
else fail("the ordinary empty state now claims a read failure");
if (/Tap 'Log a climb'/.test(mine)) ok("your OWN empty résumé still prompts you to log");
else fail("the editable empty state lost its prompt");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
