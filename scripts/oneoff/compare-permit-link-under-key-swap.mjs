// Blast radius of swapping the land-manager key preference.
//
// RouteDetail builds     landMgrVal = ac.landManager || ac.land_manager
// and then feeds it into  _pmLm = landMgrVal + permit + fees
// which selects the official-permits link. So changing which key wins ALSO changes which
// agency page climbers are sent to. That link was 67% wrong once already (#permit-negation);
// it must not be moved on a hunch.
//
// This replays the app's exact branch order and negation guard under both key preferences and
// reports every route whose LINK changes, not just whether the displayed string changes.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

// Copied verbatim from RouteDetail.jsx — same order, first match wins.
const BRANCHES = [
  [/enchantment/g, "Enchantment lottery"],
  [/north cascades/g, "North Cascades NP"],
  [/rainier/g, "Mount Rainier"],
  [/olympic national park/g, "Olympic NP"],
  [/recreation\.gov/g, "Recreation.gov"],
];
const PERMIT_NEG = /\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except|nor)\b[^.;]{0,40}$/i;
function _pmSays(hay, re) {
  if (!hay) return false;
  re.lastIndex = 0; let m;
  while ((m = re.exec(hay)) !== null) {
    if (!PERMIT_NEG.test(hay.slice(Math.max(0, m.index - 60), m.index))) return true;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return false;
}
const pick = (hay) => { for (const [re, name] of BRANCHES) if (_pmSays(hay, re)) return name; return null; };

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [300, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,access&access=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.rows.length) break; rows.push(...p.rows); cursor = p.rows[p.rows.length - 1].id; if (p.rows.length < 80) break; }
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }
console.log("routes with access:", rows.length, "\n");

const hay = (lm, a) => String((lm || "") + " " + (a.permit || "") + " " + (typeof a.fees === "number" ? "$" + a.fees : (a.fees || ""))).toLowerCase();
function tally(label, lmFor) {
  let same = 0, gained = 0, lost = 0, moved = 0;
  const changes = [];
  for (const r of rows) {
    const a = r.access || {};
    const o = pick(hay(a.landManager || a.land_manager, a));   // today
    const n = pick(lmFor(a));
    if (o === n) { same++; continue; }
    if (!o && n) gained++; else if (o && !n) lost++; else moved++;
    if (changes.length < 8) changes.push({ id: r.id, o, n });
  }
  console.log(`=== ${label} ===`);
  console.log(`  unchanged: ${same} | none->link: ${gained} | link->NONE: ${lost} | link->OTHER: ${moved}`);
  if (lost || moved) { console.log("  regressions/moves:"); for (const c of changes.filter((c) => c.o)) console.log(`    ${c.id}: ${c.o} -> ${c.n}`); }
  console.log("");
  return { lost, moved, gained };
}

// (A) the naive swap: canonical wins everywhere, including the permit haystack.
tally("A · prefer land_manager for BOTH display and matching", (a) => hay(a.land_manager || a.landManager, a));
// (B) keep matching on everything available: display can prefer the canonical value while the
//     haystack sees BOTH strings, so no permit keyword the legacy prose carries is thrown away.
const both = tally("B · display canonical, MATCH on land_manager + landManager + permit + fees",
  (a) => hay(String(a.land_manager || "") + " " + String(a.landManager || ""), a));

console.log(`Choosing between them: (A) loses links the legacy prose earned — "Mount Rainier
National Park" collapses to "National Park Service", and the Enchantments permit area
disappears from Alpine Lakes routes. (B) can only ADD keywords to the haystack, so a link is
never lost; every link it gains comes from text already on the route. B's "link->OTHER" count
(${both.moved}) is the only set needing inspection: those are routes where the added text hit an
EARLIER branch in the first-match-wins order.`);
