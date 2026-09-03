// CAN A REAL CLIMBER FIND WHAT ANOTHER REAL CLIMBER MADE?
//
// That is the app's whole purpose, and `CrewFinder` fails it: it reads the seed OPEN_CREWS array,
// so a crew a real account creates is invisible to everyone. The question worth asking is not
// "is that one screen wrong" but "WHICH discovery surfaces read a seed array instead of the DB".
//
// A DISCOVERY SURFACE is a screen whose job is to show you OTHER PEOPLE'S things — crews to join,
// climbers to partner with, groups to join, guides to hire. Your OWN data (useMyCrews, useMyGroups)
// is a different question and is not asked here.
//
// METHOD, and it is deliberately crude: for each surface, does its component body reference a seed
// array, a DB hook, or both? BOTH is the healthy answer in this codebase -- seed is the signed-out
// demo and the DB is the real path -- so the finding is a surface that names a seed array and NO
// hook. Read the output; this is a reading list, not a verdict.
import fs from "fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

// The seed arrays that stand in for USER-GENERATED content. ROUTES/MOUNTAINS are the catalog and
// have their own DB path (DbAreaBrowser); they are not somebody's crew or profile.
const SEED = ["OPEN_CREWS", "GROUPS", "CLIMBERS", "FILLER_CLIMBERS", "MY_CLIMBS"];
// Any use* identifier reaching PostgREST. Discovered rather than listed, so a new hook counts.
const dbHooks = new Set();
{
  const lib = fs.readFileSync("lib/db.js", "utf8");
  for (const m of lib.matchAll(/export function (use[A-Za-z0-9_]+)/g)) dbHooks.add(m[1]);
}

// The screens whose job is finding OTHER people's things.
const SURFACES = ["CrewFinder", "PartnerSearch", "DbGuides", "Guides", "Leaderboards", "FriendsFeed"];

const rows = [];
for (const file of ["ClimbMatch.jsx", "ClimbMatchCore.jsx"]) {
  const src = fs.readFileSync(file, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  traverse(ast, {
    FunctionDeclaration(p) {
      const name = p.node.id && p.node.id.name;
      if (!SURFACES.includes(name)) return;
      const body = src.slice(p.node.start, p.node.end);
      const seeds = SEED.filter((x) => new RegExp(`\\b${x}\\b`).test(body));
      const hooks = [...dbHooks].filter((h) => new RegExp(`\\b${h}\\b`).test(body));
      rows.push({ file, name, chars: body.length, seeds, hooks });
    },
  });
}
if (rows.length < 3) { console.error(`FAIL-CLOSED: found ${rows.length} surfaces — the walk is broken.`); process.exit(1); }

console.log(`DB hooks discovered in lib/db.js: ${dbHooks.size}`);
console.log(`discovery surfaces located: ${rows.length}\n`);
for (const r of rows.sort((a, b) => (a.hooks.length ? 1 : 0) - (b.hooks.length ? 1 : 0))) {
  const verdict = !r.seeds.length ? "DB-only" : r.hooks.length ? "seed + DB" : "SEED ONLY  <-- a real climber's data cannot appear here";
  console.log(`  ${r.name.padEnd(14)} ${String(r.chars).padStart(6)} chars   ${verdict}`);
  if (r.seeds.length) console.log(`      seed: ${r.seeds.join(", ")}`);
  if (r.hooks.length) console.log(`      db:   ${r.hooks.slice(0, 6).join(", ")}${r.hooks.length > 6 ? ` (+${r.hooks.length - 6})` : ""}`);
}
// READ AT THE CALL SITE, because the verdict above is coarse in BOTH directions: a hook counts
// even when it feeds something other than the list (CrewFinder's is climb SEARCH), and real rows
// can arrive as a PROP, which no scan of the component body can see. Reasons, so the output is not
// misread as a defect count -- and a stale entry fails.
const NOTES = {
  CrewFinder: "FIXED. Real crews arrive as the `dbCrews` PROP, from useCrewListings in App — invisible to this scan, which is why the verdict reads 'seed + DB' on the strength of useRouteSearch (climb search) instead. Seed OPEN_CREWS stay as the signed-out demo.",
  PartnerSearch: "healthy. useDiscoverableProfiles is the real pool; FILLER_CLIMBERS is the demo example card.",
  Leaderboards: "A REAL GAP, and one no hook census can see, because there is no leaderboard hook to be uncalled. The pool is `[...CLIMBERS, ...(showOnRanks?[me]:[])]` — six seed climbers plus you — while the privacy switch beside it says 'Off keeps you out of every ranking'. Building it needs an AGGREGATE over climb_logs that does not exist, and climb_logs holds 1 row catalog-wide, so it would rank one person. Reported, not built.",
  Guides: "healthy. DbGuides is the DB-backed screen; `Guides` is its seed twin behind !USE_DB.",
  FriendsFeed: "healthy. Reads connections, which are DB-backed.",
};
console.log("\nWHAT EACH VERDICT ACTUALLY MEANS (reasons, not passes — a stale entry fails):");
let stale = 0;
for (const k of Object.keys(NOTES)) {
  if (!rows.some((r) => r.name === k)) { console.log(`  STALE  ${k} — declared here and no longer a surface.`); stale++; }
  else console.log(`  ${k}: ${NOTES[k]}`);
}
for (const r of rows) if (!NOTES[r.name]) { console.log(`  UNDECLARED  ${r.name} — nobody has judged this surface.`); stale++; }
process.exit(stale ? 1 : 0);
