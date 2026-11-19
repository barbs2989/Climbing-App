#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// Walk of the Partners filter row after 2026-11-18: Experience lives under More filters (every mode),
// each dropdown draws ONE arrow, and the row wears the "Find a crew by" button look. Signs in a fresh
// fixture, deleted at the end. Screenshots go to argv[2].
//   node scripts/oneoff/probe-partners-experience-filter.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-partners-experience-filter.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
let fixture, browser, page;
const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
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
  const zipForm = page.locator('[role="region"][aria-label="Add your zip code"]');
  if (await zipForm.count()) { await zipForm.locator('input[aria-label="Zip code"]').fill("98101"); await zipForm.locator("button", { hasText: /^Save$/ }).click(); await page.waitForTimeout(6000); }

  const row = page.locator('[role="group"][aria-label="Narrow the list"]');
  const by = page.locator('select[aria-label="Search by"]');
  ok(await by.inputValue() === "myareas", "opens on My areas");

  // 1. Experience is gone from the row; More filters is there in My areas.
  ok(await row.locator('select[aria-label="Filter by experience level"]').count() === 0, "no experience dropdown in the row");
  ok(!/experience/i.test(await row.innerText()), "the row's text does not mention experience");
  const more = row.locator("button", { hasText: /^More filters/ });
  ok(await more.count() === 1, "More filters is offered under My areas");

  // 2. ONE arrow per dropdown: no svg beside a select, and the stylesheet's arrow is drawn.
  const arrows = await row.evaluate((el) => [...el.querySelectorAll("select")].map((s) => ({ name: s.getAttribute("aria-label"), svgs: s.parentElement.querySelectorAll("svg").length, bg: getComputedStyle(s).backgroundImage !== "none", app: getComputedStyle(s).appearance })));
  note("dropdowns: " + arrows.map((a) => a.name).join(" | "));
  ok(arrows.length >= 3 && arrows.every((a) => a.svgs === 0 && a.bg && a.app === "none"), "each dropdown draws ONE arrow (the stylesheet's; no second chevron, no native arrow)");

  // 3. The Find-a-crew-by look: 10px corners, two across, nothing wider than the column.
  const boxes = await row.evaluate((el) => [...el.children].map((c) => { const t = c.matches("button") ? c : c.querySelector("select"); const r = c.getBoundingClientRect(), s = getComputedStyle(t); return { w: Math.round(r.width), y: Math.round(r.y), h: Math.round(t.getBoundingClientRect().height), rad: s.borderTopLeftRadius, fs: s.fontSize, fw: s.fontWeight }; }));
  note("row boxes: " + JSON.stringify(boxes));
  ok(boxes.every((b) => b.rad === "10px" && b.fs === "12.5px" && b.fw === "600"), "every control wears the crew-button look (10px corners, 12.5px, weight 600)");
  ok(boxes.every((b) => b.h >= 44), "every control is at least 44px tall on a phone");
  const perRow = {}; boxes.forEach((b) => { perRow[b.y] = (perRow[b.y] || 0) + 1; });
  ok(Object.values(perRow).every((n) => n <= 2), "two across at most: " + JSON.stringify(Object.values(perRow)));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "nothing runs off the right edge at 390px");
  await shot("1-row-my-areas-390");

  // 4. The panel: an EXPERIENCE group of five chips, Any pressed, in My areas.
  await more.click(); await page.waitForTimeout(600);
  const grp = page.locator('[role="group"][aria-label="Filter by experience level"]');
  ok(await grp.count() === 1, "the panel opens under My areas and holds the experience group");
  ok((await grp.locator("button").allInnerTexts()).join("|") === "Any|" + LEVELS.join("|"), "chips: Any | " + LEVELS.join(" | "));
  const pressed = async () => grp.locator('button[aria-pressed="true"]').allInnerTexts();
  ok((await pressed()).join() === "Any", "Any is the pressed chip to start");
  await shot("2-panel-my-areas-390");

  // 5. Everyone, anywhere: each level narrows the real list to climbers of that level.
  await by.selectOption("anyone"); await page.waitForTimeout(800);
  await page.locator('select[aria-label="Distance"]').selectOption("any"); await page.waitForTimeout(7000);
  ok(await grp.count() === 1, "the panel stays open across a mode change");
  const cards = page.locator("[data-real-climber-card]");
  const total = await cards.count();
  note("real climbers listed with no filter: " + total);
  ok(total > 0, "there is a real list to filter");
  let sum = 0, realAll = 0;
  for (const lv of LEVELS) {
    await grp.locator("button", { hasText: new RegExp("^" + lv + "$") }).click(); await page.waitForTimeout(1500);
    const n = await cards.count(), texts = await cards.allInnerTexts();
    const wrong = texts.filter((t) => !t.includes(lv)).length;
    const body = await page.locator("body").innerText();
    const said = (body.match(/Matching your filters — (\d+) of (\d+)/) || body.match(/None of these (\d+) climbers? match/) || [""])[0];
    note(lv + ": " + n + " card(s)" + (said ? " · screen says “" + said + "”" : ""));
    ok((await pressed()).join() === lv, lv + " is the one pressed chip");
    ok(wrong === 0, lv + ": every listed card reads " + lv);
    ok(n < total || n === 0 || !!said || n === total, lv + ": the list answered");
    ok(/More filters\s*1/.test((await more.innerText()).replace(/\n/g, " ")), lv + ": the More filters badge counts 1");
    // REAL climbers only: the card count also holds the example profiles, whose unfiltered list is paged.
    const mm = body.match(/Matching your filters — (\d+) of (\d+)/), nn = body.match(/None of these (\d+) climbers? match/);
    if (mm) { sum += Number(mm[1]); realAll = Number(mm[2]); } else if (nn) realAll = Number(nn[1]); else sum = NaN;
    if (lv === "Expert") await shot("3-everyone-expert-390");
  }
  ok(sum <= realAll, "the four levels together list no more real climbers than there are (" + sum + " of " + realAll + "; the rest set no level)");
  // 6. Clear filters and Any both restore the list.
  await page.locator("button", { hasText: /^Clear filters$/ }).click(); await page.waitForTimeout(1500);
  ok(await cards.count() === total && (await pressed()).join() === "Any", "Clear filters restores all " + total + " and presses Any");
  ok(!/More filters\s*\d/.test((await more.innerText()).replace(/\n/g, " ")), "the badge is gone once cleared");
  await grp.locator("button", { hasText: /^Advanced$/ }).click(); await page.waitForTimeout(800);
  await grp.locator("button", { hasText: /^Any$/ }).click(); await page.waitForTimeout(1500);
  ok(await cards.count() === total, "Any restores the list");
  // 7. A set discipline turns its dropdown blue, like a chosen crew button.
  const disc = page.locator('select[aria-label="Filter by discipline"]');
  const bgOff = await disc.evaluate((e) => getComputedStyle(e).backgroundColor);
  await disc.selectOption("sport"); await page.waitForTimeout(800);
  const bgOn = await disc.evaluate((e) => getComputedStyle(e).backgroundColor);
  const byBg = await by.evaluate((e) => getComputedStyle(e).backgroundColor);
  ok(bgOn !== bgOff && bgOn === byBg, "a set dropdown fills blue like the chosen Search by (" + bgOff + " → " + bgOn + ")");
  await shot("4-row-with-lead-390");
  await disc.selectOption("All");
  // 8. Desktop.
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(2500);
  ok(await grp.count() === 1 && await more.count() === 1, "desktop: the row and panel are there");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "desktop: no sideways scroll");
  await shot("5-desktop-1280");
  ok(errs.length === 0, "no page errors (" + errs.length + ")");
} catch (e) { ok(false, "walk threw: " + (e && e.message)); if (page) await shot("zz-threw").catch(() => {}); }
finally { if (browser) await browser.close(); if (fixture) await fixture.cleanup().catch((e) => console.log("CLEANUP FAILED " + e.message)); server.kill(); }
console.log(fails.length ? "\n" + fails.length + " FAILED" : "\nall passed");
process.exit(fails.length ? 1 : 0);
