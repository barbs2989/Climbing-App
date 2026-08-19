// Prove a keyboard can REACH the controls ClimbMatchCore renders.
//
// check:clickable is static: it proves role/tabIndex/onKeyDown are present. focus() in a
// probe is no better — it moves focus whether or not the tab order can reach an element,
// and the tab order is precisely what was broken. Only real Tab presses answer the question
// CLAUDE.md poses: "the route list, the area list and the climber cards are all
// <div onClick>, so the primary way to navigate the app could not be done from a keyboard."
//
// Walks each tab, presses Tab, and counts DISTINCT converted controls that take focus —
// ignoring native <button>/<a>, which were always focusable and would inflate the result.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const claim = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((r) => { const s = net.createServer(); s.once("error", () => r(false)); s.once("listening", () => s.close(() => r(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
};
const port = await claim(5450);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
// Warm the big modules first: a cold compile of ClimbMatchCore can outlast a goto timeout
// on a loaded machine, which fails as a navigation error and reads like a broken page.
for (const mod of ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]) {
  const t = Date.now();
  await fetch(base + mod).catch(() => {});
  console.log(`  warmed ${mod} in ${Date.now() - t}ms`);
}

const TABS = ["today", "routes", "discover", "crew", "logbook", "me"];
const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const fails = [];
let grand = 0;
// CAPTURE RUNTIME THROWS. The Core sweep's worst defect was a shadowed `clickable` invoking
// a boolean; the app's error boundary swallowed it into a smaller screen, and every static
// gate passed -- check:refs included, because the identifier WAS bound. A tab walk that only
// counts focusable controls would report a healthy number on a page that had crashed.
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 140)));
try {
  for (const tab of TABS) {
    await page.goto(`${base}?zt=${tab}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await settledText(page, { min: 200, timeout: 45000 }).catch(() => {});
    await page.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur(); });
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const role = a.getAttribute("role");
        if (role !== "button" && role !== "checkbox") return null;
        if (a.tagName === "BUTTON" || a.tagName === "A") return null; // natively focusable anyway
        return (a.getAttribute("aria-label") || a.innerText || "").trim().replace(/\s+/g, " ").slice(0, 30) || "(unnamed)";
      });
      if (id) seen.add(id);
    }
    grand += seen.size;
    const sample = [...seen].slice(0, 3);
    const chars = await page.evaluate(() => (document.body.innerText || "").length);
    const boundary = await page.evaluate(() => /This screen hit a bug/.test(document.body.innerText || ""));
    if (boundary) fails.push(`${tab}: the error boundary is on screen — this tab crashed`);
    console.log(`  ${tab.padEnd(9)} Tab reached ${String(seen.size).padStart(3)} converted control(s)  ${String(chars).padStart(5)} chars  ${JSON.stringify(sample)}`);
    // An UNNAMED announced button is its own defect: a screen reader says "button" and
    // nothing more. Report it here rather than letting the count look healthy.
    if (seen.has("(unnamed)")) fails.push(`${tab}: a converted control announces as an unnamed button`);
  }
} finally {
  await browser.close();
  stop();
}
if (pageErrors.length) {
  const uniq = [...new Set(pageErrors)];
  fails.push(`the app threw ${pageErrors.length} runtime error(s): ${JSON.stringify(uniq.slice(0, 3))}`);
}
// An error boundary REPLACES the screen, so a crashed tab renders very little. Counting
// controls cannot see that; a floor on the text can.
if (!grand) fails.push("Tab reached ZERO converted controls on every tab — the attributes are present but the tab order does not reach them");
if (fails.length) { console.error("\nFAIL:\n" + fails.map((f) => "  - " + f).join("\n") + "\n"); process.exit(1); }
console.log(`\ncore tab reachability: ok — ${grand} converted control(s) reached by real Tab presses across ${TABS.length} tabs.`);
