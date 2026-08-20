// Working language on screen: the SAME needles, against every column instead of seven.
//
// #1188 measured 7 climber-facing prose columns and reported "0 of 7". That is honest and it is
// not the class closed: `routes` has 94 columns, and most of this catalog's prose lives in JSONB
// (`road`, `access`, `pitch_detail`, `bivy`, `approach_logistics`, `climate`, ...) which that
// scan did not read at all -- it handled a string or an array of strings and nothing nested.
// "When an audit reports ZERO, ask its denominator" is a rule this repo already pays for.
//
// So: every column, string LEAVES walked inside jsonb, same six needles unchanged.
//
// TWO SCOPING RULES, both of which keep this from manufacturing findings:
//
//  1. A hit is only a defect IF THE COLUMN RENDERS. `data_quality.gaps` is provenance BY DESIGN
//     (89% of it is one boilerplate sentence) and the two page-level graders that used to print
//     it were deleted -- so prose there is not on anybody's screen. Columns are split into
//     RENDERS / NOT-RENDERED accordingly, and only the first group is a finding.
//  2. Two areas are ALREADY KNOWN and are reported separately rather than re-counted:
//     waypoint notes that name a source (recorded as welded to their content, unsweepable) and
//     the road/access citations swept by #1189.
//
// Read-only. Reports; changes nothing.
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";

const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") { console.error(`DB not answering (${health.err}) -- nothing measured.`); process.exit(1); }
console.log(`db: ${health.ms}ms\n`);

// Columns that carry prose a climber can read. Numeric/structural columns are excluded because a
// needle cannot fire on them; gpx/elev_pts are coordinate arrays.
const SKIP = new Set([
  "id", "area_id", "grade_num", "pitches", "length_m", "sort_order", "stars", "lat", "lng",
  "gain_ft", "loss_ft", "dist_km", "max_angle", "high_point_ft", "auto_generated", "classic",
  "gpx", "elev_pts", "rope_length_m", "alpine_draws", "pads", "grade_system", "sling_rack",
]);

// Columns whose prose reaches no screen today. A hit here is bookkeeping, not a defect.
const NOT_RENDERED = new Map([
  ["data_quality", "provenance by design; both page-level graders that printed it were deleted"],
  ["corrections", "internal contribution ledger, not a rendered column"],
  ["verif", "the rendered `source` field was removed; check:no-rendered-sources holds it at zero"],
  ["lists", "tick-list membership keys, not prose"],
  ["disciplines", "discipline keys"],
  ["gear_bucket", "internal classification key"],
  ["outing_shape", "internal classification key"],
  ["gps_contributor_name", "attribution, deliberately"],
]);

// Already-known, already-recorded areas. Counted and reported apart so they cannot inflate a
// "new findings" number.
const KNOWN_AREAS = new Map([
  ["waypoints", "waypoint notes naming a source: recorded as welded to their content, unsweepable"],
  ["road", "road/access source citations were swept by #1189"],
  ["access", "road/access source citations were swept by #1189"],
]);

const NEEDLES = [
  ["repo path", /research-data\/|scripts\/|\.mjs\b|\.sql\b/i],
  // "be verified" came out: it fired on "the depth of ice available for screws should be verified
  // on the day rather than assumed" -- ordinary, good climbing advice. It had never contributed a
  // true hit; the real ones all say "should be dropped" / "should not be presented".
  ["addressed to a maintainer", /should (?:not be presented|be dropped|be removed)|do not present|needs? (?:a )?(?:re-?)?triage/i],
  ["provenance verdict", /not supported by any source|unsupported (?:by|for)|no source is cited|misattributed|appears to describe a different/i],
  ["pipeline vocabulary", /\benrichment\b|\bthe row\b|\bthis column\b|\bdb row\b|rappel_detail|descent_text\b|gear list specifies/i],
  ["changelog voice", /\b20\d\d-\d\d-\d\d\b|was removed \d{4}|as of this (?:pass|batch)/i],
  ["stated-in-source hedge", /not stated in (?:the )?source|estimated as a typical|exact length not stated/i],
  // CHANGELOG ABOUT THE DATA -- and the object test is what makes it usable. A first draft
  // matched "has been removed" and reported 29 bivy notes saying "the footlog over Barclay Creek
  // has been removed for safety", plus "a bypass has since been built" and "the line has since
  // been freed": all true things about the WORLD, and all correct writing. Every phrase below is
  // only ever written about the record itself.
  // `previously published` is excluded after a negation: "they knew of no previously published
  // complete west-to-east crossing" is a first-ascent claim about the LITERATURE, not about this
  // record. Test the object -- the same correction this needle set has now needed three times.
  // A RECORD DESCRIBING ITS OWN HISTORY. Found on the live app, not by a needle: "The on-file text
  // used to group this route with the Nooksack and Ruth Creek side of the mountain." Subject-
  // anchored, because "the trail used to cross here" and "the road no longer reaches the gate"
  // are facts about the WORLD and correct writing -- only a sentence whose SUBJECT is the record
  // qualifies.
  ["record describing its own history", /(?:on-file text|this (?:page|entry|record)|the (?:record|description|stored text))\s+(?:used to|no longer|previously)\b|\bused to (?:be )?(?:say|read|list|name|group|state)\b/i],
  ["changelog about the data", /\bpreviously (?:listed|claimed|stored)\b|(?<!knew of no )(?<!no )\bpreviously published\b|rename is pending|prose has been corrected|removed as unsupported|were not sourced/i],
];

// String leaves of a jsonb value. NEVER JSON.stringify -- audit:access-prose records that
// splitting stringified json produces fragments nobody wrote (`gated until May.","summer":"Warm`).
function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}

const probe = await fetch(`${U}/rest/v1/routes?select=*&limit=3`, { headers: H });
const COLS = Object.keys((await probe.json())[0]).filter((c) => !SKIP.has(c));

const findings = [];   // renders, and not a known area
const known = [];
const suppressed = [];

for (const col of COLS) {
  let rows;
  try {
    const r = await fetch(`${U}/rest/v1/routes?select=id,${col}&${col}=not.is.null&limit=10000`,
      { headers: H, signal: AbortSignal.timeout(30000) });
    if (!r.ok) { console.log(`${col.padEnd(22)} READ FAILED (${r.status})`); continue; }
    rows = await r.json();
  } catch (e) { console.log(`${col.padEnd(22)} READ FAILED (${String(e.message || e)})`); continue; }

  let n = 0;
  for (const x of rows) {
    for (const s of leaves(x[col])) {
      let m = null, name = null;
      for (const [nm, re] of NEEDLES) { const g = s.match(re); if (g) { m = g; name = nm; break; } }
      if (!m) continue;
      n++;
      const at = s.indexOf(m[0]);
      const rec = { id: x.id, col, needle: name, sample: s.slice(Math.max(0, at - 70), at + 100).replace(/\s+/g, " ") };
      if (NOT_RENDERED.has(col)) suppressed.push(rec);
      else if (KNOWN_AREAS.has(col)) known.push(rec);
      else findings.push(rec);
      break;
    }
  }
  const tag = NOT_RENDERED.has(col) ? "  (not rendered)" : KNOWN_AREAS.has(col) ? "  (known area)" : "";
  if (rows.length) console.log(`${col.padEnd(22)} ${String(rows.length).padStart(5)} populated · ${String(n).padStart(4)} hits${tag}`);
}

const uniq = (a) => new Set(a.map((x) => x.id)).size;
console.log(`\n${"=".repeat(72)}`);
console.log(`NEW FINDINGS (a rendered column):        ${findings.length} passages on ${uniq(findings)} routes`);
console.log(`known areas (reported, not re-counted):  ${known.length} passages on ${uniq(known)} routes`);
console.log(`suppressed (column reaches no screen):   ${suppressed.length} passages on ${uniq(suppressed)} routes`);
console.log("=".repeat(72) + "\n");

const byCol = new Map();
for (const f of findings) { if (!byCol.has(f.col)) byCol.set(f.col, []); byCol.get(f.col).push(f); }
for (const [col, list] of [...byCol].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`### ${col} — ${list.length}`);
  for (const f of list.slice(0, 6)) console.log(`   ${f.id} [${f.needle}]\n     …${f.sample}…`);
  if (list.length > 6) console.log(`   … ${list.length - 6} more`);
  console.log("");
}

if (!findings.length) console.log("No rendered column outside the seven already swept carries working language.");
console.log("Report only. Each hit needs a read: the fix is to rewrite for a climber, not to delete.");
