#!/usr/bin/env node
// Probe for the Menu's "Listed areas" tile and the My listed areas screen: signs in a fresh fixture
// account, opens the tile from the Menu, searches the state box, lists the climber at an area
// through the screen, and confirms the listing card. Screenshots go to argv[2].
//   node scripts/oneoff/probe-listed-areas-menu.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { tapMenuItem } from "../lib/menu-screens.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-listed-areas-menu.mjs");

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
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR " + e.message.slice(0, 300)); }); page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE " + m.text().slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);
  ok(await tapMenuItem(page, "Listed areas", 2500), "Menu has a Listed areas tile and it opens");
  const dlg = page.locator('[role="dialog"][aria-label="My listed areas"]');
  ok(await dlg.waitFor({ timeout: 15000 }).then(() => true, () => false), "the My listed areas screen is open");
  await page.screenshot({ path: path.join(OUT, "1-empty.png") });
  const sel = dlg.locator('select[aria-label="State to search"]');
  if (!(await sel.inputValue())) await sel.selectOption({ label: "Washington" });
  await dlg.locator('input[aria-label="Search for an area to add"]').fill("index");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, "2-search.png") });
  const hit = dlg.locator("button", { hasText: "+ Add" }).first();
  ok(await hit.count() === 1, "search lists an addable area");
  await hit.click(); await page.waitForTimeout(800);
  await dlg.locator("button", { hasText: /^Sport$/ }).click();
  await dlg.locator("button", { hasText: /^Next weekend/ }).click();
  await page.screenshot({ path: path.join(OUT, "3-editor.png") });
  await dlg.locator("button", { hasText: /^List me at / }).click(); await page.waitForTimeout(3000);
  const txt = await dlg.innerText();
  ok(/Listed at 1 area/i.test(txt), "the listing card shows (Listed at 1 area)");
  ok(/Sport · Free /.test(txt), "the card reads the crag type and the window");
  await page.screenshot({ path: path.join(OUT, "4-listed.png") });
  await dlg.locator('button[aria-label="Close"]').click(); await page.waitForTimeout(600);
  ok(await tapMenuItem(page, "Listed areas", 1500), "the tile opens again with a count (\"Listed areas · 1\")");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) { ok(false, "threw: " + e.message.split("\n")[0]); }
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch(() => {}); server.kill(); }
process.exit(fails.length ? 1 : 0);
