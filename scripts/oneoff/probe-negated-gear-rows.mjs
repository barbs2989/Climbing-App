// The three packing-list entries that really are not gear, with the columns a repair would
// move them to. 8 of the probe's 11 flags are correct entries whose justification merely
// contains a negation ("headlamp — long days are common even for parties that don't get
// lost"), so this prints the row rather than trusting the flag. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const IDS = ["wa_cordwood", "wa_moss_out_for_harambe", "wa_you_moss_be_joking"];
const SEL = "id,name,discipline,what_to_bring,gear,approach,overview,watch_out,hazards,beta,description";
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();
for (const r of rows) {
  console.log(`\n############ ${r.id} — ${r.name}  (${r.discipline})`);
  for (const c of ["what_to_bring", "gear", "approach", "overview", "watch_out", "hazards", "beta", "description"]) {
    const v = r[c];
    if (v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) { console.log(`  ${c}: —`); continue; }
    console.log(`  ${c}: ${typeof v === "string" ? v : JSON.stringify(v, null, 1)}`);
  }
}
