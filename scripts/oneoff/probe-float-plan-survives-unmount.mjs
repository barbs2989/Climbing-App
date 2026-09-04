#!/usr/bin/env node
// A float plan must not be thrown away when you look at another tab.
//
// FloatPlan held all eleven fields in its own useState, and BOTH its render sites are
// conditional branches:
//
//   RouteDetail   {tab==="safety"?<div>…<FloatPlan/>…</div>:null}
//   SafetyTab     {view==="float"?<FloatPlan/>:<div>…}
//
// React discards the state of a branch it leaves, so tapping Plan to check the descent — the
// obvious thing to do while filling a float plan in — wiped route, partner, party size, vehicle,
// parking, depart, turnaround, hard return, comms, emergency contact and notes. The copy invites
// exactly that workflow: "File a float plan below before you lose cell service."
//
// The fix lifts `form`/`saved`/`checkedIn` into an OPTIONAL `plan`/`onPlan` pair owned by
// RouteDetail, with the internal state kept as the fallback so SafetyTab is untouched.
//
// TWO HALVES, AND THE SECOND IS THE ONE A MERGE TAKES. Rendering proves the controlled path
// works; it CANNOT prove RouteDetail still passes the props, because dropping them makes
// FloatPlan fall back to its own state and every render assertion still passes — the app quietly
// returns to losing the form. So the wiring is asserted as SOURCE, the way
// check:topo-outage-copy does for its prop chain.
//
//   node scripts/oneoff/probe-float-plan-survives-unmount.mjs

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
import { FloatPlan, floatPlanState } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export function render(props) {
  return renderToStaticMarkup(React.createElement(FloatPlan, props || {}));
}
export { floatPlanState };
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-fp-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, floatPlanState } = require_(out);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// ---- 1. The shape is declared in ONE place.
const init = floatPlanState({ route: "North Ridge" });
const FIELDS = ["route", "partner", "party", "vehicle", "lot", "depart", "turn", "ret", "comms", "contact", "notes"];
const missing = FIELDS.filter((k) => !(k in (init.form || {})));
if (!missing.length) ok(`floatPlanState() declares all ${FIELDS.length} fields`);
else fail(`floatPlanState() is missing ${missing.join(", ")}`);
if (init.form.route === "North Ridge") ok("and it still applies `defaults`");
else fail("floatPlanState() dropped the defaults");
if (init.saved === false && init.checkedIn === false) ok("saved/checkedIn start false");
else fail("saved/checkedIn do not start false");

// ---- 2. THE CONTROLLED PATH: a plan handed in must render into the inputs. This is the state
// that used to be destroyed; if it does not reach the markup the lift has done nothing.
const TYPED = {
  form: { route: "North Ridge", partner: "Robin Belay", party: "2", vehicle: "grey Tacoma",
          lot: "Heliotrope Ridge TH", depart: "04:30", turn: "13:00", ret: "21:00",
          comms: "InReach, check in at the col", contact: "Sam 555-0100", notes: "crevasse rescue kit" },
  saved: false, checkedIn: false,
};
const controlled = render({ plan: TYPED, onPlan() {} });
if (controlled.length < 1200) fail(`the controlled render is only ${controlled.length} chars — nothing below is meaningful`);
else ok(`rendered (${controlled.length} chars)`);

const lost = Object.entries(TYPED.form).filter(([, v]) => !controlled.includes(v));
if (!lost.length) ok(`all ${FIELDS.length} handed-in values reach the form`);
else fail(`${lost.length} value(s) never reached the form: ${lost.map(([k]) => k).join(", ")}`);

// ---- 3. `saved` is read from the lifted state too, not from a dead local. Losing it re-presents
// a filled plan as unsaved.
const savedR = render({ plan: Object.assign({}, TYPED, { saved: true }), onPlan() {} });
if (/Float plan ready to send/.test(savedR)) ok("a lifted `saved` still opens the ready-to-send panel");
else fail("`saved` no longer reaches the ready-to-send panel");
if (!/Float plan ready to send/.test(controlled)) ok("...and an unsaved plan does not show it");
else fail("the ready-to-send panel shows on an UNSAVED plan");

// ---- 4. `checkedIn` likewise: losing it re-presents a party that has checked in as overdue.
const inR = render({ plan: Object.assign({}, TYPED, { saved: true, checkedIn: true }), onPlan() {} });
if (/Checked In Safe/.test(inR)) ok("a lifted `checkedIn` still shows as checked in");
else fail("`checkedIn` no longer reaches the panel");

// ---- 5. THE UNCONTROLLED PATH MUST STILL WORK, or this breaks SafetyTab, the other call site.
const uncontrolled = render({ defaults: { route: "West Ridge" } });
if (uncontrolled.length > 1200 && uncontrolled.includes("West Ridge"))
  ok("with no plan prop it falls back to its own state (SafetyTab is untouched)");
else fail("the uncontrolled path is broken — SafetyTab would render nothing usable");
if (!/Float plan ready to send/.test(uncontrolled)) ok("...and starts unsaved");
else fail("the uncontrolled path starts already saved");

// ---- 6. THE WIRING, AS SOURCE. A merge that keeps the component and drops the props at the call
// site is silent: FloatPlan falls back, every assertion above still passes, and the form is lost
// again. Nothing else in the repo can see that.
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const site = rd.match(/<FloatPlan\b[^>]*>/);
if (!site) fail("ANCHOR LOST: RouteDetail no longer renders <FloatPlan …> — nothing above is wired");
else {
  const tag = site[0];
  if (/\bplan=\{/.test(tag) && /\bonPlan=\{/.test(tag)) ok("RouteDetail passes BOTH plan and onPlan");
  else fail(`RouteDetail's call site does not pass plan/onPlan — the form will be lost again: ${tag}`);
}
if (/floatPlanState\(/.test(rd)) ok("RouteDetail seeds it from floatPlanState(), not a second copy of the shape");
else fail("RouteDetail does not use floatPlanState() — the field list is duplicated and will drift");

// ---- 7. And the state must be owned ABOVE the conditional branch, or lifting it changes nothing.
// COMMENTS ARE STRIPPED FIRST, and that is not caution: the fix's own comment quotes the gate
// verbatim (`{tab==="safety"?<div>...</div>:null}`) to explain itself, so a raw search finds the
// EXPLANATION before the code and the probe fails on its own documentation — caught by this
// assertion going red on a correct tree. Same trap check:ci-cancel records from the other side.
const bare = rd.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const gate = bare.indexOf('tab==="safety"');
const decl = bare.indexOf("const [floatPlan,setFloatPlan]");
if (decl >= 0 && gate >= 0 && decl < gate) ok("the state is declared ABOVE the tab===\"safety\" branch");
else fail("the float plan state is not declared above the branch that unmounts the form");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
