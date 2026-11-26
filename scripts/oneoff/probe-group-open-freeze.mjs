#!/usr/bin/env node
// Owner note 2026-11-26: "Sometimes the screen freezes when I click on groups that I have joined."
//
// Drives the real app (vite dev) signed in as a per-run fixture account that is a member of a group,
// opens that group from Groups › Your groups again and again, moves between its tabs, goes Back, and
// after every tap asks the page for one animation frame. A main thread that cannot answer within the
// budget is a freeze; long tasks and React's "Maximum update depth" warnings are reported too.
//
//   node scripts/oneoff/probe-group-open-freeze.mjs [--rounds 6] [--keep]
//
// Needs the service key (creates and removes the fixture accounts) and a DB slot.
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-group-open-freeze.mjs");

// The fixture group, filled like a group people use: posts from both members, a pinned one, reactions, events.
// Everything here hangs off the group or the fixture accounts, so the fixture's own cleanup cascades it away.
async function fillGroup(fx, nPosts) {
  const H = headers(requireServiceKey(), { "Content-Type": "application/json", Prefer: "return=representation" });
  const post = async (table, rows) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: H, body: JSON.stringify(rows) }); const b = await r.json(); if (!r.ok) throw new Error(table + " " + r.status + " " + JSON.stringify(b).slice(0, 200)); return b; };
  const gid = fx.group.id, ids = [fx.owner.id, fx.mate.id];
  const now = Date.now();
  const posts = await post("group_posts", Array.from({ length: nPosts }, (_, i) => ({ group_id: gid, author: ids[i % 2], body: `Probe post ${i + 1}. Anyone up for a lap at the crag this weekend? `.repeat(1 + (i % 4)), pinned: i === 0, pinned_at: i === 0 ? new Date(now).toISOString() : null, topic: ["partner", "conditions", null][i % 3], created_at: new Date(now - i * 3600e3).toISOString() })));
  await post("group_post_reactions", posts.slice(0, 10).map((p) => ({ post_id: p.id, user_id: fx.mate.id, reaction: "like" })));
  const day = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10);
  const evs = await post("group_events", [3, 10, 17].map((d, i) => ({ group_id: gid, host: ids[i % 2], title: "Probe meetup " + (i + 1), event_date: day(d), event_time: "18:00", location: "The crag", descr: "Bring a rope.", capacity: 8 })));
  await post("group_event_rsvps", evs.map((e) => ({ event_id: e.id, user_id: fx.mate.id })));
  return { posts: posts.length, events: evs.length };
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ROUNDS = +arg("--rounds", 6);
const PORT = +arg("--port", 5391);
const KEEP = process.argv.includes("--keep");
const GUEST = process.argv.includes("--guest");
const log = (...a) => console.log(...a);

let server, browser, fixture;
const findings = [];
try {
  const base = `http://127.0.0.1:${PORT}/Climbing-App/`;
  const EXT = process.argv.includes("--no-server");
  if (!EXT) server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: GUEST ? { ...process.env, VITE_USE_DB: "false", VITE_DEMO_AUTOLOGIN: "true" } : { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  for (let i = 0; i < 90; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  const DESK = process.argv.includes("--desktop");
  const page = await browser.newPage(DESK ? { viewport: { width: +arg("--w", 1366), height: +arg("--h", 768) } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const consoleHits = [];
  page.on("console", (m) => { const t = m.text(); if (/Maximum update depth|Too many re-renders|infinite/i.test(t)) consoleHits.push(t.slice(0, 300)); });
  page.on("pageerror", (e) => consoleHits.push("pageerror: " + e.message.slice(0, 300)));

  if (!GUEST) {
    fixture = await createFixture(log);
    log("filled:", JSON.stringify(await fillGroup(fixture, +arg("--posts", 30))));
    await page.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  }
  await page.addInitScript(() => {
    window.__long = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch {}
  });
  const cdp = await page.context().newCDPSession(page);
  const prof = async (label, fn) => {
    if (process.argv.includes("--trace")) {
      const events = []; const onData = (d) => events.push(...d.value);
      cdp.on("Tracing.dataCollected", onData);
      await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "v8.execute", "blink.user_timing"] }, transferMode: "ReportEvents" });
      await fn();
      const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
      await cdp.send("Tracing.end"); await done; cdp.off("Tracing.dataCollected", onData);
      const tot = new Map(); for (const e of events) { if (e.ph !== "X" || !e.dur) continue; if (!/^(Layout|UpdateLayoutTree|RecalculateStyles|Paint|PrePaint|Layerize|Commit|ParseHTML|FunctionCall|EvaluateScript|V8.GC|MajorGC|MinorGC|HitTest|IntersectionObserverController::computeIntersections|ImageDecodeTask|Decode Image|RunTask|TimerFire|FireAnimationFrame|EventDispatch|ScrollLayer|UpdateLayer|CompositeLayers)$/.test(e.name)) continue; tot.set(e.name, (tot.get(e.name) || 0) + e.dur / 1000); }
      log(`  TRACE ${label}:`, [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + "=" + v.toFixed(0)).join(" "));
      return;
    }
    if (!process.argv.includes("--profile")) return fn();
    await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 }); await cdp.send("Profiler.start");
    await fn();
    const { profile } = await cdp.send("Profiler.stop");
    const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map();
    const dts = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const cf = n.callFrame; const k = (cf.functionName || "(anon)") + " " + (cf.url || "").split("/").pop().split("?")[0] + ":" + cf.lineNumber; self.set(k, (self.get(k) || 0) + (dts[i] || 0) / 1000); });
    // inclusive per top-level file
    const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
    log(`  PROFILE ${label} (self ms):`); for (const [k, v] of top) log(`    ${v.toFixed(0).padStart(6)}  ${k}`);
    const byFile = new Map(); for (const [k, v] of self) { const f = k.split(" ")[1].split(":")[0]; byFile.set(f, (byFile.get(f) || 0) + v); }
    log("  by file:", [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, v]) => f + "=" + v.toFixed(0)).join(" "));
  };
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 300000 });
  await page.waitForTimeout(15000);
  if (+arg("--throttle", 1) > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: +arg("--throttle", 1) });

  // Answers within `ms`, or the main thread is stuck.
  const alive = async (label, ms = 4000) => {
    const t0 = Date.now();
    const ok = await Promise.race([
      page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(true), 0)))).catch(() => false),
      new Promise((r) => setTimeout(() => r(null), ms)),
    ]);
    const dt = Date.now() - t0;
    if (ok !== true) { findings.push(`${label}: main thread did not answer within ${ms} ms`); log("  FROZEN at", label); return false; }
    const lt = await page.evaluate(() => { const a = window.__long.slice(); window.__long.length = 0; return a; });
    const big = lt.filter((d) => d >= 400);
    if (big.length) findings.push(`${label}: long task(s) ${big.join(", ")} ms`);
    log(`  ${label}: frame in ${dt} ms; long tasks ${lt.join(",") || "none"}`);
    return true;
  };
  // A REAL click at the element's centre (hit-testing included), not el.click(): a layer over it eats it.
  const realClick = async (sel) => {
    const box = await page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, covered: top && top !== el && !el.contains(top) ? (top.tagName + " " + (top.getAttribute("aria-label") || top.className || "").toString().slice(0, 60)) : null }; }, sel);
    if (!box) return "missing";
    if (box.covered) findings.push(`${sel}: covered by ${box.covered}`);
    await page.mouse.click(box.x, box.y); return box.covered ? "covered" : "ok";
  };
  const tapText = (re, scope) => page.evaluate(([src, scope]) => {
    const rx = new RegExp(src);
    const root = scope ? document.querySelector(`[role=dialog][aria-label="${scope}"]`) : document;
    if (!root) return false;
    const els = [...root.querySelectorAll("button,[role=button],[role=tab],a,div[tabindex]")].filter((e) => e.offsetParent !== null && rx.test((e.getAttribute("aria-label") || e.innerText || "").trim()));
    const el = els[els.length - 1]; if (!el) return false; document.querySelectorAll("[data-probe]").forEach((x) => x.removeAttribute("data-probe")); el.setAttribute("data-probe", "1"); return true;
  }, [re.source, scope || null]).then(async (ok) => ok && (await realClick("[data-probe]")) !== "missing");

  // Groups opens from the Menu's Groups tile.
  const menu = DESK ? "nav strip" : await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /menu/i.test(x.getAttribute("aria-label") || "")); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__long.length = 0; });
  await prof("menu > Groups", async () => { await tapText(/^Groups$/); await page.waitForTimeout(3000); });
  await alive("groups tab");
  const gname = arg("--name") || (GUEST ? await page.evaluate(() => { const r = [...document.querySelectorAll("[role=button]")].find((e) => /You run this group|Member|Moderator/.test(e.innerText || "")); return r ? (r.getAttribute("aria-label") || "").split(",")[0] : null; }) : fixture.group?.name);
  log("group:", gname, "menu:", menu);
  if (process.argv.includes("--debug")) log((await page.evaluate(() => document.body.innerText)).slice(0, 1500));
  await page.waitForFunction((n) => document.body.innerText.includes(n), gname, { timeout: 20000 }).catch(() => findings.push("group never listed"));

  for (let i = 0; i < ROUNDS; i++) {
    let opened; await prof(`round ${i} open group`, async () => { opened = await page.evaluate((n) => { const el = [...document.querySelectorAll("[role=button]")].find((e) => !e.closest("[role=dialog]") && ((e.getAttribute("aria-label") || "").startsWith(n) || (e.innerText || "").includes(n))); if (!el) return false; document.querySelectorAll("[data-probe]").forEach((x) => x.removeAttribute("data-probe")); el.setAttribute("data-probe", "1"); return true; }, gname); if (opened) await realClick("[data-probe]"); await page.waitForTimeout(1500); });
    if (!opened) { findings.push(`round ${i}: could not find the group row`); break; }
    if (!(await alive(`round ${i} open`))) break;
    await page.waitForTimeout(1500);
    if (!(await alive(`round ${i} settled`))) break;
    for (const t of ["Discussion", "Events", "Members", "About"]) {
      await prof(`round ${i} ${t}`, async () => { if (!(await tapText(new RegExp("^" + t + "$"), gname))) findings.push(`round ${i}: no ${t} tab`); await page.waitForTimeout(700); });
      if (!(await alive(`round ${i} ${t}`))) break;
      log("    dom on", t, JSON.stringify(await page.evaluate(() => ({ buttons: document.querySelectorAll("button").length, nodes: document.getElementsByTagName("*").length }))));
      log("    scroll on", t, JSON.stringify(await page.evaluate((n) => { const d = document.querySelector(`[role=dialog][aria-label="${n}"]`); if (!d) return "no-dialog"; const c = d.firstElementChild; return { pane: [d.scrollHeight, d.clientHeight, getComputedStyle(d).overflowY], child: c ? [c.scrollHeight, c.clientHeight, getComputedStyle(c).overflowY] : null, inner: d.innerText.length }; }, gname)));
    }
    // The wheel over the group page must move it (Discussion first, it is the tall one).
    await tapText(/^Discussion$/, gname); await page.waitForTimeout(800);
    const before = await page.evaluate((n) => { const d = document.querySelector(`[role=dialog][aria-label="${n}"]`); return d ? [d.scrollTop, d.scrollHeight, d.clientHeight, JSON.stringify(d.getBoundingClientRect())] : null; }, gname);
    const vw = page.viewportSize(); await page.mouse.move(vw.width / 2, vw.height / 2); await page.mouse.wheel(0, 400); await page.waitForTimeout(600);
    const after = await page.evaluate((n) => { const d = document.querySelector(`[role=dialog][aria-label="${n}"]`); return d ? d.scrollTop : null; }, gname);
    log("  wheel on Discussion: before", JSON.stringify(before), "after", after);
    if (before && before[1] > before[2] + 5 && !(after > before[0])) findings.push(`round ${i}: the wheel did not scroll the group page (${JSON.stringify(before)} -> ${after})`);
    // A scroll and a tap must still land: the pane reports scrollTop after a wheel.
    const pane = await page.evaluate((n) => { const d = document.querySelector(`[role=dialog][aria-label="${n}"]`); if (!d) return "no-dialog"; const sc = [d, d.firstElementChild].find((x) => x && x.scrollHeight > x.clientHeight + 5); if (!sc) return "nothing to scroll (" + d.scrollHeight + "/" + d.clientHeight + ")"; sc.scrollTop = 200; return sc.scrollTop; }, gname);
    log("  pane scrollTop after set:", pane);
    // DESKTOP: the header's nav strip is still on screen above the group page. Does a tab in it still work?
    if (DESK && process.argv.includes("--nav")) {
      for (const label of ["Home", "Climbs", "Groups"]) {
        const hit = await page.evaluate((l) => { const nav = [...document.querySelectorAll("button,a,[role=tab],[role=button]")].filter((e) => !e.closest("[role=dialog]") && (e.innerText || "").trim() === l && e.getBoundingClientRect().top < 112); const el = nav[0]; if (!el) return null; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: top === el || el.contains(top) }; }, label);
        if (!hit) { log("   nav", label, "not on screen"); continue; }
        await page.mouse.click(hit.x, hit.y); await page.waitForTimeout(1200);
        const st = await page.evaluate((n) => ({ dialog: !!document.querySelector(`[role=dialog][aria-label="${n}"]`), dialogs: [...document.querySelectorAll("[role=dialog]")].map((d) => d.getAttribute("aria-label")), bodyFixed: document.body.style.position, htmlOverflow: document.documentElement.style.overflow, main: (document.querySelector("[role=main]") || document.body).innerText.slice(0, 80).replace(/\n/g, " | ") }), gname);
        log("   nav", label, "reachable:", hit.top, "->", JSON.stringify(st));
        if (st.dialog) findings.push(`round ${i}: clicking the nav strip's ${label} left the group page over it`);
        if (st.bodyFixed === "fixed" && !st.dialogs.length) findings.push(`round ${i}: after nav ${label}, the page is still locked with no dialog open`);
      }
      // reopen Groups for the next round
      await tapText(/^Groups$/); await page.waitForTimeout(1500);
      continue;
    }
    await tapText(/^← Back$|^Back$/, gname);
    await page.waitForTimeout(800);
    if (!(await alive(`round ${i} back`))) break;
    log("  after back:", JSON.stringify(await page.evaluate(() => ({ dialogs: [...document.querySelectorAll("[role=dialog]")].map((d) => d.getAttribute("aria-label")), body: document.body.getAttribute("style"), html: document.documentElement.getAttribute("style"), y: window.scrollY, text: document.body.innerText.slice(0, 300) }))));
  }
  // SHOW MORE, and a SHARED LINK to a post past the first page (the page must grow to include it, and keep it).
  if (process.argv.includes("--check-more") && fixture) {
    const opened = await page.evaluate((n) => { const el = [...document.querySelectorAll("[role=button]")].find((e) => !e.closest("[role=dialog]") && ((e.getAttribute("aria-label") || "").startsWith(n) || (e.innerText || "").includes(n))); if (!el) return false; el.click(); return true; }, gname);
    await page.waitForTimeout(1500);
    await tapText(/^Discussion$/, gname); await page.waitForTimeout(1500);
    const count = () => page.evaluate(() => document.querySelectorAll('[id^="gpost-"]').length);
    const c0 = await count();
    await tapText(/^Show more posts/, gname); await page.waitForTimeout(1200);
    const c1 = await count();
    log("  show more:", opened, c0, "->", c1);
    if (!(c1 > c0)) findings.push(`Show more posts did not add posts (${c0} -> ${c1})`);
    const H = headers(requireServiceKey());
    const oldest = (await (await fetch(`${SUPABASE_URL}/rest/v1/group_posts?group_id=eq.${fixture.group.id}&select=id&order=created_at.asc&limit=1`, { headers: H })).json())[0];
    await page.goto(`http://127.0.0.1:${PORT}/Climbing-App/?group=${fixture.group.id}&post=${oldest.id}`, { waitUntil: "domcontentloaded", timeout: 300000 });
    await page.waitForTimeout(15000);
    const st = await page.evaluate((pid) => { const el = document.getElementById("gpost-" + pid); if (!el) return { found: false }; const r = el.getBoundingClientRect(); return { found: true, top: Math.round(r.top), n: document.querySelectorAll('[id^="gpost-"]').length }; }, oldest.id);
    const toast = await page.evaluate(() => (document.querySelector('[role="status"]') || {}).innerText || "");
    log("  shared link to the oldest post:", JSON.stringify(st), "toast:", JSON.stringify(toast.slice(0, 120)));
    if (!st.found) findings.push("a shared link to a post past the first page did not show it" + (toast ? ` (toast: ${toast.slice(0, 100)})` : ""));
    else if (st.top < -50 || st.top > 900) findings.push(`the shared post is not scrolled into view (top ${st.top})`);
    await page.waitForTimeout(3000);
    const still = await page.evaluate((pid) => !!document.getElementById("gpost-" + pid), oldest.id);
    if (!still) findings.push("the shared post vanished once the link was done");
  }
  if (consoleHits.length) findings.push(...consoleHits.map((c) => "console: " + c));
} catch (e) {
  findings.push("probe error: " + e.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (fixture && !KEEP) { const left = await fixture.cleanup().catch((e) => [e.message]); if (left.length) console.error("FIXTURE LEFT:", left); }
}
log(findings.length ? "\nFINDINGS:\n- " + findings.join("\n- ") : "\nno freeze, no long task >= 400 ms, no update-depth warning");
process.exitCode = findings.length ? 1 : 0;
