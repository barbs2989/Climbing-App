// Verifies the two things the guards do NOT assert: that partner browse actually lists a
// real climber, and that the Settings toggle both persists to profiles.discoverable AND
// removes that person from the other account's browse list.
//
// Two accounts is the point. A solo probe can prove the toggle writes a row; only a second
// real account can prove the row changes what somebody else sees, which is the entire
// promise the setting makes.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { createFixture, sweepOrphans, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEY = requireServiceKey();
const log = (...a) => console.log(...a);
const results = [];
const rec = (name, ok, detail) => { results.push({ name, ok }); log(`  [${ok ? "ok    " : "FAIL  "}] ${name}${detail ? " — " + detail : ""}`); };

const claimPort = (start, span = 40) => new Promise((resolve, reject) => {
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
const waitForServer = async (url, tries = 90) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};
const signInAs = async (u) => {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  const b = await r.json();
  if (!b || !b.access_token) throw new Error("could not sign in as " + u.email);
  return b;
};
const dbDiscoverable = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=discoverable`, { headers: headers(KEY) });
  const b = await r.json().catch(() => []);
  return Array.isArray(b) && b[0] ? b[0].discoverable : null;
};

let server = null, browser = null, fixture = null;
try {
  await sweepOrphans(log);
  const port = await claimPort(5430);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`dev server on ${port}...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) { console.error("dev server never came up"); process.exit(1); }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  fixture = await createFixture(log);
  const { owner, mate } = fixture;
  const mateSession = await signInAs(mate);
  log(`  owner=${owner.name} (${owner.id.slice(0, 8)})  mate=${mate.name} (${mate.id.slice(0, 8)})\n`);

  const open = async (session) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await ctx.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(session)) });
    const page = await ctx.newPage();
    return page;
  };
  const gotoPartners = async (page) => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Partners", exact: true }).first().click();
    await page.waitForTimeout(4000);
    return page.innerText("body");
  };

  // ---- 1) the browse list exists and names a real climber ---------------------------
  const pageOwner = await open(fixture.session);
  let t = await gotoPartners(pageOwner);
  if (!/CLIMBERS ON CLIMBMATCH/i.test(t)) {
    rec("partner browse shows a real-climbers section", false, "the section heading never rendered");
  } else {
    rec("partner browse shows a real-climbers section", true);
    // The mate is a real discoverable account, so the owner must be able to see them
    // WITHOUT typing a name — that is the whole point of the change.
    if (t.includes(mate.name)) rec("a real climber is listed without searching by name", true, `found ${mate.name}`);
    else rec("a real climber is listed without searching by name", false, `${mate.name} is discoverable but is not in the browse list`);
    // And must never list yourself.
    const secStart = t.indexOf("CLIMBERS ON CLIMBMATCH");
    const sec = t.slice(secStart, secStart + 900);
    if (sec.includes(owner.name)) rec("browse does not list you to yourself", false, "the signed-in account appears in its own browse list");
    else rec("browse does not list you to yourself", true);
    // The honest-card regression guard: a real profile carries no level/trust/pace, and the
    // seed card printed those as "undefined · 0" (#715).
    if (/undefined|NaN|\[object Object\]/.test(sec)) rec("the real-climber rows render no placeholder junk", false, "undefined/NaN in the browse section");
    else rec("the real-climber rows render no placeholder junk", true);
  }

  // ---- 2) the Settings toggle persists ----------------------------------------------
  const pageMate = await open(mateSession);
  await pageMate.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await pageMate.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 });
  await pageMate.waitForTimeout(2000);
  await pageMate.getByRole("button", { name: "Profile", exact: true }).first().click();
  await pageMate.waitForTimeout(2500);
  const settings = pageMate.getByRole("button", { name: /^Settings/ }).first();
  if (!(await settings.count())) {
    rec("the discoverability toggle is reachable in Settings", false, "no Settings control on the profile tab");
  } else {
    await settings.click();
    await pageMate.waitForTimeout(3000);
    const toggle = pageMate.getByRole("button", { name: "Toggle partner browse listing" }).first();
    if (!(await toggle.count())) {
      rec("the discoverability toggle is reachable in Settings", false, "the toggle did not render in the settings sheet");
    } else {
      rec("the discoverability toggle is reachable in Settings", true);
      const before = await dbDiscoverable(mate.id);
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await pageMate.waitForTimeout(4000);
      const after = await dbDiscoverable(mate.id);
      if (before === true && after === false) rec("turning it off writes profiles.discoverable", true, "true -> false");
      else rec("turning it off writes profiles.discoverable", false, `stored value went ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    }
  }

  // ---- 3) and it actually removes them from the OTHER account's browse ---------------
  if ((await dbDiscoverable(mate.id)) === false) {
    const page2 = await open(fixture.session);
    const t2 = await gotoPartners(page2);
    const s2 = t2.indexOf("CLIMBERS ON CLIMBMATCH");
    const sec2 = s2 >= 0 ? t2.slice(s2, s2 + 900) : t2;
    if (sec2.includes(mate.name)) rec("an unlisted climber disappears from browse", false, `${mate.name} turned the setting off and is still listed to the other account`);
    else rec("an unlisted climber disappears from browse", true, "no longer listed to the other account");
  } else {
    rec("an unlisted climber disappears from browse", false, "could not turn the setting off, so this was never tested");
  }

  const bad = results.filter((r) => !r.ok);
  log(`\n${results.length} check(s): ${results.length - bad.length} ok, ${bad.length} failed`);
  if (bad.length) process.exitCode = 1;
} catch (e) {
  console.error("\nprobe ERRORED — nothing above is verified:\n", e?.stack || String(e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); log(left && left.length ? `LEAKED: ${left.join(", ")}` : "fixture accounts removed."); }
  if (server) server.kill();
}
