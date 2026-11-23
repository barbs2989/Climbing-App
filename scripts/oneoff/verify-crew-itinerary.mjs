// One-off probe for #3648 (crew itineraries), run by hand: node scripts/oneoff/verify-crew-itinerary.mjs
//
// Two REAL accounts (the check:signed-in fixture: an owner and a mate, both confirmed on a route crew
// and on a crag-session crew) drive the crew card in a browser, and every claim is then read back
// from the database under that climber's own token:
//   1. the owner builds a plan on the route crew: crews.itinerary holds every field, the owner's own
//      copy is saved, and the crew chat gets one line;
//   2. the MATE sees the whole day on the card, edits the crew's plan in place: the crew's plan
//      changes, the chat says so, and neither climber's own saved plan is touched;
//   3. the owner builds a plan on the crag session: it is saved under area:<id>, and Logbook > Saved
//      names the area;
//   4. the owner removes it: the crew's plan is null, the chat says so, the saved copy stays.
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5391;
const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];
if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) { console.error("needs VITE_USE_DB=true plus the Supabase url and anon key"); process.exit(1); }
const SUPA = envVal("VITE_SUPABASE_URL").replace(/\/$/, ""), ANON = envVal("VITE_SUPABASE_ANON_KEY");
const SHOTS = process.env.SHOT_DIR || null;

let bad = 0, n = 0;
const must = (c, m) => { n++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const as = (tok) => async (q) => { const r = await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: ANON, Authorization: `Bearer ${tok}` } }); return r.ok ? r.json() : { _status: r.status, _body: await r.text() }; };
async function waitFor(fn, ms = 20000) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) return v; await sleep(700); } }

async function openApp(browser, session, base) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, JSON.stringify(sessionForStorage(session))]);
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((e) => (e.textContent || "").trim() === "Home"), null, { timeout: 120000 });
  await sleep(2500);
  return { page, errors };
}
// Click the idx-th button whose trimmed text matches; mode is "is" or "starts".
const click = (page, text, mode = "is", idx = 0) => page.evaluate(({ text, mode, idx }) => {
  const els = [...document.querySelectorAll('button,[role="button"]')].filter((e) => { const t = (e.textContent || "").trim(); return mode === "is" ? t === text : t.startsWith(text); })
    .sort((a, b) => Number(!!b.closest('[aria-label="Primary"]')) - Number(!!a.closest('[aria-label="Primary"]')));
  if (!els[idx]) return false; els[idx].scrollIntoView({ block: "center" }); els[idx].click(); return true;
}, { text, mode, idx });
// A bottom-bar tab; its label may carry a badge ("Crews 3").
const nav = (page, name) => page.evaluate((name) => { const b = [...document.querySelectorAll('[aria-label="Primary"] button,[aria-label="Primary"] [role="button"]')].find((e) => (e.textContent || "").trim().startsWith(name)); if (!b) return false; b.click(); return true; }, name);
const sheetText = (page) => page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].pop(); return d ? d.innerText : ""; });
// Open the Itinerary sheet of the crew whose place name is `name`.
async function openItin(page, name, alsoHas) {
  await nav(page, "Crews");
  await waitFor(() => page.evaluate(() => [...document.querySelectorAll("button")].filter((e) => (e.textContent || "").trim().startsWith("Itinerary & float plan")).length >= 2), 40000);
  for (let i = 0; i < 4; i++) {
    if (!(await click(page, "Itinerary & float plan", "starts", i))) break;
    await sleep(900);
    // `alsoHas` tells two crews on ONE climb apart (the mate also owns an invite-only crew on it).
    const t = alsoHas ? (await waitFor(async () => { const x = await sheetText(page); return x.includes(alsoHas) ? x : null; }, 8000)) || await sheetText(page) : await sheetText(page);
    if (t.includes(name) && (!alsoHas || t.includes(alsoHas))) return true;
    await page.keyboard.press("Escape"); await sleep(500);
    if ((await sheetText(page)).includes("Itinerary & float plan")) { await click(page, "✓ Done", "starts"); await sleep(500); }
  }
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "openItin-failed.png") }).catch(() => {});
  console.log("  [debug] buttons: " + (await page.evaluate(() => [...document.querySelectorAll('button,[role="button"]')].map((b) => (b.textContent || "").trim().slice(0, 34)).filter(Boolean).slice(0, 70).join(" | "))));
  console.log("  [debug] last sheet text: " + (await sheetText(page)).slice(0, 300).replace(/\n/g, " / "));
  return false;
}
async function fillDay(page, d) {
  await page.fill('[aria-label="Day title"]', d.title);
  await page.fill('[aria-label="Objective (optional)"]', d.objective);
  await page.fill('[aria-label^="Gain"]', "3200"); await page.fill('[aria-label^="Loss"]', "150");
  await page.fill('[aria-label="Hours"]', "5"); await page.fill('[aria-label^="Distance"]', "6.5");
  await page.fill('[aria-label^="Pack weight"]', "38"); await page.fill('[aria-label="Notes for this day"]', d.note);
  await sleep(300);
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }).catch(() => {}); };

let fixture = null, server = null, browser = null;
try {
  const base = `http://127.0.0.1:${PORT}/Climbing-App/`;
  server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitFor(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, 90000))) throw new Error("dev server never came up");
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  fixture = await createFixture(console.log);
  const { owner, mate, crew, areaCrew } = fixture;
  const ms = await (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: mate.email, password: mate.password }) })).json();
  if (!ms.access_token) throw new Error("the mate could not sign in");
  const ownerQ = as(fixture.session.access_token), mateQ = as(ms.access_token);
  const routeRow = (await ownerQ(`routes?id=eq.${crew.route_id}&select=name`))[0];
  const routeName = routeRow && routeRow.name;
  const chat = async (cid) => { const r = await ownerQ(`crews_messages?crew_id=eq.${cid}&select=user_id,body&order=created_at`); return Array.isArray(r) ? r : []; };
  const crewRow = async (cid) => (await ownerQ(`crews?id=eq.${cid}&select=itinerary,itinerary_by`))[0] || {};

  console.log("\n1. the owner builds a plan on the ROUTE crew (" + routeName + ")");
  const o = await openApp(browser, fixture.session, base);
  { const ok = await openItin(o.page, routeName); must(ok, "the route crew's Itinerary sheet opens"); if (!ok) throw new Error("cannot reach the crew sheet"); }
  must(await click(o.page, "+ Build itinerary"), "+ Build itinerary is offered");
  await sleep(600);
  await fillDay(o.page, { title: "Probe approach", objective: "Camp below the col", note: "Last water at the creek." });
  must(await click(o.page, "Share with the crew"), "Share with the crew is pressed");
  let row = await waitFor(async () => { const r = await crewRow(crew.id); return r.itinerary ? r : null; });
  const d0 = row && row.itinerary && row.itinerary.days && row.itinerary.days[0] || {};
  must(d0.title === "Probe approach" && d0.objective === "Camp below the col" && Number(d0.gainFt) === 3200 && Number(d0.lossFt) === 150 && Number(d0.hours) === 5 && Number(d0.miles) === 6.5 && Number(d0.packLb) === 38 && d0.note === "Last water at the creek.", "crews.itinerary holds every field typed: " + JSON.stringify(d0));
  must(row && row.itinerary_by === owner.id, "itinerary_by is the owner");
  let mine = await waitFor(async () => { const r = await ownerQ(`user_itineraries?select=route_id,itinerary`); return Array.isArray(r) && r.length ? r : null; });
  must(Array.isArray(mine) && mine.some((x) => x.route_id === crew.route_id), "the owner's own copy is saved under the route id");
  let msgs = await waitFor(async () => { const m = await chat(crew.id); return m.some((x) => /^Shared an itinerary with the crew \(1 day\)/.test(x.body || "")) ? m : null; });
  must(Array.isArray(msgs) && msgs.some((x) => x.user_id === owner.id && /^Shared an itinerary with the crew \(1 day\)/.test(x.body)), "the crew chat holds the owner's line: Shared an itinerary with the crew (1 day)");
  await shot(o.page, "1-owner-shared");

  console.log("\n2. the MATE reads the whole day, then edits the crew's plan in place");
  const m = await openApp(browser, ms, base);
  must(await openItin(m.page, routeName, "Probe approach"), "the mate opens the same crew's Itinerary sheet, and the plan is on it");
  let st = await waitFor(async () => { const t = await sheetText(m.page); return t.includes("Probe approach") ? t : null; });
  st = st || await sheetText(m.page);
  for (const want of ["Day 1: Probe approach", "Goal: Camp below the col", "+3,200 ft", "-150 ft", "5 hr", "6.5 mi", "38 lb pack", "Last water at the creek."]) must(st.includes(want), `the mate's card shows "${want}"`);
  must(/from\s+\S+/.test(st) && !/from you/.test(st), "the card says whose plan it is, and not 'you'");
  await shot(m.page, "2-mate-sees-plan");
  must(await click(m.page, "Change"), "Change is offered to the mate");
  await sleep(500);
  must(await click(m.page, "Edit the crew’s plan", "starts"), "Edit the crew’s plan is offered");
  await sleep(600);
  must((await m.page.inputValue('[aria-label="Day title"]')) === "Probe approach", "the builder opens on the CREW's plan, not a blank day");
  await m.page.fill('[aria-label="Day title"]', "Probe approach (mate edit)");
  await sleep(300);
  must(await click(m.page, "Save for the crew"), "Save for the crew is pressed");
  row = await waitFor(async () => { const r = await crewRow(crew.id); return r.itinerary && r.itinerary.days[0].title === "Probe approach (mate edit)" ? r : null; });
  must(!!row, "crews.itinerary carries the mate's edit");
  must(row && row.itinerary_by === mate.id, "itinerary_by is now the mate");
  must(row && row.itinerary.days[0].note === "Last water at the creek." && Number(row.itinerary.days[0].gainFt) === 3200, "the rest of the day survived the edit");
  msgs = await waitFor(async () => { const c = await chat(crew.id); return c.some((x) => /^Changed the crew’s itinerary \(1 day\)/.test(x.body || "")) ? c : null; });
  must(Array.isArray(msgs) && msgs.some((x) => x.user_id === mate.id && /^Changed the crew’s itinerary \(1 day\)/.test(x.body)), "the crew chat holds the mate's line: Changed the crew’s itinerary (1 day)");
  const mateOwn = await mateQ(`user_itineraries?select=route_id`);
  must(Array.isArray(mateOwn) && mateOwn.length === 0, "editing the crew's plan saved NO plan of the mate's own (" + JSON.stringify(mateOwn) + ")");
  mine = await ownerQ(`user_itineraries?route_id=eq.${crew.route_id}&select=itinerary`);
  must(Array.isArray(mine) && mine[0] && mine[0].itinerary.days[0].title === "Probe approach", "the owner's own saved plan is untouched by the mate's edit");
  const mateReadsOwners = await mateQ(`user_itineraries?user_id=eq.${owner.id}&select=route_id`);
  must(Array.isArray(mateReadsOwners) && mateReadsOwners.length === 0, "the mate cannot read the owner's own saved plan");
  // Realtime: the owner's still-open sheet shows the mate's edit with no reload.
  const live = await waitFor(async () => (await sheetText(o.page)).includes("Probe approach (mate edit)"), 25000);
  must(!!live, "the owner's open card shows the mate's edit without a reload");
  await shot(o.page, "2-owner-sees-mate-edit");

  console.log("\n3. the owner builds a plan on the CRAG SESSION (" + areaCrew.areaName + ")");
  await o.page.goto(base, { waitUntil: "domcontentloaded" }); await sleep(4000);
  must(await openItin(o.page, areaCrew.areaName), "the crag session's Itinerary sheet opens");
  must(await click(o.page, "+ Build itinerary"), "+ Build itinerary is offered");
  await sleep(600);
  await fillDay(o.page, { title: "Probe crag day", objective: "Warm up left side", note: "Shade after two." });
  must(await click(o.page, "Share with the crew"), "Share with the crew is pressed");
  row = await waitFor(async () => { const r = await crewRow(areaCrew.id); return r.itinerary ? r : null; });
  must(!!(row && row.itinerary && row.itinerary.days[0].title === "Probe crag day"), "the crag session's crews.itinerary is set");
  const key = "area:" + areaCrew.areaId;
  mine = await waitFor(async () => { const r = await ownerQ(`user_itineraries?route_id=eq.${encodeURIComponent(key)}&select=itinerary`); return Array.isArray(r) && r.length ? r : null; });
  must(Array.isArray(mine) && mine[0].itinerary.days[0].title === "Probe crag day", `the owner's own copy is saved under "${key}"`);
  msgs = await waitFor(async () => { const c = await chat(areaCrew.id); return c.length ? c : null; });
  must(Array.isArray(msgs) && msgs.some((x) => x.user_id === owner.id && /^Shared an itinerary with the crew/.test(x.body)), "the crag session's chat holds the Shared line");
  await click(o.page, "✓ Done", "starts"); await o.page.keyboard.press("Escape"); await sleep(500);
  await o.page.goto(base, { waitUntil: "domcontentloaded" }); await sleep(4000);
  await nav(o.page, "Logbook"); await sleep(1500); await click(o.page, "Saved");
  const lb = await waitFor(async () => { const t = await o.page.evaluate(() => document.body.innerText); return /crag session plan/.test(t) ? t : null; }, 30000) || await o.page.evaluate(() => document.body.innerText);
  must(/crag session plan/.test(lb), "Logbook > Saved lists the crag session's plan");
  must(lb.includes(areaCrew.areaName), `...under the area's name (${areaCrew.areaName})`);
  must(/✓ Shared with/.test(lb), "...and says it is shared with the crew");
  must(!/Couldn’t load the climb for one of your plans/.test(lb) && !/undefined/.test(lb), "no failed-plan row and no 'undefined' on the Saved screen");
  must(lb.includes(routeName), "the route plan is still listed beside it");
  await shot(o.page, "3-logbook-saved");

  console.log("\n4. the owner removes the crag session's plan");
  must(await openItin(o.page, areaCrew.areaName), "the crag session's sheet reopens");
  must(await click(o.page, "Remove"), "Remove is offered");
  await sleep(600);
  must(await click(o.page, "Remove", "is", 1) || await click(o.page, "Remove"), "the confirm is accepted");
  row = await waitFor(async () => { const r = await crewRow(areaCrew.id); return r.itinerary == null ? r : null; });
  must(!!row && row.itinerary == null && row.itinerary_by == null, "the crag session's crews.itinerary is null");
  msgs = await waitFor(async () => { const c = await chat(areaCrew.id); return c.some((x) => /^Removed the crew’s itinerary\./.test(x.body || "")) ? c : null; });
  must(Array.isArray(msgs) && msgs.some((x) => /^Removed the crew’s itinerary\./.test(x.body)), "the chat holds: Removed the crew’s itinerary.");
  mine = await ownerQ(`user_itineraries?route_id=eq.${encodeURIComponent(key)}&select=route_id`);
  must(Array.isArray(mine) && mine.length === 1, "the owner's saved copy SURVIVES the removal");
  must(o.errors.length === 0 && m.errors.length === 0, "no page error in either browser" + (o.errors.concat(m.errors).length ? ": " + o.errors.concat(m.errors).join(" | ").slice(0, 400) : ""));
} catch (e) {
  bad++; console.error("PROBE THREW: " + (e && e.stack || e));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) { try { if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); else server.kill(); } catch {} }
  if (fixture) { const left = await fixture.cleanup().catch((e) => ["cleanup threw: " + e]); console.log(left.length ? "LEAKED: " + left.join(", ") : "\nfixture torn down, nothing left behind"); if (left.length) bad++; }
  console.log(`\n${bad ? "FAILED" : "ok"} — ${n} assertion(s), ${bad} failure(s)`);
  process.exit(bad ? 1 : 0);
}
