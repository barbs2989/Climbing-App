#!/usr/bin/env node
// READ-ONLY probe: what does INVITE MODE show a real signed-in organiser?
//
// check:signed-in walks 79 screens but never opens a crew sheet's "Browse everyone in the partner
// finder", so the invite bar, the grade-fit lines and the near-the-climb list (which only runs
// signed in — it reads partners_near) had never been seen with real rows.
//
// It signs in as the disposable fixture owner (scripts/lib/ui-fixture.mjs: a route crew on Mount
// Baker North Ridge and an area crew at World Wall), opens each crew's Browse everyone, and prints
// what the finder drew. IT SENDS NO INVITE: the climbers the finder lists are real accounts.
// The fixture accounts are deleted at the end, whatever happens.
//
//   node scripts/oneoff/probe-crew-invite-mode-signed-in.mjs [--shots DIR]

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { patchRow } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-crew-invite-mode-signed-in.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5263, base = `http://127.0.0.1:${PORT}/Climbing-App/`;
const si = process.argv.indexOf("--shots"), SHOTS = si > 0 ? process.argv[si + 1] : null;
const log = (...a) => console.log(...a);

let server, browser, fixture, code = 0;
try {
  server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 1000)); }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message.slice(0, 200)));
  fixture = await createFixture(log);
  await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch { /* storage blocked */ } },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });

  const home = async () => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => (b.textContent || "").trim() === "Home"), null, { timeout: 120000 });
    await page.waitForTimeout(3000);
  };
  const tapNav = t => page.evaluate(t => { const els = [...document.querySelectorAll("button")].filter(b => { const x = (b.textContent || "").trim(); return x === t || (x.startsWith(t) && /^\s*\d+$/.test(x.slice(t.length))); /* a tab with a badge reads "Crews 3" */ }).sort((a, b) => Number(!!b.closest('[aria-label="Primary"]')) - Number(!!a.closest('[aria-label="Primary"]'))); if (els[0]) els[0].click(); return !!els[0]; }, t);
  const read = () => page.evaluate(() => {
    const bar = document.querySelector('[aria-label="Inviting to a crew"]');
    const near = document.querySelector("[data-invite-near-climb]");
    const txt = sel => [...document.querySelectorAll(sel)].map(e => e.textContent.trim());
    const labels = [...document.querySelectorAll("button,div")].filter(e => e.children.length === 0 && /^(Select to invite|Does not list.*|Asked to join|Invited|On the crew|No spots left)$/.test(e.textContent.trim())).map(e => e.textContent.trim());
    const count = {}; labels.forEach(l => { count[l] = (count[l] || 0) + 1; });
    return {
      title: document.title,
      bar: bar ? bar.innerText.replace(/\n/g, " | ") : null,
      fits: txt("[data-crew-fit]").slice(0, 12),
      actions: count,
      near: near ? near.innerText.replace(/\n/g, " | ").slice(0, 700) : null,
      nearRows: near ? near.querySelectorAll("button[aria-pressed]").length : 0,
      distLines: [...document.querySelectorAll("div,span")].filter(e => e.children.length === 0 && /from the (climb|crag)/.test(e.textContent)).map(e => e.textContent.trim()).slice(0, 6),
      zipAsk: /zip code/i.test(document.body.innerText),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      head: document.body.innerText.replace(/\n+/g, " | ").slice(0, 900),
    };
  });

  // The fixture's AREA crew belongs to the mate; only an organiser gets invite mode, so hand it to
  // the owner. It is a disposable fixture row, removed by cleanup() like the rest.
  if (!process.argv.includes("--as-member")) { await patchRow("crews", fixture.areaCrew.id, { created_by: fixture.owner.id }); log("  area crew handed to the owner (organiser)"); }
  await home();
  for (let pass = 0; pass < 4; pass++) {
    const i = pass % 2;
    if (pass === 2) {
      // Round two: save a zip THROUGH THE APP (profile_zips cascades with the account), so the
      // near-the-climb list is allowed to draw.
      await tapNav("Partners"); await page.waitForTimeout(4000);
      const zi = page.locator('input[aria-label*="zip" i], input[placeholder*="zip" i]').first();
      if (await zi.count()) { await zi.fill("98225"); await page.getByRole("button", { name: /^Save$/ }).first().click(); await page.waitForTimeout(4000); log("\n##### zip 98225 saved through the app; zip prompt still showing:", await page.evaluate(() => /Add your zip code to see climbers near you/.test(document.body.innerText))); }
      else log("\n##### no zip box found");
    }
    await tapNav("Crews");
    // The crew cards arrive from three reads; a fixed wait missed them once and the pass reported nothing.
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => /^(1|✓)\s*Crew(?!\s*chat)/.test((b.textContent || "").trim())), null, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const opened = await page.evaluate(idx => {
      const bs = [...document.querySelectorAll("button")].filter(b => /^(Invite a partner|1\s*Crew)/.test((b.textContent || "").trim()));
      const uniq = [...document.querySelectorAll("button")].filter(b => /^(1|✓)\s*Crew(?!\s*chat)/.test(b.textContent.trim())); void bs;
      if (!uniq[idx]) return { n: uniq.length, ok: false };
      uniq[idx].scrollIntoView({ block: "center" }); uniq[idx].click(); return { n: uniq.length, ok: true };
    }, i);
    log(`\n=== ${pass < 2 ? "NO ZIP" : "ZIP SAVED"} · crew ${i} — crew-step buttons on screen: ${opened.n}`);
    if (!opened.ok) { log("buttons on the Crews tab:", await page.evaluate(() => document.title + " :: " + [...document.querySelectorAll("button")].map(b => (b.textContent || "").trim().slice(0, 36)).filter(Boolean).join(" ¦ ").slice(0, 1500))); continue; }
    await page.waitForTimeout(2500);
    const browsed = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Browse everyone in the partner finder/.test(x.textContent)); if (b) { b.scrollIntoView({ block: "center" }); b.click(); } return !!b; });
    log("Browse everyone found:", browsed);
    if (!browsed) { log("dialog text:", await page.evaluate(() => ([...document.querySelectorAll('[role="dialog"]')].pop() || document.body).innerText.replace(/\n+/g, " | ").slice(0, 600))); continue; }
    await page.waitForTimeout(9000);
    log(JSON.stringify(await read(), null, 1));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `invite-mode-p${pass}-crew${i}.png`), fullPage: false });
    await page.evaluate(() => { const n = document.querySelector("[data-invite-near-climb]"); if (n) n.scrollIntoView({ block: "start" }); });
    await page.waitForTimeout(600);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `invite-mode-p${pass}-crew${i}-near.png`), fullPage: false });
    const done = await page.evaluate(() => { const b = [...document.querySelectorAll('[aria-label="Inviting to a crew"] button')].find(x => x.textContent.trim() === "Done"); if (b) b.click(); return !!b; });
    await page.waitForTimeout(1500);
    log("Done pressed:", done, "→ now on:", await page.title());
  }

  log("\n=== Join a crew");
  await tapNav("Partners"); await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim().startsWith("Join a crew")); if (b) b.click(); });
  await page.waitForTimeout(6000);
  log(JSON.stringify(await page.evaluate(() => ({ fits: [...document.querySelectorAll("[data-crew-fit]")].map(e => e.dataset.crewFit + ": " + e.textContent).slice(0, 8), overflow: document.documentElement.scrollWidth - window.innerWidth, head: document.body.innerText.replace(/\n+/g, " | ").slice(0, 500) })), null, 1));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "join-a-crew.png") });
  log("\npage errors:", errors.length ? errors : "none");
} catch (e) { console.error("probe failed:", e); code = 1; }
finally {
  if (fixture) { const left = await fixture.cleanup().catch(e => ["cleanup threw: " + e.message]); log(left && left.length ? "LEAKED FIXTURE ROWS: " + left.join(", ") : "fixture accounts removed."); if (left && left.length) code = 1; }
  if (browser) await browser.close().catch(() => {});
  if (server) { try { if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }); else server.kill(); } catch { /* already gone */ } }
}
process.exit(code);
