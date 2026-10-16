// Does an open dialog stop the page BEHIND it from scrolling? Opens the notifications panel
// (the reported case) through the overlay scaffold's ?z= opener, wheels over it, and asserts the
// document did not move, the root is locked while open, and the lock is released on close.
// PROBE_URL=<served build> skips the dev server (a static build answers on a loaded box).
// Non-vacuous: the same wheel with NO dialog open must scroll the page, or the tab was too short
// to prove anything.
import { assertQuietBox } from "../lib/quiet-box.mjs";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
// A browser verdict from an oversubscribed box is not evidence; see scripts/lib/quiet-box.mjs.
assertQuietBox("probe-dialog-locks-page-scroll.mjs");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const vite = process.env.PROBE_URL ? null : spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, env: { ...process.env, VITE_USE_DB: "false" }, stdio: "ignore" });
let fails = 0; const ok = (c, m) => { console.log((c ? "ok    " : "FAIL  ") + m); if (!c) fails++; };
let browser;
try {
  const base = process.env.PROBE_URL || `http://127.0.0.1:${port}/Climbing-App/`;
  for (let i = 0; i < 180; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 1000)); }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(180000);
  const settle = () => page.waitForFunction(() => document.body.innerText.length > 400, null, { timeout: 180000 });
  // control: no dialog, the page itself scrolls
  await page.goto(base + "?zt=crew"); await settle(); await page.waitForTimeout(1500);
  await page.mouse.move(195, 500); await page.mouse.wheel(0, 600); await page.waitForTimeout(800);
  const ctl = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight }));
  ok(ctl.y > 0, `control: with no dialog the page scrolls (scrollY ${ctl.y}, doc ${ctl.h}px)`);
  // the reported case
  await page.goto(base + "?zt=crew&z=notifOpen"); await settle();
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ y: scrollY, ov: document.documentElement.style.overflow }));
  ok(before.ov === "hidden", `root is locked while the panel is open (overflow="${before.ov}")`);
  await page.mouse.move(195, 500); await page.mouse.wheel(0, 600); await page.waitForTimeout(800);
  const after = await page.evaluate(() => scrollY);
  ok(after === before.y, `wheel over the panel does not scroll the page behind (${before.y} -> ${after})`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(1500);
  const rel = await page.evaluate(() => ({ d: !!document.querySelector('[role="dialog"]'), ov: document.documentElement.style.overflow }));
  ok(!rel.d && rel.ov === "", `closing releases the lock (dialog=${rel.d}, overflow="${rel.ov}")`);
} finally { if (browser) await browser.close(); if (vite) vite.kill(); }
console.log(fails ? `${fails} FAILED` : "all ok"); process.exit(fails ? 1 : 0);
