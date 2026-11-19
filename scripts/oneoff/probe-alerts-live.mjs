// probe-alerts-live — do the alerts built in #3535 / 0469 reach a REAL account, sent by ANOTHER real account?
//
// Owner, 2026-11-18: "do a live test". Two throwaway accounts from ui-fixture (Quinn = owner, Robin = mate);
// every row the mate writes is written under the MATE's own JWT, as the app would, never the service key.
//
//   node scripts/oneoff/probe-alerts-live.mjs setup   -> creates the accounts and the rows, writes STATE, keeps them
//   (the GPS review runs here, as an admin, by hand: it is admin-only and no fixture can be made admin)
//   node scripts/oneoff/probe-alerts-live.mjs check   -> opens the app AS THE OWNER, asserts every alert, then tears down
//   node scripts/oneoff/probe-alerts-live.mjs cleanup -> tear down only (after a failed check)
//
// Asserted in the owner's notification panel:
//   1. "Robin ... vouched for you"                         (_vouchNotifs)
//   2. "Robin ... joined your ... crew"                    (_crewJoinNotifs; the fixture crew seats the mate after the owner)
//   3. "Robin ... reported conditions on <climb>"          (_condNotifs; a Conditions report by the mate on a climb the owner logged)
//   4. "Back in season: give <climb> another go"           (_seasonNotifs; the owner's Attempt on a climb in season now)
//   5. "Your GPS track for <climb> was turned down"        (0469: review_gps_submission -> user_notices)
//   6. switching "Condition reports" off hides (3) and is saved to notification_state.prefs, and a FRESH browser
//      (no localStorage) opens Settings with it still off — the switch follows the account.
//
// Last run 2026-11-18: 12/12 held, torn down clean. Prod DB work: take a ~/dev/db-throttle slot first.
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-alerts-live.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATE = process.env.ALERTS_PROBE_STATE || path.join(os.tmpdir(), "climbmatch-alerts-probe-state.json");
const ANON = anonKey();
const mode = process.argv[2];
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };

async function rest(pathq, { token, method = "GET", body, service } = {}) {
  const h = service ? headers(requireServiceKey(), { Prefer: "return=representation", "Content-Type": "application/json" })
    : { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathq}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, ok: r.ok, json: j, text: t };
}
async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json(); if (!j.access_token) throw new Error(`sign-in failed for ${email}: ${r.status}`); return j;
}

async function setup() {
  const fx = await createFixture((...a) => console.log(...a));
  const st = { owner: fx.owner, mate: fx.mate, crewId: fx.crew.id, rows: [] };
  fs.writeFileSync(STATE, JSON.stringify(st, null, 2)); // written first, so a failure below can still be cleaned up
  const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 2));
  const ownerTok = (await signIn(fx.owner.email, fx.owner.password)).access_token;
  const mateTok = (await signIn(fx.mate.email, fx.mate.password)).access_token;

  // Two climbs that are not the fixture's (the fixture's is an OBJECTIVE, and objectives raise their own alert).
  const cand = await rest(`routes?select=id,name,season,discipline&season=ilike.*nov*&name=not.is.null&id=neq.wa_mount_baker_north_ridge&limit=40`, { token: ownerTok });
  const yearRound = (s) => /year|all\s*season|jan.*dec/i.test(s || "");
  const seasonRoute = (cand.json || []).find((r) => !yearRound(r.season) && /nov/i.test(r.season || "") && !/nov(ember)?\s*[-–]\s*nov/i.test(r.season));
  const cond = await rest(`routes?select=id,name&name=not.is.null&id=neq.wa_mount_baker_north_ridge&id=neq.${encodeURIComponent(seasonRoute ? seasonRoute.id : "x")}&limit=1`, { token: ownerTok });
  const condRoute = (cond.json || [])[0];
  if (!seasonRoute || !condRoute) throw new Error(`could not pick climbs (season ${cand.status}, cond ${cond.status})`);
  st.seasonRoute = seasonRoute; st.condRoute = condRoute; save();
  console.log(`  season climb: ${seasonRoute.name} (${seasonRoute.season})\n  conditions climb: ${condRoute.name}`);

  const ins = async (table, body, token, label) => {
    const r = await rest(table, { token, method: "POST", body });
    if (!r.ok || !Array.isArray(r.json) || r.json.length !== 1) throw new Error(`${label}: HTTP ${r.status} ${r.text.slice(0, 200)}`);
    st.rows.push({ table, id: r.json[0].id }); save(); return r.json[0];
  };
  // OWNER (own JWT): a logged climb on the conditions route, and an ATTEMPT on the season route.
  await ins("climb_logs", { user_id: fx.owner.id, route_id: condRoute.id, date_climbed: "2026-10-01", discipline: "trad", tick_type: "Lead", stars: 4, party_size: 2, notes: "Alerts probe log." }, ownerTok, "owner's logged climb");
  await ins("climb_logs", { user_id: fx.owner.id, route_id: seasonRoute.id, date_climbed: "2025-12-14", discipline: seasonRoute.discipline || "ice", tick_type: "Attempt", stars: 3, party_size: 2, notes: "Alerts probe attempt." }, ownerTok, "owner's attempt");
  // MATE (own JWT): a vouch, and a conditions report on the climb the owner logged.
  await ins("vouches", { from_id: fx.mate.id, to_id: fx.owner.id, reason: "Solid partner on the probe climb." }, mateTok, "mate's vouch");
  const today = new Date().toISOString().slice(0, 10);
  await ins("climb_logs", { user_id: fx.mate.id, route_id: condRoute.id, date_climbed: today, discipline: "trad", tick_type: "Conditions", party_size: 1, trip_report_visibility: "public", notes: "Dry and in shape (alerts probe)." }, mateTok, "mate's conditions report");
  // A GPS submission FROM THE OWNER (service key: validate-gps writes it server-side, with the caller's verified address).
  const pts = Array.from({ length: 12 }, (_, i) => ({ lat: 48.8 + i * 0.001, lng: -121.6 + i * 0.001, ele: 1200 + i * 10 }));
  const g = await rest("gps_submissions", { service: true, method: "POST", body: { route_id: condRoute.id, climber_email: fx.owner.email, climber_name: fx.owner.name, gpx_data: pts, device_type: "Alerts probe", status: "pending", quality_score: 80 } });
  if (!g.ok) throw new Error(`gps submission: ${g.status} ${g.text.slice(0, 200)}`);
  st.gpsId = g.json[0].id; save();
  console.log(`\nsetup done. Reject the GPS submission as an admin now:\n  submission ${st.gpsId}`);
}

async function teardown(st) {
  const left = [];
  for (const r of [...(st.rows || [])].reverse()) { const d = await rest(`${r.table}?id=eq.${r.id}`, { service: true, method: "DELETE" }); if (!d.ok) left.push(`${r.table}:${r.id}`); }
  if (st.gpsId) { const d = await rest(`gps_submissions?id=eq.${st.gpsId}`, { service: true, method: "DELETE" }); if (!d.ok) left.push("gps_submissions:" + st.gpsId); }
  for (const u of [st.owner, st.mate].filter(Boolean)) {
    await rest(`crews?created_by=eq.${u.id}`, { service: true, method: "DELETE" });
    await rest(`groups?created_by=eq.${u.id}`, { service: true, method: "DELETE" });
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: headers(requireServiceKey()) }).catch(() => {});
    const p = await rest(`profiles?id=eq.${u.id}&select=id`, { service: true });
    if (Array.isArray(p.json) && p.json.length) left.push("profile:" + u.email);
  }
  console.log(left.length ? `  LEFT BEHIND: ${left.join(", ")}` : "  torn down: both accounts and every probe row are gone");
  if (!left.length) fs.rmSync(STATE, { force: true });
  return left;
}

const claimPort = (start) => new Promise((res, rej) => { let p = start; const t = () => { if (p > start + 40) return rej(new Error("no port")); const s = net.createServer(); s.once("error", () => { p++; t(); }); s.once("listening", () => s.close(() => res(p))); s.listen(p, "127.0.0.1"); }; t(); });

async function check() {
  const st = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const sess = await signIn(st.owner.email, st.owner.password);
  const port = await claimPort(5390), base = `http://127.0.0.1:${port}/`;
  const server = spawn(NPX, [...NPX_PRE, "vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let browser;
  try {
    for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
    browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
    const open = async (q, fresh) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const page = await ctx.newPage(); page.setDefaultTimeout(120000);
      const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
      await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, JSON.stringify(sessionForStorage(fresh || sess))]);
      await page.goto(base + q, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(9000); // the alert reads are separate queries; give them time to land
      await settledText(page);
      return { page, ctx, errs, text: await page.evaluate(() => document.body.innerText) };
    };
    const mateFirst = (st.mate.name || "Robin").split(" ")[0];
    let v = await open("?zt=today&z=notifOpen");
    const t = v.text;
    must(new RegExp(mateFirst + "[^\\n]*vouched for you").test(t) || /vouched for you/.test(t), "1. the vouch arrived: \"… vouched for you\"");
    must(/joined your [^\n]*crew/.test(t), "2. the crew join arrived: \"… joined your … crew\"");
    must(t.includes("reported conditions on " + st.condRoute.name), `3. the conditions report arrived: "… reported conditions on ${st.condRoute.name}"`);
    must(t.includes("Back in season: give " + st.seasonRoute.name + " another go"), `4. Back in season arrived for ${st.seasonRoute.name}`);
    must(t.includes("Your GPS track for " + st.condRoute.name + " was turned down"), "5. the GPS review outcome arrived: \"Your GPS track for … was turned down\"");
    must(!v.errs.length, "no page errors" + (v.errs.length ? ": " + v.errs[0].slice(0, 160) : ""));
    if (bad) console.log("\n--- panel text ---\n" + t.slice(0, 3000) + "\n---");
    await v.ctx.close();

    // 6. Switch "Condition reports" off in Settings, as the owner.
    v = await open("?zt=me&z=settingsNotifsOpen");
    const sw = v.page.getByRole("switch", { name: /Condition reports/ });
    must(await sw.count() === 1, "6a. Settings › Notifications shows the Condition reports switch");
    if (await sw.getAttribute("aria-checked") !== "false") await sw.click();
    must(await sw.getAttribute("aria-checked") === "false", "6b. the switch turned off");
    await v.page.waitForTimeout(4000); // the account save is debounced 800 ms
    await v.ctx.close();
    const ns = await rest(`notification_state?user_id=eq.${st.owner.id}&select=prefs`, { token: sess.access_token });
    const prefs = ns.json && ns.json[0] && ns.json[0].prefs;
    must(!!prefs && prefs.conditions === false, `6c. the account saved it: notification_state.prefs = ${JSON.stringify(prefs)}`);
    // A fresh context: no localStorage at all except the session.
    v = await open("?zt=me&z=settingsNotifsOpen");
    const sw2 = v.page.getByRole("switch", { name: /Condition reports/ });
    must(await sw2.getAttribute("aria-checked") === "false", "6d. a fresh browser opens with Condition reports still OFF (it followed the account)");
    await v.ctx.close();
    v = await open("?zt=today&z=notifOpen");
    must(!v.text.includes("reported conditions on " + st.condRoute.name), "6e. with it off, the conditions alert is hidden");
    must(/vouched for you/.test(v.text), "6f. ...and the other alerts are not");
    await v.ctx.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { server.kill(); } catch {}
  }
}

if (mode === "setup") { try { await setup(); } catch (e) { console.error("setup failed:", e.message); const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : null; if (st) await teardown(st); process.exit(1); } }
else if (mode === "check") {
  try { await check(); } catch (e) { bad++; console.error("check failed:", e.message); }
  const left = await teardown(JSON.parse(fs.readFileSync(STATE, "utf8")));
  console.log(`\n${bad ? "FAIL" : "ok"} — ${asserted - bad}/${asserted} assertions held${left.length ? "; TEARDOWN INCOMPLETE" : ""}`);
  process.exit(bad || left.length ? 1 : 0);
}
else if (mode === "cleanup") { await teardown(JSON.parse(fs.readFileSync(STATE, "utf8"))); }
else { console.error("usage: probe-alerts-live.mjs setup | check | cleanup"); process.exit(2); }
