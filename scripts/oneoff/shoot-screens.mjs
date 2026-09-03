#!/usr/bin/env node
// Capture each tab at phone size so a HUMAN (or a model that can see) can look at it.
// Every browser guard in this repo reads text or geometry; none of them can tell whether
// a screen looks right. This exists to be looked at, not to assert.
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = process.env.SHOT_DIR || path.join(ROOT, "node_modules", ".shots");
fs.mkdirSync(OUT, { recursive: true });

const freePort = async (lo, hi) => {
  for (let p = lo; p <= hi; p++) {
    const ok = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (ok) return p;
  }
  return null;
};
const port = await freePort(5420, 5459);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up) { console.error("dev server never came up"); stop(); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.setDefaultNavigationTimeout(120000);
await page.goto(base, { waitUntil: "domcontentloaded" });
await settledText(page);

let routeMissed = false;
const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"];
for (const t of TABS) {
  const ok = await page.evaluate((label) => {
    const el = [...document.querySelectorAll("[aria-label]")].find((e) => {
      const l = e.getAttribute("aria-label");
      return l === label || l.startsWith(label + ",") || l.startsWith(label + " ");
    });
    if (!el) return false;
    el.click();
    return true;
  }, t);
  if (!ok) { console.log(`  ${t}: nav control not found`); continue; }
  await settledText(page);
  const f = path.join(OUT, t.toLowerCase() + ".png");
  await page.screenshot({ path: f });
  console.log(`  ${t} -> ${f}`);
}

// ---- the route page and its six sub-tabs ----------------------------------------
// The richest layout in the app, and the one surface the clipping sweep MEASURED and
// nobody ever LOOKED at. `?zr=1` calls the app's own openRoute() from inside the shared
// opener. Sub-tab ORDER matters: check:overflow records that "Reports" clicks from
// Overview and does not from Photos.
await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
if (!(await page.evaluate(() => window.__routeOpen === true))) {
  console.error("  route page NOT REACHED - ?zr=1 never set window.__routeOpen. Shots below are missing, not clean.");
  routeMissed = true;
} else {
  await settledText(page);
  const seen = new Map();
  for (const sub of ["Overview", "Reports", "Photos", "Partners", "Plan", "Safety"]) {
    if (!(await tapByText(page, sub))) { console.log(`  route:${sub}: sub-tab not found`); continue; }
    await settledText(page);
    // A click that returns TRUE is not evidence it navigated -- two elements carry the text
    // "Reports", and a guard once reported six clean sub-tabs while shooting Overview six
    // times. Fingerprint the screen so a repeat is visible rather than filed as coverage.
    const fp = await page.evaluate(() => (document.body.innerText || "").length);
    const dup = seen.get(fp);
    seen.set(fp, sub);
    const f = path.join(OUT, "route-" + sub.toLowerCase() + ".png");
    await page.screenshot({ path: f, fullPage: true });
    console.log(`  route:${sub} -> ${f}${dup ? `  <-- SAME SCREEN as ${dup} (${fp} chars): the click did not land` : ` (${fp} chars)`}`);
    if (dup) routeMissed = true;
  }
}

await browser.close();
stop();
console.log("\nshots in " + OUT);
if (routeMissed) { console.error("a route screen was not reached - that is a broken walk, not a clean page."); process.exit(1); }
