// Reads the DUPLICATE / PART_OF verdicts (audits/route-grades/deep/out/i*.json), turns them into
// drop -> keep pairs, and reads both rows of each pair plus every row elsewhere that points at the
// dropped id. Read-only: it writes the plan to audits/route-grades/deep/merge-plan.json for
// route-identity-merge.mjs to apply.
//   node scripts/oneoff/route-identity-merge-plan.mjs
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const D = "audits/route-grades/deep/out/";
const all = fs.readdirSync(D).filter(f => /^i\d+\.json$/.test(f)).sort().flatMap(f => JSON.parse(fs.readFileSync(D + f, "utf8")));
// Every table holding a route id (live information_schema, 2026-10-01). user_lists holds an array.
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "route_difficulty_ratings", "topo_lines", "user_itineraries"];

const pairs = new Map();
for (const r of all) {
  if (!["DUPLICATE", "PART_OF"].includes(r.verdict)) continue;
  const keep = r.verdict === "PART_OF" ? r.parent_id : r.keep_id;
  const drop = r.verdict === "PART_OF" ? r.id : (r.merge_id || r.id);
  if (!keep || !drop || keep === drop) { console.log("SKIP malformed", r.id, keep, drop); continue; }
  const prev = pairs.get(drop);
  if (prev && prev.keep !== keep) console.log("CONFLICT", drop, prev.keep, keep);
  if (!prev || r.confidence === "high") pairs.set(drop, { drop, keep, verdict: r.verdict, confidence: r.confidence, evidence: r.evidence });
}
const get = async (path) => { const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) }); if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`); return res.json(); };
const ids = [...new Set([...pairs.values()].flatMap(p => [p.drop, p.keep]))];
const rows = await get(`routes?select=id,name,area_id,grade,areas(name)&id=in.(${ids.map(encodeURIComponent).join(",")})`);
const by = Object.fromEntries(rows.map(r => [r.id, r]));
const dropIds = [...pairs.keys()];
const refs = {};
for (const t of REFS) refs[t] = await get(`${t}?select=*&route_id=in.(${dropIds.map(encodeURIComponent).join(",")})`);
const lists = await get(`user_lists?select=id,route_ids&route_ids=ov.{${dropIds.join(",")}}`);

const plan = [];
for (const p of pairs.values()) {
  const d = by[p.drop], k = by[p.keep];
  const n = Object.fromEntries(REFS.map(t => [t, refs[t].filter(x => x.route_id === p.drop).length]).filter(([, c]) => c));
  const nl = lists.filter(l => l.route_ids.includes(p.drop)).length;
  if (nl) n.user_lists = nl;
  const flag = !d ? "DROP-MISSING" : !k ? "KEEP-MISSING" : d.area_id !== k.area_id ? "AREA-DIFF" : "";
  console.log(`${p.verdict} ${p.confidence} | ${p.drop} [${d ? `${d.name} @${d.areas?.name}` : "-"}] -> ${p.keep} [${k ? `${k.name} @${k.areas?.name}` : "-"}] ${flag} ${JSON.stringify(n)}`);
  plan.push({ ...p, flag, drop_row: d || null, keep_row: k || null, refs: n });
}
fs.writeFileSync("audits/route-grades/deep/merge-plan.json", JSON.stringify(plan, null, 1));
console.log(`\n${plan.length} pairs; refs total`, Object.fromEntries([...REFS.map(t => [t, refs[t].length]), ["user_lists", lists.length]]));
