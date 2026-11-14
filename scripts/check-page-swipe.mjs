#!/usr/bin/env node
// Swipe between a page's tabs (lib/pageSwipe.js, owner 2026-11-14) -- the two decisions it makes:
//   1. which tab a finished drag lands on (swipeTarget): far enough or quick enough, one step, never
//      past either end;
//   2. which touches it leaves alone (ownsGesture): a swipe row, slider, chart scrubber or topo that set
//      their own touch-action, a map, a form field, a sideways-scrolling row, a dialog inside the page,
//      a portalled sheet -- while a plain button (touch-action: manipulation) and a dialog the page itself
//      sits in (another climber's profile) still swipe.
// And that every page wired to it still is: removing a call silently drops the gesture.
import { readFileSync } from "node:fs";
import { swipeTarget, ownsGesture, SWIPE_COMMIT, SWIPE_FLICK_PX } from "../lib/pageSwipe.js";

let bad = 0;
const ok = (cond, what) => { if (!cond) { bad++; console.error("✗ " + what); } };

// ---- 1. swipeTarget -------------------------------------------------------------------------
// Made-up tab ids: real ones make check:screen-lists read this as a short list of the app's tabs.
const T = ["t1", "t2", "t3", "t4"];
const W = 390;
ok(swipeTarget(T, "t1", -W * SWIPE_COMMIT, W, 600) === "t2", "a slow drag left past 30% goes to the next tab");
ok(swipeTarget(T, "t2", W * SWIPE_COMMIT, W, 600) === "t1", "a slow drag right past 30% goes to the previous tab");
ok(swipeTarget(T, "t1", -(W * SWIPE_COMMIT - 2), W, 600) === null, "a slow drag short of 30% stays");
ok(swipeTarget(T, "t1", -(SWIPE_FLICK_PX + 10), W, 80) === "t2", "a quick flick goes even when short");
ok(swipeTarget(T, "t1", -(SWIPE_FLICK_PX - 10), W, 20) === null, "a tiny twitch stays, however fast");
ok(swipeTarget(T, "t1", W, W, 300) === null, "nothing before the first tab");
ok(swipeTarget(T, "t4", -W, W, 300) === null, "nothing after the last tab");
ok(swipeTarget(T, "t3", -W * 2, W, 300) === "t4", "one step per swipe, however far");
ok(swipeTarget(T, "gone", -W, W, 300) === null, "an unknown current tab stays");

// ---- 2. ownsGesture, on a tiny DOM stand-in ------------------------------------------------
// Each node: { parentElement, style:{touchAction,overflowX}, scrollWidth, clientWidth, matches(sel) }.
const styles = new Map();
globalThis.getComputedStyle = (n) => styles.get(n) || { touchAction: "auto", overflowX: "visible" };
globalThis.document = { body: { tag: "body" } };
function node(parent, opts = {}) {
  const n = {
    parentElement: parent, tags: opts.tags || [], scrollWidth: opts.sw || 100, clientWidth: opts.cw || 100,
    closest(sel) { for (let x = this; x && x !== document.body; x = x.parentElement) if (x.tags && x.tags.some((t) => sel.includes(t))) return x; return null; },
    contains(o) { for (let x = o; x; x = x.parentElement) if (x === this) return true; return false; },
  };
  styles.set(n, { touchAction: opts.ta || "auto", overflowX: opts.ox || "visible" });
  return n;
}
const root = node(document.body);
const card = node(root);
ok(!ownsGesture(card, root), "plain page content swipes");
ok(!ownsGesture(node(card, { ta: "manipulation" }), root), "a button (touch-action: manipulation) swipes");
ok(ownsGesture(node(node(card, { ta: "pan-y" })), root), "inside a SwipeRow / slider / chart scrubber (pan-y) is left alone");
ok(ownsGesture(node(card, { ta: "none" }), root), "a topo being drawn on (touch-action: none) is left alone");
ok(ownsGesture(node(node(card, { tags: [".leaflet-container"] })), root), "a map is left alone");
ok(ownsGesture(node(card, { tags: ["input"] }), root), "a form field is left alone");
ok(ownsGesture(node(node(card, { ox: "auto", sw: 600, cw: 300 })), root), "a row that scrolls sideways keeps the drag");
ok(!ownsGesture(node(node(card, { ox: "auto", sw: 300, cw: 300 })), root), "a row that fits (nothing to scroll) still swipes");
ok(ownsGesture(node(node(card, { tags: ['[role="dialog"]'] })), root), "a dialog drawn inside the page is left alone");
const dlg = node(document.body, { tags: ['[role="dialog"]'] }), inDlgRoot = node(dlg), inDlgCard = node(inDlgRoot);
ok(!ownsGesture(inDlgCard, inDlgRoot), "a page that itself sits in a dialog (another climber's profile) swipes");
ok(ownsGesture(node(node(document.body)), root), "a portalled sheet (outside the page's DOM) is left alone");

// ---- 3. every page wired to it --------------------------------------------------------------
const WIRED = ["ClimbMatch.jsx", "RouteDetail.jsx", "src/components/LogbookTab.tsx", "src/components/DiscoverTab.tsx", "src/components/GroupsTab.tsx", "src/components/MeTab.tsx", "src/components/FullProfile.tsx", "lib/Leaderboards.jsx"];
for (const f of WIRED) {
  const s = readFileSync(new URL("../" + f, import.meta.url), "utf8");
  ok(/useSwipeTabs\(\{ids:/.test(s), f + " calls useSwipeTabs");
  ok(/\{\.\.\.(sw|tabSwipe|secSwipe)\.bind\}/.test(s), f + " puts the swipe handlers on its content");
}
// The section swipe (bottom-bar order) is only for a section's main screen: Climbs' sub-screens opt out.
const dab = readFileSync(new URL("../lib/DbAreaBrowser.jsx", import.meta.url), "utf8");
ok(/data-swipe=\{screen !== "areas" \? "off" : undefined\}/.test(dab), "Climbs' Route finder / Near me / Objectives screens opt out of the section swipe");
const app = readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8");
ok(/const _secOn=\(tab==="today"\|\|\(tab==="routes"&&!selRoute&&!dbAreaCtx\)\|\|\(tab==="crew"&&crewView==="crews"/.test(app), "the section swipe is on only for Home, the Climbs list and the Crews list");

if (bad) { console.error(bad + " page-swipe check(s) failed."); process.exit(1); }
console.log("page swipe: tab choice, gesture ownership and " + WIRED.length + " wired pages OK.");
