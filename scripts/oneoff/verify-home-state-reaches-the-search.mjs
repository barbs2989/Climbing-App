// DOES THE HOME-STATE HINT ACTUALLY REACH THE SEARCH, FOR A REAL SIGNED-IN CLIMBER?
//
// #1017 measured the RANKING by replaying the query legs with a home state handed in. That
// proves the ordering is right and proves NOTHING about where the ordering gets its input:
// `useMyHomeStatePath` reads the session, then `profiles.location`, then the states list,
// and any one of those failing returns null — at which point search silently reverts to the
// old behaviour and every screen still looks fine. Dormant code is not pre-verified, and a
// feature that fails to null is the kind nobody notices for a year.
//
// So this drives the whole chain against a REAL account through REAL RLS:
//   1. create a throwaway account (service key, per run, destroyed after)
//   2. sign in as it and use the ANON key from there on, so RLS is live
//   3. replay the hook's three reads exactly, with that session's token
//   4. resolve homeStatePath from what came back
//   5. run a namesake search with it and assert Washington's peak is on the page
//
// Step 5 is the one that matters. Steps 1-4 can all succeed and still leave the climber
// looking at Nevada's Cathedral Rock.
//
//   node scripts/oneoff/verify-home-state-reaches-the-search.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { createFixture } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
function lift(anchor) {
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(`ANCHOR LOST: \`${anchor}\` is not in lib/db.js — this check would otherwise verify nothing.`);
  let depth = 0, end = -1;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error(`could not balance ${anchor}`);
  return src.slice(start, end);
}
const homeStatePath = new Function(
  `${lift("const REGION_ABBR = {")};\n${lift("export function homeStatePath(").replace(/^export /, "")};\nreturn homeStatePath;`
)();
const routeSearchScore = new Function(`${lift("function routeSearchScore(")}; return routeSearchScore;`)();

const K = anonKey(), E = encodeURIComponent;
let TOKEN = null;
async function j(q) {
  // The anon key stays the apikey; the Authorization header carries the USER, which is what
  // makes RLS evaluate as that climber rather than as the anonymous role.
  const H = { apikey: K, Authorization: "Bearer " + (TOKEN || K) };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

let fixture = null, fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"}  ${msg}`); if (!cond) fail++; };

try {
  console.log("creating a throwaway account (service key, destroyed at the end)...");
  fixture = await createFixture((m) => console.log(m));
  TOKEN = fixture.session.access_token;
  ok(!!TOKEN, "signed in as the fixture account; every read below is under its own RLS");

  // 1. the session's own user — supabase.auth.getUser() equivalent
  const who = await (async () => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: K, Authorization: "Bearer " + TOKEN } });
    return r.ok ? r.json() : null;
  })();
  ok(who && who.id === fixture.owner.id, `the session resolves to the right climber (${who && who.id ? who.id.slice(0, 8) : "none"})`);

  // 2. profiles.location, read AS that climber. A policy that hides it returns [] rather
  //    than an error, so an empty read here is exactly the silent-null failure being hunted.
  const prof = await j(`profiles?select=location&id=eq.${E(fixture.owner.id)}`);
  const loc = prof[0] && prof[0].location;
  ok(!!loc, `the climber can read their OWN location through RLS: ${JSON.stringify(loc)}`);

  // 3. the states list the hook matches against
  const roots = await j(`areas?select=id&parent_id=is.null`);
  const states = await j(`areas?select=id,name,path&parent_id=in.(${roots.map((r) => E(r.id)).join(",")})&order=name`);
  ok(states.length > 10, `the states list loaded (${states.length} states/provinces)`);

  // 4. resolve
  const home = homeStatePath(loc, states);
  ok(home === "usa.washington", `homeStatePath(${JSON.stringify(loc)}) -> ${JSON.stringify(home)}`);

  // 5. THE ONE THAT MATTERS: a namesake search, with that home state, must surface the
  //    Washington peak. Cathedral Rock is the case #1017 could not fix without this hint —
  //    four areas share the name and Nevada's holds 30 routes against Washington's 5.
  const LIM = 8, q = "Cathedral Rock", needle = q.toLowerCase(), SEL = "id,name,area_id,areas(name,region,parent:parent_id(name))";
  const [byPrefix, byName, matched, exact] = await Promise.all([
    j(`routes?select=${SEL}&name=ilike.${E(q + "%")}&limit=${LIM * 2}`),
    j(`routes?select=${SEL}&name=ilike.${E("%" + q + "%")}&limit=${LIM * 2}`),
    j(`areas?select=id,name,path&name=ilike.${E("%" + q + "%")}&order=route_count.desc&limit=5`),
    j(`areas?select=id,name,path&name=ilike.${E(q)}&order=route_count.desc&limit=25`),
  ]);
  const matchedIds = matched.map((a) => a.id), descIds = [];
  for (const a of matched.slice(0, 3).filter((a) => a.path))
    for (const k of await j(`areas?select=id&path=cd.${E(a.path)}&route_count=gt.0&order=route_count.desc&limit=25`))
      if (!matchedIds.includes(k.id) && !descIds.includes(k.id)) descIds.push(k.id);

  // The pipeline, parameterised by the hint, so the SAME code answers both questions. Two
  // hand-written copies would let the with/without comparison drift into meaninglessness.
  async function topFor(home) {
    const atHome = (a) => !!home && (a.path === home || String(a.path || "").startsWith(home + "."));
    const homeExactIds = exact.filter(atHome).map((a) => a.id).slice(0, 3);
    const exactIds = exact.filter((a) => !atHome(a)).filter((a) => !matchedIds.includes(a.id)).map((a) => a.id).slice(0, 5);
    const [byMatched, byDesc, byExact, byHomeExact] = await Promise.all([
      matchedIds.length ? j(`routes?select=${SEL}&area_id=in.(${matchedIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
      descIds.length ? j(`routes?select=${SEL}&area_id=in.(${descIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
      exactIds.length ? j(`routes?select=${SEL}&area_id=in.(${exactIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
      homeExactIds.length ? j(`routes?select=${SEL}&area_id=in.(${homeExactIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
    ]);
    const seen = new Set(), merged = [];
    for (const r of [...byPrefix, ...byName, ...byHomeExact, ...byExact, ...byMatched, ...byDesc]) {
      if (seen.has(r.id)) continue; seen.add(r.id); merged.push(r);
    }
    merged.sort((a, b) => routeSearchScore(b, needle) - routeSearchScore(a, needle));
    const namedAll = merged.filter((r) => {
      const an = String((r.areas && r.areas.name) || "").toLowerCase();
      return an === needle || an.replace(/^(mount|mt\.?|the)\s+/, "") === needle;
    });
    const homeAreaIds = new Set([...exact, ...matched].filter(atHome).map((a) => a.id));
    const namedHomeFirst = home
      ? namedAll.slice().sort((x, y) => (homeAreaIds.has(y.area_id) ? 1 : 0) - (homeAreaIds.has(x.area_id) ? 1 : 0))
      : namedAll;
    const oncePer = new Set(), firstOfEach = [], extras = [];
    for (const r of namedHomeFirst) {
      if (oncePer.has(r.area_id)) extras.push(r); else { oncePer.add(r.area_id); firstOfEach.push(r); }
    }
    const named = [...firstOfEach, ...extras].slice(0, 3);
    const reserved = new Set(named.map((r) => r.id));
    return [...named, ...merged.filter((r) => !reserved.has(r.id))].slice(0, LIM);
  }

  const top = await topFor(home);
  console.log(`\n  what "${q}" shows this climber:`);
  for (const r of top) console.log(`     ${String(routeSearchScore(r, needle)).padStart(3)}  ${String(r.name).slice(0, 40).padEnd(42)} [${(r.areas && r.areas.name) || "?"}]  ${r.area_id === "wa_cathedral_rock" ? "<-- WASHINGTON" : ""}`);
  const mine = top.filter((r) => r.area_id === "wa_cathedral_rock");
  console.log("");
  ok(mine.length > 0, `Washington's Cathedral Rock is on the page (${mine.length} of its 5 routes in the top ${LIM})`);

  // NON-VACUITY, MEASURED RATHER THAN ASSERTED. Run the identical pipeline with no hint: if
  // Washington's peak shows up there too, the search works regardless and the assertion above
  // proves nothing about the hint. This must come out EMPTY.
  const without = await topFor(null);
  const mineWithout = without.filter((r) => r.area_id === "wa_cathedral_rock");
  ok(mineWithout.length === 0,
    `and WITHOUT the hint the same pipeline shows ${mineWithout.length} of its routes — so the hint is what puts it there`);
  console.log(`  (without the hint the page is: ${without.slice(0, 3).map((r) => (r.areas && r.areas.name) || "?").join(", ")}, ...)`);

  // AND CAN THE CLIMBER TELL THEM APART? Reaching the page is not the same as being
  // identifiable: every row prints `{area.name} · {grade}`, so two namesakes side by side
  // both read "Cathedral Rock" and choosing between them is a coin flip. Replays the
  // disambiguation useRouteSearch applies to its own result set.
  const labelGroups = new Map();
  for (const r of top) {
    const n = String((r.areas && r.areas.name) || "");
    if (!n) continue;
    if (!labelGroups.has(n)) labelGroups.set(n, new Set());
    labelGroups.get(n).add(r.area_id);
  }
  const labelled = top.map((r) => {
    const n = String((r.areas && r.areas.name) || "");
    const amb = n && labelGroups.get(n) && labelGroups.get(n).size > 1;
    const qual = amb ? ((r.areas && (r.areas.region || (r.areas.parent && r.areas.parent.name))) || "") : "";
    return { id: r.area_id, label: qual ? `${n} (${qual})` : n };
  });
  console.log("\n  the subtitle each row now prints:");
  for (const l of labelled) console.log(`     ${l.label}${l.id === "wa_cathedral_rock" ? "   <-- WASHINGTON" : ""}`);
  const distinct = new Set(labelled.map((l) => l.label));
  const areaCount = new Set(top.map((r) => r.area_id)).size;
  console.log("");
  ok(distinct.size === areaCount,
    `every distinct area on the page has a distinct subtitle (${distinct.size} labels for ${areaCount} areas)`);
  const waLabel = labelled.find((l) => l.id === "wa_cathedral_rock");
  ok(!!waLabel && /\(/.test(waLabel.label),
    `Washington's row says which Cathedral Rock it is: ${JSON.stringify(waLabel && waLabel.label)}`);
} catch (e) {
  console.log(`FAIL  threw: ${e.message}`);
  fail++;
} finally {
  if (fixture) {
    const left = await fixture.cleanup().catch(() => ["cleanup threw"]);
    console.log(left && left.length ? `WARNING: fixture accounts left behind: ${left.join(", ")}` : "fixture destroyed");
  }
}
console.log(fail ? `\n${fail} failure(s)` : "\nok — the home-state hint reaches the search for a real signed-in climber");
process.exit(fail ? 1 : 0);
