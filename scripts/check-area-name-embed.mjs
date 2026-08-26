// A PostgREST `areas(...)` embed that omits `name` puts the word "undefined" on the route page.
//
// #1219 is the case on record, found by opening the deployed app rather than by any guard. A
// wishlisted route rendered
//
//     Mountaineering  5.6
//     UNDEFINED
//     Hanging Glacier
//
// where it should say MOUNT SHUKSAN, and lost its elevation with it. `useScopedWishlistRoutes`
// selected `*, areas(path)` — `path` is genuinely all its ltree filter needs — but
// `dbRouteToCamel` builds `_dbArea` from `r.areas` whenever that is TRUTHY, so a path-only embed
// yields an area object whose `name` is undefined. Two failures compound:
//
//   1. RouteDetail's `MOUNTAINS.find(...) || route._dbArea || {name:"this area"}` guarded the
//      OBJECT and not the NAME, so the nameless object won the chain and `"📍 "+mtn.name`
//      rendered "📍 undefined" — uppercased to UNDEFINED by CSS.
//   2. openRoute's async backfill is gated on `!x._dbArea`, so a truthy-but-nameless `_dbArea`
//      SUPPRESSES the repair that would have fetched the real area. That is why it was permanent
//      rather than a flicker: it did not heal on a six-second wait and reproduced from a clean load.
//
// NO EXEMPTION FOR "THIS ONE ONLY FILTERS", which is exactly the reasoning that shipped it: the
// row still reaches `dbRouteToCamel`, which cannot tell why the embed was narrow.
//
// Two sections, because either fix alone leaves the other hole open — the query can be widened
// and a future narrow one still renders a bug, and the fallback can be hardened while the data
// stays wrong. Static + one renderToStaticMarkup pass, no DB and no browser, so it sits in build.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createRequire } from "node:module";
import os from "node:os";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const GUARD = "check:area-name-embed";
let failures = 0;
const fail = (m) => { console.log(`  FAIL ${m}`); failures++; };
const pass = (m) => console.log(`  ok   ${m}`);

// ── 1. STATIC: every areas() embed in a .select() carries `name`. ──────────────────────────────
//
// `\bareas(` over the comment-stripped source. THREE narrower or wider rules were tried first
// and each failed differently, which is why the boundary and the comment strip are both here:
//   * `areas(` with no word boundary reports `useRichTextareas(` — `areas` is a suffix of
//     `Textareas`, and it appears four times in ClimbMatchCore.jsx. `\b` excludes it, because the
//     character before the `a` is a word character.
//   * a `.select("…")`-only scan misses `const SEL = "*, areas(…)"` in lib/db.js, assigned first
//     and passed to .select() later. That one carries `name`, so the miss was SILENT — found by
//     diffing against the looser scan, not by anything failing.
//   * parsing STRING LITERALS to scope the match HUNG the guard. A quote-delimited matcher
//     backtracks catastrophically over 428 kB of dense JSX, whose body text is full of
//     apostrophes — the same desynchronisation check:overlay-discovery records for the shared
//     comment/string blanker. Do not reintroduce it.
// Scanning lib/db.js alone is not enough either: the ?debugRoute lookup issues its own embed from
// ClimbMatch.jsx, and lib/offline.js issues another.
console.log("STATIC — every areas() embed in a .select() carries `name`:");
const FILES = appSources(ROOT, GUARD);

// ONE exemption, and it is a claim about the code rather than a pass. `lib/offline.js` embeds
// `areas!inner(path)` purely to filter by ltree, then DESTRUCTURES THE KEY BACK OUT before
// storing: `const { areas: _drop, ...row } = r`. So its rows never reach dbRouteToCamel carrying
// an area at all, `_dbArea` is null, and the fallback works — this is not the defect.
//
// The exemption is verified against the file, not trusted: if that drop disappears, the
// exemption fails as stale and the embed is reported. Same standard as check:field-renders'
// KNOWN map — an exemption nothing re-checks is a description of code that has moved on.
const EXEMPT = new Map([
  ["lib/offline.js", {
    why: "embeds areas!inner(path) to filter by ltree, then drops the key before storing",
    proof: /const\s*\{\s*areas:\s*\w+\s*,\s*\.\.\.\w+\s*\}\s*=/,
  }],
]);

// Comments stripped first: lib/db.js discusses `areas(...)` in prose and RouteDetail.jsx now
// explains this very defect in a comment naming `areas(path)`. A scan that read comments would
// report a phantom — the trap check:ci-cancel and check:crew-member-readers both record.
// `(^|[^:])` and not `([^:])`: the `[^:]` is there so a URL's `https://` is not treated as a
// comment, but on its own it CANNOT MATCH AT POSITION 0, so a comment starting a line survived
// the strip. Injection case 3 caught it — the guard failed on its own documentation.
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");

let selects = 0, embeds = 0;
const exemptUsed = new Set();
for (const rel of FILES) {
  const code = strip(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  selects++;
  {
    for (const em of code.matchAll(/\bareas\s*(?:!inner)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      embeds++;
      const inner = em[1];
      // `parent:parent_id(name)` is a NESTED embed; its `name` says nothing about the area's own.
      const topLevel = inner.split(/\bparent\b/)[0];
      const line = code.slice(0, em.index).split("\n").length;
      const ex = EXEMPT.get(rel);
      if (/(^|[,\s(])name([,\s)]|$)/.test(topLevel)) {
        pass(`${rel}:${line} areas(${inner.slice(0, 40)}…) carries name`);
        if (ex) fail(`${rel} is exempt but its embed now carries name — STALE exemption, remove it`);
      } else if (ex && ex.proof.test(code)) {
        pass(`${rel}:${line} areas(${inner}) exempt — ${ex.why}`);
        exemptUsed.add(rel);
      } else if (ex) {
        fail(`${rel}:${line} is exempt on the grounds that it ${ex.why}, and that is NO LONGER TRUE\n`
          + `       in the file. Either restore the drop or add \`name\` to the embed.`);
      } else {
        fail(`${rel}:${line} areas(${inner}) omits \`name\`.\n`
          + `       A row from this reaches dbRouteToCamel, which builds a TRUTHY _dbArea with no\n`
          + `       name — that renders the word "undefined" AND suppresses openRoute's backfill.\n`
          + `       Add name (and the other area fields) even if this query only filters.`);
      }
    }
  }
}
// Fails closed in both directions: a broken select-matcher and a vocabulary that stopped
// matching are each "nothing was checked", never a clean tree.
if (selects < 20) fail(`only ${selects} source file(s) scanned — the scan broke, this is not a clean tree`);
else pass(`${selects} source file(s) scanned`);
if (!embeds) fail("no areas() embed found at all — the app cannot work without one, so the scan broke");
else pass(`${embeds} areas() embed(s) inspected`);
// An exemption naming a file that no longer embeds `areas` is bookkeeping describing code that
// has gone. It fails in BOTH directions, so the list cannot rot into a free pass.
for (const rel of EXEMPT.keys()) {
  if (!exemptUsed.has(rel)) fail(`${rel} is exempt but issues no nameless areas() embed — STALE exemption, remove it`);
}

// ── 2. RENDERED: a nameless _dbArea degrades to "this area", never to "undefined". ─────────────
console.log("\nRENDERED — the peak header never prints the word undefined:");
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "overview", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-areaname-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const base = { id: "t_1", name: "Hanging Glacier", grade: "5.6", discipline: "mountaineering", pitches: 0, mountainId: "no_such_seed_area" };
const area = { id: "a1", areaType: "peak", region: "Washington", lat: 48.83, lng: -121.6 };

// (a) the exact live shape: _dbArea present, from a path-only embed, with no name.
const nameless = text(render({ ...base, _dbArea: { ...area, name: undefined } }));
if (/undefined/i.test(nameless)) fail("a nameless _dbArea still renders the word undefined");
else pass("nameless _dbArea renders no `undefined`");
if (nameless.includes("this area")) pass('nameless _dbArea degrades to "this area"');
else fail('nameless _dbArea does not fall back to "this area"');

// (b) a real area must still win. Without this, a fallback that swallowed every name would pass
// (a) and (c) and the guard would be enforcing a blank header.
const named = text(render({ ...base, _dbArea: { ...area, name: "Mount Shuksan" } }));
if (named.includes("Mount Shuksan")) pass("a real area name still renders");
else fail("a real area name no longer renders — the fallback is swallowing it");
if (/undefined/i.test(named)) fail("a named _dbArea renders the word undefined");
else pass("named _dbArea renders no `undefined`");

// (c) no _dbArea at all — the pre-existing correct path must be unchanged.
const none = text(render({ ...base }));
if (none.includes("this area") && !/undefined/i.test(none)) pass('no _dbArea still degrades to "this area"');
else fail("no _dbArea no longer degrades correctly");

console.log(failures
  ? `\n${GUARD}: ${failures} failure(s)`
  : `\n${GUARD}: ok — every areas() embed carries name, and a nameless area cannot render as "undefined".`);
process.exit(failures ? 1 : 0);

/* Injection-tested (scripts/oneoff/inject-area-name-cases.mjs), 4 cases:
   1. narrow an embed to areas(path)            -> section 1 fails naming the file and line
   2. revert the name-aware fallback            -> section 2 fails on (a), twice
   3. a comment mentioning areas(path)          -> must PASS; documentation is not a regression
   4. break the .select() matcher               -> reports a broken scan, never a clean tree
   Case 3 is the one that matters: RouteDetail.jsx explains this defect in prose naming
   `areas(path)`, so a scan that read comments would fail on its own documentation. */
