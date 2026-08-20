// What shape does `gear` hold on routes that have one? Writing a new value into a column
// without matching the shape its readers expect is how a populated column renders as nothing.
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade,pitches,gear&id=like.wa_*&gear=not.is.null&discipline=in.(trad,sport,alpine)&limit=14`, { headers: headers(k) });
const rows = await res.json();
for (const r of rows) console.log(`\n${r.id}  [${r.discipline} ${r.grade || "-"} ${r.pitches ?? "-"}p]\n   ${JSON.stringify(r.gear)}`);
