// Lint region batches before applying: JSON parses, blurb length, pipeline voice, access words, sources.
// node lint-batches.js <batch files...>
const fs = require("fs");
const PIPE = /\b(catalog(ue)?|recorded|on record|researched|listed|in the app|database|our (data|stats|count)|the stats|input|entries)\b/i;
const ACCESS = /\b(closure|closed|permit|fee|pass required|parking (rules|lot rules)|landowner|private property|raptor|registration|opening hours)\b/i;
const SRC = /\b(mountain ?project|guidebook|guidance|according to|source|thecrag|summitpost|openbeta|27crags|wikipedia)\b/i;
let bad = 0;
for (const f of process.argv.slice(2)) {
  let b; try { b = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`${f}: JSON ERROR ${e.message}`); bad++; continue; }
  for (const [id, e] of Object.entries(b)) {
    if (id.startsWith("_")) continue;
    const s = e.blurb || "", w = s.split(/\s+/).filter(Boolean).length, probs = [];
    if (w < 60 || w > 170) probs.push(`${w} words`);
    for (const [n, re] of [["pipeline", PIPE], ["access", ACCESS], ["source", SRC]]) { const m = s.match(re); if (m) probs.push(`${n}: "${m[0]}"`); }
    if (/!/.test(s)) probs.push("exclamation");
    if (!e.review || !Array.isArray(e.review.sources) || e.review.sources.length < 2) probs.push("fewer than 2 sources");
    if (!e._expect || !e._expect.name) probs.push("no _expect");
    if (probs.length) { bad++; console.log(`${f.split("/").pop()} ${id}: ${probs.join("; ")}`); }
  }
}
console.log(bad ? `${bad} problem(s)` : "clean");
