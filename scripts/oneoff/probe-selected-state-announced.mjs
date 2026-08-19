// Does a selected tab TELL anyone it is selected, or only look it?
//
// The app's primary nav is right: `aria-current={tab===n.id?"page":undefined}`. It is the only
// place in the codebase that says so -- zero `aria-selected`, zero `role="tab"`, and that one
// `aria-current`. Every other tab bar marks the active option with a colour and nothing else,
// so a screen reader announces "Crews, 1" identically whether or not it is the current view.
//
// #740 gave exactly these buttons an aria-label because their announced NAME was wrong
// ("Friends2"). Their announced STATE was left out, and no guard asks: check:a11y-names asks
// whether a control has a name, check:a11y-badges whether that name has a count welded into
// it. Neither asks whether the name is enough to navigate by.
//
// BEHAVIOURAL, not visual, and that is the whole precision story. The first draft called a bar
// "any sibling row where exactly one button has a different background", which is also what a
// PRIMARY ACTION looks like: it reported [Accept | Decline] and [Share profile | View public
// profile] as tab bars with an unannounced selection. Those have no selected state to announce
// and flagging them is how a report gets ignored. A real tab bar is identified by DOING it:
// click a sibling, and the bar must survive with the highlight MOVED onto what you clicked.
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const BASE = arg("base", "http://localhost:5199/Climbing-App/");
const TABS = arg("tabs", "Home,Climbs,Discover,Crew,Logbook,Profile").split(",");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });

// A candidate bar: >=2 sibling controls on one row. "Distinguished" is deliberately wider than
// background alone -- the primary nav marks its active tab with colour and weight, not a
// background, and a detector that missed the ONE correct bar in the app could never verify
// itself.
const SCAN = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8; };
  const lab = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 28);
  const sig = (el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.fontWeight, c.borderBottomColor, c.borderBottomWidth].join("~"); };
  const announces = (el) => el.getAttribute("aria-current") ? "aria-current"
    : el.getAttribute("aria-selected") === "true" ? "aria-selected"
    : el.getAttribute("aria-pressed") === "true" ? "aria-pressed" : null;
  const groups = new Map();
  for (const el of document.querySelectorAll("button,[role='button'],[role='tab']")) {
    if (!vis(el)) continue;
    const p = el.parentElement; if (!p) continue;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(el);
  }
  const out = [];
  for (const [, kids] of groups) {
    if (kids.length < 2) continue;
    const rects = kids.map((k) => k.getBoundingClientRect());
    if (!rects.every((r) => Math.abs(r.top - rects[0].top) < 6)) continue;
    const sigs = kids.map(sig);
    const counts = {}; for (const s of sigs) counts[s] = (counts[s] || 0) + 1;
    const odd = Object.keys(counts).find((s) => counts[s] === 1);
    if (!odd || Object.keys(counts).length !== 2) continue;
    const i = sigs.indexOf(odd);
    out.push({ bar: kids.map(lab), selected: lab(kids[i]), announces: announces(kids[i]), role: kids[i].getAttribute("role") || kids[i].tagName.toLowerCase() });
  }
  return out;
})()`;

const scan = () => page.evaluate((s) => eval(s), SCAN);
const clickLabel = (t) => page.evaluate((t) => {
  const el = [...document.querySelectorAll("button,[role='button'],[role='tab']")]
    .find((e) => ((e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28)) === t);
  if (!el) return false; el.scrollIntoView({ block: "center" }); el.click(); return true;
}, t);
const tap = async (t) => {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button,[role="button"],a,div,span')].find((e) => (e.textContent || "").trim() === t);
    if (!el) return false; el.click(); return true;
  }, t);
  if (ok) await settledText(page, { timeout: 30000 }).catch(() => {});
  return ok;
};
const goTab = async (t) => {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 });
  await settledText(page, { timeout: 45000 }).catch(() => {});
  if (t !== "Home") await tap(t);
  await page.waitForTimeout(900);
};

const real = [], rejected = [], seen = new Set();
for (const t of TABS) {
  await goTab(t);
  const cands = await scan();
  for (const c of cands) {
    const key = c.bar.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    // THE TEST: click a sibling that is not the highlighted one. A tab bar survives with the
    // highlight moved onto what was clicked. An action row does not.
    const other = c.bar.find((b) => b !== c.selected);
    if (!other) { rejected.push({ ...c, why: "no other member" }); continue; }
    await goTab(t);
    if (!(await clickLabel(other))) { rejected.push({ ...c, why: "could not click a sibling" }); continue; }
    await page.waitForTimeout(1200);
    await settledText(page, { timeout: 20000 }).catch(() => {});
    const after = (await scan()).find((x) => x.bar.join("|") === key);
    if (!after) { rejected.push({ ...c, why: "the bar did not survive the click — an action row, not a tab bar" }); continue; }
    if (after.selected !== other) { rejected.push({ ...c, why: `highlight did not move (still ${JSON.stringify(after.selected)})` }); continue; }
    real.push({ tab: t, ...c, movedTo: after.selected, announcesAfter: after.announces });
  }
}

console.log("=== CONFIRMED tab bars (highlight moves when a sibling is clicked) ===");
for (const r of real) {
  const ok = r.announces || r.announcesAfter;
  console.log(`  ${ok ? "ok  " : "MUTE"}  ${r.tab.padEnd(9)} [${r.bar.join(" | ")}]  selected=${JSON.stringify(r.selected)}  ${ok ? "via " + ok : "announces NOTHING — colour only"}`);
}
console.log("\n=== rejected candidates (not tab bars) ===");
for (const r of rejected) console.log(`  [${r.bar.join(" | ")}] — ${r.why}`);

const mute = real.filter((r) => !(r.announces || r.announcesAfter));
const voiced = real.filter((r) => r.announces || r.announcesAfter);
if (!real.length) { console.error("\nfound NO tab bars at all — the detector broke; this is not a clean result"); await browser.close(); process.exit(1); }
if (!voiced.length) { console.error("\nno bar announces its selection — the primary nav does, so the detector is blind"); await browser.close(); process.exit(1); }
console.log(`\n${mute.length} confirmed tab bars convey selection by colour alone; ${voiced.length} announce it.`);
await browser.close();
