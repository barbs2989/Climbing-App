#!/usr/bin/env node
// check:anniversary — the climb-anniversary notification still reaches a screen.
//
// #713 revived this feature. It used to map over MY_CLIMBS, a constant DEMO_FILLERS empties,
// so `_anniv` produced [] and no anniversary could EVER fire; being spread into mergedNotifs
// beside four live sources hid it completely, because the notification list worked. It now
// derives from the user's real `logs`.
//
// Nothing rendered it afterwards, and nothing easily could, because the feature is
// DATE-GATED: `_anniv` only fires for a log whose yearly anchor is within two days of today.
// The seed logbook holds one entry dated 2026-05-24, so on ~360 days of the year this
// renders nothing at all -- and every other guard walks the app on one of those days. A
// feature that is invisible to your guards 98% of the time is a feature that will break
// silently and stay broken for a year.
//
// scripts/anniversary.config.mjs injects a log dated exactly one year ago today, cloned from
// the seed entry so it is shaped like a real log, and this asserts the notification renders.
//
//   npm run check:anniversary
//   npm run check:anniversary -- --dump out.json
//
// What a pass means, precisely: with a qualifying log present, the anniversary notification
// is composed and reaches the notifications surface with its text intact. It does NOT prove
// the date arithmetic is right for every calendar case -- the probe sits one year back to the
// day, which is the easy case. It proves the path from `logs` to the screen is not severed,
// which is the failure that actually shipped.

import { settledText } from "./lib/render-settle.mjs";
import { oneYearAgoISO, firstLogEntry } from "./anniversary.config.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const DUMP = argOf("--dump");
const PORT = 5310;
const CHROME_ONLY = 90; // the wordmark + nav labels, and nothing else

// The two surfaces that render mergedNotifs: the notifications panel and Home's alerts
// dropdown. Checking both is the point -- #713's defect was invisible precisely because the
// list around it worked, so "some notification surface rendered" is not the question.
const SURFACES = [
  { label: "notifications panel", qs: "?zt=me&z=notifOpen", tabs: ["me", "today", "crew", "logbook"] },
  { label: "Home alerts dropdown", qs: "?zt=today&z=alertsOpen", tabs: ["today"] },
];

// The stable halves of the composed string. The middle names the route, which resolves
// differently on seed vs USE_DB (routeById may not find a seed id in the DB catalog, and the
// text then falls back to "a route") -- asserting on it would make this red for a reason that
// is not this feature's fault. The tail proves the WHOLE string composed, not a truncation.
const HEAD = "1 year ago today you climbed";
const TAIL = "Relive it or log this year’s send.";

const fails = [];
const fail = (where, msg) => fails.push(`${where}: ${msg}`);
const log = (...a) => console.log(...a);

// Browserless self-tests of the two pure helpers the scaffold depends on. They run here, in
// the guard CI executes, because both have failure modes that produce a WRONG PROBE rather
// than an error -- and a wrong probe fails the browser assertions below, sending whoever
// reads it hunting for a bug in the anniversary feature that does not exist.
//
// The calendar cases are what a single run cannot cover: the browser half only ever exercises
// whatever today happens to be.
function selfTest() {
  for (const [now, want] of [
    ["2026-01-01T00:30:00", "2025-01-01"],
    ["2026-12-31T23:30:00", "2025-12-31"],
    ["2026-03-01T12:00:00", "2025-03-01"],
    // A leap day one year back does not exist. "2027-02-29T12:00:00" parses to Mar 1, one day
    // off, which the +/-2 day gate still catches -- so this is deliberately NOT special-cased,
    // and this case pins that reasoning rather than leaving it as a comment.
    ["2028-02-29T12:00:00", "2027-02-29"],
  ]) {
    const got = oneYearAgoISO(new Date(now));
    if (got !== want) fail("self-test", `oneYearAgoISO(${now}) returned ${got}, expected ${want} — the injected probe would carry the wrong date`);
  }
  // The balancer must ignore braces inside string literals. The seed entry's prose happens to
  // contain none today, so REAL DATA DOES NOT EXERCISE THIS -- a synthetic case is the only
  // way to know it works before somebody writes "{crux}" in a trip report and the injected
  // literal silently becomes malformed.
  const withBraces = 'const [logs,setLogs]=useState([{routeId:"x",date:"2020-01-02",text:"the {crux} then a lone } brace"},{routeId:"second"}]);';
  const e = firstLogEntry(withBraces);
  if (!e) fail("self-test", "firstLogEntry could not balance an entry whose prose contains braces");
  else if (e.text.includes("second") || !e.text.endsWith('brace"}')) {
    fail("self-test", `firstLogEntry stopped in the wrong place on prose containing braces: ${JSON.stringify(e.text.slice(-40))}`);
  }
}
selfTest();
if (fails.length) {
  console.error("\ncheck:anniversary — the scaffold's own helpers are wrong, so the probe would be invalid:\n");
  for (const f of fails) console.error("  " + f);
  console.error("");
  process.exit(1);
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
if (port !== PORT) log(`port ${PORT} is in use by another process — using ${port} instead`);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}, with a log dated ${oneYearAgoISO()}...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/anniversary.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => {
  if (stopped) return;
  stopped = true;
  try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} }
};
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}
await fetch(base + "ClimbMatch.jsx").catch(() => {});

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
} catch (e) {
  console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
  console.error("playwright-core downloads no browser of its own — install Chrome, or run this on a runner image that has it.");
  stopServer();
  process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

async function load(qs) {
  if (died) {
    console.error("\nthe dev server exited part-way through — nothing after that point was checked.");
    stopServer();
    process.exit(1);
  }
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
  await settledText(page, { min: CHROME_ONLY, timeout: 45000 });
  await page.waitForTimeout(1200);
  return await page.innerText("body").catch(() => "");
}

log("warming the dev server...");
const warm = await load("?zt=today");
// A blank app makes every assertion below fail for the wrong reason, and a reader would
// chase a feature bug that does not exist. index.html's boot placeholder mirrors the real
// nav, so "the nav is present" proves nothing -- only content beyond the shell does.
if (warm.replace(/\s+/g, " ").trim().length <= CHROME_ONLY) {
  console.error(`\nthe app rendered only its shell (${warm.trim().length} chars) — the scaffold did not apply, or`);
  console.error("the bundle failed to compile. Nothing below would be evidence about the anniversary feed.");
  stopServer();
  process.exit(1);
}

const dump = {};
let found = 0;
for (const s of SURFACES) {
  let text = "";
  // Some overlays are scoped to one screen, so opening them from the wrong tab renders
  // nothing and the check would read a bare tab. Take the first tab where the text appears.
  for (const t of s.tabs) {
    text = await load(s.qs.replace(/zt=[a-z]+/, "zt=" + t));
    if (text.includes(HEAD)) break;
  }
  dump[s.label] = text;
  const hasHead = text.includes(HEAD);
  const hasTail = text.includes(TAIL);
  if (hasHead && hasTail) { found++; log(`  ${s.label}: ok — the anniversary notification rendered`); continue; }
  if (hasHead && !hasTail) {
    fail(s.label, `the anniversary line begins but is missing its tail ${JSON.stringify(TAIL)} — the composed string was cut short`);
    continue;
  }
  fail(s.label, `no anniversary notification, with a log dated exactly one year ago today. Expected a line containing ${JSON.stringify(HEAD)}.`);
}

if (pageErrors.length) fail("page", `uncaught error(s): ${[...new Set(pageErrors)].join(" | ")}`);

if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(dump, null, 1)); log(`\nwrote ${DUMP}`); }

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\ncheck:anniversary: ${fails.length} problem(s):\n`);
  for (const f of fails) console.error("  " + f);
  console.error(`
A log dated exactly one year ago today was injected into the seed logbook, so \`_anniv\`
should have produced a notification. If it did not, the path from \`logs\` to the
notifications surface is severed -- which is what #713 fixed and this exists to hold.

Check \`_anniv\` in ClimbMatch.jsx still maps over \`logs\` (not a DEMO_FILLERS constant),
and that its result is still spread into \`mergedNotifs\`.
`);
  process.exit(1);
}

log(`\ncheck:anniversary: ok — the anniversary notification renders on ${found} of ${SURFACES.length} surfaces that show mergedNotifs.\n`);
process.exit(0);
