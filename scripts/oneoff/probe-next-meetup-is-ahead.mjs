// Is the "next meetup" actually ahead of you?
//
// Both group surfaces took `events.sort(byDate)[0]` and called it "Next meet", with no test for
// whether it had happened -- so a group whose meetups are all behind it advertised its OLDEST one
// as upcoming. Observed on a CI ui-screens capture as "Next meet Jun 27" and "Next meet Jun 28",
// rendered on 4 September.
//
// EXECUTED, NOT RENDERED. Both call sites live inside `App`, which no SSR guard stands up -- the
// same reason `stateCatalogLine` and `topoEmptyCopy` are pure functions checked this way. So the
// BRANCHES are executed here and the WIRING is asserted as source beside them: a merge that keeps
// the helper and drops a call site restores the defect with every branch assertion still green,
// and that is exactly the half `audit:silent-reverts` says it cannot see.
//
// No browser, no database, no clock dependency beyond "today", which is the subject.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const out = path.join(ROOT, `.next-meetup-probe-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--loader:.jsx=jsx",
    `--define:import.meta.env=${JSON.stringify({})}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { fs.rmSync(out, { force: true }); dead("esbuild could not bundle ClimbMatchCore.jsx"); }
const core = await import(out + "?t=" + Date.now());
fs.rmSync(out, { force: true });

const { nextMeetup } = core;
if (typeof nextMeetup !== "function") dead("nextMeetup is not exported from ClimbMatchCore.jsx — ANCHOR LOST");

// Dates are built relative to today so the probe cannot rot into a fixture about 2026.
const iso = (offsetDays) => {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const ev = (id, offset) => ({ id, title: id, date: iso(offset) });

console.log("\n1. which event is offered as the next one\n");

const past = [ev("old", -70), ev("older", -120)];
if (nextMeetup(past) === null) ok("a group whose meetups are ALL behind it offers none — the historical defect");
else fail(`a past-only group still offered ${JSON.stringify(nextMeetup(past))}`);

const mixed = [ev("older", -120), ev("soon", 3), ev("later", 40), ev("old", -70)];
const m = nextMeetup(mixed);
if (m && m.id === "soon") ok("with past and future events it picks the SOONEST FUTURE one, not the earliest overall");
else fail(`expected "soon"; got ${m && m.id}`);

// The pre-fix expression, kept verbatim as the thing being ruled out. Without this the mixed case
// alone is satisfied by an implementation that happens to sort correctly and still shows the past.
const oldWay = (evs) => (evs || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1))[0];
if (oldWay(mixed).id === "older") ok("...and the OLD expression picks 'older' on the same input, so the case discriminates");
else fail("the old expression no longer reproduces the defect — this case proves nothing");

const today = [ev("tonight", 0), ev("nextweek", 7)];
const t = nextMeetup(today);
if (t && t.id === "tonight") ok("an event TODAY still counts as upcoming — a meet this evening has not gone");
else fail(`expected today's event to count; got ${t && t.id}`);

if (nextMeetup([]) === null && nextMeetup(null) === null && nextMeetup(undefined) === null)
  ok("no events, null and undefined all return null rather than throwing at a call site");
else fail("empty/null input did not return null");

if (nextMeetup([{ id: "nodate" }, ev("real", 5)]) ?.id === "real")
  ok("an event with no date is skipped rather than sorting unpredictably");
else fail("an undated event was not skipped");

console.log("\n2. the calendar matches its own heading\n");

// The THIRD copy of the same expression, and the one this probe found rather than I did: the
// group's "Calendar · upcoming events" listed EVERY event oldest-first.
const { groupEventsEmptyLine } = core;
if (typeof groupEventsEmptyLine !== "function") dead("groupEventsEmptyLine is not exported — ANCHOR LOST");

if (groupEventsEmptyLine(4, 2) === "")
  ok("with upcoming events there is no empty state at all");
else fail("an empty line was produced while upcoming events exist");

const held = groupEventsEmptyLine(4, 0);
if (/no upcoming/i.test(held) && !/first one/i.test(held))
  ok(`a group that HAS held meetups but has none ahead reads "${held}"`);
else fail(`a group with past-only events reads "${held}" — "the first one" is false of a group that has held four`);

const never = groupEventsEmptyLine(0, 0);
if (/first one/i.test(never))
  ok(`a group that has never held one still reads "${never}"`);
else fail(`expected the never-held copy; got "${never}"`);

if (held !== never) ok("...and the two states say different things, so the branch is not decorative");
else fail("both empty states produce the same sentence");

console.log("\n3. all three call sites still go through the helpers\n");

// Source, not render: a call site that stops calling the helper falls back to showing a past date
// and every assertion above still passes. That is the revert this probe exists to catch.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const calls = (app.match(/nextMeetup\(/g) || []).length;
if (calls === 2) ok("both meetup surfaces call nextMeetup( — the card and the detail button");
else fail(`expected 2 nextMeetup call sites in ClimbMatch.jsx, found ${calls}. A surface that stopped ` +
          `calling it shows a past date again, and every branch assertion above stays green.`);

// IMPORTED, not merely called. A merge kept both helpers and all three call sites and dropped
// this line -- the wiring half again, one level below the call sites, and every assertion above
// stayed green while the app would have blank-screened. check:refs caught it; this should not
// have needed it to.
const imported = /daysUntil,\s*nextMeetup,\s*groupEventsEmptyLine,/.test(app);
if (imported) ok("both helpers are imported into App, not just called");
else fail("App calls the helpers without importing them — this blank-screens the app at runtime, " +
          "and it is what a merge takes while leaving every call site in place");

const empties = (app.match(/groupEventsEmptyLine\(/g) || []).length;
if (empties === 1) ok("the calendar's empty state goes through groupEventsEmptyLine(");
else fail(`expected 1 groupEventsEmptyLine call site, found ${empties}`);

if (/var evs=_allEvs\.filter\(function\(e\)\{return e&&e\.date&&daysUntil\(e\.date\)>=0;\}\)/.test(app))
  ok("the calendar list is filtered to upcoming, which is what its heading claims");
else fail("the calendar is no longer filtered to upcoming — it lists past events under \"upcoming events\"");

// And the expression it replaced must not come back beside them.
const oldExpr = /\(events\[cl\.id\]\|\|\[\]\)\.slice\(\)\.sort\(/;
if (!oldExpr.test(app)) ok("the pre-fix sort-and-take-first expression is gone from both sites");
else fail("the old expression is back in ClimbMatch.jsx — one of the surfaces is picking the earliest event again");

// Fail closed: with no "Next meet" copy left there is nothing for any of this to be about.
const labels = (app.match(/Next meet/g) || []).length;
if (labels >= 2) ok(`the "Next meet" copy is still on both surfaces (${labels} occurrences)`);
else fail(`only ${labels} "Next meet" label(s) found — the surfaces moved, so this probe is no longer ` +
          `asking about what a climber reads. Re-anchor it rather than deleting the question.`);

console.log(bad ? `\nFAILED — ${bad}` : `\nok — the next meetup is ahead of you, and both surfaces ask the same helper.\n`);
process.exit(bad ? 1 : 0);
