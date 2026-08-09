// The permit link already refuses a keyword that is DISCLAIMED ("not Mount Rainier NP").
// It still accepts one that is merely PERIPHERAL: 108 Mt. Baker Ranger District routes carry
//   "... Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park"
// and are sent to North Cascades NP backcountry permits — a National Forest route pointed at
// the Park Service, which is the same wrong-agency outcome the negation guard was written for.
//
// Simulate adding a peripheral-mention guard BEFORE changing the app, and show exactly which
// routes move and where they land. A permit link that moves for 300+ routes is not something
// to eyeball after the fact.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const BRANCHES = [
  [/enchantment/g, "Enchantment lottery"],
  [/north cascades/g, "North Cascades NP"],
  [/rainier/g, "Mount Rainier"],
  [/olympic national park/g, "Olympic NP"],
  [/recreation\.gov/g, "Recreation.gov"],
];
const PERMIT_NEG = /\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except|nor)\b[^.;]{0,40}$/i;
// A mention is peripheral when the text frames the place as something the route TOUCHES or
// SITS NEAR, rather than as the body that manages it. Deliberately narrow: each alternative
// is a phrase seen in the live data, not a guess at English.
const PERMIT_PERIPHERAL = /\b(?:crossing into|crosses into|cross into|partly (?:in|within|inside)|partially (?:in|within)|some (?:upper )?routes?|upper routes?|adjacent to|borders?(?: on)?|boundary (?:of|with)|near(?:by)?|approach (?:partly )?crosses|just outside|edge of)\b[^.;]{0,60}$/i;

function says(hay, re, peripheral) {
  if (!hay) return false;
  re.lastIndex = 0; let m;
  while ((m = re.exec(hay)) !== null) {
    const before = hay.slice(Math.max(0, m.index - 70), m.index);
    if (!PERMIT_NEG.test(before) && !(peripheral && PERMIT_PERIPHERAL.test(before))) return true;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return false;
}
const pick = (hay, peripheral) => { for (const [re, n] of BRANCHES) if (says(hay, re, peripheral)) return n; return null; };

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [300, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,access&access=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return JSON.parse(await r.text());
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.length) break; rows.push(...p); cursor = p[p.length - 1].id; if (p.length < 80) break; }
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }

const hay = (a) => String((a.landManager || a.land_manager || "") + " " + (a.permit || "") + " " +
  (typeof a.fees === "number" ? "$" + a.fees : (a.fees || ""))).toLowerCase();

// Union haystack: both land-manager strings, so no permit keyword either key carries is lost.
const hayBoth = (a) => String((a.land_manager || "") + " " + (a.landManager || "") + " " +
  (a.permit || "") + " " + (typeof a.fees === "number" ? "$" + a.fees : (a.fees || ""))).toLowerCase();

function report(label, after) {
  const moves = new Map(), byTarget = new Map(); let changed = 0;
  for (const r of rows) {
    const a = r.access || {};
    const before = pick(hay(a), false);            // shipped behaviour before any of this
    const now = after(a);
    if (before === now) continue;
    changed++;
    const k = String(before) + " -> " + String(now);
    moves.set(k, (moves.get(k) || 0) + 1);
    if (!byTarget.has(k)) byTarget.set(k, []);
    if (byTarget.get(k).length < 4) byTarget.get(k).push(r.id);
  }
  console.log(`=== ${label} — ${changed} routes change ===`);
  for (const [k, v] of [...moves.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
    console.log(`        e.g. ${byTarget.get(k).join(", ")}`);
  }
  console.log("");
}
console.log("routes with access:", rows.length, "\n");
report("C1 · peripheral guard, haystack unchanged", (a) => pick(hay(a), true));
report("C2 · peripheral guard + UNION haystack", (a) => pick(hayBoth(a), true));
console.log(`C2 is the combination worth having: the union stops the canonical key's detail
being thrown away (Mount Torment, Challenger, Olympus are genuinely Park Service and link to
nothing today), while the peripheral guard stops the Mt. Baker boilerplate the union would
otherwise let through. Judge C2 by whether every "-> a park" line is really that park's land.`);
