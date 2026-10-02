// Applies the researched duplicate merges and PART_OF fold-ins from
// audits/route-grades/deep/merge-plan.json (built by route-identity-merge-plan.mjs): deletes the
// duplicate row, after copying onto the kept row the one fact the research says to carry.
//
// Held back, NOT deleted:
//   - low confidence (Fortress NE face);
//   - rows whose verdict says their own beta must first be written into the kept page as a variation,
//     approach or conditions note — deleting them now would lose that prose (HOLD below).
// Facts found only on a dropped row are NOT copied wholesale: most are the PEAK's first ascent or
// another face's tags, which the research says must not move. Only CARRY is copied, and only onto
// an empty column.
//
// Every table holding a route id (live information_schema, 2026-10-01) is re-checked at apply time;
// a dropped id with ANY row pointing at it is refused, since four of those tables cascade-delete.
// The full dropped rows are saved first, so every delete can be re-inserted.
//   node scripts/oneoff/route-identity-merge.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const plan = JSON.parse(fs.readFileSync("audits/route-grades/deep/merge-plan.json", "utf8"));
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "route_difficulty_ratings", "topo_lines", "user_itineraries"];
const HOLD = {
  wa_davis_peak_nc_southwest: "keep as a named Southwest Face variation; fold its face beta first",
  wa_little_tahoma_cowlitz_ingraham_glaciers: "keep as the Paradise approach to East Shoulder; fold first",
  wa_whatcom_peak_southwest_route: "its orbit/Perfect Pass beta becomes South Spur approach beta first",
  wa_whitehorse_mountain_r1: "its snow/ski-descent notes become NW Shoulder conditions beta first",
  wa_bears_breast_mountain_se_mega_slab: "its approach/slab beta folds into Infinite Beauty first",
  wa_southwest_scramble: "its detailed chute beta folds into Pinnacle Saddle / South Gully first",
};
const CARRY = {
  wa_summit_chief_north_face: ["pitches"],
  wa_mount_rahm_standard: ["fa"],
};
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length);
const get = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) }); if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`); return r.json(); };

const todo = [], held = [];
for (const p of plan) {
  if (p.confidence === "low") { held.push([p.drop, "low confidence"]); continue; }
  if (HOLD[p.drop]) { held.push([p.drop, HOLD[p.drop]]); continue; }
  todo.push(p);
}
const ids = [...new Set(todo.flatMap(p => [p.drop, p.keep]))];
const rows = Object.fromEntries((await get(`routes?select=*&id=in.(${ids.map(encodeURIComponent).join(",")})`)).map(r => [r.id, r]));
const dropIds = todo.map(p => p.drop);
const refCount = {};
for (const t of REFS) for (const x of await get(`${t}?select=route_id&route_id=in.(${dropIds.map(encodeURIComponent).join(",")})`)) refCount[x.route_id] = (refCount[x.route_id] || 0) + 1;
for (const l of await get(`user_lists?select=route_ids&route_ids=ov.{${dropIds.join(",")}}`)) for (const id of l.route_ids) if (dropIds.includes(id)) refCount[id] = (refCount[id] || 0) + 1;

const go = [];
for (const p of todo) {
  const d = rows[p.drop], k = rows[p.keep];
  if (!d) { held.push([p.drop, "already gone"]); continue; }
  if (!k) { held.push([p.drop, `kept row ${p.keep} missing`]); continue; }
  if (refCount[p.drop]) { held.push([p.drop, `${refCount[p.drop]} rows point at it`]); continue; }
  const carry = Object.fromEntries((CARRY[p.drop] || []).filter(c => !empty(d[c]) && empty(k[c])).map(c => [c, d[c]]));
  go.push({ ...p, d, k, carry });
}
for (const g of go) console.log(`DELETE ${g.drop} "${g.d.name}" -> ${g.keep} "${g.k.name}"${Object.keys(g.carry).length ? ` carry ${JSON.stringify(g.carry)}` : ""}`);
console.log(`\ndelete ${go.length} | held ${held.length}\n${held.map(h => `  HELD ${h.join(": ")}`).join("\n")}`);
if (DRY) process.exit(0);

const tag = Date.now();
const rb = `audits/route-grades/deep/rollback-merges-${tag}.json`;
fs.writeFileSync(rb, JSON.stringify({ deleted_rows: go.map(g => g.d), kept_before: Object.fromEntries(go.filter(g => Object.keys(g.carry).length).map(g => [g.keep, Object.fromEntries(Object.keys(g.carry).map(c => [c, g.k[c] ?? null]))])) }, null, 1));
console.log("rollback", rb);
for (const g of go) {
  if (Object.keys(g.carry).length) await patchRow("routes", g.keep, g.carry);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(g.drop)}`, { method: "DELETE", headers: { ...headers(key), Prefer: "return=representation" } });
  const out = r.ok ? await r.json() : null;
  if (!r.ok || out.length !== 1) throw new Error(`delete ${g.drop}: ${r.status} ${out ? `${out.length} rows` : await r.text()}`);
}
const left = await get(`routes?select=id&id=in.(${go.map(g => encodeURIComponent(g.drop)).join(",")})`);
const kept = await get(`routes?select=id&id=in.(${go.map(g => encodeURIComponent(g.keep)).join(",")})`);
console.log(`deleted ${go.length}; still present ${left.length}; kept rows present ${kept.length}/${new Set(go.map(g => g.keep)).size}`);
