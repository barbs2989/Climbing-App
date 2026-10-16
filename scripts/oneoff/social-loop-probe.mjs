// Can two real climbers connect and talk?
//
// The partnership loop (crew -> invite -> accept -> agree a day -> chat) is covered by
// scripts/oneoff/partnership-loop-audit.mjs, 17/17. The SOCIAL loop beside it is not:
// find someone -> ask to connect -> they accept -> you can message them. Every surface in
// this repo driven with two real accounts has produced a finding, and this one has never
// been driven at all.
//
//   node scripts/oneoff/social-loop-probe.mjs
//
// Requires the service key and VITE_USE_DB=true.
//
// It starts from createFixture but DELETES the seeded connection first: the fixture hands
// over two accounts that are already friends, so leaving it in place would make the request
// and accept steps assert against a state that was set up rather than reached. The point is
// the flow, not the row.
//
// Same discipline as the partnership audit: a step that cannot REACH its target is `blocked`,
// never `defect`. `blocked` means this probe verified nothing about it, which is the honest
// thing to say and the reason its first version's findings were trustworthy.
import fs from "node:fs";
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
const steps = [];
const rec = (name, status, detail) => {
  steps.push({ name, status });
  const tag = status === "ok" ? "ok     " : status === "defect" ? "DEFECT " : "blocked";
  log(`  [${tag}] ${name}${detail ? " — " + detail : ""}`);
};

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
const rest = async (p, opts = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...opts, headers: { ...headers(KEY), "Content-Type": "application/json", ...(opts.headers || {}) } });
  const t = await r.text();
  try { return { status: r.status, body: t ? JSON.parse(t) : null }; } catch { return { status: r.status, body: t }; }
};
const signInAs = async (u) => {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  const b = await r.json();
  if (!b || !b.access_token) throw new Error("could not sign in as " + u.email);
  return b;
};

let server = null, browser = null, fixture = null;
try {
  await sweepOrphans(log);
  const port = await claimPort(5550);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`dev server on ${port}...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) { console.error("dev server never came up"); process.exit(1); }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  fixture = await createFixture(log);
  const { owner: A, mate: B } = fixture;
  const bFirst = B.name.split(" ")[0];

  // Start from NOT connected, and prove it, so the accept step is reached rather than staged.
  await rest(`connections?or=(and(requester.eq.${A.id},addressee.eq.${B.id}),and(requester.eq.${B.id},addressee.eq.${A.id}))`, { method: "DELETE" });
  const pre = await rest(`connections?or=(and(requester.eq.${A.id},addressee.eq.${B.id}),and(requester.eq.${B.id},addressee.eq.${A.id}))&select=id,status`);
  if (Array.isArray(pre.body) && pre.body.length) throw new Error("could not clear the seeded connection; every step below would be meaningless");
  // Both must be listed, or A cannot find B in browse at all (0110 defaults listing off).
  for (const u of [A, B]) await rest(`profiles?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ discoverable: true }) });
  log(`  A=${A.name}, B=${B.name} — connection cleared, both listed\n`);

  const bSession = await signInAs(B);
  const open = async (session) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await ctx.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(session)) });
    return ctx.newPage();
  };
  const pageErrors = [];
  const pageA = await open(fixture.session), pageB = await open(bSession);
  for (const p of [pageA, pageB]) p.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 160)));

  // Land on a tab and wait for the state being asserted, never a fixed guess — three of this
  // repo's probe "findings" have been fixed waits judging a screen before it rendered.
  const goTab = async (page, tab, until) => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    try { await page.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 }); } catch { return ""; }
    await page.waitForTimeout(1500);
    const btn = page.getByRole("button", { name: tab, exact: true }).first();
    if (!(await btn.count())) return "";
    await btn.click();
    let t = "";
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1500);
      t = await page.innerText("body");
      if (!until || until(t)) break;
    }
    return t;
  };
  const buttonNames = async (page) => {
    try {
      return await page.evaluate(() => Array.from(document.querySelectorAll("button"))
        .map((b) => (b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 40));
    } catch { return []; }
  };

  // ---- step 1: A finds B ---------------------------------------------------------------
  // Wait for B specifically. Accepting the section heading as "done" stops the wait before
  // the list has loaded — the heading renders first — and then a slow fetch reads as "B is
  // not listed". The full 12 polls elapse before this can call anything a defect.
  let t = await goTab(pageA, "Partners", (x) => x.includes(B.name));
  if (!t) {
    rec("A can reach partner search", "blocked", "the Partners tab never loaded");
  } else if (!t.includes(B.name)) {
    rec("A finds B without knowing to search", "defect", `${B.name} is listed (discoverable=true) but does not appear on A's Partners tab`);
  } else {
    rec("A finds B without knowing to search", "ok");

    // ---- step 2: A opens B's profile and asks to connect --------------------------------
    // The row itself is the control now (clickable() gives it role=button), so its accessible
    // name is the row's own text, not "Connect". Tap the row, then use the profile's own
    // connect action — that is where the gates live.
    const row = pageA.getByRole("button", { name: new RegExp(B.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
    if (!(await row.count())) {
      rec("A can open B's profile from browse", "defect", `B is listed on A's Partners tab but the row is not a control — no way to act on a real climber. Buttons: ${(await buttonNames(pageA)).slice(0, 20).join(" | ")}`);
    } else {
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await pageA.waitForTimeout(3000);
      const connect = pageA.getByRole("button", { name: /^\+ ?Friend$|add friend|^connect$/i }).first();
      if (!(await connect.count())) {
        rec("A can ask to connect", "defect", `B's profile opened from browse and offers no way to connect. Buttons: ${(await buttonNames(pageA)).slice(0, 20).join(" | ")}`);
      } else {
        rec("A can open B's profile from browse", "ok");
        await connect.click();
        await pageA.waitForTimeout(2500);
        // "+ Friend" opens a CONFIRMATION sheet (note + Cancel + Send); nothing is sent until
        // it is completed. The partnership audit learned this the hard way with the crew
        // invite, where stopping at the sheet produced three phantom defects downstream.
        const send = pageA.getByRole("button", { name: /^Send (request|without note)$/i }).first();
        if (await send.count()) { await send.click(); await pageA.waitForTimeout(2500); }
        else rec("the connect sheet offers a send control", "defect", "the confirmation sheet opened but has no Send control");
        // Poll: the write is a round trip, so one glance can beat it and read as "nothing was written".
        let made0 = null;
        for (let i = 0; i < 10 && !made0; i++) {
          const q = await rest(`connections?requester=eq.${A.id}&addressee=eq.${B.id}&select=id,status`);
          made0 = Array.isArray(q.body) && q.body.length ? q.body[0] : null;
          if (!made0) await new Promise((r) => setTimeout(r, 800));
        }
        const made = made0;
      if (!made) {
        rec("A can ask to connect", "defect", "A used the connect control and no connections row was written — the request exists only on A's device");
      } else {
        rec("A can ask to connect", "ok", `connections row created, status=${made.status}`);

        // ---- step 3: B sees the request --------------------------------------------------
        const tb = await goTab(pageB, "Crew", (x) => x.includes(A.name) || /friend request/i.test(x));
        if (!tb) {
          rec("B sees the request", "blocked", "B could not reach the Crew tab");
        } else {
          const reqTab = pageB.getByRole("button", { name: /^Requests/ }).first();
          if (await reqTab.count()) { await reqTab.click(); await pageB.waitForTimeout(2000); }
          // Friend requests arrive COLLAPSED: "FRIEND REQUESTS (1) … 1 friend request /
          // Tap to review". The name only appears once expanded, so asserting on the name
          // without expanding reports a working screen as broken.
          const review = pageB.getByText(/Tap to review/i).first();
          if (await review.count()) { await review.click(); await pageB.waitForTimeout(2000); }
          let seen = "";
          for (let i = 0; i < 12; i++) {
            await pageB.waitForTimeout(1500);
            seen = await pageB.innerText("body");
            if (seen.includes(A.name) || /@[a-z0-9]/i.test(seen)) break;
          }
          if (/undefined\s*·/.test(seen)) {
            rec("B sees the request", "defect", 'B\'s friend-request row renders "undefined · 0" — a real profile carries no level and no vouches, so vScore invents a trust score for someone nobody has vouched for. #715 fixed one row of this and left five.');
          } else if (!seen.includes(A.name) && !/@[a-z0-9]/i.test(seen)) {
            fs.writeFileSync("/Users/nathanbarber/.claude/jobs/0c5f079c/tmp/dbg-requests.txt", seen);
            rec("B sees the request", "defect", `A's connection request is in the database but B's Requests screen never names ${A.name}` + (/No friend requests/i.test(seen) ? ' — it still reads "No friend requests yet"' : ""));
          } else {
            rec("B sees the request", "ok");

            // ---- step 4: B accepts ---------------------------------------------------------
            const acc = pageB.getByRole("button", { name: /Accept friend|^(✓ )?Accept\b/i }).first();
            if (!(await acc.count())) {
              rec("B accepts", "blocked", `the request is shown but has no accept control. Buttons: ${(await buttonNames(pageB)).slice(0, 22).join(" | ")}`);
            } else {
              await acc.click();
              await pageB.waitForTimeout(3500);
              const after = await rest(`connections?id=eq.${made.id}&select=status`);
              const st = Array.isArray(after.body) && after.body[0] ? after.body[0].status : "(no row)";
              if (st !== "accepted") {
                rec("B accepts", "defect", `after accepting, the stored status is ${JSON.stringify(st)} rather than accepted`);
              } else {
                rec("B accepts", "ok", "connections.status=accepted");

                // ---- step 5: they can message ------------------------------------------------
                const msg = "Keen for something alpine next weekend";
                const tf = await goTab(pageA, "Crew", (x) => x.includes(bFirst));
                if (!tf) {
                  rec("A can message B once connected", "blocked", "A could not reach the Crew tab");
                } else {
                  const friendsTab = pageA.getByRole("button", { name: /^Friends/ }).first();
                  if (await friendsTab.count()) { await friendsTab.click(); await pageA.waitForTimeout(2500); }
                  const msgBtn = pageA.getByRole("button", { name: /^Message$/ }).first();
                  let box = null;
                  if (await msgBtn.count()) {
                    await msgBtn.scrollIntoViewIfNeeded();
                    await msgBtn.click();
                    await pageA.waitForTimeout(3000);
                    const b = pageA.getByRole("textbox", { name: "Message" }).first();
                    if (await b.count()) box = b;
                  }
                  if (!box) {
                    rec("A can message B once connected", "blocked", `no Message control, or it opened no composer, on A's Friends screen. Buttons: ${(await buttonNames(pageA)).slice(0, 22).join(" | ")}`);
                  } else {
                    await box.fill(msg);
                    const send = pageA.getByRole("button", { name: "Send message" }).first();
                    if (await send.count()) await send.click(); else await box.press("Enter");
                    await pageA.waitForTimeout(4000);
                    const sent = await pageA.innerText("body");
                    if (!sent.includes(msg)) {
                      rec("A can message B once connected", "defect", "A sent a direct message and it did not appear on A's own screen");
                    } else {
                      rec("A can message B once connected", "ok");
                      // Ask the DATABASE too: a message shown to its sender and stored nowhere
                      // is the shape that makes a chat look fine and deliver nothing.
                      const dm = await rest(`messages?sender_id=eq.${A.id}&recipient_id=eq.${B.id}&select=id,body`);
                      const stored = Array.isArray(dm.body) && dm.body.some((m) => (m.body || "").includes(msg));
                      if (!stored) rec("the message reached the database", "defect", "A's message renders on A's screen but no messages row holds it — B will never receive it");
                      else {
                        rec("the message reached the database", "ok");
                        // A direct message lands in the INBOX, not on the Crew tab's default
                        // sub-view. Looking only at the tab body reports a delivered message as
                        // missing — the screen was simply somewhere else.
                        let tb2 = await goTab(pageB, "Crew", (x) => x.includes(msg));
                        if (!tb2) {
                          rec("B receives the message", "blocked", "B could not reach the Crew tab to look");
                        } else {
                          if (!tb2.includes(msg)) {
                            const inbox = pageB.getByRole("button", { name: /^Messages$/ }).first();
                            if (await inbox.count()) {
                              await inbox.click();
                              for (let i = 0; i < 12; i++) {
                                await pageB.waitForTimeout(1500);
                                tb2 = await pageB.innerText("body");
                                if (tb2.includes(msg)) break;
                                // The thread may need opening: the inbox lists chats, not bodies.
                                const thread = pageB.getByText(new RegExp(bFirst === "" ? "." : A.name.split(" ")[0], "i")).first();
                                if (i === 2 && await thread.count()) { try { await thread.click(); } catch {} }
                              }
                            }
                          }
                          if (tb2.includes(msg)) rec("B receives the message", "ok", "sent by A, visible to B");
                          else rec("B receives the message", "defect", "the message is stored and shown to A, but B never sees it in the crew tab or the inbox");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
      }
  }

  if (pageErrors.length) rec("no uncaught page errors", "defect", [...new Set(pageErrors)].join(" | "));
  else rec("no uncaught page errors", "ok");

  const defects = steps.filter((s) => s.status === "defect");
  const blocked = steps.filter((s) => s.status === "blocked");
  log(`\n${steps.length} step(s): ${steps.length - defects.length - blocked.length} ok, ${defects.length} defect, ${blocked.length} blocked`);
  if (defects.length) { log("\nDEFECTS (reached the target, and it was wrong):"); defects.forEach((d) => log(`  - ${d.name}`)); }
  if (blocked.length) { log("\nBLOCKED (this probe verified NOTHING about these):"); blocked.forEach((d) => log(`  - ${d.name}`)); }
  if (defects.length) process.exitCode = 1;
} catch (e) {
  console.error("\nprobe ERRORED — incomplete, so nothing above is verified:\n", e?.stack || String(e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); log(left && left.length ? `LEAKED: ${left.join(", ")}` : "fixture accounts removed."); }
  if (server) server.kill();
}
