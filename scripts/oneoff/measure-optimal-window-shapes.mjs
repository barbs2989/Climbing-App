// What SHAPE is seasonal_guidance.optimalWindow, and can a picker reproduce it exactly?
//
// It is the last obviously-enumerable contribute sub-key: 404 distinct values, but the top ones
// are plain month ranges ("mid-July through September" x27). A two-select range picker would let
// three climbers land on the same value and clear the 3-agree gate, which free text cannot.
//
// THE CONSTRAINT THAT DECIDES THE DESIGN: the column holds a STRING and SeasonalGuidancePanel
// renders it directly. So the picker cannot store a structured object — it has to SERIALISE into
// the phrasing the catalog already uses, or a contributed window renders differently from every
// other route. That makes the connector, the modifiers and the capitalisation load-bearing rather
// than cosmetic, which is why they are measured rather than chosen.
//
// It also decides whether this is worth doing at all: if the values are mostly free-form, a picker
// throws most of them away and text is the honest answer, exactly as it was for estimatePerSeason
// and peakTraffic.

import { selectAll } from "../lib/supabase-env.mjs";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];
const MOD = "(early|mid|late)";
// `mid-July` and `mid July` both occur; the hyphen is part of what has to be reproduced.
const PART = `(?:${MOD}[- ])?(${MONTHS.join("|")})`;
const RANGE = new RegExp(`^${PART}\\s*(to|through|-|–|—|into)\\s*${PART}$`, "i");
const SINGLE = new RegExp(`^${PART}$`, "i");

const rows = await selectAll("routes", "id,seasonal_guidance", "seasonal_guidance=not.is.null", { pageSize: 1000 });
const vals = rows.map((r) => r.seasonal_guidance && r.seasonal_guidance.optimalWindow)
  .filter((v) => typeof v === "string" && v.trim());
if (!vals.length) { console.error("empty read — nothing to measure."); process.exit(1); }

const conn = {}, mods = {}, caps = {}, hyph = { "mid-July": 0, "mid July": 0 };
let range = 0, single = 0, other = 0;
const otherEx = [];
for (const v of vals) {
  const t = v.trim();
  const m = t.match(RANGE);
  if (m) {
    range++;
    conn[m[3].toLowerCase()] = (conn[m[3].toLowerCase()] || 0) + 1;
    for (const mo of [m[1], m[4]]) if (mo) mods[mo.toLowerCase()] = (mods[mo.toLowerCase()] || 0) + 1;
    // Capitalisation of the month as stored — the picker must reproduce it.
    const monthTok = m[2];
    caps[/^[A-Z]/.test(monthTok) ? "Capitalised" : "lowercase"] = (caps[/^[A-Z]/.test(monthTok) ? "Capitalised" : "lowercase"] || 0) + 1;
    if (/mid-/i.test(t)) hyph["mid-July"]++; else if (/mid /i.test(t)) hyph["mid July"]++;
  } else if (SINGLE.test(t)) single++;
  else { other++; if (otherEx.length < 8) otherEx.push(t); }
}

const pct = (n) => ((n / vals.length) * 100).toFixed(1) + "%";
console.log(`${vals.length} optimalWindow values\n`);
console.log(`  month RANGE  ${String(range).padStart(4)}  ${pct(range)}   <- a two-select picker reproduces these exactly`);
console.log(`  single month ${String(single).padStart(4)}  ${pct(single)}`);
console.log(`  other        ${String(other).padStart(4)}  ${pct(other)}   <- free-form; a picker would throw these away`);
console.log("\nconnectors:", conn);
console.log("modifiers:", mods);
console.log("month capitalisation:", caps);
console.log("hyphenation:", hyph);
console.log("\nfree-form examples (what a picker could NOT express):");
for (const e of otherEx) console.log("   " + e.slice(0, 110));
