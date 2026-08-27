// check:overlay-scroll says four overlays "never mounted on any tab". Is that true?
//
// It decides `landed` from scan(), which counts VISIBLE position:fixed divs at least 50% of the
// viewport wide and 25% tall. That is the right filter for its subject — a toast or a badge has no
// scroll pane worth containing — but it means "never mounted" is really "no qualifying overlay
// ROOT was found", which conflates two very different facts:
//
//   (a) the modal did not open at all            -> a broken opener, worth chasing
//   (b) it opened and is a small dropdown        -> nothing for that guard to measure, correct
//
// The report hands all four to check:zero as if (a). check:zero mounts ALL FOUR at zero —
// trustOpen 2010 chars, unfinishedOpen 650, alertsOpen 827, legal 2813 — so at least some are (b),
// and a reader chasing a broken opener would be chasing nothing.
//
// This measures which is which, under the SAME config check:overlay-scroll uses, so the answer is
// about that guard and not about a fixture built for this probe.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NAMES = ["trustOpen", "unfinishedOpen", "alertsOpen", "legal"];
const TABS = ["me", "today", "crew", "logbook", "routes", "discover", "ranks"];

async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
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
const port = await claimPort(5390);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "ignore"], detached: true });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up) { console.error("dev server never came up"); stop(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultNavigationTimeout(120000);

const probe = () => page.evaluate(() => {
  const fixed = [...document.querySelectorAll("div")].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    return el.getBoundingClientRect().width > 0;
  });
  const big = fixed.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25;
  });
  const dialogs = document.querySelectorAll('[role="dialog"]').length;
  const largest = fixed.map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height); });
  return { chars: (document.body.innerText || "").length, fixed: fixed.length, big: big.length, dialogs, largest: largest.slice(0, 6) };
});

console.log(`viewport 390x844 — the size gate is >=195 wide and >=211 tall\n`);
for (const name of NAMES) {
  let best = null;
  for (const t of TABS) {
    await page.goto(`${base}?zt=${t}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const before = await probe();
    await page.goto(`${base}?zt=${t}&z=${name}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const after = await probe();
    const delta = after.chars - before.chars;
    // "Opened" is judged by what the page GAINED, not by the fixed-root filter under test.
    const opened = delta !== 0 || after.dialogs > before.dialogs || after.fixed > before.fixed;
    if (opened && (!best || after.big > best.after.big)) best = { tab: t, before, after, delta };
    if (opened && after.big > 0) break;
  }
  if (!best) { console.log(`  ${name.padEnd(16)} DID NOT OPEN on any tab — a real opener problem`); continue; }
  const { tab, before, after, delta } = best;
  const verdict = after.big > 0
    ? "opens WITH a qualifying root — check:overlay-scroll should have measured it"
    : "OPENS, but has no fixed pane large enough for the size gate — nothing for that guard to measure";
  console.log(`  ${name.padEnd(16)} ${verdict}`);
  console.log(`  ${"".padEnd(16)}   tab=${tab}  text ${before.chars}->${after.chars} (${delta >= 0 ? "+" : ""}${delta})  ` +
              `fixed ${before.fixed}->${after.fixed}  big ${before.big}->${after.big}  dialogs ${before.dialogs}->${after.dialogs}`);
  console.log(`  ${"".padEnd(16)}   fixed element sizes: ${after.largest.join(", ") || "none"}`);
}

stop();
await browser.close().catch(() => {});
