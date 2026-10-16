// Which third-party hosts does a SIGNED-OUT visitor's browser actually reach, walking ALL SEVEN
// tabs of the deployed site?
//
// The lawyer packet's "Who else receives a request" table is labelled "recorded from the deployed
// site while walking all six tabs". THE APP HAS SEVEN. `NAV` is
// today/routes/discover/crew/logbook/RANKS/me, and `ranks` is the exact tab that five browser
// guards also missed until check:screen-lists was written. So the packet's one MEASURED claim about
// who receives a visitor's data was taken over 6/7 of the app, and a host reached only from
// Leaderboards would be absent from a document a reviewer relies on.
//
// This is not a drift check — the packet's counts are all still correct
// (verify-legal-packet-behaviour-claims.mjs: 33/33, 4/4, 10/10, 0, 0). It closes the coverage hole
// in the one row that was measured rather than read from source.
//
// Signed out, matching the packet's stated conditions. The URL is read from the Pages deployment
// rather than hardcoded, the way check:ui does it, so a repo rename cannot leave this walking a 404
// and reporting whatever an error page loads.
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const site = (() => {
  try {
    const j = JSON.parse(execFileSync("gh", ["api", "repos/{owner}/{repo}/pages"], { encoding: "utf8" }));
    return j.html_url;
  } catch (e) { return null; }
})();
if (!site) { console.error("could not read the Pages URL from gh — refusing to guess"); process.exit(1); }
console.log(`walking ${site} signed out\n`);

const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me"];
const hosts = new Map();          // host -> Set of tabs that triggered it
let browser, code = 1;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let current = "boot";
  page.on("request", r => {
    try {
      const h = new URL(r.url()).hostname;
      if (!h || h === new URL(site).hostname) return;      // first-party
      if (!hosts.has(h)) hosts.set(h, new Map());
      const mm = hosts.get(h);
      mm.set(current, (mm.get(current) || 0) + 1);
    } catch (e) {}
  });

  await page.goto(site, { waitUntil: "commit", timeout: 180000 });
  await page.waitForFunction("document.body.innerText.length>400", null, { timeout: 180000 });

  for (const t of TABS) {
    current = t;
    // Click by accessible name — the nav labels carry counts, so textContent moves.
    // [[a-stated-limitation-is-a-worklist-not-a-caveat]] is the same tab list, one guard over.
    const label = { today: "Home", routes: "Climbs", discover: "Partners", crew: "Crew",
      logbook: "Logbook", ranks: "Ranks", me: "Profile" }[t];
    const landed = await page.evaluate(l => {
      for (const el of document.querySelectorAll("button,[role=button],a")) {
        const n = (el.getAttribute("aria-label") || el.textContent || "").trim();
        if (n === l || n.startsWith(l)) { el.click(); return true; }
      }
      return false;
    }, label);
    if (!landed) { console.log(`  FAILED to reach tab "${t}" (${label}) — a tab that is never opened has no findings`); continue; }
    // Settle: let the tab's own requests fire.
    await page.waitForTimeout(6000);
    const len = await page.evaluate(() => document.body.innerText.length);
    console.log(`  ${t.padEnd(9)} ${String(len).padStart(6)} chars`);
  }

  console.log(`\n${hosts.size} third-party host(s) reached signed out:\n`);
  for (const [h, mm] of [...hosts].sort())
    console.log(`  ${h.padEnd(34)} ${[...mm].map(([t, n]) => t + ":" + n).join("  ")}   (${[...mm.values()].reduce((a, b) => a + b, 0)} requests)`);

  /* BOOT is tracked separately from the `today` click: the first paint IS the home screen, so a
     host the packet attributes to "the home screen" must appear under boot or today. */
  const ranksOnly = [...hosts].filter(([, mm]) => mm.size === 1 && mm.has("ranks")).map(([h]) => h);
  const un = hosts.get("images.unsplash.com");
  if (un) {
    const home = (un.get("boot") || 0) + (un.get("today") || 0);
    console.log(`\nUnsplash on the HOME screen (boot + today): ${home} request(s).`);
    console.log(home
      ? `   The packet's "On the home screen, signed out" holds.`
      : `   >> The packet says "On the home screen, signed out". Measured here it is reached from\n      ${[...un.keys()].sort().join(", ")} and NOT from home — climber avatars, not the landing screen.`);
  }
  console.log(`\n${ranksOnly.length
    ? `>> ${ranksOnly.length} host(s) reached ONLY from the Ranks tab — absent from the packet by construction:\n   ${ranksOnly.join(", ")}`
    : `No host is reached only from Ranks, so the packet's host TABLE is complete despite the walk\nbeing short a tab. Its "all six tabs" wording is still wrong and should say seven.`}`);
  code = hosts.size ? 0 : 1;      // zero hosts means the capture broke, not a private app
  if (!hosts.size) console.log(`\nNO third-party host recorded at all — the capture is broken, not the app clean.`);
} catch (e) {
  console.error("walk failed:", String(e).slice(0, 300));
} finally {
  if (browser) await browser.close().catch(() => {});
}
process.exit(code);
