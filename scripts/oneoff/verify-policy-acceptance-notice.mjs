// An existing account is asked to accept the current policy — and is NOT asked twice.
//
// The false-positive is the dangerous side here: showing a legal notice to somebody who has
// already accepted is worse than not showing it, because it trains people to tap past it. So
// the run asserts the notice appears, that accepting records the version, that it then
// disappears, and that a reload does not bring it back.
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import pwPkg from "/Users/nathanbarber/dev/Climbing-App/node_modules/playwright-core/index.js";
const { chromium } = pwPkg;
const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/top-contributors-photo-crew-resume";
const { createFixture, sessionForStorage, STORAGE_KEY } = await import(ROOT + "/scripts/lib/ui-fixture.mjs");
const { loadEnv } = await import(ROOT + "/scripts/lib/supabase-env.mjs");
const { POLICY_VERSION } = await import(ROOT + "/lib/policy.js");
const env = loadEnv();
const SB = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_KEY;
const svcH = { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json" };
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; process.exitCode = 1; };
const signIn = async (u) => (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) })).json());
const stored = async (id) => (await (await fetch(`${SB}/rest/v1/profiles?id=eq.${id}&select=terms_accepted_version,terms_accepted_at`, { headers: svcH })).json())[0] || {};

let f = null, browser = null, server = null, restoreEnv = null;
try {
  f = await createFixture(() => {});
  const sess = await signIn(f.owner);

  // The fixture creates accounts through the admin API, which sends no terms metadata — the
  // same state every real account on this project is in. Confirmed rather than assumed.
  const before = await stored(f.owner.id);
  if (!before.terms_accepted_version) ok("the account starts with NO acceptance recorded — the real-world state");
  else fail("fixture already carried an acceptance: " + JSON.stringify(before));

  const port = await (async () => { for (let p = 5980; p < 6020; p++) { const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); }); if (free) return p; } })();
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  const envLocal = ROOT + "/.env.local", hidden = envLocal + ".probe-hidden";
  if (fs.existsSync(envLocal)) { fs.renameSync(envLocal, hidden); restoreEnv = () => fs.existsSync(hidden) && fs.renameSync(hidden, envLocal); }
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore",
    env: { ...process.env, VITE_SUPABASE_URL: SB, VITE_SUPABASE_ANON_KEY: ANON, VITE_USE_DB: "true", VITE_DEMO_AUTOLOGIN: "" } });
  let up = false;
  for (let i = 0; i < 150; i++) { try { const x = await fetch(base); if (x.ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 2000)); }
  if (!up) { fail("dev server never came up"); throw new Error("no server"); }

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 180)));
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(sessionForStorage(sess))]);
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 200000 });
  await page.waitForTimeout(13000);
  const txt = () => page.evaluate(() => document.body.innerText);
  const boot = await txt();
  if (/This screen hit a bug/.test(boot)) { fail("app crashed: " + boot.slice(0, 160)); throw new Error("crashed"); }
  ok("app is on screen");

  if (/Please review our Terms and Privacy Policy|Terms and Privacy Policy have changed/.test(boot)) ok("the notice is shown to an account with no acceptance on file");
  else fail("no notice appeared: " + boot.slice(0, 200));
  if (new RegExp(POLICY_VERSION.replace(/-/g, ".")).test(boot) || /August 19, 2026/.test(boot)) ok("and it names the version being accepted");
  else fail("the notice does not say which version");

  // Reading must NOT count as accepting.
  const readOpened = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "Read Terms"); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(2500);
  if (readOpened) {
    const onTerms = await txt();
    if (/Acceptance|Climbing is dangerous/i.test(onTerms)) ok("Read Terms opens the actual document");
    else fail("Read Terms did not open the Terms: " + onTerms.slice(0, 140));
    const afterRead = await stored(f.owner.id);
    if (!afterRead.terms_accepted_version) ok("and reading it records NOTHING — reading is not agreeing");
    else fail("merely opening the Terms recorded an acceptance");
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => /^(←|Back)/.test((e.innerText || "").trim())); if (b) b.click(); });
    await page.waitForTimeout(2500);
  } else fail("no Read Terms control");

  const back = await txt();
  if (/Please review our Terms|have changed/.test(back)) ok("the notice is still there after reading — nothing about reading dismissed it");
  else fail("the notice vanished after reading the document");

  // Accept.
  const accepted = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "I accept"); if (b) { b.click(); return true; } return false; });
  if (!accepted) fail("no 'I accept' control");
  await page.waitForTimeout(6000);
  const after = await stored(f.owner.id);
  if (after.terms_accepted_version === POLICY_VERSION) ok("accepting records the current version: " + after.terms_accepted_version);
  else fail("recorded " + JSON.stringify(after));
  if (after.terms_accepted_at) ok("with a timestamp"); else fail("no timestamp recorded");

  const post = await txt();
  if (!/Please review our Terms|have changed/.test(post)) ok("and the notice goes away");
  else fail("the notice is still on screen after accepting");

  // The false positive that matters: it must not come back.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 200000 });
  await page.waitForTimeout(13000);
  const reloaded = await txt();
  if (!/Please review our Terms|have changed/.test(reloaded)) ok("and does NOT return on reload — nobody is asked twice");
  else fail("the notice reappeared after accepting, which would train people to tap past it");

  if (errs.length) fail("page errors: " + errs.join(" | ")); else ok("no page errors");
} catch (e) { fail("threw: " + e.message); }
finally {
  if (restoreEnv) restoreEnv();
  if (browser) await browser.close();
  if (server) server.kill();
  if (f) { const l = await f.cleanup().catch(() => ["threw"]); console.log("  accounts left:", l && l.length ? l : "none"); }
  console.log(bad ? `\n${bad} FAILED` : "\nall assertions passed");
}
