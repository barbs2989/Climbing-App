// The add-a-climb meter was labelled "TRUST SCORE POTENTIAL" and measured how many form fields
// were filled — two different things, and nothing reads contributions into either trust path. It
// now says "HOW COMPLETE THIS IS".
//
// That relabel made a second defect visible rather than causing it: every `sf("x")?…:1` counted a
// field the chosen discipline never asks for as SATISFIED, so an UNTOUCHED form read 85%.
// Excluding non-applicable fields from the denominator takes it to 0%.
//
// A meter that reads 0 and never moves would be worse than one that starts at 85, so this drives
// it: open the modal, type a name, and assert the number RISES. Both halves are asserted, because
// either alone is satisfied by a broken meter — one by a meter stuck at 0, the other by the old
// always-high one.
//
//   node scripts/oneoff/probe-add-route-completeness.mjs
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5460;

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
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

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
console.log(`starting dev server on ${port}...`);
const server = spawn("npx",
  ["vite", "--config", "scripts/zero-state.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); stopServer(); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultTimeout(30000);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

await page.goto(base + "?zt=me&z=addRouteOpen", { waitUntil: "domcontentloaded", timeout: 120000 });
await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});

// Read the percentage sitting beside the meter's own heading, not any number on the page.
const readPct = () => page.evaluate(() => {
  const head = [...document.querySelectorAll("span,div")]
    .find((e) => (e.textContent || "").trim() === "HOW COMPLETE THIS IS");
  if (!head) return null;
  const row = head.parentElement;
  const m = /(\d+)%/.exec(row ? row.innerText || "" : "");
  return m ? Number(m[1]) : null;
});

const before = await readPct();
if (before === null) {
  const seen = await page.evaluate(() => (document.body.innerText || "").slice(0, 400));
  console.log("  FAIL  the meter is not on screen — the modal did not open, so nothing below was checked.");
  console.log("        on screen: " + JSON.stringify(seen));
  stopServer(); process.exit(1);
}
ok(`the meter renders, labelled "HOW COMPLETE THIS IS"`);

// ── 1. An untouched form is not mostly complete. It read 85% before non-applicable fields were
//    dropped from the denominator.
if (before > 10) fail(`an untouched form reads ${before}% — non-applicable fields are still counting as satisfied`);
else ok(`an untouched form reads ${before}%`);

// ── 2. …and it still MOVES. A meter pinned at 0 would satisfy the assertion above and be worse
//    than the number it replaced. The form is a wizard — step 1 is the discipline and the name box
//    does not exist yet — so this drives it the way a climber does rather than reaching for an
//    input that is not on screen.
const picked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").trim() === "Alpine");
  if (!b) return false;
  b.click();
  return true;
});
if (!picked) {
  fail("could not pick a discipline — the RISES half is unproven");
} else {
  await settledText(page, { min: 30, timeout: 20000 }).catch(() => {});
  const afterDisc = await readPct();
  if (afterDisc === null) fail("the meter vanished after picking a discipline");
  else if (afterDisc < before) fail(`picking a discipline made the meter go BACKWARDS (${before}% -> ${afterDisc}%) — the fields the discipline asks for were being counted as already satisfied before it was chosen`);
  else if (afterDisc === before) fail(`picking a discipline did not move the meter (${before}%) — it is pinned`);
  else ok(`picking a discipline raises it ${before}% -> ${afterDisc}%`);

  // Naming the climb is the second unconditional check, so it must move again.
  const typed = await page.evaluate(() => {
    const box = [...document.querySelectorAll("input")].find((i) => i.type !== "file"
      && /name/i.test((i.getAttribute("aria-label") || "") + " " + (i.placeholder || "")));
    if (!box) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(box, "Probe Route");
    box.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  });
  if (!typed) {
    const boxes = await page.evaluate(() => [...document.querySelectorAll("input,textarea")]
      .map((i) => i.tagName + "|" + (i.getAttribute("aria-label") || "") + "|" + (i.placeholder || "")).slice(0, 12));
    fail("the climb-name box is not on screen after picking a discipline: " + JSON.stringify(boxes));
  } else {
    await settledText(page, { min: 30, timeout: 20000 }).catch(() => {});
    const named = await readPct();
    if (named === null) fail("the meter vanished after typing");
    else if (named <= afterDisc) fail(`naming the climb did not raise the meter (${afterDisc}% -> ${named}%)`);
    else ok(`naming the climb raises it ${afterDisc}% -> ${named}%`);
  }
}

await browser.close();
stopServer();
console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — the meter starts empty and responds to what is filled in.");
process.exit(failures ? 1 : 0);
