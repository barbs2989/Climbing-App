// Locate the converted control that announces as an unnamed button.
//
// The applier's name check is STATIC: it asks whether the JSX has a text child, an
// expression child, or an authored label. That is not the same question as "does this
// render any text at runtime" — an expression child can evaluate to empty. The tab walk
// caught one on `discover`; this prints enough of it to identify the source.
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
const port = await claim(5470);
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
    const hits = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[role="button"][tabindex="0"], [role="checkbox"][tabindex="0"]')) {
        if (el.tagName === "BUTTON" || el.tagName === "A") continue;
        const name = (el.getAttribute("aria-label") || el.innerText || "").trim();
        if (name) continue;
        out.push({
          html: el.outerHTML.slice(0, 150),
          kids: el.children.length,
          cls: el.className || "",
          box: (() => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; })(),
        });
      }
      return out;
    });
    if (hits.length) {
      console.log(`\n=== ${tab}: ${hits.length} unnamed converted control(s) ===`);
      for (const h of hits) console.log(`  ${h.box}  kids=${h.kids}\n    ${h.html}\n`);
    }
  }
} finally {
  await browser.close();
  stop();
}
