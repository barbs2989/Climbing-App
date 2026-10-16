// The notes are only ~54% of the panel's text, so collapsing them alone would halve a panel
// that is still too long. This asks what the OTHER half is: the chip fields. A chip is a
// glanceable token at 12 characters and a paragraph wearing a pill at 120, and the difference
// decides whether the summary line can carry `water` and `permit` verbatim or must reduce them
// to yes/no.
//
// Read-only. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const sites = rows.flatMap(r => (Array.isArray(r.bivy) ? r.bivy : []));
if (!sites.length) { console.log("FAIL: read no bivy sites"); process.exit(1); }

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

console.log(`${sites.length} sites\n`);
for (const f of ["name", "capacity", "water", "permit", "type"]) {
  const present = sites.map(s => String((s && s[f]) || "")).filter(v => v.trim() !== "");
  if (!present.length) { console.log(`   ${f.padEnd(9)} never populated`); continue; }
  const lens = present.map(v => v.length);
  console.log(`   ${f.padEnd(9)} on ${String(present.length).padStart(4)} sites   median ${String(pct(lens, .5)).padStart(3)}  p90 ${String(pct(lens, .9)).padStart(3)}  max ${String(pct(lens, 1)).padStart(3)} chars`);
  console.log(`   ${"".padEnd(9)}   longest: ${JSON.stringify(present.slice().sort((a, b) => b.length - a.length)[0].slice(0, 150))}`);
}

// How many sites would a yes/no reduction actually serve? If `water` is nearly always a
// sentence rather than a token, a summary line must derive a verdict rather than echo it.
const wordy = f => sites.filter(s => String((s && s[f]) || "").length > 24).length;
console.log(`\n   over 24 chars (too long for a glanceable chip):`);
for (const f of ["capacity", "water", "permit"]) console.log(`      ${f.padEnd(9)} ${wordy(f)} of ${sites.length}`);
