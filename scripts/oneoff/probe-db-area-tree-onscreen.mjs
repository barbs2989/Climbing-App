// Does DbAreaTree render a REAL catalog hierarchy on screen?
//
// The overlay it replaces was built, correct, and unreachable in production for every real
// climber — gated on `selArea`, which only the seed browse path writes. So "it compiles" and
// "the column is populated" are both worth nothing here; the whole defect class this belongs to
// is a surface that reviews as finished and never renders.
//
// Asserts on names that exist ONLY in the DB catalog (Shelf Road / Cañon City), never on generic
// chrome — a probe that passes on the word "areas" would pass over an empty overlay.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { AREA } from "../areatree.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5290;
const log = (s) => console.log(s);

if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  // dotfiles are loaded by vite itself, so this is a hint rather than a hard gate — but a run
  // with no catalog would render an endless "Loading…" and read as a broken component.
  log("note: no Supabase url in process.env; relying on .env/.env.local being present");
}

async function claimPort(start) {
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
}
async function waitForServer(url, ms = 180000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}, area context forced to ${AREA.id}...`);
const server = spawn("npx", ["vite", "--config", "scripts/areatree.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup" : "dev server never came up");
  stopServer(); process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

const settle = async (ms = 9000) => {
  let last = "", stable = 0;
  const end = Date.now() + ms;
  while (Date.now() < end && stable < 3) {
    await new Promise((r) => setTimeout(r, 400));
    const t = await page.evaluate(() => document.body.innerText || "");
    if (t === last) stable++; else { stable = 0; last = t; }
  }
  return last;
};

await page.goto(base + "?zat=1", { waitUntil: "domcontentloaded", timeout: 120000 });
const opened = await page.waitForFunction(() => window.__areaTreeOpened === true, undefined, { timeout: 30000 }).then(() => true).catch(() => false);
// Wait for the overlay's own heading, not a fixed settle. DbAreaTree is lazy, so a cold dev
// server shows the Suspense fallback first; settling on "text stopped changing" would capture
// "Loading areas…" and report the feature missing. Distinguished from a real failure below:
// `mounted` is asserted separately, so a timeout reads as "never appeared" rather than blending
// into the content assertions.
// LANDMARK: the tree's own subtitle, NOT "All areas" — DbAreaBrowser contains that string SEVEN
// times, so the first version of this probe was matching the screen BEHIND the overlay and
// reporting it mounted when it had never rendered. This file's own header warns about exactly
// that ("a probe that passes on the word 'areas' would pass over an empty overlay") and it was
// still the mistake made. Assert on text only the subject renders.
const LANDMARK = /tap a name to jump/i;
const mounted = await page.waitForFunction(
  () => /tap a name to jump/i.test(document.body.innerText || ""), undefined, { timeout: 120000 },
).then(() => true).catch(() => false);
let text = await settle();

const fails = [];
const ok = (cond, msg) => { log(`  ${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) fails.push(msg); };

// Fail closed: if the injection never fired, everything below is a statement about a screen that
// was never opened — the exact shape this repo records for guards that "pass" over a blank app.
ok(opened, "the probe's injection fired (window.__areaTreeOpened)");
ok(mounted, "DbAreaTree itself mounted (its own subtitle, not a string DbAreaBrowser shares)");
ok(LANDMARK.test(text), "the tree is still on screen at assert time");
ok(!/Loading areas/.test(text), "the Suspense fallback is gone — the chunk compiled, not merely started");

// The catalog hierarchy itself. These names come from co_cactus_cliff's own ltree path and exist
// in the DB catalog only — the seed MOUNTAINS array has no Colorado crag tree.
ok(/Colorado/i.test(text), "the STATE ancestor rendered (Colorado) — useAreaPath resolved");
ok(/Shelf Road|Ca.on City/i.test(text), "a real DB descendant rendered (Shelf Road / Cañon City)");
ok(/\d/.test(text), "route counts rendered (areas.route_count)");

// Expanding must actually fetch. Click the first chevron below the root and require the text to grow.
const before = text.length;
const chev = page.locator("button[aria-label^='Expand']").first();
let expanded = false;
if (await chev.count()) { await chev.click({ timeout: 5000 }).catch(() => {}); text = await settle(); expanded = text.length > before; }
ok(await chev.count() > 0, "an Expand control exists");
ok(expanded, `expanding a node fetched its children (text ${before} -> ${text.length} chars)`);

// And it must never render the empty-branch state as if it were the truth.
ok(!/No sub-areas[\s\S]{0,40}No sub-areas[\s\S]{0,40}No sub-areas/.test(text), "not every branch reports 'No sub-areas' (that would mean the children query is failing)");

log("");
// The LAST lines, not the first. The overlay is portalled to <body>, so it is appended after the
// app root and its text comes last in innerText — printing the head shows the page behind it,
// which is how the previous run's preview looked like a browser with no tree in it.
log(text.split("\n").map((l) => l.trim()).filter(Boolean).slice(-22).join("\n"));
log("");
await browser.close(); stopServer();
if (fails.length) { console.error(`\nprobe-db-area-tree: ${fails.length} assertion(s) failed`); process.exit(1); }
log("ok — DbAreaTree renders the real catalog hierarchy, expands on demand, and the counts are the catalog's own.");
