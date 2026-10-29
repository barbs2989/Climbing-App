#!/usr/bin/env node
// probe:dropdowns (hand-run) — is every DROPDOWN in the app easy to tap open? Owner note
// 2026-10-29: "On route beta, it's difficult to click the dropdown to view more info, audit the
// whole app for issues on hard to click the dropdown".
//
// A dropdown here is anything that carries aria-expanded (the app's disclosure convention,
// RouteDetail.jsx's TagChip note) or a <summary>, plus anything clickable that draws the
// Chevron (its path "m9 5 7 7-7 7") without aria-expanded — a dropdown that does not say it is one.
// On every screen the walk visits, each one is:
//   measured  its drawn box (h < 44 is a finding: Apple asks 44pt of a control, Material 48dp);
//   tapped    a REAL mouse click at its centre, then the page is asked whether aria-expanded
//             flipped (a toggle that does not open from its own centre is the owner's complaint,
//             whatever its size), and what elementFromPoint returned there (something drawn on top);
//   restored  clicked again so the screen is as it was.
// Closed dropdowns are then opened once and the screen rescanned, so dropdowns INSIDE dropdowns
// (a rappel inside the Plan tab's sections, a pitch's comments) are reached too.
//
// Walks: the NAV tabs and Menu screens, the seven route sub-tabs on the seed route AND on real
// DB routes (?route=<id>; the dense ones — pitches, rappels, camps, access), every overlay the
// scaffold opens, at 390px. Writes JSON (OUT=path, default dropdowns.json). Needs a quiet box and
// the database env (symlink .env.local into a worktree first).
//
//   OUT=/path/d.json node scripts/oneoff/probe-dropdowns.mjs [--only tabs|routes|db|overlays]
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";
import { overlayStates, NEEDS_EXTRA_STATE } from "../lib/overlay-scaffold.mjs";
import { MENU_SCREENS, openFromMenu } from "../lib/menu-screens.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

const box = assertQuietBox("probe-dropdowns.mjs"); void box;
const ROOT = new URL("../..", import.meta.url).pathname;
const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const want = (part) => !ONLY || ONLY === part;

const APP = fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8");
const NAV = APP.match(/const NAV=\[(.*?)\];/);
if (!NAV) { console.error("probe:dropdowns: could not read NAV from ClimbMatch.jsx — its declaration moved"); process.exit(1); }
const TABS = [...NAV[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]).concat(Object.keys(MENU_SCREENS));
const SUBTABS = ["Overview", "Plan", "Conditions", "Reports", "Safety", "Partners", "Photos"];
const OVERLAYS = overlayStates(APP).map((s) => s.name).filter((n) => !NEEDS_EXTRA_STATE[n]);
// Real routes chosen for how many dropdowns they draw: an alpine route with pitches AND travel
// legs, rappels and access rules (Big Four), a glaciated peak with camps (Rainier), a crag line.
const DB_ROUTES = (process.env.ROUTES || "wa_big_four_mountain_tower_route,wa_mount_rainier_disappointment_cleaver,wa_mount_baker_coleman_deming,wa_liberty_bell_beckey_route").split(",");

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
async function startServer(from) {
  const port = await claimPort(from);
  if (port === null) { console.error(`probe:dropdowns: no free port in ${from}-${from + 39}`); process.exit(1); }
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const srv = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
  servers.push(srv);
  let died = false;
  srv.on("exit", () => { died = true; });
  for (let i = 0; i < 360 && !died; i++) { try { if ((await fetch(base)).ok) { await fetch(base + "ClimbMatch.jsx").catch(() => {}); return base; } } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); }
  console.error(died ? "probe:dropdowns: a dev server exited during startup" : "probe:dropdowns: a dev server never came up");
  process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("probe:dropdowns: could not launch Google Chrome: " + String(e.message).split("\n")[0]); process.exit(1); }

// ── measuring ──
const found = new Map(); let scanned = 0; const unreached = [];
// Tag every dropdown on the page with a probe id and return what each one is. Already-tagged
// ones keep their id, so a rescan after opening returns only what the opening revealed.
const tagAll = (page) => page.evaluate(() => {
  const CHEV = "m9 5 7 7-7 7";
  const cands = new Set([...document.querySelectorAll("[aria-expanded], summary")]);
  for (const p of document.querySelectorAll("svg path")) {
    if (p.getAttribute("d") !== CHEV) continue;
    const host = p.closest('button, [role="button"], a, summary, [aria-expanded]');
    if (host) cands.add(host);
  }
  const out = [];
  for (const el of cands) {
    if (el.dataset.ddProbe) continue;
    if (el.closest('[aria-hidden="true"]') || el.disabled) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
    // a nav/menu button that opens a whole screen is not a dropdown; neither is a Chevron that
    // marks "opens a page" on a list row (it carries no aria-expanded and points right, open or not)
    const expandable = el.hasAttribute("aria-expanded") || el.tagName === "SUMMARY";
    const id = String(window.__ddN = (window.__ddN || 0) + 1); el.dataset.ddProbe = id;
    const t = (el.getAttribute("aria-label") || el.innerText || el.title || "").replace(/\s+/g, " ").trim().slice(0, 70);
    out.push({ id, t, h: Math.round(r.height), w: Math.round(r.width), expandable, tag: el.tagName.toLowerCase() + (el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : ""), open: el.getAttribute("aria-expanded") === "true" });
  }
  return out;
});
// A real click at the control's centre: does it flip aria-expanded, and is the control what is
// under the finger there?
async function tapTest(page, id) {
  const pos = await page.evaluate((id) => {
    const el = document.querySelector(`[data-dd-probe="${id}"]`); if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect(); const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    const mine = !!hit && (hit === el || el.contains(hit));
    const cover = mine || !hit ? null : (hit.getAttribute("aria-label") || hit.innerText || hit.tagName).replace(/\s+/g, " ").trim().slice(0, 50);
    return { x, y, mine, cover, before: el.getAttribute("aria-expanded") };
  }, id);
  if (!pos) return { gone: true };
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(250);
  const after = await page.evaluate((id) => { const el = document.querySelector(`[data-dd-probe="${id}"]`); return el ? el.getAttribute("aria-expanded") : "__gone"; }, id);
  return { mine: pos.mine, cover: pos.cover, before: pos.before, after };
}
async function scan(page, where, reload) {
  let rows = await tagAll(page); const all = [];
  for (let depth = 0; depth < 2 && rows.length; depth++) {
    for (const r of rows) {
      let res = { skipped: true };
      if (r.expandable) {
        res = await tapTest(page, r.id);
        if (res.after === "__gone" || res.gone) { await reload(); await page.waitForTimeout(400); }
        else if (res.after !== res.before) {
          // leave a dropdown we OPENED open for the depth-2 rescan, close one that was open
          if (res.before === "true") await tapTest(page, r.id);
        }
      }
      all.push({ ...r, ...res, depth });
    }
    rows = await tagAll(page);
  }
  scanned++;
  for (const r of all) { const k = `${r.tag}|${r.t.replace(/\d+/g, "#")}|${r.h}`; if (!found.has(k)) found.set(k, { ...r, where: new Set() }); found.get(k).where.add(where); }
  const small = all.filter((r) => r.h < 44).length, dead = all.filter((r) => r.expandable && !r.gone && r.after !== "__gone" && r.after === r.before).length;
  console.log(`  ${where.padEnd(40)} ${all.length} dropdowns, ${small} under 44px, ${dead} did not open from their centre`);
}
async function load(page, base, qs) {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 120, null, { timeout: 60000 }).catch(() => {});
  await settledText(page, { timeout: 45000 }).catch(() => {});
}
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
const subtab = (page, st) => page.evaluate((t) => {
  const tabs = [...document.querySelectorAll('[role="tab"], button')];
  const b = tabs.find((x) => x.textContent.trim() === t);
  if (b) { b.click(); return "opened"; }
  return tabs.some((x) => x.textContent.trim() === "Overview") ? "not offered" : "missing";
}, st);
const err = (e) => String(e && e.message).split("\n")[0];

const base = await startServer(5560);
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: false });
page.setDefaultTimeout(30000);
if (want("tabs")) for (const t of TABS) {
  const go = async () => { await load(page, base, "?zt=today"); if (t !== TABS[0]) await tap(page, t); await page.waitForTimeout(600); };
  try { await load(page, base, "?zt=today"); if (t !== TABS[0] && !(await tap(page, t))) { unreached.push(t); continue; } await page.waitForTimeout(600); await scan(page, `tab:${t}`, go); }
  catch (e) { unreached.push(`${t} (${err(e)})`); }
}
const routeWalk = async (qs, label, ready) => {
  for (const st of SUBTABS) {
    const go = async () => { await load(page, base, qs); await ready(); if (st !== "Overview") await subtab(page, st); await settledText(page, { timeout: 20000 }).catch(() => {}); };
    try {
      await load(page, base, qs); if (!(await ready())) { unreached.push(`${label} (route did not open)`); return; }
      if (st !== "Overview") { const got = await subtab(page, st); if (got === "not offered") continue; if (got !== "opened") { unreached.push(`${label}·${st}`); continue; } }
      await settledText(page, { timeout: 20000 }).catch(() => {});
      await scan(page, `${label}·${st}`, go);
    } catch (e) { unreached.push(`${label}·${st} (${err(e)})`); }
  }
};
if (want("routes")) await routeWalk("?zr=1", "seed-route", async () => page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).then(() => true, () => false));
if (want("db")) for (const id of DB_ROUTES) await routeWalk(`?route=${id}`, `route:${id}`, async () => page.waitForFunction(() => [...document.querySelectorAll('[role="tab"], button')].some((x) => x.textContent.trim() === "Overview"), null, { timeout: 45000 }).then(() => true, () => false));
if (want("overlays")) for (const o of OVERLAYS) {
  const go = async () => { await load(page, base, `?zt=me&z=${o}`); await page.waitForTimeout(500); };
  try { await go(); await scan(page, `overlay:${o}`, go); } catch (e) { unreached.push(`overlay:${o} (${err(e)})`); }
}
await browser.close();
const list = [...found.values()].map((r) => ({ ...r, where: [...r.where] }));
fs.writeFileSync(process.env.OUT || "dropdowns.json", JSON.stringify({ unreached, list }, null, 1));
const small = list.filter((r) => r.h < 44), dead = list.filter((r) => r.expandable && !r.gone && r.after !== "__gone" && r.after === r.before), undeclared = list.filter((r) => !r.expandable);
console.log(`scanned ${scanned}; distinct dropdowns ${list.length}; under 44px ${small.length}; did not open from centre ${dead.length}; chevron rows with no aria-expanded ${undeclared.length}; unreached ${unreached.length}`);
process.exit(0);
