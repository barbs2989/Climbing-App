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
const STRUCTURED = new Set(["waypoints", "pitches", "itinerary", "road", "access", "bivy",
  // Keyed jsonb objects rendered by their own panel. Each reuses the generic OBJ_KEYS editor,
  // so they serialise to an object exactly as road/access do.
  "crowds", "partnerRequirements", "seasonalGuidance", "emergency", "approachLogistics",
  // `sections` builds the {n,label,class,notes} array ClimbingRouteTable reads, exactly as
  // `pitches` builds pitchDetail's — structuredVal emits the shape, so no CONV applies.
  "sections", "variants"]);

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
// A THIRD way, and the one that caught nothing until AddRoute started offering these fields:
//
//     route.whatToBring && route.whatToBring.length ? route.whatToBring.join("\n") : "—"
//
// The `&& .length` reads like a type check and is not one — a non-empty STRING has a truthy
// `.length`, so it passes the guard and reaches `.join`, which strings do not have. It throws.
// `crashes()` above cannot see this: there is no `||[]` and no `.map`. Distinct from `discards()`
// too, since nothing here silently drops the value — the route page breaks outright, which is
// worse and easier to miss in review because the guard clause looks deliberate.
const throwsOnJoin = (p) =>
  new RegExp("route\\." + esc(p) + "(?:\\s*&&[^?]{0,80})?\\s*(?:\\?[^?]{0,40})?route\\." + esc(p) + "\\.join\\(").test(readers)
  || new RegExp("route\\." + esc(p) + "\\.join\\(").test(readers);

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

// ── the OTHER submission path: AddRoute's local route object ─────────────────
// Everything above is about the contribute/SuggestFix path, where CONV does the reshaping.
// AddRoute has a second, entirely separate exit that CONV never touches: when USE_DB is off it
// builds a seed-shaped route inline and hands it to onAddRoute, bypassing both the merge and
// dbRouteToCamel. So the same defect can live there with every check above green, and did:
//
//     beta:desc||""      <- a STRING, from the description textarea
//
// against readers that are `Array.isArray(route.beta)?route.beta:[]` — the ROUTE BETA
// long-prose section and the short-tips list. Both dropped it; only the third reader, which
// has a string fallback, showed anything. All 14 seed routes declare `beta:[…]` and none a
// string, so the shape was wrong by the app's own convention.
//
// The DB path is correct and deliberately different: `_prop.beta` stays a string because it is
// written to the `beta` COLUMN, and dbRouteToCamel wraps that into an array on the way out.
// Only the object built here skips that wrapper. Do not "unify" them.
const nr = block(CORE, "var _nr={", "AddRoute's local route object");
// key:value pairs at depth 1 of the literal. Depth-tracked rather than regex-split because the
// values contain ternaries, nested arrays and calls — `beta:desc?[desc]:[]` splits wrong on a
// naive comma.
const nrPairs = [];
{
  let d = 0, key = null, start = 0;
  for (let i = nr.indexOf("{") + 1; i < nr.length; i++) {
    const c = nr[i];
    if (c === "{" || c === "[" || c === "(") d++;
    else if (c === "}" || c === "]" || c === ")") { if (!d) break; d--; }
    else if (c === ":" && !d && key === null) {
      const m = nr.slice(0, i).match(/([A-Za-z_$][\w$]*)\s*$/);
      if (m) { key = m[1]; start = i + 1; }
    } else if (c === "," && !d && key !== null) {
      nrPairs.push([key, nr.slice(start, i).trim()]);
      key = null;
    }
  }
  if (key !== null) nrPairs.push([key, nr.slice(start).replace(/}\s*$/, "").trim()]);
}
if (nrPairs.length < 8) die(`parsed only ${nrPairs.length} keys out of AddRoute's local route object; the walk broke, so nothing about that path was checked.`);

let nrChecked = 0;
for (const [key, expr] of nrPairs) {
  if (!(discards(key) || crashes(key) || throwsOnJoin(key))) continue;
  nrChecked++;
  // Array-shaped is enough. An array literal anywhere in the expression covers `[]`,
  // `desc?[desc]:[]` and `Array.isArray(style)?style:[]`.
  //
  // A CALL can also be array-shaped, and the literal-only test called three correct fields
  // broken the moment AddRoute started converting with a helper. Rather than loosen the rule to
  // "anything with parentheses", each allowed helper is named here AND its definition is checked
  // to actually produce an array — so the allowance cannot rot into a hole. `linesOf` splits a
  // textarea into one entry per line, which is how whatToBring/watchOut/objHaz are read back.
  const ARRAY_HELPERS = ["linesOf"];
  const helperOk = ARRAY_HELPERS.filter((h) => {
    const def = CORE.match(new RegExp("(?:const|function)\\s+" + h + "\\s*=?\\s*(?:function)?\\s*\\([^)]*\\)\\s*\\{[^}]{0,300}"));
    return def && /\.split\(|\.filter\(|\.map\(|\[\]/.test(def[0]);
  });
  for (const h of ARRAY_HELPERS) {
    if (!helperOk.includes(h))
      die(`ARRAY_HELPERS names \`${h}\`, but no definition producing an array was found for it in ClimbMatchCore.jsx. ` +
        `Either it was renamed, or it no longer returns an array — in which case every _nr field using it is unchecked.`);
  }
  const arrayShaped = /\[/.test(expr) || helperOk.some((h) => new RegExp("\\b" + h + "\\s*\\(").test(expr));
  if (arrayShaped) console.log(`  ok    _nr.${key} — reader is array-only, and the local path builds an array`);
  else {
    console.log(`  FAIL  _nr.${key}=${expr} — AddRoute's local path assigns a non-array, but route.${key}'s reader ` +
      `discards/crashes on one. This object bypasses CONV and dbRouteToCamel, so nothing reshapes it: ` +
      `the value is accepted, the route is created, and that field renders nowhere.`);
    fails++;
  }
}
if (!nrChecked) die("checked 0 array-only fields on AddRoute's local path. `beta` is one, so the walk or the reader scan broke.");

if (fails) {
  console.error(`\n${GUARD} FAILED — ${fails} field(s) submit a value their own reader throws away.`);
  console.error("Add a CONV entry that produces the shape the reader expects, next to whatToBring/watchOut in ClimbMatch.jsx.\n");
  console.error("For a _nr.* failure there is no CONV to add — build the right shape inline, as the seed routes do.\n");
  process.exit(1);
}
console.log(`${GUARD}: ok — all ${rows.length} array-only readers are fed a converter, and ${nrChecked} on AddRoute's local path build the shape directly.`);

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
