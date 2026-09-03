// REPORT-ONLY. `access.fees` renders as the answer to "what does this cost?", and on 160 WA rows it
// says N/A / Free / None while the SAME access object documents a charge -- most often a Northwest
// Forest Pass at $5/day or $30/year. Found from wa_blood_sport in batch 102, whose fees say "N/A"
// beside a parking_pass reading "$5/day, or a Northwest Forest Pass ($30/yr)".
//
// THE FIELD'S OWN DOCUMENTED SEMANTIC SETTLES THAT A PARKING FEE IS A FEE. lib/objKeys.js describes
// this key as `["fees","Fees","e.g. None, or $5 per vehicle per day"]` -- a per-vehicle day rate is
// the example it gives. So "N/A" beside a $5/day pass contradicts the field as defined.
//
// A ROW COUNT OVERSTATES THE WORK AND MUST NOT BE QUOTED AS ITS SIZE. `access` is a CRAG-LEVEL blob
// shared across routes, so 160 rows collapse to ~44 distinct (fees, contradicting-value) pairs, and
// the top three cover 82 of them. The unit of repair is the blob.
//
// NOT SWEPT, DELIBERATELY, and the reason is not caution about the arithmetic. Repairing means
// WRITING a fee value per blob -- money-adjacent prose, the class CLAUDE.md refuses to derive from
// English. And there is a live semantic question behind it that is a product decision rather than a
// data one: does `fees` mean every cost, or every cost BEYOND the parking pass that `parking_pass`
// already states? Under the first reading all 44 are defects; under the second most are not. Raise
// it; do not settle it by writing 160 rows.
//
// ONE PRECISION TRAP, met twice while building this. A DENIAL IS NOT A CHARGE -- "No separate
// climbing cost-recovery fee like Mount Rainier's $82" mentions a dollar figure while denying it
// applies -- and a deny-list requiring "no" adjacent to "fee" misses it, exactly as check:outage's
// rule 2 could not match "no CREW INVITES". Intervening words are allowed, and they must permit a
// HYPHEN: `\w+` does not match "cost-recovery", which is what let that value through a second time.
//
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();
const rows = await selectAll("routes", "id,access,areas!inner(name,path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
console.log("WA rows:", rows.length);
if (rows.length < 5000) { console.error("SHORT READ"); process.exit(1); }

// "no fee" as the WHOLE value, not a clause inside a longer sentence -- a value that says
// "no climbing permit fee, but a $5 day-use fee applies" is correct and must not be flagged.
const SAYS_NONE = /^\s*(?:n\/?a|none|no fees?(?: required)?|free|\$0)\s*\.?\s*$/i;
// a real charge stated elsewhere in the SAME access object
const HAS_CHARGE = /\$\s*\d|\bnorthwest forest pass\b|\binteragency\b|\bamerica the beautiful\b|\bday-use fee\b|\bentrance fee\b/i;
// ...but a value that says the pass is NOT needed is not a charge
// A DENY-LIST IS BEATEN BY ONE MORE ADJECTIVE, and mine was: "No separate climbing cost-recovery
// FEE like Mount Rainier's $82" is a DENIAL, and `no (?:fee|pass|charge)` needs them adjacent, so
// 8 correct rows were reported. Allow up to four words between -- the same widening CLAUDE.md
// records for check:outage rule 2, where "no X" could not match "no CREW INVITES".
const DENIES = /\bno(?:\s+[\w-]+){0,4}\s+(?:fees?|pass(?:es)?|charges?)\b|\bnot required\b|\bnone required\b|\bfree\b|\bno longer\b/i;

const hits = [];
for (const r of rows) {
  const a = r.access;
  if (!a || typeof a !== "object") continue;
  const fees = a.fees;
  if (typeof fees !== "string" || !SAYS_NONE.test(fees)) continue;
  for (const [k, v] of Object.entries(a)) {
    if (k === "fees" || typeof v !== "string") continue;
    if (!HAS_CHARGE.test(v)) continue;
    // strip the sentence(s) that deny a charge before deciding it states one
    const asserts = v.split(/(?<=[.;])\s+/).filter(x => HAS_CHARGE.test(x) && !DENIES.test(x));
    if (!asserts.length) continue;
    hits.push({ id: r.id, peak: r.areas.name, fees, key: k, says: asserts[0].trim().slice(0, 150) });
    break;
  }
}
// A ROW COUNT OVERSTATES THIS. `access` is a CRAG-LEVEL blob shared across routes -- CLAUDE.md
// records 18 distinct blobs covering 1,371 WA rows -- so the unit of repair is the BLOB, not the
// row. Count both, and never quote the row count as the size of the work.
const blobs = new Map();
for (const h of hits) {
  const k = h.fees + "\u0000" + h.says;
  if (!blobs.has(k)) blobs.set(k, []);
  blobs.get(k).push(h);
}
console.log(`\nDISTINCT (fees, contradicting-value) PAIRS: ${blobs.size}  -- this is the unit of repair`);
for (const [, v] of [...blobs.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  console.log(`  ${String(v.length).padStart(4)} rows  fees=${JSON.stringify(v[0].fees)}  vs ${v[0].key}: "${v[0].says.slice(0, 90)}"`);
  console.log(`         e.g. ${v.slice(0, 3).map(x => x.id).join(", ")}`);
}
const ids = new Set(hits.map(h => h.id));
console.log(`\n\`access.fees\` says NONE while the same object documents a charge: ${hits.length} rows across ${ids.size} routes\n`);
const byKey = {};
for (const h of hits) byKey[h.key] = (byKey[h.key] || 0) + 1;
for (const [k, n] of Object.entries(byKey).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  contradicted by access.${k}`);
console.log("");
for (const h of hits.slice(0, 25)) {
  console.log(`  ${h.id.padEnd(46)} [${h.peak}]`);
  console.log(`     fees=${JSON.stringify(h.fees)}   vs access.${h.key}: "${h.says}"`);
}
if (hits.length > 25) console.log(`  ... and ${hits.length - 25} more`);
