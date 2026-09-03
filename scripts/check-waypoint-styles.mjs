#!/usr/bin/env node
// check:wp-styles — can the app DRAW every kind of waypoint it recognises, and does every
// style lookup go through the normaliser?
//
// Two maps in ClimbMatchCore.jsx describe waypoint types and they are maintained separately:
//
//   WP_TYPE_MAP  ~30 raw spellings -> a canonical type      ("lake" -> "Water")
//   WP_STYLE     a canonical type  -> {color, glyph}        ("Water" -> blue "≈")
//
// Nothing tied them together, and they drifted. WP_TYPE_MAP emitted five canonical types --
// Base, Crag, Pass, Approach, Landmark -- that WP_STYLE had no entry for, so all five fell
// through `wpGlyph`'s `||"📍"` fallback and rendered as ONE identical grey emoji pin: 141
// waypoints on 130 WA routes, with a route's Base indistinguishable from a Landmark.
//
// WHY A SCRIPT AND NOT A COMMENT. The invariant was already written down -- the comment above
// WP_STYLE explains at length that the glyph exists because colour alone fails. It still
// rotted, because adding a row to WP_TYPE_MAP is a one-line edit that reads as complete on its
// own and never makes you look at the other map. Same shape as check:rappel-readers: a rule
// that lives only in prose is a rule the next edit will not see.
//
// The failure is INVISIBLE at every gate this repo already had: both maps are valid JS, every
// identifier is bound, the screen renders, and a pin appears. It is just the wrong pin.
//
// Static -- no browser, no dev server, no DB -- so it sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { assertCovered } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:wp-styles";
const FILES = ["ClimbMatchCore.jsx", "RouteDetail.jsx", "ClimbMatch.jsx"];

let failed = 0;
const ok = (m) => console.log(`  ok  ${m}`);
const bad = (m) => { failed++; console.log(`  FAIL  ${m}`); };

const raw = {};
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error(`\n${GUARD} FAILED — ${f} is missing; the scan would cover a fraction of the app.`); process.exit(1); }
  raw[f] = fs.readFileSync(p, "utf8");
}
// Fails closed on a partial read, the guard-sources.mjs rule: a shorter file list is a
// coverage failure, never a quietly cleaner result.
assertCovered(FILES, ROOT, GUARD);
console.log(`${GUARD} — read ${FILES.length} sources, ${Object.values(raw).reduce((n, s) => n + s.length, 0)} bytes\n`);

const CORE = raw["ClimbMatchCore.jsx"];

// ── 1. the two maps agree ────────────────────────────────────────────────────
// Parsed from RAW source, deliberately NOT through the comment/string blanker the sibling
// guards use: every value here IS a string literal, so blanking string contents would erase
// the very thing being read and report two empty maps as two agreeing maps. The opposite care
// from section 3 below. (check:overlay-discovery records the same split.)
const slice = (startTok, endTok) => {
  const a = CORE.indexOf(startTok);
  if (a < 0) return null;
  const b = CORE.indexOf(endTok, a);
  return b < 0 ? null : CORE.slice(a, b);
};
const styleBlock = slice("const WP_STYLE={", "\nfunction wpColor(");
const mapBlock = slice("const WP_TYPE_MAP={", "\nfunction wpType(");
if (!styleBlock || !mapBlock) {
  console.error(`\n${GUARD} FAILED — ANCHOR LOST: could not slice WP_STYLE / WP_TYPE_MAP out of ClimbMatchCore.jsx.`);
  console.error("Nothing below was actually checked. Rename the anchor in this script to match the source.\n");
  process.exit(1);
}
// WP_STYLE keys are bare identifiers followed by `:{`.
const styled = new Set([...styleBlock.matchAll(/(?:^|[{,\s])([A-Z][A-Za-z]*)\s*:\s*\{/g)].map((m) => m[1]));
// WP_TYPE_MAP entries are `key:"Canonical"`, the key bare or quoted.
const pairs = [...mapBlock.matchAll(/(?:"([^"]+)"|([A-Za-z_][\w]*))\s*:\s*"([^"]+)"/g)]
  .map((m) => ({ rawSpelling: m[1] ?? m[2], canonical: m[3] }));

// Fail closed: an empty parse of either side makes every comparison below pass vacuously,
// which is the exact failure guard-sources.mjs exists to stop.
if (styled.size < 5) { bad(`parsed only ${styled.size} WP_STYLE entries — the parse broke, this is not a clean result`); }
else ok(`WP_STYLE declares ${styled.size} types: ${[...styled].join(", ")}`);
if (pairs.length < 20) { bad(`parsed only ${pairs.length} WP_TYPE_MAP entries — the parse broke, this is not a clean result`); }
else ok(`WP_TYPE_MAP maps ${pairs.length} raw spellings`);
if (failed) { console.log(`\n${GUARD} FAILED — the maps could not be read.\n`); process.exit(1); }

const emitted = new Map();
for (const p of pairs) if (!emitted.has(p.canonical)) emitted.set(p.canonical, p.rawSpelling);
const orphans = [...emitted].filter(([c]) => !styled.has(c));
if (orphans.length) {
  for (const [c, eg] of orphans) {
    bad(`WP_TYPE_MAP emits "${c}" (e.g. from "${eg}") but WP_STYLE has no entry — it renders the fallback 📍 in the list and a grey dot on the map`);
  }
} else ok(`all ${emitted.size} canonical types WP_TYPE_MAP can emit have a WP_STYLE entry`);

// The editor must not offer a type the renderer cannot draw. (The reverse is fine and
// deliberate: Bailout and the five descriptive types are styled without being offered.)
const typesLine = CORE.match(/const WP_TYPES=\[([^\]]*)\]/);
if (!typesLine) bad("ANCHOR LOST: could not find `const WP_TYPES=[`");
else {
  const offered = [...typesLine[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (!offered.length) bad("WP_TYPES parsed empty — the parse broke");
  else {
    const undrawable = offered.filter((t) => !styled.has(t));
    if (undrawable.length) bad(`WP_TYPES offers ${undrawable.join(", ")} which WP_STYLE cannot draw`);
    else ok(`all ${offered.length} editor-offered types are drawable`);
  }
}

// ── 2. no glyph may be an emoji ──────────────────────────────────────────────
// A codepoint with emoji presentation is painted by the font's colour glyph and IGNORES the
// CSS `color` beside it, so it would silently drop the hue while still looking like a fix.
// That is not hypothetical: the bug being guarded here rendered as 📍, whose colour no call
// site could ever control.
const glyphs = [...styleBlock.matchAll(/([A-Z][A-Za-z]*)\s*:\s*\{[^}]*glyph\s*:\s*"([^"]+)"/g)].map((m) => ({ type: m[1], glyph: m[2] }));
if (glyphs.length !== styled.size) bad(`parsed ${glyphs.length} glyphs for ${styled.size} styled types — the parse broke`);
else {
  // `\p{Emoji_Presentation}` is the exact question — "does this codepoint default to the
  // font's COLOUR glyph" — so no range needs maintaining and nothing needs grandfathering.
  // A hand-rolled codepoint range was tried first and called the existing, working ⚑ and ⚠ a
  // defect: both are Emoji=Yes but Emoji_Presentation=No, i.e. they render as text and DO take
  // their colour. Widening a range by name would have hidden the next real one.
  // U+FE0F is checked separately: it forces emoji presentation onto a text character, so
  // `"⚠️"` must fail where bare `"⚠"` passes.
  const offenders = glyphs.filter(({ glyph }) => /\p{Emoji_Presentation}/u.test(glyph) || glyph.includes("️"));
  if (offenders.length) bad(`glyphs that render as emoji and would ignore their colour: ${offenders.map((g) => `${g.type} "${g.glyph}"`).join(", ")}`);
  else ok(`all ${glyphs.length} glyphs are text-presentation characters that take their colour`);
}

// ── 3. every style lookup normalises first ───────────────────────────────────
// `waypoints[].type` is free text: WP_TYPE_MAP is keyed lowercase and the catalog holds
// "Lake", "camp", "Base/bivy", "Trailhead/pass". Indexing a style map with the RAW string is
// a SILENT miss -- it yields undefined, falls to the grey default, and throws nothing. Both
// Leaflet marker call sites did exactly that and greyed out 20 WA waypoints whose colour this
// app already knew.
//
// Parsed with Babel rather than scanned with a regex over blanked source, and that choice is
// load-bearing twice over. A raw regex would match this very file's prose and the explanatory
// comments in ClimbMatchCore (which quote `wc[wp.type]` as the defect) and report phantom
// findings. But the blanker the sibling guards use is unsafe HERE in the other direction: it
// treats every straight quote as a string delimiter, and JSX body text is full of them, so it
// can desynchronise and wipe a REAL `wc[w.type]` -- a false pass, which is the one outcome a
// guard must never produce. An AST has neither failure mode.
/* PARSE EACH FILE ONCE. Sections 6 and 7 below are two separate `for (const f of FILES)` loops
   and each used to call parse() on the same `raw[f]` with identical options, so all three files
   were parsed TWICE -- 2.1s of Babel per pass over ~2.0MB of JSX, for nothing. This is the same
   waste CLAUDE.md records for check:waypoint-placement, which went 37s -> 20s by parsing once for
   two visitors; that entry says to try this first on any new guard, and this guard is the most
   expensive one in the build chain.
   Re-traversing a cached AST is exactly what that fix does: @babel/traverse caches paths on the
   node, so the second visitor sees the same tree. The parse OPTIONS were already identical in
   both places -- if they ever diverge, this memo must not be used for both. */
const AST_CACHE = {};
function astOf(f) {
  if (AST_CACHE[f]) return AST_CACHE[f];
  try {
    AST_CACHE[f] = parse(raw[f], { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  } catch (e) {
    console.error(`\n${GUARD} FAILED — could not parse ${f}: ${e.message}`);
    console.error("Nothing below was checked for this file.\n");
    process.exit(1);
  }
  return AST_CACHE[f];
}

const STYLE_MAPS = new Set(["WP_STYLE", "WP_COLORS", "wc"]);
const STYLE_FNS = new Set(["wpColor", "wpGlyph"]);
const rawLookups = [];
for (const f of FILES) {
  const ast = astOf(f);
  // `x.type` where x is anything — the raw column read.
  const isRawType = (n) => n && n.type === "MemberExpression" && !n.computed
    && n.property && n.property.type === "Identifier" && n.property.name === "type";
  const line = (n) => (n.loc ? n.loc.start.line : 0);
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c && c.type === "Identifier" && STYLE_FNS.has(c.name) && isRawType(p.node.arguments[0])) {
        rawLookups.push({ f, line: line(p.node), what: `${c.name}(…​.type)` });
      }
    },
    MemberExpression(p) {
      const n = p.node;
      if (!n.computed) return;
      const obj = n.object;
      if (!(obj && obj.type === "Identifier" && STYLE_MAPS.has(obj.name))) return;
      if (isRawType(n.property)) rawLookups.push({ f, line: line(n), what: `${obj.name}[…​.type]` });
    },
  });
}
if (rawLookups.length) {
  for (const r of rawLookups) bad(`${r.f}:${r.line} — ${r.what} indexes the RAW type; wrap it in wpType() or the lookup silently misses every non-canonical spelling`);
} else ok("every waypoint style lookup normalises through wpType() first");

// ── 3b. no raw `.type === "<canonical type>"` comparison ─────────────────────
// Section 3 covers style lookups, and that is not the whole surface: a raw EQUALITY test
// against a canonical name misses in exactly the same silent way. Two of them sat in
// RouteDetail.jsx while section 3 reported clean over both:
//
//   TrailheadCard:  waypoints.find(w => w.type === "Trailhead")   -> supplies name/lat/lng
//   the approach section's own render gate:  waypoints.some(w => w.type === "Trailhead" …)
//
// #847 fixed both to wpIs(). This section is the part #847 did not add: it fixed the two
// instances and left nothing to stop a third. That distinction is the whole argument for a
// script over a careful diff — the invariant ("never compare a raw .type") was already
// implicit in wpType()'s existence and in section 3's comment, and two call sites still got
// written the other way. #798 is the same story one file over: a semantic rule in prose,
// broken in four days by a clean merge that added two more readers.
//
// The live impact when they existed was smaller than it looks, which is worth recording so
// nobody re-derives it: `wa_mount_ballard_south` is the only affected route (it stores
// "Harts Pass" as `"Trailhead/pass"`), and TrailheadCard prefers approach_logistics — which
// that route has set — so the card and the gate were both already satisfied by another field.
// A latent silent miss, not a broken screen. It did also hide a real finding: the route
// carries a SECOND trailhead waypoint, so audit:waypoints' multiTrailhead could not see it.
//
// Scoped to string literals that are CANONICAL WP_STYLE keys, which is what makes this
// precise rather than a haystack: the app compares `.type` against plenty of unrelated
// vocabularies (`"itinerary"`, `"grade"`, `"invite"`, `"ul"`), and those are different
// objects' type fields entirely. Only a waypoint's canonical name implies a waypoint.
const CANON_TYPES = new Set(styled);
const rawEquality = [];
for (const f of FILES) {
  const ast = astOf(f);
  const isRawType = (n) => n && n.type === "MemberExpression" && !n.computed
    && n.property && n.property.type === "Identifier" && n.property.name === "type";
  traverse(ast, {
    BinaryExpression(p) {
      const n = p.node;
      if (n.operator !== "===" && n.operator !== "!==" && n.operator !== "==" && n.operator !== "!=") return;
      const pair = [[n.left, n.right], [n.right, n.left]];
      for (const [a, b] of pair) {
        if (!isRawType(a)) continue;
        if (!(b && b.type === "StringLiteral" && CANON_TYPES.has(b.value))) continue;
        rawEquality.push({ f, line: n.loc ? n.loc.start.line : 0, val: b.value });
      }
    },
  });
}
if (!CANON_TYPES.size) bad("no canonical types were parsed, so section 3b checked nothing");
else if (rawEquality.length) {
  for (const r of rawEquality) {
    bad(`${r.f}:${r.line} — compares a RAW \`.type\` against the canonical ${JSON.stringify(r.val)}. ` +
      `That is a silent miss for every mapped spelling (e.g. "Trailhead/pass"): the test finds nothing, ` +
      `the caller falls back, and the screen reads as "this route has no such waypoint". Use wpIs(w, ${JSON.stringify(r.val)}).`);
  }
} else ok(`no raw \`.type ===\` comparison against any of the ${CANON_TYPES.size} canonical types`);

// ── 4. the glyphs REACH A SCREEN ─────────────────────────────────────────────
// Sections 1-3 prove the maps agree and the lookups normalise. Neither proves a pin changed:
// `descent_text` was populated on 1,021 routes and rendered on none, and check:field-renders
// exists because only rendering can answer that. So render the real RouteDetail over a route
// whose waypoints use RAW spellings ("Climbing area", "col", "Lake") and require the glyph the
// NORMALISER should reach. That exercises WP_TYPE_MAP -> wpType -> WP_STYLE end to end, which
// is the whole path that was broken, and it fails if the waypoint list stops rendering at all.
const probe = {
  id: "probe_wp", name: "Probe Route", grade: "5.9", pitches: 3, discipline: "trad",
  mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington", lat: 47.5, lng: -121.0 },
  waypoints: [
    { type: "Base", name: "Start of the climbing", lat: 47.50, lng: -121.00, elev: 5000, distMi: 1.0 },
    { type: "Climbing area", name: "The crag", lat: 47.51, lng: -121.01, elev: 5100, distMi: 1.2 },
    { type: "col", name: "The col", lat: 47.52, lng: -121.02, elev: 5300, distMi: 1.6 },
    { type: "approach", name: "Approach point", lat: 47.53, lng: -121.03, elev: 5400, distMi: 2.0 },
    { type: "Viewpoint", name: "The viewpoint", lat: 47.54, lng: -121.04, elev: 5500, distMi: 2.4 },
    { type: "Lake", name: "The lake", lat: 47.55, lng: -121.05, elev: 5600, distMi: 2.8 },
  ],
};
{
  const { build } = await import("esbuild");
  const { createRequire } = await import("module");
  const os = (await import("os")).default;
  const require2 = createRequire(import.meta.url);
  const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-wp-")), "bundle.cjs");
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
  const { render } = require2(out);
  let html = "";
  /* The PLANNER tab, not Overview. The waypoint list and the map legend -- the two surfaces this
     section asserts every type reaches -- used to sit on Overview for a crag-family route and on
     Plan for an alpine one. Plan now owns the whole getting-there story for every discipline, so
     there is one place to render rather than two, and this probe route (trad, with waypoints) no
     longer has an Overview block at all. */
  try { html = render(probe, "planner"); }
  catch (e) { bad(`RouteDetail threw while rendering a route with waypoints: ${e.message.slice(0, 120)}`); }
  if (html) {
    // Every glyph below occurs exactly ONCE in app source — its own WP_STYLE row — so a hit
    // here is that pin and not stray copy. That is not incidental: Approach was first given a
    // plain "→", which appears 104 times as ordinary UI copy, and this assertion could not
    // have distinguished the pin from a "See all →" link. See the note beside WP_STYLE.
    const want = [["Base", "⊥"], ["Crag", "▩"], ["Pass", "◡"], ["Approach", "⇢"], ["Landmark", "◉"], ["Water (from raw \"Lake\")", "≈"]];
    /* TWO occurrences, not one, and that floor is load-bearing. Each type renders on two
       surfaces — the waypoint list row and the map legend — and an "appears at least once"
       test is satisfied by EITHER. Measured: blanking the list's `wpGlyph(_wty)` left this
       assertion GREEN on the strength of the legend alone (injection 7), which is the same
       vacuous-pass shape as matching the Safety tab's "Fire & smoke" link in check:bare.
       The probe carries exactly one waypoint per type, so the honest count is exactly 2. */
    const counts = want.map(([n, g]) => [n, g, html.split(g).length - 1]);
    const missing = counts.filter(([, , c]) => c < 2);
    if (missing.length) bad(`rendered a route with waypoints but these pins are missing a surface: ${missing.map(([n, , c]) => `${n} (${c}/2)`).join(", ")} — expected one in the waypoint list AND one in the map legend`);
    else ok(`all ${want.length} pins render from their RAW spellings, on both the list and the legend`);
    if (html.includes("📍")) bad("the fallback 📍 still renders — a waypoint type is reaching the screen unstyled");
    else ok("no fallback 📍 anywhere in the rendered route");
  }
}

console.log();
if (failed) { console.log(`${GUARD} FAILED — ${failed} problem(s).\n`); process.exit(1); }
console.log(`${GUARD} ok — the two waypoint maps agree, every glyph takes its colour, and no lookup reads a raw type.\n`);
process.exit(0);

// Injection cases — all 8 run and all 8 caught, each naming its own defect:
//   1.  delete the ` Base:{…},` line from WP_STYLE      -> `WP_TYPE_MAP emits "Base"` … no entry
//   2.  a glyph becomes an emoji (U+1F4CD)              -> "render as emoji"
//   2b. a text glyph forced to emoji with U+FE0F ("⚠️")  -> "render as emoji"   (bare "⚠" must PASS)
//   3.  revert a marker to `wc[wp.type]`                -> names ClimbMatchCore.jsx and the line
//   4.  revert `wpColor(_wty)` to `wpColor(w.type)`     -> names RouteDetail.jsx and the line
//   5.  rename `const WP_STYLE={`                       -> ANCHOR LOST, "nothing below was checked"
//   6.  add "Foo" to WP_TYPES                           -> "WP_TYPES offers Foo"
//   7.  blank the Overview list's `:wpGlyph(_wt);`      -> "missing a surface" (only section 4 sees it)
//   8.  make wpType() stop normalising                  -> "missing a surface"
//
// TWO OF THESE WERE HARNESS BUGS BEFORE THEY WERE TESTS, both the "injection logged, counter
// didn't move" shape, and neither was visible by reading the harness:
//   * The glyphs were written as perl `\x{22A5}` escapes. perl without -CSD operates on BYTES,
//     so those patterns matched nothing and cases 1, 2 and 2b reported "not caught" against a
//     file that had never been modified. Patterns must be ASCII-only (match the glyph as
//     `[^"]*`), and every case must prove the edit landed -- by checksum -- BEFORE judging.
//   * Case 7 first aimed at `wpGlyph(_wty)`, which is a DIFFERENT surface: RouteDetail has three
//     waypoint glyph sites, and the one that renders on Overview is `wpGlyph(_wt)`. Blanking the
//     wrong one left the guard correctly green and read as a coverage hole.
