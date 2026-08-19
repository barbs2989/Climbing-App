// The same dead-control question, asked of the ROUTE DETAIL screen.
//
// probe-dead-controls sweeps the six tabs. Route detail is not one of them, and it is both the
// richest layout in the app and the screen where this class of bug has actually happened --
// the same reason check:overflow was extended to it and made a hard failure there.
//
// It is reached by DRIVING the UI (country -> state -> Routes -> search -> open), because this
// probe runs against a plain dev server and `?zr=1` needs the scaffold config that only the
// wired guards build. If the drill-in does not complete, that is reported as NOT REACHED and
// the run exits non-zero -- a screen this probe cannot open must not read as a screen with
// nothing wrong.
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const BASE = arg("base", "http://localhost:5199/Climbing-App/");
const STATE = arg("state", "Washington");
const ROUTE = arg("route", "North Ridge (Complete)");
const SUBTABS = arg("subtabs", "Overview,Conditions,Planner,Safety,Photos,Ranks").split(",");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

const CANDIDATE_FN = `(() => {
  const interactive = (el) => {
    if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "SUMMARY") return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "tab") return true;
    return getComputedStyle(el).cursor === "pointer";
  };
  const labelOf = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60);
  return (skip) => {
    const seen = new Map();
    const out = [];
    for (const el of document.querySelectorAll("button,a,summary,div,span,b,label,li")) {
      if (!interactive(el)) continue;
      if (el.querySelector("button,a,[role='button']")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const label = labelOf(el);
      if (!label) continue;
      if (skip.includes(label)) continue;
      // Anything inside fixed/sticky chrome is the bottom nav or the header strap; a sub-tab
      // name collides with a nav name and a global match silently leaves the route page.
      let chrome = false;
      for (let p = el; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") { chrome = true; break; } }
      if (chrome) continue;
      const key = el.tagName + "|" + label;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      out.push({ el, tag: el.tagName, label, nth: n });
    }
    return out;
  };
})()`;

const SKIP = ["Home", "Climbs", "Discover", "Crew", "Logbook", "Profile", ...SUBTABS];

const enumerate = () => page.evaluate(([fn, skip]) => eval(fn)(skip).map(({ tag, label, nth }) => ({ tag, label, nth })), [CANDIDATE_FN, SKIP]);
const scrollToKey = (k) => page.evaluate(([fn, k, skip]) => {
  const hit = eval(fn)(skip).find((c) => c.tag === k.tag && c.label === k.label && c.nth === k.nth);
  if (!hit) return "gone";
  hit.el.scrollIntoView({ block: "center" });
  return "ok";
}, [CANDIDATE_FN, k, SKIP]);
const clickKey = (k) => page.evaluate(([fn, k, skip]) => {
  const hit = eval(fn)(skip).find((c) => c.tag === k.tag && c.label === k.label && c.nth === k.nth);
  if (!hit) return "gone";
  hit.el.click();
  return "clicked";
}, [CANDIDATE_FN, k, SKIP]);

// Digits are masked in the TEXT field here, unlike the tab sweep: the ASPECT & SUN readout on
// this screen carries a live clock, so an unmasked comparison would call every control live.
// The unmasked node/aria/scroll fields still catch a change the masking would hide.
const fingerprint = () => page.evaluate(() => ({
  text: (document.body.innerText || "").trim().replace(/\d/g, "#"),
  nodes: document.querySelectorAll("*").length,
  dialogs: document.querySelectorAll("[role='dialog']").length,
  scroll: Math.round((document.scrollingElement || document.body).scrollTop),
  aria: [...document.querySelectorAll("[aria-checked],[aria-expanded],[aria-selected]")]
    .map((e) => (e.getAttribute("aria-checked") || "") + (e.getAttribute("aria-expanded") || "") + (e.getAttribute("aria-selected") || "")).join(","),
}));
const same = (a, b) => a.text === b.text && a.nodes === b.nodes && a.dialogs === b.dialogs && a.scroll === b.scroll && a.aria === b.aria;

const tap = async (name) => {
  const ok = await page.evaluate((n) => {
    const hit = [...document.querySelectorAll("button,div,span,a")].filter((e) => (e.innerText || "").trim() === n)
      .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; });
    if (!hit.length) return false;
    hit[0].click(); return true;
  }, name);
  if (ok) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return ok;
};
const tapAnywhere = async (name) => {
  const ok = await page.evaluate((n) => {
    const el = [...document.querySelectorAll("button,div,span,a")].find((e) => (e.innerText || "").trim() === n);
    if (!el) return false;
    el.click(); return true;
  }, name);
  if (ok) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return ok;
};
const pickInSelect = (namePrefix, label) => page.evaluate(({ namePrefix, label }) => {
  const sel = [...document.querySelectorAll("select")].find((x) => (x.getAttribute("aria-label") || "").startsWith(namePrefix));
  if (!sel) return "no-select";
  const opt = [...sel.options].find((o) => o.label === label || o.label.startsWith(label + " ") || o.label.startsWith(label + " —"));
  if (!opt) return "no-option";
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return "ok";
}, { namePrefix, label });

// Open the route from a cold load. Returns true only if the route page is actually on screen.
async function openRoute() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 });
  await settledText(page, { timeout: 45000 }).catch(() => {});
  if (!(await tapAnywhere("Climbs"))) return false;
  await pickInSelect("Select a country", "United States");
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  const sp = await pickInSelect("Select a state", STATE);
  if (sp !== "ok") return false;
  await page.waitForTimeout(800);
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  await tap("Routes");
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
    const input = await page.$('input[type="text"], input:not([type])');
    if (input) { await input.fill(""); await input.fill(ROUTE); await page.waitForTimeout(800); await settledText(page, { min: 30, timeout: 45000 }).catch(() => {}); }
    if (await tap(ROUTE)) return true;
  }
  return false;
}

if (!(await openRoute())) {
  console.error(`NOT REACHED — could not open ${JSON.stringify(ROUTE)} in ${STATE}.`);
  console.error("This probe has measured nothing about route detail; that is a failure, not a clean sweep.");
  await browser.close(); process.exit(1);
}
console.log(`opened ${ROUTE}\n`);

const dead = [], errored = [], stats = {};
for (const sub of SUBTABS) {
  if (!(await openRoute())) { console.log(`  ${sub}: could not re-open the route — skipped`); continue; }
  if (sub !== "Overview" && !(await tap(sub))) { console.log(`  ${sub}: sub-tab not offered on this route`); continue; }
  const controls = await enumerate();
  stats[sub] = { found: controls.length, live: 0, dead: 0, gone: 0 };
  console.log(`${sub}: ${controls.length} controls`);
  for (const k of controls) {
    if (!(await openRoute())) { stats[sub].gone++; continue; }
    if (sub !== "Overview") await tap(sub);
    if ((await scrollToKey(k)) === "gone") { stats[sub].gone++; continue; }
    await page.waitForTimeout(350);
    const before = await fingerprint();
    pageErrors.length = 0;
    if ((await clickKey(k)) === "gone") { stats[sub].gone++; continue; }
    await page.waitForTimeout(1500);
    const after = await fingerprint();
    if (pageErrors.length) errored.push({ sub, ...k, err: pageErrors[0] });
    if (same(before, after)) { stats[sub].dead++; dead.push({ sub, ...k }); process.stdout.write("x"); }
    else { stats[sub].live++; process.stdout.write("."); }
  }
  process.stdout.write("\n");
}

console.log("\n=== route-detail controls that changed NOTHING ===");
for (const d of dead) console.log(`  ${d.sub.padEnd(11)} <${d.tag.toLowerCase()}> ${JSON.stringify(d.label)}${d.nth ? ` #${d.nth}` : ""}`);
console.log("\n=== controls that RAISED an error ===");
for (const e of errored) console.log(`  ${e.sub.padEnd(11)} ${JSON.stringify(e.label)} :: ${e.err}`);
console.log("\n=== tally ===");
for (const [s, v] of Object.entries(stats)) console.log(`  ${s.padEnd(11)} found ${String(v.found).padStart(3)}  live ${String(v.live).padStart(3)}  dead ${String(v.dead).padStart(3)}  unreachable ${v.gone}`);
console.log(`\n${dead.length} candidates, ${errored.length} errors. REPORT ONLY — read each before believing it.`);
await browser.close();
