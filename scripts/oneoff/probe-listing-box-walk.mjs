#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// THE SHORT LISTING BOX AND THE AREA FINDER (owner, 2026-11-18). One fresh fixture climber (deleted at the end), 390px:
//   1. Partners: the You card is one short row (sentence + My areas), not a heading, a paragraph and a chip per area.
//   2. My areas opens Listed areas: the search box is a 48px+ box with a clear button; the finder walks
//      country > state > region and lists the climber at a place it reached.
//   3. The listing opens from the list: Save changes and Remove this listing are well apart; Remove removes it.
//   4. One desktop shot (1280px). No sideways scroll anywhere.
// Screenshots go to argv[2].   node scripts/oneoff/probe-listing-box-walk.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-listing-box-walk.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fixture, browser, me, sess;
async function open(w, h, name) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { fails.push("page error (" + name + "): " + e.message.slice(0, 200)); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(sess)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);
  await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click(); await page.waitForTimeout(6000);
  return page;
}
const shot = (page, n) => page.screenshot({ path: path.join(OUT, n + ".png") });
const noSideScroll = async (page, where) => ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll: " + where);
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(1000); }
  fixture = await createFixture(() => {});
  me = fixture.owner; sess = fixture.session;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${me.id}`, { method: "PATCH", headers: { apikey: anonKey(), Authorization: "Bearer " + sess.access_token, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ username: "walk" + me.id.replace(/-/g, "").slice(0, 10), avatar: "https://barbs2989.github.io/Climbing-App/icon-192.png" }) });
  if (!r.ok) throw new Error("username patch failed " + r.status);
  browser = await chromium.launch({ channel: "chrome", headless: true });

  // 1. The short box.
  const p = await open(390, 844, "phone");
  const box = p.locator('section[aria-label="How climbers find you"]');
  ok(await box.count() === 1, "the You card is on the Partners tab");
  const t0 = (await box.innerText()).replace(/\n/g, " / "); note("box (unlisted): " + t0);
  ok(/Looking for partners\? List the crags and peaks you climb\./.test(t0), "unlisted: the Join a crew sentence, no count");
  ok(!/Your listing|Tap one to change|\+ Add an area/.test(t0), "no eyebrow, paragraph or + Add an area left");
  const b0 = await box.boundingBox(); note("box size: " + Math.round(b0.width) + "x" + Math.round(b0.height));
  ok(b0.height <= 150, "the box is short (<=150px tall)");
  await shot(p, "1-box-unlisted");

  // 2. My areas: search box and finder.
  await box.locator("button", { hasText: /^My areas$/ }).click(); await p.waitForTimeout(2500);
  const dlg = p.locator('[role="dialog"][aria-label="My listed areas"]');
  ok(await dlg.count() === 1, "My areas opens the Listed areas screen");
  const inp = dlg.locator('input[aria-label="Search for an area to add"]');
  const ib = await inp.boundingBox(); note("search box: " + Math.round(ib.width) + "x" + Math.round(ib.height));
  ok(ib.height >= 48, "the search box is at least 48px tall");
  ok(await dlg.locator('button[aria-label="Clear search"]').count() === 0, "empty box: no clear button");
  await shot(p, "2-listed-areas-empty");
  await inp.fill("smith"); await p.waitForTimeout(6000);
  ok((await dlg.locator("button:has-text('+ Add')").count()) > 0, '"smith" lists areas to add');
  ok(await dlg.locator("text=Browse areas").count() === 0, "typing hides the finder (results take its place)");
  await shot(p, "3-search-smith");
  await dlg.locator('button[aria-label="Clear search"]').click(); await p.waitForTimeout(800);
  ok(await inp.inputValue() === "", "the clear button empties the box");
  ok(await dlg.locator("text=Browse areas").count() === 1, "the finder is back once the box is empty");
  const rows = async () => (await dlg.locator('button[aria-label^="Open "]').allInnerTexts()).map((t) => t.replace(/\n/g, " · "));
  const top = await rows(); note("top level: " + top.join("  |  "));
  ok(top.some((t) => /United States/.test(t)), "top level names United States");
  ok(await dlg.locator('button[aria-label^="List me at United States"]').count() === 0, "a country cannot be listed");
  await dlg.locator('button[aria-label="Open United States"]').click(); await p.waitForTimeout(4000);
  const states = await rows(); note(states.length + " states, first: " + states.slice(0, 3).join("  |  "));
  ok(states.length >= 40, "United States opens its states");
  ok(await dlg.locator('button[aria-label="List me at Washington"]').count() === 1, "a state can be listed from its row");
  await dlg.locator('button[aria-label="Open Washington"]').click(); await p.waitForTimeout(4000);
  const regions = await rows(); note(regions.length + " in Washington, first: " + regions.slice(0, 3).join("  |  "));
  ok(regions.length > 0, "Washington opens its regions");
  ok(await dlg.locator("button", { hasText: /^List me at Washington$/ }).count() === 1, "the opened area has its own List me button");
  await shot(p, "4-finder-washington");
  await noSideScroll(p, "finder");
  await dlg.locator('button[aria-label^="Open "]').first().click(); await p.waitForTimeout(4000);
  const crumbs = (await dlg.locator('[role="group"][aria-label="Where you are in the areas"]').innerText()).replace(/\n/g, " ");
  note("crumbs: " + crumbs); ok(/All areas.*United States.*Washington/.test(crumbs), "the trail names every level");
  const deep = await rows(); note(deep.length + " inside, first: " + deep.slice(0, 3).join("  |  "));
  await shot(p, "5-finder-region");
  await dlg.locator('[role="group"][aria-label="Where you are in the areas"] button', { hasText: /^Washington$/ }).click(); await p.waitForTimeout(1500);
  ok((await rows()).length === regions.length, "tapping Washington in the trail goes back up to it");
  const firstList = dlg.locator('button[aria-label^="List me at "]').nth(1); // 0 is Washington itself
  const lname = (await firstList.getAttribute("aria-label")).replace("List me at ", "");
  await firstList.click(); await p.waitForTimeout(1200);
  ok(/List me here/.test(await dlg.innerText()) && (await dlg.innerText()).includes(lname), "+ List opens the listing form for " + lname);
  await shot(p, "6-list-form");
  await dlg.locator("button", { hasText: /^List me at / }).click(); await p.waitForTimeout(4000);
  ok(/Listed at 1 area/i.test(await dlg.innerText()), "listed at 1 area");
  await shot(p, "7-listed-one");
  const ly = await dlg.locator("text=/Listed at 1 area/i").boundingBox(), by = await dlg.locator("text=Browse areas").boundingBox();
  ok(ly && by && ly.y < by.y, "your listings sit above the area finder");
  // The finder keeps its place, marks the row, and that row edits the listing.
  const crumbs2 = await dlg.locator('[role="group"][aria-label="Where you are in the areas"]').innerText().catch(() => "");
  ok(/Washington/.test(crumbs2), "after listing, the finder is still in Washington (" + crumbs2.replace(/\n/g, " ") + ")");
  const mark = dlg.locator(`button[aria-label="Edit your listing at ${lname}"]`);
  ok(await mark.count() === 1 && /Listed ✓/.test(await mark.innerText().catch(() => "")), "the finder row reads Listed ✓ for " + lname);
  if (await mark.count()) { await mark.click(); await p.waitForTimeout(1000); ok(/Edit listing/.test(await dlg.innerText()), "Listed ✓ opens Edit listing"); await dlg.locator("button", { hasText: /Back/ }).click(); await p.waitForTimeout(800); }
  // Opening the LAST state in the list brings the finder's heading back on screen.
  await dlg.locator('[role="group"][aria-label="Where you are in the areas"] button', { hasText: /^United States$/ }).click(); await p.waitForTimeout(2500);
  ok(/\d,\d{3} climbs/.test((await rows()).join(" ")), "climb counts carry thousands separators");
  const last = dlg.locator('button[aria-label^="Open "]').last(); await last.scrollIntoViewIfNeeded(); const lastName = (await last.getAttribute("aria-label")).replace("Open ", "");
  await last.click(); await p.waitForTimeout(4000);
  const hy = await dlg.locator("text=Browse areas").boundingBox(); note("after opening " + lastName + ", Browse areas heading at y=" + (hy ? Math.round(hy.y) : "?"));
  ok(hy && hy.y >= 50 && hy.y < 400, "opening the last state scrolls the finder back into view");
  await shot(p, "7b-last-state");

  // 3. Edit: Save and Remove apart.
  await dlg.locator(`button[aria-label="Edit ${lname}"]`).click(); await p.waitForTimeout(1200);
  const sv = await dlg.locator("button", { hasText: /^Save changes$/ }).boundingBox(), rm = await dlg.locator("button", { hasText: /^Remove this listing$/ }).boundingBox();
  const gap = Math.round(rm.y - (sv.y + sv.height)); note("Save -> Remove gap: " + gap + "px");
  ok(gap >= 40, "Save changes and Remove this listing are at least 40px apart");
  await dlg.locator("button", { hasText: /^Remove this listing$/ }).scrollIntoViewIfNeeded(); await shot(p, "8-edit-save-remove");
  await dlg.locator("button", { hasText: /Back/ }).click(); await p.waitForTimeout(800);
  await dlg.locator('button[aria-label="Close"]').click(); await p.waitForTimeout(3000);
  const t1 = (await box.innerText()).replace(/\n/g, " / "); note("box (listed): " + t1);
  ok(/you’re listed at 1 place\./.test(t1), "the box counts the listing: 1 place");
  const b1 = await box.boundingBox(); ok(b1.height <= 150, "still short when listed (" + Math.round(b1.height) + "px)");
  await shot(p, "9-box-listed");
  await noSideScroll(p, "Partners");
  await box.locator("button", { hasText: /^My areas$/ }).click(); await p.waitForTimeout(2000);
  await dlg.locator(`button[aria-label="Edit ${lname}"]`).click(); await p.waitForTimeout(1000);
  await dlg.locator("button", { hasText: /^Remove this listing$/ }).click(); await p.waitForTimeout(4000);
  ok(/Your listings/i.test(await dlg.innerText()) && !/Listed at 1 area/i.test(await dlg.innerText()), "Remove this listing removes it"); // the heading is drawn in capitals
  await dlg.locator('button[aria-label="Close"]').click(); await p.waitForTimeout(2500);
  ok(/climb\.$/.test((await box.innerText()).split("\n")[0].trim()), "the box drops the count again");

  // 3b. Six listings fold to four behind "Show all 6".
  await box.locator("button", { hasText: /^My areas$/ }).click(); await p.waitForTimeout(2500);
  await dlg.locator('button[aria-label="Open United States"]').click(); await p.waitForTimeout(3500);
  await dlg.locator('button[aria-label="Open Washington"]').click(); await p.waitForTimeout(3500);
  for (let i = 0; i < 6; i++) { await dlg.locator('button[aria-label^="List me at "]').nth(1).click(); await p.waitForTimeout(900); await dlg.locator("button", { hasText: /^List me at / }).click(); await p.waitForTimeout(3500); }
  ok(/Listed at 6 areas/i.test(await dlg.innerText()), "listed at 6 areas");
  const editRows = () => dlg.locator('button[aria-label^="Edit "]:not([aria-label^="Edit your listing at"])').count();
  ok(await editRows() === 4, "six listings show the first four (" + await editRows() + ")");
  const fold = dlg.locator("button[aria-expanded]", { hasText: /^Show all 6/ });
  ok(await fold.count() === 1 && (await fold.boundingBox()).height >= 44, "a 44px Show all 6 row");
  const fy = await dlg.locator("text=Browse areas").boundingBox(); note("folded: Browse areas heading at y=" + Math.round(fy.y));
  await dlg.evaluate((el) => { el.scrollTop = 0; }); await shot(p, "9b-folded");
  await fold.click(); await p.waitForTimeout(500);
  ok(await editRows() === 6, "Show all 6 shows all six");
  ok(await dlg.locator('button[aria-expanded="true"]', { hasText: /^Show fewer$/ }).count() === 1, "the row now reads Show fewer and says it is open");
  await dlg.locator('button[aria-label="Close"]').click(); await p.waitForTimeout(2500);
  ok(/listed at 6 places\./.test(await box.innerText()), "the box counts 6 places");

  // 4. Desktop.
  const d = await open(1280, 900, "desktop");
  await shot(d, "10-desktop");
  await d.locator('section[aria-label="How climbers find you"] button', { hasText: /^My areas$/ }).click(); await d.waitForTimeout(2500);
  await shot(d, "11-desktop-listed-areas");
  await noSideScroll(d, "desktop");
} catch (e) { fails.push("crashed: " + (e && e.message)); console.log(e); }
finally {
  if (me && sess) await fetch(`${SUPABASE_URL}/rest/v1/partner_areas?user_id=eq.${me.id}`, { method: "DELETE", headers: { apikey: anonKey(), Authorization: "Bearer " + sess.access_token } }).catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); if (left.length) console.log("LEFT BEHIND: " + left.join(", ")); }
  server.kill();
  console.log(fails.length ? `\n${fails.length} FAILED:\n - ` + fails.join("\n - ") : "\nall ok");
  process.exit(fails.length ? 1 : 0);
}
