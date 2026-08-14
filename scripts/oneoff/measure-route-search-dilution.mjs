// Does the subtree expansion DISPLACE direct hits? The byArea cap is still unordered, and the
// pool it draws from is now much larger — so rows from name-MATCHING areas (which score 90/70/45
// off the area name) can be crowded out by descendants whose leaf name scores 20.
//
// Compares three shapes on the final merged top-8, scoring with routeSearchScore's tiers:
//   BEFORE      matched ids only            (the original defect: containers -> often 0 rows)
//   SINGLE      matched + descendants, ONE capped query   (what is on the branch now)
//   SPLIT       two capped queries, matched first then descendants  (proposed remedy)
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const E = encodeURIComponent;
const j = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 140));
  return r.json();
};
// Mirrors routeSearchScore. REPLICATED, not imported — it is module-private in lib/db.js.
//
// THAT IS A KNOWN FLAW IN THIS PROBE, and it is the same class it exists to measure: a copy is a
// FOSSIL the moment the real function is edited, so this would keep printing confident numbers
// about a scorer that no longer exists — failing silently at exactly the moment a ranking change
// made it matter. Prefer scripts/oneoff/measure-route-search-top-n.mjs, which LIFTS the scorer
// out of lib/db.js by brace-matching, fails with ANCHOR LOST on a rename, and asserts the lifted
// function's behaviour before believing any number it returns. Keep this one only for the
// three-way BEFORE/SINGLE/SPLIT comparison, which that probe does not do; if the tiers below stop
// matching lib/db.js, delete this file rather than repairing the copy.
const score = (row, needle) => {
  const rn = String(row.name || "").toLowerCase();
  const an = String((row.areas && row.areas.name) || "").toLowerCase();
  const ap = an.replace(/^(mount|mt\.?|the)\s+/, "");
  if (rn === needle) return 100;
  if (an === needle || ap === needle) return 90;
  if (rn.startsWith(needle)) return 80;
  if (an.startsWith(needle) || ap.startsWith(needle)) return 70;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp("\\b" + esc).test(rn)) return 50;
  if (new RegExp("\\b" + esc).test(an)) return 45;
  if (rn.includes(needle)) return 30;
  return 20;
};
const SEL = E("id,name,areas(name)");
const routesIn = async (ids, n) => ids.length ? j(`routes?select=${SEL}&area_id=in.(${ids.join(",")})&limit=${n}`) : [];
const top8 = (rows, needle) => {
  const s = new Set(), o = [];
  for (const r of rows) { if (s.has(r.id)) continue; s.add(r.id); o.push(r); }
  return o.sort((a, b) => score(b, needle) - score(a, needle)).slice(0, 8);
};
const hi = (rows, needle) => rows.filter(r => score(r, needle) >= 45).length;

await j("areas?select=id&limit=1");
for (const q of ["washington pass", "leavenworth", "smith rock", "stuart", "index", "rainier", "liberty bell"]) {
  const needle = q.toLowerCase();
  const matched = await j(`areas?select=id,name,path&name=ilike.${E("%" + q + "%")}&order=route_count.desc&limit=5`);
  const mIds = matched.map(a => a.id);
  const dIds = [];
  for (const a of matched.slice(0, 3).filter(a => a.path))
    for (const k of await j(`areas?select=id&path=cd.${E(a.path)}&route_count=gt.0&order=route_count.desc&limit=25`))
      if (!mIds.includes(k.id) && !dIds.includes(k.id)) dIds.push(k.id);

  const before = await routesIn(mIds, 16);
  const single = await routesIn([...mIds, ...dIds], 16);
  const split = [...before, ...(await routesIn(dIds, 16))];

  const fmt = (rows) => { const t = top8(rows, needle); return `${t.length} rows, ${hi(t, needle)} high-scoring`; };
  console.log(`"${q}"  matched=${mIds.length} descendants=${dIds.length}`);
  console.log(`    BEFORE ${fmt(before)}`);
  console.log(`    SINGLE ${fmt(single)}`);
  console.log(`    SPLIT  ${fmt(split)}`);
}
