#!/usr/bin/env node
// check:seed-history — seed climbing history must never be attributed to a real account.
//
// `ticksFor(name)` scans ROUTES[].activity for `a.user === name`. That matches on a DISPLAY
// NAME, which belongs to neither id space, so it will hand one person's climbing history to
// anyone who happens to share their name. Eleven names author seed activity — Maya Chen (11
// rows), Alex Torres (8), Jordan Park (7), Riley Nguyen (5), Sam Rivera (5), and six with one
// each, including "Nathan Barber", the seed ME.
//
// Two real identities can collide with those names:
//
//   ME.            `ME.id` is NEVER reassigned — it is `0` signed in or out — while `ME.name`
//                  becomes the real account's profile name (`ME.name=profile.name||…`). So an
//                  id test alone cannot tell your demo self from your real one. Worse, the
//                  sign-in reset clears `ME.ticks`, and clearing it is exactly what makes
//                  Resume and TickList fall THROUGH to the name scan.
//   A DB friend.   `{id,name,avatar,…}` under a uuid. The friends list opens FullProfile with
//                  one (`onOpenProfile` → `setProfileModal(c)`). Partner-search rows for real
//                  profiles are inert on purpose, so they cannot — but the friends list can.
//
// Before the fix, signing in with a profile named "Nathan Barber" put **Angels Landing, Oct
// 2024, Summit, 5 stars** on your own résumé — a Zion hike the account never logged. It is not
// only cosmetic: three Leaderboards badges (classics_b, highpoints_b, peaks_b) COUNT these
// rows, and `me` is in the leaderboard pool whenever showOnRanks is set, so a name collision
// SCORES. That is the [[fabricated-activity-family]] lesson — check what the invented value
// gates, not just what it prints.
//
// This guard has two halves, and the STATIC half is the one that matters most: rendering can
// only prove the call sites that exist today, while the real regression is someone adding a
// twelfth `ticksFor(x.name)` next month.
//
// Effects do not run under renderToStaticMarkup — never assert on animated values here.

import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const { build } = require_("esbuild");

let fails = 0;
const fail = (msg) => { console.error("  FAIL " + msg); fails++; };
const ok = (msg) => console.log("  ok   " + msg);

// ---------------------------------------------------------------- static half
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

// Blank comments and string/template contents in ONE stateful pass, preserving offsets, so
// line numbers stay true and prose that merely MENTIONS a pattern cannot trip the scan.
// Deliberately not a regex: check:dead-flag-gates records that stripping comments by regex
// ate real code, because seed prose contains "//".
function blank(src) {
  const out = src.split("");
  let i = 0, n = src.length;
  const wipe = (a, b) => { for (let k = a; k < b && k < n; k++) if (out[k] !== "\n") out[k] = " "; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { let j = src.indexOf("\n", i); if (j < 0) j = n; wipe(i, j); i = j; }
    else if (c === "/" && d === "*") { let j = src.indexOf("*/", i + 2); j = j < 0 ? n : j + 2; wipe(i, j); i = j; }
    else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      wipe(i + 1, j); i = j + 1;
    } else i++;
  }
  return out.join("");
}

if (!/const seedHistoryFor\s*=/.test(core)) {
  fail("seedHistoryFor is gone from ClimbMatchCore.jsx — the name-attribution gate has been removed");
} else {
  ok("seedHistoryFor is present");
}

// Every reference to ticksFor: the declaration, and calls. Exactly one call is legitimate —
// the one inside seedHistoryFor. Anything else attributes seed history without the gate.
const calls = [];
const re = /(?<!function\s)\bticksFor\s*\(/g;
for (const m of re.exec ? [...core.matchAll(re)] : []) {
  const before = core.slice(Math.max(0, m.index - 120), m.index);
  const inGate = /const seedHistoryFor\s*=[^;]*$/.test(before);
  if (!inGate) calls.push({ index: m.index, ctx: core.slice(Math.max(0, m.index - 90), m.index + 40).replace(/\s+/g, " ") });
}
for (const f of ["ClimbMatch.jsx", "RouteDetail.jsx"]) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const m of s.matchAll(/\bticksFor\s*\(/g)) {
    calls.push({ file: f, ctx: s.slice(Math.max(0, m.index - 90), m.index + 40).replace(/\s+/g, " ") });
  }
}
if (calls.length) {
  fail(`ticksFor() is called ${calls.length} time(s) outside seedHistoryFor — each one can attribute seed climbs to a real account. Route it through seedHistoryFor(climberObject) instead:`);
  for (const c of calls) console.error(`         ${c.file || "ClimbMatchCore.jsx"}: …${c.ctx}…`);
} else {
  ok("ticksFor() has exactly one caller — seedHistoryFor");
}

// The mirror pattern: resolving a seed activity row's AUTHOR by display name. `a.user ===
// ME.name ? ME : …` can only be a false match once you are signed in, because seed activity
// never contains a real account's own entries — and it feeds trustOf() in buildConsensus and
// the start-location/topo weightings, where a signed-in ME's cleared trustScore:0 would
// silently re-weight a derived consensus. Must go through seedAuthor().
const authorHits = [];
for (const f of ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "RouteDetail.jsx"]) {
  const src = blank(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const m of src.matchAll(/===\s*ME\.name\s*\?\s*ME\b/g)) {
    authorHits.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
  }
}
if (!/export const seedAuthor\s*=/.test(core)) fail("seedAuthor is gone from ClimbMatchCore.jsx — seed activity authorship is no longer gated");
else ok("seedAuthor is present");
if (authorHits.length) {
  fail(`${authorHits.length} place(s) still resolve a seed activity author as "===ME.name?ME" — route them through seedAuthor(name): ${authorHits.join(", ")}`);
} else {
  ok("no place resolves a seed activity author by comparing against ME.name");
}

/* THIRD SHAPE: matching a connection against a seed activity AUTHOR by display name, without
   calling ticksFor and without writing `===ME.name`. Both tests above are blind to it, and it
   shipped on Home:

       _friendFeed = ROUTES.flatMap(...).filter(x => connections.some(c => c.name === x.a.user))

   `a.user` is a display name belonging to neither id space, so a DB-backed friend called
   "Maya Chen" was shown her 11 seed climbs as their recent activity — the #735 defect on a
   surface #735's guard could not see. Crew:Friends' FriendsFeed does the same job correctly,
   through seedHistoryFor(f).

   The rule is precise rather than a keyword sweep: a comparison whose two sides are a `.name`
   and a seed row's `.user` is ALWAYS an identity claim, so it must carry `seedIdentity`. Nothing
   else in this codebase compares those two fields, which is why this can be exact rather than
   heuristic. */
const nameVsUser = [];
for (const f of ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "RouteDetail.jsx"]) {
  const src = blank(fs.readFileSync(path.join(ROOT, f), "utf8"));
  // Either order: `c.name===x.a.user` or `x.a.user===c.name`.
  const RE = /(?:\w+(?:\.\w+)*\.name\s*===\s*\w+(?:\.\w+)*\.user|\w+(?:\.\w+)*\.user\s*===\s*\w+(?:\.\w+)*\.name)\b/g;
  for (const m of src.matchAll(RE)) {
    // The gate must be in the SAME expression, not merely somewhere in the file.
    if (/seedIdentity\s*\(/.test(src.slice(m.index, m.index + 90))) continue;
    nameVsUser.push(`${f}:${src.slice(0, m.index).split("\n").length}  ${m[0]}`);
  }
}
if (!/const seedIdentity\s*=/.test(core)) {
  fail("seedIdentity is gone from ClimbMatchCore.jsx — the shared identity gate no longer exists");
} else ok("seedIdentity is present");
if (nameVsUser.length) {
  fail(`${nameVsUser.length} place(s) match a connection to a seed activity author by NAME with no identity gate. Add seedIdentity(c) to the comparison, or route it through seedHistoryFor:`);
  for (const h of nameVsUser) console.error(`         ${h}`);
} else {
  ok("no place matches a seed activity author by name without seedIdentity");
}

// ---------------------------------------------------------------- render half
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resume, ME, __set_DB_UID } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const noop = () => {};
export function render(climber, uid) {
  __set_DB_UID(uid);
  return renderToStaticMarkup(
    React.createElement(Resume, {
      climber, logs: [], courses: null, extra: null, headline: "",
      onClose: noop, onConnect: noop, onMessage: noop, onAddCourse: noop,
      onRemoveCourse: noop, onVerifyCourse: noop, onAddExtra: noop,
      onShare: noop, onExport: noop, onHeadline: noop,
      editable: false, fstate: "none", routeById: () => null,
    }));
}
export { ME };
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-seedhist-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, ME } = await import("file://" + out);

const UID = "11111111-2222-3333-4444-555555555555";
// The seed row authored by "Nathan Barber" hangs off this route. If the seed data is ever
// re-cut, this anchor must be updated rather than quietly matching nothing — so assert the
// demo case FIRST and treat its absence as a lost anchor, not a pass.
const MARK = "Angels Landing";
const meNamed = (name) => Object.assign({}, ME, { id: 0, name, ticks: undefined });

const demo = render(meNamed("Nathan Barber"), null);
if (!demo.includes(MARK)) {
  fail(`ANCHOR LOST — the demo résumé no longer shows ${JSON.stringify(MARK)}, so the checks below prove nothing. Re-point MARK at a route with seed activity.`);
} else {
  ok(`demo (signed out) still shows ${JSON.stringify(MARK)} — anchor intact, demo unchanged`);

  const signedIn = render(meNamed("Nathan Barber"), UID);
  if (signedIn.includes(MARK)) fail(`a REAL account named "Nathan Barber" is shown ${JSON.stringify(MARK)} on its own résumé — a climb it never logged`);
  else ok("a real signed-in account gets none of the seed climbs that share its name");

  const friend = { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Maya Chen" };
  const fh = render(friend, UID);
  if (/Tingey|Schoolroom|Mexican Crack|Angels Landing/.test(fh)) fail("a DB-backed friend named 'Maya Chen' inherits the seed Maya Chen's climbs");
  else ok("a DB-backed friend inherits none of the seed climbs that share their name");

  // Compared against a name with NO seed activity rather than a fixed length: this stays true
  // if the résumé chrome changes, and it still fails if the gate starts rejecting seed people.
  const seed = render({ id: 1, name: "Maya Chen" }, null);
  const nobody = render({ id: 1, name: "Zzz Nobody" }, null);
  if (seed.length <= nobody.length) fail("a SEED climber's résumé renders no more than a climber with no seed activity at all — the gate is too aggressive and has broken the demo");
  else ok("a seed climber (numeric id, no session) keeps their history");
}

console.log(fails
  ? `\ncheck:seed-history: ${fails} failure(s)`
  : "\ncheck:seed-history: ok — seed climbing history is only ever attributed to seed identities.");
process.exit(fails ? 1 : 0);

// Injection-tested 2026-08-09. Each of these must FAIL the run:
//   1. revert seedHistoryFor to `c=>ticksFor(c.name)`      -> the signed-in and DB-friend cases
//   2. add `ticksFor(climber.name)` anywhere in a component -> the static call-site count
//   3. drop the `c.id!==0||!DB_UID` clause                  -> the signed-in ME case only
//   4. gate on `!c.id` instead of the numeric/uid test      -> the seed-climber case (0 is a real id)
//   5. re-point MARK at a route with no seed activity       -> ANCHOR LOST, not a silent pass
//   6. restore one `a.user===ME.name?ME:CLIMBERS.find(…)`   -> the author scan, naming file:line
//   7. remove seedAuthor from ClimbMatchCore                -> the seedAuthor presence check
//
// Case 4 is the one that shaped the render half: gating on `!c.id` looks equivalent and
// silently empties EVERY seed climber, and a fixed length threshold would not have caught it
// because the résumé chrome renders either way — hence the comparative assertion.
