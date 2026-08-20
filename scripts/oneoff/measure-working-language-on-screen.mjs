// Internal working language rendering to climbers.
//
// `rappel_count_note` is a CLIMBER-FACING note above the rappel table. I put a dated changelog
// with a repo path into one (fixed), and noticed the neighbouring row already carried review
// prose of its own -- "...is not supported by any source specific to this Washington peak and
// should not be presented as fact". That is written to a maintainer, on a screen.
//
// This measures the class. The needles are deliberately NARROW: this repo records repeatedly
// that a detector which flags correct work teaches people to ignore it, and climbing prose
// legitimately says things like "sources vary on the length". So each needle is a phrase that
// is only ever written ABOUT the data, never about the climb.
//
// Read-only. Reports; changes nothing.
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") { console.error(`DB not answering (${health.err}) — nothing measured.`); process.exit(1); }
console.log(`db: ${health.ms}ms\n`);

// Columns that RENDER as prose to a climber.
const COLS = ["rappel_count_note", "rappels", "descent_text", "beta", "overview", "watch_out", "best_season"];

const NEEDLES = [
  ["repo path", /research-data\/|scripts\/|\.mjs\b|\.sql\b/i],
  ["addressed to a maintainer", /should (?:not be presented|be dropped|be removed|be verified)|do not present|needs? (?:a )?(?:re-?)?triage/i],
  ["provenance verdict", /not supported by any source|unsupported (?:by|for)|no source is cited|misattributed|appears to describe a different/i],
  ["pipeline vocabulary", /\benrichment\b|\bthe row\b|\bthis column\b|\bdb row\b|rappel_detail|descent_text\b|gear list specifies/i],
  ["changelog voice", /\b20\d\d-\d\d-\d\d\b|was removed \d{4}|as of this (?:pass|batch)/i],
  ["stated-in-source hedge", /not stated in (?:the )?source|estimated as a typical|exact length not stated/i],
];

const hits = new Map(); // id -> [{col, needle, sample}]
for (const col of COLS) {
  const r = await fetch(`${U}/rest/v1/routes?select=id,${col}&${col}=not.is.null&limit=10000`,
    { headers: H, signal: AbortSignal.timeout(25000) }).catch((e) => ({ ok: false, status: String(e.message || e) }));
  if (!r.ok) { console.log(`${col.padEnd(18)} READ FAILED (${r.status})`); continue; }
  const rows = await r.json();
  let n = 0;
  for (const x of rows) {
    const v = x[col];
    const s = typeof v === "string" ? v : Array.isArray(v) ? v.filter((q) => typeof q === "string").join(" ") : "";
    if (!s) continue;
    for (const [name, re] of NEEDLES) {
      const m = s.match(re);
      if (m) {
        n++;
        if (!hits.has(x.id)) hits.set(x.id, []);
        hits.get(x.id).push({ col, needle: name, sample: s.slice(Math.max(0, s.indexOf(m[0]) - 60), s.indexOf(m[0]) + 90) });
        break;
      }
    }
  }
  console.log(`${col.padEnd(18)} ${String(rows.length).padStart(5)} populated · ${String(n).padStart(4)} carrying working language`);
}

console.log(`\n${hits.size} distinct route(s) render at least one such passage.\n`);
let shown = 0;
for (const [id, list] of hits) {
  if (shown++ >= 12) { console.log(`… ${hits.size - 12} more`); break; }
  console.log(`### ${id}`);
  for (const h of list.slice(0, 2)) console.log(`   [${h.col} · ${h.needle}] …${h.sample.replace(/\s+/g, " ")}…`);
}
console.log("\nReport only. Each needs a read: the fix is to rewrite for a climber, not to delete.");
