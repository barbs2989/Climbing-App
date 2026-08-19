// The dead-control question, asked INSIDE the app's overlays.
//
// Three guards already open every overlay -- check:zero, check:signed-in, check:overlay-scroll
// -- and all three ask whether the sheet MOUNTED and how it scrolls. None asks whether the
// controls inside it do anything. That is a real gap: the overlays are where the
// trust-and-safety surfaces live (LogAscent, GiveVouch, ReportModal, ConnectModal), and
// #725 found 22 of them had never been reachable by any guard at all.
//
// Reuses scripts/overlay-scroll.config.mjs verbatim rather than adding a fourth scaffold, so
// this cannot drift from the three guards on which modals exist or how they are opened. It
// runs against the POPULATED demo for the same reason that config gives: at zero state most
// of these sheets have nothing in them to click.
//
// Report-only, and here is the blind spot that makes that mandatory rather than cautious.
//
// THE FINGERPRINT DOES NOT INCLUDE COMPUTED STYLE. It covers text, node count, dialogs, aria
// state and scroll positions -- so a control whose only effect is to restyle ITSELF reads as
// dead. Measured: this reported 9 of onboardOpen's controls as changing nothing (Rock,
// Scrambling, Alpine, Mountaineering, Hiking, Bouldering, Ice, Mixed, Aid), and all nine work
// fine -- clicking "Rock" takes it from rgb(22,27,34) to rgba(47,129,247,0.133). They are
// multi-select chips, which is the single commonest control shape this probe cannot judge.
//
// Adding computed style to the fingerprint is NOT the obvious fix: a :hover or :focus-visible
// rule left behind by the click would then make every control read as live, which is the
// false-PASS direction and strictly worse. Use probe-toggle-state-announced.mjs to judge chips
// -- it compares each control against its own siblings, which is what separates a toggle from
// a tab from a dead button.
//
// Other legitimate no-ops: a radio already selected, a backdrop shield stopping propagation.
// The output is candidates, not defects.
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { overlayStates, NEEDS_EXTRA_STATE } from "../lib/overlay-scaffold.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const MAX_PER_OVERLAY = Number((process.argv.find((a) => a.startsWith("--max=")) || "--max=14").slice(6));

const names = overlayStates(fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8")).map((s) => s.name);
if (!names.length) { console.error("discovered no overlays — discovery has drifted; this is a broken scan, not a clean app"); process.exit(1); }
const overlays = (ONLY ? names.filter((n) => ONLY.split(",").includes(n)) : names).filter((n) => !NEEDS_EXTRA_STATE[n]);

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5320);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
const stopServer = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });

const up = await (async () => { for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); } return false; })();
if (!up) { console.error("dev server never came up"); stopServer(); process.exit(1); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

// Only controls INSIDE the open sheet. An overlay renders over the tab behind it, so sweeping
// the whole document would re-test the tab's controls once per modal and report the page
// behind as part of the sheet.
const CANDIDATE_FN = `(() => {
  const isOverlayRoot = (el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25;
  };
  const interactive = (el) => {
    if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "SUMMARY") return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "tab") return true;
    return getComputedStyle(el).cursor === "pointer";
  };
  const labelOf = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60);
  return () => {
    const roots = [...document.querySelectorAll("div")].filter(isOverlayRoot)
      .filter((el, _i, all) => !all.some((o) => o !== el && o.contains(el)));
    if (!roots.length) return [];
    const seen = new Map();
    const out = [];
    for (const root of roots) {
      // The backdrop itself is a SHIELD, not a control: a fixed inset:0 element whose onClick
      // closes the sheet. It is excluded because clicking it dismisses the modal, which would
      // read as live and destroy the state for everything after it.
      for (const el of root.querySelectorAll("button,a,summary,div,span,b,label,li")) {
        if (!interactive(el)) continue;
        if (el.querySelector("button,a,[role='button']")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const label = labelOf(el);
        if (!label) continue;
        const key = el.tagName + "|" + label;
        const n = seen.get(key) || 0;
        seen.set(key, n + 1);
        out.push({ el, tag: el.tagName, label, nth: n });
      }
    }
    return out;
  };
})()`;

const enumerate = () => page.evaluate((fn) => eval(fn)().map(({ tag, label, nth }) => ({ tag, label, nth })), CANDIDATE_FN);
const act = (k, what) => page.evaluate(([fn, k, what]) => {
  const hit = eval(fn)().find((c) => c.tag === k.tag && c.label === k.label && c.nth === k.nth);
  if (!hit) return "gone";
  if (what === "scroll") { hit.el.scrollIntoView({ block: "center" }); return "ok"; }
  hit.el.click();
  return "clicked";
}, [CANDIDATE_FN, k, what]);

const fingerprint = () => page.evaluate(() => ({
  text: (document.body.innerText || "").trim().replace(/\d/g, "#"),
  nodes: document.querySelectorAll("*").length,
  dialogs: document.querySelectorAll("[role='dialog']").length,
  aria: [...document.querySelectorAll("[aria-checked],[aria-expanded],[aria-selected]")]
    .map((e) => (e.getAttribute("aria-checked") || "") + (e.getAttribute("aria-expanded") || "") + (e.getAttribute("aria-selected") || "")).join(","),
  scroll: [...document.querySelectorAll("div")].map((e) => e.scrollTop).join(","),
}));
const same = (a, b) => a.text === b.text && a.nodes === b.nodes && a.dialogs === b.dialogs && a.aria === b.aria && a.scroll === b.scroll;

const TABS = ["me", "today", "crew", "logbook", "routes", "discover"];
const load = async (qs, settle = 2200) => { await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 }); await page.waitForTimeout(settle); };

await load("?zt=today", 2500);
const booted = await page.evaluate(() => ({ chars: (document.body.innerText || "").length, hasNav: /Climbs/.test(document.body.innerText || "") }));
if (!booted.hasNav || booted.chars < 200) {
  console.error(`the app did not render (${booted.chars} chars). Nothing below was checked — look for ANCHOR LOST above.`);
  await browser.close(); stopServer(); process.exit(1);
}

// Find the tab each overlay actually mounts on, once, so the per-control loop does not
// re-search six tabs for every click.
const home = {};
for (const name of overlays) {
  for (const t of TABS) {
    await load(`?zt=${t}&z=${name}`);
    const noPayload = await page.evaluate((n) => (window.__overlayNoPayload || {})[n], name);
    if (noPayload) { home[name] = { skip: "no payload in the demo: " + noPayload }; break; }
    const n = (await enumerate()).length;
    if (n > 0) { home[name] = { tab: t, controls: n }; break; }
  }
  if (!home[name]) home[name] = { skip: "never mounted on any tab" };
}

const dead = [], errored = [], stats = {};
for (const name of overlays) {
  const h = home[name];
  if (h.skip) { console.log(`${name.padEnd(24)} skipped — ${h.skip}`); continue; }
  const first = await (async () => { await load(`?zt=${h.tab}&z=${name}`); return enumerate(); })();
  const controls = first.slice(0, MAX_PER_OVERLAY);
  stats[name] = { found: controls.length, live: 0, dead: 0, gone: 0 };
  process.stdout.write(`${name.padEnd(24)} ${String(controls.length).padStart(2)} controls  `);
  for (const k of controls) {
    await load(`?zt=${h.tab}&z=${name}`);
    if ((await act(k, "scroll")) === "gone") { stats[name].gone++; process.stdout.write("?"); continue; }
    await page.waitForTimeout(300);
    const before = await fingerprint();
    pageErrors.length = 0;
    if ((await act(k, "click")) === "gone") { stats[name].gone++; process.stdout.write("?"); continue; }
    await page.waitForTimeout(1200);
    const after = await fingerprint();
    if (pageErrors.length) errored.push({ name, ...k, err: pageErrors[0] });
    if (same(before, after)) { stats[name].dead++; dead.push({ name, ...k }); process.stdout.write("x"); }
    else { stats[name].live++; process.stdout.write("."); }
  }
  process.stdout.write("\n");
}

console.log("\n=== overlay controls that changed NOTHING ===");
for (const d of dead) console.log(`  ${d.name.padEnd(22)} <${d.tag.toLowerCase()}> ${JSON.stringify(d.label)}${d.nth ? ` #${d.nth}` : ""}`);
console.log("\n=== controls that RAISED an error ===");
for (const e of errored) console.log(`  ${e.name.padEnd(22)} ${JSON.stringify(e.label)} :: ${e.err}`);
const tot = Object.values(stats).reduce((a, s) => ({ f: a.f + s.found, l: a.l + s.live, d: a.d + s.dead }), { f: 0, l: 0, d: 0 });
console.log(`\nswept ${Object.keys(stats).length} overlays, ${tot.f} controls: ${tot.l} live, ${tot.d} candidates, ${errored.length} errors.`);
console.log("REPORT ONLY — read each before believing it.");
await browser.close(); stopServer();
