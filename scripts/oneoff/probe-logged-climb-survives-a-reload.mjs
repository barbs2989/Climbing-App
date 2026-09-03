// Log a climb, reload the page, and see whether it is still there.
//
// EVERY BROWSER GUARD IN THIS REPO READS ONE PAGE LOAD. check:ui, check:zero, check:signed-in and
// check:outage all open a screen, wait for the text to stop changing, and assert on it. Not one
// of them performs an ACTION and then asks whether it survived — so the promise the app makes
// when you log a climb ("Logged ✓ — saved to your logbook") is the one thing no guard has tested.
//
// The chain a logged climb has to survive is four hops, in two files, and this repo has already
// had it break twice:
//
//   LogAscent.save()  ->  onSave(e)  ->  setLogs([...logs, e])          (local, instant, visible)
//                                    ->  syncLogToDb(e)  ->  createClimbLog()   (the DB write)
//   reload            ->  useUserLogs(uid)  ->  App's hydration  ->  logs        (the read back)
//
// The local state hop is what makes a failure invisible: the entry appears IMMEDIATELY whether or
// not the write landed, and #1213's blob: URLs are the same shape — it renders, so it looks saved.
// Only a reload separates "in this tab" from "in your account".
//
// WHAT THIS PROBE IS NOT: a claim that the whole log form works. It clicks "✓ Log it" with the
// defaults, which is the minimum a climber can do, and follows THAT entry. Filling every field is
// a different test.
//
// It writes to the live project, so it uses the same per-run fixture as check:signed-in, deletes
// the rows it created, and reports anything teardown could not remove.
//
// NOT WIRED AS A GUARD, deliberately, and that is a known weakness. This repo's own rule is that
// a probe nobody runs is not a verification — but this one WRITES, and wiring a live-writing walk
// into CI needs the concurrency question answered first (the durable CI accounts are shared, so
// two runs would see each other's rows). Promote it once that is settled; the fixture, the delta
// baseline and the teardown are already the shape a guard needs.
//
// WHAT THREE EARLIER VERSIONS GOT WRONG, kept because each was a VACUOUS PASS rather than a
// visible error:
//   - `dbRows.length >= 1` — the fixture seeds its own climb_log, so that was true before the
//     probe clicked anything. It printed "(2 found)" and read as proof. Assert the DELTA.
//   - `window.ROUTES[0].name` — not exposed, so it returned null and the one assertion naming
//     this specific climb skipped ITSELF in silence. The seed is read directly now.
//   - asserting on the LOGBOOK — its default view is objectives, lists, itineraries and condition
//     reports; there is no feed of logged climbs on it at all. That failure looked like a
//     persistence defect and was the probe reading the wrong screen. Dumping the text is what
//     settled it, which is why the dump is still here on failure.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { durableFixture, durableCredsPresent } from "../lib/durable-fixture.mjs";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5310;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("needs VITE_USE_DB=true plus Supabase url/anon key — without them nothing is persisted and every assertion below is meaningless.");
  process.exit(1);
}

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
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

// WHAT ?z=logModal ACTUALLY OPENS. Its payload is ROUTES[0], so the name is knowable before the
// browser starts. Two attempts to read it from the DOM returned null and the assertion that names
// this specific climb skipped ITSELF in silence — the vacuous-pass shape this repo keeps
// recording. Read the seed instead.
const bundle = path.join(ROOT, `.flowroute-${process.pid}.mjs`);
let ROUTE_NAME = null, ROUTE_ID = null;
try {
  const { execFileSync } = await import("node:child_process");
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + bundle], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  const mod = await import(bundle + "?t=" + Date.now());
  ROUTE_NAME = mod.ROUTES && mod.ROUTES[0] && mod.ROUTES[0].name;
  ROUTE_ID = mod.ROUTES && mod.ROUTES[0] && mod.ROUTES[0].id;
} catch {} finally { fs.rmSync(bundle, { force: true }); }
if (!ROUTE_NAME || !ROUTE_ID) { console.error("could not resolve ROUTES[0] — the assertion naming the logged climb could not run, so this would pass vacuously."); process.exit(1); }
console.log(`  ?z=logModal opens: ${ROUTE_NAME} (${ROUTE_ID})`);

let fixture = null, server = null, browser = null;

try {
  // Server and browser BEFORE any account exists, so a failure at either cannot leave real rows
  // in a production project waiting on a teardown that never runs. check:signed-in's ordering.
  const port = await claimPort(PORT);
  const base = `http://127.0.0.1:${port}/`;
  log(`starting dev server on ${port}...`);
  server = spawn("npx", ["vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); process.exit(1); }
  await fetch(base + "ClimbMatch.jsx").catch(() => {});

  try { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 }); }
  catch { log("chrome slow to start (parallel jobs?) — retrying once"); browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 }); }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  // Vite cold-compiles ~1.5MB of JSX on the first request and this box routinely runs several
  // browser jobs at once; the default 30s navigation timeout failed twice in a row on a load
  // average of 100, AFTER the one-module warm below. A timeout here is not a verdict about the
  // app, so give it room rather than reporting a persistence failure that is really a slow build.
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  fixture = durableCredsPresent() ? await durableFixture(log) : await createFixture(log);

  // THE FIXTURE SEEDS ITS OWN LOG, so "a row exists" is true before this probe clicks anything.
  // An assertion on presence alone passes whether or not the write landed — it was live in the
  // first version and printed "(2 found)" for one seeded row plus one new one. Count first and
  // assert the DELTA.
  const SUPA = envVal("VITE_SUPABASE_URL").replace(/\/$/, "");
  const ANON = envVal("VITE_SUPABASE_ANON_KEY");
  const uid = fixture.session.user.id;
  const asUser = (qs, init = {}) => fetch(`${SUPA}/rest/v1/${qs}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${fixture.session.access_token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const logRows = async () => {
    const r = await asUser(`climb_logs?user_id=eq.${uid}&select=id,route_id`);
    return r.ok ? await r.json() : null;
  };
  const baseline = await logRows();
  if (!Array.isArray(baseline)) { console.error("could not read climb_logs before the run — the delta cannot be measured."); process.exit(1); }
  log(`  climb_logs before: ${baseline.length}`);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));
  await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });

  // ---- 1. open the log form on a known route ----
  // ?z=logModal is the shared overlay opener, whose payload is ROUTES[0]. climb_logs.route_id is
  // `text not null` and 0054 DELIBERATELY dropped the FK to routes(id), so a seed id is a valid
  // row — which is what makes this reachable without depending on catalog contents.
  await page.goto(base + "?z=logModal", { waitUntil: "domcontentloaded" });
  await settledText(page);
  // routeName comes from the seed data, resolved before the walk — see ROUTE_NAME above.
  const routeName = ROUTE_NAME;
  const before = await page.evaluate(() => document.body.innerText);
  must(/Log it|Report conditions/.test(before), "the log form opened");
  if (!/Log it/.test(before)) { console.error("\nthe log form did not open — nothing below was tested."); process.exit(1); }

  // ---- 2. log it with the defaults ----
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => (e.textContent || "").trim() === "✓ Log it");
    if (!b) return false; b.click(); return true;
  });
  must(clicked, 'the "✓ Log it" button was found and clicked');
  if (!clicked) { console.error("\ncould not press the save control — nothing below was tested."); process.exit(1); }
  await settledText(page);

  const afterSave = await page.evaluate(() => document.body.innerText);
  // The toast is the app's own promise. It says "saved to your logbook" only when signed in.
  must(/Logged ✓/.test(afterSave), `the app claimed success ("Logged ✓ …")`);

  // ---- 3. it is in the logbook in THIS tab (local state — proves nothing about the write) ----
  await page.goto(base + "?zt=logbook", { waitUntil: "domcontentloaded" });
  await settledText(page);
  const sameTab = await page.evaluate(() => document.body.innerText);
  must(sameTab.length > 200, "the logbook rendered");

  // ---- 4. THE QUESTION: reload, and does the RESUME still show it? ----
  // NOT the Logbook. Its default view is objectives, custom lists, itineraries and condition
  // reports — there is no feed of logged climbs on it at all, so asserting the route name there
  // failed for the WRONG REASON, and only dumping the screen showed that. Logged ascents live
  // under the Climbs tab's `routeView === "ascents"`, which ?zt= cannot reach, and on the RESUME,
  // which ?z=resumeFor can. Resume maps logs to rows carrying `r.name`, so this is the
  // "log a climb -> see it on your resume" hop, end to end.
  //
  // addInitScript re-applies on navigation, so the session survives; only the ENTRY is in doubt.
  await page.goto(base + "?z=resumeFor", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await settledText(page);
  const afterReload = await page.evaluate(() => document.body.innerText);

  must(afterReload.length > 200, "the resume rendered after the reload");
  must(afterReload.includes(routeName), `THIS climb ("${routeName}") is on the resume after a reload`);
  if (!afterReload.includes(routeName)) {
    // Say WHERE it looked. A red assertion here is as likely to be the probe reading the wrong
    // surface as a real persistence defect, and the text is what separates the two.
    log("\n  --- resume text after reload (first 900 chars) ---");
    log(afterReload.slice(0, 900).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  }

  // ---- 5. and the DATABASE holds the NEW one ----
  // The screen could be right for the wrong reason (state that outlived the navigation), and the
  // fixture's seeded log makes "a row exists" true regardless. Only the delta is evidence.
  const after = await logRows();
  if (!Array.isArray(after)) must(false, "could not read climb_logs back — the row check did not run");
  else {
    const baseIds = new Set(baseline.map((x) => x.id));
    const fresh = after.filter((x) => !baseIds.has(x.id));
    must(fresh.length === 1, `exactly one NEW climb_logs row exists (${baseline.length} -> ${after.length})`);
    if (fresh.length) must(fresh[0].route_id === ROUTE_ID, `the new row is THIS route (${fresh[0].route_id})`);
  }

  must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? " — " + pageErrors[0] : ""}`);

  // Remove the rows this probe created. The fixture deletes its OWN seeded rows explicitly rather
  // than trusting FK cascades, and its comment says why; a row created here is not on that list,
  // so it is cleaned up the same way instead of leaning on the account cascade.
  const finalRows = await logRows();
  if (Array.isArray(finalRows) && finalRows.length) {
    const del = await asUser(`climb_logs?user_id=eq.${uid}`, { method: "DELETE" }).catch(() => null);
    log(`  removed ${finalRows.length} log row(s): ${del && del.ok ? "ok" : "FAILED"}`);
  }

  log("");
  if (routeName) log(`  route logged: ${routeName}`);
  log(`  assertions: ${asserted}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
    if (leaked && leaked.length) { console.error("\nLEAKED (teardown could not remove):", leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

if (bad) { console.error(`\n${bad} failure(s).`); process.exit(1); }
console.log("\n  A logged climb survives a reload — the write reached the account, not just the tab.");
