#!/usr/bin/env node
import { NPX, NPX_PRE } from "../lib/npx.mjs";
// TWO CLIMBERS FIND EACH OTHER THROUGH "MY AREAS" (owner, 2026-11-14). Signs in the two fresh fixture climbers
// (deleted at the end) at 390px, the way a climber would:
//   1. Robin opens Partners, sees the short listing box, taps "My areas", types "smith" and lists at Smith Rock
//      (Sport, this weekend). The box now counts 1 place.
//   2. The other climber opens Partners, tries the search the way people type (a nickname, one letter, nonsense,
//      a half name), lists at Smith Rock too, and finds Robin under My areas; opens Robin's profile.
//   3. Opens the Smith Rock listing from My areas, then By area: searches "red river" with no state picked.
//   4. One desktop shot (1280px). No sideways scroll anywhere.
// Screenshots go to argv[2].   node scripts/oneoff/probe-partners-my-areas-walk.mjs <shot-dir>
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-partners-my-areas-walk.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || ".";
const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
const fails = [], ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails.push(m); };
const note = (m) => console.log("     " + m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fixture, browser;
const sessions = [];
async function signIn(u) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const b = await r.json(); if (!r.ok || !b.access_token) throw new Error("sign in failed " + r.status); return b;
}
async function open(sess, w, h, name) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { fails.push("page error (" + name + "): " + e.message.slice(0, 200)); console.log("PAGEERROR " + e.message.slice(0, 300)); });
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(sess)) });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(12000);
  try { await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click({ timeout: 15000 }); }
  catch (e) { await page.screenshot({ path: path.join(OUT, "stuck-" + name + ".png") }); console.log("STUCK (" + name + "): " + (await page.locator("body").innerText()).slice(0, 400).replace(/\n/g, " / ")); throw e; }
  await page.waitForTimeout(6000);
  return page;
}
const shot = (page, n) => page.screenshot({ path: path.join(OUT, n + ".png") });
const noSideScroll = async (page, where) => ok(await page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll: " + where);
async function searchIn(dlg, page, q, ms = 6000) { await dlg.locator('input[aria-label="Search for an area to add"]').fill(q); await page.waitForTimeout(ms); }
async function hitRows(dlg) { return (await dlg.locator("button:has-text('+ Add'), button:has-text('Listed ✓'), button:has-text('matched by route')").allInnerTexts()).map((t) => t.replace(/\n/g, " · ")); }
async function listAt(page, q, want, extra) {
  await page.locator('section[aria-label="How climbers find you"] button', { hasText: /^My areas$/ }).click(); await page.waitForTimeout(1500);
  const dlg = page.locator('[role="dialog"][aria-label="My listed areas"]');
  ok(await dlg.count() === 1, "My areas opens the My listed areas screen");
  ok(await dlg.locator("select").count() === 0, "no state dropdown to fill in first");
  if (extra) await extra(dlg);
  await searchIn(dlg, page, q);
  const rows = await hitRows(dlg);
  note(`"${q}" -> ` + rows.slice(0, 4).join("  |  "));
  const idx = rows.findIndex((t) => t.toLowerCase().includes(want));
  ok(idx >= 0 && idx < 3, `"${q}" lists ${want} in the top 3 (at #${idx + 1})`);
  await shot(page, "search-" + q.replace(/\W+/g, "-"));
  await dlg.locator("button:has-text('+ Add')").filter({ hasText: new RegExp(want, "i") }).first().click(); await page.waitForTimeout(800);
  return dlg;
}
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await wait(1000); }
  fixture = await createFixture(() => {});
  const me = fixture.owner, robin = fixture.mate;
  const meSess = fixture.session, robinSess = await signIn(robin);
  sessions.push([me.id, meSess.access_token], [robin.id, robinSess.access_token]);
  const userOf = (uid) => "walk" + uid.replace(/-/g, "").slice(0, 10), robinUser = userOf(robin.id);
  // A username is required since 0432, and the fixture sets none, so the app opens on "Edit your profile".
  // Fill it the way onboarding would (each climber's own token), so the walk starts where a set-up climber does.
  for (const [uid, tok] of sessions) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, { method: "PATCH", headers: { apikey: anonKey(), Authorization: "Bearer " + tok, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ username: userOf(uid), avatar: "https://barbs2989.github.io/Climbing-App/icon-192.png" }) });
    // ...and a photo: real climbers without one are not listed (0420, owner 2026-11-14).
    if (!r.ok) throw new Error("username patch failed " + r.status + " " + (await r.text()).slice(0, 200));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });

  // 1. Robin lists at Smith Rock.
  const rp = await open(robinSess, 390, 844, "Robin");
  const rbox = rp.locator('section[aria-label="How climbers find you"]');
  ok(await rbox.count() === 1, "Robin: the You card (My areas) is on the Partners tab");
  note("box (unlisted): " + (await rbox.innerText()).replace(/\n/g, " / "));
  const bh = await rbox.boundingBox(); note("box size: " + Math.round(bh.width) + "x" + Math.round(bh.height));
  ok(bh.height <= 150, "the box is one short row plus the switch (<=150px tall)");
  ok(!/My areas ·|List the areas I climb/.test(await rp.locator('[role="group"][aria-label="Narrow the list"]').innerText()), "no My areas pill left in the filter row");
  await shot(rp, "1-robin-unlisted");
  const rdlg = await listAt(rp, "smith", "smith rock");
  await rdlg.locator("button", { hasText: /^Sport$/ }).click();
  await rdlg.locator("button", { hasText: /^This weekend/ }).click();
  await rdlg.locator("button", { hasText: /^List me at / }).click(); await rp.waitForTimeout(3500);
  ok(/Listed at 1 area/i.test(await rdlg.innerText()), "Robin is listed at 1 area");
  await rdlg.locator('button[aria-label="Close"]').click(); await rp.waitForTimeout(2500);
  ok(/listed at 1 place\./.test(await rbox.innerText()), "Robin's box now counts 1 place");
  await shot(rp, "2-robin-listed");
  await noSideScroll(rp, "Robin, Partners");

  // 2. Me: the search the way people type, then list at Smith Rock and find Robin.
  const mp = await open(meSess, 390, 844, "me");
  const mbox = mp.locator('section[aria-label="How climbers find you"]');
  const mdlg = await listAt(mp, "smith rock", "smith rock", async (dlg) => {
    await searchIn(dlg, mp, "s", 1500); ok(/at least two letters/.test(await dlg.innerText()), "one letter: Keep typing");
    await searchIn(dlg, mp, "zzqxv"); ok(/Nothing in the catalog is named/.test(await dlg.innerText()), "nonsense: says nothing is named that, with what to try");
    for (const [q, want] of [["rrg", "red river"], ["jtree", "joshua"], ["red rocks", "red rock"], ["leaven", "leavenworth"], ["devil's tower", "devils tower"], ["mt erie", "erie"], ["utah", "utah"]]) {
      await searchIn(dlg, mp, q); const rows = await hitRows(dlg); const i = rows.findIndex((t) => t.toLowerCase().replace(/['’]/g, "").includes(want));
      note(`"${q}" -> ` + rows.slice(0, 3).join("  |  ")); ok(i >= 0 && i < 3, `"${q}" finds ${want} in the top 3 (#${i + 1})`);
    }
  });
  await mdlg.locator("button", { hasText: /^List me at / }).click(); await mp.waitForTimeout(3500);
  await mdlg.locator('button[aria-label="Close"]').click(); await mp.waitForTimeout(6000);
  ok(/listed at 1 place\./.test(await mbox.innerText()), "my box counts 1 place");
  const by = mp.locator('select[aria-label="Search by"]');
  note("mode: " + await by.inputValue());
  // Partners offers a zip in a card (the lists show without one since 2026-11-24): type it in, as a climber would.
  const zipCard = mp.locator('[role="region"][aria-label="Add your zip code"]');
  ok(await zipCard.count() === 1, "no zip yet: Partners offers one in a card");
  if (await zipCard.count()) { await zipCard.locator('input[aria-label="Zip code"]').fill("98225"); await zipCard.locator("button", { hasText: /^Save$/ }).click(); await mp.waitForTimeout(7000); }
  // Real climbers are listed by @username unless they show their name.
  const robinRow = mp.locator(`text=/${robin.name}|@${robinUser}/`).first();
  ok(await robinRow.count() > 0, "Robin shows up under My areas (both listed at Smith Rock)");
  await shot(mp, "3-me-finds-robin");
  await noSideScroll(mp, "me, Partners");
  if (await robinRow.count()) { await robinRow.click(); await mp.waitForTimeout(3000); const t = await mp.locator("body").innerText(); note("profile actions: " + ["Connect", "Message", "Add friend", "Plan a session"].filter((w) => t.includes(w)).join(", ")); await shot(mp, "4-robin-profile"); await mp.keyboard.press("Escape"); await mp.waitForTimeout(1500); }

  // 3. The chip edits that listing; By area finds a crag in another state with no state picked.
  await mbox.locator("button", { hasText: /^My areas$/ }).click(); await mp.waitForTimeout(1500);
  await mp.locator('[role="dialog"][aria-label="My listed areas"] button[aria-label="Edit Smith Rock"]').click(); await mp.waitForTimeout(1000);
  ok(/Edit listing/.test(await mp.locator('[role="dialog"][aria-label="My listed areas"]').innerText()), "the Smith Rock row under My areas opens that listing");
  await mp.locator('[role="dialog"] button', { hasText: /Back/ }).click(); await mp.waitForTimeout(500);
  await mp.locator('[role="dialog"] button[aria-label="Close"]').click(); await mp.waitForTimeout(1000);
  await by.selectOption("area"); await mp.waitForTimeout(2500);
  const ab = mp.locator('input[aria-label="Search for a crag, canyon or range"]');
  ok(await ab.count() === 1, "By area: the search box is there");
  ok((await ab.boundingBox()).y < (await mp.locator('select[aria-label="Filter by country"]').first().boundingBox().then((b) => b ? b.y : 1e9, () => 1e9)), "By area: search comes before the state dropdowns");
  await ab.fill("red river"); await mp.waitForTimeout(6000);
  const aRows = await mp.locator("button").filter({ hasText: /Red River/ }).allInnerTexts();
  note('By area "red river" -> ' + aRows.slice(0, 3).map((t) => t.replace(/\n/g, " ")).join("  |  "));
  ok(aRows.length > 0, "By area finds Red River Gorge from a Washington account with no state picked");
  if (aRows.length) { await mp.locator("button").filter({ hasText: /^Red River Gorge/ }).first().click(); await mp.waitForTimeout(4000); }
  note("title: " + await mp.locator('[role="heading"][aria-level="2"]').first().innerText().catch(() => "?"));
  await shot(mp, "5-by-area-rrg");
  await noSideScroll(mp, "By area");

  // 4. Desktop.
  const dp = await open(meSess, 1280, 900, "desktop");
  await shot(dp, "6-desktop");
  await noSideScroll(dp, "desktop");
} catch (e) { fails.push("crashed: " + (e && e.message)); console.log(e); }
finally {
  for (const [uid, tok] of sessions) await fetch(`${SUPABASE_URL}/rest/v1/partner_areas?user_id=eq.${uid}`, { method: "DELETE", headers: { apikey: anonKey(), Authorization: "Bearer " + tok } }).catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); if (left.length) console.log("LEFT BEHIND: " + left.join(", ")); }
  server.kill();
  console.log(fails.length ? `\n${fails.length} FAILED:\n - ` + fails.join("\n - ") : "\nall ok");
  process.exit(fails.length ? 1 : 0);
}
