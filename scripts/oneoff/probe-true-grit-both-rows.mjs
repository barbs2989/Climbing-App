// wa_true_grit (Postal Wall, Frenchman Coulee — sport 5.10c) stores prose describing a 5.8 trad
// line on Vesper Peak's north face. wa_true_grit_2 (Vesper Peak — alpine 5.8, beside Ragged Edge
// 5.7) is that route. So this is a name collision that reached a text column, and the target row
// is identified rather than guessed.
//
// Two repairs are possible and they are NOT the same: if the Vesper row already carries this
// prose, the Frenchman Coulee copy is a stray DUPLICATE and clearing it loses nothing; if it does
// not, the prose has to MOVE or it is destroyed. Print both rows in full before choosing.
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const SEL = "id,name,area_id,discipline,grade,pitches,length_m,overview,description,beta,approach,gear,rack,pitch_detail,what_to_bring,season,best_season,hazards,watch_out";
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(wa_true_grit,wa_true_grit_2)`, { headers: headers(k) })).json();
const areas = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,path&id=in.(${[...new Set(rows.map(r=>r.area_id))].join(",")})`, { headers: headers(k) })).json();
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const a = areas.find((x) => x.id === r.area_id);
  console.log(`\n############ ${r.id} — ${r.name}`);
  console.log(`  area:  ${a ? a.name : r.area_id}   [${a ? a.path : "?"}]`);
  console.log(`  is:    ${r.discipline} ${r.grade || "-"}  ${r.pitches ?? "-"}p  ${r.length_m ?? "-"}m`);
  for (const c of ["overview", "description", "beta", "approach", "gear", "rack", "pitch_detail", "what_to_bring", "season", "best_season", "hazards", "watch_out"]) {
    const v = r[c];
    if (v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) continue;
    console.log(`  ${c}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
}
