#!/usr/bin/env node
// check:preview-claims — no toast tells a climber they are using a PREVIEW, a DEMO or a SIMULATION.
//
// OWNER DECISION, 2026-09-30: "Remove the toast popup about being in preview mode … Just make the
// toast popups as if they are in the final app state for the users … make this the normal for the
// whole app." Until then this guard enforced the OPPOSITE convention -- nine client-only controls
// had to say "this preview doesn't send it to X yet", and the guard failed closed if the app used
// "this preview" fewer than 8 times. That convention is retired, so the guard now forbids it.
//
// WHAT IS STILL ALLOWED, and why the rule is narrow. A toast may still say a write FAILED
// ("Couldn't save that — try again") and may still tell a SIGNED-OUT visitor that something stays on
// this device until they sign in: both are true in the finished app. What it may not do is describe
// the app itself as unfinished -- "this preview", "(simulated)", "Demo crew", "only for now".
//
// HOW IT READS A TOAST. Every call to showToast / notify / toast / onToast / say in the app sources,
// its argument read by STRING-AWARE paren balancing, never a character window: these files pack
// whole screens onto one physical line of 20,000+ characters.
//
// THE JOIN-REQUESTS HEADING check is kept from the previous rule, because it is not about preview
// wording: since 0178 the section lists real requests (which write) beside seed ones (which do
// not), so the heading must state what the section holds rather than promise what approving does.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => f.endsWith(".jsx")).map((f) => "lib/" + f)];
let failures = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { failures++; console.log("  FAIL  " + m); };
const dead = (m) => { console.error("\ncheck:preview-claims BROKEN — " + m + "\nReporting nothing is not a pass."); process.exit(2); };

// Wording that describes the APP as unfinished. Deliberately not "on this device" -- that is the
// true signed-out caveat -- and not "demo" alone, which is also a climbing word ("demo day").
const PREVIEW_TALK = /\bthis preview\b|\bin preview\b|\bpreview mode\b|\bsimulat(ed|ion)\b|\(demo\)|\bdemo (crew|profile|mode|account)\b|\bleft the demo\b|\bonly for now\b|\b(isn|aren)[’']t live\b|\bswitched on yet\b|\bexample climbers?\b|\bnot (wired|hooked) up\b/i;

const CALL = /\b(showToast|notify|toast|onToast|say)\s*\(/g;
const argAt = (s, from) => {
  let d = 1, i = from, q = null;
  for (; i < s.length && d > 0; i++) {
    const c = s[i];
    if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "(") d++; else if (c === ")") d--;
  }
  return d ? null : s.slice(from, i - 1);
};

const perFile = {};
let calls = 0;
let mainSrc = "";
for (const rel of APP) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (rel === "ClimbMatch.jsx") mainSrc = src;
  let m, n = 0;
  CALL.lastIndex = 0;
  while ((m = CALL.exec(src))) {
    const arg = argAt(src, m.index + m[0].length);
    if (arg === null || !arg.trim()) continue;
    n++;
    const hit = arg.match(PREVIEW_TALK);
    if (hit) {
      const line = src.slice(0, m.index).split("\n").length;
      fail(`${rel}:${line} tells the climber the app is a preview ("${hit[0]}"). Write the toast as the ` +
           `finished app would say it. Message: ${arg.replace(/\s+/g, " ").slice(0, 140)}`);
    }
  }
  perFile[rel] = n;
  calls += n;
}

// Fail closed: a traversal that found almost no toasts prints the same clean line as a clean app.
if ((perFile["ClimbMatch.jsx"] || 0) < 150 || calls < 200)
  dead(`read only ${calls} toast call(s) (${perFile["ClimbMatch.jsx"] || 0} in ClimbMatch.jsx). The app ` +
       `has ~290; either the toast function was renamed or the files could not be read.`);

console.log(`check:preview-claims — ${calls} toast call(s) across ${APP.length} file(s)\n`);
if (!failures) ok("no toast describes the app as a preview, a demo or a simulation");

const HEADING = "Climbers asking to join a group you moderate";
const CLAIMS_AN_OUTCOME = /\b(approv\w*|accept\w*)\b[^"]*\b(adds?|joins?|tells?|notif\w*)\b/i;
const hAt = mainSrc.indexOf(HEADING);
if (hAt < 0) fail(`ANCHOR LOST: the join-requests section heading is gone, so its claim went unchecked`);
else {
  const line = mainSrc.slice(hAt, mainSrc.indexOf('"', hAt + HEADING.length + 1) + 1);
  if (!CLAIMS_AN_OUTCOME.test(line)) ok("the join-requests section heading states what the section holds, and claims no outcome");
  else fail(`the join-requests section heading promises an outcome of approving, and the section ` +
            `lists BOTH real requests (which write) and seed ones (which do not), so one sentence ` +
            `cannot be true of both — say what the section holds: ${line.slice(0, 130)}`);
}

if (failures) {
  console.error(`\ncheck:preview-claims FAILED — ${failures} problem(s).\n`);
  process.exit(1);
}
console.log(`\nok — every toast reads as the finished app.\n`);

// Injection cases: scripts/oneoff/inject-preview-claim-cases.mjs
