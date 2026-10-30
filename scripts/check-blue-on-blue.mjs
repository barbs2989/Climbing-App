#!/usr/bin/env node
// check:blue-on-blue — no blue TEXT is drawn on a blue BOX (owner note, 2026-10: "I don't like the blue
// text on blue boxes, change text to white").
//
// Why it exists. #2752 turned 189 labels white by rewriting style objects that set BOTH a blue fill and
// a blue colour. It could not see the other shape: the blue box set on a wrapper and the blue text on a
// child inside it, or a fill that only turns blue when a control is selected. Those are properties of
// the rendered tree, not of any one style object, so this reads the real page: for every element that
// owns text, its computed colour, and the colour actually behind it (every painted ancestor,
// translucent washes composited over what is under them).
//
// "Blue text" is a saturated blue (C.blue #3b89f7, C.blueSolid #2a74de and their kin); "a blue box" is a
// fill whose blue channel clearly leads the others (C.blueBg, C.blueChip, C.blueDim, C.blueSolid, a
// blue wash). The app's neutral dark surfaces (C.bg, C.surface, C.card) lean blue by a few points and
// are not boxes; the threshold sits well clear of them.
//
// What it walks: the NAV tabs, the seven route sub-tabs and every overlay the scaffold opens, at a
// 390px phone width — the same screens check:axe walks. What it cannot see: a state the walk never
// opens (a chip that is blue only once tapped, unless the walk lands on it tapped).
//
//   npm run check:blue-on-blue
//   node scripts/check-blue-on-blue.mjs --only tabs     # or: routes, overlays
//   node scripts/check-blue-on-blue.mjs --where         # also print where the colour and the fill are set
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "./lib/render-settle.mjs";
import { overlayStates, NEEDS_EXTRA_STATE } from "./lib/overlay-scaffold.mjs";
import { MENU_SCREENS, openFromMenu } from "./lib/menu-screens.mjs";
import { assertQuietBox } from "./lib/quiet-box.mjs";

const box = assertQuietBox("check:blue-on-blue");
const ROOT = new URL("..", import.meta.url).pathname;
const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const want = (part) => !ONLY || ONLY === part;
const DETAIL = argv.includes("--where");

const APP = fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8");
const NAV = APP.match(/const NAV=\[(.*?)\];/);
if (!NAV) { console.error("check:blue-on-blue: could not read NAV from ClimbMatch.jsx — its declaration moved"); process.exit(1); }
const TABS = [...NAV[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);
const SUBTABS = ["Overview", "Plan", "Conditions", "Reports", "Safety", "Partners", "Photos"];
const OVERLAYS = overlayStates(APP).map((s) => s.name).filter((n) => !NEEDS_EXTRA_STATE[n]);
if (!OVERLAYS.length) { console.error("check:blue-on-blue: discovered no overlays — the scaffold's discovery has drifted"); process.exit(1); }

const servers = [];
process.on("exit", () => { for (const s of servers) { try { process.kill(-s.pid, "SIGTERM"); } catch { /* already gone */ } } });
process.on("SIGINT", () => process.exit(130));
const claimPort = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
};
async function startServer(from) {
  const port = await claimPort(from);
  if (port === null) { console.error(`check:blue-on-blue: no free port in ${from}-${from + 39}`); process.exit(1); }
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const srv = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
  servers.push(srv);
  let died = false;
  srv.on("exit", () => { died = true; });
  for (let i = 0; i < 360 && !died; i++) { try { if ((await fetch(base)).ok) { await fetch(base + "ClimbMatch.jsx").catch(() => {}); return base; } } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); }
  console.error(died ? "check:blue-on-blue: the dev server exited during startup" : "check:blue-on-blue: the dev server never came up");
  process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("check:blue-on-blue: could not launch Google Chrome: " + String(e.message).split("\n")[0]); process.exit(1); }

const fails = new Map(), unreached = [];
let scanned = 0;
// Runs in the page. Returns one entry per element that owns visible text in blue over a blue fill.
const probe = () => {
  const rgba = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  // The colour actually behind an element: every painted layer from the root down, composited.
  const behind = (el) => {
    const chain = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    let c = { r: 13, g: 17, b: 23, a: 1 }; // C.bg, the page itself
    for (const n of chain.reverse()) {
      const cs = getComputedStyle(n);
      const bg = rgba(cs.backgroundColor);
      if (bg && bg.a > 0) c = over(bg, c);
      const img = cs.backgroundImage;
      if (img && img !== "none") {
        const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgba(m[0])).filter(Boolean);
        if (stops.length) c = over(stops.reduce((s, x) => ({ r: s.r + x.r / stops.length, g: s.g + x.g / stops.length, b: s.b + x.b / stops.length, a: s.a + x.a / stops.length }), { r: 0, g: 0, b: 0, a: 0 }), c);
      }
    }
    return c;
  };
  const isBlueText = (c) => c && c.a > 0.5 && c.b >= 180 && c.b - c.r >= 110 && c.b - c.g >= 60;
  // C.card leads by 20, C.surface by 12, C.bg by 10; C.blueBg by 55, C.blueChip by 50, C.blueDim by 81.
  const isBlueBox = (c) => c.b - c.r >= 35 && c.b - c.g >= 20;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg")) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    if (!isBlueText(rgba(cs.color))) continue;
    const bk = behind(el); if (!isBlueBox(bk)) continue;
    // Where the colour and the fill are SET: what a fixer greps for.
    const setter = (prop) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (n.style && n.style[prop]) return `<${n.tagName.toLowerCase()} style="${n.getAttribute("style").slice(0, 160)}">`; return ""; };
    let boxEl = ""; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b && b.a > 0 && b.b - b.r >= 25) { boxEl = `<${n.tagName.toLowerCase()} style="${(n.getAttribute("style") || "").slice(0, 160)}">`; break; } }
    out.push({ text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60), fg: cs.color, bk: `rgb(${Math.round(bk.r)},${Math.round(bk.g)},${Math.round(bk.b)})`, colorAt: setter("color"), boxAt: boxEl });
  }
  return out;
};
async function scan(page, where) {
  const found = await page.evaluate(probe);
  scanned++;
  for (const f of found) { const k = `"${f.text}" ${f.fg} on ${f.bk}` + (DETAIL ? `\n      colour set at: ${f.colorAt}\n      box painted at: ${f.boxAt}` : ""); if (!fails.has(k)) fails.set(k, []); fails.get(k).push(where); }
  console.log(`  ${where.padEnd(34)} ${found.length ? found.length + " blue-on-blue" : "ok"}`);
}
async function load(page, base, qs) {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 120, null, { timeout: 60000 }).catch(() => {});
  await settledText(page, { timeout: 45000 }).catch(() => {});
}
const clickNamed = (page, label) => page.evaluate((t) => {
  const el = [...document.querySelectorAll('nav button, button, [role="button"], [role="tab"], a')]
    .find((e) => [e.getAttribute("aria-label") || "", (e.textContent || "").trim()].some((s) => { s = s.trim(); return s === t || s.startsWith(t + " ") || new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\d").test(s); }));
  if (!el) return false; el.click(); return true;
}, label);
const tap = async (page, label) => {
  if (MENU_SCREENS[label]) return openFromMenu(page, label);
  const ok = await clickNamed(page, label);
  if (ok) await settledText(page, { timeout: 30000 }).catch(() => {});
  return ok;
};
const err = (e) => String(e && e.message).split("\n")[0];

const base = await startServer(5540);
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultTimeout(30000);
if (want("tabs")) for (const t of TABS) {
  try {
    await load(page, base, "?zt=today");
    if (t !== TABS[0] && !(await tap(page, t))) { unreached.push(t); continue; }
    await page.waitForTimeout(600);
    await scan(page, t);
  } catch (e) { unreached.push(`${t} (${err(e)})`); }
}
if (want("routes")) for (const st of SUBTABS) {
  try {
    await load(page, base, "?zr=1");
    await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).catch(() => {});
    if (st !== "Overview") {
      const got = await page.evaluate((t) => { const b = [...document.querySelectorAll('[role="tab"], button')].find((x) => x.textContent.trim() === t); if (b) { b.click(); return true; } return false; }, st);
      if (!got) continue; // a crag climb has no Plan tab, by design; check:axe owns reachability
    }
    await settledText(page, { timeout: 20000 }).catch(() => {});
    await scan(page, `route·${st}`);
  } catch (e) { unreached.push(`route·${st} (${err(e)})`); }
}
if (want("overlays")) for (const o of OVERLAYS) {
  try { await load(page, base, `?zt=me&z=${o}`); await page.waitForTimeout(500); await scan(page, `overlay:${o}`); }
  catch (e) { unreached.push(`overlay:${o} (${err(e)})`); }
}
await page.close();
await browser.close();

if (unreached.length) { console.log(`\nNOT REACHED (${unreached.length}):`); for (const u of unreached) console.log("  " + u); }
if (fails.size) { console.log(`\ncheck:blue-on-blue FAILED — ${fails.size} label(s) draw blue text on a blue box (make the text white):`); for (const [k, w] of fails) console.log(`  ${k}\n      on: ${[...new Set(w)].join(", ")}`); }
if (box.caveat) console.log("\n" + box.caveat);
if (fails.size || unreached.length) process.exit(1);
if (!scanned) { console.error("check:blue-on-blue: scanned nothing"); process.exit(1); }
console.log(`\ncheck:blue-on-blue OK — ${scanned} screen(s) scanned, no blue text on a blue box.`);
process.exit(0);
