// A BRAND-NEW CLIMBER TRIES TO FIND A PARTNER (owner note: "Go through trying to find a partner like you are
// new to the app. What pain points or barriers would one feel?").
//
// Not a guard: an audit walk. It makes ONE throwaway account the way sign-up does (admin create with the
// terms version, no username, no profile), signs into the LIVE site (or a local vite with --local), steps
// through onboarding as a climber would (username, skip photo, home town, trad + sport with grades,
// experience, gender, alerts), takes the "Find partners" next step, and walks every Find partners choice a
// newcomer would try, saving a 390px screenshot and the screen's text at each step to OUT. The account is
// deleted at the end (and on failure). Needs the service key; run under the DB slot.
//
//   node scripts/oneoff/probe-new-climber-finds-a-partner.mjs [outDir] [--local]
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
import { POLICY_VERSION } from "../../lib/policy.js";

assertQuietBox("probe-new-climber-finds-a-partner.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOCAL = process.argv.includes("--local");
const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) || path.join(ROOT, "probe-out", "new-climber");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5288, base = LOCAL ? `http://127.0.0.1:${PORT}/Climbing-App/` : "https://barbs2989.github.io/Climbing-App/";
const KEY = requireServiceKey();
const auth = async (p, opts = {}) => { const r = await fetch(SUPABASE_URL + "/auth/v1/" + p, { ...opts, headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) } }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const rest = async (p, opts = {}) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { ...opts, headers: headers(KEY, { "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) }) }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server, browser, user;
try {
  if (LOCAL) server = spawn(NPX, [...NPX_PRE, "vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) break; } catch {} await sleep(1000); }
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-newclimber-${stamp}@climbmatch-qa.invalid`, password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const c = await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Sam Newcomer", terms_version: POLICY_VERSION } }) });
  if (c.status >= 300) throw new Error("create user " + c.status + " " + JSON.stringify(c.body));
  user = { id: c.body.id, username: ("samnew_" + stamp).slice(0, 20) };
  const s = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then((r) => r.json());
  log("new account " + user.id.slice(0, 8));

  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
  await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(s)) });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await sleep(10000);
  let n = 0;
  const snap = async (name) => {
    n++; const tag = String(n).padStart(2, "0") + "-" + name;
    const text = await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].pop(); return ((d && d.innerText) || "") + "\n=====PAGE=====\n" + (document.getElementById("appscroll")?.innerText || document.body.innerText); });
    fs.writeFileSync(path.join(OUT, tag + ".txt"), text);
    await page.screenshot({ path: path.join(OUT, tag + ".png") });
    log("  snap " + tag);
  };
  const tap = async (re, scope) => page.evaluate(({ src, scope }) => { const re = new RegExp(src); const root = (scope === "dialog" ? [...document.querySelectorAll('[role="dialog"]')].pop() : null) || document; const els = [...root.querySelectorAll('button,[role="button"],a,[role="tab"],[role="switch"]')].filter((e) => re.test(((e.getAttribute("aria-label") || "") + " " + (e.textContent || "")).trim()) && !e.disabled && e.offsetParent !== null); if (!els[0]) return null; els[0].scrollIntoView({ block: "center" }); els[0].click(); return (els[0].textContent || els[0].getAttribute("aria-label") || "").trim().slice(0, 60); }, { src: re.source, scope });
  const scrollShots = async (name, k = 3) => { for (let i = 0; i < k; i++) { await snap(name + "-s" + i); const more = await page.evaluate(() => { const sc = document.getElementById("appscroll") || document.scrollingElement; const b = sc.scrollTop; sc.scrollTop += 700; return sc.scrollTop > b; }); if (!more) break; await sleep(700); } await page.evaluate(() => { const sc = document.getElementById("appscroll") || document.scrollingElement; sc.scrollTop = 0; }); };

  // ── ONBOARDING, as a newcomer answers it ──
  await snap("first-screen");
  for (let i = 0; i < 16; i++) {
    const t = await page.evaluate(() => document.body.innerText);
    if (/Welcome to Climb/.test(t) && /Set up my profile/.test(t)) { await tap(/^Set up my profile/); }
    else if (/Choose your username|Username/.test(t) && await page.$('input[placeholder="yourname"]')) { await page.fill('input[placeholder="yourname"]', user.username); await sleep(2500); await tap(/^Continue$/, "dialog") || await tap(/^Continue$/); }
    else if (await page.$('input[aria-label="Your home town or city"]')) { await page.fill('input[aria-label="Your home town or city"]', "Seattle"); await sleep(3000); const picked = await page.evaluate(() => { const l = document.querySelector('[aria-label="Matching towns"]'); const b = l && l.querySelector("button,[role=option]"); if (b) { b.click(); return b.textContent; } return null; }); log("  town: " + picked); await sleep(1500); await snap("onb-home"); await tap(/^Continue$/); }
    else if (await page.$('[aria-label="Disciplines"]') && !/Your grades/.test(t)) { await page.evaluate(() => { const g = document.querySelector('[aria-label="Disciplines"]'); for (const b of g.querySelectorAll("button")) if (/^(Sport|Trad)/.test(b.textContent.trim()) && b.getAttribute("aria-pressed") !== "true") b.click(); }); await sleep(800); await snap("onb-climb"); await tap(/^Continue$/); }
    else if (/Your grades/.test(t)) { await page.evaluate(() => { for (const s of document.querySelectorAll("select")) { const o = [...s.options].find((o) => /^5\.9$|^5\.10a$/.test(o.value || o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); } } }); await sleep(800); await snap("onb-grades"); await tap(/^Continue$/); }
    else if (await page.$('[aria-label="Experience level"]')) { await page.evaluate(() => { const g = document.querySelector('[aria-label="Experience level"]'); const b = [...g.querySelectorAll("button")].find((b) => /Intermediate/.test(b.textContent)); b && b.click(); const gg = document.querySelector('[aria-label="Gender"]'); const w = gg && [...gg.querySelectorAll("button")].find((b) => /^Woman|^Women|^Female/.test(b.textContent.trim())); w && w.click(); }); await sleep(800); await snap("onb-about"); (await tap(/^Continue$/)) || (await tap(/^Finish setup$/)); }
    else if (/You’re all set/.test(t)) { await snap("onb-done"); break; }
    else { const w = await tap(/^(Continue|Skip for now|Finish setup|Next)$/); log("  onboarding step: " + (w || "nothing to tap")); if (!w) { await snap("onb-stuck"); break; } }
    await sleep(2500);
  }
  // ── The "Find partners" next step, or the tab itself ──
  const np = await tap(/[Ff]ind (a )?(climbing )?partner/);
  log("  next step tapped: " + np);
  await sleep(6000);
  if (!/Find a climbing partner/.test(await page.evaluate(() => document.body.innerText))) { await tap(/^Partners$|^Discover$/); await sleep(5000); }
  await scrollShots("partners-default", 4);
  for (const [label, name] of [[/^Everyone$/, "everyone"], [/^By Route$/, "by-route"], [/^By Peak$/, "by-peak"], [/^By Area$/, "by-area"]]) {
    await tap(label); await sleep(5000); await scrollShots(name, name === "everyone" ? 4 : 2);
  }
  // By Area: a newcomer types the crag they know.
  const box = await page.$('input[type="search"], input[placeholder*="rag"], input[placeholder*="rea"]');
  if (box) { await box.fill("Index"); await sleep(4000); await snap("by-area-typed"); await page.evaluate(() => { const b = [...document.querySelectorAll("button,[role=option]")].find((b) => /^Index/.test((b.textContent || "").trim())); b && b.click(); }); await sleep(6000); await scrollShots("by-area-index", 3); }
  // Everyone again, then a climber's card → profile, as a newcomer would to decide.
  await tap(/^Everyone$/); await sleep(5000);
  const opened = await page.evaluate(() => { const h = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^All climbers/.test((e.textContent || "").trim())); if (!h) return null; const all = [...document.querySelectorAll("button")]; const b = all.find((x) => h.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING && x.querySelector("img, [aria-hidden]") && (x.textContent || "").trim().length > 1); if (b) { b.click(); return b.textContent; } return null; });
  log("  opened card: " + opened); await sleep(4000); await snap("profile-from-card");
  await page.keyboard.press("Escape"); await sleep(1000);
  await tap(/^Join a crew$/); await sleep(5000); await scrollShots("join-a-crew", 3);
  // Home as a newcomer who has just been through all that.
  await tap(/^Home$/); await sleep(5000); await scrollShots("home", 2);
  log("page errors: " + (errs.join(" | ") || "none"));
} catch (e) { console.error("PROBE ERROR", e); process.exitCode = 1; }
finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (user) { const d = await auth(`admin/users/${user.id}`, { method: "DELETE" }); log("deleted account: " + d.status); const left = await rest(`profiles?id=eq.${user.id}&select=id`); log("profile rows left: " + JSON.stringify(left.body)); }
}
