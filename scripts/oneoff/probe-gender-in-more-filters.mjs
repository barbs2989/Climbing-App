#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// "Only men / women / non-binary climbers" sits in the More filters panel (owner, 2026-11-18). Signs in a
// fresh fixture account that states a gender, opens Partners at 390px, and checks: no gender pill in the
// row, More filters offered on My areas, the switch first in the panel, the badge counts it, and the panel
// on an example-list mode holds the switch AND the other filters. The fixture is deleted at the end.
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
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
let fixture, browser, page;
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(() => {});
  const un = "walk" + Date.now().toString(36);
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${fixture.session.user.id}`, { method: "PATCH", headers: { apikey: anonKey(), Authorization: `Bearer ${fixture.session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ username: un, gender: "man" }) });
  ok(pr.ok, "the fixture finished setup and states a gender (HTTP " + pr.status + ")");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);
  await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click(); await page.waitForTimeout(6000);
  const zipForm = page.locator('[role="region"][aria-label="Add your zip code"]');
  if (await zipForm.count()) { await zipForm.locator('input[aria-label="Zip code"]').fill("84117"); await zipForm.locator("button", { hasText: /^Save$/ }).click(); await page.waitForTimeout(6000); }
  const by = page.locator('select[aria-label="Search by"]');
  ok(await by.count() === 1, "Partners tab is open (Search by pill present)");
  note("mode: " + (await by.inputValue()) + " of " + (await by.locator("option").evaluateAll((os) => os.map((o) => o.value).join(","))));
  const row = page.locator('[role="group"][aria-label="Narrow the list"]');
  const sw = page.locator('[role="switch"][aria-label="Only men"]');
  const more = row.locator("button", { hasText: /^More filters/ });

  // My areas: the mode that had NO More filters button before.
  await by.selectOption("myareas"); await page.waitForTimeout(2500);
  ok(await sw.count() === 0, "no gender pill in the row while the panel is closed");
  ok(await more.count() === 1, "More filters is offered on My areas");
  await more.click(); await page.waitForTimeout(600);
  ok(await sw.count() === 1 && await sw.getAttribute("aria-checked") === "false", "the panel holds the Only men switch, off");
  ok(await row.locator('[role="switch"][aria-label="Only men"]').count() === 0, "the switch is in the panel, not the pill row");
  ok(await page.locator("text=AVAILABLE TO CLIMB").count() === 0, "My areas' panel shows the switch alone");
  await shot("1-myareas-panel");
  await sw.click(); await page.waitForTimeout(2500);
  ok(await sw.getAttribute("aria-checked") === "true", "tapping it turns it on");
  ok(/More filters\s*1/.test((await more.innerText()).replace(/\s+/g, " ")), "the More filters badge counts it (" + (await more.innerText()).replace(/\s+/g, " ") + ")");
  await shot("2-myareas-on");

  // An example-list mode: the switch first, the other filters under it.
  const exMode = (await by.locator("option").evaluateAll((os) => os.map((o) => o.value))).find((v) => !["myareas", "saved", "peak"].includes(v));
  await by.selectOption(exMode); await page.waitForTimeout(3000);
  if (!(await sw.count())) { await more.click(); await page.waitForTimeout(600); }
  const sy = await sw.boundingBox().then((b) => b && b.y), ay = await page.locator("text=AVAILABLE TO CLIMB").first().boundingBox().then((b) => b && b.y).catch(() => null);
  ok(sy && ay && sy < ay, "on '" + exMode + "' the panel shows the switch above the other filters");
  ok(await sw.getAttribute("aria-checked") === "true", "the switch is still on after changing mode");
  await shot("3-example-mode-panel");
  await sw.click(); await page.waitForTimeout(800);
  ok(await sw.getAttribute("aria-checked") === "false", "tapping it again turns it off");
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) {
  ok(false, "threw: " + e.message.split("\n")[0]);
  if (page) { await shot("0-stuck").catch(() => {}); note("stuck on: " + (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400)); }
}
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch((e) => console.log("CLEANUP FAILED " + e.message)); server.kill(); }
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall ok");
process.exit(fails.length ? 1 : 0);
