// A group you belong to but did not create. What does a MEMBER see?
//
// check:signed-in walks a group as its OWNER and asserts the two owner-only controls — `+ Mod` and
// the visibility toggle — because #680 was a DB group's own owner getting neither, from comparing
// `ownerId` against the seed id 0. That fix is guarded.
//
// NOBODY WALKS THE OTHER SIDE. The fixture seats the mate as a plain `member`, and no guard has
// ever signed in as them. It is the same asymmetry that hid the crew join-request defect a few
// hours ago: the owner's view was covered, the member's was not, and the bug lived on the side
// nothing rendered.
//
// WHAT A MEMBER'S VIEW HAS TO GET RIGHT, and each is a class this repo has already been bitten by:
//   - the group is THERE at all (RLS lets a member read it; a seed-id lookup would drop it)
//   - the OWNER is named, not resolved against seed CLIMBERS and rendered as a placeholder
//   - the member is not offered controls that are not theirs — an announced control that does
//     nothing is worse than none, and a member tapping "Make private" would be told it worked
//   - nothing renders undefined / NaN / [object Object]
//
// A NEGATIVE RESULT IS WORTH HAVING HERE. The owner side is guarded and the card counts turned out
// to be deliberately seed-shaped (there is a comment saying so). If the member side is clean too,
// that is a real statement about a surface nothing had rendered — which is the alternative to
// believing it.
//
// NOT INJECTION-PROVEN, and that is a real gap rather than an omission. The intended case is
// `isCreator = true` — ungate the owner controls and the member should be offered them — and it
// was attempted TWICE. Both runs died at the first page.goto with the box at load average 470,
// before a single assertion ran ("1 of 0 assertion(s) failed"). A browser result at that load is
// not evidence in either direction, which is this repo's own rule, so nothing is claimed from it.
// Re-run the case on a quiet box before trusting this walk's specificity.
//
// What IS argued rather than measured: the three "not offered" assertions are attributable because
// check:signed-in asserts the OWNER is shown those same controls on this same fixture group. That
// is a real guard holding the other half — but it is a citation, not an injection.
//
// Writes to the live project; per-run fixture, rows removed with the accounts.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByName } from "../lib/tap-by-name.mjs";
import { tapByText } from "../lib/tap-by-text.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5430;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("needs VITE_USE_DB=true plus Supabase url/anon key — a seed group is not what this asks about.");
  process.exit(1);
}

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };

async function waitForServer(url, tries = 90) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
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

let fixture = null, server = null, browser = null;

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

  try { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 }); }
  catch { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 240000 }); }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(180000);

  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) { console.error("no mate password — this probe must sign in AS the member."); process.exit(1); }
  const groupName = fixture.group && (fixture.group.name || fixture.group.title);
  if (!groupName) { console.error("the fixture returned no group name — nothing below could identify the right group."); process.exit(1); }
  log(`  the group is "${groupName}", owned by the fixture owner, with the mate as a plain member`);

  const tok = await (await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
  })).json();
  if (!tok.access_token) { console.error("the mate could not sign in"); process.exit(1); }

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // THE PRESENCE HALF IS ALREADY GUARDED, so this walks ONE account rather than two.
  // "a member is not offered Make private" would be equally true of an app that offers it to
  // nobody — an absence is only attributable once the presence is shown somewhere. It is:
  // check:signed-in walks this same fixture group AS ITS OWNER and asserts `+ Mod` and the
  // `Make private/public` toggle are there, separately, precisely because #680 was the owner
  // getting neither. Re-measuring that here would be a second browser run for a fact a CI guard
  // already holds — and a second run is exactly what failed on this box at load average 312.
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} },
    [STORAGE_KEY, JSON.stringify(sessionForStorage(tok))]);

  // Crew tab -> Groups. By ACCESSIBLE NAME: the badge count renders inside the button, so
  // textContent is "Groups1" and an exact-text match finds nothing.
  await page.goto(base + "?zt=crew", { waitUntil: "domcontentloaded" });
  await settledText(page);
  must(await tapByName(page, "Groups"), "the Groups sub-view could be opened");
  await settledText(page);
  const asMember = { list: await page.evaluate(() => document.body.innerText), detail: "" };
  if (asMember.list.includes(groupName) && (await tapByText(page, groupName))) {
    await settledText(page);
    asMember.detail = await page.evaluate(() => document.body.innerText);
  }

  const list = asMember.list;
  must(list.length > 300, `the Groups screen rendered (${list.length} chars)`);
  must(list.includes(groupName), `the group the mate belongs to is listed ("${groupName}")`);

  if (!list.includes(groupName)) {
    log("\n  --- the Groups screen, as a member (first 700 chars) ---");
    log(list.slice(0, 700).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  } else {
    const detail = asMember.detail;
    must(detail.length > 300, `the group detail rendered (${detail.length} chars)`);

    for (const junk of ["undefined", "NaN", "[object Object]"]) {
      must(!detail.includes(junk), `nothing in a member's view of a group renders "${junk}"`);
    }

    // A member must NOT be offered what only the creator can do. An announced control that does
    // nothing is worse than no control — the app would be claiming a capability RLS refuses.
    // Absence is attributable because check:signed-in asserts the OWNER is shown these on this
    // same fixture group. Without that guard these four would be vacuous.
    for (const ctl of ["Make private", "Make public", "+ Mod"]) {
      must(!detail.includes(ctl), `a plain member is not offered "${ctl}", which check:signed-in asserts the owner IS`);
    }

    // ...and the OWNER of the group is identified rather than resolved against seed CLIMBERS.
    const ownerName = "Quinn Fixture";
    const ownerHandle = "@" + ownerName.toLowerCase().replace(/[^a-z0-9]/g, "");
    must(detail.includes(ownerName) || detail.includes(ownerHandle) || detail.includes("Quinn"),
      `the group's owner is identified ("${ownerName}" or "${ownerHandle}")`);
    must(!/\bA climber\b|\bClimber\b/.test(detail), "no member falls back to a placeholder name");

    if (bad) {
      log("\n  --- the group, as a member (first 900 chars) ---");
      log(detail.slice(0, 900).replace(/\n{2,}/g, "\n"));
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
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
