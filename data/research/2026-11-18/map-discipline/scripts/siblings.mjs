// Read-only: for each open peak route (SUMMIT_ONLY / NO_SUMMIT), every distinct trailhead its sibling routes pin,
// and whether the route's OWN text names exactly one of them.
import fs from "fs";
const { selectAll, requireServiceKey } = await import("file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs");
const key = requireServiceKey();
const audit = JSON.parse(fs.readFileSync("audit.json")).findings.filter(f => f.verdict !== "TRAILHEAD_AND_SUMMIT");
const ids = audit.map(f => f.id);
const own = []; for (let i = 0; i < ids.length; i += 40) own.push(...await selectAll("routes", "*", `id=in.(${ids.slice(i, i + 40).map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 }));
const areas = [...new Set(own.map(r => r.area_id))];
const sibs = []; for (let i = 0; i < areas.length; i += 40) sibs.push(...await selectAll("routes", "id,area_id,name,waypoints,approach_logistics", `area_id=in.(${areas.slice(i, i + 40).map(x => `"${x}"`).join(",")})`, { key, pageSize: 1000 }));
const J = v => typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return null; } })() : v;
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const GENERIC = new Set("trailhead trail head th parking lot area the of at and a to road rd lower upper main usfs fs fr forest service national park nps lot day use overflow access creek lake lakes peak mount mountain mt pass".split(" "));
const toks = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(t => t && !GENERIC.has(t) && !/^\d+$/.test(t));
const mainName = s => String(s || "").replace(/\(.*?\)/g, " ").split(/\s*[\/,;]\s*/)[0];
// the name's distinctive words, as a PHRASE in the text (not scattered words)
const phrase = s => { const w = String(mainName(s)).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\b(trail ?head|th|parking( lot)?|the)\b/g, " ").replace(/\s+/g, " ").trim(); return w; };
const out = [];
for (const r of own) {
  const al = J(r.approach_logistics) || {};
  // distinct sibling trailheads (cluster within 300 m)
  const ths = [];
  for (const s of sibs.filter(s => s.area_id === r.area_id && s.id !== r.id)) {
    const sa = J(s.approach_logistics) || {}; const w = (J(s.waypoints) || []).find(x => x && /trailhead/i.test(x.type || "") && x.lat != null);
    const p = sa.trailheadLat != null ? { name: sa.trailhead || (w && w.name), lat: +sa.trailheadLat, lng: +sa.trailheadLng, from: s.id, kind: "approach_logistics" } : w ? { name: w.name || sa.trailhead, lat: +w.lat, lng: +w.lng, from: s.id, kind: "pin" } : null;
    if (!p || !p.name) continue;
    const c = ths.find(t => m(t, p) < 300); if (c) { c.from.push(p.from); c.names.add(p.name); } else ths.push({ ...p, from: [p.from], names: new Set([p.name]) });
  }
  if (!ths.length) continue;
  const text = Object.entries(r).filter(([k, v]) => v != null && !/^(id|area_id|waypoints|gpx|gpx_track)$/.test(k)).map(([k, v]) => typeof v === "string" ? v : JSON.stringify(v)).join(" \n ").toLowerCase();
  const hit = ths.filter(t => [...t.names].some(n => { const p = phrase(n); return p.length >= 4 && toks(p).length && text.includes(p); }));
  out.push({ id: r.id, area: r.area_id, verdict: audit.find(f => f.id === r.id).verdict, storedTh: al.trailhead || null, ths: ths.map(t => ({ names: [...t.names], lat: t.lat, lng: t.lng, from: t.from })), named: hit.map(t => [...t.names][0]) });
}
fs.writeFileSync("siblings.json", JSON.stringify(out, null, 1));
const one = out.filter(o => o.named.length === 1), multi = out.filter(o => o.named.length > 1), none = out.filter(o => !o.named.length);
console.log(`open routes with sibling trailheads: ${out.length} · own text names exactly one: ${one.length} · several: ${multi.length} · none: ${none.length}`);
