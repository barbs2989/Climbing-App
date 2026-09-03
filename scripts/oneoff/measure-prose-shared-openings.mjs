#!/usr/bin/env node
// TWO PROSE COLUMNS THAT START THE SAME WAY, both rendered on one tab.
//
// From the route-page duplication census: wa_a_servant_to_liberty's Overview carries
//   overview: "Also published as 'A Slave to Liberty' (450m, Grade V, 5.13-). Climbs the first
//              three pitches of Freedom or Death (5.10, 5.11, 5.11), then breaks right to join…"
//   beta:     "Climbs the first three pitches of Freedom or Death (5.10, 5.11, 5.11), then a
//              right-leaning overlap (P4, 5.12-) into a traverse with layback flakes…"
// — the same 60+ characters, then they diverge. It is NOT the timing/itinerary shape (one value
// copied whole, #1514) and NOT containment (neither contains the other), so the two fixes already
// shipped do not touch it.
//
// THIS ONLY MEASURES. Whether a shared opening is a defect is a judgement about prose: a route
// whose beta legitimately restates the line before elaborating is not the same as an enrichment
// pass that pasted the same clause into two columns. So it prints the shared text and the point
// where the two diverge, and says outright that reading decides it.
import { selectAll } from "../lib/supabase-env.mjs";

/* `desc` was in this list and DOES NOT EXIST (42703) — it is the seed shape, not a column. The
   query fails closed on it rather than silently returning fewer columns, which is the useful
   direction. */
const COLS = ["overview", "beta", "watch_out", "best_season", "approach", "descent_text", "hazards"];
const rows = await selectAll("routes", "id," + COLS.join(","), "overview=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const text = (v) => {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(" ").trim();
  return "";
};
// The unit is a shared OPENING, not a shared word: 60 characters is roughly a clause, and two
// independently-written paragraphs do not open with the same clause by chance.
const MIN = Number(process.env.MIN || 60);
let pairs = 0, routesHit = 0;
const byPair = new Map();
const examples = [];

for (const r of rows) {
  let hit = false;
  for (let i = 0; i < COLS.length; i++) {
    for (let j = i + 1; j < COLS.length; j++) {
      const a = text(r[COLS[i]]), b = text(r[COLS[j]]);
      if (a.length < MIN || b.length < MIN) continue;
      if (a === b) continue;                    // whole-value duplication is a different class
      if (a.includes(b) || b.includes(a)) continue;  // containment, also different
      // longest common prefix
      let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
      if (k < MIN) continue;
      pairs++; hit = true;
      const key = COLS[i] + "+" + COLS[j];
      byPair.set(key, (byPair.get(key) || 0) + 1);
      if (examples.length < 4) examples.push([r.id, key, k, a.slice(0, k)]);
    }
  }
  if (hit) routesHit++;
}
console.log(`routes read: ${rows.length}`);
console.log(`routes where two prose columns share an opening of >= ${MIN} chars: ${routesHit}`);
console.log(`column pairs involved: ${pairs}`);
for (const [k, n] of [...byPair].sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${n}`);
for (const [id, key, k, shared] of examples) {
  console.log(`\n### ${id}  [${key}]  shared opening ${k} chars`);
  console.log(`    ${JSON.stringify(shared.slice(0, 150))}`);
}
console.log("\nA SHARED OPENING IS NOT AUTOMATICALLY A DEFECT: a beta that restates the line before");
console.log("elaborating reads fine. Read the pair before changing either.");
