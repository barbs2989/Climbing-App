// The route page rendered the literal word "undefined" where the peak name goes.
//
// Found on the LIVE app, not by a guard: a wishlisted route opened from search showed
// "UNDEFINED" above its name (CSS uppercases it) and lost its elevation, permanently -- it did
// not self-heal on a 6-second wait, and it reproduced from a clean load.
//
// MECHANISM, proven from the network log rather than inferred. `useScopedWishlistRoutes` selected
// `*, areas(path)` -- `path` is all its ltree filter needs. But `dbRouteToCamel` builds `_dbArea`
// from `r.areas` whenever that is TRUTHY, so a path-only embed produces an area object whose
// `name` is undefined. Two things then go wrong at once:
//
//   1. RouteDetail's `MOUNTAINS.find(...) || route._dbArea || {name:"this area"}` guards the
//      OBJECT, not the NAME, so the nameless object wins the chain and `"📍 "+mtn.name` renders
//      "📍 undefined".
//   2. openRoute's async backfill is gated on `!x._dbArea`, so a truthy-but-nameless `_dbArea`
//      SUPPRESSES the repair that would have fetched the real area. That is why it is permanent.
//
// Both halves are fixed: the query asks for the same area fields its sibling `useRoutesByIds`
// asks for, and the fallback is name-aware.
//
// Two checks, because either fix alone leaves the other hole open.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
let failures = 0;
const fail = (m) => { console.log(`  FAIL ${m}`); failures++; };
const pass = (m) => console.log(`  ok   ${m}`);

// ── 1. STATIC: no `areas(...)` embed on `routes` may omit `name`. ──────────────────────────────
// Deliberately NO exemption for "this one only filters". That is precisely the reasoning that
// shipped the defect: the row still reaches dbRouteToCamel, which cannot tell why the embed was
// narrow. Comments are stripped first -- lib/db.js discusses `areas(...)` in prose, and a scan
// that read comments would report a phantom.
console.log("STATIC — every areas() embed carries `name`:");
const raw = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const code = raw.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/^\s*\/\/.*$/, " ")).join("\n");
const embeds = [...code.matchAll(/areas\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)];
if (embeds.length < 4) fail(`only ${embeds.length} areas() embeds parsed — the scan broke, this is not a clean file`);
else pass(`${embeds.length} areas() embeds parsed`);
for (const m of embeds) {
  const inner = m.group ? m.group(1) : m[1];
  const topLevel = inner.split("parent")[0];
  const line = code.slice(0, m.index).split("\n").length;
  if (/\bname\b/.test(topLevel)) pass(`lib/db.js:${line} areas(${inner.slice(0, 46)}…) carries name`);
  else fail(`lib/db.js:${line} areas(${inner}) omits \`name\` — a row from this reaches dbRouteToCamel, `
    + `which builds a TRUTHY _dbArea with no name; that renders "undefined" AND suppresses openRoute's backfill`);
}

// ── 2. RENDERED: a nameless _dbArea must degrade to "this area", never to "undefined". ─────────
console.log("\nRENDERED — the header never prints the word undefined:");
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

// (a) the exact live shape: _dbArea present, from a path-only embed, with no name.
const nameless = text(render({ ...base, _dbArea: { id: "a1", name: undefined, areaType: "peak", region: "Washington", lat: 48.83, lng: -121.6 } }));
if (/undefined/i.test(nameless)) fail("a nameless _dbArea still renders the word undefined");
else pass("nameless _dbArea renders no `undefined`");
if (nameless.includes("this area")) pass('nameless _dbArea degrades to "this area"');
else fail('nameless _dbArea does not fall back to "this area"');

// (b) a real area must still win — a fallback that swallowed the true name would pass (a).
const named = text(render({ ...base, _dbArea: { id: "a1", name: "Mount Shuksan", areaType: "peak", region: "Washington", lat: 48.83, lng: -121.6 } }));
if (named.includes("Mount Shuksan")) pass("a real area name still renders");
else fail("a real area name no longer renders — the fallback is swallowing it");
if (/undefined/i.test(named)) fail("a named _dbArea renders the word undefined");
else pass("named _dbArea renders no `undefined`");

// (c) no _dbArea at all — the pre-existing correct path must be unchanged.
const none = text(render({ ...base }));
if (none.includes("this area") && !/undefined/i.test(none)) pass('no _dbArea still degrades to "this area"');
else fail("no _dbArea no longer degrades correctly");

console.log(failures ? `\n${failures} failure(s)` : "\nno findings — the peak name can no longer render as `undefined`");
process.exit(failures ? 1 : 0);
