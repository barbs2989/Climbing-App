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

// 1. every submitted key is one SS knows about, or is explicitly provenance
const PROVENANCE = new Set(["areaName", "source", "sourceNote", "climbed", "photoCount"]);
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
const gated = new Set([...ar.matchAll(/sf\("([A-Za-z0-9_]+)"\)/g)].map((m) => m[1]));
const declared = new Set(Object.values(FIELDS).flat());

const promisedNotRendered = [...declared].filter((k) => !gated.has(k));
if (promisedNotRendered.length) fail(`FIELDS offers ${promisedNotRendered.join(", ")} but no input is gated on it — the form never asks`);
else ok(`all ${declared.size} declared fields have a gated input`);

const renderedNotDeclared = [...gated].filter((k) => !declared.has(k));
if (renderedNotDeclared.length) fail(`an input is gated on ${renderedNotDeclared.join(", ")}, which no discipline declares — it can never render`);
else ok("no input is gated on a field no discipline declares");

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
