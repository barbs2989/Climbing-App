#!/usr/bin/env node
// Every field SuggestFix offers must be applicable by the merge that reads contributions
// back. It is not enough for the form to accept an edit: `var SS={…}` in ClimbMatch.jsx is
// an ALLOW-LIST, consulted by BOTH merge paths — the local routeEdits one and the DB one
// that counts distinct contributors. A key present in the form and absent from SS is
// accepted, toasted as recorded, written to the contributions table, and then never read by
// anything. The climber sees a success message and the route never changes.
//
// This is not hypothetical: the bailout/startLocation comment in ClimbMatch.jsx documents
// exactly this shape ("a contributions row for them would be written and never read"), and
// those two are handled by returning BEFORE the field-edit path — which is why they are the
// only legitimate exemptions here.
//
// Static and fast (no DB, no browser), so it sits in `npm run build` with the other gates.
//
//   npm run check:contrib-fields
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// appSources returns the canonical app file list and bails if a REQUIRED source has been
// renamed out from under it — the #547 failure, where a guard silently read 24% of the app.
// This guard only needs two of those files, but it asks for the list so a rename is fatal
// here too rather than yielding a quietly shorter scan.
const SOURCES = appSources(ROOT, "check:contrib-fields");
for (const f of ["RouteDetail.jsx", "ClimbMatch.jsx"]) {
  if (!SOURCES.includes(f)) {
    console.error(`ANCHOR LOST: ${f} is not in the app source list — nothing below was checked.`);
    process.exit(1);
  }
}
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const rd = read("RouteDetail.jsx"), cm = read("ClimbMatch.jsx");

// Anchored on the real declarations. A rename must fail loudly rather than yield an empty
// set — an empty set on either side would make every comparison below pass vacuously, which
// is the failure mode guards in this repo keep rediscovering.
const fieldsLine = rd.split("\n").find((l) => l.includes("const FIELDS=[{k:"));
if (!fieldsLine) {
  console.error("ANCHOR LOST: `const FIELDS=[{k:` not found in RouteDetail.jsx — nothing below was checked.");
  process.exit(1);
}
const form = [...fieldsLine.matchAll(/k:"([a-zA-Z0-9_]+)"/g)].map((m) => m[1]);

const ssM = cm.match(/var SS=\{([\s\S]*?)\};/);
if (!ssM) {
  console.error("ANCHOR LOST: `var SS={` not found in ClimbMatch.jsx — nothing below was checked.");
  process.exit(1);
}
const ss = new Set([...ssM[1].matchAll(/([a-zA-Z0-9_]+)\s*:\s*1/g)].map((m) => m[1]));

if (!form.length || !ss.size) {
  console.error(`read ${form.length} form field(s) and ${ss.size} SS entr(ies) — refusing to report ok on an empty parse.`);
  process.exit(1);
}

// There are TWO ways a field reaches onContribute, and checking only the first was this
// guard's own first-draft bug. Besides the FIELDS list, RouteDetail calls onSubmit directly
// with a literal field name — that is how bailout and startLocation are filed, and they are
// NOT in FIELDS, so a FIELDS-only scan can never see that path at all.
const direct = [...rd.matchAll(/onSubmit\(\{[^)]{0,120}?field:\s*"([a-zA-Z0-9_]+)"/g)].map((m) => m[1]);

// Exempt from the SS requirement because onContribute returns BEFORE the field-edit path for
// them: they are additive, geo-clustered lists read back through bailoutEdits /
// startLocationConsensus, not scalar fields. A name here that stops being filed that way
// must fail, so the list cannot rot.
const EXEMPT = ["bailout", "startLocation"];
const stale = EXEMPT.filter((k) => !direct.includes(k) && !form.includes(k));
if (stale.length) {
  console.error(`stale exemption(s): ${stale.join(", ")} — no longer submitted anywhere. Remove from EXEMPT.`);
  process.exit(1);
}

const submitted = [...new Set(form.concat(direct))];
const dead = submitted.filter((k) => !ss.has(k) && !EXEMPT.includes(k));
if (dead.length) {
  console.error(`check:contrib-fields: ${dead.length} field(s) offered by SuggestFix but missing from SS in ClimbMatch.jsx.`);
  console.error("Each is accepted, reported as recorded, written to `contributions`, and never applied:\n");
  for (const k of dead) console.error(`  ${k}`);
  console.error("\nAdd the key to SS (and an M entry if the route property is named differently,");
  console.error("and a CONV entry if the submitted string needs converting to the stored shape).");
  process.exit(1);
}

// ---- the same question, one level down: object fields have SUB-keys -------------------
//
// `road` and `access` are jsonb objects, so passing the check above only proves the COLUMN is
// applied — it says nothing about whether the individual keys the form offers are keys any
// reader looks at. Get one wrong and the failure is the exact shape this guard exists to stop:
// accepted, stored, consensus reached, displayed nowhere.
//
// It is a live risk rather than a hypothetical, because the readers and the key lists sit ~400
// lines apart in RouteDetail.jsx and nothing ties them together. `access` in particular carries
// TWO spellings for the same fact — `land_manager` on 399 of 400 sampled rows and `landManager`
// on 8, with display reading `ac.land_manager||ac.landManager` — so "which spelling does the
// form write?" has a right answer and a silently-wrong one.
//
// Deliberately a SUBSTRING test against the whole file rather than a scoped one: a sub-key can
// legitimately be read as `ac.foo`, `route.road.foo`, `road.foo` or destructured, and demanding
// a single shape would fail on correct code. The claim here is only "something, somewhere,
// mentions this key" — weak, but it is exactly strong enough to catch a typo or a rename, which
// is the failure that actually happens.
const OBJ_FIELDS = [["ROAD_KEYS", "road"], ["ACCESS_KEYS", "access"]];
for (const [constName, field] of OBJ_FIELDS) {
  const m = rd.match(new RegExp("const " + constName + "=(\\[[\\s\\S]*?\\]);"));
  if (!m) {
    console.error(`check:contrib-fields: ANCHOR LOST — ${constName} not found in RouteDetail.jsx.`);
    console.error(`The sub-keys of the \`${field}\` field went unchecked, so this run proved less than it claims.`);
    process.exit(1);
  }
  const subKeys = [...m[1].matchAll(/\["([a-zA-Z_]+)","/g)].map((x) => x[1]);
  if (!subKeys.length) {
    console.error(`check:contrib-fields: parsed 0 sub-keys out of ${constName} — the scan broke.`);
    process.exit(1);
  }
  const unread = subKeys.filter((k) => !new RegExp("\\." + k + "\\b").test(rd));
  if (unread.length) {
    console.error(`check:contrib-fields: ${unread.length} sub-key(s) of \`${field}\` are offered by the form and read by nothing:\n`);
    for (const k of unread) console.error(`  ${field}.${k}`);
    console.error(`\nA climber can fill these in, reach consensus, and see nothing change.`);
    console.error(`Check the spelling against the panel's own reader — \`access\` has two`);
    console.error(`land-manager spellings and the form must write the canonical one.`);
    process.exit(1);
  }
  console.log(`  ${field}: ${subKeys.length} sub-key(s) offered, all read`);
}

const orphan = [...ss].filter((k) => !submitted.includes(k));
console.log(`check:contrib-fields: ok — all ${submitted.length} submittable fields are applied by the merge.`);
console.log(`  ${form.length} from the SuggestFix form, ${direct.length} filed directly (${[...new Set(direct)].join(", ") || "none"})`);
console.log(`  ${EXEMPT.length} exempt (additive lists, handled before the field-edit path): ${EXEMPT.join(", ")}`);
if (orphan.length) console.log(`  ${orphan.length} in SS but not in the form, set by other flows: ${orphan.join(", ")}`);

// Injection-tested 2026-08-09:
//   delete whatToBring from SS            -> fails naming whatToBring
//   rename `var SS={` in ClimbMatch.jsx   -> ANCHOR LOST, exit 1 (does not pass vacuously)
//   rename `const FIELDS=[{k:`            -> ANCHOR LOST, exit 1
//   add a bogus name to EXEMPT            -> fails as a stale exemption
//
// Sub-key extension, injection-tested 2026-08-12:
//   typo a sub-key (land_manager -> land_managr) -> fails naming access.land_managr
//   rename ROAD_KEYS                             -> ANCHOR LOST, exit 1 (not a vacuous pass)
//   empty the key list                           -> "parsed 0 sub-keys", exit 1
//   swap land_manager for the legacy landManager -> PASSES, deliberately. Both spellings are
//     read (display is `ac.land_manager||ac.landManager`), so the legacy one is not BROKEN,
//     just worse. This guard's claim is "a reader looks at this key", not "you picked the
//     better key" — encoding the editorial preference here would make it fail on code that
//     works, and the reasoning for preferring the canonical spelling lives in the comment
//     beside ACCESS_KEYS where the next person will actually read it.
