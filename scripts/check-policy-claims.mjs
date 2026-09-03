// A LEGAL SURFACE MUST NOT CLAIM A CONTROL OR A CAPABILITY THE APP DOES NOT HAVE — and the
// version a reader SEES must be the version recorded against their account.
//
// #1522 rewrote Privacy §4 and §1 because between them they promised FOUR things the app cannot
// do: a location toggle that renders nowhere, "You control location sharing" when there is no
// control, "if you opt in — float plans and search-and-rescue" when a float plan carries the
// climber's CONTACT and never their position and the only SAR content is a phone directory, and
// (§1) "approximate or precise location when you enable it", the same absent enablement.
//
// WHY THIS IS A GATE RATHER THAN THE TWO PROBES IT REPLACES. That fix changes STRINGS and no
// identifier, so `audit:silent-reverts` is blind to it — it tracks named definitions, and says so
// in its own closing caveat. A stale-base squash could restore all four false claims to a legal
// document while every guard stayed green and no name moved. This is the exact argument
// check:verification-fallback and check:topo-outage-copy were promoted on.
//
// It supersedes scripts/oneoff/probe-privacy-location-onscreen.mjs and
// scripts/oneoff/probe-policy-promises-vs-live-controls.mjs, both of which ran nowhere.
//
// Static: one esbuild bundle and two SSR renders. Measured at 1.6s CPU against 1.69s for
// check:topo-outage-copy, which is already in the chain — so it is cheap enough to gate on.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { failed++; console.log("  FAIL  " + m); };
const dead = (m) => { console.error("\ncheck:policy-claims BROKEN: " + m + "\n(reporting nothing is not a pass.)"); process.exit(2); };

const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// ── 1. NO LEGAL SURFACE PROMISES A CONTROL THE APP WITHHOLDS ────────────────────────────────
// The durable half: it catches the NEXT instance, not just the one that was fixed.
console.log("--- a document must not describe a switch the app does not render ---");

const flagM = /const PRIVACY_CONTROLS_LIVE\s*=\s*(true|false)/.exec(core);
if (!flagM) dead("`const PRIVACY_CONTROLS_LIVE=` is not in ClimbMatchCore.jsx — ANCHOR LOST");
const live = flagM[1] === "true";

// Each `{PRIVACY_CONTROLS_LIVE?<...>:null}` block. Note `:null` — a false flag REMOVES the
// control rather than disabling it, so it is absent, not greyed out.
const gated = [];
/* THE BLOCK, NOT A CHARACTER WINDOW. This read `app.slice(i, i + 900)` and that number is a guess
   about the size of the thing being looked at — the trap this repo records for the camping panel,
   the Logbook badge and the seed-route discipline read. It is already too small here: measured on
   this tree, the "Show my real name publicly" switch sits 978 characters from its own gate, so if
   that control were gated the scan would not have found its label. The gated region is delimited
   by its own ternary, so it is balanced rather than guessed. Braces are counted over RAW source,
   the way check:overlay-discovery does it: the comment/string blanker desynchronises on JSX
   apostrophes, and every brace inside a style object is balanced anyway. */
const blockAt = (i) => {
  let d = 0;
  for (let k = i; k < app.length; k++) {
    if (app[k] === "{") d++;
    else if (app[k] === "}" && --d === 0) return app.slice(i, k + 1);
  }
  return null;
};
for (const m of app.matchAll(/\{PRIVACY_CONTROLS_LIVE\?/g)) {
  const w = blockAt(m.index);
  if (!w) dead("a PRIVACY_CONTROLS_LIVE block does not close — the brace walk ran off the end of the file");
  const label = /aria-label="([^"]+)"/.exec(w) || /letterSpacing:0\.3\}\}>([A-Z][A-Z ]{4,})</.exec(w);
  /* An unnameable gated control is a BROKEN SCAN, not an unnamed one, and it has to be fatal
     because of the OFFERED branch below: a control whose label is not found matches no entry, so
     the entry looks not-gated, is classified OFFERED, and its promise test is SKIPPED — a document
     promising a withheld control would stop being flagged, silently. */
  if (!label) dead("a PRIVACY_CONTROLS_LIVE-gated block has no aria-label, so it cannot be matched to a promise entry and would be read as OFFERED rather than withheld");
  gated.push(label[1]);
}
if (!gated.length) dead("no PRIVACY_CONTROLS_LIVE-gated block found in ClimbMatch.jsx — the scan is broken, and with no gated controls every comparison below passes vacuously");

// Lift the two shipped documents by balancing their array literal, skipping string contents so an
// apostrophe or a bracket inside the prose cannot end the walk early.
const lift = (anchor) => {
  const i = core.indexOf(anchor);
  if (i < 0) dead(`ANCHOR LOST: ${anchor}`);
  let d = 0, e = -1, inStr = null;
  for (let k = core.indexOf("[", i); k < core.length; k++) {
    const c = core[k];
    if (inStr) { if (c === "\\") k++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") d++; else if (c === "]" && --d === 0) { e = k + 1; break; }
  }
  if (e < 0) dead(`unbalanced literal for ${anchor}`);
  return core.slice(i, e);
};
/* The IN-APP PRIVACY SHEET is surface 3 of 4 and matters more than its lack of a policy label
   suggests: it opens from Settings AND from partner search -- the screen where a climber decides
   whether strangers can see them -- and it carries no review disclaimer and no version. It is an
   inline array in ClimbMatch.jsx rather than a named constant, so it is lifted from its first
   heading. Leaving it out was this guard's own stated limitation, and a stated limitation is a
   worklist rather than a caveat. */
const liftSheet = () => {
  const i = app.indexOf('[["What we store"');
  if (i < 0) dead("ANCHOR LOST: the in-app privacy sheet's first heading");
  let d = 0, inStr = null;
  for (let k = i; k < app.length; k++) {
    const c = app[k];
    if (inStr) { if (c === "\\") k++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") d++; else if (c === "]" && --d === 0) return app.slice(i, k + 1);
  }
  dead("unbalanced literal for the in-app privacy sheet");
};
const surfaces = [
  ["Terms of Service", lift("const TERMS=")],
  ["Privacy Policy", lift("const PRIVACY=")],
  ["In-app privacy sheet", liftSheet()],
];
if (surfaces.some(([, t]) => t.length < 1500)) dead("a legal surface lifted short — every promise test below would pass on text that is not there");

/* What a PROMISE looks like: the document telling the reader they HAVE a control. Deliberately
   narrow — "we use approximate location" is a statement about PROCESSING and is correct; "you
   control location sharing" is a claim about a switch. Matching the mere WORD would flag every
   honest sentence, the too-broad-needle trap this repo records throughout. */
/* `control` is the control's EXACT aria-label, and that is not fussiness. The first version of
   this table carried prose names and paired them to the app by fuzzy match -- and 2 of the 4
   entries never connected ("Show my online status" against the app's "Toggle online status",
   "Who can see my full profile" against "Who can see your profile"), so they could not fire
   whatever the documents said. Two dead branches reading as coverage, which is the exact failure
   this repo keeps finding in its own guards. An exact key plus the stale test below makes a
   rename fail LOUDLY instead of going quietly dead. */
const PROMISES = [
  { control: "Share approximate location only",
    re: /you control location sharing|approximate location only”? shares|"approximate location only" shares|location when you enable it/i },
  { control: "Who can see your profile",
    re: /governed by your privacy settings|the fields you choose to make visible|choose who can see your (?:full )?profile/i },
  /* RESTORED, and the note that removed it was wrong on a checkable fact. #1540 took this entry
     out saying "the Privacy §3 sentence promising it is now TRUE". There is no such sentence:
     #1536 had already closed F13 by AMENDING the document, so §3 now reads "your username, the
     profile you fill in, and the trust signals" and the Privacy Policy contains the phrase "real
     name" ZERO times. This entry's own regex matches neither document today — verified, not
     assumed. So it is inert rather than true, and deleting it cost the question instead of
     answering it: if the switch is ever gated again while a name-choice sentence exists, nothing
     would notice. It stays, and the OFFERED branch below is what lets it stay without failing. */
  { control: "Show my real name publicly",
    re: /your username or real name|choose(?:s)? (?:to show )?your real name/i },
  { control: "Toggle online status", re: /online status/i },
  { control: "Who can invite you to a crew", re: /who can invite you|crew invites? settings?/i },
];

/* A control leaves the gated set TWO ways and they need opposite treatment. The first version of
   this test failed on "not gated", so #1540 making "Show my real name publicly" real reported the
   entry as stale bookkeeping — and deleting the entry was the fix chosen. It is the wrong one:
   nothing then re-arms if the control is gated again.
     - GONE (no such aria-label anywhere): stale, and it fails. The entry can never fire again.
     - OFFERED (present, just not behind the flag): fine. Section 1 asks whether a document
       promises a control the app WITHHOLDS, so an offered control has no question to answer —
       and the entry survives, so re-gating re-arms it. */
const offered = PROMISES.filter((p) => !gated.includes(p.control) && app.includes(`aria-label="${p.control}"`)).map((p) => p.control);
const stale = PROMISES.filter((p) => !gated.includes(p.control) && !offered.includes(p.control));
if (stale.length) {
  dead(`${stale.length} promise entr(ies) name a control that is no longer gated, so they can never fire: ${stale.map((p) => `"${p.control}"`).join(", ")}. The app's gated labels are: ${gated.map((g) => `"${g}"`).join(", ")}. Re-key them, or drop the entry if the control is genuinely gone.`);
}

let promises = 0;
for (const [name, text] of surfaces) {
  for (const p of PROMISES) {
    const m = p.re.exec(text);
    if (!m) continue;
    if (live) continue;   // a control that RENDERS may of course be described
    if (offered.includes(p.control)) continue;   // ...and so may one taken out from behind the flag
    promises++;
    bad(`${name} describes "${p.control}", which the app renders as null: …${text.slice(Math.max(0, m.index - 70), m.index + m[0].length + 90).replace(/\s+/g, " ")}…`);
  }
}
if (!promises) ok(`none of the ${surfaces.length} surfaces promises any of the ${gated.length} controls behind the flag`);
if (offered.length) ok(`${offered.length} entr(ies) name a control the app now OFFERS, so no document can be promising a control it withholds: ${offered.map((c) => `"${c}"`).join(", ")}`);

/* The sheet also claimed a CAPABILITY rather than a control: "You can edit or clear anything from
   your profile and settings at any time." Measured false in two places -- `saveEdit` guards name
   and username with `if (d.x && d.x.trim())`, so a blank is skipped and the old value survives,
   and the avatar has a change control and deliberately no remove. Asserted as SOURCE rather than
   rendered, because this sheet is inline in App rather than in LegalView, and standing up App is
   far more than this question is worth. */
const sheet = surfaces[2][1];
if (/edit or clear anything/.test(sheet)) {
  bad(`the privacy sheet says "edit or clear anything", and name, username and the avatar cannot be cleared`);
} else if (!/can be changed but not left blank/.test(sheet)) {
  bad(`the privacy sheet's "Your control" no longer states which fields cannot be cleared — say what is true or the claim drifts back`);
} else {
  ok(`the sheet's "Your control" names the fields that cannot be cleared`);
}

// ── 2. WHAT §4 AND §1 SAY NOW, RENDERED ─────────────────────────────────────────────────────
// A populated constant is not a rendered one -- descent_text was populated on 1,021 routes and
// rendered on none -- so this reads the markup rather than the source.
console.log("\n--- the Location section describes processing, not a switch ---");

const out = path.join(ROOT, `.policy-claims-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--loader:.jsx=jsx",
    `--define:import.meta.env=${JSON.stringify({ VITE_USE_DB: "false" })}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  fs.rmSync(out, { force: true });
  dead("esbuild could not bundle ClimbMatchCore.jsx");
}
// createClient builds a RealtimeClient at construction and wants a WebSocket constructor: native
// on node 22, absent on 20, so an unstubbed guard passes in CI and dies on a contributor's box.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("guard: no realtime"); } };
}
const mod = await import(out + "?t=" + Date.now());
fs.rmSync(out, { force: true });
if (typeof mod.LegalView !== "function") dead("LegalView is not exported from ClimbMatchCore.jsx — ANCHOR LOST");

const html = renderToStaticMarkup(React.createElement(mod.LegalView, { kind: "privacy", onBack: () => {} }));
if (html.length < 2000) dead(`the Privacy screen rendered ${html.length} chars — too thin to assert on, and every "must NOT contain" test below would pass against it`);
// renderToStaticMarkup escapes; match the ESCAPED form. [[ssr-probes-must-match-escaped-html]]
const text = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ");

for (const [claim, why] of [
  ["home area you type in", "the profile field is typed text"],
  ["not a coordinate", "and explicitly not a coordinate"],
  ["We do not record where you are", "profiles carries no lat/lng column"],
  ["corners of the map you are then looking at are sent to us", "the map-bounds disclosure — the nearby query sends that box"],
  // climb_logs.gpx_track IS written and read back, so a flat "we store no location" would replace
  // one false claim with another. The exception has to stay stated.
  ["A GPS track is stored only when you attach one to a climb you log", "the one place location IS stored"],
  ["directory you call yourself", "search-and-rescue is a phone list, not an integration"],
  // §3, after #1535 gated the name switch away and left the policy describing it. pubName() gates
  // the display name and the friends list and crew roster do NOT go through it, so a connection
  // really does see the account name -- claiming otherwise would be a fresh false statement.
  ["Climbers you have connected with also see the name on your account", "§3 states where the account name IS shown, rather than claiming it is hidden"],
]) {
  if (text.includes(claim)) ok(why);
  else bad(`the rendered Privacy Policy no longer says: "${claim}"`);
}

console.log("\n--- and it must not have gone back to claiming what the app cannot do ---");
for (const [gone, why] of [
  ["Approximate location only", "no quoted toggle label"],
  ["You control location sharing", "no claim that the climber controls it"],
  ["search-and-rescue", "no search-and-rescue integration"],
  ["if you opt in", "no opt-in"],
  ["location when you enable it", "and §1 promises no enablement either"],
  ["your username or real name", "§3 does not offer a name choice that was gated away"],
  ["governed by your privacy settings", "§3 does not defer to profile-visibility settings the app withholds"],
]) {
  if (text.includes(gone)) bad(`the rendered Privacy Policy says "${gone}" again — a claim the app cannot support`);
  else ok(why);
}

// ── 3. THE VERSION A READER SEES IS THE VERSION RECORDED ────────────────────────────────────
// lib/policy.js states this property in a comment -- "the version a user sees and the version
// recorded against their account cannot drift" -- and NOTHING asserted it. A semantic invariant
// in a comment is the shape this repo keeps finding rotted.
console.log("\n--- shown and recorded cannot drift ---");
const { POLICY_VERSION, policyVersionLabel } = await import(path.join(ROOT, "lib/policy.js"));
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(POLICY_VERSION))) bad(`POLICY_VERSION is "${POLICY_VERSION}", not a date policyVersionLabel can render`);
else ok(`POLICY_VERSION is ${POLICY_VERSION}`);
const label = policyVersionLabel(POLICY_VERSION);
if (text.includes(label)) ok(`the screen shows "${label}", the version stamped on a profile at acceptance`);
else bad(`the Privacy Policy renders no "${label}" — a reader cannot see which version they are being asked to accept`);

console.log(failed
  ? `\ncheck:policy-claims FAILED — ${failed} problem(s).`
  : `\ncheck:policy-claims: ok — no legal surface claims a control or a capability the app lacks, and the version shown is the version recorded.`);
process.exit(failed ? 1 : 0);
