// Distinguish "no converted controls on this tab" from "present but Tab cannot reach them".
//
// The tab walk reported ZERO on `today` and `routes`, and those are opposite problems with
// opposite fixes: nothing to reach is fine, whereas present-and-unreachable would mean the
// sweep is cosmetic on the app's primary navigation. Counting what is in the DOM answers it.
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
const port = await claim(5490);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
for (const mod of ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx"]) await fetch(base + mod).catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
try {
  for (const tab of ["today", "routes", "discover", "crew", "logbook", "me"]) {
    await page.goto(`${base}?zt=${tab}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await settledText(page, { min: 200, timeout: 45000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const conv = [...document.querySelectorAll('[role="button"],[role="checkbox"]')]
        .filter((e) => e.tagName !== "BUTTON" && e.tagName !== "A");
      const visible = conv.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      return {
        converted: conv.length,
        visible: visible.length,
        natives: document.querySelectorAll("button,a[href],input,select,textarea").length,
        chars: (document.body.innerText || "").length,
        head: (document.body.innerText || "").replace(/\n/g, " | ").slice(0, 90),
      };
    });
    console.log(`${tab.padEnd(9)} converted=${String(r.converted).padStart(3)} visible=${String(r.visible).padStart(3)} natives=${String(r.natives).padStart(3)} chars=${String(r.chars).padStart(5)}`);
    console.log(`          ${r.head}`);
  }
} finally {
  await browser.close();
  stop();
}
