// An array column is only safe for a line-per-entry editor if its ELEMENTS are strings.
// whatToBring/watchOut are string[]; an array of objects is a structured list and a textarea
// would flatten it to "[object Object]" — the #780 shape.
import { SUPABASE_URL, anonKey as anonKeyFn } from "../lib/supabase-env.mjs";
const url = SUPABASE_URL, key = anonKeyFn();

for (const col of ["approach_variants", "climbing_route", "bivy", "pro_tips", "rappel_detail", "what_to_bring"]) {
  let rows = [];
  for (let a = 0; a < 4 && !rows.length; a++) {
    try {
      const r = await fetch(`${url}/rest/v1/routes?select=id,${col}&${col}=not.is.null&limit=30`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(25000) });
      if (r.ok) rows = await r.json(); else await new Promise((s) => setTimeout(s, 400 * 2 ** a));
    } catch { await new Promise((s) => setTimeout(s, 400 * 2 ** a)); }
  }
  if (!rows.length) { console.log(`${col}: READ FAILED`); continue; }
  const els = rows.flatMap((r) => Array.isArray(r[col]) ? r[col] : []);
  const kinds = [...new Set(els.map((e) => e && typeof e === "object" ? `object{${Object.keys(e).join(",")}}` : typeof e))];
  console.log(`\n${col}  (${rows.length} rows, ${els.length} elements)`);
  for (const k of kinds.slice(0, 5)) console.log("   " + k);
  const sample = els[0];
  console.log("   e.g. " + JSON.stringify(sample).slice(0, 130));
}
