// Sign in as the SECOND account and look at the first one. Nothing else does.
//
// THE HOLE THIS IS AIMED AT, and it is a property of the guards rather than a hunch. Every browser
// guard that opens a profile does it through the shared scaffold, whose payload is:
//
//     profileModal: { expr: "CLIMBERS[0]" }
//
// — a SEED climber. And check:signed-in, the one guard with real accounts, signs in as the owner
// and reads the owner's own screens. So `FullProfile`'s entire `_real` branch — realProfileQ,
// realVouchesQ, realTrust via fetchTrustScore, and useProfilesByIds for the vouch authors — has
// never been rendered by anything in this repo. That branch is reached only when `climber.id` is
// a uuid, which is exactly the condition seed data can never satisfy.
//
// It is also where this class has form: the first overlay run of check:signed-in found a DB-derived
// friend rendering "undefined · 0", because such an object carries only {id,name,avatar,location,
// username} and the row printed a level and a vouch-derived score it had no basis for.
//
// SO THE WALK IS: the mate signs in, opens Crew -> Friends, and taps the owner. Driven through the
// real UI rather than through a ?z= payload, because the payload is the very thing that has been
// showing seed data — injecting a different one would prove the injection works, not the screen.
//
// A vouch is written first, under the mate's own JWT, so the profile has something real to render
// on its Vouches tab rather than being judged empty.
//
// Writes to the live project; per-run fixture, rows deleted, leaks reported. Local only: it needs
// the mate's password, which CI's durable pair does not expose.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByName } from "../lib/tap-by-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5350;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("needs VITE_USE_DB=true plus Supabase url/anon key — without them no profile is real and every assertion below is meaningless.");
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
const VOUCH_TEXT = "Unflappable at the belay and quick with the rope work.";

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

  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) {
    console.error("no mate password — this probe must sign in AS the mate, and CI's durable pair does not expose one.");
    process.exit(1);
  }

  const ownerId = fixture.session.user.id;
  const ownerName = "Quinn Fixture";

  // ---- the mate signs in, and vouches for the owner so the profile has something to show ----
  const tokRes = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
  });
  const mateSession = await tokRes.json();
  if (!tokRes.ok || !mateSession.access_token) { console.error(`the mate could not sign in (${tokRes.status})`); process.exit(1); }
  mateTok = mateSession.access_token;

  const vouchRes = await fetch(`${SUPA}/rest/v1/vouches`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${mateTok}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ from_id: fixture.mate.id, to_id: ownerId, reason: JSON.stringify({ text: VOUCH_TEXT, route: "Henry's Fork Route", ratings: { belay: 5, communication: 5 } }) }),
  });
  const rows = await vouchRes.json().catch(() => null);
  must(vouchRes.ok && Array.isArray(rows) && rows.length === 1, `the mate vouched for the owner (HTTP ${vouchRes.status})`);
  if (vouchRes.ok && Array.isArray(rows) && rows[0]) vouchId = rows[0].id;

  // ---- browse as the MATE ----
  const stored = JSON.stringify(sessionForStorage(mateSession));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, stored]);

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(base + "?zt=crew", { waitUntil: "domcontentloaded" });
  await settledText(page);

  // By ACCESSIBLE NAME, never by text: the badge count renders inside the button, so textContent
  // is "Friends1" and every exact-text strategy misses. tapByName anchors on ^label(,|$), which
  // matches whether or not a count is present.
  const toFriends = await tapByName(page, "Friends");
  must(toFriends, "the Friends sub-view could be opened");
  await settledText(page);

  const friends = await page.evaluate(() => document.body.innerText);
  must(friends.includes(ownerName) || friends.includes("Quinn"), `the owner is listed as a friend (looking for "${ownerName}")`);

  // Tap the owner's row. It is a clickable() control carrying the name, so match on the accessible
  // name rather than on the row's raw text, which also carries the location and handle.
  const opened = await page.evaluate((nm) => {
    const rows = [...document.querySelectorAll('[role="button"],button')];
    const hit = rows.find((r) => (r.getAttribute("aria-label") || r.textContent || "").includes(nm));
    if (!hit) return false;
    hit.click();
    return true;
  }, ownerName);
  must(opened, "the owner's row could be tapped");
  await settledText(page);

  const dlg = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
    return d ? (d.innerText || "") : null;
  });
  must(dlg !== null, "a Climber profile dialog opened");

  if (dlg) {
    must(dlg.length > 200, `the profile rendered something (${dlg.length} chars)`);
    // IDENTIFIED, not NAMED, and the difference is a finding rather than a bug in the assertion.
    // `pubName(p)` returns the display name only when `p.showName` is set and falls back to the
    // handle otherwise — and a DB profile can never carry `showName`, because `profiles` HAS NO
    // `show_name` COLUMN and nothing anywhere writes one. So another climber sees "@quinnfixture"
    // whatever the owner set. Asserting on the display name would have been asserting a defect
    // as though it were the contract; asserting the handle is what the app correctly does today.
    const ownerHandle = "@" + ownerName.toLowerCase().replace(/[^a-z0-9]/g, "");
    must(dlg.includes(ownerName) || dlg.includes(ownerHandle),
      `it is the OWNER's profile, identified as "${ownerName}" or "${ownerHandle}"`);
    if (!dlg.includes(ownerName)) {
      log(`  NOTE: identified as ${ownerHandle}, never by name. The Settings switch "Show my real`);
      log("        name publicly" + ' says "Off shows @handle to others. On shows <name>." — a claim');
      log("        about OTHERS that no column can carry.");
    }

    // THE POINT OF THE WALK. A DB-derived climber carries only a handful of fields, and the first
    // overlay run of check:signed-in found one rendering "undefined · 0" — a level and a
    // vouch-derived score invented from an object that has neither.
    for (const junk of ["undefined", "NaN", "[object Object]", "null"]) {
      must(!dlg.includes(junk), `nothing on a real climber's profile renders "${junk}"`);
    }

    // The vouch the mate just gave has to be on it, in the words the mate wrote.
    const toVouches = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
      if (!d) return "no dialog";
      const b = [...d.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "Vouches");
      if (!b) return "no Vouches button";
      b.click();
      return true;
    });
    must(toVouches === true, `the Vouches sub-tab could be opened${toVouches === true ? "" : ` (${toVouches})`}`);
    if (toVouches === true) {
      await settledText(page);
      const v = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"][aria-label="Climber profile"]');
        return d ? (d.innerText || "") : "";
      });
      must(!/No vouches yet/i.test(v), 'the vouch just given is not reported as "No vouches yet"');
      must(v.includes(VOUCH_TEXT), "the vouch is listed, in the words the voucher wrote");
      must(!v.includes("A ClimbMatch member"), 'the voucher is named rather than falling back to "A ClimbMatch member"');
      if (!v.includes(VOUCH_TEXT) || v.includes("A ClimbMatch member")) {
        log("\n  --- the owner's Vouches tab, as the mate sees it (first 700 chars) ---");
        log(v.slice(0, 700).replace(/\n{2,}/g, "\n"));
        log("  --- end ---\n");
      }
    }
  } else {
    log("\n  --- the Friends screen, which is where the tap was made ---");
    log(friends.slice(0, 700).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  }

  must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? ` — ${pageErrors[0].slice(0, 140)}` : ""}`);

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
