// DEMO_FILLERS is ON so every surface carries a worked example. This asks the question that
// request actually poses: with the flag on, which surfaces STILL render an empty state?
//
// It is answered in a BROWSER rather than statically, and that was a correction. A static version
// tried to resolve each absence claim back to its state variable and reported "0 of 61 seeded",
// which is plainly wrong -- `catches`, `events` and `groupReqs` are seeded and their surfaces do
// show examples. Resolving a gating expression through 400kB single-line JSX is the
// partial-measurement trap; whether a sentence is ON SCREEN needs no resolution at all.
//
// A screen that never settles reports NOT MOUNTED rather than clean, so a loaded box costs
// coverage rather than producing a false all-clear.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter((f) => f.endsWith(".jsx")).map((f) => "lib/" + f));

// A string that CLAIMS there is nothing. Deliberately broad: this is a reading list, and the
// deny-list failure recorded for check:outage's rule 2 is that one more adjective defeats it.
const ABSENCE = /^(No |Nothing |None |You have no |0 )/i;
const TAIL = /(yet|so far|here|found|match)/i;
const claims = new Set();
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const m of src.matchAll(/"([^"\\\n]{6,110})"/g)) {
    const s = m[1];
    if (ABSENCE.test(s) && TAIL.test(s)) claims.add(s);
  }
}
const CLAIMS = [...claims];
console.log("absence-claiming strings in source: " + CLAIMS.length);
if (CLAIMS.length < 20) { console.error("BROKEN: the claim scan found almost nothing."); process.exit(1); }

async function claimPort(s) {
  for (let p = s; p < s + 40; p++) {
    const free = await new Promise((r) => { const x = net.createServer(); x.once("error", () => r(false)); x.once("listening", () => x.close(() => r(true))); x.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5500);
const base = "http://127.0.0.1:" + port + "/Climbing-App/";
const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST/.test(s)) process.stderr.write(s); });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);
let up = false;
for (let i = 0; i < 200; i++) { try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 500)); }
if (!up) { console.error("BROKEN: dev server never came up"); stop(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultNavigationTimeout(240000);
async function settle(ms) {
  let last = "", same = 0; const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const t = await page.evaluate(() => document.body.innerText.replace(/\d+/g, "#")).catch(() => "");
    if (t && t === last) { if (++same >= 3) return; } else { same = 0; last = t; }
    await page.waitForTimeout(300);
  }
}

await page.goto(base, { waitUntil: "domcontentloaded" });
await settle(60000);
const overlays = await page.evaluate(() => (window.__overlays || []).slice());
const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me"];
console.log("tabs " + TABS.length + " + overlays " + overlays.length + "\n");

const seenOn = new Map();     // claim -> [where]
let walked = 0, notMounted = 0;
async function visit(url, label, first) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await settle(first ? 60000 : 15000);
  const txt = await page.evaluate(() => document.body.innerText);
  if (!txt || txt.length < 120) { notMounted++; console.log("  -- " + label + ": NOT MOUNTED"); return; }
  walked++;
  for (const c of CLAIMS) if (txt.includes(c)) { if (!seenOn.has(c)) seenOn.set(c, []); seenOn.get(c).push(label); }
}
for (let i = 0; i < TABS.length; i++) await visit(base + "?zt=" + TABS[i], "tab:" + TABS[i], i === 0);
for (const o of overlays) await visit(base + "?z=" + o, "modal:" + o, false);

await browser.close(); stop();

console.log("\nscreens walked: " + walked + ", not mounted: " + notMounted);
console.log("absence claims ON SCREEN with DEMO_FILLERS on: " + seenOn.size + " of " + CLAIMS.length + "\n");
for (const [c, where] of [...seenOn.entries()].sort()) {
  console.log('  "' + c + '"');
  console.log("      " + [...new Set(where)].join(", "));
}
if (!walked) { console.error("\nBROKEN: nothing mounted — this run proves nothing."); process.exit(1); }
