// Open the route detail and print the outerHTML of the control whose announced name glues a
// climber's name to the report outcome, so the JSX can be located by its inline styles.
// Spawn flags copied from check-a11y-badge-names.mjs rather than reinvented — the host and
// the DEMO_AUTOLOGIN env are both load-bearing.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5294;
const base = `http://127.0.0.1:${PORT}`;

const server = spawn(
  "npx",
  ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };

// Wait for the port to answer rather than guessing a fixed delay.
async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(base); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
if (!(await waitUp())) { console.error("dev server never answered"); stop(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("[role=button]")) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (/Attempt|Summit/.test(t) && /\d{4}-\d{2}-\d{2}/.test(t)) {
      out.push({ text: t.slice(0, 90), html: el.outerHTML.slice(0, 1600) });
    }
  }
  return out.slice(0, 2);
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
stop();
process.exit(0);
