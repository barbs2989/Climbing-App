// Read-only probe for the route-audit sweep. Queries by name (trigram-indexed) rather than
// `id=like.wa_*`, which times out on the 200k-row routes table — see CLAUDE.md on the anon
// role's 3s statement_timeout.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
async function q(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) });
  const t = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
}

const ids = process.argv.slice(2);
if (!ids.length) { console.error("usage: probe-route-audit.mjs <routeId|areaName:...> ..."); process.exit(1); }

for (const spec of ids) {
  let rows;
  if (spec.startsWith("area:")) {
    const areas = await q(`areas?select=id,name&name=ilike.*${encodeURIComponent(spec.slice(5))}*&limit=10`);
    rows = [];
    for (const a of areas) rows.push(...await q(`routes?select=*&area_id=eq.${encodeURIComponent(a.id)}&limit=60`));
  } else {
    rows = await q(`routes?select=*&id=eq.${encodeURIComponent(spec)}`);
  }
  for (const r of rows) {
    console.log("\n================ " + r.id + " — " + r.name + " (" + r.discipline + ") ================");
    for (const k of ["rappels", "rappel_detail", "rappel_count_note", "descent", "descent_text",
      "hazards", "obj_haz", "watch_out", "seasonal_hazards", "timing", "gear", "detailed_rack",
      "what_to_bring", "assumed_gear", "gear_bucket", "rack", "waypoints", "lists", "classic"]) {
      const v = r[k];
      if (v == null || (Array.isArray(v) && !v.length)) continue;
      console.log("--- " + k + ":");
      console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
    }
  }
}
