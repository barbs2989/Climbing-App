#!/usr/bin/env node
// PARTNER BROWSE AND PARTNER SEARCH RENDER A RAW POSTGREST ROW, and the row-to-climber mapping
// drops two privacy fields the SELECT went to the trouble of fetching.
//
// `PARTNER_COLS` fetches `show_name` and `resume_public`. `RealClimberRow` — the row every
// signed-in climber sees while browsing for partners, AND the row a name search returns — then
// built its climber object without either:
//
//     var _cand = {id, name: p.name||"Climber", avatar, bio, location, disciplines, grades, objectiveIds:[]}
//
// Three consequences, and the last is the dangerous one:
//
//   1. The row prints `{p.name||"Climber"}` — a BARE name. A climber who turned "Show my real
//      name publicly" OFF had it shown to every signed-in climber browsing for partners, with
//      their handle rendered underneath it.
//   2. `_cand` carries no `username` and no `showName`, so opening that profile puts it through
//      `pubName(climber)` — which cannot say yes and derives a handle FROM THE REAL NAME.
//      `"Robin Belay"` -> `@robinbelay`, which need not be their handle. #1619's second defect,
//      one surface over.
//   3. `_cand` carries no `resumePublic`, and FullProfile gates its résumé button on
//      `climber.resumePublic !== false` — so an ABSENT field reads as PUBLIC and the résumé of a
//      climber who made it private was offered from partner browse. CLAUDE.md warns about exactly
//      this shape and names the defence (`!!p.resume_public`, so an omitted column HIDES a button
//      rather than exposing a résumé); the select was fixed and this mapping never was.
//
//   node scripts/oneoff/probe-partner-browse-row-honours-privacy.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const core = strip(fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8"));
const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");

// ---- 1. THE SELECT MUST STILL FETCH IT. Without this the mapping has nothing to carry and the
// assertions below would be about a field that never arrives.
const cols = (db.match(/const PARTNER_COLS = "([^"]*)"/) || [])[1];
if (!cols) fail("ANCHOR LOST: PARTNER_COLS could not be read");
else for (const need of ["name", "username", "show_name", "resume_public"]) {
  if (cols.split(",").map((c) => c.trim()).includes(need)) ok(`PARTNER_COLS fetches ${need}`);
  else fail(`PARTNER_COLS does not fetch ${need} — the row cannot honour it`);
}

// ---- 2. THE ROW ITSELF. Isolated to RealClimberRow's own body, because "the file renders a bare
// name somewhere" is true of the seed card beside it and says nothing about this one.
const i = core.indexOf("function RealClimberRow");
const j = core.indexOf("\nfunction ", i + 10);
const row = i < 0 ? "" : core.slice(i, j < 0 ? core.length : j);
if (row.length > 400) ok(`RealClimberRow lifted (${row.length} chars)`);
else fail("ANCHOR LOST: RealClimberRow could not be lifted — nothing below was checked");

if (/pubNameRow\(p\)/.test(row)) ok("the browse row renders the name through the gate");
else fail("the browse row still prints a bare p.name — a hidden name is shown to every browser");

if (!/\{p\.name\s*\|\|\s*"Climber"\}/.test(row)) ok("...and no bare-name render survives in it");
else fail("a bare {p.name} render survives in the browse row");

// ---- 3. THE OBJECT IT HANDS TO FullProfile. Opening the row is the second audience, and it is
// where a missing field becomes a wrong CLAIM rather than a wrong label.
if (/username:\s*p\.username/.test(row)) ok("_cand carries username, so pubName cannot invent a handle");
else fail("_cand drops username — pubName derives a handle from the REAL NAME");

if (/showName:\s*!!p\.show_name/.test(row)) ok("_cand carries showName, so the profile can say yes");
else fail("_cand drops showName — a climber who chose to show their name is shown as a handle");

// The asymmetry is deliberate and is the whole point: `!!` for SOMEBODY ELSE's row, so an omitted
// column hides a button; `!== false` is only correct for your own read-back.
if (/resumePublic:\s*!!p\.resume_public/.test(row)) ok("_cand carries resumePublic as !! — an absent column HIDES the résumé");
else if (/resumePublic:\s*p\.resume_public\s*!==\s*false/.test(row)) fail("_cand uses !== false — an absent column would EXPOSE a private résumé");
else fail("_cand drops resumePublic — FullProfile's !== false gate then offers a PRIVATE résumé");

// ---- 4. THE GATE IT FEEDS, so this probe fails if the reader stops being the one described above
// rather than silently asserting about a gate that has moved.
if (/climber\.resumePublic!==false\?<button/.test(core)) ok("FullProfile still gates the résumé on climber.resumePublic !== false");
else fail("ANCHOR LOST: FullProfile's résumé gate has moved — re-read whether !! is still the right mapping");

// ---- 5. BOTH SURFACES GO THROUGH THIS ONE ROW. If a second row component appears, this probe is
// covering half the exposure and says so rather than passing.
const uses = (core.match(/<RealClimberRow /g) || []).length;
if (uses >= 2) ok(`RealClimberRow serves ${uses} surfaces (browse + name search)`);
else fail(`RealClimberRow is rendered ${uses} time(s) — a surface has moved off it and is unchecked`);

// ---- 6. THE CONSEQUENCE, RENDERED. Sections 2-3 prove the mapping; only a render proves that
// `!!` versus a dropped field actually decides whether the button is on screen. Without this the
// source assertions rest on my reading of a gate rather than on its behaviour.
const { build } = await import("esbuild");
const { createRequire } = await import("node:module");
const os = await import("node:os");
const require_ = createRequire(import.meta.url);
// INSIDE the project, never os.tmpdir(): with react external, node resolves it from the nearest
// node_modules, and a bundle in a temp dir has none — MODULE_NOT_FOUND.
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-browse-probe-"));
const out = path.join(outdir, "b.cjs");
// Cleanup on EXIT, not at the end of the happy path: this bundle lives inside the repo (see
// above), so a throw between here and the last assertion would leave a stray directory
// sitting untracked for somebody to add by accident.
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });
await build({
  stdin: {
    contents: `export { FullProfile, pubNameRow } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  // react EXTERNAL, or esbuild inlines a second copy and every hook call throws "Invalid hook
  // call" — the render then comes back near-empty and every ABSENCE assertion passes vacuously.
  // The 400-char floor below is what exposed that rather than a green run.
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "@tanstack/react-query"],
  outfile: out, logLevel: "error",
});
// FullProfile ends in `createPortal(..., document.body)`, which SSR cannot do — it throws
// "document is not defined" before rendering anything. Portals are PLACEMENT and this probe
// asks about CONTENT, so the portal is flattened and `document` stubbed. Placement is
// `check:overlays`' subject, not this one. Patched BEFORE the bundle loads, and react-dom is
// external so the bundle resolves this same module object.
globalThis.document = globalThis.document || { body: {} };
const _rd = require_("react-dom");
_rd.createPortal = (children) => children;
const { FullProfile, pubNameRow } = require_(out);
const { renderToStaticMarkup } = require_("react-dom/server");
const { createElement } = require_("react");
// FullProfile calls a react-query hook. The provider must be the SAME module instance the
// component resolves, which is why @tanstack/react-query is external above too — inlined, the
// provider wraps a different context and the render still throws "No QueryClient set".
const { QueryClient, QueryClientProvider } = require_("@tanstack/react-query");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const render = (climber) => {
  try {
    return renderToStaticMarkup(createElement(QueryClientProvider, { client: qc },
      createElement(FullProfile, { climber, onClose() {}, onResume() {},
        catchCredits: [], myCrews: [], myFriendIds: [], vouched: false, mySpeedFtHr: 0,
        routeById: () => null })));
  } catch (e) { console.log("      render threw: "+e.message+"\n"+String(e.stack).split("\n").slice(1,4).join("\n")); return "RENDER FAILED: " + e.message; }
};

// The row's own mapping, executed rather than restated — a hand-typed copy would agree with
// itself whatever RealClimberRow does, which is the whole question.
// A UUID-SHAPED id, because FullProfile branches on exactly that (`/^[0-9a-f]{8}-/`) to take
// its real-profile path. A short id renders the SEED path, which is not what a browse row is
// and would have made this whole section a statement about the wrong branch.
const rawRow = { id: "3f2a91cc-0000-4000-8000-000000000001", name: "Robin Belay", username: "robinb", show_name: false, resume_public: false };
const candSrc = (row.match(/var _cand=\{([\s\S]*?)\};/) || [])[1];
const BTN = "View climbing r\u00e9sum\u00e9";
if (!candSrc) fail("ANCHOR LOST: _cand's object literal could not be lifted for the render");
else {
  // eslint-disable-next-line no-new-func
  const buildCand = new Function("p", "return {" + candSrc + "};");
  const cand = buildCand(rawRow);

  const shown = render(cand);
  if (shown.length > 400) ok(`FullProfile rendered from the row's own mapping (${shown.length} chars)`);
  else fail(`FullProfile rendered ${shown.length} chars — every absence assertion below is vacuous`);

  // The BUTTON's own label, not the word — a profile says "résumé" in several places and a
  // whole-markup match reported a correct render as broken.
  if (!shown.includes(BTN)) ok("a PRIVATE r\u00e9sum\u00e9 is not offered from a browse row");
  else fail("the r\u00e9sum\u00e9 button is on screen for a climber who made it private");

  // ...and the mirror: a climber who left it public must still get the button, or a fix that
  // simply deletes the feature would satisfy the assertion above.
  const pub = buildCand({ ...rawRow, resume_public: true });
  if (render(pub).includes(BTN)) ok("...and a PUBLIC r\u00e9sum\u00e9 is still offered");
  else fail("no r\u00e9sum\u00e9 button for a climber who left it public — the gate now hides everything");

  // The name the profile announces comes from the same mapping.
  if (/@robinb/.test(shown) && !/Robin Belay/.test(shown)) ok("the profile announces the handle, not the hidden name");
  else fail("the profile announces a name the climber chose to hide");

  const on = buildCand({ ...rawRow, show_name: true });
  if (/Robin Belay/.test(render(on))) ok("...and shows the real name when they chose to");
  else fail("a climber who chose to show their name is still rendered as a handle");
}
// ---- 7. THE MEMO'S OWN CONTRACT, which section 6 structurally cannot reach. Once _cand carries
// resumePublic, the row is safe whatever FullProfile does — so a probe that only renders through
// _cand reports a clean result while every OTHER call site is still exposed. A bare member chip
// (`{id,name,avatar}`, which is what FullProfile's own comment says arrives) is the case that
// separates them: with nothing carried, an absent field must read as HIDE.
//
// What this CANNOT prove, stated rather than implied: that the memo reads `p.resume_public`
// correctly once the profile row lands. react-query stays pending under renderToStaticMarkup, so
// `p` is always {} here and only the FALLBACK is exercised. The fallback is the dangerous
// direction and the thing being fixed; the loaded direction is source-asserted in section 4.
const chip = { id: "3f2a91cc-0000-4000-8000-000000000002", name: "Robin Belay", avatar: "" };
const chipOut = render(chip);
if (chipOut.length > 400) ok(`a bare member chip renders (${chipOut.length} chars)`);
else fail(`a bare chip rendered ${chipOut.length} chars — the assertions below are vacuous`);
if (!chipOut.includes(BTN)) ok("a chip carrying no resumePublic does NOT offer a résumé");
else fail("a chip carrying nothing offers the résumé — an absent field still reads as PUBLIC");
if (render({ ...chip, resumePublic: true }).includes(BTN)) ok("...and one that says public still does");
else fail("no résumé for a chip that says public — the memo now hides everything");


console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
