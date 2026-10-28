#!/usr/bin/env node
// ONE-OFF census for the owner's note "text would go on but it stops" (2026-10-28): every element
// whose text is CLIPPED on screen (an ellipsis or a line clamp actually cutting something off) and
// whether it sits inside a control a climber can tap to read the rest. Walks the tabs, the route
// sub-tabs and every overlay the scaffold publishes, as check:overflow does. Prints; exits 0.
//
//   node scripts/oneoff/measure-clipped-text.mjs
import { NEEDS_EXTRA_STATE } from "../lib/overlay-scaffold.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WIDTH = 390, HEIGHT = 844;
const TABS = ["today", "routes", "discover", "crew", "logbook", "ranks", "me", "groups"];
const log = (...a) => console.log(...a);
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => { const s = net.createServer(); s.once("error", () => resolve(false)); s.once("listening", () => s.close(() => resolve(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5370);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false; server.on("exit", () => { died = true; });
const stopServer = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { /* gone */ } };
process.on("exit", stopServer);
let up = false;
for (let i = 0; i < 60 && !died; i++) { try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 2000)); }
if (!up) { console.error("dev server never came up"); process.exit(1); }
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.setDefaultNavigationTimeout(120000);

const scan = () => page.evaluate(() => {
  const tappable = (el) => {
    for (let p = el; p; p = p.parentElement) {
      const t = p.tagName;
      if (t === "BUTTON" || t === "A" || t === "SUMMARY" || t === "LABEL" || t === "SELECT") return true;
      const r = p.getAttribute("role");
      if (["button", "link", "tab", "option", "switch", "menuitem", "radio", "checkbox"].includes(r)) return true;
      if (p.hasAttribute("tabindex") && p.getAttribute("tabindex") !== "-1") return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.ownerSVGElement || el.tagName === "svg") continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (!(cs.overflowX === "hidden" || cs.overflowY === "hidden")) continue;
    const txt = (el.innerText || "").trim();
    if (!txt) continue;
    const ell = cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 2;
    if (!ell && !clamp) continue;
    out.push({ kind: clamp ? "clamp" : "ellipsis", tap: tappable(el), text: txt.replace(/\s+/g, " ").slice(0, 90), style: (el.getAttribute("style") || "").slice(0, 110) });
  }
  return out;
});
const load = async (qs) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ready = await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 30000 }).then(() => true, () => false);
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return ready;
};
const all = new Map();
const add = (screen, list) => {
  for (const o of list) { const k = o.kind + "|" + o.style + "|" + o.text; if (!all.has(k)) all.set(k, { o, screens: [] }); all.get(k).screens.push(screen); }
  log(`  ${screen}`.padEnd(40) + `clipped:${list.length} untappable:${list.filter((o) => !o.tap).length}`);
};
for (const t of TABS) { await load(`?zt=${t}`); add("tab:" + t, await scan()); }
for (const qs of ["?zr=1", "?zr=1&zrp=1"]) {
  await load(qs);
  await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 20000 }).catch(() => {});
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  for (const sub of ["Overview", "Conditions", "Reports", "Photos", "Partners", "Plan", "Safety"]) {
    if (sub !== "Overview" && !(await tapByText(page, sub))) { log(`  route${qs}:${sub} NOT REACHED`); continue; }
    await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
    add(`route${qs}:${sub}`, await scan());
  }
}
await load("?zt=today");
const overlays = await page.evaluate(() => window.__overlays || []);
for (const name of overlays) {
  if (NEEDS_EXTRA_STATE[name]) continue;
  for (const t of ["today", "routes", "crew", "groups", "me", "discover", "logbook"]) {
    await load(`?zt=${t}&z=${name}`);
    if (await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name)) break;
    const opened = await page.evaluate(() => !!document.querySelector('[role="dialog"],[aria-modal="true"]'));
    if (!opened && t !== "logbook") continue;
    add(`modal:${name}@${t}`, await scan());
    break;
  }
}
await browser.close(); stopServer();
log("\n==== UNTAPPABLE clipped text ====");
for (const { o, screens } of all.values()) if (!o.tap) log(`[${o.kind}] ${JSON.stringify(o.text)}\n    ${o.style}\n    on: ${screens.slice(0, 4).join(", ")}${screens.length > 4 ? ` +${screens.length - 4}` : ""}`);
log("\n==== tappable clipped text ====");
for (const { o, screens } of all.values()) if (o.tap) log(`[${o.kind}] ${JSON.stringify(o.text.slice(0, 60))}  on ${screens[0]}${screens.length > 1 ? ` +${screens.length - 1}` : ""}`);
process.exit(0);
