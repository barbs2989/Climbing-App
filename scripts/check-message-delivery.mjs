// check:message-delivery — somebody messages you. Does it arrive, and are they named?
//
// THE FIRST GUARD IN THIS REPO THAT INVOLVES TWO PEOPLE. Every other browser guard signs in as at
// most one account and reads its own screens, so a fact written by a SECOND climber has been
// outside CI by construction — and that is the seam #1497 came out of, where a vouch you received
// reached no screen and no number.
//
// It was promoted out of scripts/oneoff/ because a probe nobody runs is not a verification, which
// this file records under half a dozen names. What kept it out was a claim of mine that turned out
// to be false — see #1520; durable-fixture.mjs had the mate's session all along.
//
// The last untested leg of the second-person seam. The others were walked and are sound — a vouch
// (was NOT: #1497), a belay catch, a connection request, the crew roster from the member's side,
// and a real climber's profile. Messaging was the one left, and it is the feature with the most
// moving parts on the read side:
//
//   messages row (sender=mate, recipient=me)
//     -> fetchMyDirectMessages()      the initial hydration
//     -> useProfilesByIds(_realDmIds) the sender's NAME, a separate query
//     -> Inbox                        the thread list
//
// THE SECOND QUERY IS THE INTERESTING ONE. `useProfilesByIds` has a different miss behaviour at
// every call site, and this one degrades to `{id: id, name: "Climber"}` — so a message from a real
// person whose profile did not load is a thread from "Climber". That is not a lie, and it is not
// a name either; a climber cannot tell which of their partners wrote to them.
//
// CLAUDE.md records the Inbox at ~48 characters populated and ~117 EMPTY, which runs backwards
// from the intuition: the empty state carries explanatory copy and a populated thread list is a
// name. So a length check is worthless here and every assertion is on text.
//
// The message is inserted under the MATE's own JWT, through the same "users can send messages"
// policy (auth.uid() = sender_id) the app's sendDirectMessage uses — never the service key, which
// would prove nothing about what a second real account can do.
//
// A CLAIM IN AN EARLIER VERSION OF THIS HEADER WAS WRONG, and it was repeated across three merged
// PRs: "local only — it needs the mate's password, which CI's durable pair does not expose."
// `durable-fixture.mjs` signs in AS THE MATE with CI_TEST_MATE_PASSWORD and holds `mateSession`
// throughout; it simply does not RETURN it. So CI has had the second account's session all along
// and the blocker was a missing property, not a missing credential. It returns `mateSession` now.
//
// WHAT ACTUALLY BLOCKS CI IS CONCURRENCY, which is a different problem with a different answer per
// probe, because the durable accounts are SHARED between runs:
//   THIS ONE IS SAFE, and that is why it is the one promoted. Two concurrent runs each insert a
//   row mate->owner and every assertion holds with either or both present: the inbox is not empty,
//   the sender is identified, the body is on screen. Teardown deletes BY ID, never by sender, so
//   one run cannot tear down another's evidence. The body carries GITHUB_RUN_ID, so a run asserts
//   on ITS OWN message rather than on whatever happens to be in the thread — without that, run A
//   passes on run B's row, a false pass in exactly the window this guard watches.
//
//   `vouches` is NOT safe: UNIQUE(from_id, to_id) refuses a second run's insert, and teardown
//   removes the single shared row under the other run. `climb_logs` is not either, because its
//   delta assertion is `fresh.length === 1`. Both stay in scripts/oneoff/ until that is answered.
//
// IT WRITES TO THE LIVE PROJECT, which no other guard in the build chain does. That is acceptable
// on the same terms as check:signed-in: two durable accounts that are discoverable=false, one row
// per run, deleted by id, and leaks reported rather than accumulating.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "./lib/ui-fixture.mjs";
import { durableFixture, durableCredsPresent } from "./lib/durable-fixture.mjs";
import { settledText } from "./lib/render-settle.mjs";

// ONE level up, not two. This lived in scripts/oneoff/ and promotion changes its DEPTH —
// CLAUDE.md records a probe that kept `../..` and silently measured a different worktree.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5370;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("needs VITE_USE_DB=true plus Supabase url/anon key — without them nothing is delivered and every assertion below is meaningless.");
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

const SUPA = envVal("VITE_SUPABASE_URL").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");
// Distinctive, and deliberately not a word that appears in the app's own copy.
// UNIQUE PER RUN. Two CI runs share the durable accounts, so a fixed string would let run A's
// assertion pass on run B's message — a false pass in exactly the window this guard is meant to
// watch. The run id makes each message attributable to the run that sent it.
const RUN_TAG = process.env.GITHUB_RUN_ID || `${process.pid}-${Date.now().toString(36)}`;
const BODY = `Bringing the 60m and a light rack — meet at the pullout at five? [${RUN_TAG}]`;

let fixture = null, server = null, browser = null, msgId = null, mateTok = null;

try {
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
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  // TWO FIXTURE MODES, exactly as check:signed-in: per-run accounts on the SERVICE KEY locally,
  // and two DURABLE accounts on the ANON KEY in CI, which must never hold the service key.
  fixture = durableCredsPresent() ? await durableFixture(log) : await createFixture(log);

  const ownerId = fixture.session.user.id;
  const mateName = fixture.mate.name;

  // ---- the mate writes to the owner, under the MATE's own JWT ----
  // durableFixture RETURNS its mate session (it has always signed in as the mate; it simply did
  // not hand the session back until #1520). createFixture gives a password instead, so exchange
  // one. Never the service key: it bypasses RLS, and what a second REAL account can do is the
  // entire question this walk asks.
  if (fixture.mateSession && fixture.mateSession.access_token) {
    mateTok = fixture.mateSession.access_token;
  } else if (fixture.mate && fixture.mate.password) {
    const tokRes = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
    });
    const ms = await tokRes.json();
    if (!tokRes.ok || !ms.access_token) { console.error(`the mate could not sign in (${tokRes.status})`); process.exit(1); }
    mateTok = ms.access_token;
  } else {
    console.error("no mate session and no mate password — the message cannot be sent BY the mate, and sending it any other way would prove nothing.");
    process.exit(1);
  }

  const sent = await fetch(`${SUPA}/rest/v1/messages`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${mateTok}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ sender_id: fixture.mate.id, recipient_id: ownerId, body: BODY }),
  });
  const rows = await sent.json().catch(() => null);
  must(sent.ok && Array.isArray(rows) && rows.length === 1, `the mate could send a message under its OWN session (HTTP ${sent.status})`);
  if (!sent.ok) { log("  " + JSON.stringify(rows).slice(0, 200)); throw new Error("nothing was sent, so nothing can arrive"); }
  msgId = rows[0].id;

  // ---- the OWNER signs in and opens the inbox ----
  const stored = JSON.stringify(sessionForStorage(fixture.session));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, stored]);

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(base + "?z=inboxOpen", { waitUntil: "domcontentloaded" });
  await settledText(page);
  const inbox = await page.evaluate(() => document.body.innerText);

  must(/Messages/i.test(inbox), "the Inbox opened");
  // The populated inbox is SHORTER than the empty one — the empty state carries the explanatory
  // copy — so this is asserted on text, never on length.
  must(!/No friend chats yet/i.test(inbox), 'the inbox does not say "No friend chats yet" with a message waiting in it');
  // IDENTIFIED, not NAMED. The Inbox renders the sender through `pubName`, which falls back to the
  // handle unless `showName` is set — and a DB profile can never carry it (`profiles` has no
  // `show_name` column). So "@robinbelay" is what the app correctly does today, and asserting the
  // display name would be asserting a defect as though it were the contract. Same correction the
  // profile walk needed, in a different component.
  const mateHandle = "@" + mateName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const identified = inbox.includes(mateName) || inbox.includes(mateHandle);
  must(identified, `the sender is identified ("${mateName}" or "${mateHandle}")`);
  must(!/\bClimber\b/.test(inbox), 'the sender did not degrade to the "Climber" fallback useProfilesByIds uses at this call site');
  // The preview carries the message itself, so delivery is provable before any thread is opened.
  must(inbox.includes(BODY), "the message body is previewed in the thread list");

  if (/No friend chats yet/i.test(inbox) || !identified) {
    log("\n  --- the inbox, with a message waiting (first 700 chars) ---");
    log(inbox.slice(0, 700).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  }

  // ---- open the thread and look for the words the mate actually wrote ----
  // Match the HANDLE as well as the name: the row is labelled by pubName, so a selector demanding
  // the display name finds nothing and reports a thread that cannot be opened when it can.
  const openThread = await page.evaluate(([nm, hd]) => {
    const hit = [...document.querySelectorAll('[role="button"],button')]
      .find((b) => {
        const t = (b.getAttribute("aria-label") || "") + " " + (b.textContent || "");
        return t.includes(nm) || t.includes(hd);
      });
    if (!hit) return false;
    hit.click();
    return true;
  }, [mateName, mateHandle]);
  must(openThread, "the thread could be opened");
  if (openThread) {
    await settledText(page);
    const thread = await page.evaluate(() => document.body.innerText);
    must(thread.includes(BODY), "the message body is on screen, in the words the sender wrote");
    if (!thread.includes(BODY)) {
      log("\n  --- the open thread (first 700 chars) ---");
      log(thread.slice(0, 700).replace(/\n{2,}/g, "\n"));
      log("  --- end ---\n");
    }
  }

  must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? ` — ${pageErrors[0].slice(0, 140)}` : ""}`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill("SIGTERM");
  if (msgId && mateTok) {
    const d = await fetch(`${SUPA}/rest/v1/messages?id=eq.${msgId}`, {
      method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${mateTok}` },
    }).catch(() => null);
    // A 204 IS NOT EVIDENCE THE ROW WENT, and the read-back stays even though 0176 gave `messages`
    // a delete policy. It is what caught the absence of one: RLS refused the delete, PostgREST
    // answered 204, res.ok was true, and this guard printed "removed the message: ok" while the
    // row sat there — the class recorded as "a 200 is not evidence the data changed", which is
    // also why patchRow exists. A policy can be dropped again; the read-back cannot be fooled.
    const still = await fetch(`${SUPA}/rest/v1/messages?id=eq.${msgId}&select=id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${mateTok}` },
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const gone = Array.isArray(still) && still.length === 0;
    log(`  removed the message: ${gone ? "ok" : `NO — HTTP ${d ? d.status : "?"} but the row is still there (messages has no delete policy). Locally the account delete cascades; this is why the guard is not wired into CI.`}`);
  }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
