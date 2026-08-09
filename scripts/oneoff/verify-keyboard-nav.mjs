// One-off: prove a keyboard can actually open a climb.
//
// check:clickable is static — it proves role/tabIndex/onKeyDown are present, not that
// pressing Enter does anything. This drives the real app and asserts the behaviour.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import { settledText } from "../lib/render-settle.mjs";

const claimPort = () => new Promise((res) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const port = await claimPort();
// Same spawn as check:ui, which drives this app's dev server successfully. Two details
// are load-bearing and were the reason my first two attempts timed out in Chrome while
// Node's fetch to the same URL succeeded: --host pins the interface, and the prewarm
// below compiles the ~1.5MB entry module BEFORE the browser asks for it.
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" },
});
const base = `http://127.0.0.1:${port}/Climbing-App/`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 120; i++) {
  try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {}
  await wait(500);
}
if (!up) { console.error("dev server never came up"); server.kill(); process.exit(1); }
// Compile the entry module before the browser asks, or Chrome times out on goto.
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const fails = [];

try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await settledText(page, { min: 30, timeout: 60000 });

  // Go to the Climbs tab.
  await page.getByText("Climbs", { exact: true }).first().click();
  await settledText(page, { min: 30, timeout: 45000 });
  const body = await page.innerText("body");
  console.log(`Climbs body: ${body.length} chars`);
  console.log(`first 160: ${JSON.stringify(body.slice(0, 160))}`);
  const roles = await page.evaluate(() => {
    const all = [...document.querySelectorAll("[role]")];
    const tally = {};
    for (const e of all) tally[e.getAttribute("role")] = (tally[e.getAttribute("role")] || 0) + 1;
    return tally;
  });
  console.log("roles present:", JSON.stringify(roles));

  // The Climbs landing is just a state picker — the rows this fix targets are one level
  // in. Pick a state the same way check:ui does (prefix match, real change event).
  await page.evaluate(() => {
    const sel = document.querySelector("select");
    if (!sel) return;
    const opt = [...sel.options].find((o) => /^Washington\b/.test(o.label) || /^Utah\b/.test(o.label));
    if (!opt) return;
    sel.value = opt.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settledText(page, { min: 30, timeout: 45000 });
  const drilled = await page.innerText("body");
  console.log(`after picking a state: ${drilled.length} chars`);

  // How many route/area rows are now keyboard-reachable?
  const reachable = await page.evaluate(() =>
    [...document.querySelectorAll('[role="button"][tabindex="0"]')].length
  );
  console.log(`role=button + tabindex=0 elements on Climbs: ${reachable}`);
  if (!reachable) fails.push("no keyboard-reachable custom controls on the Climbs tab");

  // Focus the first one that looks like a row and press Enter.
  const before = (await page.innerText("body")).length;
  const opened = await page.evaluate(() => {
    // Pick the richest one — the mode tabs ("Areas"/"Routes") are also fixed controls,
    // and focusing one of those would prove the mechanism without proving a ROW works.
    const el = [...document.querySelectorAll('[role="button"][tabindex="0"]')]
      .filter((e) => !/^(Areas|Routes)$/.test((e.innerText || "").trim()))
      .sort((a, b) => (b.innerText || "").length - (a.innerText || "").length)[0];
    if (!el) return null;
    el.focus();
    return { text: el.innerText.trim().slice(0, 40), focused: document.activeElement === el };
  });
  if (!opened) fails.push("could not find a focusable row to test");
  else {
    console.log(`focused: ${JSON.stringify(opened.text)}  (activeElement matched: ${opened.focused})`);
    if (!opened.focused) fails.push("calling focus() on the row did not move focus — tabIndex missing?");
    await page.keyboard.press("Enter");
    await wait(4000);
    const after = await page.innerText("body");
    console.log(`body ${before} -> ${after.length} chars after Enter`);
    if (after.length === before) fails.push("pressing Enter on a focused row changed nothing");
  }
} finally {
  await browser.close();
  server.kill();
}

if (fails.length) { console.error("\nFAIL:\n" + fails.map((f) => "  - " + f).join("\n") + "\n"); process.exit(1); }
console.log("\nkeyboard navigation: ok — a focused row opens on Enter.");
