// What does a SIGNED-IN climber see when the database is down?
//
// scripts/oneoff/probe-db-failure-screens.mjs established that the cheap walks cannot answer
// this: under DEMO_AUTOLOGIN the six tabs are seed-backed and render byte-identical with every
// read failing, and logged out you get the sign-in gate. The DB-backed surfaces — area
// browser, route lists, crews, logbook — exist only for a real signed-in account.
//
// So this layers PostgREST interception under check:signed-in's fixture. It runs the SAME walk
// twice, healthy then failing, and diffs the two. A screen that is identical either way is
// seed-backed and tells us nothing; a screen that CHANGES is where the outage is visible, and
// the question is whether it says something broke or quietly says you have nothing.
//
// The control run is not optional. Without it a "no difference" result is indistinguishable
// from a probe that never reached a DB surface, which is exactly how the previous probe
// reported six identical screens while measuring one.
//
// Creates and destroys two real accounts, like check:signed-in. Reads only; nothing is written
// through the failing path because every write would fail too.
//
// WHAT IT FOUND, 2026-08-19 (81 reads blocked, app confirmed on screen, control run first):
//
//   Crew   healthy 3565ch -> failing 530ch, and the ENTIRE content is the sub-tab bar:
//          ["Crews","Friends","Groups"]. The fixture OWNS a crew with two confirmed members
//          and a private group. During an outage the climber sees an apparently empty crew
//          list and NOTHING says anything went wrong.
//
//   None of the six screens used broken/error/retry language. Four read as empty.
//
// That is the class [[a-failed-read-must-not-read-as-empty]] records — fixed for the three
// chat reads, still live here. The repair precedent is the same: let the read THROW instead of
// resolving to [], so the caller's existing catch can say "Couldn't load…" rather than the
// list rendering its empty state.
//
// LIMITATION, stated rather than papered over: Logbook and Me returned identical text (1097ch
// each), so the "Me" click did not land and that pair is ONE screen measured twice, not two
// findings. Home and Climbs changed but still render real content (Climbs shows the fire map,
// which is not DB-backed). The Crew result is the solid one.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";

const claim = (start) => new Promise((res, rej) => {
  let p = start;
  const go = () => {
    if (p >= start + 40) return rej(new Error("no free port"));
    const s = net.createServer();
    s.once("error", () => { p++; go(); });
    s.once("listening", () => s.close(() => res(p)));
    s.listen(p, "127.0.0.1");
  };
  go();
});

const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Me"];
const settle = async (page) => {
  let last = "", same = 0;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const t = (await page.evaluate(() => document.body.innerText || "")).replace(/\d+/g, "#");
    if (t === last) { if (++same >= 3) break; } else { same = 0; last = t; }
  }
  return page.evaluate(() => document.body.innerText || "");
};

async function walk(browser, base, session, fail) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(
    ({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(session)) },
  );
  let blocked = 0;
  if (fail) {
    // Only the DATA path. Auth must keep working or the app would simply sign us out, which
    // is a different screen from "signed in, data unavailable" and not the one being studied.
    await page.route("**/rest/v1/**", async (route) => {
      blocked++;
      return route.fulfill({ status: 500, contentType: "application/json",
        body: JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }) });
    });
  }
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  const out = {};
  const first = await settle(page);
  out.__booted = /Climbs|Partners|Logbook/.test(first) && first.length > 300;
  for (const t of TABS) {
    const el = page.locator(`text="${t}"`).last();
    if (await el.count()) await el.click({ timeout: 5000 }).catch(() => {});
    out[t] = await settle(page);
  }
  out.__blocked = blocked;
  await page.close();
  return out;
}

const port = await claim(5460);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "" } });
const up = async () => { for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 1000)); } return false; };
if (!await up()) { server.kill(); throw new Error("dev server never came up"); }

let fixture = null, browser = null;
try {
  console.log("creating fixture accounts...");
  fixture = await createFixture((m) => console.log("  " + m));
  browser = await chromium.launch({ channel: "chrome" });

  console.log("\n--- control: database HEALTHY ---");
  const ok = await walk(browser, base, fixture.session, false);
  console.log(`app on screen: ${ok.__booted ? "yes" : "NO"}`);

  console.log("\n--- database FAILING (every read 57014) ---");
  const bad = await walk(browser, base, fixture.session, true);
  console.log(`app on screen: ${bad.__booted ? "yes" : "NO"}  (${bad.__blocked} reads blocked)\n`);

  let anyDbBacked = false;
  for (const t of TABS) {
    const same = ok[t] === bad[t];
    if (!same) anyDbBacked = true;
    const text = bad[t] || "";
    const broken = /couldn't|could not|failed|error|try again|retry|unavailable|problem|went wrong|offline/i.test(text);
    const empty = /no .* yet|nothing here|none yet|get started|add your first|no results|no climbs|no crews|no routes/i.test(text);
    console.log(`${t.padEnd(9)} healthy ${String((ok[t]||"").length).padStart(5)}ch  failing ${String(text.length).padStart(5)}ch  ` +
      `${same ? "IDENTICAL (seed-backed, proves nothing)" : `CHANGED  says-broken=${broken ? "YES" : "no"}  says-empty=${empty ? "YES" : "no"}`}`);
    // Print what the climber ACTUALLY sees. The broken/empty regexes are a summary and have
    // been wrong before; the text is the evidence.
    if (!same) {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !TABS.includes(l));
      console.log(`          -> ${JSON.stringify(lines.slice(0, 7))}`);
    }
  }
  if (!anyDbBacked) {
    console.log("\nNO screen changed. Either these tabs are all seed-backed for this account, or the");
    console.log("interception never fired — check the blocked count above before reading anything into it.");
  }
} finally {
  if (browser) await browser.close();
  // cleanup(), NOT teardown() — the wrong name plus a .catch() would silently leak two real
  // accounts into the production project, where a fake climber shows up in partner search.
  // Caught by reading the fixture's API before running, not after.
  if (fixture) await fixture.cleanup();
  server.kill();
}
