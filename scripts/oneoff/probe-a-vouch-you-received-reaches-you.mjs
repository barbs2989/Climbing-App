// Somebody vouches for you. Do you ever see it?
//
// The second half of the flow the logged-climb probe started: an action taken by ANOTHER account
// that is supposed to show up on yours. It is the one direction no guard walks — check:signed-in
// signs in as one account and reads its own screens, so a fact written by a second person is
// outside every walk in the repo by construction.
//
// THE CHAIN, and where it is cut:
//
//   mate  ->  giveVouch(mate, me)  ->  vouches row {from_id: mate, to_id: me}     (writes fine)
//   me    ->  ??? there is no query anywhere that reads vouches by to_id FOR ME
//   me    ->  Profile "At a glance" -> ME.communityVouches + VOUCH_BOOST[ME.id]
//
// `ME.communityVouches` is set to 0 by the sign-in reset and is NOT one of the twenty fields the
// ME.* sync hack rewrites each render (`routesLogged` IS, which is why the sibling tile is right —
// and why an earlier claim that the Climbs-logged tile was broken was wrong).
// `VOUCH_BOOST` is a session-only supplement written when *I* give a vouch, so `VOUCH_BOOST[ME.id]`
// is never written by anything — you cannot vouch for yourself. Both addends are structurally 0.
//
// useClimberVouches() DOES read to_id, and it is called exactly once: `useClimberVouches(_realId)`
// inside FullProfile, where `_realId` is non-null only for a uuid. ME.id is 0 signed in or out, so
// opening your OWN profile disables that query too.
//
// So this is the same root cause as the four defects fixed above it this week — ME.id is 0 while
// real identity is a uuid — landing on a number a climber reads as their standing in the app.
//
// HOW THE VOUCH IS CREATED: signed in as the mate, through the mate's own JWT, against the same
// table and the same "give vouches" policy (auth.uid() = from_id) the app's giveVouch() uses. It
// is not a service-key insert — CLAUDE.md is explicit that bypassing RLS manufactures states the
// app's own flow cannot reach, and the whole question here is what a real second account can do.
//
// WHAT THIS DOES NOT CLAIM: that the vouch UI works, or that the trust SCORE is well calibrated.
// It asks one thing — is a vouch you received visible to you at all.
//
// Writes to the live project; per-run fixture, rows deleted, leaks reported. NOT wired as a guard,
// same reason as its sibling: it writes, and the durable CI accounts are shared.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5330;

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

const SUPA = envVal("VITE_SUPABASE_URL").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");

// Distinctive on purpose: the vouch CARD is found by its own text, and "vouch" appears several
// times on these screens.
const VOUCH_TEXT = "Steady on the sharp end and unflappable at the belay.";

let fixture = null, server = null, browser = null, vouchId = null, mateTok = null;

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

  // LOCAL FIXTURE ONLY. The durable CI pair exposes the mate's id but not its password, and the
  // point of this probe is that the vouch is written BY the mate under its own JWT. Falling back
  // to the service key would satisfy the insert and prove nothing about what a second real
  // account can do, so refuse instead.
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) {
    console.error("no mate password — this probe must write the vouch as the mate, not with the service key.");
    process.exit(1);
  }

  const uid = fixture.session.user.id;

  // ---- 1. the mate signs in and vouches for the owner ----
  const tokRes = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
  });
  const tokBody = await tokRes.json();
  if (!tokRes.ok || !tokBody.access_token) { console.error(`the mate could not sign in (${tokRes.status}) — nothing below would mean anything.`); process.exit(1); }
  mateTok = tokBody.access_token;

  const vouchRes = await fetch(`${SUPA}/rest/v1/vouches`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${mateTok}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ from_id: fixture.mate.id, to_id: uid, reason: JSON.stringify({ text: VOUCH_TEXT, route: "Henry's Fork Route", ratings: { belay: 5, communication: 5 } }) }),
  });
  const vouchRows = await vouchRes.json().catch(() => null);
  must(vouchRes.ok && Array.isArray(vouchRows) && vouchRows.length === 1,
    `the mate could give a vouch under its OWN session (HTTP ${vouchRes.status})`);
  if (!vouchRes.ok) { log("  " + JSON.stringify(vouchRows).slice(0, 200)); throw new Error("no vouch to look for"); }
  vouchId = vouchRows[0].id;

  // Read it back the way anything else would: `view vouches` is `using (true)`, so this is what
  // the app's own useClimberVouches would see if it were ever asked about me.
  const back = await fetch(`${SUPA}/rest/v1/vouches?to_id=eq.${uid}&select=id,from_id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${fixture.session.access_token}` },
  });
  const backRows = await back.json().catch(() => []);
  must(Array.isArray(backRows) && backRows.length === 1,
    `the row is readable BY THE RECIPIENT (${Array.isArray(backRows) ? backRows.length : "?"} found)`);

  // ---- 2. the owner signs in and looks at their own profile ----
  const stored = JSON.stringify(sessionForStorage(fixture.session));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, stored]);

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(base + "?zt=me", { waitUntil: "domcontentloaded" });
  await settledText(page);
  const me = await page.evaluate(() => document.body.innerText);

  must(me.length > 400, "the profile tab rendered");
  must(/At a glance/i.test(me), "the AT A GLANCE panel is on screen");
  // DELIBERATELY NOT ASSERTED, and not even printed as a number. The headline is
  // `<CountUp value={vScore(meLive)}/>`, which animates up from 0 inside an effect, and
  // settledText MASKS DIGITS -- so a screen settles while the number is still climbing. Three runs
  // of this probe read 17, 3 and 0 off that element and every one was a frame rather than a
  // verdict; the 0 was on a run WITH the fix applied. The trust claim is made on the breakdown's
  // "N received" line instead, which is plain text.
  must(/Trust score/i.test(me), "the trust headline is on screen (its NUMBER animates, so nothing reads it)");

  // The tile is <div title={caption}><div>{number}</div><div>{label}</div></div>, so the CAPTION
  // is an attribute rather than text — a first version searched the box's innerText for "peer
  // vouches", found nothing, and reported "(found the label, not the tile)" while the number on
  // screen was already correct. Read the attribute; searching the whole tab is no good either,
  // since "vouch" appears several times on this screen.
  const tile = await page.evaluate(() => {
    const labels = [...document.querySelectorAll("div")].filter((e) => (e.textContent || "").trim() === "Vouches" && e.children.length === 0);
    for (const l of labels) {
      const box = l.parentElement;
      if (!box || box.children.length !== 2 || box.children[1] !== l) continue;
      return { num: (box.children[0].textContent || "").trim(), caption: box.getAttribute("title") || "" };
    }
    return null;
  });
  log(`  the Vouches tile reads: ${tile === null ? "(no Vouches tile on screen)" : `"${tile.num}" / "${tile.caption}"`}`);
  must(tile !== null, "a Vouches tile exists on the profile");

  const shown = tile && tile.num;
  must(shown === "1", `the tile counts the vouch this account received (reads ${shown ? `"${shown}"` : "nothing"}, expected "1")`);
  // The caption has to stay the healthy one: its two siblings swap to "couldn't load" on a failed
  // read, and a tile that said so on a successful one would be the mirror defect.
  must(tile && /peer vouches/i.test(tile.caption), `the caption is the healthy one ("${tile ? tile.caption : ""}")`);

  if (shown !== "1") {
    log("\n  --- profile text (first 700 chars) ---");
    log(me.slice(0, 700).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  }

  // ---- 3. and does it reach TRUST? ----
  // The tile is a count; the trust score is what the count is FOR. trustFactors() builds a
  // "Peer vouches" row whose sub-line is `v + " received"`, where v is communityVouches plus the
  // session-only VOUCH_BOOST — so before the fix this row read "0 received" for an account that
  // had been vouched for, and contributed 0 of its 22 points. The panel is collapsed behind
  // "View factors", so the walk has to open it: a factor nobody can see is not a factor.
  const opened = await tapByText(page, "View factors ▾");
  must(opened, 'the "View factors" disclosure could be opened');
  if (opened) {
    await settledText(page);
    const factors = await page.evaluate(() => document.body.innerText);
    must(/Peer vouches/i.test(factors), "the breakdown lists a Peer vouches factor");
    const received = (factors.match(/(\d+) received/) || [])[1];
    log(`  the Peer vouches factor reads: "${received === undefined ? "(no 'N received' line)" : received + " received"}"`);
    must(received === "1", `the trust breakdown counts the vouch (reads ${received ? `"${received} received"` : "nothing"}, expected "1 received")`);
  }

  // ---- 4. and does the LIST agree with the COUNT? ----
  // Raising the tile alone would strand its neighbour. FullProfile enriches a climber from the DB
  // only when `_realId` is a uuid -- `if(!_realId) return climber` -- and ME.id is 0 signed in or
  // out, so your own public profile listed `ME.vouches`, which is []. A tile reading 1 above a tab
  // reading "No vouches yet" is one screen with two answers, the shape CLAUDE.md records as
  // changing-which-record-wins-leaves-the-neighbouring-field-behind.
  const toProfile = await tapByText(page, "View public profile");
  must(toProfile, '"View public profile" could be opened');
  if (toProfile) {
    await settledText(page);
    const toVouches = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
      if (!d) return "no dialog";
      const b = [...d.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "Vouches");
      if (!b) return "no Vouches button in the dialog";
      b.click();
      return true;
    });
    must(toVouches === true, `the Vouches sub-tab could be opened${toVouches === true ? "" : ` (${toVouches})`}`);
    if (toVouches) {
      await settledText(page);
      const prof = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
        return d ? (d.innerText || "") : "";
      });
      must(!/No vouches yet/i.test(prof), 'the profile does not say "No vouches yet" while the tile counts one');
      must(prof.includes(VOUCH_TEXT), "the vouch itself is listed, in the words the voucher wrote");
      if (/No vouches yet/i.test(prof) || !prof.includes(VOUCH_TEXT)) {
        const dlg = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
          return d ? (d.innerText || "").slice(0, 900) : "(no climber-profile dialog in the DOM)";
        });
        log("\n  --- the Climber profile dialog ---");
        log(dlg.replace(/\n{2,}/g, "\n"));
        log("  --- end ---\n");
      }
    }
  }

  must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? ` — ${pageErrors[0].slice(0, 120)}` : ""}`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill("SIGTERM");
  if (vouchId && mateTok) {
    const d = await fetch(`${SUPA}/rest/v1/vouches?id=eq.${vouchId}`, {
      method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${mateTok}` },
    }).catch(() => null);
    log(`  removed the vouch: ${d && d.ok ? "ok" : "FAILED — the account delete should still cascade"}`);
  }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
