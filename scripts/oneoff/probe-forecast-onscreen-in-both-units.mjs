#!/usr/bin/env node
// The forecast panel, rendered TWICE -- once imperial, once metric -- and the two compared.
//
// The sibling check (check:units, the `weather` section) unit-tests the helpers and
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
import { assertQuietBox } from "../lib/quiet-box.mjs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

// A browser verdict from an oversubscribed box is not evidence in either direction — a miss reads
// as a live defect, a pass can be vacuous because nothing settled. Refuses above 6x cores; --anyway
// runs regardless and stamps the output as not evidence. See scripts/lib/quiet-box.mjs.
assertQuietBox("probe-forecast-onscreen-in-both-units.mjs");

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
      // The label and the value are separate divs, so innerText puts a newline between them.
      // CASE-INSENSITIVE, and that is not defensiveness: the label div carries
      // textTransform:"uppercase", and innerText returns the CSS-TRANSFORMED text -- so the
      // screen reads "FREEZING LEVEL". A case-sensitive needle matched nothing and reported the
      // tile as REMOVED FROM THE PANEL on a perfectly correct app. CLAUDE.md already records
      // this trap twice (check:ui's PEOPLE YOU'VE CLIMBED WITH, and "CREW · 2 MEMBERS").
      freeze: (t.match(/Freezing level\s*([\d,]+)\s*(ft|m)\b/i) || []).slice(1),
      freezeLabel: /Freezing level/i.test(t),
    };
  } finally { stop(); }
}

// ===== THE FREEZING-LEVEL COMPARISON, SELF-TESTED BEFORE ANY BROWSER RUNS =====================
// This probe's healthy output is "everything converted", which is also what a comparison that can
// no longer fire prints. Worse here than usual: on a loaded box the METRIC leg routinely produces
// no figures at all, so the happy path can go unexercised for a whole session and a green run
// would prove nothing about it. The classifier is therefore exercised on constructed pairs FIRST
// -- the same non-vacuity contract measure-optimistic-writes-by-handler.mjs uses -- and one
// implementation serves the self-test and the real comparison, so the two cannot drift.
//
// A BAND RATHER THAN EQUALITY, SIZED BY THE DEFECT AND NOT FITTED TO THE DATA. The two runs are
// SEPARATE page loads making SEPARATE forecast fetches, so the value can legitimately move
// between them -- observed on this probe as a provider delta of 12°F in one run against 6°C in
// the other, which is drift rather than a conversion error. Demanding exact equality turns that
// into a red probe. An UNCONVERTED figure is 3.28x out, which no 10% band can hide.
const FT_PER_M = 3.28084;
function freezeVerdict(impFreeze, metFreeze) {
  const out = [];
  if (impFreeze[1] !== "ft") out.push(`imperial freezing level unit is ${impFreeze[1]}, expected ft`);
  if (metFreeze[1] !== "m") out.push(`metric freezing level unit is ${metFreeze[1]}, expected m`);
  const impFt = Number(String(impFreeze[0]).replace(/,/g, ""));
  const metM = Number(String(metFreeze[0]).replace(/,/g, ""));
  const want = Math.round(impFt / FT_PER_M);
  const ratio = metM > 0 ? want / metM : 0;
  if (!(ratio > 0.9 && ratio < 1.1)) out.push(`freezing level: imperial ${impFt} ft is ~${want} m, screen says ${metM} — that is not a conversion (an unconverted figure would read ${impFt})`);
  return out;
}
for (const [a, b, want, why] of [
  [["16,404", "ft"], ["5,000", "m"], 0, "a clean conversion"],
  [["16,404", "ft"], ["16,404", "m"], 1, "THE DEFECT: the number never moved, only the unit word"],
  [["16,404", "ft"], ["4,900", "m"], 0, "ordinary drift between two independent fetches still passes"],
  [["16,404", "ft"], ["3,000", "m"], 1, "a figure that is neither the value nor its conversion"],
  [["16,404", "ft"], ["5,000", "ft"], 1, "the metric run still showing feet"],
]) {
  const got = freezeVerdict(a, b).length ? 1 : 0;
  if (got !== want) {
    console.error(`SELF-TEST FAIL (${why}): ${JSON.stringify(a)} vs ${JSON.stringify(b)} -> ${got}, want ${want}`);
    console.error("the freezing comparison does not reproduce its own known shapes, so a clean report about the app would prove nothing");
    process.exit(1);
  }
}
console.log("  self-test: the freezing comparison accepts a real conversion and rejects three wrong ones.");

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

// THE FREEZING LEVEL WAS THE ONE TILE IN THIS PANEL THAT DID NOT CONVERT, and this probe did
// not read it -- so the browser half of that defect had no witness at all while the seven
// siblings around it were covered. It is the tile that decides whether an ice route is frozen.
//
// ABSENCE IS SPLIT IN TWO, because the two want opposite reactions. No LABEL means the tile was
// removed from the panel, which is a defect. A label with no NUMBER means the provider returned
// no freezing level for this run -- `uElev(null)` renders NOVAL -- which is not our defect and
// must not fail a correct app. Saying "not measured" is the honest answer there.
// GATED ON THE PANEL HAVING RENDERED AT ALL, and that is not belt-and-braces: when the metric
// run produced no forecast figures (a slow fetch on a loaded box), the checks below reported
// "the tile was removed from the panel" ON TOP of the NOT MEASURED above — a second, WRONG
// diagnosis of a run that simply never loaded. Nothing about this tile is knowable from a walk
// whose forecast never arrived, so it says nothing rather than accusing the app.
const forecastRendered = imp.hiLo.length && imp.wind.length && met.hiLo.length && met.wind.length;
if (!forecastRendered) {
  console.log("  -> the freezing level was NOT MEASURED: a run produced no forecast figures at all");
} else if (!imp.freezeLabel) problems.push("the imperial run shows no Freezing level tile at all — it was removed from the panel");
else if (!met.freezeLabel) problems.push("the metric run shows no Freezing level tile at all — it was removed from the panel");
else if (imp.freeze.length !== 2 || met.freeze.length !== 2) {
  console.log("  -> note: the Freezing level tile carried no number this run (the provider gave none), so its conversion was NOT MEASURED");
} else {
  for (const p of freezeVerdict(imp.freeze, met.freeze)) problems.push(p);
  if (!freezeVerdict(imp.freeze, met.freeze).length) console.log(`  -> the freezing level converts: ${imp.freeze.join(" ")} -> ${met.freeze.join(" ")}`);
}

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the forecast reads in the climber's own units, and a temperature difference converts as one.");
