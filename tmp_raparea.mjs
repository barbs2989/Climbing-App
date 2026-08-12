import { SUPABASE_URL, anonKey } from "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/approach-rappel-detail-sweep/scripts/lib/supabase-env.mjs";
const key = anonKey();
const a = process.argv[2];
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,pitches,grade,rappels&area_id=eq.${a}&limit=100`;
const res = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
const rows = await res.json();
if (!Array.isArray(rows)) { console.log(JSON.stringify(rows)); process.exit(0); }
for (const r of rows) console.log(r.id, "|", r.name, "| p=" + r.pitches, "|", r.grade, "| raps:", JSON.stringify(r.rappels));
