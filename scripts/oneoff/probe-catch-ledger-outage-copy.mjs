// Does the catch ledger tell an outage apart from an empty record?
//
// `meLedger` is built from `catches`, which is hydrated from useBelajCatches. A failed read
// leaves that list [], so the ledger is byte-identical to a real climber's genuinely empty one:
// totalCatches 0, lastCatch "". The card then renders three zeros and "No verified catches yet
// — log a belay and ask your partner to confirm it." — telling somebody who HAS caught falls
// that they have caught none, and inviting them to go log one.
//
// This is a COMPONENT probe and says nothing about whether the flag reaches the screen under a
// real outage; check:outage walks the Profile tab and is what proves that. It exists because the
// fixture has no catches, so the section is empty in BOTH runs and the guard's rule 2 stays quiet
// on it -- an absence the fixture happens to share is unmeasurable until the copy is gated on
// isError rather than on whether rows exist.
import { build } from "esbuild";
import path from "path"; import os from "os"; import fs from "fs";
import { createRequire } from "module";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatchLedger } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export function render(props) { return renderToStaticMarkup(React.createElement(CatchLedger, props)); }`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-catch-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const raw = require_(out).render;
// SSR ESCAPES its output, so an assertion written against the source string silently never
// matches -- the curly apostrophe in "Couldn't" arrives as &#x27; and the em dash as itself.
const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "\u2019")
  .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const render = (props) => strip(raw(props));

const EMPTY = { totalCatches: 0, highFactorCatches: 0, lastCatch: "", partnersSigned: 0 };
const REAL = { totalCatches: 7, highFactorCatches: 2, lastCatch: "2026-05-24", partnersSigned: 3 };

// Assert on the COUNT CELLS, never on a bare em dash: the healthy sentence is "No verified
// catches yet — log a belay…", so a naive /—/ fires on correct code. It did, on the first run.
const cases = [
  ["a genuinely empty record", { ledger: EMPTY },
   [/No catches logged yet/, /0 Total Catches/], [/Couldn.t load/, /— Total Catches/]],
  ["the SAME ledger, but the read failed", { ledger: EMPTY, unavailable: true },
   [/Couldn.t load your catch record/, /— Total Catches/, /— High-Factor/, /— Partners Signed/],
   [/No catches logged yet/, /0 Total Catches/]],
  ["a populated record is untouched", { ledger: REAL },
   [/Last catch: 2026-05-24/, /7 Total Catches/, /3 partners signed/],
   [/Couldn.t load/, /No catches logged yet/, /— Total Catches/]],
  ["another climber's ledger (FullProfile passes no flag)", { ledger: REAL, unavailable: undefined },
   [/Last catch/, /7 Total Catches/], [/Couldn.t load/, /— Total Catches/]],
  // A REAL account's card (the Me tab passes meCatchView): the server's counted number, what waits
  // on a partner, and falls taken -- never the seed tiles nothing writes for a real account.
  ["a real account with nothing logged", { ledger: { real: true, counted: 0, awaiting: 0, took: 0, lastCatch: "" } },
   [/No catches logged yet/, /0 Counted/, /0 Waiting on partner/, /0 Falls you took/], [/High-Factor/, /Partners Signed/, /VERIFIED/]],
  ["a real account whose counted number has not arrived", { ledger: { real: true, counted: null, awaiting: 1, took: 0, lastCatch: "2026-05-24" } },
   [/— Counted/, /1 Waiting on partner/, /Last catch: 2026-05-24/], [/0 Counted/]],
  ["a real account, read failed", { ledger: { real: true, counted: 2, awaiting: 0, took: 0, lastCatch: "" }, unavailable: true },
   [/Couldn.t load your catch record/, /— Counted/, /— Waiting on partner/], [/2 Counted/, /No catches logged yet/]],
];

let bad = 0;
for (const [name, props, must, mustNot] of cases) {
  const t = render(props);
  let fails = 0;
  if (!t || t.length < 40) { console.error(`  FAIL  ${name}: rendered nothing (${(t||"").length} chars)`); bad++; continue; }
  for (const re of must) if (!re.test(t)) { console.error(`  FAIL  ${name}: missing ${re}`); fails++; }
  for (const re of mustNot) if (re.test(t)) { console.error(`  FAIL  ${name}: must NOT say ${re}`); fails++; }
  if (fails) { console.error(`        got: ${t.slice(0, 220)}`); bad += fails; }
  else console.log(`  ok    ${name}`);
}

// The two states must actually DIFFER, or the flag is wired to nothing and every assertion above
// could be satisfied by copy that never changes.
if (render({ ledger: EMPTY }) === render({ ledger: EMPTY, unavailable: true })) {
  console.error("  FAIL an outage renders the same card as an empty record — the flag reaches nothing");
  bad++;
}

if (bad) { console.error(`\nprobe-catch-ledger-outage-copy: ${bad} failure(s)`); process.exit(1); }
console.log("\nok — the catch ledger tells a failed read apart from an empty record");
