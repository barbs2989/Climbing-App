// audit:mountaineering-rule — mountaineering is ONLY a walk-up, and a scramble is never roped; a route with a 5.x
// in a grade column has rock-climbing pitches and is ALPINE (user rule 2026-10-08 for mountaineering, 2026-10-24
// for scrambling; trigger 0280/0366 enforces it on write, catOf in ClimbMatchCore.jsx on read). Reads every
// discipline=mountaineering and discipline=scrambling row and exits 1 on any carrying a YDS 5.x in grade, rock_grade
// or alpine_grade. Pitch grades and prose (overview, gear, pitches count) are NOT counted here (a stray 5.x on a
// Class 3-4 row is usually another route's pitch): those were researched case by case
// (scripts/oneoff/probe-mountaineering-with-fifth-class.mjs).
// It also reads every alpine/mountaineering/scrambling row's `disciplines` LIST and fails when the list omits the
// row's own primary, or tags a 5.x route "scrambling": Monte Cristo, re-filed alpine, kept a list of ["scrambling"]
// and its page said "Scrambling 5.6" (scripts/oneoff/fix-disciplines-list-matches-primary.mjs repaired 123 rows).
import { requireServiceKey, selectAll } from "./lib/supabase-env.mjs";

const YDS = /(?<![\d.])5\.(\d{1,2})([abcd]?[+-]?)(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b|h\b|m\b|ft\b|feet\b|%|degrees?\b|°))/i;
const has = (s) => { const m = YDS.exec(String(s || "")); return !!m && +m[1] <= 15; };
const fifth = (r) => has(r.grade) || has(r.rock_grade) || has(r.alpine_grade);

/* The one standing exemption: Dragontail's Pandora's Box West Route is a Class 3 snow couloir; its 5.6 is stored in
   rock_grade as "optional, true summit pinnacle only". The other nine rows held on 2026-10-08 were settled (seven
   relabelled alpine on their own rack/rope/"low 5th" evidence, two regraded to Class 4). */
const HELD = new Set(["wa_dragontail_peak_r3"]);
const cols = "id,name,discipline,disciplines,grade,rock_grade,alpine_grade";
const byDisc = {};
// The service key: under the anon key, RLS makes the sparse scrambling/alpine keyset pages hit the statement timeout.
const key = requireServiceKey();
for (const d of ["mountaineering", "scrambling", "alpine"]) byDisc[d] = await selectAll("routes", cols, `discipline=eq.${d}`, { key, pageSize: 1000 });
if (byDisc.mountaineering.length < 100 || byDisc.scrambling.length < 100) { console.error(`only ${byDisc.mountaineering.length} mountaineering / ${byDisc.scrambling.length} scrambling rows read — a failed or RLS-empty read is not a pass`); process.exit(2); }
const all = [...byDisc.mountaineering, ...byDisc.scrambling].filter(fifth);
const bad = all.filter((r) => !HELD.has(r.id));
console.log(`exempt (documented): ${all.length - bad.length}`);
console.log(`mountaineering + scrambling rows scanned: ${byDisc.mountaineering.length + byDisc.scrambling.length}; with a 5.x grade: ${bad.length}`);
for (const r of bad.slice(0, 40)) console.log("  ", r.id, "|", r.name, "|", r.discipline, "|", r.grade);

const rows = [...byDisc.mountaineering, ...byDisc.scrambling, ...byDisc.alpine];
const listBad = rows.filter((r) => !HELD.has(r.id) && Array.isArray(r.disciplines) && r.disciplines.length &&
  (!r.disciplines.includes(r.discipline) || (fifth(r) && r.disciplines.some((d) => d === "scrambling" || d === "scramble"))));
console.log(`disciplines lists scanned: ${rows.length}; omitting their primary or calling a 5.x route a scramble: ${listBad.length}`);
for (const r of listBad.slice(0, 40)) console.log("  ", r.id, "|", r.discipline, JSON.stringify(r.disciplines), "|", r.grade);

process.exit(bad.length || listBad.length ? 1 : 0);
