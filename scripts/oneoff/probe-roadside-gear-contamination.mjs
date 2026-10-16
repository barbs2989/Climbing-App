// "Approach shoes unnecessary beyond a short roadside walk" sits in what_to_bring on two
// Monte Cristo routes whose own approach is a FOUR MILE walk from the Barlow Pass gate. The
// phrasing matches The Dikes, a southeast-Washington basalt area whose approaches really are
// "very short and roadside" — so this reads as a gear note that landed on the wrong routes,
// the cross-region duplicate-field-value fingerprint audit:identity describes.
//
// A wrong entry is worse than a misfiled one: it tells somebody they can walk four miles of
// old railroad grade in rock shoes. So before repairing two rows, ask how far the claim
// spread — and check it against each route's OWN approach rather than against the phrasing.
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

/* Claims the approach is trivial. Deliberately broad on the wording and narrow on the
   meaning: it must say the walk is short/roadside, not merely mention a road. */
const TRIVIAL = /\b(roadside|road-?side|short walk|steps from the (car|road)|no real approach|approach (shoes?|footwear)[^.]*\b(unnecessary|not needed|superfluous))\b/i;
/* The route's own approach contradicts it only if the mileage is WALKED.
   The first draft matched any mileage and reported 7 of 7 flags as contradicted — with a
   "consistent" bucket of ZERO, which is the tell that a detector is matching the wrong thing.
   It was: "drive the Mt. Baker Highway 13.3 miles past Glacier" is a DRIVE to a genuinely
   roadside cliff, and Obstruction Point Road's mileage is likewise the drive up it. A gear
   note saying "roadside" is correct on all of those.
   So a figure counts only inside a sentence that says somebody is on foot, and never inside
   one that says they are in a car. */
const MILES = /(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(?:mi\b|mile)/gi;
const ON_FOOT = /\b(walk|walks|walked|walking|hike|hikes|hiked|hiking|on foot|trail|trailhead|scramble|approach march|bushwhack)\b/i;
const IN_CAR = /\b(drive|drives|driving|drove|park at|from bellingham|from seattle|from the town|highway|hwy|sr[- ]?\d+|us[- ]?\d+|i-\d+|fr[- ]?\d+|forest road|paved|unpaved|gravel|milepost|mp \d+)\b/i;
function walkedMiles(ap) {
  let best = 0;
  for (const sent of String(ap || "").split(/(?<=[.;!?])\s+/)) {
    if (!ON_FOOT.test(sent)) continue;
    if (IN_CAR.test(sent)) continue;   // a sentence doing both is a drive-then-park sentence
    for (const m of sent.matchAll(MILES)) best = Math.max(best, Number(m[1]) || 0);
  }
  return best;
}

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,what_to_bring,gear,approach,dist_km&id=like.wa_*&what_to_bring=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

let claimed = 0;
const contradicted = [], consistent = [];
for (const r of rows) {
  const entries = leaves(r.what_to_bring);
  const hit = entries.find((e) => TRIVIAL.test(e));
  if (!hit) continue;
  claimed++;
  const ap = String(r.approach || "");
  /* dist_km is DELIBERATELY NOT part of the verdict, and that was measured rather than
     assumed. Using it as a floor put `wa_east_ridge` in the contradicted bucket on a
     dist_km of 6.4 (= 4.0 mi) while its own approach — byte-identical to two sibling
     routes on the same spire — says the walk-up is "around 20 minutes or less" from a road
     that "runs almost directly beneath the formation". The gear note saying "roadside" is
     correct; the 6.4 is wrong, and that is a dist_km defect (audit:distances' subject),
     not a gear one. Prose is the better record for "is this walk short". */
  const km = Number(r.dist_km);
  const kmMi = Number.isFinite(km) && km > 0 ? km * 0.621371 : 0;
  const far = walkedMiles(ap);
  (far >= 1 ? contradicted : consistent).push({ id: r.id, name: r.name, hit, far: +far.toFixed(1), kmMi: +kmMi.toFixed(1), ap: ap.slice(0, 150) });
}

console.log(`\n=== "the approach is trivial" claims in what_to_bring ===`);
console.log(`${rows.length} WA routes carry a packing list · ${claimed} claim a trivial approach\n`);
console.log(`--- CONTRADICTED by the route's own approach (>= 1 mile): ${contradicted.length} ---`);
for (const c of contradicted) console.log(`  ${c.id}  (own approach names ${c.far} mi ON FOOT; dist_km would say ${c.kmMi} mi)\n     entry: "${c.hit}"\n     approach: ${c.ap}…`);
console.log(`\n--- consistent (the walk really is short): ${consistent.length} ---`);
for (const c of consistent.slice(0, 25)) console.log(`  ${c.id}  "${c.hit.slice(0, 90)}"`);
if (consistent.length > 25) console.log(`  … ${consistent.length - 25} more`);
