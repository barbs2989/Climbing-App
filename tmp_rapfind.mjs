import { SUPABASE_URL, anonKey } from "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/approach-rappel-detail-sweep/scripts/lib/supabase-env.mjs";
const key = anonKey();
const q = process.argv[2];
const col = process.argv[3] || "name";
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,pitches,grade,rappels&${col}=ilike.*${encodeURIComponent(q)}*&limit=60`;
const res = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
const rows = await res.json();
if (!Array.isArray(rows)) { console.log(JSON.stringify(rows)); process.exit(0); }
for (const r of rows) console.log(r.id, "|", r.name, "|", r.area_id, "| p=" + r.pitches, "|", r.grade);
