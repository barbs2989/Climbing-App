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
  // 0110 makes listing strictly opt-IN, so a freshly created account must NOT be listed.
  // Assert that first — it is the whole point of the default, and it is the one property
  // that cannot be checked after something has opted in.
  const freshDefault = await dbDiscoverable(mate.id);
  if (freshDefault === false) {
    rec("a brand-new account is not listed until it opts in", true, "profiles.discoverable defaults to false");
  } else {
    rec("a brand-new account is not listed until it opts in", false, `a new account was created with discoverable=${JSON.stringify(freshDefault)} — migration 0110_discoverable_defaults_off.sql has not been applied, so every new climber is listed without choosing to be`);
  }
  // Opt the mate in explicitly. With an opt-in default, a fixture account is unlisted, so
  // testing "a real climber appears in browse" against it would otherwise be testing nothing.
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${mate.id}`, {
    method: "PATCH", headers: { ...headers(KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ discoverable: true }),
  });
  if ((await dbDiscoverable(mate.id)) !== true) { throw new Error("could not opt the fixture mate in; nothing below would be meaningful"); }

  const mateSession = await signInAs(mate);
  log(`  owner=${owner.name} (${owner.id.slice(0, 8)})  mate=${mate.name} (${mate.id.slice(0, 8)})\n`);

  const open = async (session) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await ctx.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(session)) });
    const page = await ctx.newPage();
    return page;
  };
  const gotoPartners = async (page, until) => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Partners", exact: true }).first().click();
    let t = "";
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1500);
      t = await page.innerText("body");
      // Always wait for the section itself; `until` lets a caller wait for the specific
      // state it is about to assert on, so a slow fetch reads as slow rather than as absent.
      if (/CLIMBERS ON CLIMBMATCH/i.test(t) && (!until || until(t))) break;
    }
    return t;
  };

  // ---- 1) the browse list exists and names a real climber ---------------------------
  const pageOwner = await open(fixture.session);
  let t = await gotoPartners(pageOwner, (x) => x.includes(mate.name));
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

  // ---- 1b) an unlisted viewer is told THEY are unlisted -------------------------------
  // Listing is opt-in and defaults off, so "No other climbers are listed yet" is where every
  // new account lands. Accurate, and a dead end unless it says the one thing the reader can
  // act on. Shown only on an explicit false — never while the profile row is still loading,
  // which would tell someone they are unlisted when they are not.
  {
    const anon2 = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await anon2.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(fixture.session)) });
    const p2 = await anon2.newPage();
    // The mate was opted IN above so the listing case had someone to find, which means the
    // list is not empty and the empty state never renders. Un-list them for this one check,
    // then put it back — otherwise this asserts against a state the run cannot reach, and
    // "the prompt is missing" would be a property of the fixture rather than of the app.
    const setD = (id, v) => fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: "PATCH", headers: { ...headers(KEY), "Content-Type": "application/json" },
      body: JSON.stringify({ discoverable: v }),
    });
    await setD(mate.id, false);
    // Prove the un-listing actually landed before loading. Without this the page can race the
    // PATCH, render the mate, and the missing prompt becomes a statement about the fixture.
    for (let i = 0; i < 10 && (await dbDiscoverable(mate.id)) !== false; i++) await new Promise((r) => setTimeout(r, 500));
    if ((await dbDiscoverable(mate.id)) !== false) throw new Error("could not un-list the mate; the empty-state case would prove nothing");
    const t2 = await gotoPartners(p2, (x) => !x.includes(mate.name));
    const own = await dbDiscoverable(owner.id);
    if (own !== false) {
      rec("an unlisted viewer is prompted to list themselves", false, `NOT TESTED: the fixture owner is discoverable=${JSON.stringify(own)}, so the unlisted empty state was never on screen`);
    } else if (!/CLIMBERS ON CLIMBMATCH/i.test(t2)) {
      rec("an unlisted viewer is prompted to list themselves", false, "NOT TESTED: the browse section did not render, so its empty state proves nothing");
    } else if (/yours is off too/i.test(t2)) {
      rec("an unlisted viewer is prompted to list themselves", true, "the empty state says the reader is unlisted and offers the toggle");
    } else {
      rec("an unlisted viewer is prompted to list themselves", false, "browse is empty for an unlisted viewer and never mentions that their own listing is off — the one thing they can change");
    }
    await anon2.close();
    await setD(mate.id, true);
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
    const t2 = await gotoPartners(page2, (x) => !x.includes(mate.name));
    const s2 = t2.indexOf("CLIMBERS ON CLIMBMATCH");
    const sec2 = s2 >= 0 ? t2.slice(s2, s2 + 900) : t2;
    if (sec2.includes(mate.name)) rec("an unlisted climber disappears from browse", false, `${mate.name} turned the setting off and is still listed to the other account`);
    else rec("an unlisted climber disappears from browse", true, "no longer listed to the other account");
  } else {
    rec("an unlisted climber disappears from browse", false, "could not turn the setting off, so this was never tested");
  }

  // ---- 4) and an ANONYMOUS visitor sees no list at all -------------------------------
  // This is the regression this file exists for. Production builds with
  // VITE_DEMO_AUTOLOGIN=true (#584, so the app stays browsable without an account), which
  // makes realAuthGate false and leaves DB_UID null. A browse list gated only on USE_DB
  // therefore published real climbers' names, handles and cities to the open web — verified
  // live before it was fixed. The server above runs with the flag OFF, where a signed-out
  // visitor just gets the auth modal, so it cannot see this. Spin up a second one that
  // matches production.
  const port2 = await claimPort(port + 1);
  const base2 = `http://127.0.0.1:${port2}/Climbing-App/`;
  const server2 = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port2), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
  try {
    if (!(await waitForServer(base2))) {
      rec("an anonymous visitor is shown no climber list", false, "the demo-autologin dev server never came up, so this was not tested");
    } else {
      const anon = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const pa = await anon.newPage();
      await pa.goto(base2, { waitUntil: "domcontentloaded", timeout: 180000 });
      await pa.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 });
      await pa.waitForTimeout(2000);
      await pa.getByRole("button", { name: "Partners", exact: true }).first().click();
      await pa.waitForTimeout(6000);
      const ta = await pa.innerText("body");
      // Prove we actually reached partner browse before concluding the list is absent —
      // otherwise a screen that failed to load reads as a clean pass.
      if (!/Search for partners by/i.test(ta)) {
        rec("an anonymous visitor is shown no climber list", false, "could not confirm partner browse rendered, so absence proves nothing");
      } else if (/CLIMBERS ON CLIMBMATCH/i.test(ta)) {
        rec("an anonymous visitor is shown no climber list", false, "the real-climber section rendered with no account signed in — real names are public");
      } else {
        rec("an anonymous visitor is shown no climber list", true, "browse rendered, section absent");
      }
      await anon.close();
    }
  } finally { server2.kill(); }

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
