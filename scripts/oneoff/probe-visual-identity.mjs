// Hand-run probe for the 2026-11-23 visual identity (palette, fonts, contour texture): the four things
// the PRs listed as "not verified". Drives the LIVE site at phone size as a guest.
//
//   node scripts/oneoff/probe-visual-identity.mjs <out-dir>
//
// 1. The splash and the sign-in screen draw, with the contour texture behind them.
// 2. Phone width (390x844): Home, Climbs, Logbook, Profile and a route page, with no sideways scroll.
// 3. A route header over a cover photo: the grade stamp and the name are readable.
// 4. Offline: after one online visit, the fonts and the texture load with the network off.
//
// Not a guard: it writes screenshots for a person to look at, and prints the measurements it can make.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { assertQuietBox } from "../lib/quiet-box.mjs";

// A browser verdict from an oversubscribed box is not evidence; refuse there rather than mislead.
assertQuietBox("probe-visual-identity.mjs");

const OUT = process.argv[2];
if (!OUT) { console.error("usage: probe-visual-identity.mjs <out-dir>"); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const URL = "https://barbs2989.github.io/Climbing-App/";
const shot = (page, name) => page.screenshot({ path: join(OUT, name + ".png") });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const fontsUsed = (page) => page.evaluate(() => [...document.fonts].filter((f) => /Barlow|Plex/.test(f.family) && f.status === "loaded").map((f) => f.family + " " + f.weight));

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const out = {};

// 1. splash: stall the app bundle so the boot splash stays on screen long enough to photograph
let release; const gate = new Promise((r) => { release = r; });
await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => { await gate; await route.continue(); });
await page.goto(URL, { waitUntil: "commit" });
await page.waitForSelector("#cm-splash", { timeout: 15000 });
await page.waitForTimeout(1200);
out.splashBg = await page.evaluate(() => getComputedStyle(document.getElementById("cm-splash")).backgroundImage.slice(0, 90));
await shot(page, "1-splash");
release();

// sign-in screen
await page.getByRole("button", { name: /view as guest/i }).first().waitFor({ timeout: 30000 });
await page.waitForTimeout(800);
out.signInOverflow = await overflow(page);
await shot(page, "2-sign-in");

// 2. phone width as a guest
await page.getByRole("button", { name: /view as guest/i }).first().click();
await page.waitForSelector('[aria-current="page"]', { timeout: 30000 });
await page.waitForTimeout(2500);
const tab = async (label, file) => {
  await page.getByRole("button", { name: new RegExp("^" + label, "i") }).first().click();
  await page.waitForTimeout(2500);
  out[file + "Overflow"] = await overflow(page);
  await shot(page, file);
};
out.homeOverflow = await overflow(page); await shot(page, "3-home");
await tab("Climbs", "4-climbs");
await tab("Logbook", "5-logbook");
await tab("Profile", "6-profile");

// 3. a route page, preferring one whose header has a cover photo
await tab("Logbook", "5-logbook");
const firstClimb = page.locator('[role="button"], button').filter({ hasText: /Dihedral|Route|Ridge|Slab|Crack|Wall/ }).first();
await firstClimb.click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(4000);
out.routeTitle = await page.title();
out.routeOverflow = await overflow(page);
out.routeH1 = await page.evaluate(() => { const h = [...document.querySelectorAll("h1")].find((x) => x.offsetParent); if (!h) return null; const cs = getComputedStyle(h); return { text: h.textContent.slice(0, 40), font: cs.fontFamily.slice(0, 24), size: cs.fontSize }; });
out.routeHasCover = await page.evaluate(() => [...document.querySelectorAll("div")].some((d) => /url\(/.test(d.style.backgroundImage || "") && d.querySelector("h1")));
await shot(page, "7-route");
out.fontsLoadedOnline = await fontsUsed(page);

// 4. offline: the service worker has had one online visit; cut the network and reload
await page.waitForTimeout(6000); // let the worker finish its install-time precache
out.swControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
out.cached = await page.evaluate(async () => { const c = await caches.open("climbmatch-shell-v1"); const keys = (await c.keys()).map((r) => r.url); return { fonts: keys.filter((u) => /\/fonts\/.*woff2$/.test(u)).length, topo: keys.some((u) => /topo\.svg$/.test(u)), total: keys.length }; });
await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" }).catch((e) => { out.offlineReloadError = String(e).slice(0, 120); });
await page.waitForTimeout(6000);
out.offline = await page.evaluate(async () => {
  const get = (u) => fetch(u).then((r) => r.status).catch(() => "failed");
  return { topo: await get("/Climbing-App/topo.svg"), font: await get("/Climbing-App/fonts/barlow-condensed-latin-700-normal.woff2"), fontExt: await get("/Climbing-App/fonts/ibm-plex-mono-latin-ext-600-normal.woff2"), bodyText: document.body.innerText.slice(0, 60).replace(/\s+/g, " ") };
}).catch((e) => ({ error: String(e).slice(0, 120) }));
await shot(page, "8-offline");

console.log(JSON.stringify(out, null, 1));
await browser.close();
