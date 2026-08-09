#!/usr/bin/env node
// Drives the PARTNERSHIP LOOP as two real accounts: crew → invite by name → accept →
// agree a day. That is the product's core promise, and nothing verifies it end to end.
//
// This is an audit, not a guard. It has no pass/fail gate, because "this flow is
// confusing" is not something to block a build on.
//
//   node scripts/oneoff/partnership-loop-audit.mjs [--keep] [--dump out.json]
//
// Requires the service key and VITE_USE_DB=true.
//
// ---------------------------------------------------------------------------------
// WHY IT IS BUILT THIS WAY. The first version of this audit reported five findings and
// FOUR were its own scaffold, not the app:
//
//   - it clicked a crew card's route name, which opens the ROUTE, and then reported the
//     crew as unreachable
//   - it clicked "+ Add friend" at index 0, hitting a seed climber instead of the real
//     account it had just searched for, then reported the request as never delivered
//   - a leaf-only text matcher missed controls that wrap a count badge
//   - a probe asserted against a screen that had not finished loading
//
// Every one of those was reported as a BUG in the product. The fix is structural, not
// more care: a step that cannot REACH its target is `blocked`, never `defect`. Only a
// step that demonstrably arrived and then found something wrong may claim a defect.
// `blocked` means "this audit did not verify it", which is the honest thing to say.
// ---------------------------------------------------------------------------------

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, anonKey, headers } from "../lib/supabase-env.mjs";
import { sweepOrphans, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const KEEP = argv.includes("--keep");
const DUMP = argOf("--dump");
const DOMAIN = "climbmatch-qa.invalid";
const ROUTE_ID = "wa_mount_baker_north_ridge";
const ROUTE_NAME = "North Ridge";
const KEY = requireServiceKey();

const log = (...a) => console.log(...a);
const steps = [];
const screens = {};

// The whole point of the rebuild. A step records what it actually established:
//   ok      — reached the target and it behaved
//   defect  — reached the target and it did NOT behave  (the only kind that is a finding)
//   blocked — could not reach the target; this audit verified nothing about it
function record(name, status, detail) {
  steps.push({ name, status, detail });
  const tag = status === "ok" ? "ok     " : status === "defect" ? "DEFECT " : "blocked";
  log(`  [${tag}] ${name}${detail ? " — " + detail : ""}`);
}

const auth = async (p, opts = {}) => {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${p}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  try { return { status: r.status, body: t ? JSON.parse(t) : null }; } catch { return { status: r.status, body: t }; }
};

async function makeAccount(tag, name) {
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `loop-${tag}-${stamp}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const { status, body } = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  });
  if (status >= 300 || !body?.id) throw new Error(`create ${tag} failed (${status}): ${JSON.stringify(body)}`);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await r.json();
  if (!session?.access_token) throw new Error(`sign in ${tag} failed`);
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${body.id}`, {
    method: "PATCH", headers: { ...headers(KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ location: "Bellingham, WA", disciplines: ["alpine", "trad"], trad_grade: "5.9", username: tag + stamp.slice(0, 4) }),
  });
  return { id: body.id, email, password, name, session };
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
const waitForServer = async (url, tries = 90) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

let server = null, browser = null, accounts = [];

try {
  await sweepOrphans(log);
  const port = await claimPort(5390);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`dev server on ${port}...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); process.exit(1); }
  await fetch(base + "ClimbMatch.jsx").catch(() => {});
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  const A = await makeAccount("ana", "Ana Belay");
  const B = await makeAccount("ben", "Ben Rope");
  accounts = [A, B];
  // A needs a saved objective before a crew can be started. That is setup: this audit is
  // about the partnership loop, not about saving a route.
  await fetch(`${SUPABASE_URL}/rest/v1/objectives`, {
    method: "POST", headers: { ...headers(KEY), "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: A.id, route_id: ROUTE_ID }),
  });
  log(`accounts: A=${A.name} (${A.id.slice(0, 8)}), B=${B.name} (${B.id.slice(0, 8)})\n`);

  const pageErrors = [];
  async function open(acct) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await ctx.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(acct.session)) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => pageErrors.push(`${acct.name}: ${e.message.slice(0, 160)}`));
    return page;
  }
  const pageA = await open(A), pageB = await open(B);

  // Land on a tab and PROVE it. Returns false rather than letting the caller assume.
  async function goTab(page, tab, marker) {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    try { await page.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 }); }
    catch { return false; }
    await page.waitForTimeout(2000);
    const btn = page.getByRole("button", { name: tab, exact: true }).first();
    if (!(await btn.count())) return false;
    await btn.click();
    await page.waitForTimeout(2500);
    if (marker) {
      try { await page.getByText(marker, { exact: false }).first().waitFor({ timeout: 20000 }); }
      catch { return false; }
    }
    return true;
  }
  const snap = async (page, label) => { const t = await page.innerText("body"); screens[label] = t; return t; };

  // ---- step 1: A starts a crew ------------------------------------------------------
  if (!(await goTab(pageA, "Crew", "My Crews"))) {
    record("A reaches the Crew tab", "blocked", "the Crew tab never showed 'My Crews'");
  } else {
    const sel = pageA.locator('select[aria-label*="Start a crew"]').first();
    if (!(await sel.count())) {
      record("A can start a crew from a saved objective", "blocked", "no 'Start a crew' select on screen");
    } else {
      const opts = await sel.locator("option").count();
      if (opts < 2) {
        record("A can start a crew from a saved objective", "defect", `the control is present but offers no objective to pick (${opts} option(s)) though A has one saved`);
      } else {
        await sel.selectOption({ index: 1 });
        await pageA.waitForTimeout(3500);
        const t = await snap(pageA, "A:crew-created");
        if (t.includes("CREW OBJECTIVE") && t.includes(ROUTE_NAME)) record("A starts a crew", "ok");
        else record("A starts a crew", "defect", "choosing the objective did not produce a crew card");
      }
    }
  }

  // ---- step 2: A opens invite-by-name -----------------------------------------------
  const inviteBtn = pageA.getByRole("button", { name: /Invite a partner/i }).first();
  let inviteOpen = false;
  if (!(await inviteBtn.count())) {
    record("A can open invite-by-name", "blocked", "no 'Invite a partner' button found on the crew card");
  } else {
    const before = await pageA.innerText("body");
    await inviteBtn.scrollIntoViewIfNeeded();
    await inviteBtn.click();
    await pageA.waitForTimeout(3000);
    const after = await snap(pageA, "A:invite-opened");
    const inputs = await pageA.locator('input[type="text"], input:not([type])').count();
    if (after.trim() === before.trim() && !inputs) {
      // Reached it, clicked it, nothing happened — that IS a defect, and now it is
      // distinguishable from "I never found the button".
      record("A can open invite-by-name", "defect", "clicking 'Invite a partner' changed nothing and opened no input");
    } else if (!inputs) {
      record("A can open invite-by-name", "blocked", "screen changed but no text input appeared — the invite UI may be elsewhere");
    } else { inviteOpen = true; record("A opens invite-by-name", "ok"); }
  }

  // ---- step 3: A invites B by name ---------------------------------------------------
  let invited = false;
  if (!inviteOpen) {
    record("A invites B by name", "blocked", "invite input never opened");
  } else {
    const box = pageA.locator('input[type="text"], input:not([type])').last();
    await box.fill("Ben");
    await pageA.waitForTimeout(3500);
    const t = await snap(pageA, "A:invite-search");
    if (!/Ben/.test(t)) {
      record("A invites B by name", "defect", "the real climber does not appear in the crew invite search, so the path the app prescribes finds nobody");
    } else {
      const send = pageA.getByRole("button", { name: /^(Invite|Send|Add)\b/i }).first();
      if (!(await send.count())) {
        record("A invites B by name", "defect", "B is listed in the invite search but there is no control to invite them");
      } else {
        await send.click();
        await pageA.waitForTimeout(3000);
        // "Invite to crew" opens a CONFIRMATION sheet ("Invite Ben to your crew" — with a
        // note field, Cancel, and Send). Nothing is sent until that is completed. The first
        // run of this audit stopped here and then reported three defects downstream, all of
        // which were simply "the invite was never sent". Finish the flow.
        const confirm = pageA.getByRole("button", { name: /^Send\b/i }).first();
        if (await confirm.count()) {
          await confirm.click();
          await pageA.waitForTimeout(3500);
        } else {
          record("the invite confirmation sheet offers a send control", "defect", "the confirmation sheet opened but has no Send button");
        }
        const after = await snap(pageA, "A:after-invite");
        if (/Couldn.t|try again|on this device/i.test(after)) {
          record("A invites B by name", "defect", "inviting reported a failure or a device-only save between two real accounts");
        } else { invited = true; record("A invites B by name", "ok"); }
      }
    }
  }

  // Ask the DATABASE what happened, independent of the screen. A UI that says nothing and
  // a UI that lies look identical from the outside.
  const memRes = await fetch(`${SUPABASE_URL}/rest/v1/crew_members?user_id=eq.${B.id}&select=crew_id,status`, { headers: headers(KEY) });
  const memRows = await memRes.json().catch(() => []);
  if (invited) {
    if (Array.isArray(memRows) && memRows.length) record("the invite reached the database", "ok", `crew_members row for B: status=${memRows[0].status}`);
    else record("the invite reached the database", "defect", "the UI accepted the invite but no crew_members row exists for B");
  } else {
    record("the invite reached the database", "blocked", "no invite was sent");
  }

  // ---- step 4: B sees it --------------------------------------------------------------
  if (!invited) {
    record("B sees the crew invite", "blocked", "nothing was sent to see");
  } else if (!(await goTab(pageB, "Crew", "Crews"))) {
    record("B sees the crew invite", "blocked", "B could not reach the Crew tab");
  } else {
    const reqTab = pageB.getByText(/^Requests/).first();
    if (!(await reqTab.count())) {
      record("B sees the crew invite", "blocked", "no Requests sub-tab found");
    } else {
      await reqTab.click();
      // Poll rather than judge on one look. myCrewInvitesQ is a React Query enabled on uid,
      // so it fires after the session resolves; a single 3s glance can catch the empty state
      // before the fetch lands and call a working screen broken. A real-JWT probe has
      // already confirmed the row IS readable by B, join included, so if it never appears
      // here the fault is in the screen, not in RLS.
      let t = "";
      for (let i = 0; i < 12; i++) {
        await pageB.waitForTimeout(2000);
        t = await pageB.innerText("body");
        if (new RegExp(ROUTE_NAME + "|Ana").test(t)) break;
      }
      screens["B:requests"] = t;
      if (/No crew invites/.test(t)) record("B sees the crew invite", "defect", "B's Requests screen still reads 'No crew invites' after A invited them");
      else if (new RegExp(ROUTE_NAME + "|Ana").test(t)) {
        record("B sees the crew invite", "ok");
        const acc = pageB.getByRole("button", { name: /^(Accept|Join|Confirm)\b/i }).first();
        if (!(await acc.count())) record("B accepts the invite", "defect", "the invite is shown but has no accept control");
        else {
          await acc.click();
          await pageB.waitForTimeout(3500);
          const after = await snap(pageB, "B:after-accept");
          if (/Couldn.t|try again/i.test(after)) record("B accepts the invite", "defect", "accepting reported a failure");
          else {
            const r2 = await fetch(`${SUPABASE_URL}/rest/v1/crew_members?user_id=eq.${B.id}&select=status`, { headers: headers(KEY) });
            const rows2 = await r2.json().catch(() => []);
            const st = Array.isArray(rows2) && rows2[0] ? rows2[0].status : "(no row)";
            if (st === "confirmed") record("B accepts the invite", "ok", "crew_members.status=confirmed");
            else record("B accepts the invite", "defect", `after accepting, the stored status is ${JSON.stringify(st)} rather than confirmed`);
          }
        }
      } else record("B sees the crew invite", "blocked", "Requests rendered something this audit could not identify");
    }
  }

  // ---- step 5: both sides agree ------------------------------------------------------
  if (!(await goTab(pageA, "Crew", "My Crews"))) {
    record("A's crew shows B as a member", "blocked", "A could not return to the Crew tab");
  } else {
    const t = await snap(pageA, "A:crew-final");
    if (/Ben/i.test(t)) record("A's crew shows B as a member", "ok");
    else if (/CREW · \d+ MEMBER/.test(t)) record("A's crew shows B as a member", "defect", "A's crew card renders a roster that does not include B");
    else record("A's crew shows B as a member", "blocked", "A's crew card was not on screen to check");
  }

  if (pageErrors.length) record("no uncaught page errors", "defect", [...new Set(pageErrors)].join(" | "));
  else record("no uncaught page errors", "ok");

  // ---- report -------------------------------------------------------------------------
  const defects = steps.filter((s) => s.status === "defect");
  const blocked = steps.filter((s) => s.status === "blocked");
  log(`\n${steps.length} step(s): ${steps.filter((s) => s.status === "ok").length} ok, ${defects.length} defect, ${blocked.length} blocked`);
  if (defects.length) { log("\nDEFECTS (reached the target, and it was wrong):"); defects.forEach((d) => log(`  - ${d.name}: ${d.detail}`)); }
  if (blocked.length) { log("\nBLOCKED (this audit verified NOTHING about these):"); blocked.forEach((d) => log(`  - ${d.name}: ${d.detail}`)); }
  if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(screens, null, 2)); log(`\nwrote ${DUMP}`); }
} catch (e) {
  console.error("\naudit ERRORED — incomplete, so nothing below is verified:\n", e?.stack || String(e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (!KEEP) {
    for (const a of accounts) {
      for (const t of ["crews", "groups"]) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?created_by=eq.${a.id}&select=id`, { headers: headers(KEY) }).catch(() => null);
        const rows = r ? await r.json().catch(() => []) : [];
        for (const row of Array.isArray(rows) ? rows : []) await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${row.id}`, { method: "DELETE", headers: headers(KEY) }).catch(() => {});
      }
      await auth(`admin/users/${a.id}`, { method: "DELETE" }).catch(() => {});
    }
    const left = await sweepOrphans(() => {});
    log(left ? `swept ${left} straggler(s)` : "accounts removed.");
  } else log(`--keep: ${accounts.map((a) => a.email).join(", ")}`);
}
