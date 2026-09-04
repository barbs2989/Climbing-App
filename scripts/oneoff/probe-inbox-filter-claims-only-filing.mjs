#!/usr/bin/env node
// "WHO CAN MESSAGE YOU" COULD NOT DECIDE WHO CAN MESSAGE YOU.
//
// `msgFrom` picks which threads appear in `mainT` and which drop into the `reqT` "Message
// requests" list. NOTHING gates sending: the messages insert policy is `auth.uid() = sender_id`
// (0042) and no migration anywhere defines a msg_from column. So the label and two of the three
// options claimed a restriction on other people that the app cannot impose — and a climber
// picking "Friends & crew only" to stop strangers contacting them, in a partner-finding app, was
// materially misinformed about their own safety.
//
// THE THIRD OPTION'S OWN COPY ALREADY SAID SO: "Anyone else can still send a message — you just
// won't see it." Somebody knew; the label and the other two options never caught up. That
// sentence is the anchor this probe keys on, because it is the one piece of the control that was
// already true and must not be lost in the rewrite.
//
// REWORDED RATHER THAN GATED OR REMOVED. The feature is real and useful — it is inbox filing,
// and the Message requests list it promises genuinely exists (`reqT`). Only the framing was
// wrong. Compare the five neighbouring controls, which #1535 GATED because they could not reach
// anybody at all; this one does something, it just did not do what it said.
//
// SECOND INSTANCE OF A CLASS. `showOnRanks` is the same shape — `showOnRanks?[me]:[]` appends you
// to a leaderboard built client-side from seed CLIMBERS, under a label about what others see.
// Two is a class; a third wants a guard rather than another probe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

// ── 1. The premise, re-asserted rather than assumed: nothing enforces this server-side.
const migDir = path.join(ROOT, "supabase", "migrations");
const migs = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
if (migs.length < 100) fail(`only ${migs.length} migrations read — the scan broke, so the claim below is unproven`);
const enforced = migs.filter((f) => /msg_from|message_from|who_can_message/.test(fs.readFileSync(path.join(migDir, f), "utf8")));
if (enforced.length) fail(`a migration DOES define a message-permission column (${enforced.join(", ")}) — this control may now be real, and the copy should say so again`);
else ok(`no migration defines a message-permission column (${migs.length} read) — the control can only file, not refuse`);

// ── 2. The control is a FILTER in core, which is what the copy must describe.
if (/mainT=\(msgFrom==="everyone"\?dmThreads/.test(core)) ok("msgFrom selects which threads reach the inbox (mainT)");
else fail("ANCHOR LOST: msgFrom no longer drives mainT — re-read what this control does before trusting the copy assertions");
if (/reqT=msgFrom==="requests"\?dmThreads\.filter/.test(core)) ok("the Message requests list the middle option promises actually exists (reqT)");
else fail("ANCHOR LOST: reqT is gone — the middle option promises a list that no longer exists");

// ── 3. No surface may claim a restriction on OTHER PEOPLE'S ability to send.
const CLAIMS = [
  ['aria-label="Who can message you"', "the control's accessible name"],
  ["WHO CAN MESSAGE ME", "the section heading"],
  [">Anyone can message me<", "the everyone option"],
  ["Anyone on ClimbMatch can start a conversation with you.", "the everyone helper"],
  [">Approve requests from non-friends<", "the requests option — nothing is approved, they are filed"],
];
for (const [needle, what] of CLAIMS) {
  if (app.includes(needle)) fail(`${what} still claims control over who may SEND: ${JSON.stringify(needle)}`);
}
ok(`none of the ${CLAIMS.length} permission-framed strings survives`);

// ── 4. ...and it still describes the real thing, or the rewrite has removed a feature rather
//    than corrected it. A change that only ever DELETES claims is satisfied by saying nothing.
const KEEPS = [
  ["WHICH MESSAGES REACH MY INBOX", "the heading says what the control does"],
  ['aria-label="Which messages reach your inbox"', "the accessible name matches it"],
  ["Send non-friends to Message requests", "the middle option still names the list it files into"],
  ["Every message you receive lands in your inbox.", "the everyone helper describes filing"],
  // The one sentence that was already true. Losing it would be the worst outcome of this change.
  // STRAIGHT apostrophe: this string is an outlier in a file that mostly uses curly ones, and
  // keying on the wrong one failed this assertion against CORRECT copy. Same class as the
  // says-broken regex CLAUDE.md records — match the form the app actually renders.
  ["Anyone else can still send a message — you just won't see it.", "the friends helper still states the LIMIT of the control"],
];
for (const [needle, what] of KEEPS) {
  if (app.includes(needle)) ok(what);
  else fail(`${what} — missing: ${JSON.stringify(needle)}`);
}

// ── 5. All three options still exist. Rewording must not quietly drop one.
// Scoped to THIS select: `friends` is also an option of the profileVis control next door, so a
// file-wide count reported 4 of 3 and read as the rewrite having ADDED one.
const selStart = app.indexOf('aria-label="Which messages reach your inbox"');
const selEnd = app.indexOf("</select>", selStart);
const opts = selStart < 0 || selEnd < 0 ? -1 : (app.slice(selStart, selEnd).match(/<option key="(everyone|requests|friends)"/g) || []).length;
if (opts === 3) ok("all three options survive the rewrite");
else fail(`${opts} of 3 options found — the rewrite dropped one`);

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the inbox filter describes filing, and still says outright that it cannot stop anyone sending.");
