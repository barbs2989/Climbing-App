#!/usr/bin/env node
// RELIABILITY END TO END, on two REAL accounts against the live database (0519, owner 2026-11-23: "do some tests after
// with real climbers accounts" / "test that it works properly with good ui and ux").
//
// check:trip-reports proves 0519's rules in PGlite. This proves the same rules hold in the LIVE project, and that the
// screens a climber uses reach them: a crew whose day was yesterday, the "How did it go?" alert and sheet, the reveal,
// "Your side" and "I was there", the profile's counts, and the match % in both directions. It creates its own two
// accounts (scripts/lib/ui-fixture.mjs: service key HERE only) and deletes them, and every report with them, at the end.
//
//   node scripts/oneoff/probe-reliability-e2e.mjs [--out DIR]   (screenshots at 390 px go to DIR, default .reliability-shots)
//
// Hand-run: it writes to production (fixture rows only) and drives a real browser.

import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-reliability-e2e");
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.resolve(ROOT, process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : ".reliability-shots");
fs.mkdirSync(OUT, { recursive: true });
const SVC = requireServiceKey(), ANON = anonKey();
let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const check = (cond, m, detail) => (cond ? ok(m) : fail(m + (detail ? "  -- " + detail : "")));

async function signIn(u) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const b = await r.json();
  if (!b.access_token) throw new Error("sign-in failed for " + u.email);
  return b;
}
const rpc = (tok) => async (fn, args) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t };
};
const svc = async (p, init = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...init, headers: { ...headers(SVC), "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const claimPort = (start) => new Promise((res, rej) => { let p = start; const one = () => { if (p > start + 40) return rej(new Error("no port")); const s = net.createServer(); s.once("error", () => { p++; one(); }); s.once("listening", () => s.close(() => res(p))); s.listen(p, "127.0.0.1"); }; one(); });
const waitFor = async (url) => { for (let i = 0; i < 90; i++) { try { if ((await fetch(url)).ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); } return false; };

let fixture = null, server = null, browser = null;
try {
  const port = await claimPort(5281);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitFor(base))) throw new Error("dev server never came up");
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  console.log("creating two real accounts...");
  fixture = await createFixture((m) => console.log(m));
  const A = fixture.owner, B = fixture.mate, crewId = fixture.crew.id;
  const yesterday = ymd(new Date(Date.now() - 86400000));
  const set = await svc(`crews?id=eq.${crewId}`, { method: "PATCH", body: JSON.stringify({ agreed_date: yesterday, dates: [yesterday] }) });
  if (set.status >= 300 || !set.json?.length) throw new Error("could not move the fixture crew's day to yesterday");
  console.log(`  crew ${crewId.slice(0, 8)}: ${A.name} + ${B.name}, agreed day ${yesterday}\n`);
  const aS = await signIn(A), bS = await signIn(B);
  const a = rpc(aS.access_token), b = rpc(bS.access_token);
  const relOf = async (who, id) => ((await who("reliability_of_users", { p_ids: [id] })).json || [])[0] || {};

  // ── 1. the rules, live ────────────────────────────────────────────────────────────────────────────────────────────
  const stranger = await rpc(aS.access_token)("submit_trip_report", { p_crew: crewId, p_about: A.id, p_outcome: "no_show" });
  check(stranger.status >= 400, "live: a report about yourself is refused", stranger.text.slice(0, 120));
  const r1 = await a("submit_trip_report", { p_crew: crewId, p_about: B.id, p_outcome: "no_show" });
  check(r1.status < 300, "live: A reports B as Didn't show", r1.text.slice(0, 160));
  const hidden = await b("my_trip_reports_about_me", {});
  check(Array.isArray(hidden.json) && hidden.json.length === 0, "live: B cannot see it yet (hidden until B files, or 7 days)", hidden.text.slice(0, 160));
  check((await relOf(a, B.id)).trips === 0, "live: B's counts do not move before the reveal");

  // ── 2. B's screens: the alert, the sheet, the reveal, Your side ───────────────────────────────────────────────────
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 860 }, deviceScaleFactor: 2 });
  await ctxB.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} }, { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(bS)) });
  const pB = await ctxB.newPage(); const errsB = []; pB.on("pageerror", (e) => errsB.push(e.message));
  await pB.goto(base, { waitUntil: "domcontentloaded" });
  await pB.waitForTimeout(6000);
  await pB.locator('button[title="Notifications"]').first().click();
  await pB.waitForTimeout(1500);
  const alertB = pB.getByText(/How did .* go on .*\? Say who showed up/).first();
  check(await alertB.count() > 0, "B's bell has the \"How did it go? Say who showed up\" alert for yesterday's crew");
  await pB.screenshot({ path: path.join(OUT, "1-alert.png") });
  if (await alertB.count()) await alertB.click();
  await pB.waitForTimeout(2500);
  const sheet = pB.getByRole("dialog", { name: "How did it go?" });
  check(await sheet.count() > 0, "the alert opens How did it go?");
  await pB.screenshot({ path: path.join(OUT, "2-recap-sheet.png"), fullPage: false });
  const onTimeA = pB.getByRole("button", { name: new RegExp("^On time — ") }).first();
  check(await onTimeA.count() > 0, "the sheet lists A with the five answers");
  if (await onTimeA.count()) await onTimeA.click();
  await pB.waitForTimeout(2500);
  check((await onTimeA.getAttribute("aria-pressed")) === "true", "tapping On time marks it, and says so (aria-pressed)");
  await pB.screenshot({ path: path.join(OUT, "3-recap-marked.png") });
  const mineAboutA = ((await a("my_trip_reports_about_me", {})).json || [])[0];
  check(mineAboutA && mineAboutA.outcome === "on_time", "the tap reached the database: A now sees B's On time (A filed first, so it is revealed)", JSON.stringify(mineAboutA));
  const shown = ((await b("my_trip_reports_about_me", {})).json || []);
  check(shown.length === 1 && shown[0].outcome === "no_show", "once B files, B sees A's report");
  check((await relOf(a, B.id)).no_show === 1, "...and B's counts read 1 no-show");
  // Your side.
  await pB.getByRole("button", { name: "← Back" }).first().click().catch(() => {});
  await pB.reload({ waitUntil: "domcontentloaded" }); await pB.waitForTimeout(6000);
  await pB.locator('button[title="Notifications"]').first().click(); await pB.waitForTimeout(1500);
  const replyAlert = pB.getByText(/A crewmate marked you “Didn’t show”/).first();
  check(await replyAlert.count() > 0, "B's bell says a crewmate marked them Didn't show");
  if (await replyAlert.count()) await replyAlert.click();
  await pB.waitForTimeout(2500);
  check(await pB.getByRole("dialog", { name: "Your side of a trip report" }).count() > 0, "the alert opens Your side");
  await pB.screenshot({ path: path.join(OUT, "4-your-side.png") });
  const there = pB.getByRole("button", { name: /^I was there/ }).first();
  if (await there.count()) await there.click();
  await pB.waitForTimeout(2500);
  const afterDispute = await relOf(a, B.id);
  check(afterDispute.no_show === 0 && afterDispute.trips === 0, "\"I was there\" from the sheet takes the report out of B's counts", JSON.stringify(afterDispute));
  check(!errsB.length, "no page errors on B's side", errsB.slice(0, 2).join(" | "));

  // ── 3. A's screens: the recap shows B's answer; A's own Profile shows A's record ──────────────────────────────────
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 860 }, deviceScaleFactor: 2 });
  await ctxA.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} }, { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(aS)) });
  const pA = await ctxA.newPage(); const errsA = []; pA.on("pageerror", (e) => errsA.push(e.message));
  await pA.goto(base, { waitUntil: "domcontentloaded" }); await pA.waitForTimeout(6000);
  await pA.locator('button[title="Notifications"]').first().click(); await pA.waitForTimeout(1500);
  const alertA = pA.getByText(/How did .* go on .*\? Say who showed up/).first();
  if (await alertA.count()) { await alertA.click(); await pA.waitForTimeout(2500); }
  const repliedLine = pA.getByText(/replied that they were there/);
  check(await repliedLine.count() > 0, "A's recap shows that B replied they were there");
  await pA.screenshot({ path: path.join(OUT, "5-recap-with-reply.png") });
  // A's record: B said On time, revealed (A filed). The Profile tab prints it.
  check((await relOf(b, A.id)).on_time === 1, "A's record reads 1 on time");
  await pA.getByRole("button", { name: "← Back" }).first().click().catch(() => {});
  await pA.waitForTimeout(800);
  const meTab = pA.getByRole("button", { name: /^(Profile|Me)\b/ }).last();
  if (await meTab.count()) { await meTab.click(); await pA.waitForTimeout(3000); }
  const line = pA.getByText(/Showed up for 1 of 1 crew trip/).first();
  check(await line.count() > 0, "A's own Profile tab shows \"Showed up for 1 of 1 crew trip\"");
  await pA.screenshot({ path: path.join(OUT, "6-profile-line.png") });
  check(!errsA.length, "no page errors on A's side", errsA.slice(0, 2).join(" | "));

  // ── 4. called off marks nobody ─────────────────────────────────────────────────────────────────────────────────────
  const co = await b("submit_trip_report", { p_crew: crewId, p_about: null, p_outcome: "called_off" });
  check(co.status < 300 && (await relOf(b, A.id)).trips === 0, "B saying the crew called it off takes the trip off A's record", co.text.slice(0, 120));

  // ── 5. 320 px: nothing runs off the edge ──────────────────────────────────────────────────────────────────────────
  await pB.setViewportSize({ width: 320, height: 760 });
  await pB.reload({ waitUntil: "domcontentloaded" }); await pB.waitForTimeout(6000);
  await pB.locator('button[title="Notifications"]').first().click(); await pB.waitForTimeout(1200);
  const al2 = pB.getByText(/How did .* go on .*\? Say who showed up/).first();
  if (await al2.count()) { await al2.click(); await pB.waitForTimeout(2500); }
  const over = await pB.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, "at 320 px the recap sheet does not run off the right-hand edge", over + " px over");
  await pB.screenshot({ path: path.join(OUT, "7-recap-320.png") });
} catch (e) {
  bad++; console.log("  FAIL  the probe stopped: " + (e && e.message));
} finally {
  if (fixture) {
    const ids = [fixture.owner.id, fixture.mate.id];
    await fixture.cleanup().catch((e) => console.log("  cleanup error: " + e.message));
    const left = await svc(`crew_trip_reports?or=(reporter_id.in.(${ids}),about_id.in.(${ids}))&select=id`);
    const users = await svc(`profiles?id=in.(${ids})&select=id`);
    console.log(`\ncleanup: ${Array.isArray(left.json) ? left.json.length : "?"} trip report(s) and ${Array.isArray(users.json) ? users.json.length : "?"} profile(s) left (want 0 and 0)`);
    if (!Array.isArray(left.json) || left.json.length || !Array.isArray(users.json) || users.json.length) bad++;
  }
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
console.log(`\n${bad ? bad + " problem(s)" : "ok"} — ${ran} check(s); screenshots in ${OUT}`);
process.exit(bad ? 1 : 0);
