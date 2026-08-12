// What does a `lists` tag actually sit on? Read the convention out of the live data before
// inventing one.
//
// Fifty Classics is a ROUTE list — the book names a peak AND a line, so the tag has an obvious
// home. Every other list in LIST_ALIASES is a PEAK list: the Bulgers are the 100 highest summits
// in Washington, the Colorado 14ers are summits. A summit is not a route, and `lists` is a
// column on `routes` — so "tag the Bulgers" has no meaning until you decide WHICH route on the
// peak carries it. Get that wrong in bulk and the app claims a climber ticked Mount Stuart by
// climbing any of its 40 lines, or misses the tick entirely.
//
// Read-only.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const rows = await q("routes?select=id,name,area_id,grade,discipline,lists,classic&lists=not.is.null&limit=2000");
if (!rows.length) { console.error("FAIL: no tagged routes — refusing to infer a convention from nothing."); process.exit(1); }

// Group by tag.
const byTag = new Map();
for (const r of rows) for (const t of r.lists || []) {
  if (!byTag.has(t)) byTag.set(t, []);
  byTag.get(t).push(r);
}

console.log(`\n=== ${rows.length} tagged routes, ${byTag.size} distinct tag values ===\n`);
for (const [t, rs] of [...byTag].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${t}  (${rs.length})`);
}

// The question that matters: for a PEAK list, is the tag on one route per peak, and is that
// route the easiest line? Look at the peak lists specifically.
const peakLists = [...byTag.keys()].filter(t => !/fifty|classic/i.test(t));
console.log(`\n=== peak-list tags in detail ===`);
for (const t of peakLists) {
  const rs = byTag.get(t);
  const areas = new Set(rs.map(r => r.area_id));
  console.log(`\n${t}: ${rs.length} routes across ${areas.size} areas${rs.length === areas.size ? " — exactly one route per area" : " — MORE THAN ONE route on some area"}`);
  for (const r of rs.slice(0, 12)) console.log(`   ${String(r.area_id).padEnd(34)} ${String(r.name).slice(0, 38).padEnd(40)} ${r.grade || "-"}`);
}

// And how many routes does each of those peaks actually HAVE? If a tagged peak carries 30 lines
// and exactly one is tagged, the convention is "the route that ticks the summit", not "every
// route on it".
const ids = [...new Set(rows.filter(r => (r.lists || []).some(t => peakLists.includes(t))).map(r => r.area_id))].filter(Boolean);
if (ids.length) {
  console.log(`\n=== how many routes do those peaks hold? ===`);
  for (const a of ids.slice(0, 15)) {
    const all = await q(`routes?select=id,name,grade&area_id=eq.${encodeURIComponent(a)}&limit=200`);
    const tagged = rows.filter(r => r.area_id === a);
    console.log(`${a.padEnd(34)} ${String(all.length).padStart(3)} routes, ${tagged.length} tagged  ->  ${tagged.map(r => r.name).join(" | ").slice(0, 60)}`);
  }
}
