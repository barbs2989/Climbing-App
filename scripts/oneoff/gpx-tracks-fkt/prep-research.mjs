// Turn candidates.json into research batches for route-identity reviewers.
//  - a pair the 2026-10-28 review REJECTED stays rejected (traverse, link-up, other line);
//  - a pair already written (decisions.json of 2026-10-28) is skipped;
//  - everything else (new, or "unclear" before) goes to research, with our route's own text and
//    the FKT page's text, so a reviewer can compare the LINE, not just the peak.
// Usage: node prep-research.mjs <fkt pages dir> [batch size]  -> research-data/gpx-tracks-fkt-wa-2026-10-29/batch-N.json
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const D = "research-data/gpx-tracks-fkt-wa-2026-10-29", OLD = "research-data/gpx-tracks-fkt-2026-10-28";
const [pdir, sizeArg] = process.argv.slice(2);
const SIZE = +sizeArg || 10;
const cands = JSON.parse(fs.readFileSync(`${D}/candidates.json`, "utf8"));
const old = [0, 1, 2, 3].flatMap(i => JSON.parse(fs.readFileSync(`${OLD}/verdict-${i}.json`, "utf8")));
const oldBy = new Map(old.map(v => [`${v.id}|${v.fktSlug}`, v]));
const written = new Set(JSON.parse(fs.readFileSync(`${OLD}/decisions.json`, "utf8")).map(d => `${d.id}|${d.slug}`));
const done = fs.existsSync(`${D}/verdicts.json`) ? JSON.parse(fs.readFileSync(`${D}/verdicts.json`, "utf8")) : [];
const doneBy = new Set(done.map(v => `${v.id}|${v.slug}`));
const todo = [], carried = [];
for (const c of cands) {
  const k = `${c.id}|${c.slug}`;
  if (written.has(k) || doneBy.has(k)) continue;
  const o = oldBy.get(k);
  if (o && o.verdict === "reject") { carried.push({ id: c.id, slug: c.slug, verdict: "reject", reason: `2026-10-28 review: ${o.reason}` }); continue; }
  todo.push(c);
}
const ids = [...new Set(todo.map(c => c.id))];
const text = {};
for (let i = 0; i < ids.length; i += 40) {
  const q = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${q})&select=id,name,area_id,grade,description,approach,descent_text`, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error(`read ${r.status}`);
  for (const row of await r.json()) text[row.id] = row;
  await new Promise(s => setTimeout(s, 500));
}
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#\d+;|&\w+;/g, " ").replace(/\s+/g, " ");
const items = todo.map(c => {
  const t = text[c.id] || {};
  const page = path.join(pdir, c.slug + ".html");
  const body = fs.existsSync(page) ? strip(fs.readFileSync(page, "utf8")) : "";
  const at = body.search(/Route Description|Description/i);
  return { id: c.id, slug: c.slug, fktUrl: `https://fastestknowntime.com/route/${c.slug}`, fktTitle: c.fktTitle, tier: c.tier, startM: c.startM, endM: c.endM, summitM: c.summitM,
    previous: oldBy.get(`${c.id}|${c.slug}`)?.reason || null,
    ours: { name: t.name, peak: t.area_id, grade: t.grade, description: String(t.description || "").slice(0, 700), approach: String(t.approach || "").slice(0, 700), descent: String(t.descent_text || "").slice(0, 400) },
    fktText: body.slice(Math.max(0, at), Math.max(0, at) + 1500) };
});
fs.writeFileSync(`${D}/carried-rejects.json`, JSON.stringify(carried, null, 1));
let n = 0;
for (let i = 0; i < items.length; i += SIZE) fs.writeFileSync(`${D}/batch-${++n}.json`, JSON.stringify(items.slice(i, i + SIZE), null, 1));
console.log(`pairs ${cands.length}; carried rejects ${carried.length}; to research ${items.length} in ${n} batches`);
