// audit:mountaineering-rule — mountaineering is ONLY a walk-up; a route with a 5.x in a grade column or a
// pitch's own grade has rock-climbing pitches and is ALPINE (user rule 2026-10-08; trigger 0280 enforces it
// on write, catOf in ClimbMatchCore.jsx on read). Reads every discipline=mountaineering row and exits 1 on any
// carrying a YDS 5.x in grade, rock_grade or alpine_grade. Pitch grades and prose (overview, gear, pitches count)
// are NOT counted here (a stray 5.x on a Class 3-4 row is usually another route's pitch): those were researched case by case (scripts/oneoff/probe-mountaineering-with-fifth-class.mjs).
import { selectAll } from "./lib/supabase-env.mjs";

const YDS = /(?<![\d.])5\.(\d{1,2})([abcd]?[+-]?)(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b|h\b|m\b|ft\b|feet\b|%|degrees?\b|°))/i;
const has = (s) => { const m = YDS.exec(String(s || "")); return !!m && +m[1] <= 15; };

/* The one standing exemption: Dragontail's Pandora's Box West Route is a Class 3 snow couloir; its 5.6 is stored in
   rock_grade as "optional, true summit pinnacle only". The other nine rows held on 2026-10-08 were settled (seven
   relabelled alpine on their own rack/rope/"low 5th" evidence, two regraded to Class 4). */
const HELD = new Set(["wa_dragontail_peak_r3"]);
const rows = await selectAll("routes", "id,name,grade,rock_grade,alpine_grade", "discipline=eq.mountaineering", { pageSize: 500 });
if (rows.length < 100) { console.error(`only ${rows.length} mountaineering rows read — a failed or RLS-empty read is not a pass`); process.exit(2); }
const all = rows.filter((r) => has(r.grade) || has(r.rock_grade) || has(r.alpine_grade));
const bad = all.filter((r) => !HELD.has(r.id));
console.log(`exempt (documented): ${all.length - bad.length}`);
console.log(`mountaineering rows scanned: ${rows.length}; with a 5.x grade: ${bad.length}`);
for (const r of bad.slice(0, 40)) console.log("  ", r.id, "|", r.name, "|", r.grade);

process.exit(bad.length ? 1 : 0);
