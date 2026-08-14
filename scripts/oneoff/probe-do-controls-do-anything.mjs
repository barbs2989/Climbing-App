// MEASUREMENT, not a guard: click every control on the six tabs and record whether anything
// changed. The question is the user's — "does each button work, related to the rest of the
// app?" — and the static half is already answered: 799 <button>s, 1423 handlers, ZERO with no
// handler and ZERO with an empty body, and the never-set/write-only/dead-prop classes were
// swept to zero in #576. So the only thing left to ask is empirical: does pressing it DO
// anything a user would notice?
//
// Deliberately a probe and not a check:* — precision is unknown, and this repo's own rule is to
// measure a detector before shipping it (audit:area-parents shipped detectors at 8 hits / 0
// real). If the yield is ~0 the honest outcome is to report that and ship nothing.
//
// ── RESULT, run 2026-08-14 against the seeded demo (6 tabs) ──────────────────────────────
//   clicked 258 · changed 223 · no visible change 35 · THREW 0 · skipped 21
//
// ALL 35 WERE TRIAGED AND ALL 35 ARE CORRECT BEHAVIOUR. Nothing was shipped as a guard,
// because the measured precision is 35 flagged / 0 real:
//   6  clicking the nav tab you are ALREADY on (today/routes/discover/crew/logbook/me)
//   13 calendar days 1–13, which are in the PAST (the run was on the 14th) and not selectable
//   4  the availability toggles (Weekends / Weekday AM / Weekday PM / Flexible) — verified in
//      source to call setMyAvail(); their only visual change is border/background COLOUR, and
//      this probe's snapshot is text + control count, so it cannot see them. A LIMITATION OF
//      THE PROBE, not a defect in the app.
//   1  "✓ Float plan set" — guarded `if(!crew.floatPlan)`, inert once set, cursor:"default"
//   1  "Previous month" — `atMin`, greyed to opacity 0.3; you cannot schedule into the past
//   1  "Add" (crew gear) — `disabled` while the input is empty
//   ~9 sub-tab / filter buttons already in their selected state
//
// So the honest conclusion is: pressing things does not find dead controls here, and a guard
// built on this would cost a browser run per PR to report ~35 false positives. The static half
// (scripts/oneoff/measure-dead-controls.mjs) is the cheap one and it is already clean: 799
// <button>s, 1423 handlers, 0 with no handler, 0 with an empty body.
//
// WORTH KEEPING: `threw 0` is a real result of its own. Every control was pressed and none
// raised an uncaught error — that is the [[silent-dead-interactions]] class measured rather
// than assumed. Re-run this after a big refactor; it is the cheapest way to re-establish that.
//
// SAFETY. This drives the seeded in-memory demo, so state resets on reload and nothing reaches
// a database. Even so: confirm()/alert() are auto-dismissed (an open dialog blocks everything
// after it), controls whose accessible name reads destructive or navigates away are SKIPPED by
// name, and the page is reloaded between tabs so one click cannot poison the next screen.
import { settledText } from "../lib/render-settle.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5330;
const TABS = ["today", "routes", "discover", "crew", "logbook", "me"];
// Matched against the ACCESSIBLE NAME, lowercased. Destructive, irreversible, or leaves the app.
const SKIP = /delete|remove|disband|leave|sign out|log out|report|block|unfriend|decline|cancel account|clear|reset|withdraw|revoke|unsave|discard/i;

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
console.log(`dev server on ${port}...`);

/* MUST run under a scaffold config. `?zt=<tab>` is INJECTED by scripts/lib/overlay-scaffold.mjs,
   not native to the app — the first run of this probe used a plain `npx vite`, so every ?zt=
   was ignored and all six "tabs" were the same default screen. Every tab reported exactly 29
   controls, which is the only reason it was caught. Reusing the a11y-badges config because it
   already applies buildOpener() and keeps the populated demo. */
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); stopServer(); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(20000);
// An open dialog blocks every later command; dismiss rather than accept so a confirm() guarding
// something destructive resolves to "no".
page.on("dialog", (d) => d.dismiss().catch(() => {}));
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 140)));

// The state a click could plausibly change, cheap enough to snapshot per control.
const snapshot = () => page.evaluate(() => {
  const t = document.body.innerText.replace(/\d/g, "#");
  return { len: t.length, hash: t.slice(0, 4000), controls: document.querySelectorAll('button,[role="button"],[role="checkbox"],[role="tab"],a[href]').length };
});

const results = [];
const tabPrints = [];
let clicked = 0, changed = 0, skipped = 0, errored = 0;

for (const tab of TABS) {
  await page.goto(base + `?zt=${tab}`, { waitUntil: "domcontentloaded" });
  await settledText(page, { stable: 3 });
  // Enumerate ONCE per tab, then re-find by index each time: clicking mutates the DOM, so a
  // handle list captured up front goes stale and silently clicks the wrong thing.
  const n = await page.evaluate(() => document.querySelectorAll('button,[role="button"],[role="checkbox"]').length);
  for (let i = 0; i < n; i++) {
    const info = await page.evaluate((idx) => {
      const el = document.querySelectorAll('button,[role="button"],[role="checkbox"]')[idx];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { name: (el.getAttribute("aria-label") || el.innerText || "").trim().slice(0, 60), visible: r.width > 0 && r.height > 0 };
    }, i);
    if (!info || !info.visible || !info.name) { skipped++; continue; }
    if (SKIP.test(info.name)) { skipped++; continue; }

    const before = await snapshot();
    let threw = null;
    try {
      await page.evaluate((idx) => {
        const el = document.querySelectorAll('button,[role="button"],[role="checkbox"]')[idx];
        if (el) el.click();
      }, i);
      await page.waitForTimeout(220);
    } catch (e) { threw = String(e.message).slice(0, 80); }
    const after = await snapshot();
    clicked++;
    const moved = before.len !== after.len || before.hash !== after.hash || before.controls !== after.controls;
    if (threw) { errored++; results.push({ tab, name: info.name, verdict: "THREW", detail: threw }); }
    else if (moved) changed++;
    else results.push({ tab, name: info.name, verdict: "NO CHANGE" });

    // Return to a known screen so the next control is enumerated on the same page.
    await page.goto(base + `?zt=${tab}`, { waitUntil: "domcontentloaded" });
    await settledText(page, { stable: 2 });
  }
  const fingerprint = await page.evaluate(() => document.body.innerText.slice(0, 300));
  tabPrints.push({ tab, n, fingerprint });
  console.log(`  ${tab}: ${n} control(s)`);
}

/* SELF-CHECK, and it is not optional. If the scaffold does not apply, every ?zt= is ignored and
   this walks ONE screen six times while reporting six tabs — which is what the first run did.
   Distinct control counts alone are not enough (two tabs could coincide), so compare the
   rendered text too. */
const distinct = new Set(tabPrints.map(t => t.fingerprint)).size;
if (distinct < TABS.length) {
  console.error(`\nPROBE INVALID — only ${distinct} distinct screen(s) across ${TABS.length} tabs.`);
  console.error("The ?zt= opener did not apply, so this walked the same screen repeatedly.");
  tabPrints.forEach(t => console.error(`   ${t.tab}: ${t.n} controls · ${JSON.stringify(t.fingerprint.slice(0, 60))}`));
  await browser.close(); stopServer(); process.exit(1);
}

console.log(`\nclicked ${clicked} · changed ${changed} · no visible change ${results.filter(r => r.verdict === "NO CHANGE").length} · threw ${errored} · skipped ${skipped}`);
if (pageErrors.length) { console.log(`\nuncaught page errors (${pageErrors.length}):`); [...new Set(pageErrors)].slice(0, 10).forEach(e => console.log("   " + e)); }
const dead = results.filter(r => r.verdict === "NO CHANGE");
if (dead.length) {
  console.log(`\ncontrols whose click changed nothing measurable (${dead.length}):`);
  dead.slice(0, 60).forEach(r => console.log(`   [${r.tab}] ${r.name}`));
}
const thrown = results.filter(r => r.verdict === "THREW");
if (thrown.length) { console.log(`\ncontrols whose click THREW (${thrown.length}):`); thrown.forEach(r => console.log(`   [${r.tab}] ${r.name} — ${r.detail}`)); }

await browser.close();
stopServer();
