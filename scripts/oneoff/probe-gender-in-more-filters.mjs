#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// More genders, pronouns, and a gender filter you can tick several of (owner, 2026-11-18; migration 0475).
// Signs in a fresh fixture account that states one of the NEW genders and two pronoun sets, then at 390px:
//   - Partners: no gender pill in the row; More filters is offered on My areas; its panel opens with one
//     chip per gender; two can be on at once; the badge counts them; the pick survives a reload; on an
//     example-list mode the chips sit above the other filters;
//   - Profile: the header reads the gender and the pronouns; the editor offers Pronouns, caps them at
//     four, and a saved change reaches the database.
// The fixture is deleted at the end. Screenshots go to argv[2].
//   node scripts/oneoff/probe-gender-in-more-filters.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-gender-in-more-filters.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5800 + Math.floor(Math.random() * 150), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
let fixture, browser, page;
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(() => {});
  const uid = fixture.session.user.id, auth = { apikey: anonKey(), Authorization: `Bearer ${fixture.session.access_token}` };
  const un = "walk" + Date.now().toString(36);
  // return=minimal: the profile row is read through column grants (0435), so asking for it back is refused.
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ username: un, gender: "genderqueer", pronouns: ["she_her", "they_them"] }) });
  ok(pr.ok, "the fixture finished setup with a NEW gender and two pronoun sets (HTTP " + pr.status + ")");
  const mine = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=gender,pronouns`, { headers: auth })).json())[0] || {};
  const stored = await mine();
  ok(stored.gender === "genderqueer" && (stored.pronouns || []).join() === "she_her,they_them", "the database holds them (" + JSON.stringify(stored) + ")");
  const tooMany = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ pronouns: ["she_her", "he_him", "they_them", "ze_hir", "xe_xem"] }) });
  const junk = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ pronouns: ["typed by hand"] }) });
  ok(!tooMany.ok && !junk.ok, "the database refuses five pronoun sets (HTTP " + tooMany.status + ") and one not on the list (HTTP " + junk.status + ")");

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  const boot = async () => { await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000); };
  const openPartners = async () => { await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click(); await page.waitForTimeout(6000); };
  await boot();
  // The policy changed with this feature, so a signed-in account is asked to accept it once.
  const accept = page.locator("button", { hasText: /^(I accept|I agree|Accept|Agree)/ });
  if (await accept.count()) { note("policy update notice shown; accepting"); await accept.first().click(); await page.waitForTimeout(1500); }
  await openPartners();
  const zipForm = page.locator('[role="region"][aria-label="Add your zip code"]');
  if (await zipForm.count()) { await zipForm.locator('input[aria-label="Zip code"]').fill("84117"); await zipForm.locator("button", { hasText: /^Save$/ }).click(); await page.waitForTimeout(6000); }
  const by = page.locator('select[aria-label="Search by"]');
  ok(await by.count() === 1, "Partners tab is open (Search by pill present)");
  const row = page.locator('[role="group"][aria-label="Narrow the list"]');
  const more = row.locator("button", { hasText: /^More filters/ });
  const chips = page.locator('[role="group"][aria-label="Show only these genders"]');
  const chip = (t) => chips.locator("button", { hasText: new RegExp("^" + t + "$") });
  const moreText = async () => (await more.innerText()).replace(/\s+/g, " ").trim();

  // My areas: the mode that had NO More filters button before.
  await by.selectOption("mine"); await page.waitForTimeout(2500);
  ok(await row.locator('[role="switch"]').count() === 0 && await row.locator("button", { hasText: /^Only / }).count() === 0, "no gender pill or switch in the filter row");
  ok(await more.count() === 1, "More filters is offered on My areas");
  await more.click(); await page.waitForTimeout(600);
  const labels = await chips.locator("button").allInnerTexts();
  ok(labels.join("|") === "Women|Men|Non-binary|Genderqueer|Genderfluid|Agender|Two-Spirit", "the panel offers one chip per gender (" + labels.join(", ") + ")");
  ok(await chips.locator('button[aria-pressed="true"]').count() === 0, "nothing is picked to begin with, although the climber has a gender of their own");
  ok(await page.locator("text=AVAILABLE TO CLIMB").count() === 0, "My areas' panel shows the gender chips alone");
  await shot("1-myareas-panel");
  await chip("Women").click(); await page.waitForTimeout(600);
  await chip("Non-binary").click(); await page.waitForTimeout(2500);
  ok(await chip("Women").getAttribute("aria-pressed") === "true" && await chip("Non-binary").getAttribute("aria-pressed") === "true" && await chips.locator('button[aria-pressed="true"]').count() === 2, "Women and Non-binary are on together");
  ok(/More filters 2/.test(await moreText()), "the More filters badge counts both (" + (await moreText()) + ")");
  await shot("2-women-and-nonbinary");

  // An example-list mode: the chips first, the other filters under them.
  const exMode = (await by.locator("option").evaluateAll((os) => os.map((o) => o.value))).find((v) => !["mine", "peak"].includes(v));
  await by.selectOption(exMode); await page.waitForTimeout(3000);
  if (!(await chips.count())) { await more.click(); await page.waitForTimeout(600); }
  const sy = await chips.boundingBox().then((b) => b && b.y), ay = await page.locator("text=AVAILABLE TO CLIMB").first().boundingBox().then((b) => b && b.y).catch(() => null);
  ok(sy && ay && sy < ay, "on '" + exMode + "' the panel shows the chips above the other filters");
  await shot("3-example-mode-panel");

  // Remembered on this device.
  await boot(); await openPartners();
  ok(/More filters 2/.test(await moreText()), "after a reload the pick is still on (" + (await moreText()) + ")");
  await more.click(); await page.waitForTimeout(600);
  await chip("Women").click(); await page.waitForTimeout(400); await chip("Non-binary").click(); await page.waitForTimeout(800);
  ok(await chips.locator('button[aria-pressed="true"]').count() === 0 && /^More filters$/.test(await moreText()), "unticking both clears the filter and the badge");
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px on Partners");

  // Profile: the header, then the editor.
  await page.locator('button[aria-label="Profile"], button:has-text("Profile")').last().click(); await page.waitForTimeout(5000);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  ok(body.includes("Genderqueer · she/her, they/them"), "the Profile header reads: Genderqueer · she/her, they/them");
  await shot("4-profile-header");
  await page.locator("button", { hasText: /Edit profile/ }).first().click(); await page.waitForTimeout(3000);
  const pg = page.locator('[role="group"][aria-label="Pronouns"]'), gg = page.locator('[role="group"][aria-label="Gender"]');
  ok(await gg.locator("button").count() === 8, "the editor offers seven genders and Prefer not to say (" + (await gg.locator("button").count()) + " choices)");
  ok(await pg.count() === 1 && await pg.locator('button[aria-pressed="true"]').count() === 2, "the editor has Pronouns, with the two stored sets on");
  await pg.scrollIntoViewIfNeeded(); await shot("5-editor-pronouns");
  await pg.locator("button", { hasText: /^ze\/hir$/ }).click(); await pg.locator("button", { hasText: /^xe\/xem$/ }).click(); await page.waitForTimeout(400);
  ok(await pg.locator('button[aria-pressed="true"]').count() === 4 && await pg.locator("button:disabled").count() === await pg.locator("button").count() - 4, "at four, every other pronoun chip is disabled");
  await pg.locator("button", { hasText: /^xe\/xem$/ }).click(); await page.waitForTimeout(300);
  await gg.locator("button", { hasText: /^Two-Spirit$/ }).click(); await page.waitForTimeout(300);
  await page.locator("button", { hasText: /^Save$/ }).first().click(); await page.waitForTimeout(5000);
  const after = await mine();
  ok(after.gender === "two_spirit" && (after.pronouns || []).slice().sort().join() === "she_her,they_them,ze_hir", "Save reached the database (" + JSON.stringify(after) + ")");
  const body2 = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  ok(body2.includes("Two-Spirit · she/her, they/them, ze/hir"), "the Profile header now reads: Two-Spirit · she/her, they/them, ze/hir");
  await shot("6-profile-after-save");
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px on Profile");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) {
  ok(false, "threw: " + e.message.split("\n")[0]);
  if (page) { await shot("0-stuck").catch(() => {}); note("stuck on: " + (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400)); }
}
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch((e) => console.log("CLEANUP FAILED " + e.message)); server.kill(); }
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall ok");
process.exit(fails.length ? 1 : 0);
