// Does every control in this app DO something?
//
// check:ui already asks this, but only of controls whose visible text matches one of SEVEN
// hardcoded patterns ("11 updates ▾", "View all 14 alerts", …), capped at 4 per screen on 5
// tabs. That is a vocabulary-based sample of a codebase with hundreds of hand-built controls,
// and it is the too-narrow-proxy shape CLAUDE.md records repeatedly.
//
// This selects by STRUCTURE instead: anything the app has made interactive (button, role,
// cursor:pointer). Then it clicks each one from a pristine reload and asks whether ANYTHING
// changed -- body text, node count, overlay count, scroll position, aria state, or the URL.
//
// A control that changes nothing is this repo's signature failure (#371 a name that opened no
// profile, #377 a hook call in onClick, #381 a capped list). A handler that throws does not
// unmount React, so the app never blanks and the button is simply inert.
//
// Report-only. Precision has to be measured before any of this becomes a gate: a control can
// legitimately change nothing visible (a toggle already in that state, a backdrop shield, a
// copy-to-clipboard). The output separates what it measured from what it concluded.
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "http://localhost:5199/Climbing-App/";
const TABS = (process.argv.find((a) => a.startsWith("--tabs="))?.slice(7) || "Home,Climbs,Discover,Crew,Logbook,Profile").split(",");
const MAX_PER_TAB = Number(process.argv.find((a) => a.startsWith("--max="))?.slice(6) || 60);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

const waitForApp = async (ms = 60000) => {
  await page.waitForFunction(() => {
    const t = document.body?.innerText || "";
    return t.length > 200;
  }, { timeout: ms }).catch(() => {});
};

// The nav bar itself is excluded: those six controls demonstrably work (every other guard
// depends on them) and sweeping them would add six reloads per tab for no information.
const NAV = ["Home", "Climbs", "Discover", "Crew", "Logbook", "Profile"];

// ONE definition of "a control", shared by the enumerate half and the click half.
//
// These two disagreeing is not a hypothetical -- it was this probe's first bug and it
// produced a false finding rather than a miss. enumerate counted `nth` only among
// interactive elements while clickKey re-counted over EVERY div with a matching label, so
// nth=0 resolved to a non-interactive wrapper sitting above the real row. The sweep clicked
// a div with no handler and reported the working control beneath it as dead. Any change here
// must be made in the one place both halves read.
const CANDIDATE_FN = `(() => {
  const interactive = (el) => {
    if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "SUMMARY") return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "tab") return true;
    return getComputedStyle(el).cursor === "pointer";
  };
  const labelOf = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60);
  return (navNames) => {
    const seen = new Map();
    const out = [];
    for (const el of document.querySelectorAll("button,a,summary,div,span,b,label,li")) {
      if (!interactive(el)) continue;
      // Skip a container that merely INHERITS pointer from an interactive child -- the click
      // would land on the child anyway and the container is not a separate control.
      if (el.querySelector("button,a,[role='button']")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const label = labelOf(el);
      if (!label) continue;
      if (navNames.includes(label)) continue;
      const key = el.tagName + "|" + label;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      out.push({ el, tag: el.tagName, label, nth: n });
    }
    return out;
  };
})()`;

// Candidate controls, keyed so the SAME element can be re-found after a reload.
// Keyed by (tag, label, occurrence index) -- never by a raw index into the document, which
// moves the moment anything above it renders differently.
const enumerate = (navNames) => page.evaluate(
  ([fnSrc, navNames]) => eval(fnSrc)(navNames).map(({ tag, label, nth }) => ({ tag, label, nth })),
  [CANDIDATE_FN, navNames]);

// Scrolling and clicking are SEPARATE steps, and the split is load-bearing.
//
// With scrollIntoView immediately before the click, the baseline was taken at the old scroll
// position and the comparison then saw the scroll this probe had caused itself -- so every
// control read as live, including the injected inert one. Scroll first, take the baseline in
// the scrolled position, then click.
const scrollToKey = (k) => page.evaluate(([fnSrc, k, navNames]) => {
  const hit = eval(fnSrc)(navNames).find((c) => c.tag === k.tag && c.label === k.label && c.nth === k.nth);
  if (!hit) return "gone";
  hit.el.scrollIntoView({ block: "center" });
  return "ok";
}, [CANDIDATE_FN, k, NAV]);

const clickKey = (k) => page.evaluate(([fnSrc, k, navNames]) => {
  const hit = eval(fnSrc)(navNames).find((c) => c.tag === k.tag && c.label === k.label && c.nth === k.nth);
  if (!hit) return "gone";
  hit.el.click();
  return "clicked";
}, [CANDIDATE_FN, k, NAV]);

// What counts as "something happened". Body text is the coarse signal check:ui uses, but a
// control can legitimately change only the DOM (a chip highlights, a pane scrolls) so this
// takes a wider fingerprint. Digits are NOT masked: a count changing IS the effect for many
// of these controls. The ASPECT & SUN clock is the one false mover and lives on the route
// page, which this sweep does not enter.
const fingerprint = () => page.evaluate(() => ({
  text: (document.body.innerText || "").trim(),
  nodes: document.querySelectorAll("*").length,
  dialogs: document.querySelectorAll("[role='dialog']").length,
  scroll: Math.round((document.scrollingElement || document.body).scrollTop),
  href: location.href,
  aria: [...document.querySelectorAll("[aria-checked],[aria-expanded],[aria-selected]")]
    .map((e) => (e.getAttribute("aria-checked") || "") + (e.getAttribute("aria-expanded") || "") + (e.getAttribute("aria-selected") || "")).join(","),
}));

const same = (a, b) => a.text === b.text && a.nodes === b.nodes && a.dialogs === b.dialogs
  && a.scroll === b.scroll && a.href === b.href && a.aria === b.aria;

const tap = (text) => page.evaluate((t) => {
  const el = [...document.querySelectorAll('button,[role="button"],a,div,span')]
    .find((e) => (e.textContent || "").trim() === t);
  if (!el) return false;
  el.click();
  return true;
}, text);

// The expected result of this probe is "no findings", which is exactly what a broken
// detector prints. So it injects two controls into every loaded page: one genuinely inert,
// one that demonstrably mutates the DOM. The inert one MUST be reported and the live one
// MUST NOT, or the run has measured nothing and says so instead of printing a clean sweep.
// This is the lesson check:overflow records -- its predecessor's self-test passed while the
// detector was blind, because the injection landed outside the tree being examined.
const SELFTEST = !process.argv.includes("--no-selftest");
const DEAD_LABEL = "SELFTEST inert control";
const LIVE_LABEL = "SELFTEST live control";
// Injected at BODY level, deliberately outside #appscroll. The first version appended into
// the app tree and the inert button read as LIVE -- its click bubbled up into a real app
// handler, so it was never inert. That is also a genuine precision limit of this probe and
// not only a self-test artifact: a dead control whose ANCESTOR handles the click will read as
// live here. This probe therefore under-reports, which is the safe direction for a
// report-only sweep, but it means a clean run is not proof that every control works.
const injectSelfTest = () => page.evaluate(([dead, live]) => {
  const host = document.body;
  const mk = (text, onClick) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText = "display:block;width:120px;height:24px;cursor:pointer";
    if (onClick) b.addEventListener("click", () => {
      const s = document.createElement("span");
      s.textContent = "selftest-fired";
      host.appendChild(s);
    });
    host.appendChild(b);
  };
  mk(dead, false);           // no listener at all -- the control this probe exists to find
  mk(live, true);            // mutates the DOM -- must read as live
}, [DEAD_LABEL, LIVE_LABEL]);

const fresh = async (tab) => {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await waitForApp();
  await settledText(page, { timeout: 45000 }).catch(() => {});
  if (tab !== "Home") { await tap(tab); await page.waitForTimeout(1500); await settledText(page, { timeout: 30000 }).catch(() => {}); }
  if (SELFTEST) await injectSelfTest();
};

const dead = [], errored = [], moved = [], stats = {};
for (const tab of TABS) {
  await fresh(tab);
  const all = await enumerate(NAV);
  // The injected pair is appended last in DOM order, so a MAX_PER_TAB slice would drop it and
  // the self-test would silently stop testing anything.
  const isSelf = (c) => c.label === DEAD_LABEL || c.label === LIVE_LABEL;
  const controls = all.filter((c) => !isSelf(c)).slice(0, MAX_PER_TAB).concat(all.filter(isSelf));
  stats[tab] = { found: controls.filter((c) => !isSelf(c)).length, dead: 0, live: 0, gone: 0 };
  console.log(`\n${tab}: ${controls.length} controls`);
  for (const k of controls) {
    await fresh(tab);
    if ((await scrollToKey(k)) === "gone") { stats[tab].gone++; moved.push({ tab, ...k }); continue; }
    await page.waitForTimeout(350);           // let the scroll settle before the baseline
    const before = await fingerprint();
    pageErrors.length = 0;
    const hit = await clickKey(k);
    if (hit === "gone") { stats[tab].gone++; moved.push({ tab, ...k }); continue; }
    await page.waitForTimeout(1400);
    const after = await fingerprint();
    if (pageErrors.length) errored.push({ tab, ...k, err: pageErrors[0] });
    const self = isSelf(k);
    if (same(before, after)) { if (!self) stats[tab].dead++; dead.push({ tab, ...k }); process.stdout.write(self ? "S" : "x"); }
    else { if (!self) stats[tab].live++; process.stdout.write(self ? "s" : "."); }
  }
}

// Judge the self-test BEFORE any verdict is interpreted -- a blind detector must not get to
// print a clean sweep first.
if (SELFTEST) {
  const caughtDead = dead.some((d) => d.label === DEAD_LABEL);
  const falseAlarm = dead.some((d) => d.label === LIVE_LABEL);
  console.log(`\n\nself-test: inert control ${caughtDead ? "CAUGHT" : "MISSED"}; live control ${falseAlarm ? "WRONGLY FLAGGED" : "correctly ignored"}`);
  if (!caughtDead || falseAlarm) {
    console.log("this probe measured NOTHING -- do not read the findings below as a result.");
    await browser.close();
    process.exit(1);
  }
}
const isSelfLabel = (x) => x.label === DEAD_LABEL || x.label === LIVE_LABEL;
for (const arr of [dead, errored, moved]) {
  for (let i = arr.length - 1; i >= 0; i--) if (isSelfLabel(arr[i])) arr.splice(i, 1);
}

console.log("\n=== controls that changed NOTHING ===");
for (const d of dead) console.log(`  ${d.tab.padEnd(9)} <${d.tag.toLowerCase()}> ${JSON.stringify(d.label)}${d.nth ? ` #${d.nth}` : ""}`);
console.log("\n=== controls that RAISED an error ===");
for (const e of errored) console.log(`  ${e.tab.padEnd(9)} ${JSON.stringify(e.label)} :: ${e.err}`);
console.log("\n=== not found after reload (state-dependent, not judged) ===");
for (const m of moved.slice(0, 25)) console.log(`  ${m.tab.padEnd(9)} ${JSON.stringify(m.label)}`);
console.log("\n=== tally ===");
for (const [t, s] of Object.entries(stats)) console.log(`  ${t.padEnd(9)} found ${String(s.found).padStart(3)}  live ${String(s.live).padStart(3)}  dead ${String(s.dead).padStart(3)}  unreachable ${s.gone}`);
console.log(`\n${dead.length} candidates, ${errored.length} errors. REPORT ONLY -- read each before believing it.`);
await browser.close();
