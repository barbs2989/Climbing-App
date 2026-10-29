#!/usr/bin/env node
// probe:tap-targets (hand-run) — how big is every control a finger can reach, and how far does a
// touch BESIDE it still reach it? Owner note 2026-10-28, "Some clicks links are small".
//
// Walks the same screens check:axe does (its walk, copied): the NAV tabs and the seven route
// sub-tabs at 390px and 1280px, every overlay the scaffold can open at 390px, and the signed-out
// sign-in / create-account / Accessibility screens. On each, every control (and anything drawn
// with cursor:pointer) with a side under 44px is recorded with:
//   w x h     its drawn box;
//   effW/effH how far a touch reaches it, walking outward 1px at a time from each side and asking
//             the page what a touch there does (a hit on it, or lib/tapSlop.js forwarding to it);
//   lost      the sides where a touch reached NOTHING before 44px (a side cut short by another
//             control is "shared": that touch is the neighbour's, which is right).
// Writes JSON (OUT=path, default tap.json); summarise with any reader. Needs a quiet box.
//
//   OUT=/path/tap.json node scripts/oneoff/probe-tap-targets.mjs [--only tabs|routes|overlays|signed-out]
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";
import { overlayStates, NEEDS_EXTRA_STATE } from "../lib/overlay-scaffold.mjs";
import { MENU_SCREENS, openFromMenu } from "../lib/menu-screens.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

const box = assertQuietBox("probe-tap-targets.mjs"); void box;
const ROOT = new URL("../..", import.meta.url).pathname;
const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const want = (part) => !ONLY || ONLY === part;

// The tabs come from NAV itself, so a new tab is walked the day it ships.
const APP = fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8");
const NAV = APP.match(/const NAV=\[(.*?)\];/);
if (!NAV) { console.error("probe:tap-targets: could not read NAV from ClimbMatch.jsx — its declaration moved"); process.exit(1); }
const TABS = [...NAV[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);
const SUBTABS = ["Overview", "Plan", "Conditions", "Reports", "Safety", "Partners", "Photos"];
const OVERLAYS = overlayStates(APP).map((s) => s.name).filter((n) => !NEEDS_EXTRA_STATE[n]);
if (!OVERLAYS.length) { console.error("probe:tap-targets: discovered no overlays — the scaffold's discovery has drifted"); process.exit(1); }

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
  if (port === null) { console.error(`probe:tap-targets: no free port in ${from}-${from + 39}`); process.exit(1); }
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const srv = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: autologin ? "true" : "false" } });
  servers.push(srv);
  let died = false;
  srv.on("exit", () => { died = true; });
  // Up to three minutes: on a loaded box the first transform of the three big app files is slow.
  for (let i = 0; i < 360 && !died; i++) { try { if ((await fetch(base)).ok) { await fetch(base + "ClimbMatch.jsx").catch(() => {}); return base; } } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); }
  console.error(died ? "probe:tap-targets: a dev server exited during startup" : "probe:tap-targets: a dev server never came up");
  process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("probe:tap-targets: could not launch Google Chrome: " + String(e.message).split("\n")[0]); process.exit(1); }

// ── measuring ──
const found = new Map(); let scanned = 0;
const unreached = [], notOffered = [];
async function scan(page, where) {
  const rows = await page.evaluate(() => {
    const SEL = 'a[href], button, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="option"], input[type="checkbox"], input[type="radio"], select, summary';
    const out = [];
    const seen = new Set([...document.querySelectorAll(SEL)]);
    for (const el of document.querySelectorAll("body *")) if (!seen.has(el) && getComputedStyle(el).cursor === "pointer" && !el.closest(SEL) && !el.querySelector(SEL)) seen.add(el);
    for (const el of seen) {
      if (el.closest('[aria-hidden="true"]') || el.disabled) continue;
      let r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      // Only what is on screen can be touched: bring each control into the middle of the window first.
      if (r.top < 60 || r.bottom > innerHeight - 90 || r.left < 0 || r.right > innerWidth) { el.scrollIntoView({ block: "center", inline: "center" }); r = el.getBoundingClientRect(); }
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
      if (r.width >= 44 && r.height >= 44) continue;
      const t = (el.getAttribute("aria-label") || el.innerText || el.title || "").replace(/\s+/g, " ").trim().slice(0, 50);
      const p = el.parentElement; const inline = cs.display === "inline" && !!p && (p.innerText || "").trim().length > (el.innerText || "").trim().length + 15;
      // How far a touch OUTSIDE the drawn box still reaches this control, walked outward 1px at a
      // time on each side until the touch reaches nothing ("lost") or another control ("shared").
      const slop = window.__slopTarget;
      const reaches = (x, y) => { const h = document.elementFromPoint(x, y); if (h && (h === el || el.contains(h))) return "me"; const s = slop && slop(x, y); if (s === el) return "me"; return s || (h && h.closest(SEL)) ? "shared" : "lost"; };
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, side = {};
      const walk = (dx, dy, need) => { let k = 1; for (; k <= need; k++) { const x = dx ? (dx < 0 ? r.left - k : r.right + k) : cx, y = dy ? (dy < 0 ? r.top - k : r.bottom + k) : cy; if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { got: k - 1, why: "edge" }; const w = reaches(x, y); if (w !== "me") return { got: k - 1, why: w }; } return { got: need, why: "ok" }; };
      const ex = Math.ceil(Math.max(0, (44 - r.width) / 2)), ey = Math.ceil(Math.max(0, (44 - r.height) / 2));
      side.up = walk(0, -1, ey); side.down = walk(0, 1, ey); side.left = walk(-1, 0, ex); side.right = walk(1, 0, ex);
      const effW = Math.round(r.width) + side.left.got + side.right.got, effH = Math.round(r.height) + side.up.got + side.down.got;
      const lost = Object.entries(side).filter(([, v]) => v.why === "lost").map(([k]) => k);
      out.push({ t, w: Math.round(r.width), h: Math.round(r.height), effW, effH, lost, tag: el.tagName.toLowerCase() + (el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : ""), inline, fs: cs.fontSize, ctl: !!el.matches(SEL) });
    }
    return out;
  });
  scanned++;
  for (const r of rows) { const k = `${r.tag}|${r.t}|${r.w}x${r.h}`; if (!found.has(k)) found.set(k, { ...r, where: new Set() }); found.get(k).where.add(where); }
  console.log(`  ${where.padEnd(34)} ${rows.length} small`);
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
        if (st !== "Overview") {
          const got = await page.evaluate((t) => {
            const tabs = [...document.querySelectorAll('[role="tab"], button')];
            const b = tabs.find((x) => x.textContent.trim() === t);
            if (b) { b.click(); return "opened"; }
            // A crag climb has no Plan tab, by design. The tab bar being there (Overview is) while this
            // one tab is not means the ROUTE does not offer it; no tab bar at all means the walk broke.
            return tabs.some((x) => x.textContent.trim() === "Overview") ? "not offered" : "missing";
          }, st);
          if (got === "not offered") { notOffered.push(`${label}:route·${st}`); continue; }
          if (got !== "opened") { unreached.push(`${label}:route·${st}`); continue; }
        }
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
const list = [...found.values()].map((r) => ({ ...r, where: [...r.where] }));
fs.writeFileSync(process.env.OUT || "tap.json", JSON.stringify({ unreached, notOffered, list }, null, 1));
console.log(`scanned ${scanned}; distinct small targets ${list.length}; unreached ${unreached.length}`);
process.exit(0);
