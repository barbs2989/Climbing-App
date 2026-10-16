// Of the 23 WA routes naming a trailhead with no coordinate, how many name one that ANOTHER route
// already holds a coordinate for? Those are fillable by copying — no research, nothing invented.
import { selectAll } from "../lib/supabase-env.mjs";

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };
// Compare on the DISTINCTIVE words only. "Trailhead", "campground", a road number in brackets and
// the like are shared by half the catalog and would match unrelated places.
const STOP = new Set(["trailhead", "th", "campground", "camp", "road", "rd", "trail", "the", "and", "to",
  "from", "off", "via", "end", "spur", "pullout", "parking", "lot", "area", "access", "no", "separate"]);
const key = s => [...new Set(String(s || "").toLowerCase().match(/[a-z]{3,}/g) || [])].filter(t => !STOP.has(t)).sort().join(" ");

const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics", "", { pageSize: 1000 });
const areas = new Map((await selectAll("areas", "id,path", "", { pageSize: 1000 })).map(a => [a.id, a]));
const inWa = r => { const a = areas.get(r.area_id); return a && String(a.path || "").split(".").includes("washington"); };

const donors = new Map(); // key -> [{id, name, lat, lng}]
const needy = [];
for (const r of rows) {
  if (!inWa(r)) continue;
  const al = r.approach_logistics || {};
  const w = (Array.isArray(r.waypoints) ? r.waypoints : []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const nm = al.trailhead || (w && w.name);
  const lat = num(al.trailheadLat) ?? (w ? num(w.lat) : null);
  const lng = num(al.trailheadLng) ?? (w ? num(w.lng) : null);
  if (!nm) continue;
  const k = key(nm);
  if (!k) continue;
  if (lat !== null && lng !== null) {
    if (!donors.has(k)) donors.set(k, []);
    donors.get(k).push({ id: r.id, name: nm, lat, lng });
  } else needy.push({ id: r.id, name: nm, k });
}

let fillable = 0, spread = 0;
console.log(`${needy.length} WA routes name a trailhead with no coordinate\n`);
for (const n of needy) {
  const d = donors.get(n.k) || [];
  if (!d.length) { console.log(`   no donor   ${n.id.padEnd(44)} "${String(n.name).slice(0, 46)}"`); continue; }
  // A donor set that disagrees with itself cannot settle anything — measure it, do not assume.
  let max = 0;
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) max = Math.max(max, hav(d[i].lat, d[i].lng, d[j].lat, d[j].lng));
  const ok = max <= 500;
  if (ok) fillable++; else spread++;
  console.log(`   ${ok ? "FILLABLE" : "donors disagree"}  ${n.id.padEnd(44)} "${String(n.name).slice(0, 40)}"  ${d.length} donor(s), spread ${Math.round(max)} m`);
}
console.log(`\n${fillable} fillable by copy · ${spread} whose donors disagree with each other · ${needy.length - fillable - spread} with no donor at all`);
