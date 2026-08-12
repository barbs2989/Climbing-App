#!/usr/bin/env node
// Measure: does any screen scroll SIDEWAYS at phone width, and which element causes it?
//
// Why this is not already covered. Every browser guard in this repo renders at 390x900 — the
// phone shape the app is built for — and **not one of them asks about horizontal overflow**:
// `scrollWidth`, `clientWidth` and `offsetWidth` appear nowhere in scripts/. check:overlay-scroll
// is the vertical sibling of this question (does a pane chain its scroll to the page behind);
// nothing asks the horizontal one, and the repo has already shipped two bugs of exactly that
// class by hand — a fixed `minWidth` pushing content off the right edge, and a flex row with
// `nowrap` overlapping its neighbour.
//
// THE PRECISION RULE, and it is the whole difference between a finding and noise: an element
// wider than the viewport is FINE if some ancestor scrolls horizontally on purpose. The route
// sub-tab strip is `overflowX: auto` and its buttons legitimately run off-screen. So an element
// only counts when nothing between it and the document root can scroll horizontally — then the
// overflow has nowhere to go and the PAGE moves instead.
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5290;
// --url points at a deployed site and skips the dev server entirely. **This is the verified
// path; the dev-server path below is not.** With eight vite servers up from other worktrees,
// every local run died the same way: esbuild's dependency scan ends in `write EPIPE`, vite keeps
// serving, and the page never loads — so the run reads as "the app is broken" when the truth is
// "the machine is saturated". A private `cacheDir` was tried on the theory that worktrees share
// one `node_modules/.vite` through the symlink; it did **not** fix it, so that theory is wrong
// and the cause is the esbuild service itself. Recorded rather than guessed at again.
//
// This is why this is still a oneoff and not `check:overflow` in render-guards.yml: promoting it
// means running the dev-server path CI would use, and that could not be proven here. Promote it
// from a quiet machine — the scan and its self-test are done.
const URL_ARG = (process.argv.find((a) => a.startsWith("--url=")) || "").slice(6);

const claimPort = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
};
let base, stop = () => {};
if (URL_ARG) {
  base = URL_ARG.endsWith("/") ? URL_ARG : URL_ARG + "/";
  console.log(`measuring the deployed site: ${base}`);
} else {
  const port = await claimPort(PORT);
  if (port === null) { console.error("no free port"); process.exit(1); }
  base = `http://127.0.0.1:${port}/Climbing-App/`;
  console.log(`starting dev server on ${port}...`);
  const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
  stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
  process.on("exit", stop);
  process.on("SIGINT", () => { stop(); process.exit(130); });
  const waitUp = async () => {
    for (let i = 0; i < 120; i++) {
      try { const r = await fetch(base); if (r.ok) return true; } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };
  if (!(await waitUp())) { console.error("dev server never came up"); stop(); process.exit(1); }
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));

const settle = async () => {
  let prev = "", same = 0;
  for (let i = 0; i < 40; i++) {
    const t = (await page.innerText("body").catch(() => "")).replace(/\d/g, "#");
    if (t === prev) { if (++same >= 3) return; } else { same = 0; prev = t; }
    await page.waitForTimeout(200);
  }
};

const scan = () => page.evaluate(() => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  // Does anything actually scroll sideways? Check the document AND the app's own scroller,
  // because this app scrolls inside #appscroll rather than on the body.
  const scrollers = [doc, document.body, document.getElementById("appscroll")].filter(Boolean);
  const pageOverflow = scrollers
    .map((el) => ({ id: el.id || el.tagName.toLowerCase(), px: el.scrollWidth - el.clientWidth }))
    .filter((x) => x.px > 1);

  // An ancestor that scrolls horizontally makes the overflow intentional and reachable.
  const escapes = (el) => {
    for (let p = el.parentElement; p && p !== doc; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(cs.overflowX)) return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed") continue;            // overlays are measured on their own screens
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const over = Math.round(r.right - vw);
    if (over <= 1 && r.left >= -1) continue;
    if (escapes(el)) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      over, left: Math.round(r.left), width: Math.round(r.width),
      text: (el.innerText || "").trim().slice(0, 45).replace(/\s+/g, " "),
      style: (el.getAttribute("style") || "").slice(0, 110),
    });
  }
  // Report only the OUTERMOST offenders: a wide parent makes every child look guilty, and the
  // parent is the one to fix.
  const els = [...document.querySelectorAll("*")];
  const keep = out.filter((o, i) => {
    const self = els.find((e) => (e.getAttribute("style") || "").slice(0, 110) === o.style && Math.round(e.getBoundingClientRect().right - vw) === o.over);
    if (!self) return true;
    return !out.some((p, j) => j !== i && (() => {
      const pe = els.find((e) => (e.getAttribute("style") || "").slice(0, 110) === p.style && Math.round(e.getBoundingClientRect().right - vw) === p.over);
      return pe && pe !== self && pe.contains(self);
    })());
  });
  return { vw, pageOverflow, offenders: keep.slice(0, 8), total: out.length };
});

const tap = async (name) => {
  const el = page.locator(`text="${name}"`).first();
  try { await el.click({ timeout: 5000 }); return true; } catch { return false; }
};

// Route SUB-tabs must not be clicked by a global text match: "Partners" is both a main nav tab
// and a route sub-tab, so a global match hits the nav and silently leaves the route page — which
// is exactly what happened on the first run here (Plan and Safety then "did not exist"). Match a
// <button> whose own text is the sub-tab name and which is NOT inside the fixed bottom nav.
const tapSub = (name) => page.evaluate((n) => {
  const btns = [...document.querySelectorAll("button")].filter((b) => (b.textContent || "").trim() === n);
  // The nav is `position: sticky` at the TOP of the page, not fixed at the bottom — measured,
  // after an exclusion written for a bottom-fixed bar silently picked the nav every time and
  // made Plan and Safety look like they did not exist. The route sub-tab strip has no
  // positioned ancestor at all, so "no sticky/fixed ancestor" is the discriminator.
  const notNav = btns.filter((b) => {
    for (let p = b.parentElement; p; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky") return false;
    }
    return true;
  });
  const target = notNav[0];
  if (!target) return false;
  target.click();
  return true;
}, name);

const results = [];
const visit = async (label, nav) => {
  if (nav) { const okNav = await nav(); if (!okNav) { console.log(`  ${label}: NOT REACHED`); return; } }
  await settle();
  const r = await scan();
  results.push({ label, ...r });
  const flag = r.pageOverflow.length || r.offenders.length ? "  <-- OVERFLOW" : "";
  console.log(`  ${label.padEnd(24)} page:${JSON.stringify(r.pageOverflow)} offenders:${r.total}${flag}`);
  for (const o of r.offenders) console.log(`        +${o.over}px  <${o.tag}> w=${o.width} "${o.text}"  style=${o.style}`);
};

await page.goto(base, { waitUntil: "domcontentloaded" });
await settle();

// ── SELF-TEST, before any conclusion ─────────────────────────────────────────
// A scan that reports zero everywhere is indistinguishable from a scan that is broken, and
// "no findings" is the result this kind of probe reaches by accident. So inject both cases and
// require the detector to separate them: a plain wide element must be CAUGHT, and the same
// element inside a horizontally-scrollable parent must be IGNORED (that is the route sub-tab
// strip, and treating it as a bug would bury every real finding in noise).
{
  await page.evaluate(() => {
    const mk = (id, wrapScroll) => {
      const host = document.createElement("div");
      host.id = id;
      if (wrapScroll) host.style.cssText = "overflow-x:auto";
      const inner = document.createElement("div");
      inner.style.cssText = "width:900px;height:20px";
      inner.textContent = "probe " + id;
      host.appendChild(inner);
      document.body.appendChild(host);
    };
    mk("__probe_bare", false);
    mk("__probe_scrollable", true);
  });
  const s = await scan();
  const caught = s.offenders.some((o) => o.text.includes("probe __probe_bare"));
  const ignored = !s.offenders.some((o) => o.text.includes("probe __probe_scrollable"));
  console.log(`self-test: bare 900px element caught=${caught}  scrollable-ancestor ignored=${ignored}`);
  await page.evaluate(() => { for (const id of ["__probe_bare", "__probe_scrollable"]) document.getElementById(id)?.remove(); });
  if (!caught || !ignored) {
    console.error("SELF-TEST FAILED — the scan cannot tell overflow from an intentional scroller, so every 'clean' below is meaningless.");
    await browser.close(); stop(); process.exit(1);
  }
}

console.log(`\nviewport 390px — main tabs:`);
for (const t of ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"]) {
  await visit(t, async () => tap(t));
}

// Route detail is the richest layout in the app — header strap, tech stat tiles, waypoint rows,
// the sub-tab strip — and it is where the two recorded layout bugs of this class lived. Reaching
// it needs the same drill-in check:ui uses (state select -> Routes -> search -> tap).
console.log(`\nroute detail:`);
const ROUTE = "North Ridge (Complete)";
await tap("Climbs"); await settle();
await page.evaluate(() => {
  const sel = document.querySelector("select");
  if (!sel) return;
  const opt = [...sel.options].find((o) => o.label === "Washington" || o.label.startsWith("Washington "));
  if (!opt) return;
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(1200); await settle();
await tap("Routes");
const input = await page.$('input[type="text"], input:not([type])');
if (input) { await input.fill(ROUTE); await page.waitForTimeout(1000); await settle(); }
if (await tap(ROUTE)) {
  await settle();
  for (const sub of ["Overview", "Reports", "Photos", "Partners", "Plan", "Safety"]) {
    await visit("route:" + sub, async () => (sub === "Overview" ? true : tapSub(sub)));
  }
} else {
  console.log(`  NOT REACHED — could not open "${ROUTE}" (the DB sample is known-flaky; retry once)`);
}

console.log(`\npage errors: ${errors.length ? errors.join(" | ") : "none"}`);
const dirty = results.filter((r) => r.pageOverflow.length || r.offenders.length);
console.log(`\n${dirty.length ? dirty.length + " screen(s) overflow horizontally" : "no horizontal overflow on any screen measured"}`);
await browser.close();
stop();
process.exit(0);
