// One row saying the same permit is free and $10, in two fields a climber reads together.
//
// Rows across the North Cascades complex say "Free backcountry permit required for overnight camping"
// in access.permit (or access.rules) while access.fees on the same row gives the real schedule:
// "$10 per person ... plus a $6 non-refundable reservation fee". Both render. A party budgeting off
// the page gets two answers, and the cheaper one is the false one.
//
// READ OFF THE AGENCY THIS SESSION, because a fee must not be inferred:
// nps.gov/noca/planyourvisit/backcountry-reservations.htm gives "Recreation Fee: Adults (16 and older)
// - $10 per person" and a "$6 non-refundable" reservation fee. So the priced field is right and the
// word "free" is the defect.
//
// THE REPAIR DELETES ONE WORD. "Free" comes out of the permit sentence and nothing is typed — no fee,
// no agency, no rule. The row's own access.fees already carries the price and is untouched, so the
// climber is left with one answer instead of two, and it is the correct one.
//
// THE GATE IS THE $10 + $6 PAIR ON THE SAME ROW, and that specificity is the whole safety of this.
// 493 WA rows call some permit free and only a couple of dozen are contradicted at all; of those, most
// are NOT defects and the reading is what separated them:
//   * TWO AGENCIES. wa_gray_wolf_ridge_se_slopes pairs a "free self-issue wilderness permit for the
//     Buckhorn Wilderness portion" with an NPS "$8 per person per night". Both true — the route
//     crosses both. Same for wa_mount_chaval_scramble (Glacier Peak Wilderness, Forest Service) and
//     wa_mount_lyall_south_route, whose own sentence says "even outside the park".
//   * TWO ZONES. wa_colchuck_peak_northeast_couloir pairs a free self-issue permit for the Ingalls
//     Creek approaches with the Colchuck zone's $5/person/day. Different permit areas.
//   * TWO PERMITS. A free DAY-USE permit alongside a paid OVERNIGHT one is one correct sentence, the
//     same distinction that made a no-permit sweep earlier this session drop from 41 to 2.
//   * ANOTHER MOUNTAIN. The Mount St Helens rows pair their genuinely free winter self-issue permit
//     with copy that exists to DISTINGUISH it from Rainier's $82 and Adams' $20.
// Requiring both sentences to be about the North Cascades schedule specifically — the free one naming
// NPS or the park, the priced one naming both $10 and $6 — excludes every one of those.
//
// A DETECTOR'S WHITELIST WAS ONE ADJECTIVE SHORT AND MISSED THE ROWS THAT PROMPTED IT. The scan
// requires the words between "free" and "permit" to be permit adjectives, because an arbitrary
// three-word gap let "FREE loaners at PERMIT offices" — a free bear canister — through, and that one
// sentence was 35 of 75 findings. The whitelist then had "wilderness" but not "wilderness/camping",
// so both Klawatti rows, the rows this class was found from, were invisible until it allowed a slash.
// Tightening a needle and re-running it against the case that prompted it is not optional.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);
// "free" modifying the permit itself
const FREE = /\bfree\s+((?:(?:self[- ]issued?|self[- ]issuing|wilderness(?:\/\w+)?|backcountry(?:\/\w+)?|overnight|NPS|park|camping)\s+)*permits?)\b/i;
// the North Cascades schedule, both figures, in one sentence
// The gap must be allowed to CROSS a sentence boundary: a fees value routinely reads
// "$10 per person recreation fee for backcountry camping; a separate non-refundable $6 fee...",
// and a [^.;] gap cannot span the semicolon, which is what kept the two Klawatti rows — the rows
// this class was found from — out of the plan through two separate attempts to include them.
const NOCA_FEE = /\$\s?10\b[\s\S]{0,160}\$\s?6\b|\$\s?6\b[\s\S]{0,160}\$\s?10\b/;
// the free sentence must be about the PARK, not a Forest Service wilderness beside it
const IN_PARK = /\bNPS\b|north cascades|national park|backcountry permit|wilderness\/camping/i;
const OTHER_AGENCY = /national forest|forest service|\bUSFS\b|buckhorn|glacier peak wilderness|alpine lakes|olympic national|mount rainier|st\.? helens|adams/i;
const OUTSIDE = /outside the park|outside designated|even outside/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
for (const r of rows) {
  const a = r.access || {};
  // find the priced sentence first — it is the specific, verifiable half
  // THE PAIR IS TESTED ON THE WHOLE FIELD, NOT PER SENTENCE. A fees value routinely splits the two
  // figures across a semicolon — "$10 per person recreation fee for backcountry camping; a separate
  // non-refundable $6 fee applies..." — and a per-sentence test saw $10 alone and $6 alone, never the
  // pair. That silently excluded the two Klawatti rows this class was found from.
  let priced = null;
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== "string" || priced) continue;
    if (!NOCA_FEE.test(v) || OTHER_AGENCY.test(v)) continue;
    const s = SENTS(v).find(x => /\$\s?(?:10|6)\b/.test(x)) || v;
    priced = [k, s.trim()];
  }
  if (!priced) continue;

  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== "string" || k === priced[0]) continue;
    for (const s of SENTS(v)) {
      const m = s.match(FREE);
      if (!m) continue;
      if (!IN_PARK.test(s)) { held.push({ id: r.id, k, why: "the free sentence does not name the park", s }); continue; }
      if (OTHER_AGENCY.test(s) || OUTSIDE.test(s)) { held.push({ id: r.id, k, why: "the free sentence is about another agency or explicitly outside the park", s }); continue; }
      if (/\bday[- ]?(?:use|trip|hike|climb)\b/i.test(s) && !/overnight|per night|camping/i.test(s)) { held.push({ id: r.id, k, why: "a free DAY permit is not the paid overnight one", s }); continue; }
      const before = v;
      const after = v.replace(m[0], m[1]);              // drop just the word "free"
      if (after === before || after.length >= before.length) { held.push({ id: r.id, k, why: "the edit did not shorten the value", s }); continue; }
      if (FREE.test(after.slice(Math.max(0, before.indexOf(m[0]) - 5), before.indexOf(m[0]) + m[0].length + 5))) { held.push({ id: r.id, k, why: "free survives the edit", s }); continue; }
      plan.push({ id: r.id, access: a, k, from: before, to: after, sent: s.trim(), priced });
    }
  }
}

console.log(`\nrows to repair: ${plan.length}`);
for (const p of plan) {
  console.log(`\n  ${p.id}  access.${p.k}`);
  console.log(`     free  : ${JSON.stringify(p.sent.slice(0, 140))}`);
  console.log(`     priced: access.${p.priced[0]}: ${JSON.stringify(p.priced[1].slice(0, 140))}`);
}
console.log(`\nheld back: ${held.length}`);
const why = new Map();
for (const h of held) why.set(h.why, (why.get(h.why) || 0) + 1);
for (const [w, c] of why) console.log(`   ${String(c).padStart(3)} x ${w}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

// one patch per row, accumulating fields — the collision this session already paid for once
const byRow = new Map();
for (const p of plan) {
  if (!byRow.has(p.id)) byRow.set(p.id, { ...p.access });
  byRow.get(p.id)[p.k] = p.to;
}
for (const [id, acc] of byRow) await patchRow("routes", id, { access: acc });
const after = await selectAll("routes", "id,access", `id=in.(${[...byRow.keys()].join(",")})`, { pageSize: 40 });
let bad = 0;
for (const r of after) {
  const mine = plan.filter(p => p.id === r.id);
  for (const p of mine) if (String(r.access?.[p.k] ?? "") !== p.to) { bad++; console.log(`NOT APPLIED — ${r.id}.${p.k}`); }
}
console.log(`\nwrote ${byRow.size} row(s), ${plan.length} field(s); mismatches: ${bad}`);
