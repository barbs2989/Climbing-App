#!/usr/bin/env node
// Probe for the Menu's "Your groups" section: signs in the fixture owner (who owns "Fixture Alpine
// Club"), opens the Menu, checks the group is listed by name, taps it and confirms that group opens.
// Screenshots go to argv[2].
//   node scripts/oneoff/probe-menu-your-groups.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-menu-your-groups.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
let fixture, browser;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(() => {});
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);
  await page.locator('[role="banner"] button[aria-label^="Menu"]').first().click(); await page.waitForTimeout(800);
  const menu = page.locator('[role="dialog"][aria-label="Menu"]');
  const txt = await menu.innerText();
  ok(/Your groups · \d+/i.test(txt), "the Menu has a Your groups section with a count");
  const row = menu.locator('button[aria-label^="Fixture Alpine Club"]');
  ok(await row.count() === 1, "the owner's group is listed by name");
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: path.join(OUT, "1-menu.png") });
  await row.click(); await page.waitForTimeout(2500);
  ok(await menu.count() === 0, "the Menu closes");
  const body = await page.locator("body").innerText();
  ok(/Fixture Alpine Club/.test(body), "the group opens");
  await page.screenshot({ path: path.join(OUT, "2-group.png") });
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) { ok(false, "threw: " + e.message.split("\n")[0]); }
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch(() => {}); server.kill(); }
process.exit(fails.length ? 1 : 0);
