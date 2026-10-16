// How bad is `approach_variants[].season`?
//
// It renders in the APPROACHES panel on the Planner tab as a pill carrying BOTH
// `white-space:nowrap` AND `flex-shrink:0` — so its text can neither wrap nor shrink, and a long
// value pushes the row wider than the phone. That is worse than the camping chips, which at
// least wrapped into a blob.
//
// Same rule CLAUDE.md states for the top-level `season` column: it is a WINDOW, not an
// explanation. The explanation belongs in the variant's own `notes`.
//
// Read-only, bounded page. `approach_variants=not.is.null` is sparse, so selectAll's
// `order=id.asc` walks the id index and times out — see check:field-renders' note.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach_variants&approach_variants=not.is.null&limit=1000`, { headers: headers(anonKey()) });
if (!res.ok) { console.log(`FAIL: read failed (${res.status}) — NOT "no long seasons"`); console.log("  " + (await res.text()).slice(0, 200)); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.log("FAIL: read no routes with approach_variants"); process.exit(1); }

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];

const lens = [], long = [];
let variants = 0, withSeason = 0;
for (const r of rows) {
  for (const v of (Array.isArray(r.approach_variants) ? r.approach_variants : [])) {
    variants++;
    const s = String((v && v.season) || "").trim();
    if (!s) continue;
    withSeason++;
    lens.push(s.length);
    // 24 characters is about what a nowrap pill can hold beside a variant name on a 390px
    // phone before the row stops fitting. "Jun-Sep" is 7; "Roughly Jun-Aug. The ice cliff
    // step is shorter and more amenable early..." is 169.
    if (s.length > 24) long.push({ id: r.id, name: (v.name || "").slice(0, 40), len: s.length, season: s });
  }
}

console.log(`${rows.length} routes carry approach_variants; ${variants} variants; ${withSeason} carry a season\n`);
console.log(`   season length   median ${pct(lens, .5)}  p90 ${pct(lens, .9)}  max ${pct(lens, 1)}`);
console.log(`   over 24 chars (too long for the nowrap pill): ${long.length} of ${withSeason} (${Math.round(long.length / withSeason * 100)}%)`);
console.log(`   routes affected: ${new Set(long.map((l) => l.id)).size}\n`);

console.log("longest 12:");
long.sort((a, b) => b.len - a.len).slice(0, 12).forEach((l) => {
  console.log(`   ${String(l.len).padStart(4)}  ${l.id}`);
  console.log(`         ${JSON.stringify(l.season.slice(0, 150))}`);
});

// The shape of a CORRECT value, so a repair has something to aim at rather than a guess.
const shortOnes = lens.filter((n) => n <= 24).length;
console.log(`\n${shortOnes} of ${withSeason} are already a window (<=24 chars) — examples:`);
const ex = [];
for (const r of rows) for (const v of (Array.isArray(r.approach_variants) ? r.approach_variants : [])) {
  const s = String((v && v.season) || "").trim();
  if (s && s.length <= 24 && ex.length < 6 && !ex.includes(s)) ex.push(s);
}
ex.forEach((s) => console.log(`   ${JSON.stringify(s)}`));
