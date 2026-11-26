#!/usr/bin/env node
// The phone tab bar: floating, rounded, opaque, and it steps aside while you scroll DOWN (owner's note,
// 2026-11-26: "should we make it rounded? ... opaque? ... when people are scrolling downwards it hides like
// the app Hinge"). Drives the real app as a phone at 390px and 320px and asserts:
//   - the bar is rounded, inset from the screen's edges, and its fill is fully opaque;
//   - every label fits on one line inside its tab (no word broken across two lines);
//   - a scroll DOWN slides it off the screen, a scroll UP brings it back, and the end of the page shows it;
//   - a tab change shows it again.
//   node scripts/oneoff/probe-tab-bar-hide.mjs [--shots DIR]
// Exit 1 on any failed assertion.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-tab-bar-hide.mjs");
const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = Number(argOf("--port") || 5233);
const SHOTS = argOf("--shots");
const base = `http://127.0.0.1:${PORT}/Climbing-App/`;

const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false; server.on("exit", () => { died = true; });
const stop = (code) => { try { server.kill(); } catch { /* gone */ } process.exit(code); };
for (let i = 0; i < 120 && !died; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { /* not up */ } await new Promise((r) => setTimeout(r, 500)); }
if (died) { console.error("dev server exited during startup (port " + PORT + " taken?)"); process.exit(1); }

const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ok    " : "  FAIL  ") + msg); if (!ok) fails.push(msg); };
const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const width of [390, 320]) {
  console.log(`\n== ${width}px`);
  const ctx = await browser.newContext({ viewport: { width, height: 600 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 240000 });
  for (let i = 0; i < 120; i++) {
    if (await page.$('[aria-label="Primary"] button')) break;
    const guest = await page.$('text=/View as guest|Continue as guest|Browse as guest/i');
    if (guest) await guest.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  if (!(await page.$('[aria-label="Primary"] button'))) { check(false, "the tab bar never rendered"); await ctx.close(); continue; }
  // Climbs has the longest page for a guest; fall back to whatever is longest.
  const state = () => page.evaluate(() => {
    const nav = document.querySelector('[aria-label="Primary"]'); const r = nav.getBoundingClientRect(); const cs = getComputedStyle(nav);
    const el = document.scrollingElement;
    const labels = [...nav.querySelectorAll("button")].map((b) => { const s = b.querySelector("span"); const lh = parseFloat(getComputedStyle(s).lineHeight) || 14; return { name: b.getAttribute("aria-label"), lines: Math.round(s.getBoundingClientRect().height / lh), over: b.scrollWidth > b.clientWidth + 1 }; });
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight, vw: innerWidth, radius: parseFloat(cs.borderTopLeftRadius), bg: cs.backgroundColor, scrollY: el.scrollTop, room: el.scrollHeight - el.clientHeight, labels };
  });
  let best = null, bestRoom = -1;
  for (const name of ["Home", "Climbs", "Partners", "Crews", "Logbook", "Ranks", "Profile"]) {
    await page.click(`[aria-label="Primary"] button[aria-label="${name}"]`); await page.waitForTimeout(900);
    const room = (await state()).room; if (room > bestRoom) { bestRoom = room; best = name; }
  }
  await page.click(`[aria-label="Primary"] button[aria-label="${best}"]`); await page.waitForTimeout(900);
  console.log(`  (longest page: ${best}, ${bestRoom}px of scroll)`);
  await page.waitForTimeout(600);
  let s = await state();
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `bar-${width}-top.png`) });
  check(s.radius >= 16, `rounded: border-radius ${s.radius}px`);
  check(s.left >= 3.5 && s.vw - s.right >= 3.5, `inset from the edges: ${s.left.toFixed(0)}px / ${(s.vw - s.right).toFixed(0)}px`);
  check(s.vh - s.bottom >= 4, `floats above the bottom edge: ${(s.vh - s.bottom).toFixed(0)}px`);
  check(/^rgb\(/.test(s.bg) || /rgba\([^)]*,\s*1\)$/.test(s.bg), `opaque fill: ${s.bg}`);
  const bad = s.labels.filter((l) => l.lines > 1 || l.over);
  check(!bad.length, `every label on one line in its tab${bad.length ? ": " + bad.map((l) => l.name + "(" + l.lines + " lines" + (l.over ? ", overflows" : "") + ")").join(", ") : ""}`);
  check(s.room > 300, `the page is long enough to scroll (${s.room}px)`);
  await page.mouse.move(width / 2, 300);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(80); }
  await page.waitForTimeout(500); s = await state();
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `bar-${width}-scrolled-down.png`) });
  check(s.top >= s.vh, `scrolling DOWN hides it (bar top ${s.top.toFixed(0)} vs viewport ${s.vh}, scrollY ${s.scrollY})`);
  await page.mouse.wheel(0, -60); await page.waitForTimeout(500); s = await state();
  check(s.bottom <= s.vh, `a scroll UP brings it back (bar bottom ${s.bottom.toFixed(0)})`);
  await page.mouse.wheel(0, 240); await page.waitForTimeout(500);
  await page.evaluate(() => { const el = document.scrollingElement; el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(600); s = await state();
  check(s.bottom <= s.vh, `the END of the page shows it (bar bottom ${s.bottom.toFixed(0)})`);
  await page.evaluate(() => { document.scrollingElement.scrollTop = 400; }); await page.waitForTimeout(100);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  const hiddenBefore = (await state()).top >= s.vh;
  // a real Tab key from the last control on the page, as a keyboard user reaches the bar
  await page.evaluate(() => { const all = [...document.querySelectorAll('#appscroll button, #appscroll a[href], #appscroll input')].filter((e) => !e.disabled && e.offsetParent); const last = all[all.length - 1]; if (last) last.focus({ preventScroll: true }); });
  let inNav = false;
  for (let i = 0; i < 12 && !inNav; i++) { await page.keyboard.press("Tab"); inNav = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest('[aria-label="Primary"]'))); }
  await page.waitForTimeout(600); s = await state();
  check(inNav, "Tab reached the bar");
  check(!hiddenBefore || s.bottom <= s.vh, `keyboard focus reaching the bar shows it (hidden before: ${hiddenBefore})`);
  await page.click('[aria-label="Primary"] button[aria-label="Partners"]'); await page.waitForTimeout(700); s = await state();
  check(s.bottom <= s.vh, `a tab change shows it`);
  check(!errors.length, `no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `\nprobe-tab-bar-hide: ${fails.length} FAILED` : "\nprobe-tab-bar-hide: ok");
stop(fails.length ? 1 : 0);
