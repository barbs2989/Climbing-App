// One-off visual walk for #3451 (partners and crews by PEAK; List me switches in Logbook › Saved).
// Signs in a per-run fixture pair (scripts/lib/ui-fixture.mjs — created with the service key, destroyed
// after), saves a region, a crag and a peak for the owner, lists the mate on Mount Baker, then drives the
// dev build at 390px and writes screenshots. Every extra row it adds is deleted before the fixture is.
//   node scripts/oneoff/probe-peak-partners-walk.mjs <outDir> [--live]   (--live: the published site, no dev server)
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-peak-partners-walk.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIVE = process.argv.includes("--live");
const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) || path.join(ROOT, "probe-out");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5287, base = LIVE ? "https://barbs2989.github.io/Climbing-App/" : `http://127.0.0.1:${PORT}/Climbing-App/`;
const KEY = requireServiceKey();
const rest = async (p, opts = {}) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { ...opts, headers: headers(KEY, { "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) }) }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const log = (...a) => console.log(...a);
const findings = [];
const check = (ok, msg) => { findings.push((ok ? "ok    " : "FAIL  ") + msg); log((ok ? "ok    " : "FAIL  ") + msg); };

let server, browser, fixture; const extra = [];
try {
  if (!LIVE) server = spawn(NPX, [...NPX_PRE, "vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  fixture = await createFixture(log);
  const { owner, mate } = fixture;
  const add = async (table, row, filter) => { const r = await rest(table, { method: "POST", body: JSON.stringify(row) }); if (r.status >= 300) throw new Error(table + " " + r.status + " " + JSON.stringify(r.body)); extra.push(`${table}?${filter}`); };
  await add("saved_areas", { user_id: owner.id, area_id: "wa_index" }, `user_id=eq.${owner.id}&area_id=eq.wa_index`);
  await add("saved_areas", { user_id: owner.id, area_id: "wa_world_wall" }, `user_id=eq.${owner.id}&area_id=eq.wa_world_wall`);
  await add("saved_areas", { user_id: owner.id, area_id: "wa_mount_baker" }, `user_id=eq.${owner.id}&area_id=eq.wa_mount_baker`);
  await add("profile_zips", { user_id: owner.id, zip: "98225" }, `user_id=eq.${owner.id}`);
  await add("partner_areas", { user_id: mate.id, area_id: "wa_mount_baker", disciplines: ["mountaineering"], note: "Fixture: looking for a Baker partner" }, `user_id=eq.${mate.id}&area_id=eq.wa_mount_baker`);
  extra.push(`partner_areas?user_id=eq.${owner.id}`);
  await rest(`profiles?id=eq.${mate.id}`, { method: "PATCH", body: JSON.stringify({ avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face" }) });
  log("  saved Index, World Wall, Mount Baker; mate listed on Mount Baker");

  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
  await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  // A brand-new account meets onboarding (username, then profile): step through it as a climber would.
  for (let i = 0; i < 14; i++) {
    const tapped = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop() || (/Choose your username/.test(document.body.innerText) ? document.body : null);
      if (!dlg) return null;
      const want = ["Skip for now", "Skip", "Not now", "Maybe later", "Continue", "Done", "Finish", "Close", "✕", "Save"];
      const btns = [...dlg.querySelectorAll("button")].filter((b) => !b.disabled);
      for (const w of want) { const b = btns.find((x) => (x.textContent || "").trim() === w || (x.getAttribute("aria-label") || "") === w); if (b) { b.click(); return w; } }
      const close = btns.find((x) => /close|dismiss/i.test(x.getAttribute("aria-label") || ""));
      if (close) { close.click(); return "aria close"; }
      return "stuck";
    });
    if (!tapped) break;
    log("  onboarding: " + tapped);
    if (tapped === "stuck") { await page.keyboard.press("Escape"); }
    await page.waitForTimeout(1500);
  }
  const tapText = async (t) => page.evaluate((t) => { const els = [...document.querySelectorAll('button,[role="button"],a')].filter((e) => (e.textContent || "").trim() === t).sort((a, b) => Number(!!b.closest('[aria-label="Primary"]')) - Number(!!a.closest('[aria-label="Primary"]'))); if (!els[0]) return false; els[0].click(); return true; }, t);
  const shot = async (name, sel) => { const f = path.join(OUT, name + ".png"); if (sel) { const el = await page.$(sel); if (el) { await el.scrollIntoViewIfNeeded(); } } await page.screenshot({ path: f }); log("  shot " + f); };

  // ── Logbook › Saved ──
  check(await tapText("Logbook"), "Logbook tab opens");
  await page.waitForTimeout(1500);
  check(await tapText("Saved"), "Saved sub-tab opens");
  await page.waitForTimeout(5000);
  const order = await page.evaluate(() => { const t = document.body.innerText; return [t.indexOf("SAVED AREAS") >= 0 ? t.indexOf("SAVED AREAS") : t.indexOf("Saved areas"), t.indexOf("SAVED PEAKS") >= 0 ? t.indexOf("SAVED PEAKS") : t.indexOf("Saved peaks")]; });
  check(order[0] >= 0 && order[1] > order[0], `Saved areas (${order[0]}) is above Saved peaks (${order[1]})`);
  const sw = await page.locator('[role="switch"][aria-label^="List me in partner search at"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") + "=" + e.getAttribute("aria-checked")));
  check(sw.length === 3, "three List me switches render: " + sw.join(" | "));
  await page.evaluate(() => { const h = [...document.querySelectorAll("*")].find((e) => /^saved areas$/i.test((e.textContent || "").trim())); if (h) h.scrollIntoView({ block: "start" }); window.scrollBy(0, -80); const s = document.getElementById("appscroll"); if (s && h) s.scrollTop += h.getBoundingClientRect().top - 120; });
  await page.waitForTimeout(600);
  await shot("1-saved-before");
  await page.click('[role="switch"][aria-label="List me in partner search at World Wall"]');
  await page.click('[role="switch"][aria-label="List me in partner search at Mount Baker"]');
  await page.waitForTimeout(3500);
  await shot("2-saved-after-listing");
  const after = await page.locator('[role="switch"][aria-label^="List me in partner search at"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label").replace("List me in partner search at ", "") + "=" + e.getAttribute("aria-checked")));
  log("  switches now: " + after.join(" | "));
  const rows = await rest(`partner_areas?user_id=eq.${owner.id}&select=area_id,disciplines`);
  const ids = (rows.body || []).map((r) => r.area_id).sort();
  check(ids.join(",") === "wa_mount_baker,wa_world_wall", "DB holds the owner's listings at World Wall and Mount Baker (a PEAK, 0456): " + ids.join(","));
  const toast = await page.evaluate(() => document.body.innerText.match(/Listed at [^\n]*|Couldn’t list you[^\n]*/g));
  log("  toast text: " + JSON.stringify(toast));

  // ── Partners › A peak ──
  check(await tapText("Partners"), "Partners tab opens");
  await page.waitForTimeout(3000);
  await page.selectOption('select[aria-label="Search by"]', "peak");
  await page.waitForTimeout(2000);
  await shot("3-partners-peak-picker");
  check(await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-label="Your saved peaks"] button')].find((x) => x.textContent.trim() === "Mount Baker"); if (b) { b.click(); return true; } return false; }), "the saved peak Mount Baker is offered as a chip");
  await page.waitForTimeout(6000);
  const pText = await page.evaluate(() => document.body.innerText);
  check(/Climbers on Mount Baker/.test(pText), "the title states the search: Climbers on Mount Baker");
  check(/Listed at Mount Baker · Mountaineering/.test(pText), "the mate, listed on Mount Baker (name hidden by their privacy setting), is in the list");
  check(!/Suggested match/.test(pText), "no example profiles under a peak search");
  check(/listed .{0,6}Mount Baker|Climb at Mount Baker|You’re listed at Mount Baker/i.test(pText), "the List me box for the peak renders");
  log("  results text: " + JSON.stringify((pText.split("Searching Mount Baker")[1] || "").slice(0, 700)));
  const rpc = await fetch(SUPABASE_URL + "/rest/v1/rpc/partners_in_area", { method: "POST", headers: { apikey: anonKey(), Authorization: "Bearer " + fixture.session.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ p_area_id: "wa_mount_baker" }) }).then(async (r) => r.status + " " + (await r.text()).slice(0, 400)).catch((e) => "err " + e.message);
  log("  partners_in_area(wa_mount_baker) as the owner: " + rpc);
  const mateRow = await rest(`profiles?id=eq.${mate.id}&select=discoverable,avatar,show_name`);
  log("  mate profile: " + JSON.stringify(mateRow.body));
  await page.evaluate(() => { const el = [...document.querySelectorAll("span,div")].find((e) => (e.textContent || "").trim() === "Searching Mount Baker"); if (el) el.scrollIntoView({ block: "start" }); });
  await page.waitForTimeout(800);
  await shot("4-partners-peak-results");
  await page.evaluate(() => { const s = document.getElementById("appscroll"); if (s) s.scrollTop += 600; else window.scrollBy(0, 600); });
  await page.waitForTimeout(800);
  await shot("5-partners-peak-results-lower");

  // ── Join a crew › By Peak ──
  check(await tapText("Join a crew"), "Join a crew opens");
  await page.waitForTimeout(2500);
  check(await tapText("By Peak"), "By Peak mode opens");
  await page.waitForTimeout(3000);
  await shot("6-crews-by-peak-picker");
  check(await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-label="Your saved peaks"] button')].find((x) => x.textContent.trim() === "Mount Baker"); if (b) { b.click(); return true; } return false; }), "the saved peak is a chip in By Peak");
  await page.waitForTimeout(4000);
  const cText = await page.evaluate(() => document.body.innerText);
  const n = (cText.match(/(\d+) crews?/) || [])[1];
  check(n && +n >= 1, "By Peak › Mount Baker lists the fixture's crew on the North Ridge (" + n + " crews)");
  await shot("7-crews-by-peak-results");
  check(!errs.length, "no page errors" + (errs.length ? ": " + errs.join(" / ") : ""));
} catch (e) {
  console.error("probe threw:", e && e.stack || e);
  findings.push("FAIL  threw: " + (e && e.message));
} finally {
  for (const f of extra) await rest(f, { method: "DELETE" }).catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch((e) => [String(e)]); log(left.length ? "LEAKED: " + left.join(",") : "fixture removed"); }
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  fs.writeFileSync(path.join(OUT, "findings.txt"), findings.join("\n"));
}
