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
// STILL BROKEN, MEASURED 2026-08-19 AFTER the crew fix (#1124) — the same class, more
// surfaces. Run with DUMP=Logbook to see it. During an outage the Logbook tells an account
// that HAS an objective, a log and a custom list:
//
//   "0 climbs to go"
//   "Nothing here yet — find a route in the Climbs tab and tap the bookmark to save it"
//   "No custom lists yet — tap + Create to build one."
//   "No recent condition reports"
//
// Four false statements on one screen. This is systemic rather than a second one-off: every
// list that hydrates from a query renders its EMPTY state when the read fails, because the
// render tests `!x.length` and nothing distinguishes "loaded, none" from "never loaded".
//
// The crew repair is the template and it is small — derive `xUnavailable` from that query's
// `isError`, swap the empty copy, suppress onboarding that assumes emptiness. What makes this
// more than one more edit is that the Logbook draws on at least two further queries
// (`useMyLists`, plus whatever feeds objectives/wishlist), so each needs its own flag AND its
// own healthy-vs-failing run. Do them one query at a time; a blanket flag would claim the
// database is down on a screen whose data merely has not arrived yet.
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
const ONLY = (process.env.ONLY || "").trim();
const SUBTAB = "Logbook:Completed";
// `isError` is FALSE while react-query is still retrying -- the property that makes an
// xUnavailable flag safe (a slow read reads as loading, not as broken). It also means
// WHICHEVER TAB IS WALKED FIRST is measured before any read has settled into an error, so
// it reports says-broken=no however well it is wired. Observed on Home with ONLY=objectives:
// Home said "0 routes" while Partners and Logbook, later in the SAME run, both said broken.
// A first-tab verdict is therefore evidence of nothing. Re-walk it once the rest has settled.
const REVISIT = "Home:revisited";
const REPORT = [...TABS, SUBTAB, REVISIT];
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
  let blocked = 0, passed = 0;
  if (fail) {
    // Only the DATA path. Auth must keep working or the app would simply sign us out, which
    // is a different screen from "signed in, data unavailable" and not the one being studied.
    //
    // ONLY=<table> fails exactly ONE PostgREST table and lets the rest through. That is what
    // makes a per-flag verdict possible: with everything blocked, three flags on one screen go
    // true together and the run cannot tell you which of them produced which sentence -- nor
    // whether one is a blanket flag firing on data that merely had not arrived. #1140 asked for
    // a per-query healthy-vs-failing run, and this is the mechanism for it.
    //
    // Matched on the path segment after /rest/v1/, never as a substring: PostgREST names
    // EMBEDDED tables in the query string (select=*,crew_members(*)), so a substring test would
    // also fail requests aimed at a different table entirely.
    const only = (process.env.ONLY || "").trim();
    await page.route("**/rest/v1/**", async (route) => {
      if (only) {
        const m = /\/rest\/v1\/([^?/]+)/.exec(route.request().url());
        if (!m || m[1] !== only) { passed++; return route.continue(); }
      }
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
  // The Logbook's sub-tabs are a screen each, and the four false statements #1140 found were
  // all on the DEFAULT one. "Completed" is fed by a different query (climb_logs) and asserts
  // emptiness just as loudly -- "0 logged", "Log your completed climbs here" -- so a walk that
  // stops at the default view reports half of this screen and reads as though it covered it.
  const lb = page.locator(`text="Logbook"`).last();
  if (await lb.count()) await lb.click({ timeout: 5000 }).catch(() => {});
  await settle(page);
  const comp = page.locator(`text="Completed"`).last();
  if (await comp.count()) await comp.click({ timeout: 5000 }).catch(() => {});
  const compText = await settle(page);
  // A sub-tab click that does not land leaves the DEFAULT view on screen, which reads as a
  // clean result rather than as a miss. Say which it was.
  out[SUBTAB] = /My Ascents|Log your completed climbs|Couldn\u2019t load your climbs/.test(compText)
    ? compText : "SUBTAB CLICK DID NOT LAND -- this is the default Logbook view, not Completed\n" + compText;
  const home2 = page.locator(`text="Home"`).last();
  if (await home2.count()) await home2.click({ timeout: 5000 }).catch(() => {});
  out[REVISIT] = await settle(page);
  out.__blocked = blocked;
  out.__passed = passed;
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

  console.log(ONLY
    ? `\n--- database FAILING for /rest/v1/${ONLY} ONLY (57014); every other read succeeds ---`
    : "\n--- database FAILING (every read 57014) ---");
  const bad = await walk(browser, base, fixture.session, true);
  console.log(`app on screen: ${bad.__booted ? "yes" : "NO"}  (${bad.__blocked} reads blocked` +
    (ONLY ? `, ${bad.__passed} let through` : "") + `)\n`);
  // A zero here means the interception never matched, and every verdict below would then be a
  // statement about a HEALTHY app. Fail loudly rather than printing a clean-looking table.
  if (!bad.__blocked) {
    console.log(ONLY
      ? `NOTHING WAS BLOCKED. No request hit /rest/v1/${ONLY} during the walk -- check the table name.`
      : "NOTHING WAS BLOCKED. The interception never fired; nothing below was measured.");
    process.exitCode = 1;
  }

  let anyDbBacked = false;
  for (const t of REPORT) {
    const same = ok[t] === bad[t];
    if (!same) anyDbBacked = true;
    const text = bad[t] || "";
    const broken = /couldn[\u2019']t|could not|failed|error|try again|retry|unavailable|problem|went wrong|offline/i.test(text);
    const empty = /no .* yet|nothing here|none yet|get started|add your first|no results|no climbs|no crews|no routes/i.test(text);
    console.log(`${t.padEnd(9)} healthy ${String((ok[t]||"").length).padStart(5)}ch  failing ${String(text.length).padStart(5)}ch  ` +
      `${same ? "IDENTICAL (seed-backed, proves nothing)" : `CHANGED  says-broken=${broken ? "YES" : "no"}  says-empty=${empty ? "YES" : "no"}`}`);
    // Print what the climber ACTUALLY sees. The broken/empty regexes are a summary and have
    // been wrong before; the text is the evidence.
    if (!same) {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !TABS.includes(l));
      console.log(`          -> ${JSON.stringify(lines.slice(0, 7))}`);
      if (process.env.DUMP === t) console.log(`\n          FULL ${t} (failing):\n${text}\n`);
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
