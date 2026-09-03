#!/usr/bin/env node
// MEASUREMENT, not a guard: does any control's aria-label fail to contain its own
// visible text? That is WCAG 2.5.3 "Label in Name", and its practical consequence is
// that a voice-control user who says the words they can SEE cannot activate the
// control — the accessible name is what speech matches against.
//
// Three sibling guards cover control NAMES and none asks this: check:a11y-names asks
// whether a name exists, check:a11y-badges whether two fragments are welded into one,
// check:control-names whether a switch says what it is set to. A control can pass all
// three with a name that contradicts what is on screen.
//
// RESULT, 2026-09-02: ZERO real violations across all 7 tabs. Kept as the measurement
// of record, NOT wired, because the reason it cannot become a guard is the useful part.
//
// Every hit it still prints is an artifact of treating innerText as "the visible label",
// and a composite row makes that ill-defined in three separate ways:
//   * a BADGE COUNT is in the text but is not part of the label ("1 Logbook" vs "Logbook",
//     "Crew 7" vs "Crew") -- correct markup, and 2.5.3 is satisfied because a voice user
//     says the label, not the badge.
//   * a NESTED BUTTON's text is inside the row's innerText. The leaderboard row's
//     "Message"/"Requested"/"Accept" is its own <button> with stopPropagation, separately
//     focusable and separately named, so the ROW's label correctly omits it.
//   * GLUED visible text ("TickShared", "@nathanclimbsYOU") tokenises into a word that is
//     in no label, and the mismatch then cascades through every word after it.
// Excluding all three leaves nothing to assert, so a gate here would be noise. See
// [[a-detector-scoped-to-the-whole-object-misses-partial-defects]] for the mirror shape.
//
// It looks only at controls carrying BOTH visible text and an explicit aria-label,
// which is 2.5.3's dominant real failure and needs no AX tree: an icon-only button has
// no visible text, so the rule does not apply to it and it is skipped rather than
// reported.
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const log = (m) => console.log(m);

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
const port = await freePort(5380, 5419);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

// the overlay-scroll scaffold, reused verbatim rather than adding another config
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up || died) { console.error("dev server never came up"); stopServer(); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);

const SCAN = () => {
  // split a digit run off an adjacent letter run so the badge shape "Friends2" compares
  // equal to the label "Friends, 2" -- otherwise every counted tab reads as a violation.
  const norm = (t) => String(t || "").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2").replace(/[^\w ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const out = [];
  for (const el of document.querySelectorAll('[aria-label]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;                 // not rendered
    const role = el.getAttribute("role") || el.tagName.toLowerCase();
    // A <select>'s innerText is every OPTION it holds, which is not a visible label,
    // so including it reports a wall of correct controls.
    const tag = el.tagName.toLowerCase();
    if (tag === "select") continue;
    const interactive = /^(button|a|input|textarea)$/.test(tag)
      || /^(button|link|checkbox|switch|tab|menuitem|radio|option)$/.test(role);
    if (!interactive) continue;
    const vis = norm(el.innerText);
    if (!vis) continue;                                   // icon-only: 2.5.3 does not apply
    const name = norm(el.getAttribute("aria-label"));
    if (!name) continue;
    // WCAG 2.5.3 wants the visible words present IN ORDER, not a contiguous substring:
    // a label may legitimately interleave extra words ("#1, @maya, VERIFIED, 40,557 pts").
    // A substring test reports every one of those as a defect -- measured, it reported 15.
    const vw = vis.split(" ").filter(Boolean), nw = name.split(" ").filter(Boolean);
    let i = 0;
    for (const w of nw) if (i < vw.length && w === vw[i]) i++;
    if (i < vw.length) out.push({ role, missing: vw.slice(i).join(" "), visible: el.innerText.trim().slice(0, 60), label: el.getAttribute("aria-label").slice(0, 70) });
  }
  return out;
};

const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"];
await page.goto(base, { waitUntil: "domcontentloaded" });
await settledText(page);

let examined = 0;
const findings = new Map();
for (const t of TABS) {
  const tapped = await page.evaluate((label) => {
    const el = [...document.querySelectorAll("[aria-label]")].find((e) => {
      const l = e.getAttribute("aria-label");
      return l === label || l.startsWith(label + ",") || l.startsWith(label + " ");
    });
    if (!el) return false;
    el.click();
    return true;
  }, t);
  if (!tapped) { log(`  ${t}: nav control not found — skipped`); continue; }
  await settledText(page);
  const n = await page.evaluate(() => document.querySelectorAll("[aria-label]").length);
  examined += n;
  for (const f of await page.evaluate(SCAN)) {
    findings.set(f.visible + "|" + f.label, { ...f, tab: t });
  }
  log(`  ${t}: ${n} labelled control(s)`);
}

await browser.close();
stopServer();

if (examined < 40) { console.error(`\nonly ${examined} labelled controls seen across ${TABS.length} tabs — the scan broke, this is not a clean app.`); process.exit(1); }

console.log(`\n${examined} labelled control(s) examined; ${findings.size} where the aria-label does NOT contain the visible text\n`);
for (const f of findings.values()) {
  console.log(`  [${f.tab}] ${f.role}`);
  console.log(`      visible: ${JSON.stringify(f.visible)}`);
  console.log(`      label  : ${JSON.stringify(f.label)}`);
  console.log(`      MISSING from the label: ${JSON.stringify(f.missing)}`);
}
