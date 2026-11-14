#!/usr/bin/env node
// check:partner-areas — crag partners are found by AREA, and a crag-route objective is a tick list,
// not a match signal. Both are DECISIONS (owner, 2026-10-15) that live in SQL bodies and one JS
// list, and nothing else in the repo can see them rot.
//
// What broke conceptually, so the rules read as more than style:
//   * Partner finding keyed on individual saved routes. For sport, trad, top-rope and bouldering that
//     is far too granular — two climbers who both climb at Hellgate every weekend never matched unless
//     they had saved the SAME route. 0300 adds partner_areas: a climber lists themselves at an area at
//     any depth, and REACHABILITY IS TWO-WAY on the ltree path. A function that kept only `<@` (inside)
//     would hide "listed at Wasatch" from a Hellgate search; one that kept only `@>` (above) would hide
//     "listed at Hellgate" from a Wasatch search. Each reads as a sensible single direction. Rule 1
//     demands both in every reader.
//   * A crag objective that still moved the match: the objectives term would keep rewarding two
//     climbers for saving the same sport route while the screen says crag partners are found by area.
//     Rule 2 pins the one SQL rule (not crag-family, OR filed on a peak — trad that climbs a peak is
//     alpine, the catOf rule) in every function that answers "which objectives count".
//   * The crag list exists in THREE places: the table CHECK, the match rule and the app's CRAG_CATS.
//     Rule 3 demands they are one set, so nobody adds `aid` to one and not the others.
//   * partner_areas is OWNER-ONLY on purpose: objectives is public-read and partners_by_objective had
//     to re-apply the discoverable opt-out and the block list on top. Rule 4 refuses a public read
//     policy on the table and demands every reader is a definer that pins pg_temp (check:rls proves
//     the pin; this proves the reader IS a definer).
//
// END-STATE REPLAY, like check:rls — the LAST create of each function wins, so a later migration
// that re-creates one is judged, not the first.
//
// Static: no database, no browser. In `npm run build`.
//
//   node scripts/check-partner-areas.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readAppFile } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIG = path.join(ROOT, "supabase", "migrations");

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const dead = (m) => { console.log("  FAIL  " + m); console.log("\ncheck:partner-areas proved nothing."); process.exit(1); };

const files = fs.readdirSync(MIG).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
if (files.length < 250) dead(`only ${files.length} migrations found — the walk is broken`);

// name -> { body, file } for the LAST create of each function; plus the partner_areas table DDL.
const fns = new Map();
let tableDdl = null, tablePolicies = [];
for (const f of files) {
  const sql = fs.readFileSync(path.join(MIG, f), "utf8");
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\$(\w*)\$([\s\S]*?)\$\3\$/gi;
  let m;
  while ((m = re.exec(sql))) fns.set(m[1], { head: m[2], body: m[4], file: f });
  const t = sql.match(/create\s+table\s+(?:public\.)?partner_areas\s*\(([\s\S]*?)\);/i);
  if (t) tableDdl = { ddl: t[1], file: f };
  for (const p of sql.matchAll(/create\s+policy\s+"[^"]+"\s+on\s+(?:public\.)?partner_areas\s+for\s+(\w+)[\s\S]*?;/gi)) tablePolicies.push({ kind: p[1].toLowerCase(), text: p[0], file: f });
}
if (!tableDdl) dead("partner_areas is never created (0300) — the table DDL pattern broke");
if (fns.size < 50) dead(`parsed only ${fns.size} functions — the function pattern broke`);

console.log(`\ncheck:partner-areas — replayed ${files.length} migration(s): ${fns.size} function(s), partner_areas from ${tableDdl.file}\n`);

const need = (name) => { const f = fns.get(name); if (!f) fail(`${name} is never created`); return f; };

// ── rule 1: every reader of partner_areas reaches a listing BOTH ways on the area tree ──
for (const name of ["partners_in_area", "partners_for_my_areas", "partner_area_counts"]) {
  const f = need(name); if (!f) continue;
  // The REACHABILITY PREDICATE itself: `(x.path <@ T or (x.path @> T and x.area_type <> 'state'))`
  // (0311: the ancestor half stops at the state, so "listed at Utah" does not flood every Utah crag).
  // Not "both operators appear somewhere" — `@>` also computes listed_above, so a reader that dropped
  // the ancestor direction from its WHERE would still contain it.
  const both = /\(\s*\w+\.path\s*<@\s*[\w.]+\s+or\s+\(\s*\w+\.path\s*@>\s*[\w.]+\s+and\s+\w+\.area_type\s*<>\s*'state'\s*\)\s*\)/.test(f.body);
  if (both) ok(`${name} (${f.file}) matches a listing inside the area (<@) OR across an area below the state that contains it (@>) in one predicate`);
  else fail(`${name} (${f.file}) does not carry the reach predicate "(x.path <@ T or (x.path @> T and x.area_type <> 'state'))" — "listed at Wasatch" must surface at Hellgate, "listed at Hellgate" at Wasatch, and "listed at Utah" at Utah only.`);
}
{
  const f = need("partners_in_area");
  if (f) (/listed_above/.test(f.head) ? ok : fail)("partners_in_area returns listed_above, so a card can say \"listed across Utah\" rather than \"listed here\"");
}

// ── rule 2: which objectives still COUNT — not crag-family, or filed on a peak ──
// Both the per-row read (0300) and the SEARCH itself (0303): a search that kept matching crag objectives
// while the rows said otherwise would return a climber the row then scored as sharing nothing.
const CRAG_SQL = /\(\s*'trad'\s*,\s*'sport'\s*,\s*'toprope'\s*,\s*'aid'\s*,\s*'bouldering'\s*\)/;
for (const name of ["match_objectives_of_users", "partners_by_objective"]) {
  const f = need(name); if (!f) continue;
  const joins = /join\s+routes\b/i.test(f.body) && /join\s+areas\b/i.test(f.body);
  const rule = /discipline\s+not\s+in\s*\(/.test(f.body) && CRAG_SQL.test(f.body) && /area_type\s*=\s*'peak'/.test(f.body);
  if (joins && rule) ok(`${name} (${f.file}) keeps an objective only when its route is not crag-family or sits on a PEAK`);
  else fail(`${name} (${f.file}) does not apply the match rule — joins routes+areas:${joins} rule:${rule}`);
}

// ── rule 3: ONE crag list — the table CHECK, the match rule and the app's CRAG_CATS agree ──
{
  const ck = tableDdl.ddl.match(/disciplines\s*<@\s*array\[([^\]]+)\]/i);
  const sqlList = ck ? ck[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")).sort() : null;
  if (!sqlList) fail(`partner_areas has no disciplines CHECK (${tableDdl.file})`);
  const mo = fns.get("match_objectives_of_users");
  const ruleList = mo && mo.body.match(/discipline\s+not\s+in\s*\(([^)]+)\)/);
  const ruleArr = ruleList ? ruleList[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")).sort() : null;
  const appFiles = ["ClimbMatchCore.jsx", "RouteDetail.jsx"].map((f) => path.join(ROOT, f)).filter((p) => fs.existsSync(p));
  let appList = null, appWhere = null;
  for (const p of appFiles) {
    const m = fs.readFileSync(p, "utf8").match(/\bCRAG_CATS\s*=\s*\[([^\]]+)\]/);
    if (m) { appList = m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).sort(); appWhere = path.basename(p); break; }
  }
  if (!appList) fail("the app declares no CRAG_CATS=[...] in ClimbMatchCore.jsx or RouteDetail.jsx — the crag list is gone");
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => x === b[i]);
  if (sqlList && ruleArr && appList && same(sqlList, ruleArr) && same(sqlList, appList)) ok(`one crag list — table CHECK, match rule and ${appWhere} CRAG_CATS all say [${sqlList.join(", ")}]`);
  else fail(`the crag list has forked — CHECK:[${sqlList}] rule:[${ruleArr}] app:[${appList}]`);
}

// ── rule 4: the table is owner-only; every cross-climber read is a SECURITY DEFINER ──
{
  const sel = tablePolicies.filter((p) => p.kind === "select" || p.kind === "all");
  const pub = sel.filter((p) => /using\s*\(\s*true\s*\)/i.test(p.text));
  if (!sel.length) fail("partner_areas has no select policy — nobody, not even the owner, can read their listings");
  else if (pub.length) fail(`partner_areas has a PUBLIC read policy (${pub[0].file}) — the opt-out and the block list would be walked around. Read it through the definer functions.`);
  else if (sel.every((p) => /auth\.uid\(\)\s*=\s*user_id/.test(p.text))) ok(`partner_areas is owner-only (${sel.length} select/all policy(ies) bind auth.uid() = user_id)`);
  else fail("partner_areas select policy does not bind auth.uid() = user_id");
  for (const name of ["partners_in_area", "partners_for_my_areas", "partner_area_counts", "partner_areas_of_users", "match_objectives_of_users"]) {
    const f = fns.get(name); if (!f) continue;
    const definer = /security\s+definer/i.test(f.head);
    const gate = /p\.discoverable\s*=\s*true/.test(f.body) && /profile_owner_blocked_me\(/.test(f.body);
    const signedIn = /auth\.uid\(\)\s+is\s+null\s+then\s+raise/i.test(f.body);
    if (definer && gate && signedIn) ok(`${name} is a definer that refuses a signed-out caller and applies discoverable + the block list`);
    else fail(`${name}: definer:${definer} discoverable+blocks:${gate} signed-in gate:${signedIn}`);
  }
}

// ── rule 5: a listing cannot sit on a peak (peaks are matched by route) ──
{
  const f = need("partner_areas_validate");
  if (f) ((/'peak'/.test(f.body) && /raise\s+exception/i.test(f.body)) ? ok : fail)(`partner_areas_validate refuses a listing at a peak`);
}

// ── rule 6: the app reads listings through lib/db.js hooks named here, and objective writes refresh the match reader ──
{
  const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
  for (const h of ["useMyPartnerAreas", "savePartnerArea", "removePartnerArea", "usePartnersInArea", "usePartnersForMyAreas", "usePartnerAreaCounts", "usePartnerAreasOfUsers", "useMatchObjectivesOfUsers"]) {
    (new RegExp(`export (?:async )?function ${h}\\b`).test(db) ? ok : fail)(`lib/db.js exports ${h}`);
  }
  (/objectiveReaders\s*=[^\n]*"match-objectives-of-users"/.test(db) ? ok : fail)("saving or removing an objective refreshes match-objectives-of-users, so a match % cannot read a stale list");
  // The SOURCE half (0303): the viewer's side of every score is the match list, and no screen can feed
  // compat() the raw objectives — the raw per-user read no longer exists.
  const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
  (/ME\.matchObjectiveIds=wishlist\.filter\(/.test(app) ? ok : fail)("App derives ME.matchObjectiveIds from the wishlist (the viewer's side of every match)");
  (/\bCRAG_CATS\.includes\(catOf\(r\)\)/.test(app) ? ok : fail)("...and excludes crag-family routes with the imported CRAG_CATS + catOf, the same rule as the SQL");
  const raw = /export (?:async )?function useObjectivesOfUsers\b/.test(db);
  (!raw ? ok : fail)("lib/db.js no longer exports useObjectivesOfUsers — a raw objectives list cannot reach compat() by any path");
  // Stitched: the Partners tab, where <RealClimberRow> renders, is RoutePartnersTab.tsx since PR60.
  const feeders = ["lib/PartnerSearch.jsx", "RouteDetail.jsx"].map((f) => [f, readAppFile(path.join(ROOT, f))]);
  for (const [f, src] of feeders) {
    ((/\bcompat\(|<RealClimberRow\b/.test(src) && /\buseMatchObjectivesOfUsers\b/.test(src) && !/\buseObjectivesOfUsers\b/.test(src)) ? ok : fail)(`${f} scores real rows from useMatchObjectivesOfUsers`);
  }
}

console.log(`\ncheck:partner-areas: ${bad ? "FAILED — " + bad + " of " + ran : "ok — " + ran + " assertion(s)"}`);
process.exit(bad ? 1 : 0);
