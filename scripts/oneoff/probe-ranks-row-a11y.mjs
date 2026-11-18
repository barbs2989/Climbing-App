// One-off: the Ranks leaderboard row is no longer a button holding buttons (axe nested-interactive,
// WCAG 4.1.2, found 2026-11-18 by probe-ranks-area-picker.mjs). Drives the Overall board at 390px, SIGNED IN
// (real rows: profile button + points button; no Report button since 2026-11-18) and as a GUEST (seed rows: the value sits inside
// the profile button), and asserts: axe finds no WCAG A/AA or label-in-name violation, no control is nested in
// another, the row's profile button keeps the "#N, …" name, it opens the profile, and the points button opens
// the breakdown. Creates a throwaway account (service key) and deletes it.
//   node scripts/oneoff/probe-ranks-row-a11y.mjs http://localhost:5287/Climbing-App/ [shotDir]
import { chromium } from "playwright-core";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-ranks-row-a11y.mjs");

const URL = process.argv[2] || "http://localhost:5173/Climbing-App/";
const SHOTS = process.argv[3] || null;
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const fails = [];
const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails.push(m); };

async function openRanks(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  let tapped = false;
  for (let i = 0; i < 60 && !tapped; i++) {
    tapped = await page.evaluate(() => { const e = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => (x.textContent || "").trim() === "Ranks").sort((a, b) => Number(!!b.closest('[aria-label="Primary"]')) - Number(!!a.closest('[aria-label="Primary"]')))[0]; if (e) e.click(); return !!e; });
    if (!tapped) await page.waitForTimeout(1000);
  }
  if (!tapped) throw new Error("no Ranks control");
  await page.locator('[aria-label^="#1, "]').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
}
async function audit(page, who) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => {
    const a = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    const b = await window.axe.run(document, { runOnly: { type: "rule", values: ["label-content-name-mismatch", "nested-interactive"] }, resultTypes: ["violations"] });
    return [...a.violations, ...b.violations].map((x) => ({ id: x.id, nodes: x.nodes.filter((n) => !/partially obscured/.test(n.failureSummary || "")).map((n) => n.target.join(" ") + " [" + ((document.querySelector(n.target[0]) || {}).getAttribute?.("aria-label") || "").slice(0, 60) + "]") })).filter((x) => x.nodes.length);
  });
  ok(v.length === 0, who + ": axe finds no WCAG A/AA, label-in-name or nested-interactive violation" + (v.length ? "\n         " + v.map((x) => x.id + ": " + x.nodes.slice(0, 3).join(" | ")).join("\n         ") : ""));
  const nested = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a[href]')].filter((el) => el.querySelector('button,[role="button"],a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60)));
  ok(nested.length === 0, who + ": no control holds another control" + (nested.length ? " — " + nested.slice(0, 4).join(" | ") : ""));
  const rows = await page.locator('button[aria-label^="#"]').count();
  ok(rows > 0, who + ": every row's profile control is a real <button> named \"#N, …\" (" + rows + ")");
}

const fixture = await createFixture(() => {});
const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
try {
  // ── signed in ──
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await openRanks(page);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "row-signed-in.png") });
  await audit(page, "signed in");
  const how = page.locator('button[aria-label^="How "][aria-label*=" got "]').first();
  ok(await how.count() === 1, "signed in: a real row's points are their own button");
  ok(await page.locator('button[aria-label^="Report "]').count() === 0, "signed in: no Report button on the rows (2026-11-18: Report is on the profile)");
  await how.click();
  const dlg = page.locator('[role="dialog"]');
  await dlg.first().waitFor({ timeout: 20000 }).catch(() => {});
  const dlgText = (await dlg.first().textContent().catch(() => "")) || "";
  ok(/How .* got|add up/i.test(dlgText), "signed in: the points button opens the breakdown, not the profile");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "row-breakdown.png") });
  await openRanks(page);
  const prof = page.locator('button[aria-label^="#"]').first();
  const label = await prof.getAttribute("aria-label");
  await prof.click();
  await page.waitForTimeout(2500);
  const who = label.split(", ")[1];
  ok(await page.locator('[role="dialog"]').count() > 0 || (await page.evaluate(() => document.body.innerText)).includes("Climbs logged"), "signed in: the row's profile button opens " + who + "'s profile");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "row-profile.png") });
  ok(errs.length === 0, "signed in: no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));

  // ── guest (seed rows) ──
  const g = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const gErrs = [];
  g.on("pageerror", (e) => gErrs.push(e.message));
  await g.goto(URL, { waitUntil: "domcontentloaded" });
  const guestBtn = g.getByRole("button", { name: /View as guest|Continue as guest|Look around/i }).first();
  await guestBtn.waitFor({ timeout: 30000 }).catch(() => {});
  if (await guestBtn.count()) await guestBtn.click();
  await openRanks(g);
  if (SHOTS) await g.screenshot({ path: path.join(SHOTS, "row-guest.png") });
  await audit(g, "guest");
  const firstVal = await g.locator('button[aria-label^="#1, "]').first().innerText();
  ok(/\d/.test(firstVal.split("\n").pop() || ""), "guest: the number sits inside the profile button, so the whole row still opens the profile (" + firstVal.replace(/\s+/g, " ").slice(0, 60) + ")");
  ok(gErrs.length === 0, "guest: no page errors" + (gErrs.length ? ": " + gErrs.join(" | ") : ""));
} finally {
  await browser.close();
  const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
  if (leaked && leaked.length) console.log("  cleanup: " + leaked.join("; "));
}
console.log(fails.length ? "\nFAIL — " + fails.length : "\nok — every step held");
process.exit(fails.length ? 1 : 0);
