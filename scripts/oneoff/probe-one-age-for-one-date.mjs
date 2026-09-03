#!/usr/bin/env node
// ONE DATE, ONE AGE -- and a count is not "verified" unless it counts verified things.
//
// The route page's Reports tab prints the route's LATEST REPORT DATE twice and used to give
// two different ages for it: "Updated 3mo ago" in the freshness strap, and "Most recent
// report: 2mo ago - 2026-06-20" in the consensus panel about 700px below. One fact, two
// derivations, on ONE screen -- check:ui's screen-count guard compares two SCREENS and is
// blind to this by construction.
//
// The cause was a private reimplementation of core's ago() that ROUNDED where ago() FLOORS
// (Math.round(75/30) is 3, Math.floor(75/30) is 2) and carried no year bucket at all, so a
// 2023 report read "44mo ago". Measured over every distinct date the seed catalog actually
// renders, the two ladders disagreed on 34 of 35. A third copy formatted Home's friend feed.
//
// SECTION 1 is static and runs FIRST on purpose: it is milliseconds, and with it second a
// browser flake would take the whole run down before any structural regression was reported
// -- the ordering trap check:clickable records, where whichever block exits first is the
// only one anyone reads. Nothing exits early; both sections always run.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "RouteDetail.jsx"];
const problems = [];

// =======================================================================================
// SECTION 1 -- static: is there still only ONE general-purpose age ladder?
//
// The browser half below can only see the Reports tab, and this defect had three instances:
// the two on that tab, plus Home's friend feed. A screen-scoped assertion cannot cover a
// screen it does not open, so the rule that closes the class has to be structural.
//
// Parsed with Babel rather than scanned as text, deliberately: the comments this change
// added NAME the strings it forbids ("44mo ago", "Updated 3mo ago"), so a text scan would
// fail on its own documentation -- the trap check:ci-cancel records from the other side.
// Only STRING LITERALS and template chunks are searched, and a comment is neither.

// A producer that is not ago() must be declared here WITH A REASON, and a declaration that
// stops matching fails as stale -- the standard KNOWN/NEEDS_EXTRA_STATE are held to.
const DECLARED = {
  "ClimbMatchCore.jsx| mo ago":
    "the belay-catch ledger's recLbl, whose input is already a count of MONTHS (lastM) rather " +
    "than days -- a different question from ago(), and it renders with a leading space",
};

const seen = new Set();
let strings = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  const look = (value, start) => {
    strings++;
    if (/ verified report/.test(value)) {
      problems.push(`${f} @${start}: ${JSON.stringify(value)} — condRep()/acts.length is a REPORT count, ` +
        `not a verified one; the app's own sibling site already renders it as "report(s)".`);
    }
    if (!/mo ago/.test(value)) return;
    const key = f + "|" + (value.indexOf(" mo ago") >= 0 ? " mo ago" : "mo ago");
    seen.add(key);
    // ago() is the one blessed producer: accept a literal only inside its own body.
    if (/function ago\(d\)\{[^]*$/.test(src.slice(Math.max(0, start - 700), start))) return;
    if (DECLARED[key]) return;
    problems.push(`${f} @${start}: ${JSON.stringify(value)} — a second age ladder. Use core's ago().`);
  };
  traverse(ast, {
    StringLiteral(p) { look(p.node.value, p.node.start); },
    TemplateElement(p) { look((p.node.value && p.node.value.raw) || "", p.node.start); },
  });
}
const stale = Object.keys(DECLARED).filter((k) => !seen.has(k));
if (stale.length) problems.push("stale declaration(s) — the producer is gone: " + stale.join(", "));
// Fails CLOSED: a parse that yields almost nothing would clear every rule above vacuously.
if (strings < 5000) problems.push(`only ${strings} string literals parsed across ${FILES.length} files — a broken scan, not a clean app`);
console.log(`[static] ${strings} string literals across ${FILES.length} app files`);
console.log(`[static] age-ladder producers: ${[...seen].join(", ") || "(none — the scan is broken)"}`);

// =======================================================================================
// SECTION 2 -- the screen: do the two lines agree?
//
// This drives the REAL app rather than rendering a component, because the defect is that two
// different code paths format one value: a render of either alone proves nothing about
// whether they agree. It needs no fixture -- the seed catalog's latest activity is ~75 days
// old, which is exactly the case the ladders disagreed on. That is luck today, so a line it
// cannot find is reported as NOT MEASURED rather than as agreement.
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
const port = await freePort(5600, 5639);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up) { console.error("dev server never came up — section 2 measured nothing."); stop(); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultNavigationTimeout(120000);
await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
let txt = null;
if (!(await page.evaluate(() => window.__routeOpen === true))) {
  problems.push("?zr=1 never opened a route — the screen was NOT measured, which is not a clean screen.");
} else {
  await settledText(page);
  // From Overview, not from Photos: check:overflow records that this is the order in which
  // the sub-tab clicks actually land.
  await tapByText(page, "Overview");
  await settledText(page);
  if (!(await tapByText(page, "Reports"))) {
    problems.push("the Reports sub-tab was not found — the screen was NOT measured.");
  } else {
    await settledText(page);
    txt = await page.evaluate(() => document.body.innerText || "");
  }
}
await browser.close();
stop();

if (txt) {
  const strap = txt.match(/Updated ([^\n·]+?)(?=\s*(?:↘|↗|→|\n|$))/);
  const recent = txt.match(/Most recent report:\s*([^·\n]+?)\s*·\s*(\d{4}-\d{2}-\d{2})/);
  if (!strap) problems.push('the "Updated ..." freshness strap did not render — NOT MEASURED, not agreement');
  if (!recent) problems.push('the "Most recent report: ..." line did not render — NOT MEASURED, not agreement');
  if (strap && recent) {
    const a = strap[1].trim(), b = recent[1].trim(), date = recent[2];
    console.log(`[screen] latest report date  : ${date}`);
    console.log(`[screen] freshness strap     : "Updated ${a}"`);
    console.log(`[screen] consensus panel     : "Most recent report: ${b}"`);
    if (a !== b) problems.push(`one date (${date}) is reported as "${a}" and as "${b}" on one screen`);
    else console.log(`[screen] -> both derive "${a}" from ${date}`);
  }
  // The honest figure the badge used to contradict, printed a few hundred pixels below it.
  if (/\d+\s+verified reports?/.test(txt)) problems.push('a badge still claims "N verified reports" from a plain report count');
  const vc = txt.match(/(\d+) of (\d+) reports from verified climbers/);
  if (!vc) problems.push("the verified-climber line did not render — that is the figure the badge must not contradict, so its absence is NOT MEASURED");
  else {
    console.log(`[screen] verified climbers   : ${vc[1]} of ${vc[2]}`);
    const badge = txt.match(/✓\s*(\d+)\s+reports?\b/);
    if (badge) console.log(`[screen] what's-changed badge: "✓ ${badge[1]} reports" — the report count, said plainly`);
  }
}

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — one general-purpose age ladder, one age per date on screen, and no count called verified that is not.");
