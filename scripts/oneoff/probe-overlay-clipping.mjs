#!/usr/bin/env node
// Do any labels CLIP inside an overlay? The last surface the clipping sweep had not
// reached (#1510/#1517/#1524 covered the seven tabs and the route page).
//
// A CSS-clipped label is fully present in the DOM, so every text-reading guard sees the
// whole string while the user sees an ellipsis; check:overflow asks only whether
// something runs past the VIEWPORT's right edge, which this does not.
//
// Cheaper than check:overflow's overlay walk on purpose: that one tries each overlay
// against each tab (~25 min). This tries tabs only UNTIL the overlay mounts, then stops.
//
// Mount detection compares LINE SETS, never length: Inbox REPLACES the screen rather than
// adding to it, so a length test reads it as never mounted and silently drops it from the
// sweep -- the trap check:a11y-badges records.
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIDTH = Number(process.env.WIDTH || 390);
const TABS = (process.env.TABS || "me,today,crew,logbook,routes,discover,ranks").split(",");

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
const port = await freePort(5500, 5539);
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

// fractional widths: scrollWidth/clientWidth are INTEGERS and under-report a label
// clipped by a fraction of a pixel, which is exactly where these sit (#1510).
const SCAN = () => {
  const out = [];
  for (const el of document.querySelectorAll("span, div, button, a")) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== "ellipsis" || cs.overflow === "visible") continue;
    const box = el.getBoundingClientRect().width
      - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    if (!box) continue;
    const txt = (el.innerText || "").trim();
    if (!txt.length) continue;
    const r = document.createRange();
    r.selectNodeContents(el);
    const over = r.getBoundingClientRect().width - box;
    // print a LOCATOR: this codebase has no class names, so a finding without one
    // sends the next reader hunting through a 400,000-character line.
    if (over > 0.05) out.push({ text: txt.slice(0, 44), over: Math.round(over * 10) / 10,
      loc: (el.getAttribute("style") || "").slice(0, 150), tag: el.tagName.toLowerCase(),
      parent: (el.parentElement && el.parentElement.getAttribute("style") || "").slice(0, 110) });
  }
  return out;
};
const LINES = () => (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 844 } });
page.setDefaultNavigationTimeout(120000);

const load = async (q) => {
  await page.goto(base + q, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 30000 }).catch(() => {});
  await settledText(page);
};

await load("");
const overlays = await page.evaluate(() => window.__overlays || []);
if (!overlays.length) {
  console.error("the scaffold published no __overlays — the walk is broken, this is not a clean app.");
  stop(); await browser.close(); process.exit(1);
}
console.log(`${overlays.length} overlay(s) declared; walking at ${WIDTH}px\n`);

// baseline line-set per tab, so "did the overlay add anything" is answerable
const bare = new Map();
for (const t of TABS) { await load(`?zt=${t}`); bare.set(t, new Set(await page.evaluate(LINES))); }

let opened = 0, skipped = 0, total = 0;
const findings = new Map();
const ONLY = process.env.OVERLAY ? process.env.OVERLAY.split(",") : null;
for (const name of overlays) {
  if (ONLY && !ONLY.includes(name)) continue;
  let mounted = false;
  for (const t of TABS) {
    await load(`?zt=${t}&z=${name}`);
    const lines = await page.evaluate(LINES);
    const added = lines.filter((l) => !bare.get(t).has(l));
    if (!added.length) continue;                 // this tab did not mount it
    mounted = true;
    opened++;
    const hits = await page.evaluate(SCAN);
    for (const h of hits) {
      total++;
      const key = name + "|" + h.text;
      if (!findings.has(key)) {
        findings.set(key, true);
        console.log(`  ${name}  clipped by ${String(h.over).padStart(5)}px  ${JSON.stringify(h.text)}`);
        if (process.env.OVERLAY) { console.log(`        <${h.tag}> style=${h.loc}`); console.log(`        parent=${h.parent}`); }
      }
    }
    break;
  }
  if (!mounted) { skipped++; console.log(`  ${name}  never mounted on any tab — NOT a clean result`); }
}

await browser.close();
stop();
console.log(`\n${opened} overlay(s) opened, ${skipped} never mounted, ${findings.size} clipped label(s)`);
// The floor asks whether the WALK worked, so it must not fire on a deliberately
// filtered run -- OVERLAY=rd:fixOpen opens 1 of 57 and that is not a broken walk.
// (It did fire, which is a bug in the check rather than a finding about the app.)
if (!ONLY && opened < overlays.length / 2) {
  console.error("fewer than half the declared overlays mounted — the walk is broken, not the app.");
  process.exit(1);
}
