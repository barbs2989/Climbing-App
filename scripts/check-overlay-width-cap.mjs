#!/usr/bin/env node
// Every opaque full-screen view must be drawn in the app's own 520px column.
//
// The app has NO responsive layout: one width media query in the whole codebase
// (prefers-reduced-motion) and zero :hover rules. It is a single 520px column, centred, declared
// in ClimbMatch.jsx's App root and mirrored by #cm-boot in index.html. But `position:fixed` is
// positioned against the VIEWPORT, not that column -- so an opaque full-screen view with no width
// cap stretches the whole window on a desktop while the app behind it is a 520px strip. 21 of
// them did, including Manage areas, Edit profile, Calendar, Messages and the guide screens.
//
//   npm run check:overlay-width-cap
//
// Three properties are required, and the third is the one that is easy to miss. `max-width` sizes
// the CONTENT box, and this app sets no global `* { box-sizing: border-box }` -- index.html's
// reset covers html/body/button only. So a capped view that also carries padding renders at
// 520 + padding*2. Measured in Chrome: DbGuideDashboard and DbGuideApply came back at 552px while
// a scan that checked only maxWidth+margin reported them as capped. Requiring box-sizing is what
// makes the static check agree with the rendered box.
//
// A GATE rather than a probe, because this fix changes only style PROPERTIES and no identifier:
// audit:silent-reverts tracks named definitions and says in its own closing caveat that "a merge
// that kept a name and dropped its guard clause is invisible here". A stale-base squash could put
// every one of these back to full-bleed with no name moved and every other guard green.
//
// Proven in a browser rather than argued: scripts/oneoff/probe-overlay-width-cap.mjs measures the
// rendered rect at 1440 and at 390 (14 measurements, 520px at left 460, 390px on a phone).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CAP = 520;

// lib/*.jsx is IN SCOPE, and leaving it out is how this was undercounted the first time round.
// CLAUDE.md's own "13 opaque full-screen views" is scoped to the three app files; lib/ holds nine
// more, several of them the loading and error states of screens whose wrapper lives in core.
// Capping a wrapper and not its loading state makes the screen jump width as the chunk lands.
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib"))
    .filter((x) => x.endsWith(".jsx")).map((x) => path.join("lib", x)));

// Full-bleed ON PURPOSE. A media surface takes the whole window in this app -- the photo
// lightboxes already do -- so the fire map is not a column. Each entry states its reason, and a
// STALE entry (one that no longer matches any full-screen view) FAILS: an exemption is a claim
// about the code, and this repo has had exemption lists rot into descriptions of code that is gone.
const EXEMPT = [
  {
    key: "fire-map",
    why: "the fire map is a MAP -- spatial content, full-bleed like the photo lightboxes",
    // Its zIndex is a variable (`zIndex: Z`), so there is no literal to key on: match the file.
    match: (style, file) => /FireMap\.jsx$/.test(file),
  },
  {
    key: "fire-map-fallback",
    why: "its Suspense fallback, which MUST match it or the screen jumps width as the chunk lands",
    match: (style) => /zIndex:3000/.test(style) && /alignItems:"center"/.test(style),
  },
];

// A style object is an opaque full-screen view when it is fixed, stretched to every edge, and
// painted with the app background. A SCRIM (rgba(...)) is deliberately not one: it is meant to
// cover the whole window, and its inner panel carries its own maxWidth.
function fullScreenViews(src, fixedSeen) {
  const out = [];
  const re = /style=\{\{/g; let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 2; const start = i;
    while (i < src.length && depth > 0) { const c = src[i]; if (c === "{") depth++; else if (c === "}") depth--; i++; }
    const style = src.slice(start, i - 2);
    if (!/position:\s*["']fixed["']/.test(style)) continue;   // lib/ writes styles with spaces
    fixedSeen.push(1);
    if (!/inset:\s*0/.test(style)) continue;
    if (!/background:\s*C\.bg\b/.test(style)) continue;
    out.push({ style, line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

let views = 0, anyFixed = 0;
const findings = [];
const usedExempt = new Set();

for (const f of FILES) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, f), "utf8"); }
  catch { console.error("check:overlay-width-cap: could not read " + f + " — nothing was analysed."); process.exit(1); }
  const fixedSeen = [];
  for (const v of fullScreenViews(src, fixedSeen)) {
    views++;
    const ex = EXEMPT.find((e) => e.match(v.style, f));
    if (ex) { usedExempt.add(ex.key); continue; }
    const missing = [];
    if (!new RegExp("maxWidth:\\s*" + CAP + "\\b").test(v.style)) missing.push("maxWidth:" + CAP);
    if (!/margin:\s*"0 auto"/.test(v.style)) missing.push('margin:"0 auto"');
    if (!/boxSizing:\s*"border-box"/.test(v.style)) missing.push('boxSizing:"border-box"');
    if (missing.length) findings.push({ f, line: v.line, missing, style: v.style.replace(/\s+/g, " ").slice(0, 96) });
  }
  anyFixed += fixedSeen.length;
}

// Fail CLOSED. "No view was uncapped" is also exactly what a scan that matched nothing prints,
// and this one matches on a style-object shape that a reformat could change wholesale.
// TWO floors, because ONE cannot see a PARTIAL break -- and a partial break is how a shape test
// actually dies. Injection-measured: reformatting ONE file's `style={{` to `style={ {` renders
// identically in React and is invisible to check:refs, and it drops that file's views silently.
// Reformatting ClimbMatchCore alone takes 23 -> 16 views and 81 -> 45 fixed objects, so both
// floors trip on it.
//
// 20 sits just under today's 23: tight enough that losing one big file trips it, loose enough
// that removing a view or two does not. It is a RATCHET -- if views are deliberately deleted
// below it, move the floor in the same commit and say why.
//
// RESIDUAL, stated rather than papered over: a file holding a SINGLE view (lib/DbGuides.jsx,
// lib/DbAreaBrowser.jsx) can be reformatted without tripping either floor. A per-file expectation
// would catch it and would be hand-maintained bookkeeping that rots, which this repo has been
// burned by more than once; the floors are the cheaper trade.
if (views < 20) {
  console.error(`check:overlay-width-cap: found only ${views} opaque full-screen view(s) — expected at least 20.`);
  console.error("The scan is broken, the style shape moved, or views were deleted. NOT a clean result.");
  process.exit(1);
}
if (anyFixed < 70) {
  console.error(`check:overlay-width-cap: matched only ${anyFixed} position:fixed style object(s) — expected at least 70.`);
  console.error("The style-object scan itself is broken (a `style={{` reformat does this silently). NOT a clean result.");
  process.exit(1);
}

const stale = EXEMPT.filter((e) => !usedExempt.has(e.key));
if (stale.length) {
  console.error("check:overlay-width-cap: STALE exemption(s) — they match no full-screen view any more:");
  for (const e of stale) console.error(`  ${e.key} — ${e.why}`);
  console.error("\nEither the view was removed (drop the entry) or it was renamed (re-point it).");
  console.error("An exemption nobody can trace is a claim about code that no longer exists.\n");
  process.exit(1);
}

if (findings.length) {
  console.error("\ncheck:overlay-width-cap: full-screen view(s) that ignore the app's 520px column\n");
  for (const x of findings) {
    console.error(`  ${x.f}:${x.line}  missing ${x.missing.join(", ")}`);
    console.error(`      ${x.style}`);
  }
  console.error("\nposition:fixed is positioned against the VIEWPORT, not the app column, so without");
  console.error("these a desktop window shows this view full-bleed while the app behind it is 520px.");
  console.error("All three matter: box-sizing is required because max-width sizes the CONTENT box and");
  console.error("this app has no global border-box, so a padded view renders at 520 + padding*2.\n");
  process.exit(1);
}

console.log(`check:overlay-width-cap: ok — ${views} opaque full-screen view(s), ` +
  `${views - usedExempt.size} drawn in the ${CAP}px column, ${usedExempt.size} exempt by design ` +
  `(${[...usedExempt].join(", ")}).`);
