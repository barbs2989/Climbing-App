// Re-read the LIVE row for every route in research/in/<f>.json just before its research agent starts:
// other sessions edit these rows during the day, and research against a stale row is wasted.
// usage: node refresh.mjs r110 [r111 ...]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
const DROP = ["gpx", "elev_pts", "name_search", "data_quality"];
for (const f of process.argv.slice(2)) {
  const p = `${T}/research/in/${f}.json`, items = JSON.parse(fs.readFileSync(p));
  const ids = items.map(it => it.id);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  const rows = Object.fromEntries((await r.json()).map(x => [x.id, x]));
  let changed = 0;
  for (const it of items) {
    const row = rows[it.id]; if (!row) { it.route = null; continue; }
    const next = Object.fromEntries(Object.entries(row).filter(([k, v]) => v != null && !DROP.includes(k)));
    if (JSON.stringify(next) !== JSON.stringify(it.route)) changed++;
    it.route = next;
  }
  fs.writeFileSync(p, JSON.stringify(items, null, 1));
  console.log(f, "routes", items.length, "changed since snapshot", changed);
}
