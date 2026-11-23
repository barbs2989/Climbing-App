import { selectAll } from "file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs";
import fs from "fs";
const j = JSON.parse(fs.readFileSync("research/audit-r7y.json", "utf8"));
const open = j.findings.filter(x => x.verdict === "SUMMIT_ONLY").map(x => x.id);
const rows = []; for (let i = 0; i < open.length; i += 30) rows.push(...await selectAll("routes", "id,area_id,approach,approach_logistics,road", `id=in.(${open.slice(i, i + 30).join(",")})`));
const areas = [...new Set(rows.map(r => r.area_id))];
const sib = []; for (let i = 0; i < areas.length; i += 30) sib.push(...await selectAll("routes", "id,area_id,approach_logistics", `area_id=in.(${areas.slice(i, i + 30).join(",")})&approach_logistics->>trailheadLat=not.is.null`));
const m = (a, b) => Math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * Math.cos(a[0] * Math.PI / 180));
const out = [];
for (const a of areas) {
  const s = sib.filter(x => x.area_id === a).map(x => ({ id: x.id, n: x.approach_logistics.trailhead, p: [+x.approach_logistics.trailheadLat, +x.approach_logistics.trailheadLng] }));
  const mine = rows.filter(r => r.area_id === a);
  if (!s.length) { out.push({ a, verdict: "NO_SIBLINGS", open: mine.map(r => r.id) }); continue; }
  const spread = Math.max(...s.map(x => Math.max(...s.map(y => m(x.p, y.p)))));
  out.push({ a, verdict: spread <= 150 ? "UNANIMOUS" : "SPLIT", n: s.length, spread: Math.round(spread), names: [...new Set(s.map(x => x.n))].slice(0, 4), p: s[0].p, open: mine.map(r => ({ id: r.id, text: [r.approach, r.road && JSON.stringify(r.road), r.approach_logistics && JSON.stringify(r.approach_logistics)].filter(Boolean).join(" | ").slice(0, 200) })) });
}
fs.writeFileSync("uni8.json", JSON.stringify(out, null, 1));
for (const o of out.filter(o => o.verdict === "UNANIMOUS")) { console.log("##", o.a, "| siblings", o.n, "spread", o.spread, "m |", o.names.join(" / ")); for (const r of o.open) console.log("    ", r.id, "|", r.text); }
console.log("SPLIT", out.filter(o => o.verdict === "SPLIT").length, "NO_SIBLINGS", out.filter(o => o.verdict === "NO_SIBLINGS").length, "UNANIMOUS", out.filter(o => o.verdict === "UNANIMOUS").length);
