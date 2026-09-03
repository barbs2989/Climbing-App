// A packing list offering a rope the route's own descent says is too short.
//
// Two rows give `gear` a rope RANGE whose bottom end their own other fields rule out:
//
//   wa_liberty_bell_beckey_route   gear "50-60m rope"
//        detailed_rack       "...and a single 60m rope."
//        rappel_count_note   "Three rappels on a single 60 m rope, which is the rope this route
//                             recommends and the configuration these three stations describe."
//        rappel_detail       three stations, lengthM 30 each
//     A rope doubled through an anchor reaches HALF its length, so the 50 offered here reaches 25 m
//     against three stated 30 m rappels. It cannot make any of them.
//
//   wa_bulls_tooth_south_ridge     gear "30-40m rope"
//        rappels             "3 rappels on a 40m rope through the technical section"
//     Same shape: 30 doubled reaches 15.
//
// A range is the right shape for a rope when both ends work. It is not a preference when the low end
// leaves a party at a hanging stance short of the next station.
//
// THE REPAIR DELETES THE LOW END. "50-60m rope" becomes "60m rope" — purely subtractive, no length is
// typed, and the surviving number is the one the row's own fields already name. Every other field is
// untouched.
//
// THE GATE IS THE ROW'S OWN ARITHMETIC WHERE IT HAS IT. Beckey is settled by its own stations: 50/2 =
// 25 < 30. Bulls Tooth records no station lengths, so it is settled instead by its own `rappels` field
// naming the top of the range as the rope the descent uses. Both premises are re-asserted at apply
// time, so a row whose fields change is refused rather than rewritten.
//
// THE CLASS IS TWO, MEASURED. 141 WA rows offer a rope range and only these two are contradicted by
// their own row. A first scan reported a third, wa_ridge_traverse_from_east_fury, whose "required"
// sentence turned out to be what_to_bring RESTATING the same range — "Rope (50-60m, 9mm minimum)" —
// with the "9mm minimum" read as a required length. A sentence that contains the range is not
// independent evidence about the range, so it is excluded.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const RANGE = /\b(\d{2})\s*[-–]\s*(\d{2})\s*m\b/;
// another field naming a single rope length for this route, in a sentence that does NOT restate the range
const NAMES = /\b(?:a\s+)?single\s+(\d{2})\s*m\b|\bon\s+a\s+(\d{2})\s*m\s*rope\b|\b(\d{2})\s*m\s*rope[^.;]{0,40}\b(?:required|needed|essential|recommends?)/i;
const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);
const txt = v => Array.isArray(v) ? v.join(" | ") : (typeof v === "string" ? v : "");

const rows = await selectAll("routes", "id,gear,detailed_rack,rope_note,rappel_count_note,rappels,rappel_detail,what_to_bring", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
let withRange = 0;
for (const r of rows) {
  if (!Array.isArray(r.gear)) continue;
  const idx = r.gear.findIndex(g => typeof g === "string" && RANGE.test(g) && /rope/i.test(g));
  if (idx < 0) continue;
  withRange++;
  const item = r.gear[idx];
  const m = item.match(RANGE);
  const lo = Number(m[1]), hi = Number(m[2]);
  if (!(lo < hi)) continue;

  // evidence 1: a stated rappel length the LOW end cannot reach (rope/2)
  const stations = Array.isArray(r.rappel_detail) ? r.rappel_detail.map(d => Number(d && d.lengthM)).filter(Number.isFinite) : [];
  const tooShort = stations.filter(s => lo / 2 < s - 1);
  // evidence 2: another field naming the range's TOP as this route's rope, without restating the range
  const others = [["detailed_rack", r.detailed_rack], ["rope_note", r.rope_note], ["rappel_count_note", r.rappel_count_note],
    ["rappels", r.rappels], ["what_to_bring", txt(r.what_to_bring)], ["descent_text", r.descent_text]];
  let names = null;
  for (const [k, v] of others) {
    const s0 = txt(v); if (!s0) continue;
    for (const s of SENTS(s0)) {
      if (RANGE.test(s)) continue;                       // restating the range is not evidence about it
      const nm = s.match(NAMES); if (!nm) continue;
      const n = Number(nm[1] || nm[2] || nm[3]);
      if (n === hi && !names) names = [k, s.trim(), n];
    }
  }
  if (!tooShort.length && !names) { continue; }
  if (!names) { held.push({ id: r.id, why: `stations rule out ${lo}m but no other field names ${hi}m — refusing to pick` }); continue; }

  const to = item.replace(m[0], `${hi}m`).replace(/\s{2,}/g, " ");
  if (to.length >= item.length) { held.push({ id: r.id, why: "the edit did not shorten the item" }); continue; }
  plan.push({ id: r.id, gear: r.gear, idx, from: item, to, lo, hi, names, tooShort });
}

console.log(`\nrows whose gear offers a rope range: ${withRange}`);
console.log(`rows to repair: ${plan.length}`);
for (const p of plan) {
  console.log(`\n  ${p.id}`);
  console.log(`     gear[${p.idx}] : ${JSON.stringify(p.from)}  ->  ${JSON.stringify(p.to)}`);
  console.log(`     names ${p.hi}m : ${p.names[0]}: ${JSON.stringify(p.names[1].slice(0, 140))}`);
  console.log(`     arithmetic   : ${p.tooShort.length ? `${p.lo}m doubled reaches ${p.lo / 2}m against station(s) of ${p.tooShort.join(", ")}m` : "no station lengths stored — settled by the field above"}`);
}
for (const h of held) console.log(`   HELD ${h.id} — ${h.why}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

for (const p of plan) {
  const next = p.gear.map((g, i) => i === p.idx ? p.to : g);
  await patchRow("routes", p.id, { gear: next });
}
const after = await selectAll("routes", "id,gear", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let bad = 0;
for (const r of after) {
  const p = plan.find(x => x.id === r.id);
  if (String((r.gear || [])[p.idx]) !== p.to) { bad++; console.log(`NOT APPLIED — ${r.id}`); }
}
console.log(`\nwrote ${plan.length}; mismatches: ${bad}`);
