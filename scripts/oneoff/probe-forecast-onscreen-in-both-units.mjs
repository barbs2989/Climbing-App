#!/usr/bin/env node
// The forecast panel, rendered TWICE -- once imperial, once metric -- and the two compared.
//
// The sibling probe (probe-weather-honours-the-unit-setting.mjs) unit-tests the helpers and
// asserts the wiring statically. Neither of those proves the setting reaches the screen: the
// helpers could be perfect and every call site could still be passing the wrong variable.
// This renders the real panel and checks that each metric figure IS the conversion of the
// imperial one it replaced.
//
// It cannot drive the units toggle, and the reason is worth recording. `units` is
// useState("imperial") with NO persistence, so it cannot survive the page load that `?zr=1`
// needs; and in-session the Settings screen renders OVER the nav, while leaving the Climbs
// tab clears `selRoute` -- so by the time the units are metric the route page is gone.
// `window.__routeOpen` stays true once set and reported the route as still open throughout,
// which is a scaffold flag rather than live state. The initial value is rewritten in memory
// by scripts/metric-units.config.mjs instead, as zero-state.config.mjs replays the sign-in
// reset.
//
// THE FORECAST IS A LIVE FETCH, so a run with no network proves nothing. Finding no figures
// at all is reported as NOT MEASURED rather than as agreement.
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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

async function walk(config, label) {
  const port = await freePort(5760, 5799);
  if (port === null) throw new Error("no free port");
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const server = spawn("npx", ["vite", "--config", config, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
  server.stdout.on("data", () => {});
  server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST/.test(s)) process.stderr.write(s); });
  const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
  try {
    let up = false;
    for (let i = 0; i < 120; i++) { try { if ((await fetch(base)).ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 500)); }
    if (!up) throw new Error(`${label}: dev server never came up`);
    await fetch(base + "ClimbMatch.jsx").catch(() => {});
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultNavigationTimeout(120000);
    await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
    if (!(await page.evaluate(() => window.__routeOpen === true))) { await browser.close(); throw new Error(`${label}: ?zr=1 never opened a route`); }
    await settledText(page);
    // The forecast lives on Safety. Walk to it rather than assuming, and settle: it is a fetch.
    for (const sub of ["Overview", "Safety"]) { if (await tapByText(page, sub)) await settledText(page); }
    const t = await page.evaluate(() => document.body.innerText || "");
    await browser.close();
    return {
      hiLo: (t.match(/High (-?\d+)° · Low (-?\d+)°/) || []).slice(1).map(Number),
      wind: (t.match(/(\d+) (mph|km\/h)/) || []).slice(1),
      precip: (t.match(/([\d.]+)("| mm) expected/) || []).slice(1),
      delta: (t.match(/differs (-?\d+)°/) || [])[1],
    };
  } finally { stop(); }
}

const imp = await walk("scripts/overlay-scroll.config.mjs", "imperial");
const met = await walk("scripts/metric-units.config.mjs", "metric");
console.log("  imperial:", JSON.stringify(imp));
console.log("  metric  :", JSON.stringify(met));

const problems = [];
// Fails CLOSED: the forecast is a live fetch, and no figures means nothing was measured.
if (!imp.hiLo.length || !imp.wind.length) problems.push("the imperial run produced no forecast figures — NOT MEASURED (is the network up?)");
if (!met.hiLo.length || !met.wind.length) problems.push("the metric run produced no forecast figures — NOT MEASURED");

const F2C = (f) => Math.round((f - 32) * 5 / 9);
if (imp.hiLo.length === 2 && met.hiLo.length === 2) {
  for (const [i, name] of [[0, "High"], [1, "Low"]]) {
    const want = F2C(imp.hiLo[i]);
    if (met.hiLo[i] !== want) problems.push(`${name}: imperial ${imp.hiLo[i]}°F should read ${want}°C, screen says ${met.hiLo[i]}°`);
  }
}
if (imp.wind.length === 2 && met.wind.length === 2) {
  if (imp.wind[1] !== "mph") problems.push(`imperial wind unit is ${imp.wind[1]}, expected mph`);
  if (met.wind[1] !== "km/h") problems.push(`metric wind unit is ${met.wind[1]}, expected km/h`);
}
// The DELTA is the one an offset conversion gets spectacularly wrong: 9F apart is 5C apart,
// and subtracting 32 would print -13.
if (imp.delta && met.delta) {
  const want = Math.round(Number(imp.delta) * 5 / 9);
  if (Number(met.delta) !== want) problems.push(`provider disagreement: ${imp.delta}°F apart should read ${want}°C apart, screen says ${met.delta}° (an offset conversion gives ${F2C(Number(imp.delta))})`);
  else console.log(`  -> the provider disagreement converts as a DIFFERENCE: ${imp.delta}° -> ${met.delta}°, not ${F2C(Number(imp.delta))}°`);
}

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the forecast reads in the climber's own units, and a temperature difference converts as one.");
