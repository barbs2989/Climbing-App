#!/usr/bin/env node
// check:rank-breakdown — "How N points add up" must add up to N.
//
// Ranks counts a climber's numbers in leaderboard() (0379); the sheet a climber opens by tapping a
// number lists the climbs behind it from rank_breakdown() (0357). The second COPIES the first's
// counting for one climber rather than sharing it (a shared helper would put a function call per log
// inside the board query every Ranks open runs), so a scoring change made to one and not the other
// leaves the sheet listing climbs that sum to a different number than the row it was opened from —
// a screen claiming an arithmetic it does not do. 0373 had to edit both by hand for the summit flag;
// nothing held them together until this guard (owner note, 2026-10-22: "view each rank signal ... to
// add more context to how they have that many points").
//
// Rules, each read from the LATEST definition of each function in supabase/migrations/:
//   1. Every scoring rule (the tier weights, the grade, what counts as sent, the Top-rope/Follow
//      penalty, Send-point and Onsight-point formulas, first-log order, which ticks are onsights, the
//      summit test, Vert's height, "recent", rock->trad, the conditions exclusion, the log source)
//      is extracted from BOTH bodies and must be the same text once table aliases are dropped.
//   2. The sheet's own sentences (lib/RankBreakdown.jsx HOW + TIER) state the constants the SQL uses:
//      8 + grade² × 0.35, 10 + grade² × 0.3, ×0.75, ×0.5, one letter = 0.25, 12 months = 365 days.
//   3. The sheet filters by Climbing type the way leaderboard() keys a log (sport and trad also rank
//      as rock), and Backed climbs only drops the 'self' tier, as leaderboard()'s 'backed' set does.
//   4. The boards and Climbing types leaderboard() ranks (0379's metric CTE) are the boards and types
//      lib/Leaderboards.jsx offers, so "top 100 of any board" is computed over the boards on screen.
//
// Static, no database. In `npm run build`. `--selftest` mutates each side in memory and asserts the
// guard fails on every rule (the guard proves it can fail without a separate inject suite).
//
//   node scripts/check-rank-breakdown.mjs [--selftest]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIG = path.join(ROOT, "supabase", "migrations");
const dead = (m) => { console.log("  FAIL  " + m); console.log("\ncheck:rank-breakdown proved nothing."); process.exit(1); };

// The last body of public.<name>(...) across the migrations, in number order.
function latestBody(name) {
  const files = fs.readdirSync(MIG).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
  let hit = null;
  const re = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, "gi");
  for (const f of files) {
    const src = fs.readFileSync(path.join(MIG, f), "utf8");
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) {
      const open = src.indexOf("$function$", m.index);
      const close = open < 0 ? -1 : src.indexOf("$function$", open + 10);
      if (close < 0) dead(`${f}: public.${name} has no $function$ … $function$ body`);
      hit = { file: f, body: src.slice(open + 10, close) };
    }
  }
  if (!hit) dead(`no migration defines public.${name}`);
  return hit;
}

// Lower-case, comments dropped, whitespace collapsed, and short table aliases (ro., vl., c.) dropped,
// so `vl.g_style` in one function and `c.g_style` in the other read the same.
const norm = (sql) => sql.replace(/--[^\n]*/g, " ").toLowerCase()
  .replace(/\b[a-z][a-z0-9_]{0,2}\.(?=[a-z_])/g, "").replace(/\s+/g, " ");

// Each scoring rule as a pattern that finds it in BOTH functions. A rule must match each body
// (a reworded rule that no longer matches is a FAIL, not a skip) and the matched text must agree.
const RULES = [
  ["the log source", /from rankable_logs\(/],
  ["a Conditions tick is not a climb", /lower\(coalesce\(tick_type, ''\)\) <> '[a-z ]+'/],
  ["rock files as trad", /case when discipline = '[a-z]+' then '[a-z]+' else discipline end as disc/],
  ["Vert's height of a climb", /case when coalesce\(gain_ft, 0\) > 0 then gain_ft when coalesce\(length_m, 0\) > 0 then round\(length_m \* [\d.]+\) else 0 end as climb_ft/],
  ["the tier weights", /case tier when '[a-z]+' then [\d.]+ when '[a-z]+' then [\d.]+ else [\d.]+ end::numeric as w/],
  ["what counts as recent", /\(date_climbed >= current_date - \d+\) as recent/],
  ["the grade scale", /rank_grade\([a-z_, ]+\) as g\b/],
  ["which ticks are not sends", /\(tt not in (\([^)]*\))\) as [a-z_]+/, 1],
  ["first-log order on a route", /row_number\(\) over \(partition by (?:user_id, )?route_id order by ([^)]*)\) as nth_on_route/, 1],
  ["the Top-rope/Follow penalty", /greatest\(0, g - case when tt in \([^)]*\) then [\d.]+ else 0 end\) as g_style/],
  ["the Send-points formula", /\([\d.]+ \+ g_style \* g_style \* [\d.]+\) \* w/],
  ["the Onsight-points formula", /\([\d.]+ \+ g \* g \* [\d.]+\) \* w/],
  ["which ticks are onsights", /tt in \([^)]*\) and nth_on_route = \d+/],
  ["the summit test", /\(tt = '[a-z]+' or summited is true\) and raw_disc in \([^)]*\)/],
];

function check({ lb, rb, ui, boards }) {
  let bad = 0;
  const ok = (m) => console.log("  ok    " + m);
  const fail = (m) => { bad++; console.log("  FAIL  " + m); };
  const L = norm(lb), R = norm(rb);

  // ── 1. the same counting in both functions ──
  const got = {};
  for (const [name, re, grp = 0] of RULES) {
    const a = L.match(re), b = R.match(re);
    if (!a) { fail(`leaderboard(): "${name}" not found — reworded? update RULES with it`); continue; }
    if (!b) { fail(`rank_breakdown(): "${name}" not found — leaderboard() has ${a[0]}`); continue; }
    if (a[grp] !== b[grp]) { fail(`"${name}" differs:\n          leaderboard()   ${a[grp]}\n          rank_breakdown() ${b[grp]}`); continue; }
    got[name] = a[0];
    ok(`${name}: ${a[grp]}`);
  }
  // Onsights are sport, trad and bouldering in both: leaderboard() keys them, rank_breakdown() tests disc.
  const lbOn = /when disc in \('sport', 'trad'\) then array\[disc, 'rock'\] when disc = 'bouldering' then array\['bouldering'\] else array\[\]::text\[\] end\) as k/.test(L);
  const rbOn = /disc in \('sport', 'trad', 'bouldering'\) then \(/.test(R);
  if (lbOn && rbOn) ok("onsights score on sport, trad and bouldering in both");
  else fail(`onsight disciplines: leaderboard() keys sport/trad/bouldering ${lbOn ? "yes" : "NO"}, rank_breakdown() tests sport/trad/bouldering ${rbOn ? "yes" : "NO"}`);
  // Send points: leaderboard() takes each route's BEST log; the sheet does the same from send_pts.
  if (/max\(\(\s*[\d.]+ \+ g_style/.test(L)) ok("leaderboard() scores each sent route once, its best log");
  else fail("leaderboard() no longer takes max(...) per route for Send points — the sheet's bestPer() would not match");

  // ── 2. the sheet's sentences state the SQL's constants ──
  const nums = (s) => (s || "").match(/[\d.]+/g) || [];
  const [sA, sB] = nums(got["the Send-points formula"]).filter((x) => x !== ".");
  const [oA, oB] = nums(got["the Onsight-points formula"]);
  const w = nums(got["the tier weights"]);
  const pen = ((got["the Top-rope/Follow penalty"] || "").match(/then ([\d.]+)/) || [])[1];
  const days = nums(got["what counts as recent"])[0];
  const claims = [
    [`Send points sentence says ${sA} + grade² × ${sB}`, sA && ui.includes(`${sA} + grade² × ${sB}`)],
    [`Onsight points sentence says ${oA} + grade² × ${oB}`, oA && ui.includes(`${oA} + grade² × ${oB}`)],
    [`backing weights ×${w[0]?.replace(/\.0$/, "")} · ×${w[1]} · ×${w[2]} are the ones printed`, w.length === 3 && ui.includes(`×${w[0].replace(/\.0$/, "")}"`) && ui.includes(`×${w[1]}`) && ui.includes(`×${w[2]}`)],
    [`"each letter a quarter" and "one letter lower" match a penalty of ${pen}`, pen === "0.25" && /each letter a quarter/.test(ui) && /one letter lower/.test(ui)],
    [`"12 months" matches recent = ${days} days`, days === "365" && /12 months/.test(ui)],
  ];
  for (const [m, pass] of claims) (pass ? ok : fail)(m);

  // ── 3. the sheet filters as leaderboard() keys ──
  const uiFlat = ui.replace(/\s+/g, "");
  const keyed = /when disc in \('sport', 'trad'\) then array\[disc, 'rock'\] else array\[disc\] end/.test(L);
  if (keyed && uiFlat.includes(`constkeysOf=(d)=>(d==="sport"||d==="trad")?[d,"rock"]:[d];`)) ok("a Climbing type filters the sheet as leaderboard() keys a log (sport and trad also as rock)");
  else fail(`type keys: leaderboard() vkeys ${keyed ? "found" : "MISSING"}; RankBreakdown keysOf must be (d === "sport" || d === "trad") ? [d, "rock"] : [d]`);
  if (/where v = 'all' or tier <> 'self'/.test(L)) {
    if (uiFlat.includes(`!backedOnly||r.tier!=="self"`)) ok("Backed climbs only drops the self tier in both");
    else fail("RankBreakdown no longer filters backedOnly by r.tier !== \"self\"");
  } else fail("leaderboard()'s backed set is no longer tier <> 'self'");

  // ── 4. the boards leaderboard() ranks are the boards the tab offers ──
  const Lc = lb.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ");  // case kept: board ids are camelCase
  const valuesOf = (re) => { const m = Lc.match(re); return m ? [...m[1].matchAll(/\('([a-z_]+)'\)/gi)].map((x) => x[1]) : null; };
  const sqlDiscs = valuesOf(/cross join \(values ((?:\('[a-z]+'\),? ?)+)\) as d\(disc\)/);
  const sqlBoards = valuesOf(/cross join \(values ((?:\('[a-z_]+'\),? ?)+)\) as b\(board\)/i);
  if (!sqlDiscs || !sqlBoards) fail("leaderboard()'s metric CTE (d(disc), b(board)) not found");
  else {
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    if (same(sqlDiscs, boards.discs)) ok(`Climbing types agree (${sqlDiscs.length})`);
    else fail(`Climbing types: leaderboard() ranks [${sqlDiscs}] but the tab offers [${boards.discs}]`);
    // Boards ranked only on the server, each with why that is harmless; any other difference fails.
    const SERVER_ONLY = { catches: "the Belay board left the app 2026-11-05 (#3202); a climber in its top 100 comes back with true values and ranks below each board's own top 100" };
    const missing = boards.ids.filter((x) => !sqlBoards.includes(x));
    const extra = sqlBoards.filter((x) => !boards.ids.includes(x) && !SERVER_ONLY[x]);
    if (!missing.length && !extra.length) ok(`boards agree (${boards.ids.length}${Object.keys(SERVER_ONLY).length ? "; server-only: " + Object.keys(SERVER_ONLY).join(", ") : ""})`);
    else fail(`boards: on screen but not ranked by leaderboard() [${missing}] (its top 100 would be wrong); ranked but not on screen [${extra}]`);
  }
  return bad;
}

// The tab's boards (B ids with a val; Top climbs lists routes) and Climbing types (DISCS).
function readBoards(src) {
  const bStart = src.indexOf("const B={");
  if (bStart < 0) dead("lib/Leaderboards.jsx: const B={ not found");
  const bEnd = src.indexOf("\n  };", bStart);
  const bSrc = src.slice(bStart, bEnd);
  const ids = [...bSrc.matchAll(/([a-zA-Z_]+):\{id:"\1"/g)].filter((m) => !/^[^{}]*routes:true/.test(bSrc.slice(m.index + m[0].length))).map((m) => m[1]);
  const dm = src.match(/const DISCS=\[((?:\["[a-z]+",[^\]]+\],?)+)\]/);
  if (!dm) dead("lib/Leaderboards.jsx: const DISCS=[…] not found");
  const discs = [...dm[1].matchAll(/\["([a-z]+)",/g)].map((m) => m[1]);
  if (ids.length < 8 || discs.length < 8) dead(`lib/Leaderboards.jsx read short (${ids.length} boards, ${discs.length} types)`);
  return { ids, discs };
}

const lbDef = latestBody("leaderboard"), rbDef = latestBody("rank_breakdown");
const uiSrc = fs.readFileSync(path.join(ROOT, "lib", "RankBreakdown.jsx"), "utf8");
const boards = readBoards(fs.readFileSync(path.join(ROOT, "lib", "Leaderboards.jsx"), "utf8"));
const input = { lb: lbDef.body, rb: rbDef.body, ui: uiSrc, boards };

if (process.argv.includes("--selftest")) {
  { const log = console.log; console.log = () => {}; const b0 = check(input); console.log = log; if (b0) dead(`selftest: the tree itself fails ${b0} rule(s); fix that first`); }
  // Each mutation breaks one rule on one side; the guard must fail on every one.
  const muts = [
    ["Send points constant changed in leaderboard() only", { lb: input.lb.replace(/g_style \* (\w+\.)?g_style \* 0\.35/g, (s) => s.replace("0.35", "0.4")) }],
    ["tier weight changed in rank_breakdown() only", { rb: input.rb.replace("'evidence' then 0.75", "'evidence' then 0.8") }],
    ["a not-sent tick added to leaderboard() only", { lb: input.lb.replace("'hung', 'project')", "'hung', 'project', 'dog')") }],
    ["summit test narrowed in rank_breakdown() only", { rb: input.rb.replace(/or c\.summited is true/, "or false") }],
    ["onsight formula changed in rank_breakdown() only", { rb: input.rb.replace("c.g * c.g * 0.3", "c.g * c.g * 0.25") }],
    ["recent window changed in leaderboard() only", { lb: input.lb.replace("current_date - 365", "current_date - 366") }],
    ["sheet sentence states a stale constant", { ui: input.ui.replace("8 + grade² × 0.35", "8 + grade² × 0.3") }],
    ["sheet keys types differently", { ui: input.ui.replace(`(d === "sport" || d === "trad") ? [d, "rock"] : [d]`, `[d]`) }],
    ["a board added to the tab only", { boards: { ...boards, ids: [...boards.ids, "streak"] } }],
    ["a Climbing type added to the tab only", { boards: { ...boards, discs: [...boards.discs, "speed"] } }],
  ];
  let missed = 0;
  for (const [name, m] of muts) {
    const t = { ...input, ...m };
    const changed = Object.keys(m).some((k) => JSON.stringify(t[k]) !== JSON.stringify(input[k]));
    if (!changed) { console.log(`  FAIL  selftest "${name}": the mutation did not land`); missed++; continue; }
    const log = console.log; console.log = () => {};
    const b = check(t);
    console.log = log;
    if (b > 0) console.log(`  ok    selftest "${name}" fails the guard (${b})`);
    else { console.log(`  FAIL  selftest "${name}" passed the guard`); missed++; }
  }
  console.log(missed ? `\ncheck:rank-breakdown --selftest: ${missed} mutation(s) not caught.` : `\ncheck:rank-breakdown --selftest: all ${muts.length} mutations caught.`);
  process.exit(missed ? 1 : 0);
}

console.log(`\ncheck:rank-breakdown — the climbs behind a Ranks number add up to it\n  leaderboard() from ${lbDef.file}, rank_breakdown() from ${rbDef.file}\n`);
const bad = check(input);
console.log(bad ? `\ncheck:rank-breakdown: ${bad} problem(s).` : "\ncheck:rank-breakdown: leaderboard() and rank_breakdown() count the same way, and the sheet says so.");
process.exit(bad ? 1 : 0);
