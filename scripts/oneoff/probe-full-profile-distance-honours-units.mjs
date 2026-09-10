#!/usr/bin/env node
// "12.4 miles away" ON A PROFILE, TO A CLIMBER WHO ASKED FOR KILOMETRES.
//
// FullProfile renders the distance to another climber TWICE — once in the header beside the
// location, once inside the COMPATIBILITY WITH YOU card — and both printed a raw number with a
// hardcoded imperial unit:
//
//     {dist.toFixed(1)} mi away          (header)
//     {dist.toFixed(1)} miles away       (compatibility card)
//
// `dist` is `distMiles(ME, climber)`, so it really is miles, and nothing converted it. Two
// spellings of one unit in one component, neither honouring the setting.
//
// THE PRECEDENT WAS ALREADY IN THE FILE. A third site — the partner card — has always written
// `uDistMi(+dist.toFixed(1))+" away"`, which is the app's own helper and rounds identically. So
// this is not a new convention, it is two sites that missed an existing one, and the fix is a
// copy of the line 130k characters away. An instance fixed by hand is not a class closed.
//
// MEASURED FIRST: across the three app files, exactly TWO sites rendered a number beside a
// literal distance unit without a u* helper, and both were these. The class is closed at 2.
//
// Both sites are gated on `dist != null && isFinite(dist)`, so a fixture whose distance does not
// resolve renders NEITHER and every assertion below passes vacuously. Section 2 asserts the
// distance is real before anything is believed.
//
//   node scripts/oneoff/probe-full-profile-distance-honours-units.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// ── 1. SOURCE: neither site may print a bare unit again. This is the half a stale-base squash
//    takes — it changes a STRING and no identifier, which audit:silent-reverts says in its own
//    closing caveat it cannot see.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const rawDist = [...core.matchAll(/\{\s*dist\.toFixed\(1\)\s*\}\s*(?:mi|miles)\b/g)];
if (!rawDist.length) ok("no site prints dist with a hardcoded distance unit");
else fail(`${rawDist.length} site(s) still print dist with a hardcoded unit: ${rawDist.map((m) => JSON.stringify(m[0])).join(", ")}`);

// Scoped to FullProfile's own body, and matched on the HELPER rather than on one spelling of its
// argument: `uDistMi(dist)` instead of `uDistMi(+dist.toFixed(1))` is a rounding choice, not a
// units defect, and a probe pinned to the exact expression would forbid improving it — the
// `disclaimer-reworded` lesson.
{
  const a = core.indexOf("function FullProfile");
  const b = core.indexOf("\nfunction ", a + 10);
  const body = a < 0 ? "" : core.slice(a, b < 0 ? core.length : b);
  if (body.length > 4000) {
    const n = (body.match(/uDistMi\(/g) || []).length;
    if (n >= 2) ok(`FullProfile routes ${n} distance readouts through uDistMi`);
    else fail(`FullProfile calls uDistMi ${n} time(s) — the header and the compatibility card both render a distance`);
  } else fail(`ANCHOR LOST: FullProfile lifted ${body.length} chars — the source assertions would be vacuous`);
}

// ── 2. RENDER. Only this proves the helper's output reaches the markup: the source test above is
//    satisfied by a call whose result is thrown away.
const { build } = await import("esbuild");
// INSIDE the project, never os.tmpdir(): with react external, node resolves it from the nearest
// node_modules, and a bundle in a temp dir has none.
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-dist-probe-"));
const out = path.join(outdir, "b.cjs");
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });

await build({
  stdin: {
    contents: `export { FullProfile, __set_UNITS, ME, CLIMBERS, distMiles, uDistMi } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  // react and react-query EXTERNAL, or esbuild inlines a second copy and every hook throws
  // "Invalid hook call" — the render comes back near-empty and every ABSENCE assertion passes.
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "@tanstack/react-query"],
  outfile: out, logLevel: "error",
});

// FullProfile ends in createPortal(..., document.body), which SSR cannot do. Portals are
// PLACEMENT and this probe asks about CONTENT, so the portal is flattened and document stubbed.
globalThis.document = globalThis.document || { body: {} };
const _rd = require_("react-dom");
_rd.createPortal = (children) => children;

const { FullProfile, __set_UNITS, ME, CLIMBERS, distMiles } = require_(out);
const { renderToStaticMarkup } = require_("react-dom/server");
const { createElement } = require_("react");
const { QueryClient, QueryClientProvider } = require_("@tanstack/react-query");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// A SEED climber, deliberately: `dist` is `climber._real ? null : distMiles(...)`, so a real
// (uuid) profile renders no distance at all and this probe would assert about a branch that is
// correctly absent.
// The FARTHEST one, not the first: several seed climbers share Salt Lake City with ME, and
// distMiles is a haversine, so the first match resolved to exactly 0. A zero distance renders
// "0.0 mi away" and "0.0 km away" — identical strings — so the conversion assertion at the
// bottom would fail against a perfectly correct fix. Found by this section firing, not by
// reading.
const climber = (CLIMBERS || [])
  .filter((c) => c && c.lat != null && c.lng != null && c.id !== ME.id)
  .map((c) => [c, distMiles(ME, c)])
  .sort((a, b) => b[1] - a[1])[0]?.[0];
if (!climber) { fail("no seed climber with coordinates — the distance branch cannot be reached"); process.exit(1); }

const d = distMiles(ME, climber);
if (Number.isFinite(d) && d > 0) ok(`the fixture distance resolves (${d.toFixed(1)} mi to ${climber.name}) — both render sites are reachable`);
else { fail(`distance did not resolve (${d}) — both sites are gated on isFinite(dist), so every assertion below would pass vacuously`); process.exit(1); }

const render = () => {
  try {
    return renderToStaticMarkup(createElement(QueryClientProvider, { client: qc },
      createElement(FullProfile, { climber, onClose() {}, onResume() {},
        catchCredits: [], myCrews: [], myFriendIds: [], vouched: false, mySpeedFtHr: 0,
        routeById: () => null })));
  } catch (e) { return "RENDER FAILED: " + e.message; }
};

__set_UNITS("imperial");
const imp = render();
__set_UNITS("metric");
const met = render();
__set_UNITS("imperial");   // leave the module as it was found

for (const [label, html] of [["imperial", imp], ["metric", met]]) {
  if (html.length > 400) ok(`${label} render is ${html.length} chars`);
  else { fail(`${label} render is ${html.length} chars — every "must not contain" assertion below would pass vacuously (${html.slice(0, 120)})`); process.exit(1); }
}

// Both sites must actually be on screen, or a single-site fix reads as a complete one.
if (/COMPATIBILITY WITH YOU/.test(imp)) ok("the compatibility card rendered, so the second site is in frame");
else fail("the compatibility card did not render — only the header site is being measured");

const away = (h) => (h.match(/ away/g) || []).length;
if (away(imp) === 2) ok("both distance readouts render (2 × ' away')");
else fail(`expected 2 distance readouts, saw ${away(imp)} — one of the two sites is not in frame`);

// ── 3. THE UNITS THEMSELVES.
if (/\bmi away/.test(imp)) ok('imperial reads "… mi away"');
else fail(`imperial does not read "mi away" — ${(imp.match(/[\d.]+ \w+ away/g) || []).join(", ") || "(no distance found)"}`);

if (/\bkm away/.test(met)) ok('metric reads "… km away"');
else fail(`metric does not read "km away" — ${(met.match(/[\d.]+ \w+ away/g) || []).join(", ") || "(no distance found)"}`);

// The dangerous direction: a metric climber still being shown miles.
if (!/\bmi away|\bmiles away/.test(met)) ok("metric shows no miles anywhere");
else fail("metric still renders miles — the setting is not being honoured");

// NON-VACUOUS: the two renders must genuinely differ at the distance, not merely both contain
// a plausible string. A helper that ignored the setting would satisfy every test above but this.
const impN = (imp.match(/([\d.]+) mi away/) || [])[1];
const metN = (met.match(/([\d.]+) km away/) || [])[1];
if (impN && metN && impN !== metN) ok(`the number converts too (${impN} mi -> ${metN} km)`);
else fail(`the number did not change between units (${impN} / ${metN}) — a unit word swapped without a conversion`);

console.log();
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log("ok — both FullProfile distance readouts honour the unit setting");
