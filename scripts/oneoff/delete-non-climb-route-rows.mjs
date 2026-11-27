// Deletes route rows that are not climbs (an import filed two photo-gallery LINKS as ice routes,
// "Photos from Winter 2023-24" WI1, under "A Link to Ice Report & Photos 2025", NH). PRODUCTION WRITE.
// A row is deleted only when EVERY table holding a route_id (SUPABASE_SCHEMA.sql) has zero rows for it,
// read with the service key just before; the full row is saved to the rollback file first.
//   node scripts/oneoff/delete-non-climb-route-rows.mjs --rollback <file.json> [--dry] <route_id>...
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const rb = args[args.indexOf("--rollback") + 1];
const dry = args.includes("--dry");
const ids = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--rollback");
if (!rb || !ids.length) throw new Error("usage: --rollback <file.json> [--dry] <route_id>...");
const key = requireServiceKey();
const TABLES = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "review_ai_verdicts", "review_worklist", "route_base_checkins", "route_base_pin_changes", "route_difficulty_ratings", "route_field_confidence", "route_field_evidence", "route_flags", "route_partner_listings", "route_ratings", "route_views", "topo_lines", "topos", "user_itineraries"];
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(key), signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`GET ${p} -> ${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const saved = [];
for (const id of ids) {
  const [row] = await get(`routes?select=*&id=eq.${encodeURIComponent(id)}`);
  if (!row) { console.log("gone:", id); continue; }
  const refs = [];
  for (const t of TABLES) if ((await get(`${t}?select=route_id&route_id=eq.${encodeURIComponent(id)}&limit=1`)).length) refs.push(t);
  if (refs.length) { console.log("HELD", id, "referenced by", refs.join(",")); continue; }
  saved.push(row);
  fs.writeFileSync(rb, JSON.stringify(saved, null, 1));
  if (dry) { console.log("would delete", id); continue; }
  await new Promise(r => setTimeout(r, 1000));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }), signal: AbortSignal.timeout(30000) });
  const out = r.ok ? await r.json() : await r.text();
  console.log(r.ok && out.length === 1 ? "deleted" : "FAILED", id, r.ok ? "" : String(out).slice(0, 200));
}
