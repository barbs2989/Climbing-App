// Read-only. Every `mountaineering` route (all states) that carries evidence of real 5th-class
// climbing: a 5.x in a grade column or a pitch's own grade, a pitch count, or an unqualified rack.
// The user's rule (2026-10-08): mountaineering is ONLY a true walk-up (no rock-climbing pitches);
// any peak route with actual 5th-class climbing is alpine. Writes the candidates to --out.
import fs from "node:fs";
import { selectAll } from "../lib/supabase-env.mjs";

const out = (process.argv.find((a) => a.startsWith("--out=")) || "").slice(6) || "mountaineering-fifth-class.json";
const rows = await selectAll(
  "routes",
  "id,area_id,name,discipline,disciplines,grade,grade_system,rock_grade,alpine_grade,ice_grade,pitches,gear,overview,pitch_detail",
  (process.argv.find((a) => a.startsWith("--disc=")) ? "discipline=eq." + process.argv.find((a) => a.startsWith("--disc=")).slice(7) : "discipline=eq.mountaineering"),
  { pageSize: 500 }
);
console.log("mountaineering routes scanned:", rows.length);

/* A YDS rock grade, NOT a distance or duration: "5.2 miles", "5.5 hours", "5.0 km". */
const YDS = /(?<![\d.])5\.(\d{1,2})([abcd]?[+-]?)(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b|h\b|m\b|ft\b|feet\b|%|degrees?\b|°))/gi;
const ydsIn = (s) => { const out = []; String(s || "").replace(YDS, (m, n) => { if (+n <= 15) out.push(m); return m; }); return out; };
const optional = /optional|if needed|for parties|rappel(?:ing)? only|for rappel/i;
const RACK = /\b(?:rack|cams?|nuts?|trad gear|quickdraws?|protection|pro\b)\b/i;

const hits = [];
for (const r of rows) {
  const why = [];
  const g = ydsIn(r.grade).concat(ydsIn(r.rock_grade), ydsIn(r.alpine_grade));
  if (g.length) why.push("grade:" + [...new Set(g)].join(","));
  const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
  const pg = pd.flatMap((p) => ydsIn(p && (p.grade || p.rating || "")));
  if (pg.length) why.push("pitch_detail:" + [...new Set(pg)].join(","));
  if ((r.pitches || 0) > 0) why.push("pitches:" + r.pitches);
  const gear = String(r.gear || "");
  if (RACK.test(gear) && !gear.split(/[.;\n]/).every((c) => !RACK.test(c) || optional.test(c))) why.push("rack");
  const ov = ydsIn(r.overview);
  if (ov.length) why.push("overview:" + [...new Set(ov)].join(","));
  if (why.length) hits.push({ id: r.id, area_id: r.area_id, name: r.name, grade: r.grade, disciplines: r.disciplines, why });
}
const byKind = {};
for (const h of hits) for (const w of h.why) byKind[w.split(":")[0]] = (byKind[w.split(":")[0]] || 0) + 1;
console.log("with ANY 5th-class evidence:", hits.length, JSON.stringify(byKind));
const strong = hits.filter((h) => h.why.some((w) => /^(grade|pitch_detail)/.test(w)));
console.log("...of which a 5.x in a grade column or a pitch:", strong.length);
const byState = {};
for (const h of hits) { const st = h.id.split("_")[0]; byState[st] = (byState[st] || 0) + 1; }
console.log("by id prefix:", JSON.stringify(byState));
fs.writeFileSync(out, JSON.stringify({ scanned: rows.length, hits }, null, 1));
console.log("wrote", out);
