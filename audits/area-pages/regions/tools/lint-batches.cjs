// Lint region batches before applying: JSON parses, blurb length, pipeline voice, access words, sources.
// node lint-batches.js <batch files...>
const fs = require("fs");
const PIPE = /\b(catalog(ue)?|recorded|on record|researched|listed|in the app|database|our (data|stats|count)|the stats|input|entries)\b/i;
const ACCESS = /\b(closure|closed|permit|fee(?! demo)|pass required|parking (rules|lot rules)|landowner|private property|raptor|registration|opening hours)\b/i;
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
  // Coverage: with INR=<input dir>, every input region must be written or skipped, and nothing else may appear.
  const m = f.match(/batch-(r\d+)\.json$/);
  if (process.env.INR && m) {
    const inp = JSON.parse(fs.readFileSync(`${process.env.INR}/in-${m[1]}.json`, "utf8")).map(a => a.id);
    const seen = new Set([...Object.keys(b).filter(k => !k.startsWith("_")), ...Object.keys(b._skipped || {})]);
    const miss = inp.filter(i => !seen.has(i)), extra = [...seen].filter(i => !inp.includes(i));
    if (miss.length || extra.length) { bad++; console.log(`${m[1]}: missing ${miss.join(",") || "-"}; extra ${extra.join(",") || "-"}`); }
  }
}
console.log(bad ? `${bad} problem(s)` : "clean");
