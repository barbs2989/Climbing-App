#!/usr/bin/env node
// THE DATE FORMAT STILL RESET ON EVERY RELOAD.
//
// #1589 made the UNITS toggle survive a reload and stopped there. The Settings screen offers a
// second display preference right beside it -- `dateFmt` (auto / US / international) -- and that
// one was still `useState("auto")`, so a climber who chose day-month-year got month-day-year back
// on the next load, on every date in the app. Same defect, same screen, one control over.
//
// WHY THE BROWSER HALF INJECTS STORAGE RATHER THAN CLICKING. An earlier attempt drove the toggle
// and reloaded, and it kept reporting "0 unit buttons in Settings" -- which reads as a defect in
// the app and was a defect in the probe: the `?z=` opener fires 1200ms AFTER mount and announces
// itself with window.__overlaysReady, and settling on the text alone measures the page before the
// overlay exists. Setting the key with addInitScript and asserting what the app READS at load
// removes the clicking entirely and tests the half that actually persists.
// The WRITE half is covered by saveDateFmt's own cases plus the wiring assertion in section 3;
// between them the round trip is closed without a fragile drive.
//
// --static-only skips the browser and can never print a pass.
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATIC_ONLY = process.argv.includes("--static-only");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

// =======================================================================================
// SECTION 1 -- the module. lib/date-pref.js imports nothing, so it loads directly.
const KEY = "climbmatch-datefmt";
const mod = await import("file://" + path.join(ROOT, "lib", "date-pref.js"));

// No localStorage at all: this is how every SSR guard renders the app, and an unguarded read
// throws ReferenceError at module load and takes them all down.
if (typeof globalThis.localStorage !== "undefined") delete globalThis.localStorage;
if (mod.loadDateFmt() === "auto") ok("loadDateFmt falls back with NO localStorage (the SSR case)");
else fail("loadDateFmt does not fall back when localStorage is absent");
try { mod.saveDateFmt("us"); ok("saveDateFmt is a no-op with no localStorage rather than throwing"); }
catch (e) { fail("saveDateFmt threw with no localStorage: " + e.message); }

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };

mod.saveDateFmt("intl");
if (mod.loadDateFmt() === "intl") ok("a chosen format reads back");
else fail("saveDateFmt/loadDateFmt do not round-trip");

for (const f of mod.VALID_DATE_FMTS) {
  mod.saveDateFmt(f);
  if (mod.loadDateFmt() !== f) fail(`${f} does not round-trip — it is offered by the select and cannot be stored`);
}
ok(`all ${mod.VALID_DATE_FMTS.length} offered formats round-trip (${mod.VALID_DATE_FMTS.join(", ")})`);

mod.saveDateFmt("intl");
mod.saveDateFmt("klingon");
if (mod.loadDateFmt() === "intl") ok("an unrecognised value is refused on WRITE (the good value stands)");
else fail('saveDateFmt accepted "klingon" — the select has no such option');

// THE EMPTY STRING IS THE ONE THAT MATTERS, and it was measured rather than assumed. An arbitrary
// word is a syntactically valid BCP-47 tag and Intl quietly falls back; "" throws RangeError, and
// this mapping is called inside the Settings render, so it would take that screen down.
store[KEY] = "";
if (mod.loadDateFmt() === "auto") ok('a stored EMPTY STRING falls back to auto (it would throw RangeError at Intl)');
else fail('a stored "" is believed — toLocaleDateString("") throws RangeError inside the Settings render');
store[KEY] = "furlongs";
if (mod.loadDateFmt() === "auto") ok("a junk value falls back to auto");
else fail("a junk stored value is believed — loadDateFmt must validate, not just read");

globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
try {
  if (mod.loadDateFmt() === "auto") ok("a throwing localStorage falls back to the default");
  else fail("a throwing localStorage was not handled");
  mod.saveDateFmt("us");
  ok("saveDateFmt swallows a throwing localStorage");
} catch (e) { fail("a throwing localStorage escaped: " + e.message); }
delete globalThis.localStorage;

// The mapping, including auto -> undefined, which is what asks Intl for the reader's own locale.
if (mod.dateFmtToLocale("us") === "en-US" && mod.dateFmtToLocale("intl") === "en-GB" && mod.dateFmtToLocale("auto") === undefined)
  ok("dateFmtToLocale maps all three, and auto stays undefined");
else fail("dateFmtToLocale does not map the three values the select offers");
// Every offered format must have a mapping decision, or a new option silently formats as auto.
for (const f of mod.VALID_DATE_FMTS) {
  const loc = mod.dateFmtToLocale(f);
  if (loc !== undefined && !/^[a-z]{2}-[A-Z]{2}$/.test(loc)) fail(`dateFmtToLocale(${f}) returned ${JSON.stringify(loc)}, which is not a locale tag`);
}

// =======================================================================================
// SECTION 2 -- ON SCREEN. Inject the stored choice and see what the app READS at load.
if (STATIC_ONLY) console.log("\n  --  browser section SKIPPED (--static-only)");
else {
  const freePort = async (lo, hi) => {
    for (let p = lo; p <= hi; p++) {
      const okp = await new Promise((res) => {
        const sv = net.createServer();
        sv.once("error", () => res(false));
        sv.once("listening", () => sv.close(() => res(true)));
        sv.listen(p, "127.0.0.1");
      });
      if (okp) return p;
    }
    return null;
  };
  const port = await freePort(5900, 5949);
  if (port === null) fail("no free port — NOT MEASURED");
  else {
    const base = `http://127.0.0.1:${port}/Climbing-App/`;
    const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1",
      "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
    server.stdout.on("data", () => {});
    server.stderr.on("data", (d) => { const t = String(d); if (/ANCHOR LOST/.test(t)) process.stderr.write(t); });
    const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
    try {
      let up = false;
      for (let i = 0; i < 160; i++) { try { if ((await fetch(base)).ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 500)); }
      if (!up) fail("dev server never came up — NOT MEASURED");
      else {
        const browser = await chromium.launch({ channel: "chrome", headless: true });
        const readPreview = async (stored) => {
          const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
          page.setDefaultNavigationTimeout(180000);
          if (stored !== null) await page.addInitScript(`try{localStorage.setItem(${JSON.stringify(KEY)},${JSON.stringify(stored)});}catch(e){}`);
          // A navigation TIMEOUT on a loaded box is not a verdict about the app. Crashing here
          // reported as a broken probe; it must say NOT MEASURED and let the caller judge.
          const navigated = await page.goto(base + "?z=settingsOpen", { waitUntil: "domcontentloaded" })
            .then(() => true).catch(() => false);
          if (!navigated) { await page.close(); return { ready: false, preview: null, sel: null, navFailed: true }; }
          // The opener fires 1200ms AFTER mount and announces itself here. Settling on text alone
          // measures the page before the overlay exists — which reads as a missing control.
          const ready = await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 })
            .then(() => true).catch(() => false);
          await settledText(page);
          const t = await page.evaluate(() => document.body.innerText || "");
          const sel = await page.evaluate(() => {
            const s = [...document.querySelectorAll("select")].find((x) => /date/i.test(x.getAttribute("aria-label") || ""));
            return s ? s.value : null;
          });
          await page.close();
          return { ready, preview: (t.match(/Dates show like ([^\n]+)/) || [])[1] || null, sel };
        };

        const us = await readPreview("us");
        const intl = await readPreview("intl");
        if (us.navFailed || intl.navFailed) fail("the page never loaded (navigation timed out) — NOT MEASURED, not a verdict about the app");
        else if (!us.ready || !intl.ready) fail("the overlay opener never reported ready — NOT MEASURED");
        else if (!us.preview || !intl.preview) fail(`ANCHOR LOST: no "Dates show like" preview in Settings (us=${JSON.stringify(us.preview)}, intl=${JSON.stringify(intl.preview)}) — this run proved nothing`);
        else {
          console.log(`  --  stored "us"   -> select=${us.sel}   preview: ${us.preview}`);
          console.log(`  --  stored "intl" -> select=${intl.sel} preview: ${intl.preview}`);
          if (us.sel !== "us") fail(`a stored "us" did not reach the control (it reads ${us.sel}) — the choice is not read at load`);
          else if (intl.sel !== "intl") fail(`a stored "intl" did not reach the control (it reads ${intl.sel})`);
          else ok("a stored choice is READ at page load and selects the control");
          // ...and it reaches the formatting, not just the control that sets it.
          if (us.preview === intl.preview) fail(`both formats render the same preview (${us.preview}) — dateFmt reaches the control but not the dates`);
          else ok("the two formats render DIFFERENT dates, so the choice reaches the formatting");
        }
        await browser.close();
      }
    } finally { stop(); }
  }
}

// =======================================================================================
// SECTION 3 -- THE WIRING. Sections 1 and 2 both survive a squash that keeps the module and
// drops the call sites: loadDateFmt would work perfectly while nothing called it.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
for (const [re, what] of [
  [/\[dateFmt,setDateFmt\]=useState\(loadDateFmt\)/, "the date-format state is SEEDED from storage"],
  [/setDateFmt\(e\.target\.value\);saveDateFmt\(e\.target\.value\)/, "choosing a format WRITES it"],
]) {
  if (re.test(app)) ok(what);
  else fail(`${what} — the link is gone, so the module below it is dead code`);
}
const inline = (app.match(/==="us"\?"en-US"/g) || []).length;
if (inline) fail(`the dateFmt->locale mapping is still written inline ${inline} time(s) — it must live only in dateFmtToLocale`);
else ok("the dateFmt->locale mapping exists in exactly one place");
// The globals are set during RENDER, not in an effect, so there is no first-paint flash and the
// module-scope defaults never need seeding. Asserted so a move into useEffect is noticed.
if (/__set_DLOCALE\(dateFmtToLocale\(dateFmt\)\);/.test(app)) ok("DLOCALE is set during render, so the first paint already has the chosen format");
else fail("__set_DLOCALE no longer runs inline — if it moved into an effect the first paint shows the wrong format");

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
if (STATIC_ONLY) console.log("\nPARTIAL RUN — the module and the wiring hold. THE LOAD ITSELF WAS NOT EXERCISED, so this is not a pass.");
else console.log("\nok — the date format is read at load, reaches the dates, and a junk or hostile store cannot break Settings.");
