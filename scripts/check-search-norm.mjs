#!/usr/bin/env node
// check:search-norm — the JS and SQL halves of "how a typed name is matched" are ONE rule.
//
// Migration 0190 made every search forgive spelling: "mt baker" finds Mount Baker, "bobs wall"
// finds Bob's Wall, "ne face" finds Northeast Face. The rule exists twice, necessarily:
//   SQL  search_forms / search_clean  — builds `name_search` and tokenises for the RPCs
//   JS   lib/search.js                — tokenises for the global route search (PostgREST),
//                                       the offline fallbacks, and the seed fuzzyMatch
// useRouteSearch filters the SQL-built `name_search` with JS-built words, and its exact-area leg
// compares `name_search` to a JS-built searchNorm() with `eq`. A spelling added on one side only
// matches in one box and silently misses in the next — exactly the defect 0190 fixes.
//
// Static and DB-free, so it runs in the build:
//   1. the newest migration defining search_forms() maps every word to the SAME forms as JS
//   2. search_clean()'s accent-fold strings are the same two strings JS uses
//   3. behaviour: the cases below, including the reported one, hold in JS
//   4. the NEWEST definition of every search function matches through name_search, not a verbatim
//      `name ilike '%' || q || '%'`. 0196 re-created both route finders from a pre-0190 body and
//      put the verbatim ilike back 17 minutes after 0190 shipped: "NE Buttress" then found nothing
//      in an area's route list. Sections 1-3 passed throughout — they never read the finders.
//
// It does NOT prove the live database runs that migration — check:function-drift does.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = await import(path.join(ROOT, "lib/search.js"));
const fails = [];

// ── 1. the forms table ──────────────────────────────────────────────────────────────────────
const MIG = path.join(ROOT, "supabase/migrations");
const defining = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()
  .filter((f) => /create or replace function search_forms\s*\(/i.test(fs.readFileSync(path.join(MIG, f), "utf8")));
if (!defining.length) {
  fails.push("no migration defines search_forms() — cannot compare the SQL table with lib/search.js");
} else {
  const file = defining[defining.length - 1];
  const sql = fs.readFileSync(path.join(MIG, file), "utf8");
  const body = sql.slice(sql.search(/create or replace function search_forms\s*\(/i));
  const caseBody = body.slice(0, body.indexOf("$$;", body.indexOf("$$") + 2));
  const sqlMap = new Map([...caseBody.matchAll(/when '([a-z0-9]+)' then '([a-z0-9 ]+)'/g)].map((m) => [m[1], m[2]]));
  if (sqlMap.size < 10) fails.push(`${file}: parsed only ${sqlMap.size} search_forms() entries — ANCHOR LOST, not a pass`);
  const jsWords = new Set();
  for (const [canon, aliases] of Object.entries(S.SEARCH_FORMS)) { jsWords.add(canon); aliases.forEach((a) => jsWords.add(a)); }
  const jsForms = (w) => S.searchNorm(w);
  for (const [w, forms] of sqlMap) {
    if (jsForms(w) !== forms) fails.push(`${file}: search_forms('${w}') = '${forms}' but lib/search.js gives '${jsForms(w)}'`);
  }
  for (const w of jsWords) {
    const js = jsForms(w);
    if (js === w) continue; // a word JS maps to itself (a one-way compass canonical) needs no SQL row
    if (!sqlMap.has(w)) fails.push(`lib/search.js maps '${w}' -> '${js}', but ${file}'s search_forms() has no row for it`);
  }
  // ── 2. the accent fold ────────────────────────────────────────────────────────────────────
  const clean = sql.slice(sql.search(/create or replace function search_clean\s*\(/i));
  // translate()'s first argument holds a comma of its own (`coalesce(t, '')`), so anchor on the
  // two string literals: the accented letters, then the plain ones.
  const tr = clean.slice(0, clean.indexOf("$$;")).match(/translate\([\s\S]*?'([^'\sa-z]{10,})',\s*'([a-z]{10,})'\)/);
  const js = fs.readFileSync(path.join(ROOT, "lib/search.js"), "utf8");
  const jf = js.match(/ACCENT_FROM = "([^"]+)"/), jt = js.match(/ACCENT_TO = "([^"]+)"/);
  if (!tr || !jf || !jt) fails.push("could not read the accent-fold strings from search_clean() and lib/search.js — ANCHOR LOST");
  else {
    if (tr[1] !== jf[1] || tr[2] !== jt[1]) fails.push(`accent fold differs: SQL '${tr[1]}'->'${tr[2]}' vs JS '${jf[1]}'->'${jt[1]}'`);
    if ([...jf[1]].length !== [...jt[1]].length) fails.push(`ACCENT_FROM and ACCENT_TO differ in length (${[...jf[1]].length} vs ${[...jt[1]].length}) — letters would shift`);
  }
}

// ── 3. behaviour ────────────────────────────────────────────────────────────────────────────
const MATCH = [
  ["mt baker", "Mount Baker"], ["mount baker", "Mt. Baker"], ["mt. baker", "Mount Baker"], ["baker mt", "Mount Baker"],
  ["mount st helens", "Mount St. Helens"], ["mt saint helens", "Mount St. Helens"],
  ["mount st", "Mount Stuart"],              // a half-typed word is not rewritten into "saint"
  ["bobs wall", "Bob's Wall"], ["bob's wall", "Bobs Wall"], ["ne face", "Northeast Face"],
  ["NE Buttress", "Northeast Buttress"], ["northeast buttress", "NE Buttress"],
  ["north ridge", "N Ridge"], ["sauk mtn", "Sauk Mountain"], ["cafe", "Café Crack"], ["x-ray", "X Ray"],
];
for (const [q, name] of MATCH) if (!S.searchMatches(q, name)) fails.push(`"${q}" should find "${name}" and does not`);
const NOMATCH = [["mt baker", "Mount Rainier"], ["north ridge", "South Face"]];
for (const [q, name] of NOMATCH) if (S.searchMatches(q, name)) fails.push(`"${q}" should NOT find "${name}"`);
// Exactness is what ranks a peak first: canon must equate spellings of one name.
for (const [a, b] of [["mt baker", "Mount Baker"], ["Mt. St. Helens", "mount saint helens"]]) {
  if (S.searchCanon(a) !== S.searchCanon(b)) fails.push(`searchCanon("${a}") != searchCanon("${b}")`);
}
if (S.searchNorm("Mt Baker") !== S.searchNorm("mount baker")) fails.push("searchNorm is not spelling-independent for Mt/Mount — the exact-area leg's `eq` would miss");
// Tokens go into ilike patterns unescaped: they must never carry a LIKE metacharacter.
for (const q of ["100% pure", "a_b", "50% off \\ back"]) {
  if (S.searchTokens(q).some((t) => /[%_\\]/.test(t))) fails.push(`searchTokens("${q}") leaks a LIKE metacharacter`);
}

// ── 4. every search function still USES the rule ────────────────────────────────────────────
const SEARCH_FNS = ["routes_in_subtree", "routes_in_subtree_count", "areas_in_subtree", "search_names_fuzzy"];
const migFiles = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
for (const fn of SEARCH_FNS) {
  const head = new RegExp(`create or replace function (public\\.)?${fn}\\s*\\(`, "i");
  let last = null;
  for (const f of migFiles) {
    const sql = fs.readFileSync(path.join(MIG, f), "utf8");
    let i = sql.search(head);
    if (i < 0) continue;
    // take the LAST definition in the file: a later one in the same file replaces the earlier
    for (let j; (j = sql.slice(i + 1).search(head)) >= 0;) i += j + 1;
    const open = sql.indexOf("$$", i), close = sql.indexOf("$$", open + 2);
    if (open < 0 || close < 0) { fails.push(`${f}: ${fn}() has no $$ body — ANCHOR LOST`); continue; }
    last = { f, body: sql.slice(open, close) };
  }
  if (!last) { fails.push(`no migration defines ${fn}() — ANCHOR LOST, not a pass`); continue; }
  if (/\bname\s+ilike\s+'%'\s*\|\|\s*q\b/i.test(last.body)) fails.push(`${last.f}: the newest ${fn}() matches \`name ilike '%' || q || '%'\` — a verbatim substring; "NE Buttress" stops finding Northeast Buttress. Match through name_search / search_patterns(q) (see 0190)`);
  else if (!/search_patterns\(|name_search|search_clean\(/.test(last.body)) fails.push(`${last.f}: the newest ${fn}() never reads name_search — it cannot forgive spelling`);
}

if (fails.length) {
  console.error(`check:search-norm FAILED (${fails.length})`);
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(`check:search-norm OK — SQL and JS spelling rules agree; ${MATCH.length + NOMATCH.length} match cases hold; ${SEARCH_FNS.length} search functions match through name_search`);
