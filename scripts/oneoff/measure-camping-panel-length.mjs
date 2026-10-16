// WHERE does the CAMPING & BIVY panel's length come from? Asked BEFORE collapsing anything,
// because the three plausible causes want three different fixes: long per-site NOTES prose
// wants a per-site disclosure, many SITES wants a truncated list, and long chips want neither.
// Shortening the wrong half moves markup around without shortening what a climber scrolls.
//
// Read-only. Fails closed on an empty read — zero rows would make every panel look short.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,discipline,bivy", "bivy=not.is.null", { pageSize: 1000 });
const withSites = rows.filter(r => Array.isArray(r.bivy) && r.bivy.length);
if (!withSites.length) { console.log("FAIL: read no routes carrying bivy sites"); process.exit(1); }

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const stat = (label, a) => console.log(`   ${label.padEnd(22)} min ${pct(a, 0)}  median ${pct(a, .5)}  p90 ${pct(a, .9)}  max ${pct(a, 1)}`);

const perRoute = [], notesShare = [], siteCount = [], noteLen = [], nameLen = [];
for (const r of withSites) {
  let notes = 0, other = 0;
  for (const s of r.bivy) {
    const n = String((s && s.notes) || "").length;
    notes += n; noteLen.push(n);
    nameLen.push(String((s && s.name) || "").length);
    other += [s.name, s.capacity, s.water, s.permit, s.type].map(v => String(v || "").length).reduce((a, b) => a + b, 0);
  }
  perRoute.push(notes + other);
  notesShare.push(notes / Math.max(1, notes + other));
  siteCount.push(r.bivy.length);
}
console.log(`${withSites.length} routes carry bivy sites; ${siteCount.reduce((a, b) => a + b, 0)} sites total\n`);
stat("chars per route", perRoute);
stat("sites per route", siteCount);
stat("chars per NOTE", noteLen);
stat("chars per NAME", nameLen);
console.log(`\n   notes are ${Math.round(pct(notesShare, .5) * 100)}% of the text on the median route (p90 ${Math.round(pct(notesShare, .9) * 100)}%)`);
console.log(`   routes whose notes alone exceed 4,000 chars: ${withSites.filter(r => r.bivy.reduce((a, s) => a + String((s && s.notes) || "").length, 0) > 4000).length}`);
console.log(`   sites with NO notes at all: ${noteLen.filter(n => n === 0).length} of ${noteLen.length}`);
