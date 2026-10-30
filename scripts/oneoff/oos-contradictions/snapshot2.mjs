// Phase 2 snapshot: out-of-state routes WITHOUT the rich tables but WITH approach/descent prose that can
// contradict their overview, grade, pitches, length, rappels or season. Read in id-keyset pages over SQL.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const OUT = new URL("../../../audits/oos-contradictions/p2", import.meta.url).pathname;
const COLS = "r.id,r.name,r.area_id,r.discipline,r.disciplines,r.grade,r.rock_grade,r.ice_grade,r.alpine_grade,r.commitment,r.aid_grade,r.pitches,r.length_m,r.gain_ft,r.dist_km,r.high_point_ft,r.season,r.aspect,r.fa,r.overview,r.beta,r.approach,r.descent,r.descent_text,r.rappels,r.rope_length_m,r.hazards,r.gear,r.permit,r.access,r.road";
const rows = []; let last = "";
for (;;) {
  const sql = `select ${COLS}, a.name area_name, a.area_type, a.elevation_ft area_elev, a.path::text area_path from routes r join areas a on a.id=r.area_id
   where not (a.path <@ 'usa.washington') and (r.approach is not null or r.descent is not null or r.descent_text is not null)
   and not (r.timing is not null or r.itinerary is not null or r.waypoints is not null or r.approach_variants is not null or r.climbing_route is not null or r.seasonal_guidance is not null or r.pitch_detail is not null)
   and r.id > '${last}' order by r.id limit 500`;
  const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const page = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
  rows.push(...page); console.log(rows.length);
  if (page.length < 500) break;
  last = page[page.length - 1].id; await new Promise(r => setTimeout(r, 2000));
}
fs.writeFileSync(`${OUT}/p2-routes.json`, JSON.stringify(rows));
