// Prove a keyboard can actually navigate the route detail screen.
//
// check:clickable is STATIC: it proves role/tabIndex/onKeyDown are present. It cannot
// prove Enter does anything, and the claim being made here is a navigation claim — that a
// climber who cannot use a mouse can open a linked climb and switch sub-tabs. Attributes
// present and a handler that never fires look identical to it.
//
// The route page is reached by `?zr=1`, which calls the app's own openRoute() from inside
// the opener rather than driving three UI steps — the same approach check:overflow uses,
// and for the same reason: no slow list or moved row can defeat it.
//
// WHAT THIS DOES NOT COVER, and do not re-derive it the hard way. The shared opener always
// opens ROUTES[0], which is `kings_hf` — and kings_hf has `pairsWith:[]`, so the PAIRS WELL
// WITH section correctly renders nothing and the two linked-route rows (the onOpenRoute
// controls) are not on the page to be driven. Only 7 seed routes have a non-empty pairsWith.
//
// An attempt to extend the opener to `?zr=<route-id>` from a probe-local vite config was
// made and REVERTED. The rewrite verifiably reached the served module and the route still
// did not change, so something further down re-resolves it; chasing that was costing more
// than the fix it was testing. Do not repeat it without first answering that question.
//
// So this proves the WIRING — that clickable()'s triad reaches a real screen and Enter does
// real work on a control that was mouse-only. The key SEMANTICS (Enter and Space both fire,
// both preventDefault, other keys untouched, a nested target keeps its own press) are proven
// deterministically in verify-clickable-keyhandler.mjs, where no page can move underneath
// the measurement. Read the two together; neither is sufficient alone.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const claim = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((r) => { const s = net.createServer(); s.once("error", () => r(false)); s.once("listening", () => s.close(() => r(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
};
const ROUTE_ID = "1"; // the shared opener always opens ROUTES[0]; see the note at the bottom
const port = await claim(5410);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
// Warm EVERY big module before navigating. ClimbMatchCore.jsx alone exceeds Babel's 500KB
// styling threshold, and on a loaded machine its first compile can outlast a 120s goto —
// which fails as a navigation timeout and reads exactly like a broken page.
for (const mod of ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]) {
  const t = Date.now();
  await fetch(base + mod).catch(() => {});
  console.log(`  warmed ${mod} in ${Date.now() - t}ms`);
}

const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const fails = [];
const notes = [];
let proven = 0; // controls on which a key was actually pressed AND something changed
try {
  await page.goto(base + "?zr=" + ROUTE_ID, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 })
    .catch(() => fails.push("?zr=1 never set window.__routeOpen — the route page was never reached, so nothing below was tested"));
  await settledText(page, { min: 400, timeout: 60000 }).catch(() => {});

  // Say WHICH route was measured. Without this the probe reported "no PAIRS WELL WITH
  // section on this route" identically whether it opened the route asked for or silently
  // fell back to ROUTES[0] — and those need opposite repairs.
  const opened = await page.evaluate(() => ({
    title: (document.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 110),
    hasPairs: /PAIRS WELL WITH/i.test(document.body.innerText || ""),
  }));
  console.log(`  asked for route: ${ROUTE_ID}`);
  console.log(`  page shows:      "${opened.title}"   PAIRS WELL WITH present: ${opened.hasPairs}`);

  if (!fails.length) {
    // --- 1. a tab-switching link: focusable, and Enter switches the tab -----------------
    // These are INLINE links on Overview ("View all reports & conditions"), not the sub-tab
    // bar — the first draft matched on the tab NAMES, found nothing, and passed anyway.
    // Matched by visible text, which is authored, rather than by position.
    const subtab = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[role="button"][tabindex="0"]')];
      const hit = els.find((e) => /view all reports|see all reports|reports & conditions/i.test((e.innerText || "")));
      if (!hit) return { found: false, names: els.slice(0, 14).map((e) => (e.innerText || "").trim().slice(0, 30)) };
      hit.focus();
      return { found: true, focused: document.activeElement === hit, label: (hit.innerText || "").trim().slice(0, 40) };
    });
    if (!subtab.found) {
      notes.push(`no sub-tab control matched by name; role=button names seen: ${JSON.stringify(subtab.names)}`);
    } else {
      if (!subtab.focused) fails.push(`focus() did not move to the ${subtab.label} sub-tab — tabIndex missing?`);
      const before = await page.evaluate(() => (document.body.innerText || "").length);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => (document.body.innerText || "").length);
      if (after === before) fails.push(`Enter on "${subtab.label}" changed nothing on screen`);
      else { proven++; notes.push(`"${subtab.label}": Enter changed the screen (${before} -> ${after} chars)`); }

      // Space must not scroll the page — that is the only thing preventDefault buys here.
      //
      // MEASURE IT IN ISOLATION. The first draft sampled scrollY BEFORE pressing Enter and
      // compared it after Space, and reported "preventDefault is not firing" on a 2164->860
      // move. Enter switches the tab, which shortens the page and fires the app's own
      // scrollAppTop() — so that number was a tab-change side effect being blamed on the
      // key handler. Re-focus, settle, sample, THEN press Space and nothing else.
      const y0 = await page.evaluate(() => {
        const el = [...document.querySelectorAll('[role="button"][tabindex="0"]')]
          .find((e) => /view all reports|see all reports|reports & conditions/i.test((e.innerText || "")));
        if (el) el.focus();
        return { y: window.scrollY, refocused: !!el && document.activeElement === el };
      });
      if (!y0.refocused) {
        notes.push("Space test skipped — the control is gone after the tab switch (nothing to press Space on)");
      } else {
        await page.keyboard.press(" ");
        await page.waitForTimeout(500);
        const y1 = await page.evaluate(() => window.scrollY);
        if (y1 !== y0.y) fails.push(`Space scrolled the page (${y0.y} -> ${y1}) — preventDefault is not firing`);
        else { proven++; notes.push(`Space did not scroll the page (stayed at ${y0.y})`); }
      }
    }

    // --- 2. the headline claim: Enter opens ANOTHER climb -------------------------------
    // "PAIRS WELL WITH" holds the linked-route rows fed by onOpenRoute.
    const nav = await page.evaluate(() => {
      const titleNow = () => (document.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 110);
      const all = [...document.querySelectorAll("*")];
      const head = all.find((e) => /PAIRS WELL WITH|SIMILAR ROUTES/i.test((e.innerText || "")) && (e.innerText || "").length < 400);
      if (!head) return { reached: false, why: "no PAIRS WELL WITH / SIMILAR ROUTES section on this route" };
      const row = [...head.querySelectorAll('[role="button"][tabindex="0"]')][0]
        || [...(head.parentElement ? head.parentElement.querySelectorAll('[role="button"][tabindex="0"]') : [])][0];
      if (!row) return { reached: false, why: "section present but it holds no focusable row" };
      row.focus();
      return { reached: true, focused: document.activeElement === row, before: titleNow(), label: (row.innerText || "").trim().slice(0, 40) };
    });
    if (!nav.reached) {
      notes.push(`linked-route row NOT REACHED — ${nav.why}`);
    } else {
      if (!nav.focused) fails.push("focus() did not move to the linked-route row");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
      const afterTitle = await page.evaluate(() => (document.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 110));
      if (afterTitle === nav.before) {
        fails.push(`Enter on the linked-route row "${nav.label}" did not open a different climb (still "${afterTitle}")`);
      } else {
        { proven++; notes.push(`linked route "${nav.label}": Enter opened a different climb ("${nav.before}" -> "${afterTitle}")`); }
      }
    }
  }
} finally {
  await browser.close();
  stop();
}
for (const n of notes) console.log("  " + n);

// FAIL CLOSED. The first draft of this probe reported both cases as NOT REACHED and then
// printed "ok" and exited 0 — a pass that proved nothing, which is worse than no probe at
// all: it is the exact shape this repo keeps recording (a guard you believe you have and
// do not). A keyboard assertion only counts if a key was actually pressed on a real
// control and something observably happened.
if (!fails.length && proven === 0) {
  console.error("\nFAIL — nothing was actually exercised: no control was reachable, so this run");
  console.error("proves NOTHING about whether a keyboard can operate the route page.");
  console.error("Do not read this as the fix working. Check the sampled route rendered at all.\n");
  process.exit(1);
}
if (fails.length) { console.error("\nFAIL:\n" + fails.map((f) => "  - " + f).join("\n") + "\n"); process.exit(1); }
console.log(`\nroute detail keyboard: ok — ${proven} control(s) actually driven by keyboard.`);
