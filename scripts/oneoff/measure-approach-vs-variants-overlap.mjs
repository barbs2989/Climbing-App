// Does a route's `approach` prose restate what its `approach_variants` panel already says?
//
// Both render on the Plan tab, one under the other, so a reader meets them back to back.
// audit:approach-scope measures `approach` against `climbing_route` and is blind to THIS pair —
// nothing had ever asked it.
//
// WHY THIS EXISTS AT ALL: reading a CI ui-screens capture of wa_mount_stuart_north_ridge, the two
// sections plainly cover the same walk-in at length, and I reported that as duplication worth
// editing. The measurement says otherwise — that route's overlap is 2%, rank 461 of 797, with ZERO
// verbatim sentences, and the catalog median is 3%. What reads as duplication is the same FACTS
// (the trailhead, the creek, the hours, the gain) in different words for different purposes: the
// variants panel is a per-option breakdown carrying its own hazards and base-finding, and
// `approach` is a continuous narrative.
//
// AN IMPRESSION FROM ONE SCREEN IS NOT A MEASUREMENT. That is the finding, and it is why this
// script is kept rather than the number written into a document: re-run it, do not quote it.
//
// REPORT ONLY. It writes nothing and picks no winner. Whether a short `approach` above a detailed
// panel is redundant or is a correct summary is an editorial judgement, not a wrong fact.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const STATE = (process.argv.find(a => a.startsWith("--state=")) || "--state=wa").split("=")[1];

// The splitter audit:approach-scope uses. Climbing prose is full of "5.9" and "1.2 miles", and a
// naive /[.!?]/ split shreds exactly the sentences this is about.
const sentences = t => String(t || "").replace(/\s+/g, " ").trim()
  .split(/(?<=[.!?])\s+(?=[A-Z(])/).map(s => s.trim()).filter(s => s.length > 25);

const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// WORD SHINGLES, NOT SENTENCES, for the headline number. An overlap measured by sentence equality
// depends entirely on the splitter, and this file already records what a splitter does to
// "Pk. 8165". Shingles ask "how much of this text is restated" and cannot be shredded.
const shingles = (t, n = 8) => {
  const w = norm(t).split(" ").filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
};

const rows = [];
let from = "";
for (;;) {
  const u = `${SUPABASE_URL}/rest/v1/routes?select=id,approach,approach_variants`
    + `&approach=not.is.null&approach_variants=not.is.null&order=id.asc&limit=1000`
    + `&id=like.${STATE}_*` + (from ? `&id=gt.${from}` : "");
  const r = await fetch(u, { headers: headers(anonKey()) });
  const b = await r.json();
  if (!Array.isArray(b)) { console.error("read failed:", JSON.stringify(b).slice(0, 200)); process.exit(1); }
  rows.push(...b);
  if (b.length < 1000) break;
  from = b[b.length - 1].id;
}
// FAILS CLOSED. A read that returned nothing prints the same reassuring "no duplication" as a
// clean catalog.
if (!rows.length) { console.error(`FAIL: zero ${STATE} routes carry both columns — the scan cannot fire.`); process.exit(1); }

const results = [];
for (const row of rows) {
  const vText = (Array.isArray(row.approach_variants) ? row.approach_variants : [])
    .map(v => [v?.name, v?.notes, v?.baseFinding, ...(Array.isArray(v?.hazards) ? v.hazards : [])].filter(Boolean).join("  "))
    .join("  ");
  if (!vText.trim() || !String(row.approach || "").trim()) continue;
  const a = shingles(row.approach), v = shingles(vText);
  if (a.size < 5) continue;                      // too short to have an overlap worth a fraction
  let shared = 0; for (const s of a) if (v.has(s)) shared++;
  const vnorm = new Set(sentences(vText).map(norm));
  results.push({ id: row.id, frac: shared / a.size,
    aLen: String(row.approach).length, vLen: vText.length,
    dup: sentences(row.approach).filter(s => vnorm.has(norm(s))) });
}
if (!results.length) { console.error("FAIL: nothing comparable — the scan cannot fire."); process.exit(1); }

results.sort((x, y) => y.frac - x.frac);
const pct = p => (p * 100).toFixed(0) + "%";
const bucket = [0, 0, 0, 0, 0];
for (const r of results) bucket[Math.min(4, Math.floor(r.frac * 5))]++;

console.log(`${rows.length} ${STATE} routes carry BOTH an approach and approach_variants; ${results.length} comparable.\n`);
console.log("overlap of the approach text with the variants panel (8-word shingles):");
const labels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
for (let i = 4; i >= 0; i--) console.log(`  ${labels[i].padStart(7)}  ${String(bucket[i]).padStart(4)} routes`);
console.log(`\nmedian overlap ${pct(results[Math.floor(results.length / 2)].frac)}`);
console.log(`routes with a VERBATIM repeated sentence: ${results.filter(r => r.dup.length).length}`);

console.log(`\n=== the 10 most duplicated — a READING LIST, never a worklist ===`);
for (const r of results.slice(0, 10)) {
  console.log(`${pct(r.frac).padStart(4)}  ${r.id}   approach ${r.aLen} ch / variants ${r.vLen} ch, ${r.dup.length} verbatim`);
  if (r.dup.length) console.log(`        "${r.dup[0].slice(0, 130)}"`);
}
console.log(`\nA short approach above a detailed panel is a SUMMARY as readily as a redundancy, and`);
console.log(`which it is cannot be read off a number. Report only; nothing here is a defect count.`);
