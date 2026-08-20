// Does seasonShort() give every approach variant a REAL window, or does some fraction land on
// its last-resort truncation and read as nonsense?
//
// Shortening the pill was half the fix; this asks whether what is left is any good. seasonShort
// is a fallback chain and only the first two rungs produce something a climber can read:
//
//   1. already <= 30 chars        -> shown as-is                      GOOD
//   2. month-range regex matches  -> "April to late June"             GOOD
//   3. cut at the first ; . or (  -> "Highly conditions-dependent"    depends
//   4. hard truncate at 29 + ...  -> "Once the Inspiration Gla..."    BAD
//
// Rung 4 is the one worth finding: it cuts mid-phrase and the pill then says nothing true.
//
// Imports the REAL seasonShort rather than reimplementing it — a copy agrees with the source the
// day it is written and measures a fossil afterwards. Bundled via esbuild because RouteDetail is
// JSX; the ANCHOR is the export itself, so a rename fails loudly instead of silently measuring
// a different function.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `export { seasonShort } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-season-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { seasonShort } = require_(out);
if (typeof seasonShort !== "function") {
  console.log("ANCHOR LOST: RouteDetail.jsx no longer exports seasonShort — nothing was measured.");
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach_variants&approach_variants=not.is.null&limit=1000`, { headers: headers(anonKey()) });
if (!res.ok) { console.log(`FAIL: read failed (${res.status}) — NOT "every window is fine"`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.log("FAIL: read no routes with approach_variants"); process.exit(1); }

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
const buckets = { unchanged: [], window: [], clause: [], truncated: [] };
let total = 0;
for (const r of rows) {
  for (const v of (Array.isArray(r.approach_variants) ? r.approach_variants : [])) {
    const full = norm(v && v.season);
    if (!full) continue;
    total++;
    // 48, not the default 30: that is what the APPROACHES pill passes, and an audit that used
    // the default would be measuring the header strap while claiming to describe this panel.
    const short = seasonShort(full, 48);
    const rec = { id: r.id, name: norm(v.name).slice(0, 40), full, short };
    // Classified from the OUTPUT, so it cannot drift from the implementation's internals.
    if (short === full) buckets.unchanged.push(rec);
    else if (short.endsWith("…")) buckets.truncated.push(rec);
    // A month word plus a range separator is the shape rung 2 produces. Checked on the OUTPUT
    // rather than by re-running the regex, which would just be the copy trap again.
    else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(short) && /[-–—]|to|through|thru/i.test(short)) buckets.window.push(rec);
    else buckets.clause.push(rec);
  }
}

const pc = (n) => `${n} (${Math.round(n / total * 100)}%)`;
console.log(`${rows.length} routes, ${total} variants carrying a season\n`);
console.log(`   already short, shown as-is : ${pc(buckets.unchanged.length)}`);
console.log(`   real month window          : ${pc(buckets.window.length)}`);
console.log(`   first clause               : ${pc(buckets.clause.length)}`);
console.log(`   HARD TRUNCATION (rung 4)   : ${pc(buckets.truncated.length)}   <- the ones that read as nonsense`);

// WHY do the truncated ones truncate? Three different causes want three different fixes, and
// lumping them together would send a sweep at the wrong one.
//
//   short enough anyway : the full text is under a pill's real budget. seasonShort's 30-char
//                         limit was tuned for the HEADER STRAP, where the season sits beside
//                         elevation and pitch count. The approach pill owns its own row and can
//                         hold more, so these are truncated for no reason at all.
//   season-word range   : "August to autumn", "Spring to autumn" — a real window whose ends are
//                         SEASONS rather than months, so the month-only regex cannot see it.
//   genuinely long      : prose that needs a window written by hand, or left to the card.
const SEASON_WORD = "(?:spring|summer|autumn|fall|winter)";
const MONTHISH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const WORD_RANGE = new RegExp(
  "(?:early |mid[- ]|late )?(?:" + SEASON_WORD + "|" + MONTHISH + ")\\s*(?:[-\u2013\u2014]|to|through|thru|into)\\s*(?:early |mid[- ]|late )?(?:" + SEASON_WORD + "|" + MONTHISH + ")", "i");

const BUDGET = 48; // what check:token-boxes still counts as a token, not a paragraph
const causes = { budget: [], seasonWords: [], genuinelyLong: [] };
for (const r of buckets.truncated) {
  if (r.full.length <= BUDGET) causes.budget.push(r);
  else if (WORD_RANGE.test(r.full)) causes.seasonWords.push(r);
  else causes.genuinelyLong.push(r);
}
const t = buckets.truncated.length || 1;
console.log(`\n== WHY the ${buckets.truncated.length} truncate`);
console.log(`   full text already fits ${BUDGET} chars : ${causes.budget.length} (${Math.round(causes.budget.length / t * 100)}%)  <- truncated for no reason`);
console.log(`   window uses SEASON words, not months : ${causes.seasonWords.length} (${Math.round(causes.seasonWords.length / t * 100)}%)  <- regex cannot see it`);
console.log(`   genuinely long prose                 : ${causes.genuinelyLong.length} (${Math.round(causes.genuinelyLong.length / t * 100)}%)`);
for (const [lbl, list] of [["fits already", causes.budget], ["season-word range", causes.seasonWords], ["genuinely long", causes.genuinelyLong]]) {
  console.log(`   -- ${lbl}:`);
  list.slice(0, 4).forEach((r) => console.log(`      ${JSON.stringify(r.full.slice(0, 100))}`));
}

for (const [label, list, n] of [["HARD TRUNCATION", buckets.truncated, 20], ["FIRST CLAUSE — read these, some are fine", buckets.clause, 12]]) {
  if (!list.length) continue;
  console.log(`\n== ${label}`);
  list.slice(0, n).forEach((r) => {
    console.log(`   ${r.id}  ${JSON.stringify(r.name)}`);
    console.log(`      pill: ${JSON.stringify(r.short)}`);
    console.log(`      full: ${JSON.stringify(r.full.slice(0, 130))}`);
  });
  if (list.length > n) console.log(`   ... and ${list.length - n} more (not listed)`);
}

fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log("\nThe full sentence renders as prose in the card either way, so nothing is LOST here —");
console.log("the question is only whether the pill itself says something true at a glance.");
