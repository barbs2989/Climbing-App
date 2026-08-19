#!/usr/bin/env node
// check:add-route-fields — the "add a climb" form must ask for what the discipline needs,
// and must not ask for anything the catalog cannot store.
//
// This is the AddRoute counterpart to check:contrib-fields, which guards the OTHER form
// (SuggestFix, for editing an existing route). AddRoute had no guard at all, and it showed:
// measured on 2026-08-09 it offered 13 distinct fields across all nine disciplines while
// SuggestFix offered 49 and the merge allow-list SS accepted 53 — and the tailoring ran
// BACKWARDS, a single-pitch sport route being asked 10 questions against alpine's 8. Alpine
// had no approach, no height, no rappels, no turnaround and no comms.
//
// Three questions, none of which the other guards ask:
//   1. Every key the form SENDS is a key `SS` knows. A key outside SS is accepted, stored,
//      and then read by nothing — the exact shape #707 found on descent_text.
//   2. Every key the form GATES on (`sf("x")`) is actually rendered, and vice versa. A
//      FIELDS entry with no input is a promise the form never keeps; an input with no FIELDS
//      entry renders for every discipline including the ones it makes no sense for.
//   3. The ordering invariant the audit existed to fix: alpine — the most committing
//      discipline — must not be asked FEWER questions than sport/trad or bouldering.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
appSources(ROOT, "check:add-route-fields");

const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const anchorLost = (what) => {
  console.error(`\ncheck:add-route-fields FAILED — ANCHOR LOST: ${what}.`);
  console.error("Nothing below was checked. Update the anchor rather than deleting the guard.\n");
  process.exit(1);
};

// ── the merge allow-list ────────────────────────────────────────────────────────────────
const ssIdx = app.indexOf("var SS={");
if (ssIdx < 0) anchorLost("`var SS={` in ClimbMatch.jsx");
// Balance the braces over the whole file rather than slicing one line to the first "};".
// SS's literal is not guaranteed to close on the line it opens on -- it does not today, and
// a line-scoped slice silently yielded ZERO keys, which would have made every comparison
// below pass vacuously. That is exactly the failure guard-sources.mjs exists to stop, so it
// is a hard anchorLost rather than an empty set.
const SS = (() => {
  let depth = 0; const out = [];
  for (let i = ssIdx + 7; i < app.length; i++) {
    const c = app[i];
    if (c === "{") depth++;
    else if (c === "}") { if (--depth === 0) break; }
    else if (c === '"' || c === "'") { const q = c; while (++i < app.length && app[i] !== q) if (app[i] === "\\") i++; }
    else if (depth === 1 && c === ":") {
      const m = /([A-Za-z0-9_]+)\s*$/.exec(app.slice(0, i));
      if (m) out.push(m[1]);
    }
  }
  return new Set(out);
})();
if (SS.size < 20) anchorLost(`SS parsed to only ${SS.size} keys`);

// ── the per-discipline field map ────────────────────────────────────────────────────────
const fLine = core.split("\n").find((l) => l.includes("const FIELDS={rock:["));
if (!fLine) anchorLost("`const FIELDS={rock:[` in ClimbMatchCore.jsx");
const fSeg = fLine.slice(fLine.indexOf("const FIELDS={"));
const fBody = fSeg.slice(fSeg.indexOf("{"), fSeg.indexOf("};") + 1);
const FIELDS = {};
for (const m of fBody.matchAll(/([A-Za-z]+):\[([^\]]*)\]/g)) {
  FIELDS[m[1]] = m[2].split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean);
}
if (Object.keys(FIELDS).length < 5) anchorLost(`FIELDS parsed to only ${Object.keys(FIELDS).length} disciplines`);

// ── the proposal the form actually submits ──────────────────────────────────────────────
const pIdx = core.indexOf("var _prop={");
if (pIdx < 0) anchorLost("`var _prop={` — the submitted proposal literal");
const pBody = core.slice(pIdx, core.indexOf("};", pIdx));
// Depth-aware, because a regex for /ident:/ reads the false branch of a ternary as a key:
// `rockStyle:disc==="rock"?sub:null` yielded a phantom key called `sub`.
const sent = (() => {
  const out = [];
  let depth = 0, i = pBody.indexOf("{") + 1, tern = 0;
  const src = pBody;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    else if (c === '"' || c === "'") { const q = c; while (++i < src.length && src[i] !== q) if (src[i] === "\\") i++; }
    else if (depth === 0 && c === "?") tern++;
    else if (depth === 0 && c === ":" && tern > 0) tern--;
    else if (depth === 0 && c === "," ) tern = 0;
    else if (depth === 0 && c === ":" && tern === 0) {
      const m = /([A-Za-z0-9_]+)\s*$/.exec(src.slice(0, i));
      if (m) out.push(m[1]);
    }
  }
  return out;
})();
const sentSet = new Set(sent);

// ── the set being checked must not quietly shrink ───────────────────────────────────────
// Every assertion below is of the form "of the keys we found, are they all storable?", so
// a key that stops being FOUND leaves the checked set and takes its own assertion with it.
// The run then reports ok on the survivors. Measured, not theorised — replicating the
// walker on a synthetic literal and folding one key inside a nested object:
//
//     healthy            keys=[name,grade,beta,gear,haz]   -> ok, all 5 submitted keys in SS
//     beta nested away   keys=[name,grade,gear,haz]        -> ok, all 4 submitted keys in SS
//
// and `beta` nested inside another object is a REAL regression: SS applies top-level keys,
// so it would no longer be storable at all. The existing fail-closed floor is on FIELDS
// (`< 5 disciplines`), which guards the wrong axis entirely — it says nothing about fields,
// so `sent` could collapse to two keys and still pass.
//
// So the names are pinned. This is bookkeeping on purpose: a pinned name that stops being
// submitted FAILS rather than passing quietly, which forces whoever removed it to say so
// here. Same rule as check:field-renders' KNOWN map. Do not "fix" a failure by deleting the
// entry -- that is the vacuous pass this block exists to prevent.
const MUST_COVER = [
  "name", "discipline", "grade", "pitchCount", "length", "gain", "dist", "rock", "aspect",
  "approach", "season", "commit", "descentText", "style", "haz", "gear", "beta",
  // the eight #794 added; every one of these was a question the form asked and could not store
  "protRating", "fa", "crux", "landing", "startType", "rap", "turn", "comms",
];
const unpinned = MUST_COVER.filter((k) => !sentSet.has(k));
if (unpinned.length) {
  fail(`the proposal no longer submits ${unpinned.join(", ")} — either it stopped being ` +
       `collected, or it moved out of the top level where SS can apply it. If the removal ` +
       `was deliberate, drop the name from MUST_COVER in this file in the same commit.`);
} else ok(`all ${MUST_COVER.length} pinned fields are still submitted at the top level`);

// 1. every submitted key is one SS knows about, or is explicitly provenance
// `source` and `sourceNote` were here until the Source step was removed from the form: the app
// no longer asks a contributor where their information came from, and must not start again.
const PROVENANCE = new Set(["areaName", "climbed", "photoCount"]);
const unknown = [...sentSet].filter((k) => !SS.has(k) && !PROVENANCE.has(k));
if (unknown.length) fail(`the form submits ${unknown.length} key(s) that SS cannot apply: ${unknown.join(", ")}`);
else ok(`all ${sentSet.size} submitted keys are in SS or declared provenance`);

// duplicate keys in an object literal silently drop the earlier value — that bit this
// change already, with rockStyle and style both written as `style:`.
const dupes = sent.filter((k, i) => sent.indexOf(k) !== i);
if (dupes.length) fail(`the proposal literal repeats ${[...new Set(dupes)].join(", ")} — the later value silently wins`);
else ok("no duplicate keys in the submitted proposal");

// 2. FIELDS entries and rendered inputs agree
const arStart = core.indexOf("function AddRoute(");
const arEnd = core.indexOf("function numsClose(");
if (arStart < 0 || arEnd < 0) anchorLost("AddRoute function bounds");
const ar = core.slice(arStart, arEnd);

// The completeness meter is NOT an input, and counting it as one is how `loss` hid.
// `const checks=[…]` contains `sf("loss")?!!loss:1` for every field, so a field with no
// control at all still looked "gated" here — the guard reported 30/30 rendered while four
// disciplines declared a field the form never drew, and whose entry in `checks` could
// therefore never be satisfied (the meter could not reach 100%). Cut that expression out
// before looking for inputs.
const ckStart = ar.indexOf("const checks=[");
if (ckStart < 0) anchorLost("`const checks=[` in AddRoute — the completeness meter");
let ckDepth = 0, ckEnd = ar.indexOf("[", ckStart);
for (let i = ckEnd; i < ar.length; i++) {
  if (ar[i] === "[") ckDepth++;
  else if (ar[i] === "]") { ckDepth--; if (!ckDepth) { ckEnd = i; break; } }
}
// Block comments go too, and this is not hypothetical: the comment added beside the fix
// EXPLAINS the bug by quoting `sf("loss")?!!loss:1`, which put a second occurrence outside
// `checks` and made the input test pass on prose. Presence is not use — the same false pass
// check:rappel-readers and check:crew-member-readers both record. Only `/* */` is stripped:
// the aggressive blanker other guards use eats real code when a string contains `//`.
const arInputs = (ar.slice(0, ckStart) + ar.slice(ckEnd)).replace(/\/\*[\s\S]*?\*\//g, " ");

const gated = new Set([...arInputs.matchAll(/sf\("([A-Za-z0-9_]+)"\)/g)].map((m) => m[1]));
const declared = new Set(Object.values(FIELDS).flat());

// The general form of the same defect, and the one that does not depend on where sf() is
// written: a piece of form state nothing can write. `useState` gives every field a setter;
// if only the declaration mentions it, no control writes it and the field is dead however
// convincingly it is declared elsewhere.
const setters = [...new Set([...ar.matchAll(/\bset[A-Z][A-Za-z0-9]*/g)].map((m) => m[0]))];
const deadSetters = setters.filter((t) => (ar.match(new RegExp(`\\b${t}\\b`, "g")) || []).length === 1);
if (deadSetters.length) {
  fail(`AddRoute state nothing ever writes: ${deadSetters.join(", ")} — declared with useState and never called, so the field cannot be filled in`);
} else ok(`all ${setters.length} form states are written by some control`);

const promisedNotRendered = [...declared].filter((k) => !gated.has(k));
if (promisedNotRendered.length) fail(`FIELDS offers ${promisedNotRendered.join(", ")} but no input is gated on it — the form never asks`);
else ok(`all ${declared.size} declared fields have a gated input`);

const renderedNotDeclared = [...gated].filter((k) => !declared.has(k));
if (renderedNotDeclared.length) fail(`an input is gated on ${renderedNotDeclared.join(", ")}, which no discipline declares — it can never render`);
else ok("no input is gated on a field no discipline declares");

/* 2b. NO FIELD MAY RENDER TWICE.
   ---------------------------------------------------------------------------
   #953 moved six inputs to the sections they belong under and left one behind: the whole
   2,168-character "Pitch by pitch" builder rendered under BOTH "4 · The climb" and
   "5 · Gear to bring" — byte-identical, twice on one form. Every gate above stayed green,
   because each asks whether a field is declared, gated, storable and ordered. None asked HOW
   MANY TIMES it renders.

   Nothing else could see it either: check:dead-props reads props, check:refs reads bindings,
   and duplicated JSX is valid and renders correctly — just twice. It was found by reading the
   form's structure; this is that reading made repeatable.

   NO DECLARED MAP, deliberately. A field->heading table would be bookkeeping that rots, and
   every legitimate move would have to rewrite it. Counting render sites needs nothing
   declared: one input per field is true by construction, whatever the layout becomes.

   The completeness meter is already cut out of `arInputs` above, so every sf() counted here
   is a render site rather than a readiness test. */
const renderSites = [...arInputs.matchAll(/sf\("([A-Za-z0-9_]+)"\)/g)].map((m) => m[1]);
const siteCount = new Map();
for (const f of renderSites) siteCount.set(f, (siteCount.get(f) || 0) + 1);
/* A field legitimately appears twice when its GROUP is gated on the union of its own fields —
   `{(sf("fa")||sf("crux"))?<div><div style={grp}>…` — so the gate and the input both count.
   That is at most one extra, and only for a field named in such a union. A third occurrence,
   or a second for a field no union mentions, is a duplicate render. */
const unions = [...arInputs.matchAll(/\((?:\s*sf\("[A-Za-z0-9_]+"\)\s*\|\|)+\s*sf\("[A-Za-z0-9_]+"\)\s*\)/g)].map((m) => m[0]);
const inUnion = new Set();
for (const u of unions) for (const m of u.matchAll(/sf\("([A-Za-z0-9_]+)"\)/g)) inUnion.add(m[1]);
const dupRenders = [...siteCount.entries()].filter(([f, n]) => n > (inUnion.has(f) ? 2 : 1));
if (dupRenders.length) {
  fail(`these fields render MORE THAN ONCE: ${dupRenders.map(([f, n]) => `${f} (${n} sites)`).join(", ")} — a climber sees ` +
    `the same input twice, under two headings. Delete the copy in the wrong section and keep one. Duplicated JSX is ` +
    `valid and renders correctly, which is why no other gate catches it.`);
} else ok(`no field renders twice (${siteCount.size} fields, ${renderSites.length} sites, ${inUnion.size} legitimately in a group union)`);

// 3. the ordering invariant this audit existed to fix
const counts = Object.fromEntries(Object.entries(FIELDS).map(([d, v]) => [d, v.length]));
const alpine = counts.alpine || 0;
let inverted = false;
for (const lighter of ["rock", "bouldering", "scrambling", "hiking"]) {
  if ((counts[lighter] || 0) > alpine) {
    inverted = true;
    fail(`alpine is asked ${alpine} questions but ${lighter} is asked ${counts[lighter]} — the tailoring is inverted again`);
  }
}
if (!inverted) ok(`alpine ${alpine} >= rock ${counts.rock}, bouldering ${counts.bouldering}, scrambling ${counts.scrambling}, hiking ${counts.hiking}`);

// 4. the signed-out case must be VISIBLY different, whatever the policy currently allows.
//
// This assertion used to require a hard refusal, because on 2026-08-09 an anonymous INSERT
// on `contributions` returned 401/42501 and submitting would have reported success over a
// rejected write. 0079 has since been applied: re-measured 2026-08-12, the same publishable
// key gets **201 with `contributor` null**, and the openness is scoped — `routes` and `areas`
// still refuse an anon write. So refusing became the wrong behaviour, and a guard pinned to
// the refusal would have frozen a stale policy into the UI.
//
// What does NOT change with policy is that a signed-out climber must be told what signing
// out costs: the row cannot be attributed to them and cannot count toward the agreement that
// verifies a climb. So the invariant is DISCLOSURE, not refusal — the signed-out path must
// differ from the signed-in one in the banner, the button and the confirmation.
const SIGNED_OUT_SURFACES = [
  [/\(USE_DB&&!uid&&!saveErr\)\?<div/, "the pre-submit banner"],
  [/\(USE_DB&&!uid\)\?"[^"]+":"Submit for review"/, "the submit button label"],
  [/uid\?"It is filed against your account/, "the confirmation screen"],
];
const missing = SIGNED_OUT_SURFACES.filter(([re]) => !re.test(ar)).map(([, name]) => name);
if (missing.length) {
  fail(`the signed-out path is not disclosed on ${missing.join(", ")} — an anonymous submission is accepted (201, contributor null) but cannot be attributed or counted, so saying nothing files an unattributable row while the climber believes it is theirs`);
} else ok("the signed-out path is disclosed on the banner, the button and the confirmation");

console.log("");
if (failures) {
  console.log(`check:add-route-fields FAILED — ${failures} problem(s).`);
  process.exit(1);
}
console.log(`check:add-route-fields: ok — ${declared.size} fields across ${Object.keys(FIELDS).length} disciplines, all storable.`);

// ── Injection-tested 2026-08-09. Re-run these after changing FIELDS, the proposal literal,
// or the submit gate:
//   1. add "banana" to alpine's FIELDS      -> "no input is gated on it"
//   2. add `foo:1,` to the _prop literal    -> "SS cannot apply: foo"
//   3. write `style:` twice in _prop        -> "repeats style"
//   4. trim alpine's FIELDS below rock's    -> "the tailoring is inverted again"
//   5. drop any one of the three signed-out surfaces -> "the signed-out path is not disclosed on <that surface>"
