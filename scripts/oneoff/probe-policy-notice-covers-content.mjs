#!/usr/bin/env node
// Does the policy re-consent notice cover controls the user still needs?
//
// PolicyUpdateNotice is `position:fixed; left:0; right:0; bottom:0`, portalled to document.body
// at Z_TOAST-1, and NOT dismissible -- deliberately, since an acceptance you can wave away is
// not an acceptance. Nothing else reads `_needsPolicy`: it builds the panel and nothing adds
// bottom padding to #appscroll. So the question is whether the last screenful of every screen
// sits underneath it, for as long as the notice is up.
//
// That is not a legacy-account question. The notice fires whenever profiles.terms_accepted_version
// differs from POLICY_VERSION, which is EVERY signed-in account every time the policy is bumped --
// its own copy has a branch for exactly that ("Our Terms and Privacy Policy have changed").
//
// MEASURED BY HIT-TESTING, NOT BY ARITHMETIC. For each control it asks the browser what is
// actually at that control's centre point: if elementFromPoint returns the notice, a tap there
// hits the notice. Comparing rectangles by hand would report a control as covered when a
// scroll container has already clipped it out of view, and would miss a control the panel
// overlaps by a few pixels at its own edge.
//
// FAILS CLOSED, and the control run is the reason: the same walk runs against the ORDINARY
// config, where the notice does not exist. If that baseline reports covered controls too, then
// the bottom of these screens is unreachable for some other reason and the notice is not the
// finding -- so the probe says so instead of blaming it. It also refuses a run in which the
// notice never rendered, which would otherwise print a clean NO OVERLAP about nothing.
//
//   node scripts/oneoff/probe-policy-notice-covers-content.mjs
//
// Seed demo + DEMO_AUTOLOGIN: this is pure geometry, so it needs no database and no fixture.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";
import { tapByName } from "../lib/tap-by-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"];
const NOTICE_TEXT = "Carrying on using ClimbMatch means accepting it";

const log = (s) => console.log(s);

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

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// What the page is asked, in the page. Scrolls the app's scroller to the bottom, then hit-tests
// the centre of every control that is on screen.
const MEASURE = `(() => {
  // THE DOCUMENT IS THE SCROLLER, NOT #appscroll. That container reports 905/905 -- it fits its
  // own box -- while documentElement is 1115 against an 844 viewport, so the page scrolls and
  // the app's top nav scrolls away with it. Scrolling the wrong element reported "fits, no
  // scroll" on every tab: true of #appscroll, and a statement about the DEFAULT position
  // dressed up as a statement about the bottom of the screen.
  const sc = document.scrollingElement || document.documentElement;
  sc.scrollTop = sc.scrollHeight;
  return new Promise((res) => setTimeout(() => {
    // Report the scroll rather than assume it. A container that did not move -- because it is
    // not the scroller, or because the screen is shorter than the viewport -- would make every
    // "covered" line below a statement about the DEFAULT position, which is a different claim.
    const scroll = { top: Math.round(sc.scrollTop), h: Math.round(sc.scrollHeight), client: Math.round(sc.clientHeight) };
    const notice = [...document.querySelectorAll("div")].find(
      (d) => d.textContent.includes(${JSON.stringify(NOTICE_TEXT)}) &&
             getComputedStyle(d).position === "fixed"
    );
    const sel = "button,a[href],input,select,textarea,[role=button],[role=checkbox],[role=switch],[role=tab],[role=link]";
    const out = { notice: !!notice, scroll, noticeTop: notice ? Math.round(notice.getBoundingClientRect().top) : null,
      noticeH: notice ? Math.round(notice.getBoundingClientRect().height) : null,
      viewportH: innerHeight, covered: [] };
    for (const el of document.querySelectorAll(sel)) {
      if (notice && notice.contains(el)) continue;           // the notice's own buttons are fine
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;  // off screen, not covered
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || el.contains(hit) || hit === el) continue;                   // the tap lands on it
      // ONLY A FIXED BLOCKER COUNTS, and the control run is what taught me that. A bare
      // centre-point test reported 6 "covered" controls with no notice on screen -- a button
      // whose centre lands on a sibling chip, a span over an icon, a select under a relative
      // button. Every one of those is ordinary layout adjacency, and every one of their
      // blockers is static/relative/absolute. A panel floating over the page is the question;
      // a neighbour overlapping by a pixel is not, and counting it made the control run say
      // NOT ATTRIBUTABLE about a finding that is real.
      let fixedAncestor = hit;
      while (fixedAncestor && fixedAncestor !== document.body &&
             getComputedStyle(fixedAncestor).position !== "fixed") fixedAncestor = fixedAncestor.parentElement;
      const isFixed = !!fixedAncestor && fixedAncestor !== document.body;
      if (!isFixed) continue;
      const blocker = notice && notice.contains(hit) ? "notice" : "other";
      // Name the OTHER blocker. "Something else covers this" is not actionable, and the
      // control run exists precisely to be believed or disbelieved on what it names.
      const f = fixedAncestor;
      const by = blocker === "other"
        ? f.tagName.toLowerCase() + (f.id ? "#" + f.id : "") + " [z=" + getComputedStyle(f).zIndex + "] " +
          (f.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)
        : null;
      out.covered.push({
        blocker, by,
        name: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "")
          .trim().replace(/\\s+/g, " ").slice(0, 44),
        tag: el.tagName.toLowerCase(),
      });
    }
    res(out);
  }, 400));
})()`;

async function walk(configPath, label) {
  const port = await claimPort(5340);
  if (port === null) { console.error("no free port"); process.exit(1); }
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const args = ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  if (configPath) args.splice(1, 0, "--config", configPath);
  const server = spawn("npx", args, {
    cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true,
    env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" },
  });
  let died = false;
  server.on("exit", () => { died = true; });
  const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
  process.on("exit", stop);

  if (!(await waitForServer(base)) || died) {
    console.error(`[${label}] dev server never came up — the scaffold may have thrown ANCHOR LOST above.`);
    stop(); process.exit(1);
  }

  let browser;
  try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
  catch (e) {
    console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
    stop(); process.exit(1);
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(45000);
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  await settledText(page, { min: 200, timeout: 45000 });

  const results = [];
  for (const tab of TABS) {
    if (!(await tapByName(page, tab))) {
      console.error(`[${label}] FAILED — no control on screen is named ${JSON.stringify(tab)}.`);
      await browser.close(); stop(); process.exit(1);
    }
    await settledText(page, { min: 200, timeout: 45000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(MEASURE);
    results.push({ tab, ...r });
  }
  await browser.close(); stop();
  return results;
}

log("run 1 of 2 — WITH the notice forced on\n");
const withNotice = await walk("scripts/policy-notice.config.mjs", "notice");

// The notice must actually have rendered, or every "no overlap" below is a statement about a
// screen that has no panel on it.
const rendered = withNotice.filter((r) => r.notice).length;
if (rendered !== TABS.length) {
  console.error(`\nFAILED — the notice rendered on only ${rendered} of ${TABS.length} tabs.`);
  console.error("This probe reports absence, so a run where the panel never mounted would print a clean sweep.");
  process.exit(1);
}

log("\nrun 2 of 2 — CONTROL, ordinary config, no notice\n");
const baseline = await walk(null, "baseline");
if (baseline.some((r) => r.notice)) {
  console.error("\nFAILED — the control run rendered the notice too, so it is not a control.");
  process.exit(1);
}

log("\n" + "=".repeat(78));
let noticeHits = 0, baseHits = 0;
for (let i = 0; i < TABS.length; i++) {
  const a = withNotice[i], b = baseline[i];
  const byNotice = a.covered.filter((c) => c.blocker === "notice");
  const aOther = a.covered.length - byNotice.length;
  noticeHits += byNotice.length; baseHits += b.covered.length;
  const sc = a.scroll;
  const atBottom = sc && sc.h - sc.client - sc.top <= 2;
  log(`  ${a.tab.padEnd(9)} scroll ${sc ? String(sc.top).padStart(5) + "/" + String(sc.h - sc.client).padEnd(5) : "  n/a"}` +
      ` ${sc ? (sc.h <= sc.client ? "(fits, no scroll)" : atBottom ? "(at bottom)      " : "(DID NOT SCROLL) ") : ""}` +
      `  notice is ${a.noticeH}px tall over a ${a.viewportH}px viewport`);
  log(`  ${"".padEnd(9)} notice top ${String(a.noticeTop).padStart(4)}px   ` +
      `covered by notice: ${String(byNotice.length).padStart(2)}   ` +
      `by something else: ${String(aOther).padStart(2)}   ` +
      `baseline covered: ${String(b.covered.length).padStart(2)}`);
  for (const c of byNotice.slice(0, 6)) log(`             under the notice: <${c.tag}> ${JSON.stringify(c.name)}`);
  for (const c of b.covered.slice(0, 6)) log(`             BASELINE: <${c.tag}> ${JSON.stringify(c.name)}  covered by  ${c.by}`);
}
log("=".repeat(78));

if (baseHits) {
  log(`\nNOT ATTRIBUTABLE — the control run already has ${baseHits} covered control(s), so the`);
  log("bottom of these screens is obstructed with no notice on screen. Fix that first; this");
  log("probe cannot say the notice is the cause while something else is doing the same thing.");
  process.exit(1);
}

if (!noticeHits) {
  log("\nok — the notice covers no control on any tab. Content ends above it.");
  process.exit(0);
}
log(`\nFINDING — ${noticeHits} control(s) across ${withNotice.filter((r) => r.covered.some((c) => c.blocker === "notice")).length} tab(s)`);
log("sit underneath the notice with the screen scrolled to its bottom, and the notice cannot be");
log("dismissed. Nothing pads #appscroll when `_needsPolicy` is true.");
process.exit(1);
