#!/usr/bin/env node
// check:float-plan-persistence — a float plan must not be thrown away when you look at another tab.
//
// FloatPlan holds eleven fields, and BOTH its render sites are conditional branches:
//
//   RouteDetail   {tab==="safety"?<div>...<FloatPlan/>...</div>:null}
//   SafetyTab     {view==="float"?<FloatPlan/>:<div>...}
//
// React discards the state of a branch it leaves, so tapping Plan to check the descent — the
// obvious thing to do while filling a float plan in — wiped route, partner, party size, vehicle,
// parking, depart, turnaround, hard return, comms, emergency contact and notes. The copy invites
// exactly that workflow: "File a float plan below before you lose cell service."
//
// The fix lifts `form`/`saved`/`checkedIn` into an OPTIONAL `plan`/`onPlan` pair owned by the
// caller, with the internal state kept as the fallback so an un-migrated site still renders.
//
// WHY THIS IS A GATE RATHER THAN THE PROBE IT WAS BORN AS, and the reason is the design of the
// fix itself: THE FALLBACK MAKES THE REGRESSION SILENT. Drop `plan={...}` from a call site and
// FloatPlan quietly reverts to its own state — the component still renders, every render
// assertion below still passes, and the form starts being lost again with nothing on screen and
// nothing in CI to say so. A prop that is optional BY DESIGN cannot be caught by its absence.
//   - `check:dead-props` asks whether a component reads a prop it declares, and whether a call
//     site passes one nothing reads. Both directions are satisfied here: the prop IS read, and
//     when it stops being passed there is simply no call site left to complain about.
//   - `audit:silent-reverts` tracks named DEFINITIONS. Removing `plan={floatPlan}` from a JSX tag
//     removes no name, so it reports 0 — the gap its own closing caveat states.
//   - No browser guard reaches it: the route Safety tab needs a route opened AND a sub-tab
//     clicked, and the crew one needs a crew with the Float Plan view selected.
//
// AND IT HAS ALREADY BEEN INCOMPLETE ONCE. #1577 lifted the route tab; the crew SafetyTab call
// site "never opted in" and kept losing the form until #1581 — two PRs, the same day, the second
// titled "still lost eleven fields". A fix whose second half was missed on the first attempt, on
// a SAFETY record, verified only by a script in scripts/oneoff/ that nothing runs.
//
// Static — esbuild + renderToStaticMarkup + a source read, ~0.9s against check:policy-claims'
// 1.6s beside it — so it sits in `npm run build`.
//
// Fails CLOSED, and each way prints identically to a clean tree: a thin controlled render (every
// "must contain" assertion passes against markup that rendered nothing), a missing <FloatPlan>
// tag at either call site, a declaration that cannot be read back, and fewer than EXPECTED
// assertions run — a guard that quietly stops asking half its questions still exits 0.
//
// Injection-tested; the cases are named at the bottom of scripts/oneoff/inject-float-plan-cases.mjs.
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; console.log("  FAIL  " + m); bad++; };

/* Every assertion below is "this string IS present" or "this prop IS passed", so a guard that
   stops RUNNING half of them prints a shorter, entirely green list and exits 0. The floor is the
   count today; raise it when you add an assertion, and never lower it to make a run pass. */
const EXPECTED = 19;

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
//
// COMMENTS ARE STRIPPED BEFORE THE TAG IS MATCHED, and this was ASYMMETRIC until an injection
// case caught it: section 8 stripped for the crew site (core carries three comments quoting
// `<FloatPlan/>` to explain the defect) while this one read RAW source. So a comment mentioning
// the tag ABOVE the real call site made the guard match the EXPLANATION and report a correctly
// wired app as broken — a guard failing on its own documentation, the trap check:ci-cancel
// records. RouteDetail happens to carry no such comment today; the case pins that it may.
const rdRaw = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const rd = rdRaw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
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
const bare = rd;   // already comment-stripped above
const gate = bare.indexOf('tab==="safety"');
const decl = bare.indexOf("const [floatPlan,setFloatPlan]");
if (decl >= 0 && gate >= 0 && decl < gate) ok("the state is declared ABOVE the tab===\"safety\" branch");
else fail("the float plan state is not declared above the branch that unmounts the form");

// ---- 8. THE SECOND CALL SITE. SafetyTab (the crew safety screen) has the same shape and is the
// WORSE of the two: "Team Alignment" and "Float Plan" are a two-button pair, so the control most
// likely to be tapped mid-fill is the one that clears the form. It is asserted HERE rather than in
// a second probe so the two call sites cannot drift — FloatPlan's internal fallback means a site
// that quietly stops opting in still renders perfectly.
const coreBare = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");

const crewTag = coreBare.match(/<FloatPlan\b[^>]*>/);
if (!crewTag) fail("ANCHOR LOST: SafetyTab no longer renders <FloatPlan …>");
else if (/\bplan=\{/.test(crewTag[0]) && /\bonPlan=\{/.test(crewTag[0]))
  ok("SafetyTab passes BOTH plan and onPlan");
else fail(`SafetyTab's call site does not pass plan/onPlan — the crew form is still lost: ${crewTag[0]}`);

const crewDecl = coreBare.indexOf("[floatPlan,setFloatPlan]");
const crewGate = coreBare.indexOf('view==="float"');
if (crewDecl >= 0 && crewGate >= 0 && crewDecl < crewGate)
  ok('the crew state is declared ABOVE the view==="float" branch');
else fail("the crew float plan state is not declared above the branch that unmounts the form");

// Both sites must seed from the SAME exported initialiser, or the eleven-key shape has two copies.
// SCOPED TO THE DECLARATION, not a file-wide count: `floatPlanState` also appears as its own
// definition and inside FloatPlan's fallback, so a >=2 threshold is still met after the crew site
// stops using it — injection case 2 MISSED on exactly that before this was tightened.
const crewSeed = coreBare.match(/\[floatPlan,setFloatPlan\]\s*=\s*useState\(([^;]{0,120})/);
if (!crewSeed) fail("could not read the crew declaration back");
else if (/floatPlanState\(/.test(crewSeed[1])) ok("the crew site seeds from floatPlanState()");
else fail(`the crew site does not seed from floatPlanState() — the eleven-key shape is duplicated: ${crewSeed[1].trim()}`);

// ---- 9. THE SAME DEFECT ONE SUB-TAB OVER: <Calculator/>.
// The planner's own inputs — fitness, pack weight, party size, departure — lived in local state
// inside a component rendered ~17k characters into the `tab==='planner'` branch. Tapping Safety to
// check the hazards unmounted it and reverted all four (pack 10kg, party 2, depart 06:00), so the
// climber came back to a DIFFERENT estimated summit time than the one they had just read, with
// nothing on screen saying it had changed. A lighter pack reads FASTER — the optimistic direction
// #641 records for the return tile.
//
// ONE OF THE FOUR WAS ALREADY LIFTABLE AND NOBODY HAD WIRED IT: `fit`/`setFit` props existed and
// the single call site passed neither, so `fitProp` was undefined and fitness fell back to local
// state like the rest. A lift nothing hands state to is not a lift, and its presence made the
// component LOOK migrated.
//
// SOURCE-ONLY, and that is the half that matters: `calc`/`onCalc` are optional by design, exactly
// like `plan`/`onPlan`, so dropping them at the call site makes Calculator revert to its own state
// silently — the component still renders and every render assertion still passes. That is the
// reasoning in this file's own header, applied to the second member of the class.
//
// THE GUARD'S NAME IS NOW NARROWER THAN ITS CONTENTS. The rename is deliberately not done in the
// same change — the precedent check:topo-outage-copy records.
const calcSite = rd.match(/<Calculator\b[^>]*>/);
if (!calcSite) fail("ANCHOR LOST: RouteDetail no longer renders <Calculator …> — the planner wiring is unchecked");
else {
  const tag = calcSite[0];
  if (/\bcalc=\{/.test(tag) && /\bonCalc=\{/.test(tag)) ok("RouteDetail passes BOTH calc and onCalc to <Calculator/>");
  else fail(`Calculator's call site does not pass calc/onCalc — the planner inputs will be lost again: ${tag}`);
}
if (/\[calcInputs,\s*setCalcInputs\]\s*=\s*useState\(/.test(rd))
  ok("the planner inputs are held by RouteDetail, outside the branch a sub-tab switch unmounts");
else fail("RouteDetail does not own the planner inputs — a sub-tab switch will discard them again");
if (!/const \[pack,setPack\]=useState\(/.test(rd))
  ok("...and Calculator keeps no second, local copy of them");
else fail("Calculator still declares its own pack/party/depart state — the lifted copy is shadowed");

if (ran < EXPECTED) {
  console.log(`  FAIL  only ${ran} of ${EXPECTED} assertions RAN — this guard reports presence, so a`);
  console.log("        shortened run is a broken scan printing a clean sweep, not a clean tree.");
  bad++;
}

console.log(bad ? `\n${bad} problem(s).` : `\ncheck:float-plan-persistence: ok — ${ran} assertions; a filed float plan survives leaving the tab.`);
process.exit(bad ? 1 : 0);
