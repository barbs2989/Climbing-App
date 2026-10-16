#!/usr/bin/env node
// Print the next N unpitched routes that still need a climbing_route, ranked by how much
// climbing description their approach text is carrying.
//
// This is the driver for the sweep audit:approach-scope measures. It is deliberately a
// separate script from the audit: the audit REPORTS (and is meant to be read by a human),
// this one emits a worklist (and is meant to be piped into a batch). Keeping them separate
// stops the audit growing flags that only a pipeline cares about.
//
// A route already carrying climbing_route is excluded, so re-running after a batch lands
// yields the next slice rather than the same one. A route whose text genuinely has no
// climbing description will keep appearing — that is correct. It is a gap in the data, and
// the honest response is to leave it visible rather than fill it in from imagination.
//
// Usage: node scripts/next-climbing-route-batch.mjs [N] [--state wa] [--ids]

import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const N = parseInt(args.find(a => /^\d+$/.test(a)) || "24", 10);
const IDS_ONLY = args.includes("--ids");
const stateI = args.indexOf("--state");
const STATE = stateI >= 0 && args[stateI + 1] ? args[stateI + 1] : "wa";

const STRONG = [/\bbelay(?:s|ed|ing)?\b/i, /\bpitch(?:es)?\b/i, /\brappel|\brap\b/i, /\bcrux\b/i, /\bsummit block\b/i, /\b5\.\d+[a-d]?\b/];
const WEAK = [/\bclass\s*[45]\b/i, /\bexposed\b/i, /\bscrambl/i, /\bdownclimb/i, /\bgendarme/i, /\bknife-?edge\b/i, /\bto the (?:true )?summit\b/i];
const UNPITCHED = new Set(["mountaineering", "scrambling", "hiking", "scramble", "hike", "glacier", "snow"]);

const rows = await selectAll("routes", "id,name,discipline,pitches,approach,climbing_route", "", { pageSize: 1000 })
  .catch(e => { console.error("read failed:", e.message); process.exit(1); });
if (!rows.length) { console.error("FAIL — read 0 routes; refusing to emit an empty worklist as if it were done."); process.exit(1); }

const out = [];
for (const r of rows) {
  if (!String(r.id).startsWith(STATE + "_")) continue;
  if (Array.isArray(r.climbing_route) && r.climbing_route.length) continue;
  if (!(UNPITCHED.has(String(r.discipline || "")) || !r.pitches)) continue;
  const a = String(r.approach || ""); if (a.length < 120) continue;
  const ss = a.split(/(?<=[.!?])\s+(?=[A-Z(])/).filter(Boolean);
  let score = 0, flagged = 0;
  for (const s of ss) {
    const st = STRONG.filter(re => re.test(s)).length, wk = WEAK.filter(re => re.test(s)).length;
    if (st >= 1 || wk >= 2) { flagged++; score += st * 2 + wk; }
  }
  if (!flagged) continue;
  out.push({ id: r.id, name: r.name, disc: r.discipline, score });
}
out.sort((a, b) => b.score - a.score);
const slice = out.slice(0, N);
if (IDS_ONLY) console.log(slice.map(x => x.id).join(" "));
else slice.forEach(x => console.log(`${x.id}\t${x.name}\t${x.disc}\t${x.score}`));
console.error(`# ${out.length} remaining candidates in "${STATE}" without climbing_route`);
