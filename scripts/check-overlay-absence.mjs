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

/* lib/ COMPONENTS ARE FOLLOWED NOW, and the two CHECKED entries that used to stand in for this
   were excuses for a scope gap rather than reasons. `dashOpen` renders `<DbGuideDashboard/>` and
   `guideAppOpen` renders `<DbGuideApply/>`; both live in lib/, so the body lookup could not reach
   them, both landed in the ungated list, and both were answered by hand — bookkeeping that goes
   stale the moment either component changes.

   Measured before widening (scripts/oneoff/measure-lib-component-absence.mjs): across 14 lib
   components, 7 assert absence and every one of those claims is either gated on an error, filter
   copy that stays TRUE during an outage ("No areas match."), a fallback label, a statement about a
   row's own data, or a comment. So this adds coverage without adding findings — which is the
   result, not a disappointment. */
const libSrc = fs.readdirSync(path.join(ROOT, "lib"))
  .filter((f) => /\.jsx$/.test(f))
  .map((f) => maskComments(fs.readFileSync(path.join(ROOT, "lib", f), "utf8"), "lib/" + f, 1));

/* lib/ SPELLS ITS GATE DIFFERENTLY, and following these bodies without knowing that would report
   correctly-gated components as ungated — the guard-flags-correct-work failure, introduced by the
   very change meant to widen coverage. The app derives `xUnavailable` from a query's isError;
   lib components destructure the binding straight off the hook (`{ data, isError: inqError }`) and
   branch on that. Both are "this component can tell a read failed"; only the spelling differs.

   Detected on the FOLLOWED BODY, never on the window, and that scoping is the whole point: adding
   `isError` to the global FLAGS list would let any app-side window containing `.isError` read as
   gated, which would WEAKEN the detection this guard exists for. */
const LIB_ERR = /\bisError\b|\berror\s*:\s*\w+|\b\w+Error\b/;
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
function maskComments(src, label, minComments = 50) {
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
  catch (e) { console.error(`FAIL — could not parse ${label}: ${e.message}`); process.exit(1); }
  const cs = ast.comments || [];
  /* Fail closed. Zero comments in a 400kB file of this repo's prose density means the parse
     returned something unusable, and masking nothing would silently restore the v4 behaviour.
     The floor is a PARAMETER because it was calibrated for the two app files: a lib/ component is
     legitimately terse, and applying 50 to it would fail a correct file — the guard-flags-correct-
     work failure. A parse error is still fatal for every file, which is the real fail-closed test;
     the floor only adds a second opinion where the file is big enough for one to mean anything. */
  if (cs.length < minComments) { console.error(`FAIL — ${label} reported only ${cs.length} comments; a broken parse, not a terse file.`); process.exit(1); }
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

/* ATTRIBUTION BOUNDARY. A flag is credited to an overlay only if it appears BEFORE the next
   overlay's render site. The 3000-char window runs straight past the end of one overlay's JSX into
   the next one's, and this file's own closing note already named the symptom — "an overlay rendered
   NEXT TO others picks up their copy". It then fed that same contaminated `gated` field to two
   verdicts, and both failed in the direction that matters:

     - FOUR overlays (editDraft, dashOpen, guideAppOpen, calOpen) were credited with the INBOX's
       dmThreadsUnavailable/dmUnavailable, so they counted as gated and were dropped from the
       ungated list before anything examined them. A false pass, on the one question this guard asks.
     - logPickOpen was reported STALE against resumeLogsUnavailable, which belongs to the `resumeFor`
       overlay rendered next door — an instruction to delete a CHECKED entry that is CORRECT, after
       which a genuinely ungated overlay would have passed as gated.

   A stated limitation is a worklist, not a caveat: the note was right and was never acted on.

   The boundary must be a RENDER site (`name && <`, `name ? (`, `if (name) return`), never a bare
   `name &&`: the loose form also matches handlers and inline conditionals, and truncating at one of
   those cuts a real region short — measured, it severed the Inbox from its own component body. */
const RENDER_SITES = [];
for (const st of states) {
  const n = st.name.replace(/[$]/g, "\\$");
  const re = new RegExp("\\b" + n + "\\s*(?:&&|\\?)\\s*[<(]|if\\s*\\(\\s*" + n + "\\s*\\)\\s*return", "g");
  for (const m of app.matchAll(re)) RENDER_SITES.push({ at: m.index, name: st.name });
}
RENDER_SITES.sort((a, b) => a.at - b.at);
if (!RENDER_SITES.length) {
  console.error("FAIL — no overlay render site found anywhere; the boundary scan is broken, not the app.");
  console.error("Every overlay would then be scoped to its whole 3000-char window. Do not read this run.");
  process.exit(1);
}

const rows = [];
for (const st of states) {
  const n = st.name.replace(/[$]/g, "\\$");
  const re = new RegExp("\\b" + n + "\\s*(?:&&|\\?)|if\\s*\\(\\s*" + n + "\\s*\\)\\s*return", "g");
  re.lastIndex = st.at;
  const m = re.exec(app);
  if (!m) continue;
  /* The two scopings are deliberately ASYMMETRIC, and both err the same way — toward examining
     MORE. CLAIMS stay on the wide window, which over-reports and is documented below as an upper
     bound; GATING is scoped to the boundary, so an overlay can never be excused by a neighbour's
     flag. Narrowing the claims as well would be the other false pass: an overlay whose own copy
     sits past a nested render site would stop being reported at all. */
  const gather = (end) => {
    const win = app.slice(m.index, end);
    const comps = [...new Set([...win.matchAll(/<([A-Z][\w$]*)[\s/>]/g)].map((x) => x[1]))];
    let text = win;
    const followed = [], libGates = [];
    for (const c of comps) {
      let b = bodyOf(core, c) || bodyOf(app, c), fromLib = false;
      if (!b) for (const L of libSrc) { b = bodyOf(L, c); if (b) { fromLib = true; break; } }
      if (b && b.length > 200) {
        text += "\n" + b;
        followed.push(`${c}(${b.length})`);
        // A lib component that branches on its own read error IS gated, in lib's spelling.
        if (fromLib && LIB_ERR.test(b)) libGates.push(`${c}:error`);
      }
    }
    return { text, followed, libGates };
  };
  const nb = RENDER_SITES.find((b) => b.at > m.index && b.name !== st.name);
  const wide = gather(m.index + 3000);
  const own = gather(Math.min(m.index + 3000, nb ? nb.at : Infinity));

  const claims = [...new Set((wide.text.match(CLAIMS) || []).map((s) => s.trim()))];
  if (!claims.length) continue;
  rows.push({
    name: st.name, claims: claims.slice(0, 4), boundary: nb ? nb.name : null,
    gated: FLAGS.filter((f) => own.text.includes(f)).concat(own.libGates), followed: wide.followed.slice(0, 4),
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

  /* The two below were EXPOSED by the attribution fix — each had been counted as gated on the
     Inbox's flags and so was dropped before anything examined it. Read one at a time.

     dashOpen and guideAppOpen were here too, and are GONE: they render DbGuideDashboard and
     DbGuideApply from lib/, which the body lookup now follows, so the guard reads their real gate
     instead of taking my word for it. Both entries went stale the moment that landed, and this
     file's own stale test is what said so. A declaration that exists because a guard cannot see
     something is not a reason — it is an excuse with a shelf life. */
  calOpen: 'Calendar\'s "No events yet" is `!going.length && !up.length`, both derived from `events` — useState({}) in production (its seed is behind DEMO_FILLERS) and written only by four in-session functional setEvents calls. No read feeds it, so nothing can fail. `createdGroups` IS DB-hydrated and chooses which groups are iterated, but events[cl.id] is empty for every one of them regardless, and you cannot have created an event for a group that never loaded',
  editDraft: 'EditProfileScreen\'s "No certifications added yet" / "No skills added yet" describe `draft`, i.e. editDraft — a useState(null) seeded from ME when the climber taps Edit. certifications and skills are client-only: saveEdit\'s PATCH payload omits both, and nothing reads them back from profiles. A blank editor over an unread profile is a REAL defect, and it is a different one — check:profile-edit-gate owns it',
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
/* A STALE ENTRY FAILS, like every other registry in this repo. It used to print and exit 0, which
   made it advice nobody had to act on — and while the gating was window-contaminated that was just
   as well, because the one entry it accused (logPickOpen, against the `resumeFor` overlay's flag)
   was CORRECT and deleting it would have created a false pass. Now that a flag is only credited to
   the overlay it belongs to, the accusation means something and can be enforced. */
if (stale.length) {
  console.error(`STALE: ${stale.join(", ")} now name a flag of their OWN, so their CHECKED entry is`);
  console.error("describing code that has moved. Remove the entry — the flag now does that work.");
  console.error("If the flag belongs to a neighbouring overlay, the boundary scan is broken; fix");
  console.error("that instead, and do NOT delete a reason that is still true.\n");
  process.exitCode = 1;
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
if (vanished.length) {
  console.error(`\n  STALE (no longer assert absence at all — remove): ${vanished.join(", ")}`);
  process.exitCode = 1;
}

/* SCOPE — ASKED AND ANSWERED, and the note is replaced rather than left standing. It used to say
   this guard scanned ClimbMatch.jsx and ClimbMatchCore.jsx only, that an overlay rendering a lib/
   component had its gating invisible here, and that nothing had yet asked the same question of
   lib/. All three are now false: the body lookup follows lib/*.jsx, and lib's own spelling of a
   gate (a destructured `isError`/`xError` branch) is read off the followed body.

   The answer, measured across 14 lib components before the widening
   (scripts/oneoff/measure-lib-component-absence.mjs): 7 assert absence, and every one of those
   claims is gated on an error, filter copy that stays TRUE during an outage ("No areas match."),
   a fallback label, a statement about a row's own data, or a comment. A NEGATIVE RESULT — and it
   still bought something, because dashOpen and guideAppOpen stopped needing hand-written CHECKED
   entries and are now gated by measurement.

   A closed worklist item left in place reads as work; that mistake put a stale `OPEN:` line in
   front of the user twice in one day. Delete the note or replace it with the measurement. */
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
/* Count the rows that ARE gated, not "everything minus the unexamined". The old arithmetic folded
   the CHECKED rows into the gated total, so it printed "16 gated" above a list of three — and the
   two numbers being the same shape made the discrepancy easy to read past. A guard that misreports
   its own census teaches people to skim it. */
console.log(`\nGATED (${rows.filter((x) => x.gated.length).length}): `
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
  /* All three numbers come from one partition and sum to `rows.length`, so the line cannot claim
     more than it counted. `explained` is the CHECKED entries that ACTUALLY matched a row — not
     Object.keys(CHECKED).length, which counts bookkeeping rather than coverage. */
  console.log(`\nok — ${rows.length} overlay(s) assert absence: `
    + `${rows.filter((x) => x.gated.length).length} gated, ${checked.length} explained, 0 unexamined.`);
}
