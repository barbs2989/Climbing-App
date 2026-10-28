// Read-only. Lists every route in an id-prefix range (wa_ by default) that is alpine, mountaineering or
// scrambling, with its stored timing and walk inputs. A whole-table filter on timing hits the statement
// timeout, so this walks the primary key in pages and filters in JS. Route time audit, 2026-10-28.
// Usage: node scripts/oneoff/list-timed-routes.mjs --prefix wa_ --out file.json
import "../lib/load-env.mjs";
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const prefix = flag("--prefix", "wa_");
const outFile = flag("--out", null);
const hi = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
const SELECT = "id,name,area_id,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing";
const FAMILY = new Set(["alpine", "mountaineering", "scrambling", "scramble"]);

const out = [];
let last = prefix;
for (let page = 0; page < 2000; page++) {
  const q = `${SUPABASE_URL}/rest/v1/routes?select=${SELECT}&id=gt.${encodeURIComponent(last)}&id=lt.${encodeURIComponent(hi)}&order=id.asc&limit=500`;
  const res = await fetch(q, { headers: headers(anonKey()) });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET routes -> ${res.status} ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  if (!rows.length) break;
  for (const r of rows) if (FAMILY.has(r.discipline)) out.push(r);
  last = rows[rows.length - 1].id;
  await new Promise((ok) => setTimeout(ok, 250)); // gentle on the database
}
const timed = out.filter((r) => r.timing && ["totalHrs", "summitTimeHrs", "approachTimeHrs", "descentTimeHrs"].some((k) => r.timing[k] != null));
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`${out.length} alpine-family routes under ${prefix}; ${timed.length} store at least one time`);
