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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const fail = [];

const appFiles = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx",
  ...readdirSync(join(ROOT, "lib")).filter((f) => /\.jsx?$/.test(f)).map((f) => "lib/" + f)];
const lazyCount = appFiles.reduce((n, f) => n + (read(f).match(/\bimport\(\s*["'`]/g) || []).length, 0);

const main = read("main.jsx");
const at = main.indexOf('"vite:preloadError"');
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

if (fail.length) {
  console.error("check:chunk-reload FAILED:\n" + fail.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`check:chunk-reload OK — ${lazyCount} dynamic imports covered by one guarded reload; tab restore and all 3 engine messages recognised`);
