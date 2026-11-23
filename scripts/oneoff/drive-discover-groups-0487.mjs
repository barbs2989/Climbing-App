#!/usr/bin/env node
// drive-discover-groups-0487.mjs — drives Groups > Discover in Chrome as a REAL signed-in account and watches
// the network, to prove what 0487 changed: Discover is searched, filtered, sorted and paged by discover_groups(),
// and the app no longer reads the whole `groups` table.
//
// Hand-run, against the live project (it creates two throwaway accounts with the service key and removes them):
//   node scripts/oneoff/drive-discover-groups-0487.mjs [--shots <dir>]
//
// It asserts on REQUESTS as well as on the screen, because the screen looked the same before the change:
//   - every read of `groups` names its ids (id=in.(…)): none reads the table unfiltered
//   - rpc/discover_groups is called with a page size, and again with the typed search, the state and the sort
//   - the list holds a real public group the account is not in, and not the private group it owns
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { openFromMenu } from "../lib/menu-screens.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const shotsAt = process.argv.indexOf("--shots");
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log(...a);
let fails = 0, asserted = 0;
const ok = (cond, msg) => { asserted++; log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };

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
async function waitForServer(url, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let fixture = null, server = null, browser = null;
try {
  const port = await claimPort(5391);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  server = spawn(NPX, [...NPX_PRE, "vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  if (!(await waitForServer(base))) throw new Error("dev server never came up");
  await fetch(base + "ClimbMatch.jsx").catch(() => {});
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  log("creating fixture accounts...");
  fixture = await createFixture(log);

  // Every Supabase request the page makes, with its body for the RPCs.
  const reqs = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!/\/rest\/v1\//.test(u)) return;
    let body = null;
    try { body = r.postData() ? JSON.parse(r.postData()) : null; } catch { body = null; }
    reqs.push({ url: decodeURIComponent(u.split("/rest/v1/")[1]), method: r.method(), body });
  });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));
  await page.addInitScript(
    ({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) },
  );
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button,[role="button"]')].some((e) => (e.textContent || "").trim() === "Home"), null, { timeout: 120000 });
  await page.waitForTimeout(2500);

  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true }); };
  const text = () => page.evaluate(() => document.body.innerText);
  const rpcs = (name) => reqs.filter((r) => r.url.startsWith("rpc/" + name));
  const tapText = async (t) => {
    const hit = await page.evaluate((want) => {
      const el = [...document.querySelectorAll('button,[role="button"]')].find((e) => (e.textContent || "").trim() === want);
      if (!el) return false; el.click(); return true;
    }, t);
    await page.waitForTimeout(1500);
    return hit;
  };

  // ── For you, then Discover ──
  ok(await openFromMenu(page, "Groups"), "Groups opens from the Menu");
  await page.waitForTimeout(2500);
  await shot("1-for-you");
  ok(await tapText("Discover"), "the Discover tab is there");
  await page.waitForFunction(() => /Groups to join/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot("2-discover");
  let t = await text();
  const first = rpcs("discover_groups");
  ok(first.length >= 1, `Discover asked the database: ${first.length} discover_groups call(s)`);
  ok(first.some((r) => r.body && r.body.p_limit === 20 && r.body.p_offset === 0), "…for a page of 20, from the start");
  ok(rpcs("discover_group_facets").length >= 1, "the chip counts came from discover_group_facets");
  ok(/Wasatch Alpine Start/.test(t) && /Bellingham Alpine/.test(t), "both real public groups the account is not in are listed");
  ok(!/Seattle Ice/.test(t), "a private group it is not in is not listed");
  ok(!new RegExp(fixture.group && fixture.group.name ? fixture.group.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "\\u0000").test(t.split("Groups to join")[1] || ""), "the group it owns is not under Groups to join");
  ok(/Wasatch Trad Collective/.test(t), "the example groups are still listed for a signed-in climber");
  ok(/explore by state/i.test(t) && /Washington\s*·\s*\d+/.test(t) && /Every state · \d+ groups/.test(t), "the state chips and the State list carry counts");
  // The whole table is never read: every `groups` read names its ids.
  const groupReads = reqs.filter((r) => r.method === "GET" && /^groups\?/.test(r.url));
  const unfiltered = groupReads.filter((r) => !/[?&]id=in\.\(/.test(r.url) && !/[?&]id=eq\./.test(r.url));
  ok(groupReads.length >= 1, `the app read \`groups\` ${groupReads.length} time(s) by id`);
  ok(unfiltered.length === 0, "no read of `groups` is unfiltered" + (unfiltered.length ? " — " + unfiltered[0].url.slice(0, 160) : ""));
  ok(reqs.some((r) => r.method === "GET" && /^group_members\?/.test(r.url) && /user_id=eq\./.test(r.url)), "your own groups start from your own member rows");

  // ── The search box ──
  const box = page.locator('input[aria-label="Search groups by name, discipline, state or city"]');
  await box.fill("bellingham");
  await page.waitForFunction(() => !/Wasatch Alpine Start/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot("3-search");
  t = await text();
  ok(rpcs("discover_groups").some((r) => r.body && r.body.q === "bellingham"), "typing sends the search to the database (q=bellingham)");
  ok(/Bellingham Alpine/.test(t) && !/Wasatch Alpine Start/.test(t), "\"bellingham\" lists Bellingham Alpine and not Wasatch Alpine Start");
  await box.fill("");
  await page.waitForFunction(() => /Wasatch Alpine Start/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});

  // ── State ──
  await page.locator('select[aria-label="Browse groups by state"]').selectOption("st:Utah");
  await page.waitForFunction(() => !/Bellingham Alpine/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await shot("4-state-utah");
  t = await text();
  ok(rpcs("discover_groups").some((r) => r.body && r.body.p_region === "Utah"), "the state goes to the database (p_region=Utah)");
  ok(/Wasatch Alpine Start/.test(t) && !/Bellingham Alpine/.test(t), "Utah lists Wasatch Alpine Start and not Bellingham Alpine");
  await page.locator('select[aria-label="Browse groups by state"]').selectOption("");
  await page.waitForFunction(() => /Bellingham Alpine/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});

  // ── Sort ──
  ok(await tapText("Most members"), "Most members is offered");
  ok(rpcs("discover_groups").some((r) => r.body && r.body.p_sort === "members"), "the sort goes to the database (p_sort=members)");
  ok(await tapText("Most active"), "Most active is offered");
  ok(rpcs("discover_groups").some((r) => r.body && r.body.p_sort === "active"), "…and Most active (p_sort=active)");
  await shot("5-sorted");

  // ── A group the account is not in opens, and stays open ──
  const opened = await page.evaluate(() => {
    // The card's name line; the click bubbles to the card's own clickable row.
    const el = [...document.querySelectorAll("div")].find((e) => !e.children.length && /^Bellingham Alpine/.test((e.textContent || "").trim()));
    if (!el) return false; el.click(); return true;
  });
  await page.waitForTimeout(3000);
  await shot("6-open-group");
  t = await text();
  ok(opened && /About this group/.test(t), "a group from the list opens on its About tab");
  ok(reqs.some((r) => r.method === "GET" && /^groups\?/.test(r.url) && /id=in\.\(/.test(r.url)), "the open group is read by id");

  ok(pageErrors.length === 0, "no page errors" + (pageErrors.length ? " — " + pageErrors[0] : ""));
} catch (e) {
  console.error("drive threw: " + (e && e.stack || e)); fails++;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) { try { server.kill(); } catch {} }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
    if (leaked && leaked.length) { console.error("fixture cleanup left rows: " + JSON.stringify(leaked)); fails++; }
    else log("fixture accounts removed");
  }
}
log(fails ? `\n${fails} FAILED of ${asserted}` : `\nall ${asserted} passed`);
process.exit(fails ? 1 : 0);
