#!/usr/bin/env node
// Does a sideways TOUCH swipe still change the page? (owner, 2026-11-18: "Remove the swipe to go to next or
// previous page".) Drives the real app in Chrome as a phone, drags a finger left and right across each screen
// that used to swipe, and reports whether the selected tab or section moved.
//
//   node scripts/oneoff/probe-no-page-swipe.mjs                 # this checkout: every swipe must change NOTHING
//   node scripts/oneoff/probe-no-page-swipe.mjs --css "<rules>" # try a stylesheet rule before writing it into index.html
//   node scripts/oneoff/probe-no-page-swipe.mjs --root <dir>    # another checkout (one that still has the swipe
//                                                               # proves the probe can see a swipe when there is one)
// It also drags the things that OWN a sideways drag, which must keep it: a swipe row (archive / delete) must follow
// the finger, and a map must pan.
// Exit 1 when a swipe changed the page, or when a tap, an up-down drag, a swipe row or a map stopped working.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-no-page-swipe.mjs");

const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOT = path.resolve(argOf("--root") || HERE);
const PORT = Number(argOf("--port") || 5231);
const base = `http://127.0.0.1:${PORT}/Climbing-App/`;

const envText = [".env", ".env.local"].map((f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } }).join("\n");
const envVal = (k) => (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false; server.on("exit", () => { died = true; });
const stop = (code) => { try { server.kill(); } catch { /* gone */ } process.exit(code); };
for (let i = 0; i < 120 && !died; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { /* not up */ } await new Promise((r) => setTimeout(r, 500)); }
if (died) { console.error("dev server exited during startup (port " + PORT + " taken?)"); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

// A real route id for the route page's tab row (the screen with the longest row).
let routeId = argOf("--route-id");
if (!routeId && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY")) {
  try {
    const k = envVal("VITE_SUPABASE_ANON_KEY");
    const r = await fetch(envVal("VITE_SUPABASE_URL") + "/rest/v1/routes?select=id&name=eq." + encodeURIComponent("North Ridge (Complete)") + "&limit=1", { headers: { apikey: k, Authorization: "Bearer " + k } });
    const j = await r.json(); routeId = j && j[0] && j[0].id;
  } catch { /* no route page then */ }
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
const cdp = await ctx.newCDPSession(page);

async function waitForApp() {
  for (let i = 0; i < 120; i++) {
    const up = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"]')].some((e) => (e.textContent || "").trim() === "Home")).catch(() => false);
    if (up) return true;
    await page.evaluate(() => { const g = [...document.querySelectorAll('button,[role="button"]')].find((e) => (e.textContent || "").trim() === "View as guest"); if (g) g.click(); }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  return false;
}
// What is selected right now: the bottom bar's section and every tab row's current tab.
const sig = () => page.evaluate(() => [...document.querySelectorAll('[aria-current="true"],[aria-current="page"],[aria-pressed="true"],[aria-selected="true"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.textContent || "").trim().slice(0, 24)).join(" | "));
const scrollTop = () => page.evaluate(() => { const a = document.getElementById("appscroll"); return Math.round((a && a.scrollHeight > a.clientHeight ? a.scrollTop : 0) + window.scrollY); });
async function drag(x0, y0, x1, y1) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y: y0 + ((y1 - y0) * i) / 10 }] }); await page.waitForTimeout(14); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(650);
}
// A drag that is HELD at its far end while `read` looks at the page, then released back where it started (so a
// swipe row springs back and nothing is archived or deleted).
async function dragAndRead(x0, y0, x1, read) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y: y0 }] }); await page.waitForTimeout(14); }
  const mid = await read();
  for (let i = 9; i >= 0; i--) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y: y0 }] }); await page.waitForTimeout(10); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  return mid;
}
// SWIPE ROWS (archive / delete a row) and MAPS own their sideways drag; the page's pan-y rule must not take it.
let rowsTried = 0, mapsTried = 0;
async function ownGestures(name) {
  // The first swipe row on screen: SwipeRow's moving layer is the one with touch-action pan-y and a translateX.
  const row = await page.evaluate(() => {
    document.querySelectorAll("[data-probe-row]").forEach((e) => e.removeAttribute("data-probe-row"));
    const el = [...document.querySelectorAll("div")].find((e) => { if (e.style.touchAction !== "pan-y" || !/translateX/.test(e.style.transform)) return false; const r = e.getBoundingClientRect(); return r.width > 200 && r.top > 90 && r.bottom < window.innerHeight - 90; });
    if (!el) return null; el.setAttribute("data-probe-row", ""); const r = el.getBoundingClientRect(); return { y: Math.round(r.top + r.height / 2) };
  });
  if (row) {
    rowsTried++;
    const before = await sig();
    // 110px left: past the row's 30px slack, short of its 140px "release to act" line.
    const mid = await dragAndRead(300, row.y, 190, () => page.evaluate(() => { const e = document.querySelector("[data-probe-row]"); return e ? e.style.transform : "gone"; }));
    const moved = /translateX\(-\d/.test(mid) && mid !== "translateX(0px)";
    const still = await page.evaluate(() => !!document.querySelector("[data-probe-row]"));
    if (!moved) { broken++; console.log("  ROW: a swipe row on " + name + " did not follow the finger (mid-drag " + mid + ")"); }
    else if (!still || before !== (await sig())) { broken++; console.log("  ROW: a short drag on " + name + "'s swipe row acted or changed the page"); }
    else console.log("  swipe row on " + name + ": follows the finger (" + mid + "), springs back, nothing acted");
  }
  const map = await page.evaluate(() => {
    const m = [...document.querySelectorAll(".leaflet-container")].find((e) => { const r = e.getBoundingClientRect(); return r.width > 200 && r.height > 120 && r.top > 60 && r.bottom < window.innerHeight - 70; });
    if (!m) return null; document.querySelectorAll("[data-probe-map]").forEach((e) => e.removeAttribute("data-probe-map")); m.setAttribute("data-probe-map", ""); const r = m.getBoundingClientRect(); return { y: Math.round(r.top + r.height / 2) };
  });
  if (map) {
    mapsTried++;
    const pane = () => page.evaluate(() => { const p = document.querySelector("[data-probe-map] .leaflet-map-pane"); return p ? p.style.transform : "none"; });
    const before = await sig(), p0 = await pane();
    await drag(280, map.y, 130, map.y);
    const p1 = await pane();
    if (p0 === p1) { broken++; console.log("  MAP: a sideways drag on " + name + "'s map did not pan it (" + p0 + ")"); }
    else if (before !== (await sig())) { broken++; console.log("  MAP: panning " + name + "'s map changed the page"); }
    else console.log("  map on " + name + ": a sideways drag pans it  " + p0 + " -> " + p1);
  }
}
async function tapNav(label) {
  const ok = await page.evaluate((t) => { const b = [...document.querySelectorAll('[aria-label="Primary"] button,[aria-label="Primary"] [role="button"],[aria-label="Primary"] a')].find((e) => (e.textContent || "").trim().endsWith(t)); if (!b) return false; b.click(); return true; }, label);
  await page.waitForTimeout(1800);
  return ok;
}

const CSS = argOf("--css");
const css = async () => { if (CSS) await page.addStyleTag({ content: CSS }).catch(() => {}); };
let changed = 0, broken = 0, drags = 0;
async function swipeScreen(name) {
  const rows = [];
  for (const y of [300, 480, 640]) {
    for (const [dir, x0, x1] of [["left", 320, 60], ["right", 70, 330]]) {
      const a = await sig(); await drag(x0, y, x1, y); const b = await sig(); drags++;
      if (a !== b) { changed++; rows.push(`    CHANGED on a ${dir} swipe at y=${y}:  [${a}]  ->  [${b}]   (now at ${page.url().replace(base, "/")})`); if (!page.url().startsWith(base)) { await page.goForward({ waitUntil: "domcontentloaded" }).catch(() => {}); await waitForApp(); await page.waitForTimeout(1500); await css(); } }
    }
  }
  console.log(`  ${name}: ${rows.length ? rows.length + " of 6 swipes CHANGED the page" : "6 swipes, nothing changed"}   now [${await sig()}]`);
  rows.forEach((r) => console.log(r));
}

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  if (!(await waitForApp())) { console.error("the app never rendered its nav bar"); await browser.close(); stop(1); }
  await page.waitForTimeout(2500);
  await css();
  console.log("probing " + ROOT + (CSS ? "   with extra CSS: " + CSS : ""));
  const navLabels = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Primary"] button,[aria-label="Primary"] [role="button"],[aria-label="Primary"] a')].map((e) => (e.textContent || "").trim()));
  console.log("  bottom bar: " + navLabels.join(" · "));
  for (const label of navLabels) {
    if (!(await tapNav(label))) { console.log("  (could not open " + label + ")"); broken++; continue; }
    await swipeScreen(label);
    await ownGestures(label);
  }
  // The bell's list is all swipe rows.
  await tapNav("Home");
  const bell = await page.evaluate(() => { const b = [...document.querySelectorAll('button,[role="button"]')].find((e) => /notification/i.test(e.getAttribute("aria-label") || "") && e.getBoundingClientRect().width > 0); if (!b) return false; b.click(); return true; });
  if (bell) { await page.waitForTimeout(1500); await ownGestures("Notifications"); await page.evaluate(() => { const b = [...document.querySelectorAll('button,[role="button"]')].find((e) => /^(← )?Back$|^Close|^✕/.test((e.textContent || "").trim()) || /^(close|back)/i.test(e.getAttribute("aria-label") || "")); if (b) b.click(); }); await page.waitForTimeout(800); }
  // Tapping a tab still changes it, and an up-down drag still scrolls.
  await tapNav("Logbook");
  const before = await sig();
  const tapped = await page.evaluate(() => { const b = [...document.querySelectorAll('#appscroll button,[role="main"] button')].find((e) => /^Completed|^Ascents|^✓/.test((e.textContent || "").trim()) || (e.textContent || "").trim().startsWith("Completed")); if (!b) return null; b.click(); return (b.textContent || "").trim().slice(0, 24); });
  await page.waitForTimeout(1200);
  const after = await sig();
  if (!tapped || before === after) { broken++; console.log(`  TAP: tapping a Logbook tab did NOT change it (tapped ${JSON.stringify(tapped)})  [${before}] -> [${after}]`); }
  else console.log(`  tap: tapping "${tapped}" changed the tab  [${before}] -> [${after}]`);
  await tapNav("Home");
  const s0 = await scrollTop(); await drag(200, 650, 200, 250); const s1 = await scrollTop();
  if (s1 <= s0) { broken++; console.log(`  SCROLL: an upward drag on Home did not scroll (${s0} -> ${s1})`); } else console.log(`  scroll: an upward drag on Home scrolled ${s0} -> ${s1}px`);

  if (routeId) {
    await page.goto(base + "?route=" + encodeURIComponent(routeId), { waitUntil: "domcontentloaded", timeout: 180000 });
    await waitForApp();
    let onRoute = false;
    for (let i = 0; i < 40 && !onRoute; i++) { onRoute = await page.evaluate(() => !!document.querySelector("[data-cm-route-tabs]")); if (!onRoute) await page.waitForTimeout(1000); }
    if (!onRoute) { broken++; console.log("  ROUTE: the route page (" + routeId + ") did not open"); }
    else {
      await page.waitForTimeout(2500);
      await css();
      await swipeScreen("Route page · Overview (" + routeId + ")");
      // The route map: on whichever tab draws one (Leaflet loads late, so wait for it).
      for (const t of ["Overview", "Plan", "Photos"]) {
        await page.evaluate((label) => { const x = [...document.querySelectorAll("[data-cm-route-tabs] button")].find((e) => (e.textContent || "").trim() === label); if (x) x.click(); }, t);
        let found = false;
        for (let i = 0; i < 8 && !found; i++) { await page.waitForTimeout(800); found = await page.evaluate(() => { const m = [...document.querySelectorAll(".leaflet-container")].find((e) => e.getBoundingClientRect().height > 120); if (!m) return false; m.scrollIntoView({ block: "center" }); return true; }); }
        if (!found) continue;
        await page.waitForTimeout(1500);
        await ownGestures("the route page (" + t + " tab)");
        break;
      }
      await page.evaluate(() => { const x = [...document.querySelectorAll("[data-cm-route-tabs] button")].find((e) => (e.textContent || "").trim() === "Overview"); if (x) x.click(); const a = document.getElementById("appscroll"); if (a) a.scrollTop = 0; window.scrollTo(0, 0); });
      await page.waitForTimeout(500);
      const rb = await sig();
      const t = await page.evaluate(() => { const b = [...document.querySelectorAll("[data-cm-route-tabs] button")].find((e) => (e.textContent || "").trim() === "Safety"); if (!b) return false; b.click(); return true; });
      await page.waitForTimeout(1500);
      const ra = await sig();
      if (!t || ra === rb) { broken++; console.log(`  TAP: tapping the route page's Safety tab did NOT change it  [${rb}] -> [${ra}]`); } else console.log(`  tap: tapping Safety changed the route tab  [${rb}] -> [${ra}]`);
      await swipeScreen("Route page · Safety");
      // A row that scrolls sideways must keep its drag: the route page's own tab strip.
      const strip = await page.evaluate(() => { const w = document.querySelector("[data-cm-route-tabs]"); const el = w && [w, ...w.querySelectorAll("*")].find((e) => e.scrollWidth > e.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(e).overflowX)); if (!el) return null; el.scrollLeft = 0; el.setAttribute("data-probe-strip", ""); const r = el.getBoundingClientRect(); return { y: Math.round(r.top + r.height / 2), room: el.scrollWidth - el.clientWidth }; });
      if (!strip) console.log("  (the route tab strip fits at this width: sideways-scroller drag not probed)");
      else { await drag(300, strip.y, 80, strip.y); const sl = await page.evaluate(() => Math.round(document.querySelector("[data-probe-strip]").scrollLeft)); if (sl <= 0) { broken++; console.log("  STRIP: a sideways drag on the route tab strip did not scroll it (room " + strip.room + "px)"); } else console.log("  strip: a sideways drag on the route tab strip scrolled it " + sl + "px of " + strip.room); }
    }
  } else console.log("  (no route id: route page not probed)");

  if (!rowsTried) console.log("  (no swipe row was on screen: rows not probed)");
  if (!mapsTried) console.log("  (no map was on screen: maps not probed)");
  if (errors.length) { broken++; console.log("  PAGE ERRORS: " + errors.join(" || ")); }
  console.log(`\n${drags} sideways swipes: ${changed} changed the page. ${rowsTried} swipe row(s) and ${mapsTried} map(s) driven. ${broken} other failure(s). ${errors.length} page error(s).`);
} finally {
  await browser.close();
}
stop(changed || broken ? 1 : 0);
