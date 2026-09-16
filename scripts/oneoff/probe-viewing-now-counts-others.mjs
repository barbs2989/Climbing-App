// "N viewing now" must be a claim about OTHER PEOPLE, not about the reader.
//
// The route page's social strip carries four chips and three of them are unambiguously about
// somebody else: `popInterest` filters seed CLIMBERS (which `ME` is not in), open crews are ones
// you are not on, and an ascent logged is an ascent logged. The fourth read `presence.count`, which
// is every tracked entry INCLUDING YOU — so a climber alone on a route saw a pulsing green
// "1 viewing now" with no avatar beside it. The same strip carried two rules about whether the
// reader is in it: the number counted you and the avatars did not.
//
// Confirmed on a real run rather than reasoned about: CI's `ui-screens` capture of `route:Overview`
// shows "1 viewing now" and ZERO viewer avatars, from a walk that is the only client on that route.
//
// This executes the real `presenceSplit` — no browser, no database, no Realtime channel — and then
// asserts the WIRING as source, because a correct split proves nothing if the chip still reads the
// old field.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// `lib/presence.js` imports `./supabase` EXTENSIONLESS (vite resolves it, node does not), and that
// module reads `import.meta.env` at module scope — so it cannot simply be imported here. Bundle it
// with the client stubbed: this probe asks about the SPLIT, which never touches Supabase, and
// standing up a Realtime channel to ask "does the count include me" is far more than the question
// is worth. The bundle is written INSIDE the project, or node resolves nothing from a temp dir.
const outDir = fs.mkdtempSync(path.join(ROOT, ".presence-probe-"));
process.on("exit", () => fs.rmSync(outDir, { recursive: true, force: true }));
const out = path.join(outDir, "presence.mjs");
await esbuild.build({
  entryPoints: [path.join(ROOT, "lib", "presence.js")], bundle: true, format: "esm", outfile: out,
  external: ["react"], logLevel: "silent",
  plugins: [{ name: "stub", setup(b) {
    b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: "stub-supabase", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const supabase=null;" }));
  } }],
});
const { presenceSplit } = await import(out);
if (typeof presenceSplit !== "function") { console.error("FAIL: presenceSplit did not bundle — nothing below was checked."); process.exit(1); }
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ok    " + m); } else { fail++; console.log("  FAIL  " + m); } };

// --- 1. the split itself -----------------------------------------------------------------------
const me = "me-1";
ok(presenceSplit([{ id: "me-1", visible: false }], me).others === 0,
  "alone on the route: 0 others — the chip disappears rather than counting the reader");
ok(presenceSplit([], me).others === 0, "no entries at all: 0 others");
ok(presenceSplit([{ id: "me-1", visible: false }, { id: "b", visible: false }], me).others === 1,
  "one other, invisible: counted but not named");
ok(presenceSplit([{ id: "me-1", visible: false }, { id: "b", visible: false }], me).viewers.length === 0,
  "...and contributes no avatar");
ok(presenceSplit([{ id: "me-1", visible: true }, { id: "b", visible: true }], me).viewers.length === 1,
  "a VISIBLE other is named; you are still not among your own viewers");

// THE COUNT AND THE AVATARS COME FROM ONE EXCLUSION, so they can never disagree again. A guard that
// only checked the number would pass against a split that re-admitted the reader to the avatars.
const mixed = presenceSplit([{ id: "me-1", visible: true }, { id: "b", visible: true }, { id: "c", visible: false }], me);
ok(mixed.others === 2 && mixed.viewers.length === 1,
  "2 others, 1 of them named — the count is the superset of the avatars, never the other way round");
ok(mixed.viewers.every(v => String(v.id) !== me), "no viewer is the reader");

// IDS ARRIVE AS STRINGS OR NUMBERS: the presence key is stringified on the way in, so a numeric
// seed id and its string form must be the same person. Getting this wrong counts you as an other.
ok(presenceSplit([{ id: 0, visible: false }], 0).others === 0, "numeric id 0 is not an 'other' — 0 is a real id here");
ok(presenceSplit([{ id: "0", visible: false }], 0).others === 0, "...and neither is its string form");

// A MALFORMED ENTRY MUST NOT BECOME A PHANTOM CLIMBER.
ok(presenceSplit([{ id: "me-1" }, null, undefined], me).others === 0, "null entries are not people");

// --- 2. the wiring -----------------------------------------------------------------------------
// Executing the split proves the DECISION; it says nothing about whether the chip still reads it.
// Reverting one property name restores the whole defect with every assertion above still green.
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
ok(/var vw=\(presence&&presence\.others\)\|\|0;/.test(rd),
  "the chip reads presence.others");
ok(!/presence\.count/.test(rd),
  "...and nothing reads presence.count, which included the reader");
ok(/<CountUp value=\{vw\}\/> viewing now/.test(rd),
  "ANCHOR: the chip still renders 'viewing now' from vw");

const pres = fs.readFileSync(path.join(ROOT, "lib", "presence.js"), "utf8");
ok(/export function presenceSplit/.test(pres), "ANCHOR: presenceSplit is exported");
ok(!/count:\s*entries\.length/.test(pres), "the hook no longer returns a count that includes you");

// --- 3. the neighbouring promise ---------------------------------------------------------------
// Settings says "Off still counts you in 'climbers viewing now', just without your name or photo."
// That is a claim about what OTHERS see, and it stays true — you are still tracked, so you are an
// 'other' from their side. A fix that stopped tracking you would have made that copy false, which
// is changing which record wins and leaving the field beside it behind.
ok(/channel\.track\(/.test(pres) && /visible:\s*false/.test(pres),
  "you are still TRACKED when invisible, so other people's counts still include you");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
ok(/Off still counts you in "climbers viewing now"/.test(app),
  "...and the Settings copy promising exactly that is untouched");
ok(!/`visibleWhileBrowsing` has NO consumer at all/.test(app),
  "the comment claiming the flag has no consumer is gone — useRoutePresence reads it");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
