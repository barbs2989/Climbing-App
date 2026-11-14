#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// Climber walkthrough of the consolidated Partners tab (owner, 2026-11-13/14): signs in a FRESH fixture
// account (not listed anywhere, no zip), walks the tab the way a climber would at 390px, lists itself in
// Utah through Pick an area, then checks My areas, More filters, the info toggle, the free-this-weekend
// switch and Invite, and takes one desktop shot. The fixture is deleted at the end. Screenshots go to argv[2].
//   node scripts/oneoff/probe-partners-climber-walk.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-partners-climber-walk.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
let fixture, browser;
const shot = (page, n) => page.screenshot({ path: path.join(OUT, n + ".png") });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(() => {});
  browser = await chromium.launch({ channel: "chrome", headless: true });
  // Salt Lake City, so "Near me now" has somewhere to measure from.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 40.67, longitude: -111.85 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);

  // 1. Open Partners, as a climber would, from the nav.
  await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click(); await page.waitForTimeout(6000);
  const by = page.locator('select[aria-label="Search by"]');
  ok(await by.count() === 1, "Partners tab is open (Search by pill present)");
  const modes = await by.locator("option").allInnerTexts();
  ok(modes.join("|") === "My areas|Pick an area|My objectives|A route|Everyone", "five modes: " + modes.join(" | "));
  ok(await by.inputValue() === "myareas", "opens on My areas");
  const you = page.locator('section[aria-label="How climbers find you"]');
  ok(await you.count() === 1, "the You card is there");
  const youTxt = await you.innerText().catch(() => "");
  note("You card: " + youTxt.replace(/\n/g, " / "));
  ok(/not listed anywhere/i.test(youTxt), "unlisted: the You card says so");
  ok(await page.locator("button", { hasText: /^Choose my areas$/ }).count() === 1, "Choose my areas is offered ONCE on the screen (the empty card), not twice");
  ok(/I’m free this weekend/.test(youTxt), "the free-this-weekend switch is in the You card");
  ok(!/ended/i.test(youTxt), "no ended-dates warning");
  const row = page.locator('[role="group"][aria-label="Narrow the list"]');
  const rowTxt = await row.innerText();
  ok(!/Free this weekend|My areas ·|Sort ·/.test(rowTxt), "the pill row holds no status toggle, editor pill or Sort");
  const pills = await row.locator(":scope > *").count();
  note("pills in the row: " + pills);
  ok(pills <= 6, "at most 6 pills in the row");
  ok(await page.locator('select[aria-label="Search radius"]').count() === 0, "distance is one pill (no separate radius select)");
  const chips = page.locator('[role="group"][aria-label="Which of my areas"] button');
  ok((await chips.allInnerTexts()).join("|") === "Where I’m listed|Saved areas", "My areas chips: Where I'm listed / Saved areas");
  const empty = page.locator("[data-partner-empty]");
  ok(await empty.count() === 1, "unlisted My areas shows the friendly empty card");
  const emptyTxt = await empty.innerText().catch(() => "");
  note("empty card: " + emptyTxt.replace(/\n/g, " / "));
  ok(/Choose my areas/.test(emptyTxt) && /Invite a climbing friend/.test(emptyTxt), "it offers Choose my areas and Invite");
  const meanwhile = await page.locator("text=/^Meanwhile, climbers/i").count();
  note("meanwhile list shown: " + (meanwhile ? "yes" : "no (no other discoverable climbers?)"));
  await shot(page, "1-myareas-unlisted");
  await empty.locator("button", { hasText: /^Invite a climbing friend$/ }).click(); await page.waitForTimeout(600);
  ok(await empty.locator("text=/Copy link/i").count() > 0, "Invite opens the share buttons (Copy link)");
  await shot(page, "1b-invite");
  await empty.locator("button", { hasText: /^Hide invite$/ }).click(); await page.waitForTimeout(300);

  // 2. See everyone.
  const seeAll = empty.locator("button", { hasText: /^See everyone$/ });
  if (await seeAll.count()) { await seeAll.click(); await page.waitForTimeout(5000); ok(await by.inputValue() === "anyone", "See everyone switches to Everyone"); }
  else note("no See everyone button (no browse climbers) -- switching by the pill");
  if (await by.inputValue() !== "anyone") { await by.selectOption("anyone"); await page.waitForTimeout(5000); }
  await shot(page, "2-everyone");

  // 3. Distance -> Near me now, 10 mi, then the empty card's next radius.
  const dist = page.locator('select[aria-label="Distance"]');
  const distOpts = await dist.locator("option").allInnerTexts(); note("distance options: " + distOpts.join(" | "));
  const hereOpt = await dist.locator("option", { hasText: /Near me now/ }).getAttribute("value");
  await dist.selectOption(hereOpt); await page.waitForTimeout(4000);
  ok((await dist.inputValue()).startsWith("here:"), "Near me now located (Distance reads here:" + (await dist.inputValue()).split(":")[1] + ")");
  await dist.selectOption("here:10"); await page.waitForTimeout(6000);
  ok(await dist.inputValue() === "here:10", "Within 10 mi of you now");
  const title = await page.locator('[role="heading"][aria-level="2"]').first().innerText();
  ok(!/within/i.test(title), "the title no longer repeats the distance: " + title);
  const e2 = page.locator("[data-partner-empty]");
  if (await e2.count()) {
    const t2 = await e2.innerText(); note("10 mi empty card: " + t2.replace(/\n/g, " / "));
    ok(/Search anywhere/.test(t2) && /Within 25 mi/.test(t2), "empty at 10 mi offers Search anywhere and Within 25 mi");
    await e2.locator("button", { hasText: /^Within 25 mi$/ }).click(); await page.waitForTimeout(5000);
    ok(await dist.inputValue() === "here:25", "Within 25 mi widened the radius");
  } else note("someone is within 10 mi -- no empty card to test here");
  await shot(page, "3-near");
  await dist.selectOption("any"); await page.waitForTimeout(3000);

  // 4. More filters opens under the row; the info toggle opens.
  await page.locator("button", { hasText: /^More filters/ }).click(); await page.waitForTimeout(600);
  const panelY = await page.locator("text=AVAILABLE TO CLIMB").first().boundingBox().then((b) => b && b.y);
  const rowBox = await row.boundingBox();
  const exY = await page.locator("text=/^Example climbers ·/").first().boundingBox().then((b) => b && b.y).catch(() => null);
  ok(panelY && rowBox && panelY > rowBox.y && (exY == null || panelY < exY), "More filters panel opens right under the row (above the example list)");
  await shot(page, "4-more-filters");
  await page.locator("button", { hasText: /^More filters/ }).click(); await page.waitForTimeout(400);
  const sum = page.locator("summary", { hasText: "How matching and listing work" });
  await sum.scrollIntoViewIfNeeded(); await sum.click(); await page.waitForTimeout(400);
  const det = await sum.locator("xpath=..").innerText();
  ok(/Match %/.test(det) && /Listed areas\./.test(det) && /Who appears\./.test(det), "the info toggle opens with Match %, listed areas, who appears");

  // 5. Pick an area -> Utah: results first, then "Climb in Utah?"; list there.
  await page.evaluate(() => window.scrollTo(0, 0));
  await by.selectOption("area"); await page.waitForTimeout(1500);
  await page.locator('select[aria-label="Filter by state"]').selectOption("utah"); await page.waitForTimeout(7000);
  const box = page.locator('[role="region"][aria-label^="List yourself"]');
  ok(await box.count() === 1, "the list-me box shows for Utah");
  const boxTxt = await box.innerText().catch(() => ""); note("box: " + boxTxt.replace(/\n/g, " / "));
  ok(/Climb in Utah\?/.test(boxTxt) && /List me in Utah/.test(boxTxt), "it reads \"in Utah\", not \"at Utah\"");
  const yOf = (l) => l.first().boundingBox().then((b) => b && b.y).catch(() => null);
  const firstResultY = (await yOf(page.locator("[data-partner-empty]"))) ?? (await yOf(page.locator("text=/^Listed here or inside first/"))) ?? (await yOf(page.locator("text=/^No one is listed in Utah/")));
  const boxY = (await box.boundingBox()).y;
  ok(firstResultY != null && firstResultY < boxY, "the results (or the empty card) come before the box");
  await shot(page, "5-utah");
  await box.locator("button", { hasText: /^List me in Utah$/ }).click(); await page.waitForTimeout(4000);
  ok(/You’re listed in Utah/.test(await box.innerText()), "listed: the box reads You're listed in Utah ✓");

  // 6. Back to My areas, now listed.
  await page.evaluate(() => window.scrollTo(0, 0));
  await by.selectOption("myareas"); await page.waitForTimeout(7000);
  const you2 = await you.innerText(); note("You card now: " + you2.replace(/\n/g, " / "));
  ok(/Your listed areas:\s+Utah/.test(you2) && /Edit ›/.test(you2), "the You card names Utah (\"Your listed areas: Utah\") with Edit ›");
  const e3 = page.locator("[data-partner-empty]");
  if (await e3.count()) { const t3 = await e3.innerText(); note("listed, empty: " + t3.replace(/\n/g, " / ")); ok(/at your area/.test(t3) && /Pick an area/.test(t3), "listed but nobody else: the card names your area and offers Pick an area"); }
  else note("someone else is listed across Utah's reach -- results shown");
  await shot(page, "6-myareas-listed");
  await chips.filter({ hasText: "Saved areas" }).click(); await page.waitForTimeout(3000);
  ok(await by.inputValue() === "myareas", "Saved areas chip keeps the pill on My areas");
  ok(/No saved areas yet/.test(await page.locator("body").innerText()), "a fresh account's Saved areas says how to save one");
  await chips.filter({ hasText: "Where I’m listed" }).click(); await page.waitForTimeout(2000);

  // 7. Free this weekend switch (the fixture's own status) and Invite.
  const sw = you.locator('[role="switch"]');
  const before = await sw.getAttribute("aria-checked");
  await sw.click(); await page.waitForTimeout(3000);
  ok(await sw.getAttribute("aria-checked") !== before, "the I'm free this weekend switch flips (" + before + " -> " + (await sw.getAttribute("aria-checked")) + ")");
  await shot(page, "7-switch");

  // 8. Desktop.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1500);
  await shot(page, "8-desktop");
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(!over, "no horizontal overflow on desktop");
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) { ok(false, "threw: " + e.message.split("\n")[0]); }
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch(() => {}); server.kill(); }
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall ok");
process.exit(fails.length ? 1 : 0);
