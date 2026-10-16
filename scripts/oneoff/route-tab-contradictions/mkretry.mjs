// Retry inputs for this half's UNRESOLVED results: research/in/uNNN.json, ~10 facts per file, each carrying what the
// first pass found (evidence + sources already tried) and the route's LIVE row (rows have changed since the snapshot).
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const T = new URL("../../../audits/route-tab-contradictions", import.meta.url).pathname;
const byId = {};
for (const f of fs.readdirSync(`${T}/research/out`).filter(f => /^r\d+\.json$/.test(f))) {
  for (const r of JSON.parse(fs.readFileSync(`${T}/research/out/${f}`)).results || [])
    if (r.verdict === "unresolved") (byId[r.id] ||= []).push({ fact: r.fact, prior_evidence: r.evidence, prior_correct_value: r.correct_value ?? null, sources_already_tried: r.sources || [], from: f });
}
const items = [];
for (const [id, cs] of Object.entries(byId)) {
  const [row] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json();
  if (!row) { console.log("gone", id, cs.length); continue; }
  items.push({ id, area: row.area_id, contradictions: cs, route: Object.fromEntries(Object.entries(row).filter(([k, v]) => v != null && !["gpx", "elev_pts", "name_search", "data_quality"].includes(k))) });
}
items.sort((a, b) => a.area.localeCompare(b.area));
const files = []; let cur = [], n = 0;
for (const it of items) { if (cur.length && n + it.contradictions.length > 10) { files.push(cur); cur = []; n = 0; } cur.push(it); n += it.contradictions.length; }
if (cur.length) files.push(cur);
files.forEach((f, i) => fs.writeFileSync(`${T}/research/in/u${String(i + 1).padStart(3, "0")}.json`, JSON.stringify(f, null, 1)));
console.log(`routes ${items.length}; facts ${items.reduce((a, b) => a + b.contradictions.length, 0)} -> u001..u${String(files.length).padStart(3, "0")}`);
