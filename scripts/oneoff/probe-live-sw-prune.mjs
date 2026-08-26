// Does the service worker's deploy-generation PRUNE actually work on production?
//
// `public/sw.js` documents the defect it fixes: the shell cache name is a constant, so
// `activate` never evicts anything, and Vite content-hashes every asset — "~2 MB of assets per
// deploy, 34 successful deploys in one working day", growing without bound until the browser
// evicts the whole origin under quota pressure. The fix prunes on NAVIGATION, keyed on the entry
// bundle's hashed filename stored under a `__shell_generation__` marker.
//
// That mechanism has never been checked against the deployed site. This does it end to end:
//   1. load production, let the worker install and cache the shell;
//   2. confirm the marker matches the bundle the site is actually serving;
//   3. plant a FAKE previous-deploy asset plus an old marker;
//   4. navigate again — the prune should fire;
//   5. confirm the fake is gone and the marker is back to the live bundle.
//
// Step 3 is what makes this a test rather than an observation: without it a passing run only
// says "the cache currently looks tidy", which is also true of a prune that never runs.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const SCOPE = "/Climbing-App/";
let problems = 0;
const fail = (m) => { problems++; console.log("  FAIL " + m); };

const browser = await chromium.launch({ channel: "chrome", headless: true });
// A persistent-ish context: service workers need a real origin and storage.
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log("1. loading production and waiting for the worker to take control");
await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(6000);

const state = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const names = await caches.keys();
  return {
    registered: !!reg,
    active: !!(reg && reg.active),
    scope: reg ? reg.scope : null,
    caches: names,
  };
});
console.log(`   registered=${state.registered} active=${state.active}`);
console.log(`   caches: ${JSON.stringify(state.caches)}`);
if (!state.registered) fail("no service worker registered on production");

// The bundle the SITE is serving right now, from the markup — the ground truth the marker
// should agree with.
const liveBundle = await page.evaluate(() =>
  [...document.querySelectorAll("script[src]")].map((s) => s.src).find((u) => /assets\/index-/.test(u)) || null);
console.log(`   live bundle: ${liveBundle ? liveBundle.split("/").pop() : "(none found)"}`);

async function readCache() {
  return page.evaluate(async (scope) => {
    const names = await caches.keys();
    const shell = names.find((n) => n.startsWith("climbmatch-shell"));
    if (!shell) return { shell: null };
    const c = await caches.open(shell);
    const keys = (await c.keys()).map((k) => k.url);
    const markerUrl = new URL("__shell_generation__", location.origin + scope).toString();
    const m = await c.match(markerUrl);
    return { shell, keys, marker: m ? await m.text() : null, markerUrl };
  }, SCOPE);
}

let cache = await readCache();
console.log(`\n2. shell cache: ${cache.shell || "(absent)"}`);
if (!cache.shell) fail("no climbmatch-shell cache after a load — the worker cached nothing");
else {
  console.log(`   entries: ${cache.keys.length}, marker: ${JSON.stringify(cache.marker)}`);
  const assets = cache.keys.filter((u) => u.includes("/assets/"));
  console.log(`   cached /assets/: ${assets.length}`);
  if (cache.marker && liveBundle && !liveBundle.includes(cache.marker)) {
    fail(`marker ${JSON.stringify(cache.marker)} does not match the served bundle ${liveBundle.split("/").pop()}`);
  }
  // Every cached asset should belong to the CURRENT deploy. A stale one is the growth defect.
  const stale = assets.filter((u) => cache.marker && /assets\/index-[A-Za-z0-9_-]+\.js$/.test(u) && !u.includes(cache.marker));
  if (stale.length) fail(`${stale.length} cached entry bundle(s) from an older deploy: ${stale.slice(0, 3).join(", ")}`);
}

if (cache.shell) {
  console.log("\n3. planting a fake previous-deploy asset and an old marker");
  const planted = await page.evaluate(async ({ shell, markerUrl, scope }) => {
    const c = await caches.open(shell);
    const fake = new URL("assets/index-STALEDEPLOY0.js", location.origin + scope).toString();
    await c.put(fake, new Response("// stale", { headers: { "content-type": "application/javascript" } }));
    await c.put(markerUrl, new Response("assets/index-STALEDEPLOY0.js"));
    const keys = (await c.keys()).map((k) => k.url);
    return { fake, has: keys.includes(fake), marker: await (await c.match(markerUrl)).text() };
  }, { shell: cache.shell, markerUrl: cache.markerUrl, scope: SCOPE });
  console.log(`   planted=${planted.has} marker now ${JSON.stringify(planted.marker)}`);
  if (!planted.has) fail("could not plant the fake asset — step 4 would prove nothing");

  console.log("\n4. navigating again so the prune runs");
  await page.goto(SITE + "?swprune=1", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(6000);

  cache = await readCache();
  console.log(`\n5. after navigation: entries=${cache.keys ? cache.keys.length : "?"} marker=${JSON.stringify(cache.marker)}`);
  const fakeLeft = (cache.keys || []).some((u) => u.includes("STALEDEPLOY0"));
  if (fakeLeft) fail("the fake previous-deploy asset SURVIVED the navigation — the prune did not run");
  else console.log("   the fake stale asset was pruned");
  if (cache.marker && liveBundle && !liveBundle.includes(cache.marker)) {
    fail(`marker was not restored to the live deploy (still ${JSON.stringify(cache.marker)})`);
  } else if (cache.marker) console.log("   marker restored to the live deploy");
}

console.log(problems ? `\n${problems} problem(s).` : "\nthe deploy-generation prune works on production.");
await browser.close();
process.exit(problems ? 1 : 0);
