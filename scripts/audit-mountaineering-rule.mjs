// audit:mountaineering-rule — mountaineering is ONLY a walk-up; a route with a 5.x in a grade column or a
// pitch's own grade has rock-climbing pitches and is ALPINE (user rule 2026-10-08; trigger 0280 enforces it
// on write, catOf in ClimbMatchCore.jsx on read). Reads every discipline=mountaineering row and exits 1 on any
// carrying a YDS 5.x in grade, rock_grade or alpine_grade. Pitch grades and prose (overview, gear, pitches count)
// are NOT counted here (a stray 5.x on a Class 3-4 row is usually another route's pitch): those were researched case by case (scripts/oneoff/probe-mountaineering-with-fifth-class.mjs).
import { selectAll } from "./lib/supabase-env.mjs";

const YDS = /(?<![\d.])5\.(\d{1,2})([abcd]?[+-]?)(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b|h\b|m\b|ft\b|feet\b|%|degrees?\b|°))/i;
const has = (s) => { const m = YDS.exec(String(s || "")); return !!m && +m[1] <= 15; };

/* Rows whose own grade says 5.x but whose research (2026-10-08) found no required rock pitch, or none usable.
   Held for the owner, not exempt: delete an id here once it is relabelled or its grade is corrected. */
const HELD = new Set("wa_andersons_thumb_standard wa_austera_peak wa_burnt_boot_peak_north_ridge wa_dragontail_peak_r3 wa_inner_constance_northwest_buttress wa_lemah_two_goatshead_spire wa_mount_crowder_northeast_ridge wa_mount_redoubt_south_face wa_overcoat_peak_southeast_route wa_sahale_mountain_sahale_glacier wa_storm_king_north_face wa_tepeh_towers".split(" "));
const rows = await selectAll("routes", "id,name,grade,rock_grade,alpine_grade", "discipline=eq.mountaineering", { pageSize: 500 });
if (rows.length < 100) { console.error(`only ${rows.length} mountaineering rows read — a failed or RLS-empty read is not a pass`); process.exit(2); }
const all = rows.filter((r) => has(r.grade) || has(r.rock_grade) || has(r.alpine_grade));
const bad = all.filter((r) => !HELD.has(r.id));
console.log(`held for the owner (researched, not relabelled): ${all.length - bad.length}`);
console.log(`mountaineering rows scanned: ${rows.length}; with a 5.x grade: ${bad.length}`);
for (const r of bad.slice(0, 40)) console.log("  ", r.id, "|", r.name, "|", r.grade);

process.exit(bad.length ? 1 : 0);
