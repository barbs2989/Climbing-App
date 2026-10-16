// DEEP retry inputs: the retry pass's UNRESOLVED results (research/out/uNNN.json) -> research/in/vNNN.json, ~10 facts per file,
// each carrying what both passes found and the LIVE row.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const T = new URL("../../../audits/route-tab-contradictions", import.meta.url).pathname;
const byId = {};
for (const f of fs.readdirSync(`${T}/research/out`).filter(f => /^u\d+\.json$/.test(f))) {
  for (const r of JSON.parse(fs.readFileSync(`${T}/research/out/${f}`)).results || [])
    if (r.verdict === "unresolved") {
      // the first pass's evidence and sources ride along from the retry's own input file
      const first = (JSON.parse(fs.readFileSync(`${T}/research/in/${f}`)).find(x => x.id === r.id)?.contradictions || []).find(c => c.fact === r.fact) || {};
      (byId[r.id] ||= []).push({ fact: r.fact, prior_evidence: r.evidence, first_pass_evidence: first.prior_evidence ?? null, prior_correct_value: r.correct_value ?? null, sources_already_tried: [...new Set([...(first.sources_already_tried || []), ...(r.sources || [])])], from: f });
    }
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
files.forEach((f, i) => fs.writeFileSync(`${T}/research/in/v${String(i + 1).padStart(3, "0")}.json`, JSON.stringify(f, null, 1)));
console.log(`routes ${items.length}; facts ${items.reduce((a, b) => a + b.contradictions.length, 0)} -> v001..v${String(files.length).padStart(3, "0")}`);
