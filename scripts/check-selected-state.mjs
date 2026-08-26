#!/usr/bin/env node
// check:selected-state — a control that LOOKS selected must SAY it is selected.
//
// Until #1041 the primary nav was the only control in this app that did:
// `aria-current={tab===n.id?"page":undefined}`, and it was literally the only `aria-current`
// in the codebase, against ZERO `aria-selected` and ZERO `role="tab"`. Every other tab bar and
// every toggle chip marked its state with a background colour and nothing else, so a screen
// reader announced "Crews, 1" identically whether or not it was the view you were looking at.
// #1041 and #1062 fixed 21 controls across 4 tab bars and 4 toggle groups.
//
// This exists because that fix has no other protection. A fifth bar added next month is mute
// again and nothing says so — the shape CLAUDE.md records as "a semantic invariant in a
// comment will rot". The invariant is not expressible in the source either: it is a
// relationship between what a control looks like and what it announces, and only layout knows.
//
// NO SIBLING GUARD ASKS THIS, and the two nearest ones show why it is a separate question.
// check:a11y-names asks whether a control HAS a name; check:a11y-badges asks whether that name
// has a count welded into it (#740 gave these exact buttons their aria-labels for precisely
// that reason — the STATE was left out in the same commit). A mute tab bar passes both.
//
// ---------------------------------------------------------------------------------------
// BEHAVIOURAL, NOT VISUAL, and the first draft got that wrong in the direction that matters.
//
// Selecting "a sibling row where exactly one control has a different background" also
// describes a PRIMARY ACTION button. That draft reported [Accept | Decline],
// [Edit profile | Settings] and [Share profile | View public profile] as tab bars with an
// unannounced selection. None of them has a selected state to announce, and a guard that
// flags correct work is one people learn to ignore. So the shape is identified by DOING it —
// click a control, then look at its SIBLINGS:
//
//     siblings also changed  -> a tab bar; exactly one is current   -> wants aria-current
//     siblings unchanged     -> an independent toggle               -> wants aria-pressed
//     the control vanished   -> it navigated; not a stateful control at all
//
// Markup cannot separate those: all three are a <button> with a conditional background.
// ---------------------------------------------------------------------------------------
//
// FAILS CLOSED IN BOTH DIRECTIONS, and the second test earned itself immediately. "No
// stateful controls found" is a broken detector. So is "nothing announces its selection",
// because the primary nav is KNOWN to — and the colour-only draft was blind to the nav (it
// marks its active tab with weight and colour, not a background), so that assertion is what
// caught the blindness rather than a clean-looking run.
//
// Injection cases at the bottom of this file.
import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "./lib/render-settle.mjs";
import { assertDbReachable } from "./lib/db-preflight.mjs";
import { overlayStates, NEEDS_EXTRA_STATE } from "./lib/overlay-scaffold.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const TABS = arg("tabs", "Home,Climbs,Discover,Crew,Logbook,Profile").split(",").filter(Boolean);
// EVERY overlay the app declares, DISCOVERED rather than listed.
//
// A hand-picked list is what put this guard wrong twice in one day. It shipped walking six
// tabs and onboarding, which left RouteDetail's sub-tab bar — one of the four #1041 fixed —
// uncovered; and it left the Inbox modal's Friends/Crews bar, a SIXTH mute bar of exactly the
// shape #1041 fixed, undiscovered until somebody grepped for it by hand. A list of screens
// rots the moment a screen is added, and the hole it leaves is invisible by construction:
// nothing reports a screen that was never opened.
//
// Discovery is shared with check:zero, check:signed-in and check:overlay-scroll via
// overlay-scaffold.mjs, so the four cannot drift on which modals exist. The cost is bounded by
// the group-level dedupe below: an overlay renders over the tab behind it, so nearly every
// group it shows has already been measured, and only genuinely new bars are clicked.
const OVERLAYS = (() => {
  const explicit = process.argv.find((a) => a.startsWith("--overlays="));
  if (explicit) return explicit.slice(11).split(",").filter(Boolean);
  return overlayStates(fs.readFileSync(ROOT + "ClimbMatch.jsx", "utf8"))
    .map((s) => s.name)
    .filter((n) => !NEEDS_EXTRA_STATE[n]);
})();
// An injection hook, so a case can prove this guard fails when the app regresses without
// anyone editing the app. Not used in a normal run.
const STRIP = arg("strip-aria", "");

const log = (s) => console.log(s);
const fails = [];

await assertDbReachable({
  label: "check:selected-state",
  why: "it clicks through tab bars whose contents come from the catalog; with no data the " +
       "bars never populate and every screen would burn its settle timeout",
});

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5340);
if (port === null) { console.error("no free port in 5340-5379"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

// The overlay-scroll config, reused verbatim rather than adding a fifth scaffold: it injects
// the shared `?z=` opener and rewrites nothing about app state, which is exactly what is
// needed to reach onboardOpen on the populated demo.
log(`starting dev server on ${port} with the overlay scaffold...`);
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
server.stderr.on("data", (d) => { const s = String(d); if (/ANCHOR LOST|Error/.test(s)) process.stderr.write(s); });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });

const up = await (async () => {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
})();
if (!up || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}
// Warm the module graph. A cold first request compiles ~1.5MB and otherwise blows the
// navigation timeout, which reads as a dead server rather than a slow one.
await fetch(base + "ClimbMatch.jsx").catch(() => {});

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) {
  console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
  console.error("playwright-core downloads no browser of its own — install Chrome, or use a runner image that has it.");
  stopServer(); process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);

// Injection hook: keep the app's announcement permanently stripped, so a case can prove this
// guard goes red on a regression without editing the app.
//
// A ONE-SHOT strip after load does NOT work and silently proves nothing: this guard CLICKS a
// control, React re-renders that subtree, and the attribute comes straight back — injection
// case 1 passed cleanly against a guard that was being handed correct markup at the only
// moment it looked. A MutationObserver installed before any app code runs is what actually
// holds the regression in place for the whole run.
if (STRIP) {
  await page.addInitScript((which) => {
    const strip = (root) => {
      if (root.nodeType === 1 && root.hasAttribute(which)) root.removeAttribute(which);
      if (root.querySelectorAll) for (const el of root.querySelectorAll("[" + which + "]")) el.removeAttribute(which);
    };
    const start = () => {
      strip(document.documentElement);
      new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === "attributes") strip(m.target);
          for (const n of m.addedNodes || []) strip(n);
        }
      }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: [which] });
    };
    if (document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start);
  }, STRIP);
}

// A candidate is any visible control with siblings on the same row. "Distinguished" is
// deliberately wider than background alone: the primary nav marks its active tab with weight
// and colour and no background, and a detector blind to the one correct bar in the app could
// never verify itself.
const SCAN = `(() => {
  // Blur before measuring, ALWAYS -- baseline and post-click alike.
  //
  // el.click() leaves the control focused, and a :focus-visible rule changes borderColor or
  // color. Without this the guard reads its own focus ring as a state change: Profile's
  // [Weekends | Weekday eves | Anytime | Clear] quick-set row has CONSTANT styling and no
  // selected state at all, and it was reported as a mute toggle. Measuring selection means
  // measuring selection, not focus. This is the exact false-positive class recorded against
  // the sibling dead-control probes for adding computed style to a fingerprint.
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8; };
  const lab = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 30);
  const sig = (el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.borderColor, c.fontWeight].join("~"); };
  // PRESENCE announces, not the value "true", and getting this wrong produced a false
  // failure on correct code. This guard clicks the majority-signature member of a group, so
  // on a row where most chips are already ON the click turns one OFF -- the control then
  // carries aria-pressed="false", which is a complete and correct announcement of its state.
  // Requiring "true" reported the fixed [Weekends|Weekday AM|Weekday PM|Flexible] row as
  // mute. aria-current is different: it is absent on the non-current members by design, so
  // there any value other than "false" counts.
  const says = (el) => {
    const cur = el.getAttribute("aria-current");
    if (cur && cur !== "false") return "aria-current";
    if (el.getAttribute("aria-selected") !== null) return "aria-selected";
    if (el.getAttribute("aria-pressed") !== null) return "aria-pressed";
    // A DISCLOSURE announces with aria-expanded, and it is a genuine third answer rather than
    // a loophole. Climb with them again is a setClimbAgainOpen toggle that OPENS A PANEL, so
    // demanding aria-pressed of it would be the wrong fix. NOTE: no backticks in here -- this
    // whole function lives inside the SCAN template literal, and one backtick ends the string.
    if (el.getAttribute("aria-expanded") !== null) return "aria-expanded";
    return null;
  };
  const groups = new Map();
  for (const el of document.querySelectorAll("button,[role='button'],[role='tab'],[role='checkbox']")) {
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
    const group = kids.map(lab).join("|");
    // Identity is (group, label, nth-within-group) and NOTHING positional in the flat list.
    // A first draft pushed the index WITHIN the group and then used it to index the FLAT
    // array, so every lookup missed and the guard reported "no stateful controls anywhere" on
    // a healthy app. Same one-definition-in-two-places bug this file's sibling probes hit.
    const seenInGroup = new Map();
    for (const k of kids) {
      const l = lab(k);
      const n = seenInGroup.get(l) || 0;
      seenInGroup.set(l, n + 1);
      out.push({ el: k, group, label: l, nth: n, sig: sig(k), says: says(k) });
    }
  }
  return out;
})()`;

// The scan returns live element handles inside the page, so `snapshot` strips them for the
// Node side while `clickOne` keeps them. Both call the SAME function — the element a click
// lands on is by construction the element that was measured.
const snapshot = () => page.evaluate((s) => eval(s).map(({ group, label, nth, sig, says }) => ({ group, label, nth, sig, says })), SCAN);
const clickOne = (c) => page.evaluate(([s, c]) => {
  const hit = eval(s).find((x) => x.group === c.group && x.label === c.label && x.nth === c.nth);
  if (!hit) return false;
  hit.el.scrollIntoView({ block: "center" });
  hit.el.click();
  return true;
}, [SCAN, c]);

const tap = async (t) => {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button,[role="button"],a,div,span')].find((e) => (e.textContent || "").trim() === t);
    if (!el) return false; el.click(); return true;
  }, t);
  if (ok) await settledText(page, { timeout: 30000 }).catch(() => {});
  return ok;
};

const load = async (qs, tab, awaitRoute) => {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 }).catch(() => {});
  // Wait on the NAVIGATION as well as on the text settling. `?zr=1` calls the app's own
  // openRoute() from inside the injected opener, and settling says nothing about whether that
  // has happened yet — the race check:overflow's first CI run got wrong.
  if (awaitRoute) await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).catch(() => {});
  await settledText(page, { timeout: 45000 }).catch(() => {});
  if (tab && tab !== "Home") { await tap(tab); await page.waitForTimeout(900); }
};

// THE FALSE-PASS GUARD. Vite reports a throwing transform as a per-request internal error and
// keeps serving, so a lost anchor produces a blank app in which nothing mounts, no bar is
// found, and a naive run would report a clean sweep. index.html's boot placeholder MIRRORS the
// real nav, so the nav being on screen proves nothing — the character count is what separates
// the shell from the app.
await load("?zt=today");
const booted = await page.evaluate(() => ({ chars: (document.body.innerText || "").length, hasNav: /Climbs/.test(document.body.innerText || "") }));
if (!booted.hasNav || booted.chars < 200) {
  console.error(`the app did not render (${booted.chars} chars of text, nav ${booted.hasNav ? "present" : "MISSING"}).`);
  console.error("Nothing below was checked — look for 'ANCHOR LOST' or a pre-transform error above.");
  await browser.close(); stopServer(); process.exit(1);
}

const screens = [
  ...TABS.map((t) => ({ name: t, qs: `?zt=today`, tab: t })),
  ...OVERLAYS.map((o) => ({ name: `overlay:${o}`, qs: `?zt=me&z=${o}`, tab: null })),
  // Route detail carries its OWN sub-tab bar (Overview / Plan / Reports / Safety / Partners /
  // Photos) and #1041 fixed it — but no tab walk reaches that screen, so the fix shipped
  // unguarded. Navigated rather than driven: `?zr=1` calls the app's own openRoute() from
  // inside the shared opener, which no slow list, differently-rendered row or moved <select>
  // label can defeat. Same reasoning, and the same mechanism, as check:overflow.
  { name: "route detail", qs: "?zr=1", tab: null, awaitRoute: true },
];

const tabBars = [], toggles = [], seen = new Set();
let routeReached = false;
for (const s of screens) {
  await load(s.qs, s.tab, s.awaitRoute);
  if (s.awaitRoute) routeReached = await page.evaluate(() => window.__routeOpen === true);
  const first = await snapshot();
  if (!first.length) { log(`  ${s.name.padEnd(18)} no grouped controls on screen`); continue; }
  const key = (x) => x.group + "#" + x.label + "#" + x.nth;
  // ONE representative per group, not every member.
  //
  // The attribute is written by a single expression over the whole bar (`aria-current={
  // crewView===z[0]?...}`), so testing all 44 controls on Crew to learn 10 facts is pure cost —
  // and cost matters here: each probe is a full reload, and the every-member version took ~13
  // minutes for two tabs, which does not fit a CI job. Prefer a member that is NOT currently
  // the odd one out, so the click has something to change.
  const byGroup = new Map();
  for (const c of first) if (!byGroup.has(c.group)) byGroup.set(c.group, []);
  for (const c of first) byGroup.get(c.group).push(c);
  let measured = 0, unnamed = 0;
  for (const [group, kids] of byGroup) {
    if (seen.has(group)) continue;
    const counts = {};
    for (const k of kids) counts[k.sig] = (counts[k.sig] || 0) + 1;
    // Order candidates by how COMMON their signature is: the most common is the one least
    // likely to be the currently-selected member, so clicking it has something to change.
    const order = kids.slice().sort((x, y) => counts[y.sig] - counts[x.sig]);
    // A control with no accessible name cannot be named in a failure message, and naming it is
    // check:a11y-names' job rather than this one's. Counted and reported, never a verdict.
    if (!order[0].label) { unnamed += kids.length; seen.add(group); continue; }

    // TRY MORE THAN ONE MEMBER, and the Inbox bar is why.
    //
    // On a TWO-member bar the signature counts tie 1-1, so "most common" picks arbitrarily —
    // and if it picks the tab that is already selected, the click changes nothing and the whole
    // bar reads as "not stateful" and drops silently out of coverage. That is exactly how the
    // Inbox's Friends/Crews bar measured 0 stateful while being a real, mute tab bar. Trying
    // the next member until one actually moves fixes the tie and every already-selected case
    // with it.
    let b = null, a = null, before = null, after = null, c = null;
    let dirty = true;   // first candidate always needs a clean load
    for (const cand of order.slice(0, 3)) {
      if (!cand.label) continue;
      // Reload only when the PAGE was actually disturbed. A candidate that changed nothing
      // left the screen exactly as it was — that is what "changed nothing" means — so the next
      // candidate can be tried straight away. Reloading unconditionally tripled the number of
      // navigations and put a full discovery run (58 screens) past the CI job timeout.
      if (dirty) { await load(s.qs, s.tab, s.awaitRoute); dirty = false; }
      const snap0 = await snapshot();
      const b0 = snap0.find((x) => key(x) === key(cand));
      if (!b0) continue;
      if (!(await clickOne(cand))) continue;
      await page.waitForTimeout(1000);
      await settledText(page, { timeout: 20000 }).catch(() => {});
      const snap1 = await snapshot();
      const a0 = snap1.find((x) => key(x) === key(cand));
      if (!a0) { dirty = true; continue; }              // navigated away: not a stateful control
      // Only a click that moved SOMETHING dirties the page. Compare the whole snapshot, not
      // just this control: a click can change a sibling or open a panel while leaving the
      // control itself alone, and carrying on from there would measure the wrong screen.
      if (JSON.stringify(snap1) !== JSON.stringify(snap0)) dirty = true;
      if (a0.sig === b0.sig) continue;                  // already selected, or simply not stateful
      c = cand; b = b0; a = a0; before = snap0; after = snap1;
      break;
    }
    if (!c) continue;
    seen.add(group);
    // Did any SIBLING also change? That is what separates a tab bar from an independent toggle.
    const sibsMoved = before.some((x) => x.group === c.group && key(x) !== key(c)
      && after.some((y) => key(y) === key(x) && y.sig !== x.sig));
    const row = { screen: s.name, label: c.label, group, says: a.says };
    if (sibsMoved) { tabBars.push(row); measured++; continue; }

    // NOT a tab bar. Before calling it a toggle, require it to be REVERSIBLE -- click again
    // and it must come back to exactly the signature it started with. That is what a toggle
    // IS, and it is the test that separates one from an action button whose own style changed
    // for some other reason (going busy, going disabled, gaining a "done" tick). Without it
    // this guard reported Crew's "Climb with them again" -- an action, with no on-state to
    // announce -- as a mute toggle, which is the flag-correct-work direction that makes a
    // guard ignorable.
    if (!(await clickOne(c))) continue;
    await page.waitForTimeout(900);
    const back = (await snapshot()).find((x) => key(x) === key(c));
    if (!back || back.sig !== b.sig) continue;          // one-way: an action, not a toggle
    toggles.push(row); measured++;
  }
  log(`  ${s.name.padEnd(18)} ${String(byGroup.size).padStart(3)} group(s), ${measured} stateful` +
      (unnamed ? `, ${unnamed} control(s) skipped as unnameable (see check:a11y-names)` : ""));
}

log("");
const mute = [];
for (const t of tabBars) {
  // ANY of the four announces. Demanding aria-current SPECIFICALLY of a tab bar was a real
  // over-strictness: the log modal visibility row [Everyone|Just me] already carries
  // aria-pressed, and this reported it as mute — i.e. it would have told an author to swap
  // working markup for different working markup. Which attribute best fits a mutually
  // exclusive group is a refinement; this guard asks only whether the state is announced
  // AT ALL, which is the part that was actually missing across 21 controls.
  const okAttr = !!t.says;
  log(`  ${okAttr ? "ok  " : "MUTE"}  tab bar  ${t.screen.padEnd(16)} [${t.group}] -> ${JSON.stringify(t.label)}  ${okAttr ? "via " + t.says : "announces NOTHING"}`);
  if (!okAttr) { mute.push(t); fails.push(`tab bar [${t.group}] on ${t.screen}: selecting ${JSON.stringify(t.label)} changes only its colour — it needs aria-current (or aria-selected with role=tab)`); }
}
for (const t of toggles) {
  const okAttr = !!t.says;
  // Name the GROUP, not just the label. "Weekends" appears in two different rows on the
  // profile screen -- the AVAIL_OPTS chips and the quick-set row -- so a label alone sends
  // whoever reads this to the wrong one.
  log(`  ${okAttr ? "ok  " : "MUTE"}  toggle   ${t.screen.padEnd(16)} [${t.group}] -> ${JSON.stringify(t.label)}  ${okAttr ? "via " + t.says : "announces NOTHING"}`);
  if (!okAttr) { mute.push(t); fails.push(`toggle ${JSON.stringify(t.label)} in [${t.group}] on ${t.screen}: turning it on changes only its colour — it needs aria-pressed`); }
}

// Route detail must have been REACHED, not merely attempted. It is the screen #1041 fixed a
// sub-tab bar on, and a screen this guard silently failed to open would take that fix back out
// of coverage without anyone noticing — the invisible-coverage-hole shape. check:overflow
// upgraded exactly this from a note to an exit-1 for the same reason: the only ways `?zr=1`
// fails to land are a broken opener or a broken route page, and both are worth going red for.
if (!routeReached) {
  console.error("\ncheck:selected-state FAILED — ?zr=1 never opened the route detail screen.");
  console.error("Its sub-tab bar is one of the bars #1041 fixed, so this run did not check it.");
  await browser.close(); stopServer(); process.exit(1);
}

// Fail closed, both ends.
if (!tabBars.length && !toggles.length) {
  console.error("\ncheck:selected-state FAILED — found NO stateful controls anywhere.");
  console.error("This guard reports absence, so a broken scan would otherwise read as a clean sweep.");
  await browser.close(); stopServer(); process.exit(1);
}
const anyVoiced = [...tabBars, ...toggles].some((t) => t.says);
if (!anyVoiced && !STRIP) {
  console.error("\ncheck:selected-state FAILED — nothing on any screen announces its selection.");
  console.error("The primary nav is known to (aria-current), so the detector is blind rather than the app broken.");
  await browser.close(); stopServer(); process.exit(1);
}

log(`\n${tabBars.length} tab bar control(s), ${toggles.length} toggle(s) measured across ${screens.length} screen(s).`);
await browser.close(); stopServer();
if (fails.length) {
  console.error(`\ncheck:selected-state FAILED — ${mute.length} control(s) show their state in colour alone:\n`);
  for (const f of fails) console.error("  " + f);
  console.error("\nThe app's own convention: aria-current for a tab bar (one of N is current),");
  console.error("aria-pressed for an independent toggle. Both are already used elsewhere.");
  process.exit(1);
}
console.log("check:selected-state: ok — every control that looks selected says so");

// INJECTION CASES — all three run, all three behaved. Re-run them after ANY change to the
// scan, the click, or the sibling comparison.
//
//   1. node scripts/check-selected-state.mjs --tabs=Home,Logbook --overlays= --strip-aria=aria-current
//        FAILED (exit 1) naming all three bars: the primary nav, Logbook's sub-tabs and
//        Logbook's discipline filter.
//   2. node scripts/check-selected-state.mjs --tabs=Profile --overlays= --strip-aria=aria-pressed
//        FAILED (exit 1) naming the availability toggle AND its group, while the primary nav
//        on the same screen still PASSED — stripping one attribute causes no collateral
//        failures.
//   3. Break `ANCHOR` in scripts/overlay-scroll.config.mjs.
//        FAILED (exit 1) with "the app did not render (58 chars of text, nav present)" —
//        the boot-shell case, not a green run over a blank app.
//   4. Change the route-detail screen's qs from "?zr=1" to "?zr=" so the opener cannot land.
//        FAILED (exit 1) naming route detail — AND it fired even though a healthy tab bar had
//        already passed on an earlier screen, which is the ordering that matters: the
//        not-reached test runs BEFORE any verdict is interpreted, so a screen this guard
//        silently failed to open can never read as a screen with nothing wrong.
//
// CASE 1 PASSED THE FIRST TIME IT WAS RUN, AND THAT WAS THE INJECTION BEING WRONG RATHER THAN
// THE GUARD BEING RIGHT. The strip used to run once per load(); this guard then CLICKS, React
// re-renders that subtree, and `aria-current` comes straight back — so the only moment the
// guard looked, it was being handed correct markup. It reported a clean sweep against an app
// with the attribute stripped. The MutationObserver above is what actually holds a regression
// in place for a whole run. Prove an injection LANDS before believing what a guard says about
// it — the rule this repo already records for check:log and check:waypoint-styles.
