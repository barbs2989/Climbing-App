// The Plan tab heads the published-times panel "PUBLISHED TIMES · CAR-TO-CAR" — a HARDCODED
// string on every route that carries a `timing` object. It never asks whether the published plan
// actually is car-to-car.
//
// Mount Stuart's North Ridge is the case that prompted this: the panel says CAR-TO-CAR while its
// own `recommendedStart` is "5:30 AM from camp" and its section breakdown reads "Approach and
// climb to a bivy below the Gendarme" / "Finish the ridge to the summit". The itinerary directly
// above it says TOTAL 2 days.
//
// Car-to-car means no bivy. A climber reading "car-to-car, 23 hr" plans a single push.
//
// This measures how often a route's OWN timing content contradicts the heading, so the size of
// the class is known before anything is changed.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,timing", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read returned nothing — refusing to report a clean catalog"); process.exit(1); }

const withTiming = rows.filter((r) => r.timing && typeof r.timing === "object" && !Array.isArray(r.timing));
if (!withTiming.length) { console.error("0 routes carry a timing object — the column moved"); process.exit(1); }

// Words that mean the published plan involves sleeping out. "camp" is deliberately matched as a
// whole word: "campfire" and place names like "Camp Muir" would otherwise sweep in routes whose
// plan is a genuine single push past a named camp.
const OVERNIGHT = /\b(bivy|bivvy|bivouac|overnight|high camp|from camp|to camp|two[- ]day|2[- ]day|second day|day 2|next morning|sleep)\b/i;

const textOf = (t) => {
  const bits = [t.recommendedStart, t.notes, t.summary];
  const sb = Array.isArray(t.sectionBreakdown) ? t.sectionBreakdown : [];
  for (const s of sb) bits.push(s && s.section, s && s.fromTo, s && s.note);
  return bits.filter((x) => typeof x === "string").join(" — ");
};

const hits = [];
for (const r of withTiming) {
  const txt = textOf(r.timing);
  const m = OVERNIGHT.exec(txt);
  // A total over ~20 hours is a second signal: nobody goes car-to-car for a day and a night
  // without the plan saying so, and it needs no vocabulary at all.
  const total = Number(r.timing.totalHrs);
  const longDay = Number.isFinite(total) && total >= 20;
  if (m || longDay) hits.push({ r, why: m ? `says ${JSON.stringify(m[0])}` : `totalHrs ${total}`, total, txt });
}

console.log(`${rows.length} wa_* routes, ${withTiming.length} carry a timing object\n`);
console.log(`labelled CAR-TO-CAR while their own plan says otherwise: ${hits.length}\n`);
for (const h of hits.slice(0, 25)) {
  console.log(`  ${h.r.id}  (${h.why})`);
  console.log(`      ${h.txt.slice(0, 150).replace(/\s+/g, " ")}`);
}
if (hits.length > 25) console.log(`  … and ${hits.length - 25} more`);

// ── Which way should the label be DERIVED? A deny-list of overnight words fails in the wrong
//    direction: a miss keeps the CAR-TO-CAR claim. So measure the positive signal too — does the
//    row's own plan say it starts at the trailhead / the car?
const CARISH = /\b(car[- ]to[- ]car|from the (trail\s?head|car|parking)|trail\s?head start|single push|in a day|day trip)\b/i;
let positive = 0, neither = 0, both = 0;
const hitIds = new Set(hits.map((h) => h.r.id));
for (const r of withTiming) {
  const txt = textOf(r.timing);
  const pos = CARISH.test(txt);
  const neg = hitIds.has(r.id);
  if (pos && neg) both++;
  else if (pos) positive++;
  else if (!neg) neither++;
}
console.log(`\nof the ${withTiming.length} with timing:`);
console.log(`  ${hits.length} say something OVERNIGHT (the heading is wrong)`);
console.log(`  ${positive} positively say car-to-car / from the trailhead, and nothing overnight`);
console.log(`  ${both} say BOTH — the row itself distinguishes the two styles`);
console.log(`  ${neither} say neither, so the heading is an unsupported claim either way`);
