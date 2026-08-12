/* Hypothesis, formed after researching two of the conflicts: most of these "contradictions"
   are not errors. They are the SAME descent counted with a different number of ropes.

   Forbidden Peak West Ridge — SummitPost, East Ledges: "Descending 400 feet on the face will
   be about right, which might amount to 5 rappels", and "if you have two ropes you will only
   have half the rappels". Prose says ~5 (one rope), table has 3 (two ropes). Both right.

   Ingalls Peak South Ridge — the descent is 3 rappels with two 60m ropes (the first doubled)
   and 4 with a single 60m rope. Prose says 4, table has 3. Both right.

   If that generalises, forcing the two numbers to agree would DESTROY information — the
   honest fix is to say which rope configuration each number assumes. This measures how far it
   generalises before anything is edited: does the row's own text mention a rope setup, and is
   the prose/table gap consistent with single-vs-double rope (roughly a factor of 2, or +/-1 on
   short descents)?

   Read-only. */
import { anonKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";

const IDS = ["wa_the_scoop_2","wa_concerto_in_c_for_drill_and_hammer","wa_complete_south_buttress","wa_sharkfin_tower_southeast_ridge","wa_sherpa_peak_east_ridge","wa_east_face","wa_early_winter_couloir","wa_forbidden_peak_west_ridge","wa_american_border_peak_southeast_face","wa_mix_up_peak_east_face","wa_forbidden_peak_northwest_face","wa_gunsight_peak_standard","wa_chair_peak_north_face","wa_southeast_mox_peak_se_rib","wa_east_face_3","wa_crooked_thumb_peak_south_route","wa_northwest_arete","wa_northwest_mox_peak_standard","wa_news_nw_corner","wa_east_ridge_9","wa_storm_king_southwest_scramble","wa_ingalls_peak_south_ridge","wa_mount_goode_northeast_buttress"];

const key = anonKey();
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,rappels,rappel_detail,rappel_count_note,descent_text&id=in.(${IDS.map(i=>`"${i}"`).join(",")})`, { headers: headers(key) });
if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 200));
const rows = await r.json();
if (!rows.length) throw new Error("empty read");

const SINGLE = /\bsingle[- ]rope\b|\bone 60\s?m\b|\ba single 60\b|\bsingle 60\s?m\b|\bwith (?:a|one) (?:50|60|70)\s?m rope\b|\b60\s?m rope is sufficient\b/i;
const DOUBLE = /\bdouble[- ]rope\b|\btwo (?:60|70)\s?m ropes?\b|\btwo ropes\b|\bdoubled\b|\bhalf[- ]ropes?\b|\btwin\b/i;

let both = 0, one = 0, none = 0;
for (const id of IDS) {
  const x = rows.find((y) => y.id === id);
  if (!x) continue;
  const table = Array.isArray(x.rappel_detail) ? x.rappel_detail.length : 0;
  const hay = [x.rappels, x.rappel_count_note, x.descent_text].filter(Boolean).join(" ");
  const s = SINGLE.test(hay), d = DOUBLE.test(hay);
  const tag = s && d ? "BOTH rope setups named" : s ? "single-rope named" : d ? "double-rope named" : "no rope setup named";
  if (s && d) both++; else if (s || d) one++; else none++;
  console.log(`${(s && d ? "**" : "  ")} ${id.padEnd(42)} table ${String(table).padStart(2)}  ${tag}`);
}
console.log(`\nrows naming BOTH a single- and a double-rope setup : ${both}`);
console.log(`rows naming one setup                             : ${one}`);
console.log(`rows naming none                                  : ${none}`);
console.log(`\nA row naming BOTH is the strongest candidate for "two numbers, two rope setups"`);
console.log(`rather than "one number is wrong".`);
