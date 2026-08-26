// probe-switch-toggles-onscreen — does clicking a switch actually FLIP the aria-checked it
// announces, or is the attribute bound to the wrong variable?
//
// check:control-names proves the nine switches carry role="switch" and aria-checked IN THE
// SOURCE. That is not the interesting risk. React passing an aria-* attribute through to a
// visibly-rendered element is not a plausible failure, so a "does it reach the DOM" probe would
// prove almost nothing. The risk worth measuring is that aria-checked is bound to the WRONG
// EXPRESSION -- which looks perfectly correct statically and is silently false at runtime.
//
// Each aria-checked was taken from the control's own `background:` condition, so a wrong binding
// would also make the COLOUR wrong. This proves that reasoning rather than asserting it.
//
// Uses the overlay-scroll config, the same scaffold check:selected-state reuses, so the ?z=
// opener can reach the overlays where these switches live. Report-only; fails closed on a dead
// app or zero switches found.
//
// MEASURED 2026-08-26: 9/9 flipped BOTH aria-checked and their background on click. Every binding
// is correct at runtime, not merely present in the source.
//
// Where they actually live, measured rather than assumed: EIGHT are on settingsOpen -- the
// privacy and notification switches are rendered INSIDE the settings overlay rather than on
// privacyOpen/notifOpen, which show none. The other is the profile editor's (editDraft). The two
// empty screens are kept in the list deliberately: they say "no switch on screen" rather than
// being silently absent, so a future move of those switches shows up as a change here.
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;

// Every overlay that holds at least one switch, from check:control-names' own findings.
const SCREENS = ["settingsOpen", "privacyOpen", "notifOpen", "editDraft"];

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

const port = await claimPort(5390);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

console.log(`starting dev server on ${port} with the overlay scaffold...`);
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up) { console.error("dev server never came up"); stopServer(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const load = async (qs) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 }).catch(() => {});
  await settledText(page, { timeout: 45000 }).catch(() => {});
};

// THE FALSE-PASS GUARD. A blank app finds zero switches and would otherwise read as "nothing
// wrong". index.html's boot placeholder mirrors the real nav, so nav presence proves nothing --
// the character count separates the shell from the app.
await load("?zt=today");
const booted = await page.evaluate(() => (document.body.innerText || "").length);
if (booted < 200) { console.error(`the app did not render (${booted} chars) — nothing was checked.`); await browser.close(); stopServer(); process.exit(1); }

let seen = 0, flipped = 0;
const bad = [];

for (const s of SCREENS) {
  await load(`?zt=me&z=${s}`);
  const n = await page.evaluate(() => document.querySelectorAll('[role="switch"]').length);
  if (!n) { console.log(`  ${s.padEnd(14)} no switch on screen`); continue; }
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate((i) => {
      const el = document.querySelectorAll('[role="switch"]')[i];
      if (!el) return null;
      const label = el.getAttribute("aria-label") || "(unnamed)";
      const before = el.getAttribute("aria-checked");
      const bg = getComputedStyle(el).backgroundColor;
      el.scrollIntoView({ block: "center" });
      el.click();
      return { label, before, bg };
    }, i);
    if (!r) continue;
    await page.waitForTimeout(350);
    const after = await page.evaluate((i) => {
      const el = document.querySelectorAll('[role="switch"]')[i];
      return el ? { checked: el.getAttribute("aria-checked"), bg: getComputedStyle(el).backgroundColor } : null;
    }, i);
    seen++;
    const moved = after && after.checked !== r.before;
    // The colour is the second half of the claim: aria-checked and the background are supposed to
    // be driven by the SAME expression, so if one moved and the other did not, the binding is
    // wrong in exactly the way a static check cannot see.
    const colourMoved = after && after.bg !== r.bg;
    if (moved && colourMoved) flipped++;
    else bad.push({ screen: s, label: r.label, before: r.before, after: after && after.checked, moved, colourMoved });
    // Put it back, so later switches on this screen are measured from a clean state.
    await page.evaluate((i) => { const el = document.querySelectorAll('[role="switch"]')[i]; if (el) el.click(); }, i);
    await page.waitForTimeout(250);
  }
  console.log(`  ${s.padEnd(14)} ${n} switch(es)`);
}

await browser.close();
stopServer();

if (!seen) { console.error("\nFAIL: no switch was reached on any screen — the probe measured nothing."); process.exit(1); }
console.log(`\n${flipped}/${seen} switch(es) flipped BOTH aria-checked and their background on click.`);
for (const b of bad) {
  console.log(`  MISMATCH ${b.screen} "${b.label}" aria-checked ${b.before} -> ${b.after}`
    + ` (announced moved=${b.moved}, colour moved=${b.colourMoved})`);
}
process.exit(bad.length ? 1 : 0);
