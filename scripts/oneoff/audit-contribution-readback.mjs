/* "Does what I submitted actually come back?"

   The route-level `anchorType` field is why this exists. A climber could pick "Bolted /
   Gear anchor / Tree" in the contribute sheet, submit it, watch it go into the 3-agree
   consensus — and nothing ever rendered the answer. There is no anchor_type column,
   dbRouteToCamel never mapped one, and no read site existed anywhere in the app. It was a
   write-only field: perfectly functional plumbing feeding a pipe that ends in a wall.

   That is not visible from either end. The submit side works, the merge works, the ledger
   shows the contribution. Only asking "who READS this key" finds it, which is the same
   lesson as check:field-renders (grep the consumer, not the transform) and
   never-set-state-finds-dead-features.

   This walks SuggestFix's FIELDS list, follows ClimbMatch's M map to the route key each one
   writes, and asks whether any app source reads that key. Report-only — a hit is a question,
   not a verdict, because a key can legitimately be read via a spread or a computed lookup. */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.argv[2] || ".");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const SOURCES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx", "AppErrorBoundary.jsx", "lib/db.js"];
const src = {};
for (const f of SOURCES) {
  try { src[f] = read(f); } catch (e) { throw new Error(`cannot read ${f} — refusing to report a clean audit on a partial tree: ${e.message}`); }
}
const all = Object.values(src).join("\n");

// 1. the fields the contribute sheet offers: {k:"...",label:"...",type:"..."}
const fields = [...src["RouteDetail.jsx"].matchAll(/\{k:"([A-Za-z0-9_]+)",label:"((?:[^"\\]|\\.)*)"/g)].map((m) => ({ k: m[1], label: m[2] }));
if (!fields.length) throw new Error("found 0 contribute fields — the FIELDS regex has drifted, this would report a false clean");

// 2. the rename map applied at merge time: var M={crux:"cruxGrade",...}
const mMatch = src["ClimbMatch.jsx"].match(/var M=\{([^}]*)\}/);
if (!mMatch) throw new Error("could not find the M rename map in ClimbMatch.jsx");
const M = {};
for (const m of mMatch[1].matchAll(/(\w+):"(\w+)"/g)) M[m[1]] = m[2];

// 3. the allow-list of fields the merge will actually apply: var SS={grade:1,...}
const ssMatch = src["ClimbMatch.jsx"].match(/var SS=\{([^}]*)\}/);
if (!ssMatch) throw new Error("could not find the SS allow-list in ClimbMatch.jsx");
const SS = new Set([...ssMatch[1].matchAll(/(\w+):1/g)].map((m) => m[1]));

/* Injection cases. A detector that has just reported "0 problems" has to prove it can still
   see one, or the zero means nothing — this is the failure documented in
   injections-that-pass-because-the-fault-is-out-of-frame (the tell: the injection logged, the
   counter did not move).
     --inject=writeonly   a field in SS whose route key nothing reads   -> expect 1 write-only
     --inject=notinss     a field the merge would never apply            -> expect 1 not-in-SS
   Both must move the corresponding counter off zero. */
const inject = (process.argv.find((a) => a.startsWith("--inject=")) || "").split("=")[1];
if (inject === "writeonly") { fields.push({ k: "zzInjectedWriteOnly", label: "injected" }); SS.add("zzInjectedWriteOnly"); }
if (inject === "notinss") { fields.push({ k: "zzInjectedNotInSS", label: "injected" }); }
if (inject) console.log(`!! injection active: ${inject}\n`);

console.log(`contribute fields offered : ${fields.length}`);
console.log(`SS allow-list entries     : ${SS.size}`);
console.log(`M rename entries          : ${Object.keys(M).length}\n`);

const notInSS = [], noReader = [], ok = [];
for (const f of fields) {
  if (!SS.has(f.k)) { notInSS.push(f); continue; }
  const routeKey = M[f.k] || f.k;
  // A reader is any use of the key that is not the FIELDS declaration or the M map itself.
  const uses = [...all.matchAll(new RegExp(String.raw`(?:route|r|x|selRoute|out|o)\s*\.\s*${routeKey}\b|\b${routeKey}\s*:`, "g"))].length;
  const readSites = [...all.matchAll(new RegExp(String.raw`\.\s*${routeKey}\b`, "g"))].length;
  (readSites > 0 ? ok : noReader).push({ ...f, routeKey, uses, readSites });
}

console.log(`OFFERED BUT NOT IN THE SS ALLOW-LIST — submitting these can never update the route: ${notInSS.length}`);
for (const f of notInSS) console.log(`   ${f.k.padEnd(16)} "${f.label}"`);

console.log(`\nNO READ SITE for the route key it writes — write-only field: ${noReader.length}`);
for (const f of noReader) console.log(`   ${f.k.padEnd(16)} -> route.${f.routeKey.padEnd(16)} "${f.label}"`);

console.log(`\nreads back OK: ${ok.length}`);
process.exitCode = 0;
