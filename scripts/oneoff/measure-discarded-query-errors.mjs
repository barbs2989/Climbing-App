// Which query results DISCARD their error by destructuring only `data`?
//
// The shape that produced #1302: `const {data:dbSibs}=useAreaRoutes(...)` throws away `isError`,
// so a failed read is indistinguishable from an empty one at every consumer downstream, and the
// route page stated as fact that a four-route area held one route.
//
// memory/outage-flags-census enumerates query HANDLES (`const q=useX()`, where the error is at
// least REACHABLE). This asks the complementary question — where is the error not even BOUND?
//
// THE CLASS IS CLOSED: 19 discards remain and ALL NINETEEN ARE BENIGN. Recorded here per site so
// nobody re-sweeps it, and because a count of 19 reads like a backlog and is not.
//
//   useSubtreeRouteCount -> {data: total}   CORRECT, and it is the pattern to copy: the reader is
//       `total != null ? total : all.length`, a tri-state null check, so a failed count degrades to
//       the number of routes actually loaded rather than to a wrong 0.
//   useSubtreeRoutes -> {data: pool}        VANISHES, no claim. It feeds DbSuggestedClimbs, whose
//       first statement is `if (!total) return null` — the whole section is absent rather than
//       asserting there is nothing to suggest.
//   useRoutesByIds -> {data: dbListRoutesRaw}   Feeds `routeById`, and its 52 call sites take
//       `||{}`, `||null` or `.filter(x=>x.route&&…)`. Rows drop or blank; nothing says a list is
//       empty. Worth knowing rather than fixing: a dropped row is quieter than a false sentence.
//   the lib/ components                     Already measured clean (2026-08-26): all six that carry
//       absence copy make the three-way distinction (loading / failed / genuinely empty), each
//       through a RENAMED local — `ec`, `guidesError`, `inqError` — which is exactly why a scan
//       keyed on `handle.isError` reported 6 of 6 correct components as unguarded. Read the render
//       site, never a column a regex produced.
//
// So a discard is not a defect on its own. It is one when something downstream ASSERTS ABSENCE
// from the resulting emptiness, and only reading the render site can tell you which.

import fs from "node:fs";

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const extra = fs.readdirSync("lib").filter((f) => /\.jsx?$/.test(f)).map((f) => "lib/" + f);

let sites = 0, discarding = 0;
for (const f of [...FILES, ...extra]) {
  let s;
  try { s = fs.readFileSync(f, "utf8"); } catch { continue; }
  // Every destructuring bind of a hook call whose name looks like a query hook.
  const re = /(?:const|let|var)\s*\{([^{}]{0,200})\}\s*=\s*(use[A-Z][A-Za-z0-9_]*)\s*\(/g;
  const hits = [];
  for (const m of s.matchAll(re)) {
    const inner = m[1], hook = m[2];
    if (!/\bdata\b/.test(inner)) continue;          // not a query result
    sites++;
    const hasErr = /\b(error|isError)\b/.test(inner);
    if (hasErr) continue;
    discarding++;
    const line = s.slice(0, m.index).split("\n").length;
    hits.push(`  ${f}:${line}  ${hook}  -> {${inner.trim()}}`);
  }
  if (hits.length) { console.log(`\n${f}`); hits.forEach((h) => console.log(h)); }
}

console.log(`\n${sites} destructured query result(s); ${discarding} discard the error entirely.`);
if (!sites) { console.error("FAIL — no destructured query results found at all; a broken scan."); process.exit(1); }
console.log(`A discard is not a defect on its own. It is one when something downstream ASSERTS`);
console.log(`ABSENCE from the resulting emptiness — read each site before changing it.`);
