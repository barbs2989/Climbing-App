// Does every overlay that asserts ABSENCE either gate that claim on a failed read, or have a
// recorded reason why it cannot lie?
//
// PROMOTED FROM scripts/oneoff/ BECAUSE THE CLASS WAS CLOSED ONCE, BY SOMETHING NOTHING RUNS.
// Two overlays were shipped saying the wrong thing when a read failed -- the Inbox (#1276) and
// the friends list (#1287) -- and the remaining 9 were then read and explained. All of that is
// a snapshot: a NEW overlay with a DB-backed empty state would be caught only if somebody
// remembered to re-run a probe in a directory nothing executes. That is the same argument
// check:verification-fallback and check:outage-copy were promoted on, and this is the third
// instance of it.
//
// A WORKFLOW JOB, NOT A BUILD GATE, and the reason is measured rather than assumed. maskComments
// parses both 400kB JSX files with Babel because position is the whole question -- a regex
// comment-strip ate real code when this repo tried it -- and two parses of that size cost ~9s of
// the ~10.7s run. Profiling first blamed the char-level masking and bodyOf(), which together are
// under a second; that profile was measuring a REWRITE of maskComments rather than the one the
// guard calls, which is the fossil trap this repo records for probes that copy their subject.
// A build-chain guard is paid by every author on every build, so ~10s belongs in CI.
//
// It FAILS on an overlay that asserts absence, is ungated, and is not explained in CHECKED --
// see the block below. Printing it was not enough: the file already printed a NOT YET READ
// section and exited 0, so a new one would have scrolled past even if anybody had run it.
// point: every earlier version printed a SMALL, reassuring number and was blind.
//
//   v1  "1 of 53"  -- an overlay rendered `if(x)return <>...` has no `x&&`/`x?` marker, and the
//                     copy lives in the COMPONENT, not the region.
//   v2  "1 of 53"  -- brace-balancing FROM that early return meets `{_toastEl}` and closes at
//                     once, so the rendered component is never seen.
//   v3  "7 of 53"  -- better, and still missing the Inbox: `function Inbox({...})` has
//                     DESTRUCTURED PARAMS, whose braces open and close before the body, so the
//                     balancer returned 150 characters of parameter list. That is the exact trap
//                     memory records as "a guard scanned 13% of its subject and reported GREEN".
//
// Each was caught only by a fail-closed assertion that a KNOWN instance must appear. Without it
// the first number would have been reported as a finding.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { overlayStates } from "./lib/overlay-scaffold.mjs";
const traverse = _traverse.default || _traverse;

import { fileURLToPath } from "node:url";
// scripts/, not scripts/oneoff/ — one level up since the promotion.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRaw = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const coreRaw = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const CLAIMS = /no .{0,30}? yet|nothing here(?=\s*(?:yet\b|[.<—,)]|$))|none yet|no results|no custom lists|\bno(?: \w+){0,2} (?:climbs?|crews?|routes?|areas?|objectives?|friends?|groups?|invites?|lists?|reports?|catches|vouches|chats?|messages?|photos?)\b|\b0 (?:climb|crew|route|area|objective|logged|joined|friend|group|invite)/gi;
const app = maskComments(appRaw, "ClimbMatch.jsx");
const core = maskComments(coreRaw, "ClimbMatchCore.jsx");
const FLAGS = [...new Set([...(app + core).matchAll(/([A-Za-z_$][\w$]*Unavailable)/g)].map((m) => m[1]))];

/* COMMENTS ARE MASKED OUT OF THE SOURCE, so a claim written in prose cannot be reported as copy.
   v4 had that bug and it produced a whole phantom row: `feedbackOpen`'s only claim was the phrase
   "nothing here" inside a block comment in ClimbMatchCore.jsx explaining why reason formatting uses
   plain-text markers. Nothing renders it.

   NOT a regex strip. This repo has had one eat real code at a URL's `//`, and a hand-rolled scanner
   that tracks quotes to avoid that desynchronises on an apostrophe in JSX text (`don't`). Babel has
   neither failure mode: it reports exact comment RANGES, and masking those in place preserves every
   offset, so the window slice and bodyOf() below are unaffected.

   A GLOBAL "is this string rendered somewhere?" test was tried first and is WRONG: "nothing here"
   IS real copy elsewhere in the app, so the comment match passed anyway and the count did not move.
   Position is the whole question — masking answers it, set-membership cannot. */
function maskComments(src, label) {
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
  catch (e) { console.error(`FAIL — could not parse ${label}: ${e.message}`); process.exit(1); }
  const cs = ast.comments || [];
  /* Fail closed. Zero comments in a 400kB file of this repo's prose density means the parse
     returned something unusable, and masking nothing would silently restore the v4 behaviour. */
  if (cs.length < 50) { console.error(`FAIL — ${label} reported only ${cs.length} comments; a broken parse, not a terse file.`); process.exit(1); }
  const buf = src.split("");
  for (const c of cs) for (let i = c.start; i < c.end; i++) if (buf[i] !== "\n") buf[i] = " ";
  return buf.join("");
}

// Skip the PARAMETER LIST before balancing the body, or a destructured signature ends the walk
// before the body starts.
function bodyOf(src, name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(src);
  if (!m) return null;
  let k = m.index + m[0].length - 1, paren = 0;
  for (; k < src.length; k++) {
    if (src[k] === "(") paren++;
    else if (src[k] === ")") { paren--; if (paren === 0) { k++; break; } }
  }
  while (k < src.length && src[k] !== "{") k++;
  let depth = 0, started = false;
  for (let j = k; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") { depth++; started = true; }
    else if (ch === "}") { depth--; if (started && depth === 0) return src.slice(m.index, j + 1); }
  }
  return null;
}

const states = overlayStates(app, core);
const rows = [];
for (const st of states) {
  const n = st.name.replace(/[$]/g, "\\$");
  const re = new RegExp("\\b" + n + "\\s*(?:&&|\\?)|if\\s*\\(\\s*" + n + "\\s*\\)\\s*return", "g");
  re.lastIndex = st.at;
  const m = re.exec(app);
  if (!m) continue;
  const win = app.slice(m.index, m.index + 3000);
  const comps = [...new Set([...win.matchAll(/<([A-Z][\w$]*)[\s/>]/g)].map((x) => x[1]))];
  let text = win;
  const followed = [];
  for (const c of comps) {
    const b = bodyOf(core, c) || bodyOf(app, c);
    if (b && b.length > 200) { text += "\n" + b; followed.push(`${c}(${b.length})`); }
  }
  const claims = [...new Set((text.match(CLAIMS) || []).map((s) => s.trim()))];
  if (!claims.length) continue;
  rows.push({
    name: st.name, claims: claims.slice(0, 4),
    gated: FLAGS.filter((f) => text.includes(f)), followed: followed.slice(0, 4),
  });
}

// Fail closed on a KNOWN instance. Three versions of this measurement printed a small number and
// were blind; the only thing that caught each was this assertion.
if (!rows.some((r) => r.name === "inboxOpen")) {
  console.error("FAIL — the Inbox is absent and it demonstrably says \"No friend chats yet\".");
  console.error("The measurement is still blind. Do not read any number from this run.");
  process.exit(1);
}

/* UNGATED IS NOT THE SAME AS UNCHECKED, and leaving it undifferentiated is how a count gets
   re-derived from scratch every time somebody runs this. An overlay needs a flag only if a FAILED
   READ could produce the sentence; where the copy comes from seed constants, from client state, or
   from a filter the user just set, there is no read to fail and gating it would replace correct
   copy with an error — the mistake already made once on FriendsList's "No friends match".

   Each entry is a REASON, verified by reading the component, not a pass. A name here that starts
   naming a flag is stale bookkeeping and is reported as such below. */
const CHECKED = {
  areaTreeOpen: "AreaTree is gated on `selArea`, which is written only on the SEED catalog path — dead in production (VITE_USE_DB=true renders DbAreaBrowser)",
  logPickOpen: "LogRoutePicker filters the seed ROUTES/MOUNTAINS module constants; no DB read to fail",
  logCatchWith: 'the copy is "No climbs match." — a statement about the filter the user just typed, true during an outage',
  giveVouchWith: 'same "No climbs match." filter copy',
  quickLogFor: 'same "No climbs match." filter copy',
  profileModal: "FullProfile's vouches/objectives come from `climber.vouches` and `climber.objectiveIds`, which a DB-derived profile NEVER carries — empty always, not because of an outage",
  eventInvite: "renders FullProfile; same reason",
  crewListOpen: "\"no real organizer to respond yet\" is about OPEN_CREWS, the seed demo crews — no query behind it",
  legal: "LegalView is static copy; the certifications/skills/events lines come from GuideDashboard, which is seed-backed (DEMO_FILLERS)",
};

/* v5 — WHAT THE PREVIOUS NOTE HERE SAID IS NOW WRONG, AND THE CORRECTION IS THE POINT.
   It said the scanner read comments as copy, named `feedbackOpen` as the proof, and left the fix
   undone as a "known limitation". Two of those three claims were false:

   1. The fix is done — comments are masked by Babel RANGE above, offsets preserved.
   2. `feedbackOpen` was never a comment match. Masking removed three rows and it SURVIVED. Its
      claim is real rendered copy on ClimbMatch.jsx:693 — "nothing here is sent anywhere. Copy your
      note to keep it." — the feedback sheet's PRIVACY line. I had grepped only ClimbMatchCore.jsx
      and attributed it to a comment there; the incomplete grep produced a confident wrong reason.

   That exposed the bigger defect: `nothing here` matched sentences where it means NONE OF THIS
   CONTENT rather than YOU HAVE NO ITEMS. Terms says "Nothing here creates a partnership,
   employment, or agency relationship" — rendered legal copy, no masking removes it. The phrase now
   has to END a clause (`yet`, `.`, `<`, `—`, `,`, `)`, end), which keeps all three genuine uses
   ("Nothing here yet.", "Nothing here.", "Nothing here yet — find a route...") and drops both
   false ones.

   TOGETHER: 23 rows -> 16, and 15 ungated -> 9. SEVEN of the original rows were phantoms, and six
   of the CHECKED reasons written against them were removed as stale by this file's own test. A
   count is only as good as what it is a count OF. */

const ungatedAll = rows.filter((x) => !x.gated.length);
const stale = Object.keys(CHECKED).filter((n) => rows.some((r) => r.name === n && r.gated.length));
const ungated = ungatedAll.filter((r) => !CHECKED[r.name]);
const checked = ungatedAll.filter((r) => CHECKED[r.name]);
console.log(`${states.length} overlay states; ${rows.length} assert absence; ${ungatedAll.length} ungated — ${checked.length} of those CHECKED and explained, ${ungated.length} not yet read\n`);
if (stale.length) {
  console.log(`STALE: ${stale.join(", ")} now name a flag, so their CHECKED entry is describing code that has moved. Remove it.\n`);
}
console.log("CHECKED — ungated for a reason, verified by reading the component:");
for (const r of checked) {
  console.log(`  ${r.name.padEnd(20)} ${JSON.stringify(r.claims)}`);
  console.log(`  ${"".padEnd(20)} ${CHECKED[r.name]}`);
}
/* A CHECKED entry for an overlay that no longer asserts absence AT ALL is stale too, and the
   `stale` test above cannot see it — that one only fires when the name reappears WITH a flag.
   Masking comments removed two rows outright, which is exactly this case. */
const vanished = Object.keys(CHECKED).filter((n) => !rows.some((r) => r.name === n));
if (vanished.length) console.log(`\n  STALE (no longer assert absence at all — remove): ${vanished.join(", ")}`);
console.log("\nNOT YET READ — nothing reachable in that text names an xUnavailable flag:");
for (const r of ungated) {
  console.log(`  ${r.name.padEnd(20)} ${JSON.stringify(r.claims)}`);
  console.log(`  ${" ".repeat(20)} via ${r.followed.join(", ") || "(inline)"}`);
}
if (!ungated.length) console.log("  (none)");
console.log("\nREAD THE ATTRIBUTION, NOT THE COUNT. Components are collected from a 3000-char");
console.log("window after the render site, so an overlay rendered NEXT TO others picks up their");
console.log("copy as well as its own -- `dashOpen` listing Inbox is that, not a finding. The rows");
console.log("with ONE followed component are the clean ones. The count is an upper bound.");
console.log(`\nGATED (${rows.length - ungated.length}): `
  + (rows.filter((x) => x.gated.length).map((r) => `${r.name}[${r.gated.join(",")}]`).join(", ") || "(none)"));

/* THE VERDICT. An overlay that asserts absence, names no flag, and carries no recorded reason is
   either a live defect of the #1276/#1287 shape or an entry somebody owes CHECKED. Both want a
   human, so this exits 1 rather than printing into a log nobody opens -- which is exactly what
   this file did as a probe, and why the class could be closed once and quietly re-open.

   Read the ATTRIBUTION, not the count, before writing a CHECKED entry: components come from a
   3000-char window, so an overlay rendered beside others picks up their copy too. The rows naming
   ONE component are the clean ones. */
if (ungated.length) {
  console.error(`\ncheck:overlay-absence FAILED — ${ungated.length} overlay(s) assert absence with`);
  console.error("no flag and no recorded reason. Either gate the copy on the read that feeds it,");
  console.error("or add a CHECKED entry saying why that copy cannot be an outage lie (seed-backed,");
  console.error("filter text, or a field a DB-derived object never carries).");
  process.exitCode = 1;
} else {
  console.log(`\nok — ${rows.length} overlay(s) assert absence: ${rows.length - ungated.length} gated,`
    + ` ${Object.keys(CHECKED).length} explained, 0 unexamined.`);
}
