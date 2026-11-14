// Read-only: pairs of routes on ONE area that may be one climb filed under two names (the name-key
// guard, check:catalog-duplicates, cannot see these). Signals, each scored:
//   same recorded track; one name inside the other; shared distinctive name words; overview/beta text
//   sharing most content words; same discipline + grade. Writes candidates for research, decides nothing.
// Usage: node same-climb-census.mjs <state prefix, e.g. wa> <out.json>
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
const [st = "wa", out = "same-climb-candidates.json"] = process.argv.slice(2);
// two phases, so the database never scans 300k rows carrying their prose: names everywhere, then
// text + tracks only for ALPINE areas holding 2+ routes, fetched by area_id (indexed)
const rows = (await selectAll("routes", "id,area_id,name,grade,discipline,fa", `id=gte.${st}_&id=lt.${st.slice(0,-1)}${String.fromCharCode(st.charCodeAt(st.length-1)+1)}`, { pageSize: 500 })).filter(r => r.id.startsWith(st + "_"));
{
  const n = new Map(); for (const r of rows) if (!/sport|trad|toprope|boulder/.test(r.discipline || "")) n.set(r.area_id, (n.get(r.area_id) || 0) + 1);
  const areas = [...n].filter(([, c]) => c >= 2).map(([a]) => a), text = new Map();
  for (let i = 0; i < areas.length; i += 8) {
    for (const t of await selectAll("routes", "id,overview,beta,gpx", `area_id=in.(${areas.slice(i, i + 8).map(encodeURIComponent).join(",")})`, { pageSize: 200 })) text.set(t.id, t);
    await new Promise(r => setTimeout(r, 400));
  }
  for (const r of rows) Object.assign(r, text.get(r.id) || {});
  console.log(`alpine areas with 2+ routes: ${areas.length}, rows with text: ${text.size}`);
}
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const GEN = new Set("the route via of and on to a ridge face side standard normal north south east west ne nw se sw northeast northwest southeast southwest couloir glacier gully slope slopes scramble peak mountain mt mount direct variation var left right upper lower main".split(" "));
const STOP = new Set("about above after along also from have here into just more most only other over same some such than that their them then there these they this those through very well were what when where which while with would your route climb climbs summit trail feet ft".split(" "));
const cw = s => new Set(norm(s).split(" ").filter(w => w.length >= 4 && !STOP.has(w)));
const distinct = s => new Set(norm(s).split(" ").filter(w => w.length >= 3 && !GEN.has(w)));
const sim = (A, B) => { if (A.size < 6 || B.size < 6) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.min(A.size, B.size); };
const cat = d => /sport|trad|toprope|boulder/.test(d || "") ? "rock" : "alp";
const byArea = new Map(); for (const r of rows) (byArea.get(r.area_id) || byArea.set(r.area_id, []).get(r.area_id)).push(r);
const cands = [];
for (const [a, rs] of byArea) {
  if (rs.length < 2) continue;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const x = rs[i], y = rs[j], why = []; let s = 0;
    if (cat(x.discipline) !== cat(y.discipline)) continue;
    if (Array.isArray(x.gpx) && x.gpx.length > 20 && JSON.stringify(x.gpx) === JSON.stringify(y.gpx)) { s += 3; why.push("same track"); }
    const nx = norm(x.name), ny = norm(y.name);
    if (nx.length > 3 && ny.length > 3 && (nx.includes(ny) || ny.includes(nx))) { s += 2; why.push("name inside name"); }
    const dx = distinct(x.name), dy = distinct(y.name); const sh = [...dx].filter(w => dy.has(w));
    if (sh.length && sh.length === Math.min(dx.size, dy.size)) { s += 2; why.push("distinctive name words " + sh.join(",")); }
    const t = sim(cw([x.overview, x.beta].join(" ")), cw([y.overview, y.beta].join(" ")));
    if (t >= 0.6) { s += t >= 0.75 ? 3 : 2; why.push("text " + t.toFixed(2)); }
    if (x.grade && x.grade === y.grade) { s += 1; why.push("same grade"); }
    if (x.fa && y.fa && norm(x.fa).slice(0, 25) === norm(y.fa).slice(0, 25)) { s += 1; why.push("same FA"); }
    if (s >= 4) cands.push({ area_id: a, score: s, why, a: { id: x.id, name: x.name, grade: x.grade, discipline: x.discipline }, b: { id: y.id, name: y.name, grade: y.grade, discipline: y.discipline } });
  }
}
cands.sort((p, q) => q.score - p.score);
fs.writeFileSync(out, JSON.stringify(cands, null, 1));
console.log(`routes ${rows.length}, areas ${byArea.size}, candidate pairs ${cands.length} -> ${out}`);
const by = {}; for (const c of cands) by[c.score] = (by[c.score] || 0) + 1; console.log("by score", by);
for (const c of cands.slice(0, 25)) console.log(c.score, c.a.id, "|", c.a.name, "<>", c.b.id, "|", c.b.name, "::", c.why.join("; "));
