#!/usr/bin/env node
// check:approve-route-columns — nothing may fork `approve_new_route` again.
//
// 0128 and 0132 both rewrote that function from the same ancestor (0127) hours apart, each
// adding what it cared about and dropping what the other added: 0128 gained `grade_num` and
// lost nothing yet, 0132 gained six tech-stat columns and silently lost `grade_num`. Both
// files are green, both idempotent, both guarded, and `check:migrations` is satisfied because
// they carry different numbers. The result was six columns that exist on `routes`, are
// allow-listed in `SS`, are collected by the form, are mapped by `dbRouteToCamel` and render
// in the TECH STATS tiles — and are written by nothing. See 0135.
//
// NOTHING COULD HAVE CAUGHT IT. The merge was clean (different files). Every gate stayed
// green. Both function bodies are valid SQL that inserts a route. And the live probe both
// authors ran — "does a non-admin still get P0001?" — is answered identically by either fork,
// because the admin gate is the first statement in both. A behavioural check that passes on
// the broken version is worse than no check, so this one is STATIC and structural.
//
// THREE RULES, each an actual defect from this episode:
//
//   1. MONOTONIC COLUMNS. The newest definition's insert must be a superset of every earlier
//      definition's. A function that accretes fields may gain them and must never lose one.
//      This is the rule that fires on the fork itself.
//   2. ONE LIVE SIGNATURE. `create or replace` cannot replace across argument lists — a
//      different arg list is a different function. So each file that creates a new signature
//      must drop the old one, or Postgres keeps both and a call matching both is `42725`
//      ambiguous rather than resolved. 0132 created a 1-arg version without dropping.
//   3. THE CLIENT MATCHES. `lib/db.js` names its RPC arguments; PostgREST resolves by those
//      names. If they do not match the one surviving signature the call is PGRST202 and
//      approval is impossible — which is what the 2-arg client would have hit had 0132 been
//      the last write.
//
// Static: reads the migration files and lib/db.js, no DB and no browser, so it sits in
// `npm run build`. Fails CLOSED — zero definitions found means the parse broke, never that
// the tree is clean.
//
// Injection-tested; the cases are at the bottom of this file. Case 1 is not synthetic: it is
// the real historical fault, reproduced by deleting 0135.

import fs from "fs";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const DB_JS = path.join(ROOT, "lib", "db.js");
const FN = "approve_new_route";

const fail = [];
const note = [];

// ── strip `--` line comments only. Deliberately NOT the comment/string blanker other guards
// use: these files are prose-heavy SQL whose comments quote the very identifiers we match
// (0135's header names every column), so a comment that MENTIONS `grade_num` must not read as
// the insert writing it. Block comments are not used in these files; if one appears, the
// header assertion below catches the parse going wrong rather than passing quietly.
function stripLineComments(sql) {
  return sql.split("\n").map((l) => {
    const i = l.indexOf("--");
    return i === -1 ? l : l.slice(0, i);
  }).join("\n");
}

// ── the argument TYPES identify a Postgres signature; the names are what PostgREST resolves on,
// so both are kept.
//
// A CREATE writes `name type [default …]` while a DROP writes the bare TYPE LIST
// (`approve_new_route(uuid)`). Reading both the same way was this script's own first bug: a
// drop parsed as zero arguments, so it deleted the signature `approve_new_route()` that no
// file ever creates, every real drop became a no-op, and rule 2 reported two live overloads
// against correct migrations. One token means a type; two or more mean name-then-type.
function parseArgs(raw) {
  const inner = raw.trim();
  if (!inner) return { types: [], names: [] };
  return inner.split(",").reduce((acc, part) => {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (toks.length === 1) { acc.names.push(null); acc.types.push(toks[0].toLowerCase()); }
    else if (toks.length >= 2) { acc.names.push(toks[0]); acc.types.push(toks[1].toLowerCase()); }
    return acc;
  }, { types: [], names: [] });
}

const sigKey = (types) => `${FN}(${types.join(",")})`;

// ── walk the migrations in NUMBER order, which is the order they are meant to apply in.
let files;
try {
  files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
} catch (e) {
  console.error(`FAIL  cannot read ${MIGRATIONS}: ${e.message}`);
  process.exit(1);
}
if (files.length < 20) {
  console.error(`FAIL  only ${files.length} migration files found — the walk broke, not a clean tree`);
  process.exit(1);
}

const defs = [];        // { file, types, names, cols }
let live = new Set();   // signatures Postgres would hold after applying in order

for (const f of files) {
  const raw = fs.readFileSync(path.join(MIGRATIONS, f), "utf8");
  if (!raw.includes(FN)) continue;
  const sql = stripLineComments(raw);

  // drops first within a file: 0128/0135 both drop the old signature immediately before
  // creating the new one, which is the correct order and the one this models.
  for (const m of sql.matchAll(new RegExp(`drop\\s+function\\s+(?:if\\s+exists\\s+)?${FN}\\s*\\(([^)]*)\\)`, "gi"))) {
    live.delete(sigKey(parseArgs(m[1]).types));
  }

  for (const m of sql.matchAll(new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+${FN}\\s*\\(([^)]*)\\)`, "gi"))) {
    const { types, names } = parseArgs(m[1]);
    live.add(sigKey(types));

    // the insert's column list, from this definition's own body
    const body = sql.slice(m.index);
    const ins = body.match(/insert\s+into\s+routes\s*\(([\s\S]*?)\)\s*values/i);
    if (!ins) {
      fail.push(`${f}: defines ${sigKey(types)} but no \`insert into routes (...) values\` was found in its body — the parse broke or the function stopped writing a route`);
      continue;
    }
    const cols = ins[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (!cols.length) { fail.push(`${f}: the insert column list parsed EMPTY`); continue; }
    defs.push({ file: f, types, names, cols: new Set(cols) });
  }
}

// ── fail closed ───────────────────────────────────────────────────────────────
// Report anything already collected FIRST. A broken insert regex makes every definition fail
// to parse, so `defs` empties and the generic message below would blame a rename — sending
// whoever reads it hunting for a renamed function that is sitting right there. Injection
// case 6 is exactly that, and it printed the wrong cause until this branch existed.
if (!defs.length && fail.length) {
  console.error(`FAIL  ${FN} appears in the migrations but NO definition could be parsed:`);
  fail.forEach((f) => console.error(`\n  FAIL  ${f}`));
  console.error(`\nThis is a parse failure in this guard, not a clean tree.`);
  process.exit(1);
}
if (!defs.length) {
  console.error(`FAIL  no definition of ${FN} found in ${files.length} migrations — renamed, or the parse broke. This guard cannot report a clean tree from an empty scan.`);
  process.exit(1);
}

console.log(`${FN}: ${defs.length} definition(s) across ${files.length} migrations`);
for (const d of defs) console.log(`   ${d.file.padEnd(46)} ${sigKey(d.types).padEnd(34)} ${d.cols.size} columns`);

const latest = defs[defs.length - 1];

// ── rule 1: monotonic columns ────────────────────────────────────────────────
const union = new Map(); // column -> first file that wrote it
for (const d of defs) for (const c of d.cols) if (!union.has(c)) union.set(c, d.file);
const lost = [...union.keys()].filter((c) => !latest.cols.has(c));
if (lost.length) {
  fail.push(
    `${latest.file} defines the newest ${sigKey(latest.types)} but DROPS ${lost.length} column(s) an earlier definition wrote:\n` +
    lost.map((c) => `        ${c.padEnd(14)} first written by ${union.get(c)}`).join("\n") +
    `\n        A definition of this function may GAIN columns and must never lose one — that is the fork\n` +
    `        0128/0132 shipped. Base a rewrite on the CURRENT definition, not on the one it replaced.`
  );
} else {
  console.log(`\nrule 1  columns monotonic — newest definition writes all ${union.size} ever written  ok`);
}

// ── rule 2: exactly one live signature ───────────────────────────────────────
if (live.size !== 1) {
  fail.push(
    `after applying every migration in order, ${live.size} signature(s) of ${FN} would exist: ${[...live].join(", ")}\n` +
    `        \`create or replace\` cannot replace across argument lists, so a file introducing a new\n` +
    `        signature must \`drop function if exists\` the old one. Two live overloads make a call that\n` +
    `        matches both a 42725 ambiguity, or silently route to the wrong body.`
  );
} else {
  console.log(`rule 2  exactly one live signature — ${[...live][0]}  ok`);
}

// ── rule 3: the client's argument names match the surviving signature ────────
let dbjs;
try { dbjs = fs.readFileSync(DB_JS, "utf8"); } catch (e) {
  console.error(`FAIL  cannot read ${DB_JS}: ${e.message}`);
  process.exit(1);
}
const call = dbjs.match(new RegExp(`rpc\\(\\s*["']${FN}["']\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, "i"));
if (!call) {
  fail.push(`lib/db.js does not call ${FN} with an object literal of named arguments — either the consume half is gone, or this guard can no longer see it`);
} else {
  // A key must follow `{` or `,`, never float anywhere a colon appears. Matching every
  // `word:` was this script's second bug: the argument's own value is
  // `Number.isFinite(gradeNum) ? gradeNum : null`, and the ternary's `gradeNum :` read as a
  // third argument name, so rule 3 failed against a correct call.
  const sent = [...call[1].matchAll(/(?:^|[{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]);
  const declared = latest.names;
  const unknown = sent.filter((s) => !declared.includes(s));
  if (unknown.length) {
    fail.push(
      `lib/db.js sends argument(s) ${unknown.join(", ")} that ${sigKey(latest.types)} does not declare (it takes ${declared.join(", ") || "none"}).\n` +
      `        PostgREST resolves an RPC by argument NAME, so this call is PGRST202 and approval is impossible.`
    );
  } else {
    console.log(`rule 3  lib/db.js sends {${sent.join(", ")}} — all declared by the live signature  ok`);
  }
}

// ── rule 4: the approval reads every key the form offers ─────────────────────
// The gap between the two guards that existed. This one proved the function never LOSES a
// column it once wrote; check:add-route-fields proved a field is in `SS`, which makes
// session-merge work and says nothing about approval. Neither asks whether the form offers
// something the function never wrote AT ALL — so #862 and #877 widened the form by 8 fields,
// every one was accepted, toasted as submitted, and dropped on approval. Third instance of
// this shape after 0132/0135.
//
// Matching on `v->>'key'` rather than on column names deliberately: the function itself is the
// only honest record of which proposal key feeds which column, and a hand-maintained rename
// map would rot exactly where this guard needs to be right.
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
let core;
try { core = fs.readFileSync(CORE, "utf8"); } catch (e) {
  console.error(`FAIL  cannot read ${CORE}: ${e.message}`); process.exit(1);
}
const fIdx = core.indexOf("const FIELDS={rock:[");
if (fIdx < 0) {
  fail.push("`const FIELDS={rock:[` not found in ClimbMatchCore.jsx — AddRoute's field list moved, so this guard can no longer tell what the form offers");
} else {
  let d = 0, j = core.indexOf("{", fIdx);
  for (let i = j; i < core.length; i++) { if (core[i] === "{") d++; else if (core[i] === "}") { d--; if (!d) { j = i; break; } } }
  const fSeg = core.slice(fIdx, j + 1);
  const offered = new Set();
  for (const m of fSeg.matchAll(/([a-z]+):\[([^\]]*)\]/g))
    m[2].split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean).forEach((k) => offered.add(k));
  // three form keys are renamed on submit; AddRoute's own `_prop` is where that happens
  const SUBMIT_AS = { descent: "descentText", height: "length", pitches: "pitchCount" };
  // read by another mechanism, not from the proposal jsonb
  const NOT_FROM_PROPOSAL = new Set(["grade"]); // grade_num arrives as p_grade_num, grade as v->>'grade'
  const latestBody = fs.readFileSync(path.join(MIGRATIONS, latest.file), "utf8");
  const readKeys = new Set([...latestBody.matchAll(/v\s*->>?\s*'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((m) => m[1]));
  const unread = [...offered]
    .map((k) => [k, SUBMIT_AS[k] || k])
    .filter(([, sk]) => !readKeys.has(sk) && !NOT_FROM_PROPOSAL.has(sk))
    .sort();
  if (!offered.size) {
    fail.push("parsed 0 offered fields out of FIELDS — the walk broke, not an empty form");
  } else if (unread.length) {
    fail.push(
      `${latest.file} never reads ${unread.length} key(s) the ADD-ROUTE FORM offers:\n` +
      unread.map(([k, sk]) => `        form field ${k.padEnd(14)} submitted as ${sk}`).join("\n") +
      `\n        Each is collected from the climber, accepted into \`contributions\` and toasted as\n` +
      `        submitted — then dropped the moment an admin approves. Offering a field and not\n` +
      `        writing it is worse than not offering it.`
    );
  } else {
    console.log(`rule 4  every one of the ${offered.size} fields the form offers is read by the approval  ok`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (note.length) { console.log(""); note.forEach((n) => console.log(`note  ${n}`)); }
if (fail.length) {
  console.error(`\n${fail.length} failure(s):`);
  fail.forEach((f) => console.error(`\n  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\nok — ${FN} has one signature, writes every column any version wrote, and matches its caller`);

// ── injection cases (re-run these after changing any parsing above) ──────────
//
// 1. THE REAL HISTORICAL FAULT, not a synthetic one: delete
//    supabase/migrations/0135_approve_new_route_merges_two_forks.sql.
//    Expect rule 1 to fail naming `grade_num` as first written by 0128, and rule 2 to fail
//    with two live signatures. This is the state main was in before 0135.
// 2. Remove `pads` from 0135's insert column list -> rule 1 fails naming pads / 0132.
// 3. Remove the `drop function if exists approve_new_route(uuid);` line from 0135 -> rule 2
//    fails with 2 live signatures. (Rule 1 still passes, which is the point of having both.)
// 4. Change lib/db.js's call to send `p_grade` instead of `p_grade_num` -> rule 3 fails.
// 5. Rename the function in every migration -> "no definition found", exit 1, NOT a pass.
// 6. Break the insert regex (e.g. match `insert into route `) -> every definition reports
//    "no insert into routes found" rather than parsing an empty column set and passing.
