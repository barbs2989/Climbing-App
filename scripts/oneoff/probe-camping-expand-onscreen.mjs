// Does the camping disclosure actually OPEN?
//
// `check:camping` proves the prose is selected by campDetail() and that a labelled control
// exists — and says plainly that it cannot prove the tap works, because SSR renders initial
// state and cannot click. That leaves the one failure this change could cause proven by
// nothing: a disclosure that never opens makes 5,083 sites of researched prose unreachable,
// which is the `descent_text` shape (populated on 1,021 routes, rendered on none).
//
// So it gets driven in a real browser. Three assertions, and the FIRST one is what stops this
// being vacuous: the prose must be absent while collapsed. A probe that only checks "the prose
// is on screen after I clicked" passes just as happily against a panel that never collapsed at
// all, which is the exact defect on the other side.
//
// Fixture injected in memory by scripts/camping-expand.config.mjs — seed ROUTES carry no bivy.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";
import { FIXTURE } from "../camping-expand.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5390;
const log = (m) => console.log(m);

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
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port} with ${FIXTURE.length} injected bivy site(s)...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/camping-expand.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) {
  console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
  stopServer(); process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).catch(() => {});
await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});

// The app must actually be on screen. index.html's boot placeholder mirrors the real nav, so a
// blank app still reports "nav present" — the trap check:overlay-scroll records, where a broken
// scaffold exited 0 having verified nothing.
const opened = await page.evaluate(() => window.__routeOpen === true);
if (!opened) { console.log("  FAIL  ?zr=1 never opened a route — nothing below was checked."); stopServer(); process.exit(1); }
ok("?zr=1 opened the route detail screen");

// Plan is where the panel lives. Sub-tab clicks must skip fixed/sticky chrome: a sub-tab name
// collides with the bottom nav and a global text match silently leaves the route page.
const tapped = await page.evaluate(() => {
  const hit = [...document.querySelectorAll("button,div,span,a")]
    .filter((e) => (e.innerText || "").trim() === "Plan")
    .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; });
  if (!hit.length) return false;
  hit[0].click(); return true;
});
if (!tapped) { console.log("  FAIL  could not reach the Plan sub-tab — nothing below was checked."); stopServer(); process.exit(1); }
await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});

const TOKENS = ["ZZCAPACITYZZ", "ZZWATERZZ", "ZZPERMITZZ", "ZZNOTESZZ"];
const seen = () => page.evaluate((t) => {
  const txt = document.body.innerText || "";
  return t.filter((k) => txt.includes(k));
}, TOKENS);

// 1. The panel is there at all, and the site is identified while collapsed.
const body0 = await page.evaluate(() => document.body.innerText || "");
if (body0.includes("CAMPING & BIVY")) ok("CAMPING & BIVY renders on the Plan tab");
else fail("no CAMPING & BIVY panel on the Plan tab — the fixture did not reach the screen");
if (body0.includes(FIXTURE[0].name)) ok(`the collapsed row names the site (${FIXTURE[0].name})`);
else fail("the collapsed row does not name the site");

// 2. COLLAPSED: none of the prose is on screen. Without this the probe would pass against a
//    panel that never collapsed, which is the defect on the other side.
const before = await seen();
if (before.length === 0) ok("collapsed: none of the prose is on screen");
else fail(`collapsed: prose is already visible (${before.join(", ")}) — the collapse is not working`);

// 3. Click the labelled control and the prose appears. Found by accessible name, which is what
//    a screen reader uses and what the guard asserts — not by position or nth-child.
const clicked = await page.evaluate(() => {
  const el = [...document.querySelectorAll('[aria-label]')]
    .find((e) => /camping detail for/i.test(e.getAttribute("aria-label") || ""));
  if (!el) return null;
  el.click();
  return el.getAttribute("aria-label");
});
if (!clicked) fail("no control with an aria-label naming camping detail — the prose is unreachable");
else {
  ok(`clicked ${JSON.stringify(clicked)}`);
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  const after = await seen();
  const missing = TOKENS.filter((t) => !after.includes(t));
  if (!missing.length) ok("expanded: capacity, water, permit and notes all reached the screen");
  else fail(`expanded: still missing ${missing.join(", ")} — the disclosure opened but did not reveal everything`);

  // 4. And it closes again. A one-way disclosure leaves the panel exactly as long as before
  //    once a climber has opened a few, which is the thing this change exists to prevent.
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('[aria-label]')]
      .find((e) => /camping detail for/i.test(e.getAttribute("aria-label") || ""));
    if (el) el.click();
  });
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  const closed = await seen();
  if (closed.length === 0) ok("collapses again on a second tap");
  else fail(`did not collapse again — ${closed.join(", ")} still on screen`);
}

if (pageErrors.length) fail(`uncaught page error(s): ${pageErrors.slice(0, 3).join(" | ")}`);
else ok("no uncaught page errors");

await browser.close();
stopServer();
console.log(failures ? `\ncamping expand probe: ${failures} failure(s).` : "\ncamping expand probe: ok — the collapse hides the prose and the tap brings it back.");
process.exit(failures ? 1 : 0);
