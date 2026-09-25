// Does a PACKED route give a real climber what the route page offers, with no signal?
//
// One-shot verifier for the trip-pack snapshot (agreed corrections, latest trip reports with their
// authors, a dated forecast, the climber's own plan, and the pack's age + refresh). It drives the
// real app as a REAL signed-in account against the real database:
//
//   1. Two per-run accounts (scripts/lib/ui-fixture.mjs). The SECOND one files a public trip report
//      and a correction on the route; the first saves a day-by-day plan for it. Those are the three
//      things another climber, and you, put on a route — and the three things the pack used to drop.
//   2. As the first climber: open the route, tap Trip pack, and wait for the forecast snapshot.
//   3. CUT THE DATA NETWORK — Supabase and all three weather services abort — and RELOAD. The app's
//      own files still load, so this is exactly "the app is on my phone, the signal is gone". A
//      reload is the point: without it every screen would be answered from React's in-memory cache
//      and the fallback under test would never run.
//   4. Assert each surface says what it holds and how old it is.
//
// Rows it writes on the real route (a crew-only report, a rope note on an empty field, a plan) live
// for the minutes of the run and are deleted explicitly, then the accounts. The rope note is on a
// field that is EMPTY on this route, so one contribution applies — the same rule the page uses.
//
// Spent when: the pack's shape changes. Never pins a value from the catalog; it only looks for the
// rows it wrote itself (PACKCHECK), and fails closed if it could not write them.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ROUTE_ID = "wa_mount_baker_north_ridge";
const TAG = "PACKCHECK";
const log = (m) => console.log(m);
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); log(`${ok ? "ok  " : "FAIL"}  ${name}${!ok && detail ? "\n        " + detail : ""}`); };

assertQuietBox("verify-trip-pack-offline");
const KEY = requireServiceKey();
const rest = async (p, init = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...init, headers: headers(KEY, { Prefer: "return=representation", "Content-Type": "application/json", ...(init.headers || {}) }) });
  const body = await r.json().catch(() => null);
  if (r.status >= 300) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
};

function claimPort(start, span = 40) {
  return new Promise((resolve, reject) => {
    let p = start;
    const tryOne = () => {
      if (p >= start + span) return reject(new Error("no free port"));
      const s = net.createServer();
      s.once("error", () => { p++; tryOne(); });
      s.once("listening", () => s.close(() => resolve(p)));
      s.listen(p, "127.0.0.1");
    };
    tryOne();
  });
}
async function waitForServer(url, tries = 90) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  return false;
}

let server = null, browser = null, fixture = null;
const written = [];
try {
  const port = await claimPort(5391);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) throw new Error("dev server never came up");
  await fetch(base + "ClimbMatch.jsx").catch(() => {});
  await fetch(base + "RouteDetail.jsx").catch(() => {});
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

  log("creating fixture accounts...");
  fixture = await createFixture(log);
  const me = fixture.owner, other = fixture.mate;

  // What another climber, and I, put on this route.
  const [rep] = await rest("climb_logs", { method: "POST", body: JSON.stringify({ user_id: other.id, route_id: ROUTE_ID, date_climbed: "2026-09-20", discipline: "alpine", tick_type: "Summit", stars: 4, party_size: 2, notes: `${TAG} report: firm snow above the Coleman, bergschrund still bridged.`, trip_report_visibility: "public", cond_tags: ["Firm snow"] }) });
  written.push(`climb_logs?id=eq.${rep.id}`);
  const [con] = await rest("contributions", { method: "POST", body: JSON.stringify({ route_id: ROUTE_ID, kind: "field", field: "ropeNote", value: `${TAG} rope note: simul the lower ridge, pitch the ice step.`, contributor: other.id }) });
  written.push(`contributions?id=eq.${con.id}`);
  await rest("user_itineraries", { method: "POST", body: JSON.stringify({ user_id: me.id, route_id: ROUTE_ID, itinerary: { days: [{ n: 1, title: `${TAG} approach to high camp` }, { n: 2, title: `${TAG} summit and out` }] } }) });
  written.push(`user_itineraries?user_id=eq.${me.id}`);
  log("  wrote: a public report + a rope-note correction (other climber), a 2-day plan (me)");

  await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });

  const text = () => page.evaluate(() => document.body.innerText);
  const waitText = async (re, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await text(); if (re.test(t)) return t; await page.waitForTimeout(700); } return await text(); };
  const tapExact = async (label) => page.evaluate((t) => { const el = [...document.querySelectorAll('button,[role="button"],[role="tab"],a')].find((e) => (e.textContent || "").trim() === t); if (!el) return false; el.click(); return true; }, label);
  const idbPack = () => page.evaluate(() => new Promise((res) => { const rq = indexedDB.open("climbmatch-offline"); rq.onerror = () => res(null); rq.onsuccess = () => { try { const g = rq.result.transaction("pack").objectStore("pack").get("wa_mount_baker_north_ridge"); g.onsuccess = () => { const r = g.result; res(r ? { snap: r._snap ? { reports: (r._snap.reports || []).map((x) => x.notes || ""), contribs: (r._snap.contribs || []).map((x) => x.field + ":" + (typeof x.value === "string" ? x.value : "")), profiles: (r._snap.profiles || []).map((p) => p.id) } : null, wx: r._wx ? { at: r._wx.at, keys: Object.keys(r._wx.raw || {}) } : null, refreshedAt: r.refreshedAt } : null); }; g.onerror = () => res(null); } catch (e) { res(null); } }; }));

  // ── ONLINE: open, pack, let the forecast land ─────────────────────────────
  await page.goto(base + "?route=" + ROUTE_ID, { waitUntil: "domcontentloaded", timeout: 120000 });
  let t = await waitText(/North Ridge/, 90000);
  check("online: the route page opens for the signed-in climber", /North Ridge/.test(t));
  t = await waitText(/Trip pack/, 30000);
  check("online: the Trip pack button is there", await tapExact("Trip pack"));
  t = await waitText(/latest reports and corrections open with no signal|couldn’t be saved|Couldn't save/, 60000);
  check("pack: the toast says the reports and corrections were saved", /the beta, latest reports and corrections open with no signal/.test(t), (t.match(/Saved to this device[^\n]*|Couldn't save[^\n]*/) || [""])[0]);
  let pk = null;
  for (let i = 0; i < 90; i++) { pk = await idbPack(); if (pk && pk.wx) break; await page.waitForTimeout(1000); }
  check("pack: the other climber's report is in the saved snapshot", pk && pk.snap && pk.snap.reports.some((n) => n.includes(TAG)), JSON.stringify(pk && pk.snap));
  check("pack: the correction is in the saved snapshot", pk && pk.snap && pk.snap.contribs.some((c) => c.startsWith("ropeNote:" + TAG)));
  check("pack: the reporter's public profile is saved with it", pk && pk.snap && pk.snap.profiles.includes(other.id));
  check("pack: a forecast snapshot was taken while the page was open", pk && pk.wx && pk.wx.keys.length > 0, JSON.stringify(pk && pk.wx));
  const itinCached = await page.evaluate((uid) => new Promise((res) => { const rq = indexedDB.open("climbmatch-offline"); rq.onsuccess = () => { const g = rq.result.transaction("meta").objectStore("meta").get("itineraries:" + uid); g.onsuccess = () => res(!!(g.result && g.result.map && g.result.map["wa_mount_baker_north_ridge"])); g.onerror = () => res(false); }; rq.onerror = () => res(false); }), me.id);
  check("pack: my own plan is mirrored to this device", itinCached);

  // ── NO SIGNAL: data network cut, page reloaded ────────────────────────────
  await context.route(/supabase\.co|open-meteo\.com|api\.weather\.gov|api\.met\.no/, (r) => r.abort("internetdisconnected"));
  await page.goto(base + "?route=" + ROUTE_ID, { waitUntil: "domcontentloaded", timeout: 120000 });
  t = await waitText(/North Ridge/, 90000);
  check("offline: a ?route= link to a packed route still opens it", /North Ridge/.test(t));

  const tabText = async (label, re, ms = 45000) => { await tapExact(label); return await waitText(re, ms); };
  t = await waitText(new RegExp(TAG + " rope note"), 30000);
  if (!new RegExp(TAG + " rope note").test(t)) t = await tabText("Plan", new RegExp(TAG + " rope note"), 20000);
  check("offline: the other climber's correction is applied (ROPEWORK note)", new RegExp(TAG + " rope note").test(t));

  t = await tabText("Overview", /saved with your trip pack/, 20000);
  check("offline: Overview's conditions summary says it reads the pack's saved reports, and how old", /No signal — this reads the trip reports saved with your trip pack (just now|\d+ min ago)/.test(t));
  t = await tabText("Reports", /saved with your trip pack/);
  check("offline: the Reports tab says its reports are the pack's saved copy, and how old", /No signal — these are the \d+ trip reports? saved with your trip pack (just now|\d+ min ago)/.test(t), (t.match(/[^\n]*trip report[^\n]*/) || [""])[0]);
  check("offline: the other climber's report is on screen", t.includes(TAG + " report") || /Firm snow/.test(t));
  check("offline: Reports does NOT say 'be the first to log this climb'", !/be the first to log this climb/.test(t));

  t = await tabText("Plan", new RegExp(TAG + " approach"));
  check("offline: my own 2-day plan is on the Plan tab", t.includes(`Day 1: ${TAG} approach to high camp`) && t.includes(`Day 2: ${TAG} summit and out`));

  t = await tabText("Safety", /forecast saved with your trip pack|Forecast unavailable/, 60000);
  check("offline: the forecast renders from the pack and says so", /No signal — this is the forecast saved with your trip pack/.test(t), (t.match(/[^\n]*[Ff]orecast[^\n]*/) || [""])[0]);

  t = await tabText("Photos", /photos/i, 20000);
  check("offline: Photos does not claim the route has none", !/No photos yet/i.test(t));

  t = await tabText("Plan", /Updated|In your trip pack/, 20000);
  check("offline: the pack card shows its age", /Updated (just now|\d+ min ago)/.test(t));
  check("offline: the pack card lists the saved reports, corrections and forecast", /Latest \d+ trip reports?/.test(t) && /Community corrections/.test(t) && /Forecast · /.test(t));

  check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));
} catch (e) {
  check("run completed", false, e && e.stack ? e.stack.split("\n").slice(0, 3).join(" ") : String(e));
} finally {
  for (const p of written.reverse()) { await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { method: "DELETE", headers: headers(KEY) }).catch(() => {}); }
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); if (left.length) log("LEAKED fixture accounts: " + left.join(", ")); }
  const leftRows = await Promise.all(written.map((p) => fetch(`${SUPABASE_URL}/rest/v1/${p}&select=*`, { headers: headers(KEY) }).then((r) => r.json()).then((b) => Array.isArray(b) ? b.length : 0).catch(() => 0)));
  if (leftRows.some(Boolean)) log("LEAKED rows: " + written.filter((_, i) => leftRows[i]).join(", "));
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? "FAILED " + failed.length + " of " + results.length : "ok — " + results.length + " checks"}`);
process.exit(failed.length || !results.length ? 1 : 0);
