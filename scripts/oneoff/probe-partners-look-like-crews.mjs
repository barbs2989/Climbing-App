#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// Walk for "make Find partners look like Join a crew" (owner note 2026-11-25): signs in a FRESH fixture account at 390px and checks
//  - Find partners opens with the heading FIND PARTNERS BY and a group of five buttons in Join a crew's order, My climbs & areas current;
//  - the Search by dropdown is gone; the filter button reads Filters, as Join a crew's does;
//  - each button switches the search (By Area shows the place picker, By Route the route search, By Peak the peak search);
//  - Join a crew shows its own FIND A CREW BY buttons with the same box sizes;
//  - no horizontal overflow, no page errors.
// The fixture is deleted at the end. Screenshots go to argv[2].
//   node scripts/oneoff/probe-partners-look-like-crews.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-partners-look-like-crews.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
let fixture, browser, page;
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png"), fullPage: true });
const boxes = (label) => page.locator(`[role="group"][aria-label="${label}"] button`).evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), cur: b.getAttribute("aria-current") }; }));

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
  ok(await page.locator('select[aria-label="Search by"]').count() === 0, "the Search by dropdown is gone");
  const pb = await boxes("Find partners by");
  console.log("     partner buttons: " + JSON.stringify(pb));
  ok(pb.map((b) => b.t).join("|") === "My climbs & areas|By Route|By Peak|By Area|Everyone", "five buttons in Join a crew's order");
  ok(pb[0] && pb[0].cur === "true", "My climbs & areas is current");
  ok(/find partners by/i.test(await page.locator("body").innerText()), "the FIND PARTNERS BY heading is there");
  ok(await page.locator("button", { hasText: /^Filters$/ }).count() >= 1, "the filter button reads Filters");
  await shot("1-partners-mine");
  const btn = (t) => page.locator('[role="group"][aria-label="Find partners by"] button', { hasText: new RegExp("^" + t + "$") });
  await btn("By Area").click(); await page.waitForTimeout(2500);
  ok(await page.locator("[data-cm-area-pick]").count() === 1, "By Area shows the place picker");
  ok((await btn("By Area").getAttribute("aria-current")) === "true", "...and By Area is current");
  await shot("2-partners-area");
  await btn("By Route").click(); await page.waitForTimeout(2000);
  ok(await page.locator('input[aria-label="Search routes by name"]').count() === 1, "By Route shows the route search");
  await btn("By Peak").click(); await page.waitForTimeout(2000);
  ok(/search for a peak/i.test(await page.locator("body").innerText()), "By Peak shows the peak search");
  await btn("Everyone").click(); await page.waitForTimeout(3000);
  ok(/Every climber on ClimbMatch/.test(await page.locator("body").innerText()), "Everyone says what it finds");
  await shot("3-partners-everyone");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("button", { hasText: /^Join a crew$/ }).first().click(); await page.waitForTimeout(4000);
  const cb = await page.locator("button[aria-current]").evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height) }; }));
  console.log("     crew current button: " + JSON.stringify(cb));
  const mine = cb.find((b) => b.t === "My climbs & areas");
  ok(mine && pb[0] && Math.abs(mine.w - pb[0].w) <= 1 && Math.abs(mine.h - pb[0].h) <= 1, "Join a crew's My climbs & areas button is the same size as Find partners'");
  await shot("4-crew-mine");

  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "no horizontal overflow at 390px");
  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) { ok(false, "walk threw: " + (e && e.stack || e)); }
finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (fixture) await fixture.cleanup(); } catch (e) { console.log("fixture cleanup failed: " + e.message); }
  server.kill();
}
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall ok");
process.exit(fails.length ? 1 : 0);
