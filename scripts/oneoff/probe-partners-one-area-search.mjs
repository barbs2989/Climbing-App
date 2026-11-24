#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// Walk for "Find partners asks what Join a crew asks" (owner 2026-11-24): signs in a FRESH fixture account at 390px and checks
//  - Search by offers exactly My climbs & areas / By Route / By Peak / By Area / Everyone, opening on My climbs & areas;
//  - the Where I'm listed / Saved areas buttons are gone;
//  - the You card's button and Join a crew's both read My areas;
//  - By Area goes past Region: Washington › a region › "Inside <place>" › … to the deepest level, and the list-me box reads "at" a crag;
//  - Join a crew › By Area drills the same way;
//  - no horizontal overflow, no page errors.
// The fixture is deleted at the end. Screenshots go to argv[2].
//   node scripts/oneoff/probe-partners-one-area-search.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-partners-one-area-search.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
let fixture, browser, page;
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png"), fullPage: true });

// Drill an AreaRegionSelect from its region select down: pick `first` there (or the first region), then the first place in each
// "Inside <place>" select, until none appears. Returns the names picked.
async function drill(scope, first) {
  const picked = [];
  const reg = scope.locator('select[aria-label="Filter by area"]');
  await reg.waitFor({ timeout: 20000 });
  for (let i = 0; i < 20 && (await reg.locator("option").count()) < 2; i++) await page.waitForTimeout(1000);
  const opts = await reg.locator("option").allInnerTexts();
  const want = opts.find((o) => first.test(o)) || opts[1];
  await reg.selectOption({ label: want }); picked.push(want); await page.waitForTimeout(3000);
  for (let depth = 0; depth < 6; depth++) {
    const inside = scope.locator('select[aria-label^="Filter by area inside "]');
    const n = await inside.count();
    if (n <= depth) break;
    const sel = inside.nth(depth);
    const o = (await sel.locator("option").allInnerTexts()).slice(1);
    if (!o.length) break;
    await sel.selectOption({ label: o[0] }); picked.push(o[0]); await page.waitForTimeout(3000);
  }
  return picked;
}

try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(() => {});
  const un = "walk" + Date.now().toString(36);
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${fixture.session.user.id}`, { method: "PATCH", headers: { apikey: anonKey(), Authorization: `Bearer ${fixture.session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ username: un }) });
  ok(pr.ok, "the fixture finished setup (HTTP " + pr.status + ")");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);

  await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click(); await page.waitForTimeout(6000);
  const by = page.locator('select[aria-label="Search by"]');
  ok(await by.count() === 1, "Partners is open (Search by present)");
  const modes = await by.locator("option").allInnerTexts();
  ok(modes.join("|") === "My climbs & areas|By Route|By Peak|By Area|Everyone", "the crew finder's five choices: " + modes.join(" | "));
  ok(await by.inputValue() === "mine", "opens on My climbs & areas");
  ok(await page.locator('[role="group"][aria-label="Which of my areas"]').count() === 0, "no Where I'm listed / Saved areas buttons");
  const body0 = await page.locator("body").innerText();
  ok(!/Where I’m listed/.test(body0), "the words Where I'm listed appear nowhere");
  const you = page.locator('section[aria-label="How climbers find you"]');
  const youTxt = await you.innerText().catch(() => ""); note("You card: " + youTxt.replace(/\n/g, " / "));
  ok(await you.locator("button", { hasText: /^My areas$/ }).count() === 1, "the You card's button reads My areas");
  const youBtnH = await you.locator("button", { hasText: /^My areas$/ }).evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
  ok(youBtnH >= 44, "...and is 44px tall like the crew pane's (" + youBtnH + ")");
  const empty = page.locator("[data-partner-empty]");
  if (await empty.count()) note("My climbs & areas, nothing yet: " + (await empty.innerText()).replace(/\n/g, " / "));
  await shot("1-mine");

  // By Area, all the way down.
  await by.selectOption("area"); await page.waitForTimeout(1500);
  await page.locator('select[aria-label="Filter by state"]').selectOption("washington"); await page.waitForTimeout(6000);
  const pick = page.locator("[data-cm-area-pick]");
  const names = await drill(pick, /Leavenworth|Index|Central Cascades|Icicle/);
  note("picked: " + names.join(" › "));
  ok(names.length >= 3, "went past Region at least two levels (" + names.length + " levels)");
  const title = await page.locator('[role="heading"][aria-level="2"]').first().innerText();
  ok(title.includes(names[names.length - 1]), "the results are for the deepest pick: " + title);
  const box = page.locator('[role="region"][aria-label^="List yourself"]');
  const boxTxt = await box.innerText().catch(() => ""); note("list-me box: " + boxTxt.replace(/\n/g, " / "));
  ok(/ at /.test(boxTxt.split("\n").slice(0, 2).join(" ")), "the list-me box says \"at\" a crag or wall");
  await shot("2-by-area-deep");
  // Changing the state clears the deeper selects.
  await page.locator('select[aria-label="Filter by state"]').selectOption("oregon"); await page.waitForTimeout(4000);
  ok(await pick.locator('select[aria-label^="Filter by area inside "]').count() === 0, "a new state clears the deeper selects");

  // Join a crew › By Area.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("button", { hasText: /^Join a crew$/ }).first().click(); await page.waitForTimeout(4000);
  const crewEdit = page.locator("button", { hasText: /^My areas$/ });
  ok(await crewEdit.count() >= 1, "Join a crew's row button reads My areas");
  await page.locator("button", { hasText: /^By Area$/ }).first().click(); await page.waitForTimeout(1500);
  await page.locator('select[aria-label="Filter by state"]').selectOption("washington"); await page.waitForTimeout(6000);
  const cnames = await drill(page.locator("body"), /Leavenworth|Index|Central Cascades|Icicle/);
  note("crew picked: " + cnames.join(" › "));
  ok(cnames.length >= 3, "Join a crew › By Area goes past Region too (" + cnames.length + " levels)");
  await shot("3-crew-by-area-deep");

  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) {
  ok(false, "threw: " + e.message.split("\n")[0]);
  if (page) { await shot("0-stuck").catch(() => {}); note("stuck on: " + (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400)); }
}
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch(() => {}); server.kill(); }
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall ok");
process.exit(fails.length ? 1 : 0);
