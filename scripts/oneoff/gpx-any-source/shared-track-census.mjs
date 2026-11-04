// Read-only: groups of routes on one area that store the SAME recorded track (dedupe.mjs sameTrack).
// One recording belongs to ONE route (owner, 2026-11-04); each group is a worklist to research, never a
// bulk fix. Usage: node shared-track-census.mjs <st> <out.json>
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
import { sameTrack } from "./dedupe.mjs";
import { haversineM } from "../gpx-tracks-fkt/rule.mjs";
const [st = "wa", out = "shared-tracks.json"] = process.argv.slice(2);
const hi = st.slice(0, -1) + String.fromCharCode(st.charCodeAt(st.length - 1) + 1);
const rows = (await selectAll("routes", "id,area_id,name,discipline", `id=gte.${st}_&id=lt.${hi}&gpx=not.is.null`, { pageSize: 500 })).filter(r => r.id.startsWith(st + "_"));
const n = new Map(); for (const r of rows) n.set(r.area_id, (n.get(r.area_id) || 0) + 1);
const areas = [...n].filter(([, c]) => c >= 2).map(([a]) => a);
const groups = [];
for (let i = 0; i < areas.length; i += 6) {
  const got = await selectAll("routes", "id,area_id,name,grade,discipline,gpx,waypoints", `area_id=in.(${areas.slice(i, i + 6).map(encodeURIComponent).join(",")})&gpx=not.is.null`, { pageSize: 100 });
  const by = new Map(); for (const r of got) (by.get(r.area_id) || by.set(r.area_id, []).get(r.area_id)).push(r);
  for (const [a, rs] of by) {
    const used = new Set();
    for (let x = 0; x < rs.length; x++) {
      if (used.has(x)) continue;
      const g = [x]; for (let y = x + 1; y < rs.length; y++) if (!used.has(y) && sameTrack(rs[x].gpx, rs[y].gpx)) g.push(y);
      if (g.length < 2) continue; g.forEach(k => used.add(k));
      const t = rs[x].gpx, sum = (rs[x].waypoints || []).find(w => /summit/i.test(w.type || ""));
      const top = t.reduce((m, p) => (+p[2] || 0) > (+m[2] || 0) ? p : m, t[0]);
      groups.push({ area_id: a, points: t.length, end_to_summit_m: sum ? Math.round(haversineM([+t[t.length - 1][0], +t[t.length - 1][1]], [+sum.lat, +sum.lng])) : null,
        high_to_summit_m: sum ? Math.round(haversineM([+top[0], +top[1]], [+sum.lat, +sum.lng])) : null,
        routes: g.map(k => ({ id: rs[k].id, name: rs[k].name, grade: rs[k].grade, discipline: rs[k].discipline })) });
    }
  }
  await new Promise(r => setTimeout(r, 400));
}
fs.writeFileSync(out, JSON.stringify(groups, null, 1));
console.log(`routes with a track ${rows.length}; areas with 2+ tracked routes ${areas.length}; shared-track groups ${groups.length}, routes in them ${groups.reduce((s, g) => s + g.routes.length, 0)} -> ${out}`);
for (const g of groups) console.log(`${g.area_id} [${g.points} pts, high pt ${g.high_to_summit_m} m from summit pin]: ${g.routes.map(r => r.name + " (" + r.grade + ")").join(" | ")}`);
