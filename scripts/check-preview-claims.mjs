#!/usr/bin/env node
// check:preview-claims — a control that changes only CLIENT STATE must not report a real outcome.
//
// Nine controls told a climber that another person had been invited, approved, kudos'd or nudged,
// or that an event was scheduled, while setting nothing but a useState. Every one of them is
// reachable today: the two group-request cards render on Crew > Requests because DEMO_FILLERS is
// on, and the other seven -- kudos, nudge, the two invite sheets, RSVP, event creation -- are
// ordinary controls on real groups and real crews that simply have no write behind them.
//
// WHY IT IS A GUARD RATHER THAN A NOTE. The repair changes STRINGS AND NO IDENTIFIER, which
// `audit:silent-reverts` says in its own closing caveat it cannot see: a stale-base squash would
// restore all nine claims with every existing gate green. `check:claims` and `check:writes` are
// both blind by construction -- they forbid a success message in front of a write that is
// session-gated or whose failure is unobservable, and BOTH PRESUME A WRITE EXISTS. A toast in
// front of no write at all passes both, which is the census-4 shape CLAUDE.md records for
// "Remove friend".
//
// WHAT IT ASSERTS, and the shape is chosen so a REWORD passes and a REVERT fails: each control is
// located by a distinctive fragment of its own handler -- not by its message -- and the toast
// inside that handler must carry the app's existing preview vocabulary. The wording is free; the
// admission is not.
//
// THE VOCABULARY IS READ FROM THE APP, never restated here. Seventeen other toasts already say
// this ("this preview doesn't send it to a moderator yet", "Kudos noted -- this preview doesn't
// deliver it to X", "this preview doesn't deliver invites to example climbers"), so a list written
// into this guard would be a second copy of a convention that already exists.
//
// WHAT IT DOES NOT CLAIM: that these features should stay unwritten. Each caveat is correct until
// the feature gains a write; when one does, remove its entry here in the same change -- a stale
// entry FAILS, so this cannot rot into a demand that a working feature apologise for itself.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "ClimbMatch.jsx";
let failures = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { failures++; console.log("  FAIL  " + m); };
const dead = (m) => { console.error("\ncheck:preview-claims BROKEN — " + m + "\nReporting nothing is not a pass."); process.exit(2); };

const src = fs.readFileSync(path.join(ROOT, FILE), "utf8");

// Anchors are fragments of the HANDLER, so rewording the message cannot make a control invisible.
// Each must occur exactly once: these files pack whole screens onto one physical line, and an
// anchor matching twice would silently check a control this guard was not aimed at.
const CONTROLS = [
  { what: "accepting a group invite",        anchor: 'rm();showToast("Joined "+cl.name' },
  { what: "approving a join request",        anchor: 'rm();showToast("Approved' },
  { what: "the group invite sheet",          anchor: 'o[cl.id]=cur.indexOf(c.id)>=0?cur:cur.concat([c.id]);return o;});showToast(' },
  { what: "the event invite sheet",          anchor: 'ne.invited=(e.invited||[]).indexOf(c.id)>=0?e.invited:(e.invited||[]).concat([c.id]);return ne;});return o;});showToast(' },
  { what: "RSVPing to an event",             anchor: 'toggle(true);showToast(' },
  { what: "cancelling an RSVP",              anchor: 'toggle(false);showToast(' },
  { what: "creating an event",               anchor: 'setOpenEvent({groupId:cid,id:seriesId});showToast(' },
  { what: "kudos from the friends feed",     anchor: 'onKudos={it=>showToast(' },
  { what: "nudging a crew member",           anchor: 'onNudge={(cid,nm,mid)=>{showToast(' },
];

// The convention, read from the app rather than restated. A control is honest if its message uses
// wording the app ALREADY uses elsewhere for exactly this.
const CAVEAT = /this preview|in this preview|on this device|simulated|isn’t live|isn't live|not saved/i;

// Fail closed: the vocabulary has to exist in the app, or every assertion below passes vacuously
// against a file that no longer says any of this.
const vocabUses = (src.match(/this preview/g) || []).length;
if (vocabUses < 8)
  dead(`the app uses "this preview" only ${vocabUses} time(s). Either the convention was removed — ` +
       `in which case this guard is asserting a convention that no longer exists — or the file could ` +
       `not be read.`);

console.log(`check:preview-claims — ${CONTROLS.length} client-only control(s); the app uses "this preview" ${vocabUses} times\n`);

for (const c of CONTROLS) {
  const n = src.split(c.anchor).length - 1;
  if (n === 0)
    { fail(`ANCHOR LOST for ${c.what}. Either the control was removed — drop this entry — or its ` +
           `handler was rewritten, in which case this entry stopped asking its question and the ` +
           `control is unchecked. Anchor: ${c.anchor.slice(0, 60)}`); continue; }
  if (n > 1)
    { fail(`the anchor for ${c.what} matches ${n} times, so this entry cannot say WHICH control it ` +
           `checked. Narrow it. Anchor: ${c.anchor.slice(0, 60)}`); continue; }

  // Read the showToast argument by balancing parens from the anchor, never a fixed window: a
  // character budget encodes a guess about the size of the thing being read, and on a line of
  // 20,000 characters that guess is wrong.
  const at = src.indexOf(c.anchor) + c.anchor.length;
  const from = src.lastIndexOf("showToast(", at) + "showToast(".length;
  let depth = 1, j = from;
  for (; j < src.length && depth; j++) {
    if (src[j] === "(") depth++;
    else if (src[j] === ")") depth--;
  }
  if (depth) { fail(`could not read the message for ${c.what} — its showToast( never closes`); continue; }
  const msg = src.slice(from, j - 1);

  if (CAVEAT.test(msg)) ok(`${c.what} says what the preview does not do`);
  else fail(`${c.what} reports a real outcome and this preview produces none. Its handler sets ` +
            `client state only — no write — so nobody is told and nothing survives a reload. Use the ` +
            `wording the app already uses seventeen times over ("this preview doesn’t …", "on this ` +
            `device"). Message: ${msg.slice(0, 110)}`);
}

// The section heading makes the same claim the toast did, and it is on screen the whole time rather
// than for 2.6 seconds — a moderator reads it BEFORE tapping Approve.
const HEADING = "Climbers asking to join a group you moderate";
const hAt = src.indexOf(HEADING);
if (hAt < 0) fail(`ANCHOR LOST: the join-requests section heading is gone, so its claim went unchecked`);
else {
  const line = src.slice(hAt, src.indexOf('"', hAt + HEADING.length + 1) + 1);
  if (CAVEAT.test(line)) ok("the join-requests section heading says approving is device-local");
  else fail(`the join-requests section heading promises approving adds them, which this preview ` +
            `does not do: ${line.slice(0, 130)}`);
}

if (failures) {
  console.error(`\ncheck:preview-claims FAILED — ${failures} control(s) claim more than the app does.\n`);
  process.exit(1);
}
console.log(`\nok — every client-only control says what this preview does not do.\n`);

// Injection cases: scripts/oneoff/inject-preview-claim-cases.mjs (4/4).
