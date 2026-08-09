// The Plan tab picks its "official permits" link by regex over
//   landManager + access.permit + fees   (lowercased)
// with no regard for whether the keyword appears inside a NEGATION. Red Mountain's fees
// read "None — no climbing fee (National Forest wilderness, not Mount Rainier NP)", which
// contains "rainier", so a Snoqualmie peak in Mt Baker-Snoqualmie NF sends climbers to the
// Mount Rainier climbing-permit page — contradicting the row's own text.
//
// Count how many routes are affected, and separate the true matches from the negated ones.
import { selectAll } from "../lib/supabase-env.mjs";

// The app's own ordered branch list, same order (first match wins).
const BRANCHES = [
  ["enchantment", /enchantment/, "Enchantment Permit Area lottery"],
  ["north cascades", /north cascades/, "North Cascades NP backcountry permits"],
  ["rainier", /rainier/, "Mount Rainier climbing permits"],
  ["olympic", /olympic national park/, "Olympic NP wilderness permits"],
  ["recreation.gov", /recreation\.gov/, "Reserve on Recreation.gov"],
];
// A keyword is negated when the words right before it disclaim it.
const NEG = /\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except)\b[^.;]{0,40}$/i;

const flat = (v) => v == null ? "" : (typeof v === "string" ? v : JSON.stringify(v));
const accessText = (a) => {
  if (!a || typeof a !== "object") return "";
  const parts = [a.land_manager, a.landManager, a.permit, a.fees, a.cost_structure];
  if (a._raw) parts.push(a._raw.land_manager, a._raw.permit_type, a._raw.cost_structure, a._raw.permit_cost_structure);
  return parts.map(flat).filter(Boolean).join(" ");
};

// No `access=not.is.null` filter: that predicate is on an unindexed jsonb column and the
// anon role's 3s statement_timeout kills it (57014) over 205k rows. Keyset-paginate the
// whole table on the primary key and filter in JS instead.
const all = await selectAll("routes", "id,area_id,name,access,permit", null, { pageSize: 1000 });
const rows = all.filter((r) => r.access != null || r.permit != null);
console.log("routes scanned:", all.length, "| with an access/permit block:", rows.length);

let matched = 0; const negatedHits = [];
for (const r of rows) {
  const hay = (accessText(r.access) + " " + flat(r.permit)).toLowerCase();
  if (!hay.trim()) continue;
  for (const [key, re, label] of BRANCHES) {
    const m = re.exec(hay);
    if (!m) continue;
    matched++;
    // is EVERY occurrence of this keyword preceded by a negation?
    let anyAffirmative = false, idx = -1;
    while ((idx = hay.indexOf(m[0], idx + 1)) >= 0) {
      if (!NEG.test(hay.slice(Math.max(0, idx - 60), idx))) { anyAffirmative = true; break; }
    }
    if (!anyAffirmative) negatedHits.push({ id: r.id, name: r.name, key, label, snippet: hay.slice(Math.max(0, m.index - 70), m.index + 30) });
    break; // first branch wins, same as the app
  }
}
console.log("routes that get SOME permit link:", matched);
console.log("routes whose link comes ONLY from a negated mention:", negatedHits.length);

const byKey = {};
for (const h of negatedHits) byKey[h.label] = (byKey[h.label] || 0) + 1;
console.log("\nwrong link, by destination:");
for (const [k, v] of Object.entries(byKey).sort((a, b) => b[1] - a[1])) console.log("  " + String(v).padStart(5) + "  " + k);

console.log("\n--- 12 examples ---");
for (const h of negatedHits.slice(0, 12)) {
  console.log(h.id.padEnd(44), "->", h.label);
  console.log("      …" + h.snippet.replace(/\s+/g, " ") + "…");
}
