#!/usr/bin/env node
// check:axe — every screen passes axe-core's WCAG 2.2 A/AA rules, in a real browser.
//
// Why it exists. The 2026-10-22 accessibility risk audit ran axe-core over the whole app for the
// first time. The repo's own a11y guards (check:a11y-names, check:control-names, check:clickable,
// check:selected-state, check:a11y-badges) all passed, and axe still found eight rules failing:
// footer links 22px tall on every desktop page, tag text at 3.9:1, 49 rows with buttons nested in
// a row that was itself a button, seven unnamed dialogs, an unnamed avatar button, photo buttons
// marked as decoration, and screens with no <h1> or no main landmark. Every one is a rule a
// plaintiff's scanner runs first, and the static guards are structurally blind to most of them:
// contrast, size and nesting are properties of LAYOUT, not of source text.
//
// What it walks:
//   SIGNED IN  the eight NAV tabs and the seven route sub-tabs at a phone (390px) and a desktop
//              (1280px) width, and every app overlay the scaffold can open, at phone width.
//   SIGNED OUT the sign-in screen, the create-account screen, and the Accessibility statement with
//              its guest report form -- the first thing a new visitor meets, on a second dev server
//              with VITE_DEMO_AUTOLOGIN=false (auto sign-in hides all three).
//
// What it gates on: axe's wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa rules, plus the best-practice
// rules in GATED_PRACTICE, which this app passes and must keep passing. One carve-out, per NODE:
// a target-size finding whose only complaint is that the target is PARTLY COVERED is reported, not
// failed. axe measures the page as it happens to be scrolled, so a row half under the sticky bottom
// bar, or a chip half outside a horizontal scroller, fails or passes depending on where the walk
// stopped; the user scrolls it into view. The real defect behind that class -- a FOCUSED control
// hidden under the bar (WCAG 2.4.11) -- is handled by scroll-padding in index.html. A target that is
// simply too small is never excused. `--all` prints the advisories too.
//
// What it cannot see: anything a screen reader does over time (focus order, what is announced on a
// change), a state the walk never opens, and contrast over an image. Automated rules catch about a
// third of real barriers; the manual VoiceOver/TalkBack pass in docs/accessibility-testing.md is
// the rest.
//
//   npm run check:axe
//   node scripts/check-axe.mjs --all                    # also list what it does not gate on
//   node scripts/check-axe.mjs --only signed-out        # or: tabs, routes, overlays
import net from "node:net";
import fs from "node:fs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "./lib/render-settle.mjs";
import { overlayStates, NEEDS_EXTRA_STATE } from "./lib/overlay-scaffold.mjs";
import { MENU_SCREENS, openFromMenu } from "./lib/menu-screens.mjs";
import { assertQuietBox } from "./lib/quiet-box.mjs";

const box = assertQuietBox("check:axe");
const ROOT = new URL("..", import.meta.url).pathname;
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const want = (part) => !ONLY || ONLY === part;

// The tabs come from NAV itself, so a new tab is walked the day it ships.
const APP = fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8");
const NAV = APP.match(/const NAV=\[(.*?)\];/);
if (!NAV) { console.error("check:axe: could not read NAV from ClimbMatch.jsx — its declaration moved"); process.exit(1); }
const TABS = [...NAV[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);
const SUBTABS = ["Overview", "Plan", "Conditions", "Reports", "Safety", "Partners", "Photos"];
const OVERLAYS = overlayStates(APP).map((s) => s.name).filter((n) => !NEEDS_EXTRA_STATE[n]);
if (!OVERLAYS.length) { console.error("check:axe: discovered no overlays — the scaffold's discovery has drifted"); process.exit(1); }

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const GATED_PRACTICE = ["page-has-heading-one", "landmark-one-main", "region", "aria-dialog-name", "presentation-role-conflict", "landmark-no-duplicate-main", "landmark-unique"];

// ── dev servers ────────────────────────────────────────────────────────────────────────────────
const servers = [];
process.on("exit", () => { for (const s of servers) { try { process.kill(-s.pid, "SIGTERM"); } catch { /* already gone */ } } });
process.on("SIGINT", () => process.exit(130));
const claimPort = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
};
// The overlay-scroll config is what makes ?z=<overlay> open a modal. Detached, so the whole process
// group (npx -> vite) dies with us rather than squatting the port for the next run.
async function startServer(autologin, from) {
  const port = await claimPort(from);
  if (port === null) { console.error(`check:axe: no free port in ${from}-${from + 39}`); process.exit(1); }
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const srv = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: autologin ? "true" : "false" } });
  servers.push(srv);
  let died = false;
  srv.on("exit", () => { died = true; });
  // Up to three minutes: on a loaded box the first transform of the three big app files is slow.
  for (let i = 0; i < 360 && !died; i++) { try { if ((await fetch(base)).ok) { await fetch(base + "ClimbMatch.jsx").catch(() => {}); return base; } } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); }
  console.error(died ? "check:axe: a dev server exited during startup" : "check:axe: a dev server never came up");
  process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("check:axe: could not launch Google Chrome: " + String(e.message).split("\n")[0]); process.exit(1); }

// ── scanning ───────────────────────────────────────────────────────────────────────────────────
const fails = [], advisories = [], unreached = [];
let scanned = 0;
const ONLY_OBSCURED = /partially obscured/;
async function scan(page, where) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const found = await page.evaluate(async (tags) => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    // The nearest readable text names a node far better than its CSS path does, so a finding can be grepped for.
    const near = (sel) => { try { let n = document.querySelector(sel); for (let i = 0; n && i < 4; i++, n = n.parentElement) { const t = (n.getAttribute("aria-label") || n.innerText || "").replace(/\s+/g, " ").trim(); if (t) return t.slice(0, 80); } } catch { /* shadow or iframe selector */ } return ""; };
    return res.violations.map((v) => ({ id: v.id, tags: v.tags, help: v.help, nodes: v.nodes.map((n) => ({ sel: n.target.join(" "), text: near(n.target[0]), why: (n.failureSummary || "").split("\n").slice(1).join(" ").replace(/\s+/g, " ").trim() })) }));
  }, [...WCAG, "best-practice"]);
  scanned++;
  const gatedHere = {};
  for (const v of found) {
    const ruleGated = v.tags.some((t) => WCAG.includes(t)) || GATED_PRACTICE.includes(v.id);
    for (const n of v.nodes) {
      const gated = ruleGated && !(v.id === "target-size" && ONLY_OBSCURED.test(n.why) && !/insufficient size \(/.test(n.why));
      (gated ? fails : advisories).push(`${where}  ${v.id} — ${v.help}\n      "${n.text}"  ${n.sel}\n      ${n.why.slice(0, 240)}`);
      if (gated) gatedHere[v.id] = (gatedHere[v.id] || 0) + 1;
    }
  }
  console.log(`  ${where.padEnd(34)} ${Object.entries(gatedHere).map(([id, n]) => id + "×" + n).join(", ") || "ok"}`);
}
async function load(page, base, qs) {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 120, null, { timeout: 60000 }).catch(() => {});
  await settledText(page, { timeout: 45000 }).catch(() => {});
}
// Click the first control whose name starts with `label`. A nav button's text can carry a badge
// count ("Crews2"), so the start of the name is matched, not all of it.
const clickNamed = (page, label) => page.evaluate((t) => {
  const el = [...document.querySelectorAll('nav button, button, [role="button"], [role="tab"], a')]
    .find((e) => [e.getAttribute("aria-label") || "", (e.textContent || "").trim()].some((s) => { s = s.trim(); return s === t || s.startsWith(t + " ") || new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\d").test(s); }));
  if (!el) return false; el.click(); return true;
}, label);
const tap = async (page, label) => {
  if (MENU_SCREENS[label]) return openFromMenu(page, label);
  const ok = await clickNamed(page, label);
  if (ok) await settledText(page, { timeout: 30000 }).catch(() => {});
  return ok;
};
const err = (e) => String(e && e.message).split("\n")[0];

// ── signed in ──────────────────────────────────────────────────────────────────────────────────
if (want("tabs") || want("routes") || want("overlays")) {
  const base = await startServer(true, 5460);
  for (const [width, label] of [[390, "phone"], [1280, "desktop"]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(30000);
    if (want("tabs")) for (const t of TABS) {
      try {
        await load(page, base, "?zt=today");
        if (t !== TABS[0] && !(await tap(page, t))) { unreached.push(`${label}:${t}`); continue; }
        await page.waitForTimeout(600);
        await scan(page, `${label}:${t}`);
      } catch (e) { unreached.push(`${label}:${t} (${err(e)})`); }
    }
    if (want("routes")) for (const st of SUBTABS) {
      try {
        await load(page, base, "?zr=1");
        await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).catch(() => {});
        if (st !== "Overview" && !(await page.evaluate((t) => { const b = [...document.querySelectorAll('[role="tab"], button')].find((x) => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, st))) { unreached.push(`${label}:route·${st}`); continue; }
        await settledText(page, { timeout: 20000 }).catch(() => {});
        await scan(page, `${label}:route·${st}`);
      } catch (e) { unreached.push(`${label}:route·${st} (${err(e)})`); }
    }
    if (label === "phone" && want("overlays")) for (const o of OVERLAYS) {
      try { await load(page, base, `?zt=me&z=${o}`); await page.waitForTimeout(500); await scan(page, `overlay:${o}`); }
      catch (e) { unreached.push(`overlay:${o} (${err(e)})`); }
    }
    await page.close();
  }
}

// ── signed out ─────────────────────────────────────────────────────────────────────────────────
// Only meaningful with the real auth gate, which needs the database env (VITE_USE_DB and keys).
if (want("signed-out")) {
  const base = await startServer(false, 5500);
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.setDefaultTimeout(30000);
  const step = async (where, how) => {
    try {
      await load(page, base, "");
      if (how && !(await how())) { unreached.push(where); return; }
      await settledText(page, { timeout: 20000 }).catch(() => {});
      await scan(page, where);
    } catch (e) { unreached.push(`${where} (${err(e)})`); }
  };
  // The gate opens on sign-in; it must not be CLICKED -- "Sign in" is also the form's submit button.
  await step("signed-out:sign in", null);
  await step("signed-out:create account", async () => clickNamed(page, "Create an account"));
  await step("signed-out:accessibility", async () => {
    if (!(await clickNamed(page, "Accessibility"))) return false;
    // The guest form is the point of this screen: no email field means it rendered the signed-in form.
    return page.waitForSelector("#a11y-email", { timeout: 20000 }).then(() => true, () => false);
  });
  await page.close();
}
await browser.close();

if (ALL && advisories.length) { console.log(`\nReported, NOT gated on (${advisories.length}):`); for (const a of advisories) console.log("  " + a); }
// A screen it could not open is a screen it did not check: that fails too, or coverage erodes silently.
if (unreached.length) { console.log(`\nNOT REACHED (${unreached.length}) — a screen not opened is a screen not checked:`); for (const u of unreached) console.log("  " + u); }
if (fails.length) { console.log(`\ncheck:axe FAILED — ${fails.length} node(s) break a gated rule:`); for (const f of fails) console.log("  " + f); }
if (box.caveat) console.log("\n" + box.caveat);
if (fails.length || unreached.length) process.exit(1);
if (!scanned) { console.error("check:axe: scanned nothing"); process.exit(1); }
console.log(`\ncheck:axe OK — ${scanned} screen(s) scanned, no WCAG 2.2 A/AA violation${advisories.length ? ` (${advisories.length} advisory finding(s); --all lists them)` : ""}.`);
process.exit(0);
