// Which state prefixes still hold alpine-type routes whose snow / glacier answer is unsettled?
// Read-only. Lists every route-id prefix that has a row in an alpine Conditions discipline and counts, per prefix,
// rows with glacier_travel or snow_in_season still null. Sizes the per-state review after the first seven states.
//   node scripts/oneoff/glacier-travel-states.mjs
import "../lib/load-env.mjs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { ALPINE_COND_DISCIPLINES } from "../../lib/alpineConditions.js";

const key = requireServiceKey();
const disc = `discipline=in.(${ALPINE_COND_DISCIPLINES.join(",")})`;
const count = async (filter) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&${filter}&limit=1`, { headers: Object.assign({}, headers(key), { Prefer: "count=exact", Range: "0-0" }) });
  if (!res.ok) throw new Error(filter + " -> " + res.status + " " + (await res.text()).slice(0, 200));
  const cr = res.headers.get("content-range") || "";
  await new Promise((r) => setTimeout(r, 200));
  return +(cr.split("/")[1] || 0);
};
// Walk the id space by its first id after each prefix: one cheap ordered read per prefix, not a full scan.
const prefixes = [];
let after = "";
for (let i = 0; i < 200; i++) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&${disc}&id=gt.${encodeURIComponent(after)}&order=id.asc&limit=1`, { headers: headers(key) });
  const rows = await res.json();
  if (!res.ok || !Array.isArray(rows)) throw new Error("walk -> " + res.status + " " + JSON.stringify(rows).slice(0, 200));
  if (!rows.length) break;
  const p = rows[0].id.split("_")[0];
  prefixes.push(p);
  after = p + "_￿";
  await new Promise((r) => setTimeout(r, 200));
}
const out = [];
for (const p of prefixes) {
  const scope = `id=like.${p}_*&${disc}`;
  const all = await count(scope);
  const open = await count(scope + "&or=(glacier_travel.is.null,snow_in_season.is.null)");
  out.push({ p, all, open });
}
out.sort((a, b) => b.all - a.all);
for (const r of out) console.log(`${r.p.padEnd(6)} ${String(r.all).padStart(5)} alpine-type routes, ${String(r.open).padStart(5)} with an unsettled answer`);
console.log(`prefixes: ${out.length}`);
