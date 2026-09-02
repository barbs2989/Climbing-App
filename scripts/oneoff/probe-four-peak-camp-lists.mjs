// THE ROUTE THAT DOES NOT CARRY THE SHARED LIST IS THE INDEPENDENT WITNESS.
//
// census-camp-list-provenance found one identical 8-camp list on 7 routes across Mount Pilchuck,
// Three Fingers, Big Four Mountain and Whitehorse Mountain. Two camps — Goat Flats and Saddle
// Lake — appear on Three Fingers THREE times while the rest appear twice, so a third Three
// Fingers route carries a DIFFERENT list. That route was written by something other than whatever
// propagated the shared one, which makes it evidence rather than another copy of the same claim.
//
// Print every route on all four peaks with its own list, so the shared list and any independent
// one can be told apart by eye before anything is removed.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const PEAKS = ["Mount Pilchuck", "Three Fingers", "Big Four Mountain", "Whitehorse Mountain"];

const areas = await selectAll("areas", "id,name,lat,lng,area_type", "", { pageSize: 1000 });
const ids = new Map();
for (const p of PEAKS) {
  const hits = areas.filter((a) => a.name.toLowerCase() === p.toLowerCase());
  if (hits.length !== 1) { console.log(`FAIL CLOSED: ${hits.length} areas named ${p}`); process.exit(1); }
  ids.set(hits[0].id, hits[0]);
}

const rows = await selectAll("routes", "id,name,area_id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const mine = rows.filter((r) => ids.has(r.area_id));
if (!mine.length) { console.log("FAIL CLOSED: no routes read"); process.exit(1); }

const names = (r) => (Array.isArray(r.bivy) ? r.bivy : []).map((s) => (s && s.name) || "").filter(Boolean);
const key = (r) => names(r).slice().sort().join(" | ");

// the shared list is whichever key covers the most areas
const cover = new Map();
for (const r of mine) {
  if (!cover.has(key(r))) cover.set(key(r), new Set());
  cover.get(key(r)).add(r.area_id);
}
let shared = null, best = 0;
for (const [k, s] of cover) if (s.size > best) { best = s.size; shared = k; }

for (const [aid, a] of ids) {
  const rs = mine.filter((r) => r.area_id === aid);
  console.log(`\n=== ${a.name}  (${rs.length} route(s) with a bivy list) ===`);
  for (const r of rs) {
    const tag = key(r) === shared ? "SHARED LIST" : "OWN LIST";
    console.log(`  ${r.id}  [${tag}]  ${names(r).length} camps`);
    if (key(r) !== shared) for (const n of names(r)) console.log(`       - ${n}`);
  }
}

console.log(`\nThe shared list spans ${best} of the ${ids.size} peaks.`);
const independent = mine.filter((r) => key(r) !== shared);
console.log(`${independent.length} route(s) carry an independent list — those are the witnesses.`);
if (!independent.length) {
  console.log("NO independent witness. Every list on these peaks is the same one, so the catalog");
  console.log("cannot say which camps belong where and a repair needs evidence from outside it.");
}
