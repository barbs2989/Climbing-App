import { NPX, NPX_PRE } from "../lib/npx.mjs";
// probe: AFTER A SHARED CLIMB, between two REAL accounts (PostClimbSheet, owner 2026-11-23).
//
// The sheet opens at two moments a climb becomes shared, and neither can be reached on seed data:
//   1. the PARTNER answers "I was there" to a real log that tags them (log_tags_for_me -> LogTagRow);
//   2. the LOGGER saves a log that tags a real account they found by SEARCH (neither friend nor crewmate:
//      App could not name such an id until the log form handed back partnerPeople).
// Every write the sheet leads to is checked in the DATABASE, not on screen: the confirmation, the vouch,
// the "Log it too" log (and that it tags the partner back, so THEY are asked to confirm), and the crew
// invite from "Climb with them again". Writes are made under each account's OWN JWT (the mate's REST
// calls) or by the app itself (the owner in Chrome) -- never the service key, which bypasses RLS and
// would prove nothing. The service key only SETS UP (createFixture) and READS the result.
//
// The two accounts are made NOT friends and NOT crewmates first (createFixture seats them as both):
// that is the case where the tagger's name used to fall through to "typed names" in the log form.
//
// Per-run accounts (createFixture), deleted in finally, and the deletion is asserted. Local only: it
// needs the service key. Run through ~/dev/db-throttle/dbslot.mjs. Screenshots go to --shots DIR.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-after-a-shared-climb.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = (() => { const i = process.argv.indexOf("--shots"); return i > 0 ? process.argv[i + 1] : null; })();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SUPA = SUPABASE_URL.replace(/\/$/, "");
const ANON = anonKey();
const SH = headers(requireServiceKey());
const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const svc = async (p, opts = {}) => { const r = await fetch(`${SUPA}/rest/v1/${p}`, { ...opts, headers: { ...SH, ...(opts.headers || {}) } }); const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const asUser = async (tok, p, opts = {}) => { const r = await fetch(`${SUPA}/rest/v1/${p}`, { ...opts, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(opts.headers || {}) } }); const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };

async function waitForServer(url, tries = 90) { for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch { /* not up yet */ } await sleep(1000); } return false; }
function claimPort(start, span = 40) { return new Promise((resolve, reject) => { let p = start; const tryOne = () => { if (p >= start + span) return reject(new Error("no free port")); const s = net.createServer(); s.once("error", () => { p++; tryOne(); }); s.once("listening", () => s.close(() => resolve(p))); s.listen(p, "127.0.0.1"); }; tryOne(); }); }

let fixture = null, server = null, browser = null;
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png") }); };
const sheet = (page) => page.getByRole("dialog", { name: /^Climbed together/ });

try {
  const port = await claimPort(5630);
  const base = `http://127.0.0.1:${port}/`;
  server = spawn(NPX, [...NPX_PRE, "vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) throw new Error("dev server never came up");
  await fetch(base + "ClimbMatch.jsx").catch(() => {});

  fixture = await createFixture(log);
  const owner = fixture.owner, mate = fixture.mate, ownerId = fixture.session.user.id;
  const ownerTok = fixture.session.access_token;
  const tr = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: mate.email, password: mate.password }) });
  const mateTok = (await tr.json()).access_token;
  must(!!mateTok, "the mate signed in with its own session");

  // ---- NOT friends, NOT crewmates (the case bug #1 lived in) ----
  await svc(`connections?or=(and(requester.eq.${ownerId},addressee.eq.${mate.id}),and(requester.eq.${mate.id},addressee.eq.${ownerId}))`, { method: "DELETE" });
  const ownCrews = (await svc(`crews?select=id,created_by&created_by=in.(${ownerId},${mate.id})`)).body || [];
  for (const c of ownCrews) await svc(`crew_members?crew_id=eq.${c.id}&user_id=eq.${c.created_by === ownerId ? mate.id : ownerId}`, { method: "DELETE" });
  const conn = (await svc(`connections?select=id&or=(requester.eq.${ownerId},addressee.eq.${ownerId})`)).body;
  must(Array.isArray(conn) && conn.length === 0, "setup: the two accounts are not friends");

  // ---- three real routes: two for the mate's logs, one the owner logs themselves ----
  const rr = (await svc(`routes?select=id,name,area_id&name=not.is.null&id=like.wa_*&order=id&limit=3&offset=40`)).body;
  must(Array.isArray(rr) && rr.length === 3, "three catalog routes to log");
  const [R1, R2, R3] = rr;
  log(`  routes: ${R1.name} | ${R2.name} | ${R3.name}`);

  // ---- the MATE logs two climbs that tag the owner, under the mate's own JWT (as syncLogToDb writes) ----
  const mk = async (r, day) => (await asUser(mateTok, "climb_logs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: mate.id, route_id: r.id, discipline: "alpine", date_climbed: day, tick_type: "Summit", partners: [ownerId], party_size: 2 }) }));
  const l1 = await mk(R1, "2026-11-15"), l2 = await mk(R2, "2026-11-08");
  must(l1.status === 201 && l2.status === 201, `the mate's two tagged logs were written (${l1.status}, ${l2.status})`);
  const L1 = l1.body[0].id;
  const tagsCtl = await asUser(ownerTok, "rpc/log_tags_for_me", { method: "POST", body: "{}" });
  must(Array.isArray(tagsCtl.body) && tagsCtl.body.filter((t) => t.author_id === mate.id).length === 2, "control: the owner's log_tags_for_me lists both tags");

  // ---- the OWNER in Chrome, at phone width ----
  try { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 }); } catch { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 240000 }); }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
  const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }, [STORAGE_KEY, JSON.stringify(sessionForStorage(fixture.session))]);
  await page.goto(base, { waitUntil: "domcontentloaded" });

  const openBell = async () => { await page.getByRole("button", { name: /^Notifications/ }).first().click(); };
  await openBell();
  const confirm1 = page.getByRole("button", { name: new RegExp("^Confirm you climbed " + R1.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first();
  await confirm1.waitFor({ timeout: 90000 });
  await shot(page, "1-bell-tag");
  await confirm1.click();

  // 1. "I was there" opens the sheet
  await sheet(page).waitFor({ timeout: 20000 });
  const st1 = await sheet(page).innerText();
  must(/You climbed with/.test(st1) && st1.includes(R1.name), "I was there opens the sheet for that climb");
  must(/Confirmed/.test(st1), "the sheet says the answer was recorded");
  must(!/A climber/.test(st1), "the partner is named, not 'A climber'");
  must(/Log it too/.test(st1) && /Climb with them again/.test(st1), "it offers Log it too and Climb with them again");
  const sbox = await sheet(page).locator("div").first().boundingBox();
  must(sbox && sbox.width <= 390.5, `the sheet fits the 390px phone width (${sbox && Math.round(sbox.width)}px)`);
  await shot(page, "2-sheet");
  const conf = (await svc(`climb_log_confirmations?log_id=eq.${L1}&partner_id=eq.${ownerId}&select=verdict`)).body;
  must(Array.isArray(conf) && conf[0] && conf[0].verdict === "confirmed", "DB: the confirmation was stored");

  // 2. Vouch, over the sheet
  await sheet(page).getByRole("button", { name: /^Vouch for / }).click();
  const post = page.getByRole("button", { name: "Post vouch" });
  await post.waitFor({ timeout: 20000 });
  await shot(page, "3-vouch-form");
  const choose = page.getByRole("button", { name: "Choose" }).first();
  if (await choose.count()) await choose.click().catch(() => {});
  await post.scrollIntoViewIfNeeded(); await post.click();
  await page.getByText("Vouched", { exact: true }).waitFor({ timeout: 20000 }).catch(() => {});
  must(/Vouched/.test(await sheet(page).innerText().catch(() => "")), "the sheet is still open and the row reads Vouched");
  await shot(page, "4-vouched");
  await sleep(1500);
  const vv = (await svc(`vouches?from_id=eq.${ownerId}&to_id=eq.${mate.id}&select=id`)).body;
  must(Array.isArray(vv) && vv.length === 1, "DB: the vouch is stored, from the owner to the mate");

  // 3. Log it too
  await sheet(page).getByRole("button", { name: "Log it too" }).click();
  await page.getByText("CLIMBED WITH", { exact: true }).waitFor({ timeout: 30000 });
  const dateVal = await page.locator('input[type="date"]').first().inputValue().catch(() => "");
  must(dateVal === "2026-11-15", `the log form opens on the day climbed (${dateVal})`);
  await shot(page, "5-log-form");
  await page.getByRole("button", { name: "Summit", exact: true }).first().click().catch(() => {});
  const save = page.getByRole("button", { name: /Log it$/ }).last();
  await save.scrollIntoViewIfNeeded(); await save.click();
  await sleep(5000);
  const mine = (await svc(`climb_logs?user_id=eq.${ownerId}&route_id=eq.${R1.id}&select=id,date_climbed,partners`)).body;
  const my1 = Array.isArray(mine) ? mine.find((l) => l.date_climbed === "2026-11-15") : null;
  must(!!my1 && (my1.partners || []).includes(mate.id), "DB: the owner's own log of the climb is stored, tagging the mate");
  if (my1) {
    const pn = (await svc(`climb_log_partner_names?log_id=eq.${my1.id}&select=names`)).body;
    const typed = Array.isArray(pn) && pn[0] ? pn[0].names : [];
    must(!typed.some((n) => /robin|belay/i.test(n)), `the mate was tagged as a profile, not stored as a typed name (${JSON.stringify(typed)})`);
  }
  const back = await asUser(mateTok, "rpc/log_tags_for_me", { method: "POST", body: "{}" });
  must(Array.isArray(back.body) && back.body.some((t) => t.author_id === ownerId && t.route_id === R1.id), "the mate is now asked to confirm the owner's log (logged together)");
  must(!(await sheet(page).count()), "the sheet does not reopen for the climb just logged");

  // 4. Climb with them again, from the second tag
  await page.keyboard.press("Escape").catch(() => {});
  await openBell();
  const confirm2 = page.getByRole("button", { name: new RegExp("^Confirm you climbed " + R2.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first();
  await confirm2.waitFor({ timeout: 60000 });
  await confirm2.click();
  await sheet(page).waitFor({ timeout: 20000 });
  await sheet(page).getByRole("button", { name: "Climb with them again" }).click();
  const again = page.getByRole("dialog", { name: /^Climb again with/ });
  await again.waitFor({ timeout: 30000 });
  await shot(page, "6-climb-again");
  const t0 = new Date(Date.now() - 5000).toISOString();
  const pick = again.getByRole("button").filter({ hasText: R1.name }).first();
  if (await pick.count()) await pick.click(); else await again.getByRole("button").filter({ hasText: /Kings|Peak|Route|Ridge|Wall/ }).first().click();
  await sleep(6000);
  const newCrews = (await svc(`crews?created_by=eq.${ownerId}&created_at=gte.${t0}&select=id,route_id`)).body;
  const nc = Array.isArray(newCrews) ? newCrews[0] : null;
  must(!!nc, "DB: Climb with them again created a crew");
  if (nc) {
    const mm = (await svc(`crew_members?crew_id=eq.${nc.id}&user_id=eq.${mate.id}&select=status`)).body;
    must(Array.isArray(mm) && mm[0] && mm[0].status === "invited", `DB: the mate is invited to it (${JSON.stringify(mm)})`);
  }
  await shot(page, "7-crew-formed");

  // 5. The LOGGER's side: the owner logs a third climb and tags the mate found by SEARCH
  await page.goto(base + "?route=" + encodeURIComponent(R3.id), { waitUntil: "domcontentloaded" });
  const full = page.getByRole("button", { name: "Full log" }).first();
  await full.waitFor({ timeout: 90000 });
  await full.click();
  const search = page.getByRole("textbox", { name: /^Search friends, crews or ClimbMatch/ });
  await search.waitFor({ timeout: 30000 });
  await search.fill(mate.username);
  const tagBtn = page.getByRole("button", { name: /^Tag / }).first();
  await tagBtn.waitFor({ timeout: 30000 });
  await tagBtn.click();
  await page.getByRole("button", { name: "Summit", exact: true }).first().click().catch(async () => { await page.getByRole("button", { name: "Send", exact: true }).first().click().catch(() => {}); });
  const save3 = page.getByRole("button", { name: /Log it$/ }).last();
  await save3.scrollIntoViewIfNeeded(); await save3.click();
  await sheet(page).waitFor({ timeout: 15000 }).catch(() => {});
  const st3 = await sheet(page).innerText().catch(() => "");
  must(/You climbed with/.test(st3) && st3.includes(R3.name), "the logger's save opens the sheet for a partner found by search");
  must(!/Log it too/.test(st3), "the logger is not offered Log it too (it is already logged)");
  await shot(page, "8-logger-sheet");

  must(errs.length === 0, `no page errors (${errs.slice(0, 3).join(" | ")})`);
} catch (e) {
  bad++; console.error("ERROR:", e && e.stack ? e.stack.split("\n").slice(0, 3).join(" / ") : e);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fixture) {
    const left = await fixture.cleanup();
    must(left.length === 0, `cleanup: both accounts deleted (${left.join(",") || "none left"})`);
    const ids = [fixture.owner.id, fixture.mate.id].join(",");
    for (const [t, col] of [["climb_logs", "user_id"], ["vouches", "from_id"], ["crews", "created_by"], ["crew_members", "user_id"], ["climb_log_confirmations", "partner_id"]]) {
      const r = await svc(`${t}?${col}=in.(${ids})&select=*`, { headers: { Prefer: "count=exact", Range: "0-0" } });
      must(Array.isArray(r.body) && r.body.length === 0, `cleanup: no ${t} rows left`);
    }
  }
  if (server) { try { if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"]); else server.kill(); } catch { /* already gone */ } }
  console.log(`\n${asserted - bad}/${asserted} passed${bad ? ` — ${bad} FAILED` : ""}`);
  process.exitCode = bad ? 1 : 0;
}
