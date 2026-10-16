// Do the two screens #778 fixed actually name a REAL crew member?
//
// #778 fixed three seed-lookup defects and only one — the float plan — was ever driven with
// real accounts. The trip recap and the vouch row were fixed from reading the code, which is
// the standard this repo keeps proving insufficient. This probe covers those two.
//
// It is deliberately NOT part of the partnership-loop audit. That audit replays the whole
// loop (crew -> invite -> accept -> propose -> agree -> chat) before it could reach these
// screens, which makes a ~9 minute run to test the last two steps. createFixture already
// hands us a crew with two confirmed real members, so this starts where the audit ends.
//
//   node scripts/oneoff/crew-member-names-probe.mjs
//
// Requires the service key and VITE_USE_DB=true.
//
// The failure mode being guarded is specific: a seed collection searched by an id that can
// be a uuid. It does not throw and it does not blank the screen — it renders a placeholder
// that reads like a person ("Member", "Climber"), or silently drops them.
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
const results = [];
const rec = (name, status, detail) => {
  results.push({ name, status });
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

let server = null, browser = null, fixture = null;
try {
  await sweepOrphans(log);
  const port = await claimPort(5470);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`dev server on ${port}...`);
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) { console.error("dev server never came up"); process.exit(1); }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  fixture = await createFixture(log);
  const mateFirst = fixture.mate.name.split(" ")[0];
  log(`  crew owner=${fixture.owner.name}, member=${fixture.mate.name}\n`);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.addInitScript(({ k, v }) => { try { localStorage.setItem(k, v); } catch {} },
    { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(fixture.session)) });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 160)));

  const buttonNames = async () => {
    try {
      return await page.evaluate(() => Array.from(document.querySelectorAll("button"))
        .map((b) => (b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim())
        .filter(Boolean).slice(0, 40));
    } catch { return []; }
  };
  const goCrew = async () => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.getByRole("button", { name: "Home", exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Crew", exact: true }).first().click();
    await page.waitForTimeout(2500);
    const sub = page.getByRole("button", { name: /^Crews/ }).first();
    if (await sub.count()) { await sub.click(); await page.waitForTimeout(2500); }
    return page.innerText("body");
  };

  // ---- the crew roster is the baseline: if THIS cannot name them, nothing below means
  // anything, because every screen under test resolves the same member the same way.
  let t = await goCrew();
  if (!t.includes(mateFirst)) {
    rec("the crew roster names the real member", "blocked", `the crew card never showed ${mateFirst}; nothing below is meaningful`);
  } else {
    rec("the crew roster names the real member", "ok");

    // NOTE: the vouch step runs BEFORE the log step on purpose. Logging the climb archives
    // the crew (isArchivedCrew is true once a log carries its crewId), which removes it from
    // "My Crews" and takes the roster with it. Reversing these two silently blocks the vouch.
    // ---- 1) a vouch given to that member -------------------------------------------------
    // The roster chip is a bare <div onClick> with no role, and the member's first name also
    // appears in the weekly availability grid, so there is no single stable target. Try each
    // exact-text match in DOM order and keep whichever opens their profile.
    const hits = page.getByText(mateFirst, { exact: true });
    const tries = Math.min(await hits.count(), 5);
    let opened = false;
    for (let i = 0; i < tries && !opened; i++) {
      try {
        await hits.nth(i).scrollIntoViewIfNeeded();
        await hits.nth(i).click();
        await page.waitForTimeout(2500);
        opened = (await page.getByRole("button", { name: /^Vouch for /i }).count()) > 0;
        if (!opened) {
          const close = page.getByRole("button", { name: /^(Close|×)/ }).first();
          if (await close.count()) { await close.click(); await page.waitForTimeout(1200); }
        }
      } catch { /* detached between count and click — try the next candidate */ }
    }
    if (!opened) {
      { const b = await page.innerText("body"); fs.writeFileSync("/Users/nathanbarber/.claude/jobs/0c5f079c/tmp/dbg-vouch.txt", b); }
      console.log("       dialogs open:", await page.locator('[role="dialog"]').count(), "| labels:", JSON.stringify(await page.locator('[role="dialog"]').evaluateAll(ds => ds.map(d => d.getAttribute("aria-label")))));
      rec("a vouch given to them names them", "blocked", `tried ${tries} element(s) reading "${mateFirst}"; none opened a profile offering "Vouch for ${mateFirst}"`);
    } else {
      await page.getByRole("button", { name: /^Vouch for /i }).first().click();
      await page.waitForTimeout(3000);
      const post = page.getByRole("button", { name: /Post vouch/i }).first();
      if (!(await post.count())) {
        rec("a vouch given to them names them", "blocked", `the vouch sheet offered no Post control. Buttons: ${(await buttonNames()).slice(0, 20).join(" | ")}`);
      } else {
        await post.click();
        await page.waitForTimeout(4000);
        await page.getByRole("button", { name: "Profile", exact: true }).first().click();
        await page.waitForTimeout(3500);
        const vr = await fetch(`${SUPABASE_URL}/rest/v1/vouches?from_id=eq.${fixture.owner.id}&to_id=eq.${fixture.mate.id}&select=from_id,to_id`, { headers: headers(KEY) });
        const posted = ((await vr.json().catch(() => [])) || []).length > 0;
        const body = await page.innerText("body");
        const vm = body.match(/VOUCHES YOU[’']VE GIVEN/i);
        const sec = vm ? body.slice(vm.index, vm.index + 400) : "";
        if (!sec && !posted) rec("a vouch given to them names them", "blocked", "no vouches row was written, so the sheet was never completed — this probe's fault, not the screen's");
        else if (!sec && posted) rec("a vouch given to them names them", "defect", "the vouch IS in the database but the \"Vouches you've given\" section does not render it");
        else if (sec.includes(mateFirst)) rec("a vouch given to them names them", "ok");
        else if (/\bclimber\b/i.test(sec)) rec("a vouch given to them names them", "defect", `the vouch renders as "Climber" instead of ${mateFirst} — the row resolves the recipient against seed data and falls back to the VOUCHER's own avatar`);
        else rec("a vouch given to them names them", "blocked", "the section rendered but named neither them nor the generic fallback");
      }
    }
    // ---- 2) the trip recap --------------------------------------------------------------
    // The vouch step ends on the Profile tab, so return to the crew before looking for its
    // log control — otherwise this reports "no log control" about a screen that has none.
    await goCrew();
    const logBtn = page.getByRole("button", { name: /Climbed it\? Log the climb/i }).first();
    if (!(await logBtn.count())) {
      rec("the trip recap names the real member", "blocked", `no log control on the crew card. Buttons: ${(await buttonNames()).slice(0, 20).join(" | ")}`);
    } else {
      await logBtn.scrollIntoViewIfNeeded();
      await logBtn.click();
      await page.waitForTimeout(9000);
      // The crew card opens the FULL log modal (submit "Done"); QuickLog's "Save" is a
      // different entry point. Accept either rather than assuming which one opened.
      const submit = page.getByRole("button", { name: /Log it|^Save$/ }).first();
      if (!(await submit.count())) {
        { const b = await page.innerText("body"); fs.writeFileSync("/Users/nathanbarber/.claude/jobs/0c5f079c/tmp/dbg-log.txt", b); }
        console.log("       dialogs open:", await page.locator('[role="dialog"]').count());
        rec("the trip recap names the real member", "blocked", `the log sheet offered no Done/Save. Buttons: ${(await buttonNames()).slice(0, 20).join(" | ")}`);
      } else {
        await submit.click();
        await page.waitForTimeout(4000);
        const bell = page.getByRole("button", { name: /^Notifications/ }).first();
        if (await bell.count()) { await bell.click(); await page.waitForTimeout(3000); }
        const notif = page.getByText(/Did your crew make it/i).first();
        if (!(await notif.count())) {
          rec("the trip recap names the real member", "blocked", "logging produced no recap notification to open");
        } else {
          await notif.click();
          await page.waitForTimeout(3500);
          const body = await page.innerText("body");
          // Scope to the sheet. "Member" and a first name both occur elsewhere on the page,
          // and a page-wide match is the false pass this repo has now shipped four times.
          const rm = body.match(/TRIP RECAP/i);
          const modal = rm ? body.slice(rm.index, rm.index + 700) : "";
          if (!modal) rec("the trip recap names the real member", "blocked", "the Trip recap sheet never opened, so an absent name proves nothing");
          else if (modal.includes(mateFirst)) rec("the trip recap names the real member", "ok");
          else if (/\bMember\b/.test(modal)) rec("the trip recap names the real member", "defect", `the recap calls them "Member" instead of ${mateFirst} — the roster resolves ids against the seed CLIMBERS array, which a uuid never matches`);
          else rec("the trip recap names the real member", "blocked", "the recap opened but named neither them nor the generic fallback");
          const close = page.getByRole("button", { name: /Close trip recap/i }).first();
          if (await close.count()) { await close.click(); await page.waitForTimeout(1500); }
        }
      }
    }

  }

  if (pageErrors.length) rec("no uncaught page errors", "defect", [...new Set(pageErrors)].join(" | "));
  else rec("no uncaught page errors", "ok");

  const defects = results.filter((r) => r.status === "defect");
  const blocked = results.filter((r) => r.status === "blocked");
  log(`\n${results.length} check(s): ${results.length - defects.length - blocked.length} ok, ${defects.length} defect, ${blocked.length} blocked`);
  if (defects.length) process.exitCode = 1;
} catch (e) {
  console.error("\nprobe ERRORED — incomplete, so nothing above is verified:\n", e?.stack || String(e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (fixture) { const left = await fixture.cleanup().catch(() => ["cleanup threw"]); log(left && left.length ? `LEAKED: ${left.join(", ")}` : "fixture accounts removed."); }
  if (server) server.kill();
}
