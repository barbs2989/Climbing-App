#!/usr/bin/env node
// A NOTIFICATION SWITCH MUST GOVERN SOMETHING, AND MUST REMEMBER WHAT IT WAS TOLD.
//
// Settings renders a group of switches under a Notifications heading, and the whole of their
// effect is one line:
//
//     const notifAllowed = n => !n.cat || notifPrefs[n.cat] !== false;
//
// So a switch reaches exactly those notifications tagged with its own key, and a switch whose key
// no notification carries suppresses NOTHING. That was live: `cat:"messages"` appeared on no
// notification anywhere in the app, signed in or out — unread messages surface as BADGES on the
// Crew tab, never as entries in this list — so "Messages / New direct & crew messages" was a
// switch that animated, announced its state, and did nothing. Four identical-looking controls,
// one of them inert, and nothing on the screen to tell them apart.
//
// NOTHING ELSE COULD SEE IT, and the near misses are the point. `check:dead-props` asks about
// props, and this is a local. `check:visibility-switches` asks whether a switch that governs what
// OTHERS see persists — these govern only what this browser shows its owner, so that guard
// declares them out of scope by name. `check:dead-flag-gates` asks whether a constant a false
// flag empties feeds some UI; `notifPrefs` is neither. And the settings-persistence census could
// not see this control group at all: it keys on a string-literal `aria-label`, and these four are
// rendered from a `.map` with a computed one, so it reported "0 volatile" with four volatile
// controls on the screen. A group rendered from a loop is invisible to every scan that reads
// controls one JSX site at a time.
//
// Static — one Babel-free source read, no browser, no DB — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const mod = fs.readFileSync(path.join(ROOT, "lib", "notif-pref.js"), "utf8");

let failures = 0, cases = 0;
const ok = (m) => console.log("ok    " + m);
const fail = (m) => { failures++; console.log("FAIL  " + m); };
const dead = (m) => { console.error("\nBROKEN GUARD: " + m + "\n(this run proved nothing — it is not a pass)"); process.exit(1); };

// ── The control group, read off the screen rather than listed here. A switch added to the UI is
//    covered without editing this file; a list typed here would be a second copy of the vocabulary
//    and would go stale exactly when it mattered.
const li = app.indexOf("<SL>Notifications</SL>");
if (li < 0) dead("the Notifications section heading moved — every assertion below would be vacuous");
const mapAt = app.indexOf(".map(", li);
if (mapAt < 0 || mapAt - li > 2000) dead("the Notifications control group is no longer an array followed by .map()");
const SWITCHES = [...app.slice(li, mapAt).matchAll(/\["([a-z]+)","([^"]+)","([^"]+)"\]/g)]
  .map((m) => ({ key: m[1], label: m[2], sub: m[3] }));
if (SWITCHES.length < 2) dead(`parsed ${SWITCHES.length} switch(es) — with none, every "governs something" assertion passes vacuously`);

// ── The rule itself, so this measures what the app does rather than a copy of it.
const rule = app.match(/const notifAllowed=([^;]+);/);
if (!rule) dead("notifAllowed moved — the reach measured below would be a guess");
if (!/!n\.cat\|\|/.test(rule[1])) dead(`notifAllowed no longer treats an untagged notification as always-shown: ${rule[1]}`);

// ── Every category any notification carries. `cat:` appears nowhere else in this file, so a plain
//    scan is exact here; if that stops being true the floor below is what says so.
const CATS = new Set([...app.matchAll(/cat:"([a-z]+)"/g)].map((m) => m[1]));
if (!CATS.size) dead("no notification carries a cat at all — the scan broke, or the tagging was removed wholesale");

// ── 1. A SWITCH MUST GOVERN SOMETHING.
for (const s of SWITCHES) {
  cases++;
  const n = [...app.matchAll(new RegExp('cat:"' + s.key + '"', "g"))].length;
  if (!n) {
    fail(`the "${s.label}" switch suppresses nothing — no notification carries cat:"${s.key}", so it animates and does nothing. Tag the notifications it names, or take the switch out.`);
  } else ok(`"${s.label}" reaches ${n} notification(s)`);
}

// ── 2. THE STORED KEYS ARE EXACTLY THE SWITCHES ON SCREEN, in both directions. A switch missing
//    from the module persists as nothing and reverts on every load; a key left in the module after
//    its switch is gone is a stale preference nobody can reach.
{
  const m = mod.match(/const FLAGS\s*=\s*\[([^\]]*)\]/);
  if (!m) dead("NOTIF_FLAGS moved in lib/notif-pref.js — the two sides cannot be compared");
  const FLAGS = [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]);
  const ui = SWITCHES.map((s) => s.key);
  cases++;
  const missing = ui.filter((k) => !FLAGS.includes(k));
  if (missing.length) fail(`the Settings screen offers ${missing.map((k) => `"${k}"`).join(", ")} and lib/notif-pref.js does not store it — that switch would revert on every reload`);
  else ok("every switch on screen is one the preference stores");
  cases++;
  const stale = FLAGS.filter((k) => !ui.includes(k));
  if (stale.length) fail(`lib/notif-pref.js stores ${stale.map((k) => `"${k}"`).join(", ")}, which no switch offers — stale bookkeeping, and a value nobody can change`);
  else ok("the preference stores nothing the screen does not offer");
}

// ── 3. THE WIRING. Asserted as SOURCE: the toggle is a click handler and the seed is a useState
//    initialiser, so a render proves neither — and both are the half a stale-base squash takes,
//    leaving a control group that still renders, still animates, and quietly forgets again.
cases++;
if (/\[notifPrefs,setNotifPrefs\]=useState\(loadNotifPrefs\)/.test(app)) ok("the switches open on what was stored");
else fail("notifPrefs is not seeded from loadNotifPrefs — the stored choice would never be read back");

cases++;
{
  // BALANCED, never a character class: the handler body contains `Object.assign({},p)`, so a
  // `[^}]*` stops at the first brace INSIDE it and reports a correct toggle as unwired.
  const at = app.indexOf("setNotifPrefs(function(p){");
  if (at < 0) dead("the notification toggle handler moved — its wiring cannot be read");
  const from = app.indexOf("{", app.indexOf("(", at) + 1);
  let d = 0, body = null;
  for (let i = from; i < app.length; i++) {
    if (app[i] === "{") d++;
    else if (app[i] === "}" && --d === 0) { body = app.slice(from, i + 1); break; }
  }
  if (!body) dead("the notification toggle handler does not close");
  if (/saveNotifPrefs\(/.test(body)) ok("toggling a switch writes the choice through");
  else fail("the toggle does not call saveNotifPrefs — the choice would last only for this session");
}

cases++;
if (/from "\.\/lib\/notif-pref"/.test(app)) ok("the module is imported");
else fail("lib/notif-pref is not imported by ClimbMatch.jsx");

// ── 4. UNSET MEANS SHOWN. A default of false would mute notifications for every climber who has
//    never touched the screen, which is the one failure of this feature nobody would report as a
//    bug — they would simply never learn a crew invite had arrived.
cases++;
if (/DEFAULT_NOTIF_ON\s*=\s*true/.test(mod)) ok("an untouched switch shows the notification");
else fail("DEFAULT_NOTIF_ON is not true — a climber who has set nothing would have alerts hidden from them");

if (cases < 7) dead(`only ${cases} assertion(s) ran — a guard that quietly stops asking still exits 0`);
console.log();
if (failures) { console.log(`${failures} failure(s) across ${cases} assertions`); process.exit(1); }
console.log(`ok — ${SWITCHES.length} notification switch(es), each governing something it names, each remembered (${cases} assertions)`);
