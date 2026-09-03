#!/usr/bin/env node
// Which nav / sub-tab labels are CLIPPED at phone width, and by how much?
// A label with overflow:hidden + text-overflow:ellipsis is still fully present in the
// DOM, so every text-reading guard sees "Logbook" while the user sees "Logbo…".
// check:overflow asks whether anything runs past the viewport's right edge, which this
// does not: the clipping happens inside the element.
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIDTHS = (process.env.WIDTHS || "320,360,390,430").split(",").map(Number);

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
const port = await freePort(5460, 5499);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});
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

// scrollWidth/clientWidth are INTEGERS, so a label clipped by a fraction of a pixel
// reports as clean -- measured: at 390px this said "nothing clipped" while the rendered
// screenshot plainly showed "Logbo...". Compare FRACTIONAL widths instead: the text's own
// Range rect against the element's content box. The render is the ground truth; an
// integer test quietly under-reports exactly at the boundary, which is where these sit.
const SCAN = () => {
  const out = [];
  for (const el of document.querySelectorAll("span, div, button")) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== "ellipsis" || cs.overflow === "visible") continue;
    const box = el.getBoundingClientRect().width
      - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    if (!box) continue;
    const txt = (el.innerText || "").trim();
    if (!txt.length) continue;
    const r = document.createRange();
    r.selectNodeContents(el);
    const w = r.getBoundingClientRect().width;
    const over = w - box;
    if (over > 0.05) out.push({ text: txt.slice(0, 40), over: Math.round(over * 10) / 10, client: Math.round(box * 10) / 10, scroll: Math.round(w * 10) / 10 });
  }
  return out;
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
let total = 0;
let routeMissed = 0;
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  page.setDefaultNavigationTimeout(120000);
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await settledText(page);
  console.log(`\n=== ${w}px ===`);
  for (const tab of (process.env.TABS || "Home,Climbs,Partners,Crew,Logbook,Ranks,Profile").split(",")) {
    await page.evaluate((label) => {
      const el = [...document.querySelectorAll("[aria-label]")].find((e) => {
        const l = e.getAttribute("aria-label");
        return l === label || l.startsWith(label + ",") || l.startsWith(label + " ");
      });
      if (el) el.click();
    }, tab);
    await settledText(page);
    const hits = await page.evaluate(SCAN);
    for (const h of hits) {
      total++;
      console.log(`  [${tab}] clipped by ${String(h.over).padStart(3)}px  ${h.client}/${h.scroll}  ${JSON.stringify(h.text)}`);
    }
    if (!hits.length) console.log(`  [${tab}] nothing clipped`);
  }
  // ---- the route page and its six sub-tabs --------------------------------------
  // The richest layout in the app, and where BOTH recorded horizontal-overflow bugs
  // lived. `?zr=1` calls the app's own openRoute() from inside the shared opener, which
  // no slow list or moved control can defeat. Sub-tab ORDER matters: check:overflow
  // records that "Reports" clicks from Overview and does not from Photos.
  await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
  const opened = await page.evaluate(() => window.__routeOpen === true);
  if (!opened) {
    console.log("  [route] NOT REACHED — ?zr=1 never set window.__routeOpen (not a clean result)");
    routeMissed++;
  } else {
    await settledText(page);
    const seen = new Map();
    for (const sub of ["Overview", "Reports", "Photos", "Partners", "Plan", "Safety"]) {
      const ok = await tapByText(page, sub);
      if (!ok) { console.log(`  [route:${sub}] sub-tab not found — skipped`); continue; }
      await settledText(page);
      // A click that returns TRUE is not evidence it navigated: two elements carry the
      // text "Reports" (the rating summary DIV and the sub-tab BUTTON), and a guard once
      // reported six clean sub-tabs while measuring Overview six times. Fingerprint the
      // screen so a repeat is visible rather than silently counted as coverage.
      const fp = await page.evaluate(() => (document.body.innerText || "").length);
      const dup = seen.get(fp);
      seen.set(fp, sub);
      const hits = await page.evaluate(SCAN);
      for (const h of hits) {
        total++;
        console.log(`  [route:${sub}] clipped by ${String(h.over).padStart(5)}px  ${h.client}/${h.scroll}  ${JSON.stringify(h.text)}`);
      }
      const note = dup ? `  <-- SAME SCREEN as ${dup} (${fp} chars): the click did not land` : ` (${fp} chars)`;
      if (dup) routeMissed++;
      if (!hits.length) console.log(`  [route:${sub}] nothing clipped${note}`);
    }
  }

  await page.close();
}
await browser.close();
stop();
console.log(`\n${total} clipped label(s) across ${WIDTHS.length} width(s)`);
if (routeMissed) { console.error(`the route page was not reached at ${routeMissed} width(s) — that is a broken walk, not a clean screen.`); process.exit(1); }
