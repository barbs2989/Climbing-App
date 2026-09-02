// What is actually LEFT in `audit:prose-citations`, grouped by the token that triggered it.
//
// The audit prints a reading list. This says what KIND of reading list it is, which is the
// difference between "500 values, budget fifteen batches" and "46% of it is one word". Run it
// before starting a batch; the composition has changed with every sweep.
//
// TWO RULES THIS SCRIPT EXISTS TO ENFORCE ON ITSELF, both learned by getting them wrong:
//
//   1. IMPORT THE AUDIT'S NEEDLE, NEVER RE-IMPLEMENT IT. A first version of this measurement
//      wrote its own publisher regex, disagreed with the audit, and I read the disagreement as
//      an audit defect - "10 values are the English word 'mountaineers', not the club". The
//      audit does not flag those and never did; my regex was missing the token that actually
//      fired (`guidebook`, `Wikipedia`, `Peakbagger`) and blamed the nearest word it recognised.
//      A second classifier disagreeing with a guard is far more likely to be the second
//      classifier. `NAMED` is lifted from the audit source with ANCHOR LOST.
//
//   2. SCOPE TO THE (route, column) PAIRS THE AUDIT NAMED, NOT THEIR CROSS PRODUCT. The same
//      first version collected the flagged routes and the flagged columns and then fetched every
//      column for every route - so it scanned `wa_south_ridge.approach` because some OTHER route
//      had `approach` flagged. That inflated the corpus and produced a confident 62-value finding
//      that was worth 4. A cartesian join is silent: every number it emits looks like a number.
//
// Read-only, anon key, fails closed on an empty read.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.join(HERE, "..", "audit-prose-citations.mjs");

const src = fs.readFileSync(AUDIT, "utf8");
const m = src.match(/const NAMED = (\/.*\/[a-z]*);/);
if (!m) {
  console.error("ANCHOR LOST: `const NAMED = /.../` is no longer in scripts/audit-prose-citations.mjs.");
  console.error("Re-anchor rather than re-typing the pattern - a copy would agree with itself whatever the audit does.");
  process.exit(1);
}
const NAMED = eval(m[1]);

// The audit BLANKS the common-noun forms of "peakbagger" before matching, because the site is
// capitalised and singular while the word for a kind of climber is neither. Lifting NAMED and
// not this would make the map over-report by exactly those 15 values - a second classifier
// silently disagreeing with the guard, which is the failure this file's header is about. So it
// is anchored too, and its absence is fatal rather than a quiet drift back to the old counts.
const cm = src.match(/const COMMON_NOUN = (\/.*\/[a-z]*);/);
if (!cm) {
  console.error("ANCHOR LOST: `const COMMON_NOUN = /.../` is no longer in scripts/audit-prose-citations.mjs.");
  console.error("Without it this map counts the common noun 'peakbagger' as a citation and disagrees with the audit.");
  process.exit(1);
}
const COMMON_NOUN = eval(cm[1]);
const deCommonNoun = (t) => t.replace(COMMON_NOUN, (x) => "x".repeat(x.length));

// Feed it the audit's own --full output:  npm run audit:prose-citations -- --full > cites.txt
const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error("usage: node scripts/oneoff/map-remaining-citations.mjs <audit --full output>");
  console.error("  npm run audit:prose-citations -- --full > /tmp/cites.txt");
  process.exit(1);
}
const lines = fs.readFileSync(dumpPath, "utf8").split("\n");
const wanted = new Map();
let rt = null;
let col = null;
for (const l of lines) {
  const x = l.match(/^   ([a-z0-9_]+)  ([a-z_]+)/);
  if (x) { rt = x[1]; col = x[2]; continue; }
  if (rt && /^ {6}…/.test(l)) {
    if (!wanted.has(rt)) wanted.set(rt, new Set());
    wanted.get(rt).add(col);
    rt = null;
  }
}
if (wanted.size < 10) {
  console.error(`parsed only ${wanted.size} route(s) from the dump - the audit's output format moved, or this is not that file`);
  process.exit(1);
}

const ids = [...wanted.keys()];
const cols = [...new Set([...wanted.values()].flatMap((s) => [...s]))];
const rows = [];
for (let i = 0; i < ids.length; i += 40) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.slice(i, i + 40).join(",")})&select=id,${cols.join(",")}`,
    { headers: headers(anonKey()) },
  );
  if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
  rows.push(...(await r.json()));
}
if (!rows.length) { console.error("empty read - refusing (a clean map and a dead database look identical)"); process.exit(1); }

function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

const buckets = {};
let tot = 0;
for (const row of rows) {
  for (const c of wanted.get(row.id) || []) {   // ONLY the columns the audit named for THIS route
    for (const s of leaves(row[c])) {
      const hit = deCommonNoun(s).match(NAMED);
      if (!hit) continue;
      tot++;
      const k = hit[0].toLowerCase().replace(/\s+/g, " ");
      (buckets[k] ||= []).push([row.id, c, s]);
    }
  }
}
if (!tot) { console.error("matched nothing - the needle or the dump is wrong, not the catalog"); process.exit(1); }

console.log(`leaves matched by the audit's own needle, within the columns it named: ${tot}\n`);
for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1].length - a[1].length)) {
  console.log(String(v.length).padStart(4) + "  " + k);
}

// The `guidebook` family is the biggest and it is NOT one shape. Some of it is the catalog
// honestly recording that no guidebook covers a route, and some is a disagreement between the
// book and current conditions. CLAUDE.md is explicit that a recorded negative is EVIDENCE and
// writing over one is fabrication - so this split is printed rather than left to be discovered
// by whoever sweeps it.
const gb = [...(buckets["guidebook"] || []), ...(buckets["guidebooks"] || [])];
if (gb.length) {
  const NEG = /\b(no|not|never|lack(?:s|ing)?|absent|without|beyond|older)\b[^.;]{0,60}\bguidebooks?\b|\bguidebooks?\b[^.;]{0,50}\b(do(?:es)? not|none|nothing|could not be|were not|was not|no |mis-locates?|wrong)/i;
  let neg = 0;
  const N = [];
  for (const [id, c, s] of gb) {
    const sent = s.split(/(?<=[.;])\s+/).find((x) => /guidebooks?/i.test(x)) || s;
    if (NEG.test(sent)) { neg++; if (N.length < 10) N.push([id, c, sent.trim()]); }
  }
  console.log(`\nof the ${gb.length} guidebook hits, roughly ${neg} are a NEGATIVE or a DISAGREEMENT`);
  console.log("  (no guidebook covers this / conditions have moved beyond what the book says).");
  console.log("  DO NOT SWEEP THESE. The absence, or the disagreement, is the content:");
  console.log("  wa_mount_anderson_eel_glacier says across five values that glacier recession has");
  console.log("  steepened Flypaper Pass to 40-45 degrees, 'well beyond older guidebook descriptions'.");
  console.log("  Cut the attribution there and the reader loses the warning that the book says 30.");
  for (const [id, c, x] of N) console.log(`\n  ${id} ${c}\n    ${x.slice(0, 170)}`);
}
