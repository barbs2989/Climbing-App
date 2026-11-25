// A screen split off the startup bundle must survive a deploy landing while the app is open.
//
//   npm run check:chunk-reload     (also gated by `npm run build`)
//
// Every Pages deploy replaces every hashed chunk in dist/. A tab opened before the deploy still
// runs the old index chunk, whose lazy imports name files that now 404, so the first visit to a
// lazily-loaded screen threw and AppErrorBoundary said "This screen hit a bug · Reload" (hit on
// Partners, 2026-09-24, #1851). The screen had no bug; a reload fetched the new build. main.jsx
// now answers Vite's `vite:preloadError` by reloading once, and nothing else would notice if
// that handler were deleted — the failure only exists across a deploy, which no walk crosses.
//
// Asserted, statically (no browser, no dev server):
//   1. If any screen is lazy/import()-loaded, main.jsx registers `vite:preloadError`, calls
//      preventDefault() and location.reload(), and guards it with a sessionStorage timestamp —
//      without the guard, a chunk that is missing for any other reason (offline) reloads forever.
//   2. The marker key main.jsx writes is the key ClimbMatch.jsx reads to reopen the tab the
//      climber tapped. The two are hand-copies; a rename of one silently lands them on Home.
//   3. AppErrorBoundary's chunk-error test still matches the message each engine throws, so the
//      card that shows when the reload cannot help does not call it a bug.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { componentFiles } from "./lib/guard-sources.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const fail = [];

const appFiles = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx",
  ...componentFiles(ROOT, { js: true, guard: "check:chunk-reload" })];
const lazyCount = appFiles.reduce((n, f) => n + (read(f).match(/\bimport\(\s*["'`]/g) || []).length, 0);

const main = read("main.jsx");
const at = main.indexOf('"vite:preloadError"');
const at0 = at;
if (lazyCount && at < 0) {
  fail.push(`${lazyCount} dynamic import()s in the app, but main.jsx no longer listens for "vite:preloadError" — a tab open across a deploy shows "This screen hit a bug" on every lazy screen`);
} else if (at >= 0) {
  const body = main.slice(at, at + 1200);
  if (!/preventDefault\(\)/.test(body)) fail.push("main.jsx's vite:preloadError handler never calls preventDefault(), so Vite rethrows the import error into the error boundary even while reloading");
  if (!/location\.reload\(\)/.test(body)) fail.push("main.jsx's vite:preloadError handler no longer reloads the page");
  if (!/sessionStorage\.getItem\(/.test(body) || !/sessionStorage\.setItem\(/.test(body)) fail.push("main.jsx's vite:preloadError handler has no sessionStorage guard — a chunk missing for any reason other than a deploy (offline) would reload forever");
}

const key = (main.match(/CHUNK_RELOAD_KEY\s*=\s*"([^"]+)"/) || [])[1];
if (!key) fail.push("main.jsx no longer declares CHUNK_RELOAD_KEY — update this check to find the reload marker");
else if (!read("ClimbMatch.jsx").includes(`"${key}"`)) fail.push(`ClimbMatch.jsx never reads "${key}" — after the automatic reload the climber lands on Home instead of the tab they tapped`);

const boundary = read("AppErrorBoundary.jsx");
const reSrc = (boundary.match(/const chunk = \/(.+)\/(\w*)\.test\(/) || []);
if (!reSrc[1]) fail.push("AppErrorBoundary.jsx no longer has its `const chunk = /…/.test(` chunk-error test — a download failure will read as a bug");
else {
  const re = new RegExp(reSrc[1], reSrc[2]);
  for (const [engine, msg] of [
    ["Chrome", "Failed to fetch dynamically imported module: https://x/assets/PartnerSearch-abc.js"],
    ["Firefox", "error loading dynamically imported module: https://x/assets/PartnerSearch-abc.js"],
    ["Safari", "Importing a module script failed."],
  ]) if (!re.test(msg)) fail.push(`AppErrorBoundary's chunk-error test no longer matches ${engine}'s message ("${msg}")`);
}

// preventDefault() above stops Vite rethrowing the import error -- and Vite then resolves the import to
// UNDEFINED, so React.lazy throws its own "reading 'default'" TypeError into the boundary while the
// reload is in flight (2026-11-18, signed-in walk: Menu > Listed areas across a deploy drew "This screen
// hit a bug ... (reading 'default')" and stayed). The boundary must read main.jsx's marker and call that
// error the deploy, in each engine's wording.
const chunkLib = read("lib/chunkReload.js");
if (key && !chunkLib.includes(`"${key}"`)) fail.push(`lib/chunkReload.js never reads "${key}" — a lazy screen whose file a deploy removed shows "This screen hit a bug (reading 'default')" while main.jsx reloads`);
for (const [f, what] of [["AppErrorBoundary.jsx", "the whole-app card"], ["lib/SectionErrorBoundary.jsx", "a section's card"]]) {
  const src = read(f);
  if (!/import \{[^}]*\bswallowedChunk\b[^}]*\} from "[^"]*chunkReload\.js"/.test(src) || !/swallowedChunk\(msg\)/.test(src)) fail.push(`${f} no longer asks swallowedChunk(msg) — ${what} calls a deploy's missing file a bug while main.jsx reloads`);
}
const sw = chunkLib.match(/if \(!\/(.+?)\/(\w*)\.test\(msg\)\) return false;/) || [];
if (!sw[1]) fail.push("lib/chunkReload.js no longer has swallowedChunk's `if (!/…/.test(msg)) return false;` — update this check");
else for (const [engine, msg] of [
  ["Chrome", "Cannot read properties of undefined (reading 'default')"],
  ["Firefox", "can't access property \"default\", n is undefined"],
  ["Safari", "undefined is not an object (evaluating 'n.default')"],
]) if (!new RegExp(sw[1], sw[2]).test(msg)) fail.push(`AppErrorBoundary's swallowed-chunk test no longer matches ${engine}'s message ("${msg}")`);

// A history step after location.reload() CANCELS the reload (measured live 2026-11-18). The deploy
// reload's error unmounts App when it reaches AppErrorBoundary, and lib/backButton.js steps history on
// unmount -- so main.jsx must flag the reload first, and backButton.js must not step while it is flagged.
if (at0 >= 0) {
  const body0 = main.slice(at0, at0 + 1400);
  const n = body0.indexOf("noteReloadPending()"), r = body0.indexOf("location.reload()");
  if (n < 0 || n > r) fail.push("main.jsx's vite:preloadError handler no longer calls noteReloadPending() BEFORE location.reload() — lib/backButton.js's unmount cleanup then steps history and cancels the reload, leaving the climber on the error card");
}
{
  const bb = read("lib/backButton.js");
  const backs = (bb.match(/history\.back\(\)/g) || []).length;
  const guarded = (bb.match(/isReloadPending\(\)/g) || []).length;
  if (!/import \{[^}]*\bisReloadPending\b[^}]*\} from "\.\/chunkReload\.js"/.test(bb) || guarded < 2) fail.push(`lib/backButton.js steps history (${backs} history.back() calls) without asking isReloadPending() in both its disarm and its unmount cleanup — a deploy reload is cancelled and the climber is left on the error card`);
}

// THE ENTRY BUNDLE itself can be the missing file (owner's Chrome, 2026-11-18: a page reused from the
// HTTP cache named an entry a second deploy had deleted; the splash spun for good). Everything above
// lives INSIDE that bundle, so index.html must carry its own classic-script fallback, BEFORE the entry.
{
  const html = read("index.html");
  const entry = html.indexOf('<script type="module"');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((m) => m.index < entry && /addEventListener\("error"/.test(m[1]));
  if (entry < 0) fail.push("index.html has no module entry script — update this check");
  else if (!inline) fail.push("index.html has no classic inline script listening for \"error\" before the module entry — a cached page naming an entry bundle a deploy removed leaves the splash spinning forever");
  else {
    const b = inline[1];
    if (!/\},\s*true\s*\)/.test(b)) fail.push("index.html's boot fallback does not listen in the CAPTURE phase — a script's load error does not bubble, so it would never hear one");
    if (!/tagName\s*!==\s*"SCRIPT"/.test(b)) fail.push("index.html's boot fallback no longer limits itself to a failed SCRIPT — any broken image would reload the app");
    if (!/sessionStorage\.getItem\(/.test(b) || !/sessionStorage\.setItem\(/.test(b)) fail.push("index.html's boot fallback has no sessionStorage guard — an entry missing for any other reason would reload forever");
    if (!/cache:\s*"reload"/.test(b)) fail.push("index.html's boot fallback no longer re-fetches the page past the HTTP cache before reloading — the reload can be handed the same stale page");
    if (!/location\.reload\(\)/.test(b)) fail.push("index.html's boot fallback no longer reloads the page");
  }
}

if (fail.length) {
  console.error("check:chunk-reload FAILED:\n" + fail.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`check:chunk-reload OK — ${lazyCount} dynamic imports covered by one guarded reload; tab restore and all 3 engine messages recognised`);
