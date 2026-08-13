// How full is each named tick-list, against the total it advertises?
//
// The Challenges screen declares ~20 lists and prints "N of TOTAL" for each. TOTAL is a
// hardcoded constant (Colorado 14ers: 53, State Highpoints: 50, Bulgers: 100); N comes from
// the catalog. Nothing compared the two, so a list can advertise 100 objectives and hold one.
//
// Read-only. Resolves membership through lib/lists.js, the same resolver the screen uses, so a
// number here and a number on screen cannot disagree — and prose spellings ("Washington Bulger
// List (100 Highest Peaks in Washington)") count exactly as slugs do.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { LIST_ALIASES, routeInList, listPeaks } from "../lib/lists.js";

// The totals the Challenges screen advertises, copied from its own `lists` array. A list whose
// total is unknown there is left null rather than guessed.
const DECLARED = {
  fifty: 50, bulgers: 100, co14: 53, ca14: 12, state_hp: 50, np_hp: 63,
  cascade: 18, adk46: 46, ne4k: 67, co_cent: 100, id12: 9, ultra: null,
  seven: 7, beckey: 100, desert: null, mp_classics: null, gunks: null, triple: 3,
};

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,lists,classic&lists=not.is.null&limit=2000`, { headers: headers(key) });
if (!res.ok) { console.error(`FAIL: ${res.status} ${(await res.text()).slice(0, 160)}`); process.exit(1); }
const rows = JSON.parse(await res.text());
// Fails closed: an empty read would make every list look equally (and falsely) empty.
if (!rows.length) { console.error("FAIL: no routes carry a lists value — refusing to report 0 for everything."); process.exit(1); }

console.log(`\n=== named list coverage ===`);
console.log(`routes carrying any list tag: ${rows.length}\n`);
const keys = Object.keys(LIST_ALIASES);
// A PEAK list is defined by its roster, not by `routes.lists` — see the note in lib/lists.js.
// Counting its tags would report the Bulgers as 11 of 100 while the app shows 100 objectives,
// i.e. this audit would disagree with the screen it exists to measure.
const out = keys.map(k => {
  const roster = listPeaks(k);
  const have = roster ? roster.length : rows.filter(r => routeInList(r, k)).length;
  const want = DECLARED[k];
  return { k, have, want, via: roster ? "roster" : "tags", gap: want != null ? want - have : null };
}).sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("list", 14) + pad("members", 9) + pad("advertised", 12) + pad("via", 8) + "gap");
for (const r of out) {
  console.log(pad(r.k, 14) + pad(r.have, 9) + pad(r.want ?? "—", 12) + pad(r.via, 8) + (r.gap == null ? "—" : r.gap > 0 ? `${r.gap} missing` : "complete"));
}
const empty = out.filter(r => r.have === 0);
console.log(`\nlists with NOTHING tagged: ${empty.length} of ${keys.length} — ${empty.map(r => r.k).join(", ") || "none"}`);
const totalGap = out.reduce((n, r) => n + (r.gap > 0 ? r.gap : 0), 0);
console.log(`total advertised objectives not yet in the catalog: ${totalGap}`);
process.exit(0);
