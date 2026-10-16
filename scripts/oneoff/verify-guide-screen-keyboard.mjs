// Prove a keyboard can actually tick the guide attestations.
//
// check:clickable is STATIC: it proves role/tabIndex/onKeyDown are present on the guide
// controls #870 fixed. It cannot prove Enter does anything, and for a CHECKBOX there is a
// second thing to prove that a button never has — that the announced state (aria-checked)
// actually flips. The attestations gate the whole guide application, so a climber who can
// focus them but not toggle them still cannot apply.
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
const port = await claim(5370);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
// The a11y-badges config injects the ?z= opener, which is how the guide application sheet
// gets opened directly instead of navigated to.
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const fails = [];
try {
  await page.goto(base + "?zt=me&z=guideAppOpen", { waitUntil: "domcontentloaded", timeout: 120000 });
  await settledText(page, { min: 30, timeout: 60000 }).catch(() => {});

  const found = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[role="checkbox"]')];
    return { n: boxes.length, tabIndexes: boxes.map((b) => b.getAttribute("tabindex")), checked: boxes.map((b) => b.getAttribute("aria-checked")) };
  });
  if (!found.n) {
    const dbg = await page.evaluate(() => ({
      chars: (document.body.innerText || "").length,
      head: (document.body.innerText || "").replace(/\n/g, " | ").slice(0, 260),
      roles: [...new Set([...document.querySelectorAll("[role]")].map((e) => e.getAttribute("role")))],
      hasAgreements: /Agreement/i.test(document.body.innerText || ""),
    }));
    console.log("  DIAGNOSTIC:", JSON.stringify(dbg, null, 1));
  }
  console.log(`role=checkbox controls on the guide application sheet: ${found.n}`);
  console.log(`  tabindex: ${JSON.stringify(found.tabIndexes)}`);
  console.log(`  aria-checked before: ${JSON.stringify(found.checked)}`);
  // The attestations sit behind a REAL-AUTH gate: DbGuideApply renders a sign-in prompt
  // unless a real account is signed in, and VITE_DEMO_AUTOLOGIN is not one. That is correct
  // — the application is a legally-relevant timestamped record — so report it as out of
  // reach rather than as a missing control, which would read as #870 having failed.
  const gated = await page.evaluate(() => /Sign in with a real account/i.test(document.body.innerText || ""));
  if (!found.n && gated) {
    console.log("\nSKIPPED — the attestations are behind a real-auth gate and this probe signs in as the demo.");
    console.log("To reach them, drive this with check:signed-in's fixture (scripts/lib/ui-fixture.mjs),");
    console.log("which creates and destroys a real account per run. The gate itself rendered correctly.");
    await browser.close(); stop(); process.exit(0);
  }
  if (!found.n) fails.push("no role=checkbox found, and no sign-in gate either — the sheet did not open, or #870 did not land");

  if (found.n) {
    // Focus the first attestation the way a keyboard user reaches it, then press Enter.
    const focused = await page.evaluate(() => {
      const b = document.querySelector('[role="checkbox"]');
      b.focus();
      return document.activeElement === b;
    });
    if (!focused) fails.push("calling focus() on the attestation did not move focus — tabIndex missing?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterEnter = await page.evaluate(() => document.querySelector('[role="checkbox"]').getAttribute("aria-checked"));
    console.log(`  aria-checked after Enter: ${afterEnter}`);
    if (afterEnter !== "true") fails.push(`Enter did not tick the attestation (aria-checked=${afterEnter})`);

    // Space must work too, and must NOT scroll the page — that is what preventDefault buys.
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press(" ");
    await page.waitForTimeout(400);
    const afterSpace = await page.evaluate(() => ({ c: document.querySelector('[role="checkbox"]').getAttribute("aria-checked"), y: window.scrollY }));
    console.log(`  aria-checked after Space: ${afterSpace.c}  (scrollY ${scrollBefore} -> ${afterSpace.y})`);
    if (afterSpace.c !== "false") fails.push(`Space did not untick the attestation (aria-checked=${afterSpace.c})`);
    if (afterSpace.y !== scrollBefore) fails.push(`Space scrolled the page (${scrollBefore} -> ${afterSpace.y}) — preventDefault is not firing`);
  }
} finally {
  await browser.close();
  stop();
}
if (fails.length) { console.error("\nFAIL:\n" + fails.map((f) => "  - " + f).join("\n") + "\n"); process.exit(1); }
console.log("\nguide attestations: ok — reachable by focus, Enter ticks, Space unticks and does not scroll.");
