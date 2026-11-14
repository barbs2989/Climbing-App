// Owner's to-do note, 2026-10-22: "Delete this boulder Don't Climb That She Said".
// One row, wa_don_t_climb_that_she_said (a V0+ boulder filed on wa_glacier_peak). Every table holding
// a route id was counted live before the delete and all were 0, so nothing cascades. The full row is
// saved first, so the delete can be re-inserted from audits/route-deletions/.
//   node scripts/oneoff/delete-route-dont-climb-that-she-said.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const ID = "wa_don_t_climb_that_she_said";
const key = requireServiceKey();
const get = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) }); if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`); return r.json(); };

const rows = await get(`routes?select=*&id=eq.${ID}`);
if (rows.length !== 1) { console.log(`${rows.length} rows with id ${ID} — nothing to do.`); process.exit(0); }
const row = rows[0];
if (row.area_id !== "wa_glacier_peak" || row.name !== "Don't Climb That She Said") throw new Error(`row is not the one researched: ${row.area_id} / ${row.name}`);
const REFS = ["climb_logs", "content_reports", "contributions", "crew_listings", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "route_difficulty_ratings", "route_field_confidence", "route_flags", "route_ratings", "topo_lines", "user_itineraries"];
for (const t of REFS) { const n = (await get(`${t}?select=route_id&route_id=eq.${ID}`)).length; if (n) throw new Error(`${n} ${t} rows point at ${ID} — refusing`); }
if ((await get(`user_lists?select=id&route_ids=cs.{${ID}}`)).length) throw new Error(`a user list holds ${ID} — refusing`);
const [areaBefore] = await get(`areas?select=route_count&id=eq.${row.area_id}`);
console.log(`DELETE ${ID} "${row.name}" (${row.grade}) on ${row.area_id}; area route_count ${areaBefore.route_count}`);
if (DRY) process.exit(0);

fs.mkdirSync("audits/route-deletions", { recursive: true });
const rb = `audits/route-deletions/rollback-${ID}.json`;
fs.writeFileSync(rb, JSON.stringify({ note: "Full row deleted 2026-10-22 on the owner's instruction. Re-insert with POST /rest/v1/routes.", row }, null, 1) + "\n");
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
const out = r.ok ? await r.json() : null;
if (!out || out.length !== 1) throw new Error(`delete ${ID}: ${r.status} ${out ? `${out.length} rows` : await r.text()}`);
const left = await get(`routes?select=id&id=eq.${ID}`);
const [areaAfter] = await get(`areas?select=route_count&id=eq.${row.area_id}`);
const truth = (await get(`routes?select=id&area_id=eq.${row.area_id}`)).length;
console.log(`deleted 1; still present ${left.length}; route_count ${areaBefore.route_count} -> ${areaAfter.route_count} (true count ${truth}); rollback ${rb}`);
