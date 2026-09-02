// check:fire — the honesty invariants of the wildfire surfaces, enforced.
//
// Why this exists at all. The fire map (#714), its review fixes (#731) and the
// per-route panel (#758) were each verified by hand in a browser against live
// federal services, and every one of those runs was throwaway. What they proved is
// not the *rendering* — check:ui and check:zero cover that — it is a set of rules
// about what the screens are allowed to CLAIM. Those rules are invisible to every
// other guard in the repo, they were each broken at least once already, and a
// wildfire screen is the worst place in the app to quietly re-break them.
//
// The specific defects this locks down, all of them real and all of them shipped:
//
//   #714  `uDistMi` treated as a boolean, so every metric user was shown miles and
//         the km branch was unreachable. Nothing caught it: the prop IS read and IS
//         bound, so dead-props and refs both pass, and imperial is the default.
//   #714  `resultRecordCount` sent with no `orderByFields` while the UI said it was
//         "showing the largest" — the server returns an arbitrary OBJECTID slice, and
//         truncation is the NORMAL case on the default viewport.
//   #714  `onset` fetched and then dropped, so a Red Flag Warning starting tomorrow
//         rendered as current danger. 15 of 48 live products had a future onset.
//   #714  the perimeters query left at `where: "1=1"`, contradicting the prescribed-burn
//         exclusion two functions above it — dormant out of burn season.
//   #714  `Date.parse(z.ends || 0)` → the year 2000, so a product with no end time
//         outranked every real one and became the headline.
//   #758  near-miss: `placeholderData: prev => prev` on the per-ROUTE query, which
//         would print the previous route's fires under the current route's heading.
//
// Static on purpose. No browser, no dev server, and no calls to NIFC or NOAA — so it
// sits in `npm run build` with the other gates, cannot flake, and does not hammer a
// public federal service on every commit. What it cannot check (does the panel
// actually appear; do the numbers match reality) is what check:ui and a hand-run
// browser pass are for. This checks the rules, not the pixels.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCovered } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:fire";

// The fire surfaces. Named rather than walked, because this guard is about three
// specific files and a missing one must be fatal, not a quietly shorter list —
// the #547 failure mode that guard-sources.mjs exists to prevent.
const DATA = "lib/fire.js";
const MAP = "lib/FireMap.jsx";
const PANEL = "lib/FireNearRoute.jsx";
// RouteDetail.jsx is here for reachability only. Everything above can be perfect and
// mounted nowhere — the dead-UI class this repo has already shipped (descent_text was
// populated on 1,021 routes and rendered on none). Measured: neutering the mount left
// this guard green, because every other assertion is about the panel's own contents.
const HOST = "RouteDetail.jsx";
const FILES = [DATA, MAP, PANEL, HOST];

let fails = 0;
const fail = (msg) => { console.error("  FAIL  " + msg); fails++; };
const ok = (msg) => console.log("  ok    " + msg);

// Coverage first. An empty or short read makes every assertion below vacuous, and a
// vacuous pass on a safety surface is worse than no guard.
const abs = FILES.map((f) => path.join(ROOT, f));
const missing = FILES.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  console.error(`\n${GUARD} FAILED — the fire surface(s) ${missing.join(", ")} are missing.`);
  console.error("If they were renamed, update this guard; a guard cannot report green about");
  console.error("source it never read.\n");
  process.exit(1);
}
// `required` is compared as given while `files` is normalised to root-relative, so
// the required list must be relative too.
assertCovered(abs, ROOT, GUARD, FILES);
const raw = {};
for (const f of FILES) {
  raw[f] = fs.readFileSync(path.join(ROOT, f), "utf8");
  if (raw[f].length < 500) fail(`${f} is only ${raw[f].length} bytes — that cannot be the real file`);
}
ok(`read ${FILES.length} fire source(s), ${Object.values(raw).reduce((n, s) => n + s.length, 0)} bytes`);

// Blank comments and string/template CONTENTS in one stateful pass, offsets preserved,
// so line numbers stay true and prose that merely mentions a pattern cannot trip a
// code assertion. Deliberately not a regex — check:dead-flag-gates records that
// stripping comments by regex ate real code.
function blank(src) {
  const out = src.split("");
  const n = src.length;
  const wipe = (a, b) => { for (let k = a; k < b && k < n; k++) if (out[k] !== "\n") out[k] = " "; };
  let i = 0;
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
const code = {};
for (const f of FILES) code[f] = blank(raw[f]);

const lineOf = (f, idx) => raw[f].slice(0, idx).split("\n").length;

// Balanced-delimiter slice starting at the opener at `from`. Used to scope an
// assertion to one call's arguments or one function's body instead of the whole file,
// which is the difference between "this query is ordered" and "the word appears
// somewhere in this module".
function span(src, from, open = "(", close = ")") {
  let depth = 0, i = src.indexOf(open, from);
  if (i < 0) return "";
  for (let j = i; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close) { depth--; if (!depth) return src.slice(i, j + 1); }
  }
  return src.slice(i);
}

console.log("\n--- every capped query is ordered ---");
// A cap without an order is a silent lie: ArcGIS returns an arbitrary OBJECTID slice,
// and both UIs describe the retained rows as "the largest" / the nearest.
{
  // Calls only — `async function arcgis(...)` is the declaration and matches the same
  // pattern. The first draft flagged it as "a capped call with no order", which is the
  // guard being wrong rather than the code.
  const calls = [...code[DATA].matchAll(/\barcgis\s*\(/g)]
    .filter((m) => !/function\s+$/.test(code[DATA].slice(Math.max(0, m.index - 20), m.index)));
  if (!calls.length) fail(`${DATA}: no arcgis() calls found — the query layer has moved and this guard is blind`);
  else {
    let bad = 0;
    for (const m of calls) {
      const args = span(code[DATA], m.index);
      const capped = /\bCAP\.\w+|\b\d{2,}\s*\)\s*;?\s*$/.test(args) || /resultRecordCount/.test(code[DATA]);
      if (!capped) continue;
      if (!/orderByFields/.test(args)) {
        fail(`${DATA}:${lineOf(DATA, m.index)} an arcgis() call is capped but sends no orderByFields — the server picks arbitrarily while the UI says "the largest"`);
        bad++;
      }
    }
    if (!bad) ok(`all ${calls.length} arcgis() call(s) that are capped also order server-side`);
  }
  // resultRecordCount must actually be sent, or the cap is imaginary.
  if (!/resultRecordCount/.test(code[DATA])) fail(`${DATA}: no resultRecordCount — the caps in CAP are not applied to any request`);
  else ok("resultRecordCount is sent, so the caps are real");
}

console.log("\n--- a 200-with-error body is thrown, not returned ---");
// ArcGIS reports failure as HTTP 200 with an `error` key. Returning that as data is
// how "no fires nearby" gets rendered over a failed read.
{
  const f = code[DATA];
  if (!/body\s*&&\s*body\.error/.test(f) && !/body\.error/.test(f)) {
    fail(`${DATA}: nothing inspects body.error — an ArcGIS failure arrives as HTTP 200 and would be treated as an empty result`);
  } else {
    // Scoped to the SAME LINE, not a 200-character window. The window version passed
    // an injection that deleted this throw entirely, because the next statement's own
    // `throw` sat inside the window — the guard confirmed a throw existed, just not
    // this one. Fails closed if someone splits the statement across lines, and the
    // message says why.
    const at = f.indexOf("body.error");
    const lineStart = f.lastIndexOf("\n", at) + 1;
    let lineEnd = f.indexOf("\n", at); if (lineEnd < 0) lineEnd = f.length;
    const stmt = f.slice(lineStart, lineEnd);
    if (!/throw/.test(stmt)) fail(`${DATA}:${lineOf(DATA, at)} body.error is inspected but this line does not throw — an ArcGIS failure must not fall through as data (keep the throw on the same line as the test)`);
    else ok("an ArcGIS error body throws on the spot");
  }
  if (!/Array\.isArray\(body\.features\)/.test(f)) fail(`${DATA}: the response shape is not validated, so a changed payload would read as zero features`);
  else ok("a non-array features payload throws rather than reading as zero fires");
}

console.log("\n--- prescribed burns stay excluded on BOTH layers ---");
{
  if (/where:\s*["']1=1["']/.test(raw[DATA])) fail(`${DATA}: a query still uses where "1=1" — prescribed burns would draw as wildfires`);
  else ok('no query uses where "1=1"');
  const wf = (code[DATA].match(/IncidentTypeCategory='WF'/g) || []).length;
  // Points and perimeters both need it; the raw source carries the string, so count there.
  const wfRaw = (raw[DATA].match(/IncidentTypeCategory='WF'/g) || []).length;
  if (wfRaw < 2) fail(`${DATA}: IncidentTypeCategory='WF' appears ${wfRaw} time(s) — the points and the perimeters layer must BOTH filter it`);
  else ok(`both incident and perimeter queries filter to wildfires (${wfRaw} occurrences)`);
  void wf;
}

console.log("\n--- uDistMi is called, never truthiness-tested ---");
// It is a formatter function, so `uDistMi ? x+" mi" : x+" km"` is always truthy and
// pins every user to imperial. `uDistMi ? uDistMi(x) : fallback` is the legitimate
// presence check and is allowed.
for (const f of [MAP, PANEL]) {
  const hits = [...code[f].matchAll(/uDistMi\s*\?/g)].filter((m) => !/^\s*\?\s*uDistMi\s*\(/.test(code[f].slice(m.index + "uDistMi".length, m.index + 40)));
  if (hits.length) {
    for (const h of hits) fail(`${f}:${lineOf(f, h.index)} uDistMi is used as a boolean — it is a formatter, so this branch is always taken and metric users see "mi"`);
  } else if (!/uDistMi\s*\(/.test(code[f])) {
    fail(`${f}: uDistMi is never called — distances here are not unit-aware`);
  } else {
    ok(`${f}: uDistMi is called, not branched on`);
  }
}

console.log("\n--- the per-route query never carries the previous route's answer ---");
// placeholderData is correct for the map's viewport queries (it stops a pan blinking)
// and catastrophic for a per-route query, where the key IS the route's coordinate.
{
  const at = code[DATA].indexOf("useFiresNear");
  if (at < 0) fail(`${DATA}: useFiresNear is gone — the per-route panel has no query`);
  else {
    const body = span(code[DATA], code[DATA].indexOf("{", at), "{", "}");
    if (/placeholderData|keepPreviousData/.test(body)) {
      fail(`${DATA}:${lineOf(DATA, at)} useFiresNear carries placeholderData — switching routes would show the PREVIOUS route's fires under this route's heading`);
    } else ok("useFiresNear has no placeholderData, so a route switch cannot show stale fires");
  }
}

console.log("\n--- a future-onset product is not presented as current ---");
{
  if (!/export function zoneInEffect/.test(code[DATA])) fail(`${DATA}: zoneInEffect is gone — onset is no longer consulted, so a warning starting tomorrow reads as current danger`);
  else ok("zoneInEffect exists");
  if (!/\bstarts\s*:/.test(code[DATA])) fail(`${DATA}: fire-weather rows no longer carry an onset (\`starts\`), so in-effect cannot be distinguished from upcoming`);
  else ok("fire-weather rows carry their onset");
  // Scoped to the DRAWING effect, not the whole file. Mere presence passed an
  // injection that neutered the draw (`const live = true`) while leaving the
  // in-effect/upcoming split intact — so the banner still separated them and the map
  // drew a warning starting tomorrow exactly like one you are standing in.
  {
    const at = code[MAP].search(/grp\s*=\s*wxRef\.current/);
    if (at < 0) fail(`${MAP}: the fire-weather drawing effect is gone (no wxRef.current) — this guard can no longer see how zones are drawn`);
    else {
      const eff = code[MAP].slice(at, at + 1600);
      if (!/zoneInEffect\s*\(/.test(eff)) {
        fail(`${MAP}:${lineOf(MAP, at)} the fire-weather drawing effect does not call zoneInEffect — it would draw a product issued for LATER identically to one in effect now`);
      } else ok(`${MAP}: the drawing effect distinguishes in-effect from upcoming`);
    }
  }
  if (!/zoneInEffect\s*\(/.test(code[MAP])) fail(`${MAP}: zoneInEffect is never called`);
  else ok(`${MAP} calls zoneInEffect`);
  // The end-time sort fallback must not be 0: `Date.parse(x || 0)` stringifies null to
  // "0" and parses as the year 2000, so a product with no end time sorts first.
  const badSort = [...code[MAP].matchAll(/Date\.parse\(\s*\w+(?:\.\w+)*\s*\|\|\s*0\s*\)/g)];
  if (badSort.length) fail(`${MAP}:${lineOf(MAP, badSort[0].index)} Date.parse(x || 0) parses as the year 2000 — a product with no end time will outrank every real one`);
  else ok("no Date.parse(x || 0) fallback");
}

console.log("\n--- an empty result and a failed read cannot render alike ---");

// The PANEL answers this differently from the MAP since it became alert-only, and the
// difference is the point rather than an exemption. A map is a surface you OPENED to ask
// the question, so it owes you an answer and says "no active wildfires". The route panel
// is one section of a Safety tab you opened for other reasons, so on the ~all routes with
// nothing burning nearby it renders nothing at all.
//
// That silence is only honest while a failed read is LOUD. If the error branch were ever
// deleted, a dead federal service and a clean forecast would both render as an absent
// section — the precise "an empty result and a failed read render alike" defect this
// whole block exists to forbid, arrived at from the opposite direction. So the panel gets
// the same ordering rule, asserted against its `return null` instead of against a claim:
// the no-fires branch must return null, and must sit after both an error branch and a
// read of the query's .data.
{
  const s = raw[PANEL];
  const b = blank(s);
  const nullAt = b.search(/if\s*\(\s*!\s*fires\.length\s*\)\s*return\s+null\s*;/);
  const claim = s.match(/No active wildfire[^"'<]*/);
  if (claim) {
    fail(`${PANEL}:${lineOf(PANEL, s.indexOf(claim[0]))} the panel makes an affirmative "no wildfires" claim again — it is alert-only, so an empty result must render nothing`);
  } else if (nullAt < 0) {
    fail(`${PANEL}: the no-fires branch is not \`if (!fires.length) return null;\` — this guard cannot see how an empty result renders, so it cannot tell it apart from a failed read`);
  } else {
    ok(`${PANEL}: an empty result renders nothing (alert-only), not a "no wildfires" claim`);
    const errAt = b.search(/\.error\b/);
    const dataAt = b.search(/\.data\b/);
    if (!/not a report that nothing is burning/.test(s)) {
      fail(`${PANEL}: the error copy is gone — with no empty state left, a failed read would render an absent section exactly like a clean one`);
    } else if (errAt < 0 || errAt > nullAt) {
      fail(`${PANEL}:${lineOf(PANEL, nullAt)} the silent empty branch is not preceded by an error branch — a failed fetch would fall through to rendering nothing`);
    } else if (dataAt < 0 || dataAt > nullAt) {
      fail(`${PANEL}:${lineOf(PANEL, nullAt)} the silent empty branch is not preceded by a read of the query's .data — it cannot know the query settled`);
    } else {
      ok(`${PANEL}: the silent empty branch sits after both an error branch (line ${lineOf(PANEL, errAt)}) and a .data read (line ${lineOf(PANEL, dataAt)})`);
    }
    // The loading branch is load-bearing for the same reason, and it is also the anchor
    // check:bare matches to prove the panel is mounted on the Safety tab at all — under
    // renderToStaticMarkup no effect runs, so "checking" is the only thing it can ever see.
    if (!/Checking federal fire reports/.test(s)) {
      fail(`${PANEL}: the loading line is gone — an in-flight query would render as an absent section, and check:bare loses its only anchor for this panel`);
    } else ok(`${PANEL}: an in-flight query still renders its checking line`);
  }
}

for (const f of [MAP]) {
  const s = raw[f];
  // The affirmative "nothing is burning" claim...
  const claim = s.match(/No active wildfire[^"'<]*/);
  if (!claim) { fail(`${f}: the empty state copy is gone — check the claim is still gated, then update this guard`); continue; }
  // ...must be accompanied by an error branch that says the opposite explicitly.
  if (!/not a report that nothing is burning/.test(s)) {
    fail(`${f}: there is an empty state but no error copy denying it — a failed fetch would read as "nothing is burning"`);
  } else ok(`${f}: the empty state is paired with an explicit "this is not a report that nothing is burning"`);
  // And it must be reachable only once a query has actually returned. Checked by
  // ORDER, not proximity: the panel gates with early returns 40 lines above the claim,
  // so a "look at the preceding 600 characters" heuristic reported a real gate as
  // missing. What matters is that both an error branch and a `.data` read come BEFORE
  // the claim in source order — whether by early return or inline condition.
  const at = s.indexOf(claim[0]);
  const b = blank(s);
  const errAt = b.search(/\.error\b/);
  const dataAt = b.search(/\.data\b/);
  if (errAt < 0 || errAt > at) {
    fail(`${f}:${lineOf(f, at)} the empty state is not preceded by an error branch — a failed fetch would fall through to "no fires"`);
  } else if (dataAt < 0 || dataAt > at) {
    fail(`${f}:${lineOf(f, at)} the empty state is not preceded by a read of the query's .data — it cannot know the query settled`);
  } else ok(`${f}: the empty state sits after both an error branch (line ${lineOf(f, errAt)}) and a .data read (line ${lineOf(f, dataAt)})`);
}

console.log("\n--- the closure limitation is stated on every fire surface ---");
// There is no national closures API. Both surfaces must say so, because a quiet map
// or a quiet panel is what would otherwise imply an open trailhead.
for (const f of [MAP, PANEL]) {
  if (!/does not show closures/i.test(raw[f])) fail(`${f}: the closure caveat is missing — silence here implies the road is open`);
  else ok(`${f} states that it does not show closures`);
}
// And the per-route panel must say what its distances are measured to.
if (!/reported point of origin/i.test(raw[PANEL])) {
  fail(`${PANEL}: the origin-vs-edge caveat is missing — a 138,000-acre fire's edge can be far closer than its reported origin`);
} else ok(`${PANEL} says its distances are to the reported point of origin`);

console.log("\n--- unreported containment is never flattered ---");
{
  const at = code[DATA].indexOf("export function fireLevel");
  if (at < 0) fail(`${DATA}: fireLevel is gone — containment no longer drives severity`);
  else {
    const body = span(code[DATA], code[DATA].indexOf("{", at), "{", "}");
    // A null containment must fall through to "active", never to contained/partial.
    if (!/c\s*!=\s*null/.test(body)) fail(`${DATA}:${lineOf(DATA, at)} fireLevel does not distinguish an unreported containment from a real one`);
    else ok("fireLevel treats unreported containment as uncontained");
  }
  if (!/containment not reported/.test(raw[DATA])) fail(`${DATA}: a missing containment figure is no longer stated as missing`);
  else ok("a missing containment figure is stated, not printed as 0%");
  if (!/size not reported/.test(raw[DATA])) fail(`${DATA}: a missing acreage is no longer stated as missing`);
  else ok("a missing acreage is stated, not printed as 0");
}

console.log("\n--- the panel is actually reachable, on every route ---");
// #769 moved the panel to the Safety tab, which is the right home for a hazard. It briefly
// needed a complementary Overview mount, because `showSafety` was CONTENT-gated and a bare
// crag route — 99.5% of the catalog — was offered no Safety tab at all. #776 removed that
// gate instead: the Safety tab is now offered on every route, so there is ONE mount and the
// fallback is gone.
//
// That makes the tab gate itself load-bearing, and it is asserted here for that reason. If
// anyone re-gates "safety" in the tab strip, the panel does not merely move — it becomes
// unreachable for almost every route in the app, with no fallback left to catch it. That is
// #655's exact shape (the right content behind a tab those very routes never see), and it
// would otherwise be a one-token change in a filter expression nobody would connect to fires.
{
  // RAW, not blanked. The sub-tab branches are `tab==="safety"?` — the discriminator is
  // a STRING LITERAL, and the blanker wipes string contents, so in blanked source every
  // branch collapses to `tab===""` and they become indistinguishable. (First run failed
  // with "gone blind" for exactly that reason.) Requiring the `?` keeps prose from
  // matching, and RouteDetail's own comments about the Safety tab do not contain it.
  const h = raw[HOST];
  if (!/\bFireNearRoute\b/.test(h)) {
    fail(`${HOST}: FireNearRoute is never referenced — the per-route fire panel exists but is mounted nowhere`);
  } else {
    // The element is built once and rendered by name, so look for the rendered symbol
    // rather than the JSX tag.
    /* THE NEAREST PRECEDING IIFE, NOT THE FIRST ONE IN THE FILE. This was a lazy match from the
       first `const X = (function () {` to `<FireNearRoute`, so ANY IIFE-assigned const added
       earlier in a 480,000-character file silently became the symbol this guard hunts for. That
       happened: a `const _avyNote=(function(){…})()` in the avalanche panel made it look for
       `{_avyNote}` on the Safety tab and report the fire panel as unmounted — accusing correct
       code, which is the direction that teaches people to ignore a guard. Search backwards from
       the tag instead, so the binding found is the one that actually builds it. */
    /* The FIRST occurrence of the tag is inside a COMMENT that explains this very hazard, so
       anchoring on it looked backwards from the wrong place. Take the first occurrence that is
       not inside a block comment, then the nearest preceding IIFE binding — the one that actually
       builds the element rather than the first in a 480,000-character file. */
    const realTagAt = (() => {
      for (const m of h.matchAll(/<FireNearRoute/g)) {
        const open = h.lastIndexOf("/*", m.index), close = h.lastIndexOf("*/", m.index);
        if (open === -1 || close > open) return m.index;   // not inside a block comment
      }
      return -1;
    })();
    const before = realTagAt >= 0 ? h.slice(0, realTagAt) : "";
    const iifes = [...before.matchAll(/const\s+(\w+)\s*=\s*\(function\s*\(\)\s*\{/g)];
    const el = iifes.length ? iifes[iifes.length - 1][1] : null;
    const sym = el || "FireNearRoute";
    const safetyAt = h.search(/tab===["']safety["']\s*\?/);
    const overviewAt = h.search(/tab===["']overview["']\s*\?/);
    if (safetyAt < 0 || overviewAt < 0) {
      fail(`${HOST}: could not find both the safety and overview sub-tab branches — this reachability check has gone blind`);
    } else {
      // Scope each check to its own branch: from that branch to the start of the next one.
      const bounds = [safetyAt, overviewAt].sort((a, b) => a - b);
      const seg = (start) => h.slice(start, bounds.find(b => b > start) ?? Math.min(h.length, start + 30000));
      const inSafety = new RegExp("\\{\\s*" + sym + "\\s*\\}").test(seg(safetyAt));
      // Strip JSX comments before looking for a second mount: the Overview branch OPENS with a
      // `{/* … see fireEl above … */}` note explaining where the panel went, and a naive search
      // for the symbol would report that prose as a mount. Then match any single-brace expression
      // containing it, so a restored `{showSafety?null:fireEl}` is caught as well as a bare one.
      const ovSeg = seg(overviewAt).replace(/\{\s*\/\*[^]*?\*\/\s*\}/g, " ");
      const inOverview = new RegExp("\\{[^{}]*\\b" + sym + "\\b").test(ovSeg);

      if (!inSafety) fail(`${HOST}: the fire panel is not rendered on the Safety tab — that is its home (#769)`);
      else ok("the fire panel renders on the Safety tab");

      // One mount, not two. The old Overview fallback would now double-render the hazard box.
      if (inOverview) fail(`${HOST}: the fire panel is ALSO mounted on Overview — every route has a Safety tab now (#776), so this renders the hazard box twice`);
      else ok("the fire panel is mounted once, on Safety, with no leftover Overview copy");

      // And the tab that holds it is offered unconditionally. Scope this to the tab strip's own
      // filter callback — the word "safety" appears all over this file, so a file-wide search
      // would be satisfied by prose, and `showPlan` legitimately lives in the same expression.
      // Lazy `[^]*?`, not `[^\]]*`: every entry in that array ends with a `]` of its own, so a
      // negated-] class stops at the first one and the match never reaches the filter.
      //
      // The anchor deliberately does NOT require Safety to be the array's LAST entry. It used to
      // (`…["safety","Safety"]\s*\]\s*\.filter`), and reordering the strip to
      // Overview/Plan/Reports/Safety/Partners/Photos made this gate go blind — a presentation
      // change silently disabling a safety-reachability check is exactly the failure the "gone
      // blind" branch exists to prevent, so the anchor keys on the array's opener and its
      // `.filter(` instead, and Safety's PRESENCE is asserted separately below. Tab order is
      // free to change; the Safety tab existing and being ungated is not.
      const strip = h.match(/\[\s*\["overview","Overview"\][^]*?\]\s*\.filter\(([^)]*)\)/);
      if (!strip) {
        fail(`${HOST}: could not find the route sub-tab strip and its filter — this gate check has gone blind`);
      } else if (!/\["safety","Safety"\]/.test(strip[0])) {
        fail(`${HOST}: the Safety tab is no longer in the sub-tab strip at all — the fire panel's only mount is unreachable`);
      } else if (/safety/.test(strip[1])) {
        fail(`${HOST}: the Safety tab is gated again (${strip[1].trim().slice(0, 80)}) — the fire panel has no fallback since #776, so gating that tab makes it unreachable for the 99.5% of routes with no safety data of their own. #655's shape.`);
      } else {
        ok("the Safety tab is offered on every route, so the single mount is reachable everywhere");
      }
    }
  }
}

console.log("\n--- the offline path stays honest ---");
// main.jsx sets networkMode "always" globally, which is what turns an offline device
// into an error instead of React Query's paused no-data-no-error limbo. fire.js must
// not opt back out of it.
if (/networkMode\s*:\s*["']online["']/.test(code[DATA])) {
  fail(`${DATA}: networkMode "online" reintroduces paused queries — no data and no error, which every empty branch reads as "no fires"`);
} else ok('no query opts back into networkMode "online"');

console.log("");
if (fails) {
  console.error(`${GUARD}: ${fails} problem(s) — a wildfire surface is claiming something it cannot support.\n`);
  process.exit(1);
}
console.log(`${GUARD}: ok — the fire surfaces state what they know and admit what they do not.\n`);

// Injection-tested, 13/13 caught and each naming its own defect. Cases:
//   1.  lib/fire.js  — delete `orderByFields` from fetchActiveFires  → "capped but sends no orderByFields"
//   2.  lib/FireMap.jsx — `uDistMi(...)` → `uDistMi ? …" mi" : …" km"` → "used as a boolean"
//   3.  lib/fire.js  — add `placeholderData: p => p` to useFiresNear  → "carries placeholderData"
//   4.  lib/fire.js  — perimeters `where` back to "1=1"              → 'where "1=1"'
//   5.  lib/FireMap.jsx — `Date.parse(a.ends)||Infinity` → `Date.parse(a.ends||0)` → "year 2000"
//   6.  lib/fire.js  — swallow the throw after body.error            → "this line does not throw"
//   7.  lib/FireNearRoute.jsx — delete the closure caveat            → "closure caveat is missing"
//   8.  rename lib/fire.js                                           → coverage failure, not a pass
//   9.  lib/FireMap.jsx — `const live = zoneInEffect(z)` → `= true`  → "drawing effect does not call zoneInEffect"
//   10. lib/fire.js  — drop `c != null` from fireLevel               → "does not distinguish an unreported containment"
//
// TWO of those started as false passes, and both were scope mistakes rather than
// missing rules — worth knowing before widening anything here:
//   - Case 6 passed because the check looked for `throw` within 200 characters of
//     `body.error`, and the NEXT statement's throw sat inside that window. The guard
//     confirmed a throw existed, just not the one it was asking about. Now same-line.
//   - Case 9 passed because the check only asked whether `zoneInEffect` appeared in the
//     file. Neutering the DRAW while leaving the in-effect/upcoming split intact kept the
//     name present, so a warning starting tomorrow drew exactly like one in effect. Now
//     scoped to the drawing effect.
//   11. RouteDetail.jsx — drop `{fireEl}` from the safety branch    → "not rendered on the Safety tab"
//   12. RouteDetail.jsx — add a second `{fireEl}` on Overview       → "ALSO mounted on Overview"
//   13. RouteDetail.jsx — restore `{showSafety?null:fireEl}`        → "ALSO mounted on Overview"
//   14. RouteDetail.jsx — re-gate the strip, `x[0]==="safety"?!cragOnly:true`
//                                                                    → "the Safety tab is gated again"
//   15. RouteDetail.jsx — rename the strip's `["safety","Safety"]`  → "gone blind"
//   (12 and 13 must BOTH trip: the search strips JSX comments first — the Overview branch opens
//   with a note that mentions `fireEl` — and then matches any brace expression containing the
//   symbol, so a gated fallback is caught as well as a bare one. An earlier `\{\s*fireEl\s*\}`
//   form passed case 13. Case 15 exists because this gate check is the kind that fails OPEN: a
//   renamed tab strip makes the regex miss and every conclusion below it vacuous.)
//
// Both of the false passes above are the "injection logged, counter didn't move" shape:
// presence is not use, and proximity is not scope.
//
// Cases 11-13 exist because the first version of this guard had the SAME hole one level
// up: it asserted a great deal about the panel's contents and nothing about whether the
// panel was mounted. Measured, not assumed — neutering the mount left the guard green,
// which is the descent_text shape (populated on 1,021 routes, rendered on none). The
// reachability block reads RAW source, because the sub-tab discriminator is a string
// literal (`tab==="safety"`) and the blanker wipes string contents, collapsing every
// branch to `tab===""`.
