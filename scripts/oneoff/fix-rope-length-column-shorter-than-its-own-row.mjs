// The rope length a route page PRINTS, shorter than the rope the row's own fields ask for.
//
// RouteRackBox renders "Rope — <ropeType> <length>" and prefers the rope_length_m COLUMN over the
// contributed spelling, with a comment saying the enrichment number is the better value "since it is a
// number rather than free text". On seven rows that number is shorter than a length two or more of the
// row's own prose fields agree on, and no field on the row names the column's value at all:
//
//   wa_garfield_mountain_scramble        column 30 m, while its own descent_text says "Two 60m ropes
//                                        are the standard recommendation for this descent" and "a
//                                        single 60m (or shorter) rope will leave you short on several
//                                        drops and force exposed down-scrambling".
//   wa_agnes_mountain_west_route         column 30 m, gear "60m single rope".
//   wa_with_love_lie_ancients_nestled_within  column 30 m, rope_note "Standard 60m single rope more
//                                        than covers it", descent_text "still within a 60m rope's range".
//   wa_south_face_5                      column 60 m, descent_text "Bring two ropes (or a single 70m
//                                        rope used doubled) — anything shorter will mean more stations".
//   plus wa_crescendo_of_the_sarcophagus_breathing, wa_little_mac_spire_southwest_route,
//   wa_north_ridge_west_side.
//
// ONLY THE ASYMMETRIC DIRECTION IS WRITTEN, and that is what makes this safe without settling which
// record is authoritative. 29 rows carry a column no prose field supports, and in general there is no
// way to say from inside the row whether the column or the prose is right — so the sweep is scoped to
// the seven where the row's own fields agree on a LONGER rope. Raising it is safe under either reading:
// if the prose is right it removes an understatement that can strand a party at a hanging stance, and
// if the column was right it only means carrying more rope than needed. Lowering a rope length has no
// such symmetry, so no row is ever lowered here. The other 22 are reported and left.
//
// A RANGE NAMES BOTH ENDS, and missing that would have caused a wrong fix. "30-60m rope" states 30 as
// well as 60; a pattern reading only the trailing number reported wa_lane_peak_r1 (column 30) and
// wa_kyes_peak_glaciated_scramble as unsupported by their own rows, and both are supported. Reading
// ranges as two values dropped the count from 39 to 29 and removed both.
//
// Nothing is composed: the value written is read off the row's own fields at apply time, and the script
// re-asserts both premises — that no field names the current value, and that two or more still name the
// longer one — before writing.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const txt = v => Array.isArray(v) ? v.join(" | ") : (typeof v === "string" ? v : "");
const RANGE = /\b(\d{2})\s*[-–]\s*(\d{2})\s*m\b/g;
const ROPE = /\b(\d{2})\s*m\b[^.;]{0,25}\brope\b|\brope\b[^.;]{0,25}\b(\d{2})\s*m\b|\b(\d{2})\s*m\s+(?:single|double|dynamic|twin|half)\b/gi;
const COLS = "id,rope_length_m,gear,what_to_bring,detailed_rack,rope_note,rappel_count_note,descent_text,rack";

function stated(r) {
  const fields = [["gear", txt(r.gear)], ["what_to_bring", txt(r.what_to_bring)], ["detailed_rack", r.detailed_rack],
    ["rope_note", r.rope_note], ["rappel_count_note", r.rappel_count_note], ["descent_text", r.descent_text], ["rack", txt(r.rack)]];
  const said = new Map();
  for (const [k, v] of fields) {
    const s = txt(v); if (!s) continue;
    const note = n => { if (!Number.isFinite(n) || n < 20 || n > 90) return; if (!said.has(n)) said.set(n, []); if (!said.get(n).includes(k)) said.get(n).push(k); };
    for (const m of s.matchAll(ROPE)) note(Number(m[1] || m[2] || m[3]));
    for (const m of s.matchAll(RANGE)) { note(Number(m[1])); note(Number(m[2])); }
  }
  return said;
}

const rows = await selectAll("routes", COLS, "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], reported = [];
for (const r of rows) {
  const col = Number(r.rope_length_m);
  if (!Number.isFinite(col) || col <= 0) continue;
  const said = stated(r);
  if (!said.size || said.has(col)) continue;
  const up = [...said].filter(([n, ks]) => ks.length >= 2 && n > col).sort((a, b) => b[1].length - a[1].length)[0];
  if (!up) { reported.push({ id: r.id, col, said: [...said].map(([n, ks]) => `${n}m (${ks.join(", ")})`).join("; ") }); continue; }
  plan.push({ id: r.id, col, to: up[0], by: up[1] });
}

console.log(`\nrows to raise: ${plan.length}`);
for (const p of plan) console.log(`  ${p.id.padEnd(46)} ${p.col}m -> ${p.to}m   (named by ${p.by.join(", ")})`);
console.log(`\nreported and NOT changed — no longer consensus, so which record is right is not settleable here: ${reported.length}`);
for (const q of reported.slice(0, 8)) console.log(`  ${q.id.padEnd(46)} column ${q.col}m   prose: ${q.said}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { rope_length_m: p.to });
const after = await selectAll("routes", COLS, `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let ok = 0;
for (const r of after) {
  const p = plan.find(x => x.id === r.id);
  const said = stated(r);
  if (Number(r.rope_length_m) === p.to && said.has(p.to)) ok++; else console.log(`NOT APPLIED — ${r.id} reads ${r.rope_length_m}`);
}
console.log(`\nverified: ${ok} of ${plan.length} columns now match a length the row's own fields name`);
