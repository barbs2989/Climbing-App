// Write a clear_line op file for routes whose drawn line follows the WRONG approach, taking expect_gpx from the
// live row so apply-pins still compare-and-sets. usage: node mk-clear-line.mjs <out name> <id>=<why> [...]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const A = new URL("../../../audits/route-leftovers/pins/out", import.meta.url).pathname;
const [name, ...pairs] = process.argv.slice(2);
const results = [];
for (const p of pairs) {
  const [id, why] = p.split("=");
  const [r] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=gpx&id=eq.${id}`, { headers: headers(key) })).json();
  if (!Array.isArray(r?.gpx)) { console.log("no line", id); continue; }
  results.push({ id, verdict: "confirmed", summary: why, pin_ops: [{ op: "clear_line", id, why, expect_gpx: r.gpx }] });
}
fs.writeFileSync(`${A}/${name}.json`, JSON.stringify({ results }));
console.log(results.length, "->", `${A}/${name}.json`);
