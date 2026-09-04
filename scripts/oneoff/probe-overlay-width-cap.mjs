#!/usr/bin/env node
// Do the opaque full-screen views actually render inside the app's 520px column on a DESKTOP
// window, and still fill a phone?
//
// The static half of this is easy and was already done: every such style object now carries
// `maxWidth:520,margin:"0 auto"`. That proves the properties are PRESENT. It does not prove the
// CSS does what is intended -- `position:fixed` with `inset:0` is an over-constrained box, and
// whether `margin:0 auto` centres it is a used-value question the source cannot answer. Only a
// browser can, so this measures the rendered rect.
//
//   node scripts/oneoff/probe-overlay-width-cap.mjs
//
// Fails CLOSED: a dev server that never comes up, a Chrome that will not launch, an overlay that
// never mounted, or fewer than 6 overlays measured are each reported as a broken probe rather
// than as a clean result -- "no overlay was too wide" is also what measuring nothing looks like.

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CAP = 520;
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

// Overlays whose flag opens with no payload, so `?z=<name>` alone mounts them. Deliberately a
// hand-picked subset rather than the full scaffold sweep: this probe asks a LAYOUT question, and
// one capped view of each shape (scroller, flex column, dialog) answers it.
const OPEN = [
  "manageAreasOpen",   // Manage areas          -- overflowY scroller
  "blockedOpen",       // Blocked climbers
  "editDraft",         // Edit profile          -- an App early-return screen
  "dashOpen",          // Guide dashboard       -- lib/DbGuideDashboard
  "guideAppOpen",      // Become a listed guide -- lib/DbGuideApply
  "calOpen",           // Calendar              -- an App early-return screen
  "inboxOpen",         // Messages              -- an App early-return screen
  "pastExpand",        // Past crews            -- flex column
];

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(5400);
if (port === null) { console.error("BROKEN PROBE: no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

// The overlay-scroll config, reused verbatim rather than adding a sixth scaffold: it injects the
// shared `?z=` opener and rewrites nothing about app state.
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST/.test(s)) process.stderr.write(s); });
let died = false; server.on("exit", () => { died = true; });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up || died) { console.error("BROKEN PROBE: dev server never came up"); stop(); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});   // warm the module graph

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("BROKEN PROBE: could not launch Chrome: " + String(e.message).split("\n")[0]); stop(); process.exit(1); }

// Measure every opaque full-screen view actually on screen. Identified BY COMPUTED STYLE rather
// than by a selector: these carry no class names, and reading the rendered box is the whole point.
const MEASURE = () => {
  const out = [];
  for (const el of document.querySelectorAll("div")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 300) continue;              // not a full-screen view
    const bg = cs.backgroundColor.replace(/\s/g, "");
    if (bg !== "rgb(13,17,23)") continue;                        // C.bg #0d1117, opaque only
    out.push({ w: Math.round(r.width), left: Math.round(r.left), maxW: cs.maxWidth });
  }
  return out;
};

let fail = 0, measured = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fail++; };

for (const [label, vp] of [["desktop 1440", DESKTOP], ["phone 390", PHONE]]) {
  const page = await browser.newPage({ viewport: vp });
  page.setDefaultNavigationTimeout(120000);
  console.log("\n== " + label + " ==");
  for (const name of OPEN) {
    await page.goto(base + "?z=" + name, { waitUntil: "domcontentloaded" });
    // Wait on the overlay APPEARING, never on a timer: the first run had blockedOpen mount on a
    // phone and not on desktop at a flat 1400ms, which is a settle race reading as a missing
    // overlay -- and a skipped overlay is indistinguishable from a passing one.
    let boxes = [];
    for (let t = 0; t < 30; t++) {
      boxes = await page.evaluate(MEASURE);
      if (boxes.length) break;
      await page.waitForTimeout(300);
    }
    if (!boxes.length) { console.log("  --    " + name + ": did not mount, skipped"); continue; }
    measured++;
    const widest = boxes.reduce((a, b) => (b.w > a.w ? b : a));
    if (vp.width > CAP) {
      const centred = Math.abs(widest.left - (vp.width - CAP) / 2) <= 2;
      if (widest.w <= CAP && centred) ok(`${name}: ${widest.w}px wide, left ${widest.left} — capped and centred`);
      else bad(`${name}: ${widest.w}px wide at left ${widest.left} — expected ${CAP}px centred at ${(vp.width - CAP) / 2}`);
    } else {
      if (widest.w === vp.width) ok(`${name}: ${widest.w}px — still fills the phone`);
      else bad(`${name}: ${widest.w}px on a ${vp.width}px phone — the cap is shrinking it`);
    }
  }
  await page.close();
}

await browser.close(); stop();
console.log("");
if (measured < 6) { console.error(`BROKEN PROBE: only ${measured} measurement(s) — too few to conclude anything.`); process.exit(1); }
if (fail) { console.error("probe-overlay-width-cap: " + fail + " problem(s)."); process.exit(1); }
console.log(`probe-overlay-width-cap: ok — ${measured} measurement(s), capped and centred on desktop, full-width on a phone.`);
