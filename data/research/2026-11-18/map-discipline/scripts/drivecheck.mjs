import fs from "fs";
const { selectAll, requireServiceKey } = await import("file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs");
const key = requireServiceKey(); const b = JSON.parse(fs.readFileSync("batch.json"));
const ids = Object.keys(b).filter(i => b[i].set.approach_logistics);
const rows = await selectAll("routes", "*", `id=in.(${ids.map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 });
for (const r of rows) { console.log("\n##", r.id, "| stored TH:", JSON.stringify(r.approach_logistics));
  for (const [k, v] of Object.entries(r)) { if (k === "approach_logistics" || v == null) continue; const s = typeof v === "string" ? v : JSON.stringify(v);
    const hits = s.match(/[^.;"]{0,90}(trail ?head|parking|road end|roads end|lot\b|drive)[^.;"]{0,90}/gi); if (hits) console.log("  ", k + ":", hits.slice(0, 2).join(" … ").slice(0, 260)); } }
