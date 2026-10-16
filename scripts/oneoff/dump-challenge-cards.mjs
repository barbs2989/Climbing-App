// Which tick-list cards does the Challenges screen actually SHOW?
//
// Written because a --snapshot of the Logbook screen reported all four gated cards absent — and
// all seven live ones absent too, because the snapshot captured the Objectives sub-tab. Every name
// being missing is a VACUOUS pass: it proves nothing about the gate. This opens the Challenges
// sub-tab and dumps what is on it, so the answer is a list rather than an assertion.
//
// Harness copied from scripts/check-challenge-rows.mjs, which is the guard that already knows how
// to reach this screen. DEMO_FILLERS is a source constant (false), not an env var, so the gate
// applies here exactly as it does in production.
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = 5390 + Math.floor(Math.random() * 40);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);

let up = false;
for (let i = 0; i < 60 && !died; i++) {
  try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 2000));
}
if (!up) { console.error(died ? "dev server exited during startup" : "dev server never came up"); stop(); process.exit(1); }

// WARM THE BIG MODULES BEFORE NAVIGATING. Vite compiles on demand and ClimbMatchCore.jsx emits
// ~4.9MB — about 4s on an idle machine, far longer on a loaded one. Without this, page.goto sits
// waiting for domcontentloaded and times out, which reads as a broken app rather than a slow
// transform. Fetching them first pays that cost once, outside the navigation.
for (const m of ["main.jsx", "ClimbMatchCore.jsx", "ClimbMatch.jsx"]) {
  const t0 = Date.now();
  try {
    const r = await fetch(base + m, { signal: AbortSignal.timeout(300000) });
    console.log(`  warmed ${m.padEnd(20)} ${r.status}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) { console.log(`  warm ${m} failed: ${String(e.message).split("\n")[0]}`); }
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
await page.goto(base + "?zt=logbook", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const tapped = await page.evaluate(() => {
  const els = [...document.querySelectorAll("button,div,span")].reverse();
  const hit = els.find(e => e.textContent && e.textContent.trim() === "Challenges" && e.getBoundingClientRect().width > 0);
  if (hit) { hit.click(); return true; }
  return false;
});
if (!tapped) { console.error("ANCHOR LOST: could not reach the Challenges sub-tab — dumped nothing"); await browser.close(); stop(); process.exit(1); }
await page.waitForTimeout(2500);

// Every card the screen renders, by its own label. Matched against a known label list rather than
// scraped blind, so a card that is present but RENAMED shows up as missing rather than being
// silently counted as something else.
const NAMES = ["Regional Classics", "Peaks & Summits", "Winter Season", "Little Cottonwood",
               "Colorado 14ers", "The Bulgers", "Cascade Volcanoes", "California 14ers",
               "Fifty Classic", "Desert Towers", "Discipline Quiver"];
const GATED = new Set(["Regional Classics", "Peaks & Summits", "Winter Season", "Little Cottonwood"]);
const found = await page.evaluate((names) => {
  const txt = document.body.innerText || "";
  return names.filter(n => txt.includes(n));
}, NAMES);

console.log(`\n=== cards on the Challenges sub-tab ===`);
for (const n of NAMES) {
  const on = found.includes(n);
  const tag = GATED.has(n) ? (on ? "SHOWN  <-- should be demo-only" : "hidden (demo-only)")
                           : (on ? "SHOWN" : "MISSING <-- expected to show");
  console.log(`  ${tag.padEnd(31)} ${n}`);
}
console.log(`\n${found.filter(n => !GATED.has(n)).length} live card(s) shown, ${found.filter(n => GATED.has(n)).length} gated card(s) shown.`);
if (!found.length) console.log("NOTHING matched — the panel did not render, so this dump proves nothing.");
await browser.close();
stop();
