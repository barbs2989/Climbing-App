// Find every keyword match run over ENRICHED PROSE that cannot see a negation.
//
// This bug class has now bitten three times:
//   RACK_NEG   "ice screws are not worth carrying" advertising ice screws
//   +x||0      "no approach data" and "a zero approach" collapsing to the same value (#641)
//   _pmSays    "not Mount Rainier NP" linking 1,282 routes to Mount Rainier (#694)
//
// The catalog's enrichment writes disclaimers *because* it is being careful — "None - no
// climbing fee (National Forest, not Mount Rainier NP)", "protected with rock gear, not
// screws", "no fixed rappel anchors down the couloir itself". So a naive `.test()` over that
// prose is MOST likely to be wrong on the best-researched rows.
//
// Reports rather than fixes: whether a match is dangerous depends on what it drives.
//
// RESULT, 2026-08-08 — the class is largely already handled, which is the useful answer:
//   needsRopedGlacierTravel()  already checks "\b(no|not|non-technical|none)\b … rope" FIRST
//   rackAffirmed / rackMentions already guard the rack (per-occurrence)
//   _pmSays                    now guards the permit links (#694)
//
// The one remaining negation-blind match over prose is routeHasGlacierTravel(), and it was
// measured rather than assumed: of 344 alpine-family routes matching a glacier keyword,
// exactly 2 have EVERY mention negated (wa_mesahchie_peak_west_ridge — "the standard lines
// need no rope or glacier travel" — and wa_castle_peak_tatoosh_southeast_face). It also fails
// in the SAFE direction: it over-warns, showing glacier guidance on a route that says it
// avoids the glacier, rather than hiding it from one that needs it. Two routes, erring
// cautious, is not worth editing safety copy for. Left alone deliberately.
//
// Re-run this after any enrichment batch: the risk grows with the prose, not with the code.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

// "../.." not "..": this file lives in scripts/oneoff/, so ".." is scripts/ — which SKIP
// excludes, so the walk found zero .jsx files and the audit reported a clean sweep.
const ROOT = new URL("../..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts", "audits"]);
const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    if (SKIP.has(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(n)) out.push(p);
  }
  return out;
};

// Route/area fields whose values are free prose written by the enrichment pipeline.
const PROSE = ["access", "fees", "permit", "permits", "hazards", "objHaz", "obj_haz", "gear",
  "rack", "detailedRack", "detailed_rack", "proNeeds", "pro_needs", "approach", "descent",
  "descentText", "descent_text", "overview", "beta", "notes", "note", "watchOut", "watch_out",
  "comms", "bail", "turnaround", "season", "bestSeason", "best_season", "landManager",
  "land_manager", "corrections", "summary", "desc", "text", "rappels", "condWindow"];
const proseRe = new RegExp("\\b(" + PROSE.join("|") + ")\\b");
// The negation vocabulary a guard would have to look for.
const NEGWORD = /\b(not|no|never|without|rather than|instead of|other than|outside|except|excluding|unlike|seldom|rarely|unnecessary)\b/i;

const FILES = walk(ROOT);
if (FILES.length < 5) { console.error(`only ${FILES.length} source file(s) found under ${ROOT} — the walk is wrong, not the code clean.`); process.exit(1); }
console.log("scanning " + FILES.length + " source files");
const hits = [];
for (const f of FILES) {
  const src = readFileSync(f, "utf8");
  const rel = relative(ROOT, f);
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); } catch { continue; }

  traverse(ast, {
    CallExpression(path) {
      const c = path.node.callee;
      // X.test(Y) / Y.match(X) / Y.includes(X) / Y.indexOf(X)
      const m = c.type === "MemberExpression" && c.property && c.property.name;
      if (!["test", "match", "includes", "indexOf", "search"].includes(m)) return;
      const code = src.slice(path.node.start, path.node.end);
      if (code.length > 600) return;
      // The haystack: the argument for .test(), the object for the rest.
      const hay = m === "test" ? path.node.arguments[0] : c.object;
      if (!hay) return;
      const hayCode = src.slice(hay.start, hay.end);
      // Only interested when the haystack is built from enriched prose fields.
      // Resolve one level of indirection: `var low=rackAffirmed(rack).join(" ")...; NEG.test(low)`.
      // Look the binding up anywhere in the file — these files put whole components on ONE
      // line, so a byte-window around the call is not a meaningful scope.
      let why = null;
      if (proseRe.test(hayCode)) why = "direct";
      else if (/^[_a-zA-Z][\w.]*$/.test(hayCode)) {
        const decl = src.match(new RegExp("(?:var|const|let)\\s+" + hayCode.replace(/\./g, "\\.") + "\\s*=[^;\n]{0,400}"));
        if (decl && proseRe.test(decl[0])) why = "via " + hayCode;
      }
      if (!why) return;
      // Already negation-aware? These are the guards that exist today.
      const guarded = /RACK_NEG|PERMIT_NEG|_pmSays|rackMentions|rackAffirmed|NEG\./.test(code);
      hits.push({ file: rel, line: path.node.loc.start.line, guarded, why, hay: hayCode.slice(0, 50), code: code.replace(/\s+/g, " ").slice(0, 130) });
    },
  });
}

const bare = hits.filter((h) => !h.guarded);
console.log("keyword matches over enriched prose:", hits.length);
console.log("  already negation-aware:", hits.length - bare.length);
console.log("  NOT negation-aware:    ", bare.length);
console.log("\n--- not negation-aware ---");
for (const h of bare) console.log(`  ${(h.file + ":" + h.line).padEnd(30)} hay=${h.hay}\n      ${h.code}`);
console.log("\nNegation vocabulary a guard must cover: " + NEGWORD.source);
