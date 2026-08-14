// What does the route search box ACTUALLY SHOW? Replays useRouteSearch end to end — every leg,
// the client-side scorer, and the final slice(0, lim) — not the legs in isolation.
//
// WHY THIS EXISTS ALONGSIDE measure-route-search-cap/-area-leg/-dilution.mjs, which measure the
// legs: a leg returning more rows proves nothing if those rows rank BELOW what the other legs
// supply. #954's subtree expansion looked like a clean win on per-leg counts while silently
// degrading queries that already worked — descendants crowded into a shared cap and, because
// routeSearchScore reads the LEAF area name, scored 20 instead of 90. Only the merged top-N shows
// that. The legs answer "did we fetch it"; this answers "did the climber see it".
//
// THE SCORER IS EXTRACTED FROM lib/db.js, NOT COPIED. An earlier version of this probe pasted a
// verbatim replica, which measures a fossil the moment the real one is edited — and the whole
// point here is to catch a ranking change. It is lifted by brace-matching over raw source and
// compiled, so there is exactly one definition and a rename fails the run loudly.
//
//   node scripts/oneoff/measure-route-search-top-n.mjs [--lim=8] [query ...]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const LIM = Number(arg("lim", 8));
const QUERIES = process.argv.slice(2).filter(a => !a.startsWith("--"));
const TESTS = QUERIES.length ? QUERIES
  : ["washington pass", "leavenworth", "smith rock", "stuart", "index", "rainier", "liberty bell"];

// --- lift routeSearchScore out of lib/db.js -------------------------------------------------
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const start = src.indexOf("function routeSearchScore(");
if (start < 0) throw new Error("ANCHOR LOST: `function routeSearchScore(` is not in lib/db.js — it was renamed or moved, and this probe would otherwise measure nothing.");
let depth = 0, end = -1;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
}
if (end < 0) throw new Error("could not balance routeSearchScore's braces");
const routeSearchScore = new Function(`${src.slice(start, end)}; return routeSearchScore;`)();
// Prove the lift produced a working function before trusting a single number it returns.
if (routeSearchScore({ name: "North Ridge" }, "north ridge") !== 100
  || routeSearchScore({ name: "x", areas: { name: "Mount Goode" } }, "goode") !== 90
  || routeSearchScore({ name: "x", areas: { name: "y" } }, "z") !== 20) {
  throw new Error("the extracted routeSearchScore does not behave as expected — the lift is wrong, not the app");
}

// --- replay the query legs ------------------------------------------------------------------
const K = anonKey(), H = { apikey: K, Authorization: "Bearer " + K };
const E = encodeURIComponent;
const j = async q => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 140)}`);
  return r.json();
};
const SEL = "id,name,areas(name)";

for (const q of TESTS) {
  const needle = q.toLowerCase();
  const [byPrefix, byName, matched] = await Promise.all([
    j(`routes?select=${SEL}&name=ilike.${E(q + "%")}&limit=${LIM * 2}`),
    j(`routes?select=${SEL}&name=ilike.${E("%" + q + "%")}&limit=${LIM * 2}`),
    j(`areas?select=id,name,path&name=ilike.${E("%" + q + "%")}&order=route_count.desc&limit=5`),
  ]);
  const matchedIds = matched.map(a => a.id), descIds = [];
  for (const a of matched.slice(0, 3).filter(a => a.path))
    for (const k of await j(`areas?select=id&path=cd.${E(a.path)}&route_count=gt.0&order=route_count.desc&limit=25`))
      if (!matchedIds.includes(k.id) && !descIds.includes(k.id)) descIds.push(k.id);
  // Two capped queries, matched-first — the shape #954 landed on.
  const [byMatched, byDesc] = await Promise.all([
    matchedIds.length ? j(`routes?select=${SEL}&area_id=in.(${matchedIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
    descIds.length ? j(`routes?select=${SEL}&area_id=in.(${descIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
  ]);

  const seen = new Set(), merged = [];
  for (const r of [...byPrefix, ...byName, ...byMatched, ...byDesc]) {
    if (seen.has(r.id)) continue; seen.add(r.id); merged.push(r);
  }
  merged.sort((a, b) => routeSearchScore(b, needle) - routeSearchScore(a, needle));
  const top = merged.slice(0, LIM);
  const strong = top.filter(r => routeSearchScore(r, needle) >= 45).length;

  console.log(`"${q}"   legs: prefix ${byPrefix.length} · name ${byName.length} · matched ${byMatched.length} · desc ${byDesc.length}`);
  console.log(`   TOP ${LIM}: ${top.length} row(s), ${strong} scoring >=45`);
  for (const r of top) {
    console.log(`      ${String(routeSearchScore(r, needle)).padStart(3)}  ${r.name}   [${(r.areas && r.areas.name) || "?"}]`);
  }
  console.log("");
}
console.log("Report only. A row scoring 20 is not necessarily wrong — for a container query like");
console.log('"washington pass" every real route scores 20, because the scorer reads the LEAF area');
console.log("name. What matters is whether the climber can reach the routes they asked for.");
