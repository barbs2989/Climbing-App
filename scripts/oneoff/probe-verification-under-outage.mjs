// What does the verification effect actually SEE at runtime, healthy and under an outage?
//
// `check:outage ONLY=verification_records` reports the outage INTRODUCING "Verify to boost your
// trust" / "Verified climbers get more requests." and removing nothing -- so ME.verified is true
// when healthy and false when the read fails. After the fix, reading the source says that cannot
// happen, because the effect falls back to `session.user.email_confirmed_at`, which needs no
// query. Three hypotheses for the discrepancy were MEASURED AND DIED:
//
//   * "the fixture session lacks email_confirmed_at" -- probe-fixture-session-email-confirmed.mjs
//     creates an account exactly as the fixture does and signs in exactly as the fixture does.
//     The token endpoint returns it, and sessionForStorage() passes session.user through whole.
//   * "the sign-in reset clobbers it" -- that effect's body is gated `if(prev!=null)`, so it
//     cannot fire on a first load with an injected session.
//   * "a trigger seeds a verified record, so healthy is verified by the RECORD" -- no migration
//     inserts into verification_records except verify_my_email() itself.
//
// So stop reasoning and look. This boots the real app with the real fixture and reads the
// effect's own inputs out of the running page, healthy and failing, via an IN-MEMORY transform
// (scripts/oneoff/verif-debug.config.mjs -- the app source is never edited).
//
// It loads ONE page per run rather than walking 18 screens, so it costs a fraction of the guard.
//
// Fails closed: no reporter on the page, or a page that never signed in, is reported as "nothing
// was measured" rather than as a verdict. A probe whose expected output is a small object is
// exactly the kind that reads as working when it is broken.

import { spawn } from "node:child_process";
import net from "node:net";
import { chromium } from "playwright-core";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { durableFixture, durableCredsPresent } from "../lib/durable-fixture.mjs";

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  s.on("error", rej);
});

const port = await freePort();
const base = `http://127.0.0.1:${port}/`;
const server = spawn("npx",
  ["vite", "--config", "scripts/oneoff/verif-debug.config.mjs", "--host", "127.0.0.1",
    "--port", String(port), "--strictPort"],
  { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "" } });

const up = async () => {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

async function read(browser, session, fail) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(
    ({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(session)) },
  );
  let blocked = 0;
  if (fail) {
    // Only verification_records, matched on the path SEGMENT after /rest/v1/ -- PostgREST names
    // embedded tables in the query string, so a substring test would fail unrelated requests.
    await page.route("**/rest/v1/**", async (route) => {
      const m = /\/rest\/v1\/([^?/]+)/.exec(route.request().url());
      if (!m || m[1] !== "verification_records") return route.continue();
      blocked++;
      return route.fulfill({ status: 500, contentType: "application/json",
        body: JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }) });
    });
  }
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });

  // react-query RETRIES with backoff, so `isError` is FALSE for the first several seconds of an
  // outage. Reading immediately measures the app before any read has given up -- the trap
  // check:outage records after Home reported "0 routes" while two later screens said broken.
  // Poll until isError settles, or the budget runs out.
  let v = null;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    v = await page.evaluate(() => window.__verif || null);
    if (!fail && v && v.recs !== "undefined") break;
    if (fail && v && v.isError) break;
  }
  const err = await page.evaluate(() => window.__verifErr || null);
  const runs = await page.evaluate(() => window.__verifRuns || []);
  const nudge = await page.evaluate(() =>
    document.body.innerText.includes("Verify to boost your trust"));
  await page.close();
  return { v, err, blocked, nudge, runs };
}

if (!await up()) { server.kill(); throw new Error("dev server never came up — nothing was measured."); }

let fixture = null, browser = null, bad = 0;
try {
  fixture = durableCredsPresent()
    ? await durableFixture((m) => console.log("  " + m))
    : await createFixture((m) => console.log("  " + m));
  browser = await chromium.launch({ channel: "chrome" });

  const healthy = await read(browser, fixture.session, false);
  const failing = await read(browser, fixture.session, true);

  for (const [label, r] of [["HEALTHY", healthy], ["FAILING", failing]]) {
    console.log(`\n--- ${label} ---`);
    if (r.err) console.log(`  reporter threw: ${r.err}`);
    if (!r.v) {
      console.log("  NOTHING WAS MEASURED — window.__verif is absent. Either the transform did");
      console.log("  not run or App never rendered. This is not a verdict.");
      bad++;
      continue;
    }
    console.log(`  uid                : ${r.v.uid}`);
    console.log(`  session present    : ${r.v.hasSession}   user present: ${r.v.hasUser}`);
    console.log(`  email_confirmed_at : ${JSON.stringify(r.v.emailConfirmedAt)}`);
    console.log(`  records            : ${r.v.recs}   isError: ${r.v.isError}   status: ${r.v.status}`);
    console.log(`  verified (state)   : ${r.v.verified}`);
    console.log(`  renders observed   : ${r.v.renders}`);
    console.log(`  "Verify to boost your trust" on screen: ${r.nudge}`);
    // The invocation log is the half a render snapshot cannot give you: whether the effect ever
    // RAN with the inputs above. `latched` true means an earlier run already set the ref, so this
    // invocation returned before reading anything.
    console.log(`  effect invocations : ${r.runs.length}`);
    r.runs.forEach((x, i) => console.log(
      `      #${i + 1} uid=${x.uid} latched=${x.latched} sessionConfirmed=${x.sec} recs=${x.recs}`));
    if (label === "FAILING") console.log(`  verification_records reads blocked: ${r.blocked}`);
    if (!r.v.uid) { console.log("  NOT SIGNED IN — the walk measured a logged-out app."); bad++; }
  }

  if (!failing.blocked) {
    console.log("\nFAIL — no verification_records read was intercepted, so the FAILING column is a");
    console.log("statement about a healthy app.");
    bad++;
  }

  if (!bad) {
    const v = failing.v;
    console.log("\n--- reading ---");
    if (v.emailConfirmedAt && !v.verified) {
      console.log("  The session DOES carry email_confirmed_at and `verified` is still false, so the");
      console.log("  fallback is reached and rejected, or the effect never re-ran after the session");
      console.log("  arrived. Compare `renders` against the healthy column.");
    } else if (!v.emailConfirmedAt) {
      console.log("  The session does NOT carry email_confirmed_at inside the app, though the token");
      console.log("  endpoint returns it. Something between storage and useSession is dropping it.");
    } else {
      console.log("  `verified` is true under the outage — the fix works, and the nudge on screen");
      console.log("  must be coming from somewhere other than ME.verified.");
    }
  }
  process.exitCode = bad ? 1 : 0;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fixture && fixture.cleanup) await fixture.cleanup().catch(() => {});
  server.kill();
}
