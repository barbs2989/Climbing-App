// Routes giving the wrong phone number for a named Forest Service ranger district.
//
// `emergency.rangerStation` is a field a party uses when something has gone wrong, so a wrong number
// fails at the moment it is needed. Found the same way as the hospital repair: an agent noticed one
// row disagreeing with its siblings, and measuring the ORGANISATION NAMED IN THE VALUE (rather than
// the field, which is useless — different districts legitimately differ) turned it into a class.
//
// VERIFIED AGAINST THE FOREST'S OWN OFFICES PAGE, read directly this session
// (fs.usda.gov/r06/okanogan-wenatchee/offices). Every number below is quoted from it:
//     Chelan (509) 682-4900 · Cle Elum (509) 852-1100 · Entiat (509) 784-4700
//     Methow Valley (509) 996-4000 · Naches (509) 653-1401 · Wenatchee River (509) 548-2550
// The Forest Supervisor's Office is (509) 664-9200 — a DIFFERENT number, and that is exactly what the
// one Methow outlier stores: the supervisor's line labelled as the district's.
//
// THE CATALOG AGREES WITH THE AGENCY ON EVERY DISTRICT, which is the reassuring half: the majorities
// for all six match the published numbers, so this is a handful of stragglers rather than a systemic
// error. The script re-derives each majority at run time and REFUSES if the catalog's majority ever
// disagrees with the verified number — if the two were reversed, this script would be the thing that
// is wrong, and it should stop rather than propagate.
//
// THE CLASS IS ONE ROW, AND THAT NUMBER IS THE POINT OF THIS SCRIPT'S GATES. A first version matched
// any value naming exactly one district and holding exactly one phone number, and it proposed SEVEN
// edits — of which SIX would have destroyed correct data, replacing the Marblemount NPS centre's
// number, a Golden West Visitor Center park line and Darrington's own number with a ranger district's,
// because those values name a district somewhere as well. Only reading the dry run caught it.
//
// NOT TOUCHED: rows whose district ATTRIBUTION is wrong rather than the digits. A Fortress Mountain row
// names the Chelan district while sharing the Trinity Trailhead, which the Forest Service assigns to
// Wenatchee River — a different repair (the wrong office, not a mistyped number) needing per-row
// judgement. And wa_reynolds_peak_scramble stores (509) 664-9200 beside "Forest Supervisor's Office",
// which is CORRECT for that office — it only looked wrong because the value also names the district.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// district name (as it appears in prose) -> the number the Forest Service publishes
const VERIFIED = {
  "chelan ranger district": "(509) 682-4900",
  "cle elum ranger district": "(509) 852-1100",
  "entiat ranger district": "(509) 784-4700",
  "methow valley ranger district": "(509) 996-4000",
  "naches ranger district": "(509) 653-1401",
  "wenatchee river ranger district": "(509) 548-2550",
};
const PHONE = /\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/g;
const fmt = (m) => `(${m[1]}) ${m[2]}-${m[3]}`;

const rows = await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

// Collect every (district, number) the catalog stores, so the majority can be checked against the agency.
const seen = new Map(Object.keys(VERIFIED).map(d => [d, new Map()]));
const cand = [];
for (const r of rows) {
  const e = r.emergency; if (!e || typeof e !== "object") continue;
  for (const [k, v] of Object.entries(e)) {
    if (typeof v !== "string") continue;
    const lower = v.toLowerCase();
    const hits = Object.keys(VERIFIED).filter(d => lower.includes(d));
    if (hits.length !== 1) continue;                 // two districts named: cannot attribute the number
    // THE VALUE MUST NAME EXACTLY ONE ORGANISATION, NOT JUST ONE DISTRICT — and the first version of
    // this gate did not, which would have CORRUPTED SIX ROWS. Values routinely name a district AND
    // another agency, with the phone number belonging to the OTHER one:
    //   wa_gunsight_peak_standard      "Darrington Ranger District ... (360) 436-1155" + Chelan later
    //   wa_jack_mountain_east_ridge    "North Cascades Wilderness Information Center, Marblemount -
    //                                   360-854-7245; Methow Valley ..."
    //   wa_tupshin_peak_east_face      "Golden West Visitor Center ... main park line 360-854-7200"
    // Each of those numbers is CORRECT for the organisation it sits beside, and the old gate would have
    // overwritten it with the district's. Only the dry run caught it. So: reject any value that names a
    // second organisation of any kind.
    const OTHER_ORG = /wilderness information center|visitor center|national park|ranger station|sheriff|hospital|medical center|supervisor'?s office|darrington|mount baker-snoqualmie|mt\.? baker-snoqualmie/i;
    const withoutDistrict = lower.split(hits[0]).join(" ");
    if (OTHER_ORG.test(withoutDistrict)) continue;
    PHONE.lastIndex = 0;
    const nums = [...v.matchAll(PHONE)].map(fmt);
    if (nums.length !== 1) continue;                 // two numbers: same problem
    const d = hits[0];
    seen.get(d).set(nums[0], (seen.get(d).get(nums[0]) || 0) + 1);
    if (nums[0] !== VERIFIED[d]) cand.push({ id: r.id, k, district: d, from: v, num: nums[0], premise: e });
  }
}

let refuse = false;
for (const [d, tally] of seen) {
  if (!tally.size) continue;
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const flag = sorted[0][0] === VERIFIED[d] ? "" : "   <<MAJORITY DISAGREES WITH THE AGENCY>>";
  if (flag) refuse = true;
  console.log(`  ${d.padEnd(32)} verified ${VERIFIED[d]}   catalog: ${sorted.map(([n, c]) => `${n} x${c}`).join(", ")}${flag}`);
}
if (refuse) { console.error("\nA catalog majority disagrees with the agency's own page — refusing rather than propagating."); process.exit(1); }

// Replace only the offending digits, preserving the rest of the value. BUILD THE PATTERN FROM THE
// DIGITS: escaping the formatted string and then loosening its separators mangles the escapes, and the
// first version matched nothing at all — it reported "the number appears 0 times" about a row that
// plainly carried the number. Digits plus flexible separators is both simpler and correct.
for (const c of cand) {
  const d = c.num.replace(/\D/g, "");
  const re = new RegExp(`\\(?${d.slice(0,3)}\\)?[\\s.-]*${d.slice(3,6)}[\\s.-]*${d.slice(6)}`, "g");
  const n = (c.from.match(re) || []).length;
  if (n !== 1) { console.error(`REFUSING ${c.id}.${c.k}: the number appears ${n} times`); process.exit(1); }
  c.to = c.from.replace(re, VERIFIED[c.district]);
}
console.log(`\nrows to repair: ${cand.length}\n`);
for (const c of cand) {
  console.log(`  ${c.id}.${c.k}  (${c.district})`);
  console.log(`      from ${JSON.stringify(c.from.slice(0, 110))}`);
  console.log(`      to   ${JSON.stringify(c.to.slice(0, 110))}`);
}
if (!cand.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const c of cand) {
  const cur = live.get(c.id)?.emergency;
  if (!cur || cur[c.k] !== c.from) { console.log(`  REFUSED ${c.id}: the row has changed since it was read`); refused++; continue; }
  await patchRow("routes", c.id, { emergency: { ...cur, [c.k]: c.to } });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);
const after = new Map((await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const c of cand) { if (after.get(c.id)?.emergency?.[c.k] === c.to) ok++; else console.log(`  NOT APPLIED: ${c.id}`); }
console.log(`verified ${ok} of ${cand.length}`);
