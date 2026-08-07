// Audit: routes whose grade is a scramble CLASS grade but whose discipline is a
// crag discipline (trad/sport/bouldering) -> catOf() lands in cragOnly, which hides
// the Plan and Safety tabs entirely.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";

const CLASS_RE = /^\s*(?:ycds\s*)?(?:class\s*)?([1-5])(?:st|nd|rd|th)?(?:\s*class)?\s*$|^\s*class\s*[1-4]\b/i;
const isClassGrade = (g) => {
  if (!g) return false;
  const s = String(g).trim();
  if (/^5\.\d/.test(s)) return false;              // 5.10a etc — YDS technical
  if (/^(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?$/i.test(s)) return true;
  if (/^class\s*[1-4]\b/i.test(s)) return true;
  if (/^[1-4](?:st|nd|rd|th)\s*class$/i.test(s)) return true;
  return false;
};

const CRAG = new Set(["trad", "sport", "bouldering"]);
const catOf = (r) => r.discipline === "rock" ? String(r.style || "Trad").toLowerCase() : r.discipline;

console.log("scanning routes …");
const rows = await selectAll(
  "routes",
  "id,area_id,name,discipline,grade,grade_system,grade_num,rock_grade,pitches,length_m,gear,source,overview",
  null,
  { pageSize: 1000 }
);
console.log("routes scanned:", rows.length);

const hits = rows.filter((r) => CRAG.has(catOf(r)) && (isClassGrade(r.grade) || r.grade_system === "class"));
console.log("\nCLASS-GRADED under a CRAG discipline:", hits.length);

// resolve peak names
const areaIds = [...new Set(hits.map((r) => r.area_id))];
const key = anonKey();
const amap = {};
for (let i = 0; i < areaIds.length; i += 40) {
  const chunk = areaIds.slice(i, i + 40);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,path&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  for (const a of JSON.parse(await res.text())) amap[a.id] = a;
}

const state = (a) => (a && a.path ? (a.path.split(".")[1] || "?") : "?");
for (const r of hits.sort((a, b) => (amap[a.area_id]?.path || "").localeCompare(amap[b.area_id]?.path || ""))) {
  const a = amap[r.area_id] || {};
  console.log([
    r.id,
    "| " + (a.name || r.area_id) + " (" + (a.area_type || "?") + ", " + state(a) + ")",
    "| " + r.name,
    "| grade=" + JSON.stringify(r.grade),
    "sys=" + r.grade_system,
    "disc=" + r.discipline,
    "pitches=" + r.pitches,
    "len=" + r.length_m,
    
    "gear=" + (Array.isArray(r.gear) ? r.gear.length : (r.gear ? 1 : 0)),
    "overview=" + (r.overview ? "yes" : "no"),
    "src=" + r.source,
  ].join(" "));
}
