// check:contrib-shapes — what the contribute form SUBMITS must be the shape its readers READ.
//
// `check:contrib-fields` already asks whether every offered field is one the merge will apply.
// This asks the next question down, and it is a different one: a field can be in `SS`, be
// applied by both merge paths, and still reach a reader that cannot use the VALUE it produced.
//
// THE DEFECT THIS WAS WRITTEN FOR. `beta` is an array of prose entries everywhere it is
// produced — `dbRouteToCamel` normalises the column to one, and all 14 seed routes declare
// `beta:[...]`. Both readers gate on `Array.isArray(route.beta)` and fall back to `[]`. The
// form's `beta` input is `type:"long"`, a textarea, and `CONV` had no `beta` entry — so a
// contributed description arrived as a STRING and was discarded by both readers.
//
// BE PRECISE ABOUT THE BLAST RADIUS; the obvious reading is wrong in both directions.
// `routes.beta` is a string on all 1,076 populated rows and an array on zero — but that is NOT
// the bug, because `dbRouteToCamel` wraps the column on the way out, so every enriched route
// renders its BETA section correctly today. The broken shape exists only on the CONTRIBUTE
// path, where the merged value lands on an already-camelised route object and never passes
// back through that wrapper. Equally, it is not merely the submitter's own session: the merge
// runs for every viewer off the `contributions` ledger, and its gate is
// `win.n>=3 || wasEmpty`. An absent beta is `[]` after camelisation, so `wasEmpty` is true on
// the ~204,400 routes carrying none — meaning ONE contribution applies there, immediately, for
// everybody, and renders nowhere. Those are exactly the routes whose "No route description
// yet" note invited a description, so the two defects compounded. On the 1,076 routes that DO
// have beta, three agreeing contributors blank the section for everyone instead.
//
// Nothing caught it and nothing could. `check:contrib-fields` was green — `beta` IS in `SS`.
// `check:refs`/`check:dead-props` were green — every identifier is bound and every prop is
// read. `check:field-renders` was green, and correctly so: it injects the value the DB holds,
// which `dbRouteToCamel` has already turned into an array. The broken shape only ever exists
// on the contribute path, which no guard rendered. Same family as `descent_text` — populated
// and rendered nowhere — except here the value is a climber's own words, discarded after a
// success toast.
//
// WHY THE RULE IS "DISCARDS OR CRASHES", NOT "TREATS AS AN ARRAY". Measured before shipping,
// because the loose rule is noisy: 11 submittable fields are array-treated somewhere, and most
// are fine. `condWindow` is read as `Array.isArray(x)?x.join(", "):x` — the string fallback is
// USED, so a comma-joined string renders correctly and by design. That is one of the columns
// that deliberately holds two JS shapes. The defect is specifically a reader whose non-array
// fallback DISCARDS the value (`:[]`) or one that hands it straight to an array method. Those
// two shapes flag 4 fields, of which the real finding was 1 — the rest carry converters.
//
// Static: no browser, no DB, so it sits in `npm run build` beside the other contribute gates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:contrib-shapes";
appSources(ROOT, GUARD);

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const APP = read("ClimbMatch.jsx");
const RD = read("RouteDetail.jsx");
const CORE = read("ClimbMatchCore.jsx");

let fails = 0;
const die = (msg) => { console.error(`\n${GUARD} FAILED — ${msg}\n`); process.exit(1); };

// Comments are stripped before any test: this file's own header, and the explanatory comment
// beside CONV, both spell out the very patterns being searched for. Presence is not use — the
// same false pass `check:rappel-readers` records, where two readers "carried" a guard they had
// only ever named in a comment.
function stripComments(src) {
  let out = "", i = 0, quote = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += n === undefined ? "" : n; i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === "/" && n === "/") { const nl = src.indexOf("\n", i); i = nl < 0 ? src.length : nl; continue; }
    if (c === "/" && n === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

// Balance braces over RAW source. The blanker above treats every apostrophe as a string
// delimiter and JSX body text is full of them (`don't`), so it desynchronises and swallows
// braces — safe for "does this pattern appear", never for balancing. This is the rule
// check:overlay-discovery records, in the same direction.
// `open` matters: FIELDS is an ARRAY of objects, so balancing `{` from its start lands on the
// end of the first entry and returns one field out of fifty-three. That is not a loud failure
// — it is a shorter list that still parses, and every field after the first silently stops
// being checked. Caught only because the emptiness rule below fired.
function block(src, start, what, open = "{") {
  const close = open === "[" ? "]" : "}";
  const i = src.indexOf(start);
  if (i < 0) die(`ANCHOR LOST — \`${start}\` is not in the source. ${what} could not be read, so nothing below was actually checked.`);
  let d = 0, j = src.indexOf(open, i);
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === open) d++;
    else if (c === close) { d--; if (!d) return src.slice(i, j + 1); }
  }
  die(`unbalanced ${open}${close} reading ${what}`);
}

const SS = [...block(APP, "var SS={", "the SS allow-list").matchAll(/([a-zA-Z_]+):1/g)].map((m) => m[1]);
const CONV = [...block(APP, "var CONV={", "the CONV converters").matchAll(/([a-zA-Z_]+):function/g)].map((m) => m[1]);
const M = Object.fromEntries(
  [...block(APP, "var M={", "the M rename map").matchAll(/([a-zA-Z_]+):"([a-zA-Z_]+)"/g)].map((m) => [m[1], m[2]])
);
const FIELDS = [...block(RD, "const FIELDS=[{k:", "the SuggestFix FIELDS list", "[").matchAll(/\{k:"([a-zA-Z_]+)",label:"[^"]*",type:"([a-zA-Z]+)"/g)]
  .map((m) => ({ k: m[1], type: m[2] }));

// Fail closed on every input. An empty set on any side makes every comparison below pass
// vacuously — the failure `guard-sources.mjs` exists to stop, and the one `check:writes`
// actually shipped (it printed ok having derived an empty write vocabulary).
if (!SS.length) die("parsed 0 keys out of SS.");
if (!CONV.length) die("parsed 0 converters out of CONV.");
if (!FIELDS.length) die("parsed 0 entries out of FIELDS.");

// Input types that already emit a structured value. Everything else — long, text, single,
// multi, num, grade, rack — serialises to a STRING before it reaches the merge, which is the
// only case this guard is about. Keyed on the TYPE, never on a field name, so a new builder
// field is exempt automatically and a new textarea is not.
const STRUCTURED = new Set(["waypoints", "pitches", "itinerary", "road", "access"]);

const readers = stripComments(RD + "\n" + CORE);
// The stripper's own failure mode is silent: desynchronise on an apostrophe and it eats real
// code, after which every pattern below is absent and the guard reports a clean sweep. Assert
// a known live reader survives it before trusting a single result.
if (!/Array\.isArray\(route\.beta\)/.test(readers))
  die("the comment stripper ate real code — `Array.isArray(route.beta)` did not survive it, so every check below would have reported clean.");

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A string is silently DISCARDED: the non-array branch is an empty array.
const discards = (p) => new RegExp("Array\\.isArray\\(route\\." + esc(p) + "\\)\\s*\\?[^?]{0,120}?:\\s*\\[\\]").test(readers);
// A string reaches an array METHOD, which throws — `"abc"||[]` is truthy, so the guard clause
// does not guard anything.
const crashes = (p) =>
  new RegExp("\\(route\\." + esc(p) + "\\|\\|\\[\\]\\)\\s*\\.(map|filter|forEach|slice|some|every|reduce)\\(").test(readers);

const typeOf = Object.fromEntries(FIELDS.map((f) => [f.k, f.type]));
const rows = [];
for (const f of SS) {
  const type = typeOf[f];
  if (!type || STRUCTURED.has(type)) continue; // not offered by this form, or emits structure already
  const prop = M[f] || f;
  const d = discards(prop), c = crashes(prop);
  if (!d && !c) continue;
  rows.push({ f, prop, type, why: d ? "discards a string" : "crashes on a string", conv: CONV.includes(f) });
}

console.log(`  ${SS.length} submittable fields, ${FIELDS.length} offered by SuggestFix, ${CONV.length} converters`);
for (const r of rows) {
  const name = r.f + (r.prop !== r.f ? ` -> route.${r.prop}` : "");
  if (r.conv) console.log(`  ok    ${name} (${r.type}) — reader ${r.why}, CONV.${r.f} makes an array`);
  else {
    console.log(`  FAIL  ${name} (${r.type}) — reader ${r.why}, and CONV has no \`${r.f}\` entry`);
    fails++;
  }
}

// Zero flagged fields means the reader scan broke, not that the app is clean — every one of
// these readers is real code that is not going away. Same rule as check:clickable and
// check:a11y-badges: an empty scan is a broken scan.
if (!rows.length) die("found 0 array-only readers among the submittable fields. The scan is broken — this app has several, `beta` and `hazards` among them.");

// A GLOBAL emptiness rule is not enough, and injection case 5 is why. Retyping `beta` to a
// structured builder drops it out of `rows` while `haz` keeps the count above zero, so the run
// reported "ok — all 1 array-only readers" having quietly stopped checking the field this
// guard was written for. The injection logged and the counter did not move: a coverage hole is
// invisible by construction unless something asks from outside. These two are pinned because
// both readers are long-lived app code, and a pinned name that stops applying FAILS as stale
// bookkeeping rather than silently shrinking the sweep — the rule check:field-renders' KNOWN
// map and check:zero's NEEDS_EXTRA_STATE both follow.
const MUST_COVER = ["beta", "haz"];
for (const name of MUST_COVER) {
  if (rows.some((r) => r.f === name)) continue;
  die(
    `\`${name}\` is no longer being checked, so coverage shrank without a single failure.\n` +
      `  It is submittable (in SS: ${SS.includes(name)}), offered by the form as type ` +
      `\`${typeOf[name] || "—"}\`, and its reader discards/crashes on a string.\n` +
      `  If that is a deliberate change, remove it from MUST_COVER in this script and say why.`
  );
}

if (fails) {
  console.error(`\n${GUARD} FAILED — ${fails} field(s) submit a value their own reader throws away.`);
  console.error("Add a CONV entry that produces the shape the reader expects, next to whatToBring/watchOut in ClimbMatch.jsx.\n");
  process.exit(1);
}
console.log(`${GUARD}: ok — all ${rows.length} array-only readers are fed a converter.`);

// Injection-tested, 5 cases:
//   1. delete the `beta` CONV entry          -> FAILS naming beta (the shipped defect)
//   2. rename `var CONV={`                   -> ANCHOR LOST, never a pass
//   3. rename `var SS={`                     -> ANCHOR LOST
//   4. neuter both reader patterns           -> FAILS "found 0 array-only readers"
//   5. change beta's FIELDS type to a builder -> FAILS on MUST_COVER.
//
// Case 5 was a FALSE PASS on the first draft and is the reason MUST_COVER exists: the global
// emptiness rule stayed satisfied by `haz` alone, so the run printed "ok — all 1 array-only
// readers" having silently stopped checking `beta`. It was not visible by reading the script.
