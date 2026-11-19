const { selectAll, requireServiceKey } = await import("file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs");
const key = requireServiceKey();
const want = { ny_couchsachraga_peak_via_santanoni_ridge:"upper works", ny_mount_marshall_herbert_brook_herd_path:"upper works", ny_mount_redfield_uphill_brook_herd_path:"upper works", ny_panther_peak_panther_brook_herd_path:"upper works" };
const rows = await selectAll("routes", "*", `id=in.(${Object.keys(want).map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 });
for (const r of rows) { console.log("\n##", r.id, "->", want[r.id]);
  for (const [k, v] of Object.entries(r)) { if (v == null || /^(id|waypoints|gpx)/.test(k)) continue; const s = typeof v === "string" ? v : JSON.stringify(v); const low = s.toLowerCase();
    let i = low.indexOf(want[r.id]); if (i >= 0) console.log("  [" + k + "]", s.slice(Math.max(0, i - 160), i + 120).replace(/\s+/g, " "));
    const oth = s.match(/[A-Z][\w'.-]+(?: [A-Z][\w'.-]+)* (?:Trailhead|trailhead|TH)\b/g); if (oth) { const o = [...new Set(oth)].filter(x => !x.toLowerCase().includes(want[r.id])); if (o.length) console.log("    other THs in", k + ":", o.slice(0, 4).join(" | ")); } } }
