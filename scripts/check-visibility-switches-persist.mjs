#!/usr/bin/env node
/* A VISIBILITY SWITCH THE APP RENDERS MUST PERSIST, OR IT IS A PROMISE TO NOBODY.
 *
 * Each of these makes a claim about what SOMEBODY ELSE sees — "Off keeps you out of every
 * ranking", "other climbers can open your résumé from your profile", "Off shows @handle to
 * others". A claim like that needs a column: with the state in `useState`, the setting resets on
 * the next load and no other climber's app can ever read it.
 *
 * THE CLASS RECURRED, WHICH IS WHY IT IS A GUARD AND NOT A NOTE. #1535 hid five controls that
 * could not work behind PRIVACY_CONTROLS_LIVE; #1540 made `show_name` real (0175) and gated
 * `visibleWhileBrowsing`, whose every reference was its own knob. Two switches were left OUTSIDE
 * the gate while being just as inert — `showOnRanks` and `resumePublic` — and 0177 made both real.
 * A sweep that fixes five of seven is the "an instance fixed by hand is not a class closed" shape.
 *
 * THE RÉSUMÉ ONE FAILED IN THE DANGEROUS DIRECTION, which is why rule 2 exists. `FullProfile`
 * renders its button on `climber.resumePublic !== false`, so an ABSENT field reads as PUBLIC. A
 * DB-derived climber carried no such field, so the button rendered for every real climber whatever
 * they had set — and the same shape returns the moment a new `profiles` select forgets the column.
 *
 * DECLARED, NOT DERIVED, and that is a correction to this guard's own first draft. It mapped a
 * flag to a column by camelCase→snake_case and required one persistence shape; it then reported
 * FOUR healthy controls — `showRealName` is `show_name`, not `show_real_name`, and `discoverable`
 * and `photosPublic` use a BETTER pattern than the one it demanded: they are derived straight from
 * `myProfileRowQ.data` every render rather than hydrated into state, so they need no read-back at
 * all. A guard that flags correct work teaches people to ignore it. The map fails when STALE in
 * either direction, which is what keeps a declaration from rotting into a description of code that
 * has moved.
 *
 * STATIC — no browser, no database — so it sits in `npm run build`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const app = read("ClimbMatch.jsx");
const core = read("ClimbMatchCore.jsx");
const db = read("lib/db.js");
const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

/* Every UNGATED switch, its column, and HOW it reaches the database.
 *   state   — useState, written to the column, and hydrated back from the profile read.
 *   derived — no useState at all: the value is read off a profiles query every render, so there
 *             is nothing to hydrate and nothing that can go stale on reload. */
const SWITCHES = {
  showOnRanks:  { col: "show_on_ranks", how: "state",   file: "app"  },
  resumePublic: { col: "resume_public", how: "state",   file: "app"  },
  showRealName: { col: "show_name",     how: "state",   file: "app"  },
  discoverable: { col: "discoverable",  how: "derived", file: "app"  },
  photosPublic: { col: "photos_public", how: "derived", file: "app"  },
  // THE SAME PREFERENCE HAS A SECOND CONTROL, in the profile EDITOR, and it lives in a file this
  // guard did not read. It is not a duplicate defect -- it round-trips correctly: `openEdit` seeds
  // `showRealName: showRealName` from live state and `saveEdit` writes `show_name:!!d.showRealName`
  // AND calls `setShowRealName`. Verified rather than assumed. But a guard that cannot SEE it would
  // not notice a future editor switch that does none of that, which is why the scope widened.
  "draft.showRealName": { col: "show_name", how: "draft", file: "core" },
};

/* Rendered switches that are NOT a visibility claim. An entry here is a CLAIM about the control,
 * and it fails if the control stops existing. */
const NOT_VISIBILITY = {
  on: "the notification-preference toggles, rendered from a .map over notifPrefs. A per-device "
    + "preference about what THIS phone shows its owner, not a statement about what other "
    + "climbers can see, so a column is not what makes it honest. (It does not persist either; "
    + "that is a separate, lesser defect — it costs a re-toggle, not an exposure.)",
};

/* ── which switches are hidden ─────────────────────────────────────────────────────────────
 * `{PRIVACY_CONTROLS_LIVE?<…>:null}` — a false flag REMOVES the control, so it is absent rather
 * than disabled and promises nothing. Delimited by its own balanced ternary, never a character
 * window: check:policy-claims records that a 900-char guess was already too small for one of
 * these very controls. */
if (!/const PRIVACY_CONTROLS_LIVE\s*=/.test(core)) dead("`PRIVACY_CONTROLS_LIVE` is not in ClimbMatchCore.jsx — ANCHOR LOST");

const gatedRanges = [];
for (const m of app.matchAll(/PRIVACY_CONTROLS_LIVE\?/g)) {
  let d = 0;
  for (let k = m.index + m[0].length; k < app.length; k++) {
    const ch = app[k];
    if (ch === "{") d++;
    else if (ch === "}") d--;
    else if (ch === ":" && d === 0 && app.startsWith(":null", k)) { gatedRanges.push([m.index, k]); break; }
    if (d < 0) break;
  }
}
if (!gatedRanges.length) dead("found no PRIVACY_CONTROLS_LIVE-gated block — the scan broke, and every switch would read as ungated");
const isGated = (i) => gatedRanges.some(([a, b]) => i >= a && i <= b);

const found = [];
for (const m of app.matchAll(/aria-checked=\{([A-Za-z_$][\w$]*)\}/g)) {
  found.push({ flag: m[1], at: m.index, gated: isGated(m.index), file: "app" });
}
/* ClimbMatchCore.jsx renders the profile EDITOR, whose switches read a DRAFT (`draft.showRealName`)
 * rather than app state. Nothing in Core is inside a PRIVACY_CONTROLS_LIVE block -- that ternary is
 * an App construct -- so a Core switch is always rendered and always has to be declared. A
 * `role="checkbox"` is deliberately not collected: an attestation or an also-block tickbox is a form
 * input, not a claim about what others can see. */
for (const m of core.matchAll(/aria-checked=\{(draft\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\}/g)) {
  const before = core.slice(Math.max(0, m.index - 400), m.index);
  if (/role="checkbox"/.test(before)) continue;
  found.push({ flag: m[1], at: m.index, gated: false, file: "core" });
}
if (found.length < 7) dead("parsed only " + found.length + " switch(es) — the shape moved, and a run that inspected nothing is not a pass");
const ungated = found.filter((s) => !s.gated);
if (ungated.length < 3) dead("only " + ungated.length + " ungated switch(es) — the gating scan is over-matching, so nothing is required to persist");

const problems = [];

/* ── the map must describe exactly what is on screen ─────────────────────────────────────── */
for (const s of ungated) {
  if (!SWITCHES[s.flag] && !NOT_VISIBILITY[s.flag]) {
    problems.push("a NEW rendered switch `" + s.flag + "` @" + s.at + " is declared nowhere. If it "
      + "states what others see, give it a column and add it to SWITCHES; if it does not, say so in "
      + "NOT_VISIBILITY with a reason.");
  }
}
const ungatedNames = new Set(ungated.map((s) => s.flag));
for (const f of Object.keys(SWITCHES)) {
  if (!ungatedNames.has(f)) problems.push("STALE: `" + f + "` is declared in SWITCHES but is no longer a rendered, ungated switch. It was gated, renamed or removed — re-justify the entry rather than leaving it describing code that has moved.");
}
for (const f of Object.keys(NOT_VISIBILITY)) {
  if (!ungatedNames.has(f)) problems.push("STALE: `" + f + "` is excused in NOT_VISIBILITY but is no longer a rendered, ungated switch.");
}

/* ── rule 1: each declared switch really does reach the database ─────────────────────────── */
for (const [flag, { col, how }] of Object.entries(SWITCHES)) {
  if (!ungatedNames.has(flag)) continue;   // already reported stale
  /* A WRITE names the column as an object KEY — `{resume_public:next}`, `update({ discoverable:
   * !!value })`. A SELECT names it inside a STRING, with no colon. That distinction is the whole
   * test, and getting it wrong is how the first version passed the `resume-write` injection: it
   * accepted the column merely APPEARING in lib/db.js, where it appears in a select, so deleting
   * the write left the guard satisfied by a read. */
  const asKey = new RegExp("\\b" + col + "\\s*:");
  const written = asKey.test(app) || asKey.test(db);
  if (!written) problems.push("`" + flag + "` — nothing writes profiles." + col + " (no `" + col
    + ":` in a write payload), so the switch cannot persist. Appearing in a SELECT is a read, not a write.");
  if (how === "state") {
    const setter = "set" + flag[0].toUpperCase() + flag.slice(1);
    if (!new RegExp(setter + "\\s*\\([^)]*\\b" + col + "\\b").test(app))
      problems.push("`" + flag + "` is a `state` switch but nothing hydrates it — no `" + setter + "(… " + col + " …)`, so it resets to its useState default on reload.");
  } else if (how === "derived") {
    if (!new RegExp("\\.data[^;]{0,80}\\b" + col + "\\b").test(app))
      problems.push("`" + flag + "` is declared `derived` but is not read off a profiles query row (`…\\.data…" + col + "`). If it became a useState, it now needs hydrating: change `how` to \"state\".");
  } else {
    /* A DRAFT switch is only honest if the draft is SEEDED from the live value when the editor
     * opens. Without that, opening the editor and saving silently resets the preference to the
     * draft's default — the shape #1581 records for the float plan losing eleven fields. */
    const bare = flag.replace(/^draft\./, "");
    if (!new RegExp("\\b" + bare + "\\s*:\\s*" + bare + "\\b").test(app))
      problems.push("`" + flag + "` is a `draft` switch but openEdit does not seed it from live state "
        + "(`" + bare + ": " + bare + "`). Opening the editor and saving would reset the preference.");
    if (!new RegExp("set" + bare[0].toUpperCase() + bare.slice(1) + "\\(!!d\\." + bare).test(app))
      problems.push("`" + flag + "` is a `draft` switch but saveEdit does not push it back to app state, "
        + "so Settings and the editor would disagree until reload.");
  }
}

/* ── rule 2: an outward-facing column rides every climber-object SELECT ──────────────────── */
const CLIMBER_SELECTS = [
  ["PARTNER_COLS", /const PARTNER_COLS = "([^"]+)"/],
  ["the connections select", /\.from\("profiles"\)\.select\("id, name, username, avatar, location, ([^"]+)"\)/],
];
// Columns whose value governs what OTHERS see, and which therefore have to travel with a climber.
const OUTWARD = ["show_name", "resume_public"];
for (const [name, re] of CLIMBER_SELECTS) {
  const m = re.exec(db);
  if (!m) dead("could not find " + name + " in lib/db.js — ANCHOR LOST, so rule 2 checked nothing");
  for (const col of OUTWARD) {
    if (!m[1].includes(col)) {
      problems.push("`" + name + "` omits " + col + ". An omitted column arrives undefined, and for "
        + "resume_public that reads as PUBLIC (`resumePublic !== false`), silently re-exposing a "
        + "résumé its owner made private — the defect 0177 fixed.");
    }
  }
}

/* ── rule 3: every route into ANOTHER climber's résumé consults the flag ──────────────────
 * A switch that persists is still a false promise if a second entry point ignores it. There were
 * TWO ways in and only one was gated: the profile's "open résumé" button, and a STAT TILE — the
 * "climbs" chip on a partner card — which called onResume() unconditionally. Gating the button
 * alone would have left the résumé reachable by tapping a number.
 *
 * A COUNT rather than a proximity window, deliberately: this file packs a whole component onto one
 * physical line, so "near the call" is not a scope — the trap recorded for the camping panel, the
 * Logbook badge and the seed-route discipline read. A third entry point makes the count disagree
 * and has to be declared, which is the loud outcome. Your OWN résumé is out of scope (ClimbMatch's
 * `setResumeFor(meLive)`): you may always read your own. */
const RESUME_ENTRIES = 2;
const entries = (core.match(/onResume&&onResume\(/g) || []).length;
const gates = (core.match(/resumePublic!==false/g) || []).length;
if (entries !== RESUME_ENTRIES) {
  problems.push("ClimbMatchCore.jsx has " + entries + " route(s) into another climber's résumé, not the "
    + RESUME_ENTRIES + " declared. A NEW one must consult `resumePublic!==false` before it opens — the "
    + "stat tile did not, so a private résumé stayed reachable by tapping a number — then update "
    + "RESUME_ENTRIES.");
} else if (gates < RESUME_ENTRIES) {
  problems.push("only " + gates + " of " + RESUME_ENTRIES + " résumé entry points consult "
    + "`resumePublic!==false`. An ungated one reopens the résumé its owner made private.");
}

if (problems.length) {
  console.error("A visibility switch does not reach the database, a column that governs what others\n"
    + "see is missing from a climber-object select, or a résumé entry point ignores the flag.\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\n  Two ways to make a switch honest, both with precedent: make it REAL (0175 show_name,\n"
    + "  0177 resume_public/show_on_ranks — a column, a write with a revert-on-failure toast, and\n"
    + "  either hydration or a derived read), or GATE it behind PRIVACY_CONTROLS_LIVE as five\n"
    + "  siblings are. Gating changes the LEGAL DOCUMENTS too — see check:policy-claims.");
  process.exit(1);
}

console.log("ok — " + Object.keys(SWITCHES).length + " rendered visibility switch(es) reach the database ("
  + Object.values(SWITCHES).filter((x) => x.how === "state").length + " hydrated, "
  + Object.values(SWITCHES).filter((x) => x.how === "derived").length + " derived, "
  + Object.values(SWITCHES).filter((x) => x.how === "draft").length + " draft), "
  + (found.length - ungated.length) + " gated one(s) exempt, and " + OUTWARD.length
  + " outward-facing column(s) ride every climber-object select");
