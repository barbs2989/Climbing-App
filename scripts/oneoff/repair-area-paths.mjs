// Repairs EVERY area whose path is not its parent's path + "." + its own id label (the stale prefixes
// left by the held Stairway to Heaven re-parent). Parents first, so each child is computed from a
// corrected parent. Each PATCH is preconditioned on the current bad path; 1 s pace.
import { loadEnv } from "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/discipline-areas-wrong-spot/scripts/lib/supabase-env.mjs";
const env = loadEnv(), url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function loadAll() {
  const all = []; let from = 0;
  for (;;) {
    const rows = await (await fetch(`${url}/rest/v1/areas?select=id,name,parent_id,path&order=id`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, "Range-Unit": "items" } })).json();
    all.push(...rows);
    if (rows.length < 1000) return all;
    from += 1000;
  }
}
const all = await loadAll();
const by = new Map(all.map(a => [a.id, a]));
const depth = a => (a.path || "").split(".").length;
const bad = all.filter(a => a.parent_id && by.get(a.parent_id) && a.path !== by.get(a.parent_id).path + "." + a.path.split(".").pop())
  .sort((x, y) => depth(x) - depth(y));
console.log("to repair", bad.length);
for (const a of bad) {
  const p = by.get(a.parent_id);
  const good = p.path + "." + a.path.split(".").pop();
  const r = await fetch(`${url}/rest/v1/areas?id=eq.${encodeURIComponent(a.id)}&path=eq.${encodeURIComponent(a.path)}`, { method: "PATCH", headers: H, body: JSON.stringify({ path: good }) });
  const rows = await r.json();
  if (!r.ok || !Array.isArray(rows) || rows.length !== 1) { console.log("STOP", a.id, r.status, JSON.stringify(rows).slice(0, 200)); process.exit(1); }
  by.get(a.id).path = good;
  await new Promise(res => setTimeout(res, 1000));
}
console.log("repaired", bad.length);
