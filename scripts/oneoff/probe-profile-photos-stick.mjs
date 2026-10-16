// Do a climber's profile photos STICK? Drives the real editor in headless Chrome as a brand-new
// fixture account (no username, as every signup is), then reads the row and the screen back.
//
// Written for the owner's report "I saved profile photos before but they went away" (2026-10-15).
// The strip held; the AVATAR did not: "Change photo" uploaded the file but only Save wrote the
// column, and Save is DISABLED until a username exists, while Cancel discarded the draft. Each
// left an uploaded file that no profile pointed to. This walks: strip add -> avatar change ->
// CANCEL -> row holds both -> reload -> fresh browser context -> an unrelated Save keeps both.
// Creates and destroys its own fixture accounts and deletes the photos it uploads.
//
//   node scripts/oneoff/probe-profile-photos-stick.mjs
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { openFromMenu } from "../lib/menu-screens.mjs";
import { requireServiceKey, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-profile-photos-stick.mjs");

const port = 5391, base = `http://127.0.0.1:${port}/Climbing-App/`;
const log = (...a) => console.log(...a);
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 1000)); }
const fixture = await createFixture(log);
const uid = fixture.owner ? fixture.owner.id : (fixture.session.user && fixture.session.user.id);
log("uid", uid);
const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
let bad = 0;
const svc = requireServiceKey();
const row = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=avatar,photos`, { headers: headers(svc) })).json())[0];
async function ctxPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => log("pageerror", e.message.slice(0, 200)));
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(6000);
  return { ctx, page };
}
const clickText = (page, t) => page.evaluate(t => { const el = [...document.querySelectorAll("button,[role=button],a")].find(e => (e.textContent || "").trim() === t); if (el) { el.click(); return true; } return false; }, t);
const imgs = page => page.evaluate(() => [...document.querySelectorAll("img")].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0, w: i.width })).filter(i => /topo-photos/.test(i.src)));
try {
  let { ctx, page } = await ctxPage();
  const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 640; c.height = 480; const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 640, 480); g.fillStyle = "#fff"; g.fillRect(100, 100, 200, 150); return c.toDataURL("image/jpeg", 0.9).split(",")[1]; }), "base64");
  log("open profile:", await openFromMenu(page, "Profile"));
  await page.waitForTimeout(3000);
  // strip photo
  const stripInput = page.locator('label[aria-label="Add photo"] input[type=file]');
  log("strip inputs:", await stripInput.count());
  await stripInput.first().setInputFiles({ name: "strip.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await page.waitForFunction(() => !/Adding…/.test(document.body.innerText), null, { timeout: 90000 });
  await page.waitForTimeout(2000);
  log("after strip add, toast/err:", (await page.evaluate(() => document.body.innerText)).match(/Photo added[^\n]*|Couldn.t[^\n]*/g));
  // avatar
  log("edit:", await clickText(page, "Edit profile"));
  await page.waitForTimeout(3000);
  const avInput = page.locator("label:has-text('Change photo') input[type=file]");
  log("avatar inputs:", await avInput.count());
  page.on("response", async res => { if (/rest\/v1\/profiles/.test(res.url()) && res.request().method() === "PATCH") log("PATCH profiles", res.status(), (res.request().postData() || "").slice(0, 400)); });
  await avInput.first().setInputFiles({ name: "avatar.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await page.waitForFunction(() => /Uploading…/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => log("never saw Uploading…"));
  await page.waitForFunction(() => !/Uploading…/.test(document.body.innerText), null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  log("editor text:", (await page.evaluate(() => document.body.innerText)).match(/Couldn.t[^\n]*|Sign in[^\n]*|Remove photo/g));
  log("username reason shown:", /Username must be at least 3/.test(await page.evaluate(() => document.body.innerText)));
  log("cancel:", await clickText(page, "Cancel"));
  await page.waitForTimeout(3000);
  log("toast after save:", (await page.evaluate(() => document.body.innerText)).match(/Saved[^\n]*|cloud sync[^\n]*/g));
  let r = await row();
  log("DB after save:", JSON.stringify(r));
  if (!r.avatar || !/^https:/.test(r.avatar)) { bad++; log("FAIL avatar not stored"); }
  if (!r.photos || r.photos.length !== 1) { bad++; log("FAIL strip photo not stored"); }
  // reload
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(6000);
  await openFromMenu(page, "Profile"); await page.waitForTimeout(4000);
  let im = await imgs(page);
  log("after RELOAD imgs:", JSON.stringify(im));
  // fresh browser context (new device)
  await ctx.close();
  ({ ctx, page } = await ctxPage());
  await openFromMenu(page, "Profile"); await page.waitForTimeout(4000);
  im = await imgs(page);
  log("FRESH CONTEXT imgs:", JSON.stringify(im));
  const avShown = !!r.avatar && im.some(i => i.src.includes(r.avatar.split("/").pop()) && i.ok);
  const stShown = im.some(i => i.src.includes(r.photos[0].split("/").pop()) && i.ok);
  log("avatar shown+loaded:", avShown, "strip shown+loaded:", stShown);
  if (!avShown) bad++; if (!stShown) bad++;
  // edit something else and save: does the avatar/strip survive an unrelated profile save?
  await clickText(page, "Edit profile"); await page.waitForTimeout(3000);
  await page.locator("textarea").first().fill("bio edited by probe").catch(e => log("no textarea", e.message));
  await page.locator('input[aria-label="username"]').fill("probe" + Date.now().toString(36));
  log("save2:", await clickText(page, "Save")); await page.waitForTimeout(5000);
  const r2 = await row();
  log("DB after unrelated save:", JSON.stringify(r2));
  const bio = (await (await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=bio,username`, { headers: headers(svc) })).json())[0];
  log("bio/username:", JSON.stringify(bio)); if (bio.bio !== "bio edited by probe") { bad++; log("FAIL the unrelated save did not land"); }
  if (r2.avatar !== r.avatar) { bad++; log("FAIL avatar changed by an unrelated save"); }
  if (JSON.stringify(r2.photos) !== JSON.stringify(r.photos)) { bad++; log("FAIL strip changed by an unrelated save"); }
  await ctx.close();
  // cleanup storage objects
  const paths = [r.avatar, ...(r.photos || [])].filter(Boolean).map(u => u.split("/topo-photos/")[1]);
  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/topo-photos`, { method: "DELETE", headers: headers(svc, { "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: paths }) });
  log("deleted objects:", del.status);
} catch (e) { bad++; log("ERROR", e.message); }
finally {
  await browser.close().catch(() => {});
  const leaked = await fixture.cleanup().catch(e => [e.message]);
  log("cleanup leaked:", JSON.stringify(leaked));
  server.kill();
}
log(bad ? `FAIL (${bad})` : "PASS");
process.exit(bad ? 1 : 0);
