// READ-ONLY. On a multi-day route read as a "summit day from camp" (planTimes.summitDayFromCamp), is the
// stored summit leg a ROUND TRIP from camp, or ONE WAY to the summit? The rows' own sectionBreakdown labels
// say, and the answer is split by whether the summit day is the LAST day (it ends at the car) or later
// days follow (it ends at a camp). Input: the --out file of measure-multiday-estimate.mjs.
//   node scripts/oneoff/measure-camp-leg-direction.mjs md.json
import fs from "fs";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const md = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).filter((x) => x.summitDayFromCamp && x.sd);
const key = requireServiceKey();
const rows = [];
for (let i = 0; i < md.length; i += 40) rows.push(...await selectAll("routes", "id,timing", `id=in.(${md.slice(i, i + 40).map((x) => `"${x.id}"`).join(",")})`, { key, pageSize: 200 }));
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
// The section whose hours equal the stored summit leg is the summit leg's own label.
const ROUND = /\b(and back|back to (?:high |base )?camp|return(?:ing)? to (?:high |base )?camp|round[- ]trip|camp to camp|to camp and back|summit and back|descend(?:ing)? to (?:high |base )?camp|back down to (?:high |base )?camp)\b/i;
const ONEWAY = /\b(to the (?:summit|top)|to summit|up .* to the summit|summit push|camp to (?:the )?summit)\b/i;
const tally = {};
const ex = {};
for (const x of md) {
  const t = (byId[x.id] || {}).timing || {};
  const sec = (t.sectionBreakdown || []).find((s) => s && typeof s.hrs === "number" && Math.abs(s.hrs - t.summitTimeHrs) < 0.01);
  const lbl = sec ? `${sec.section || ""} ${sec.fromTo || ""} ${sec.note || ""}` : "";
  const dir = !sec ? "no label" : ROUND.test(lbl) ? "ROUND TRIP" : ONEWAY.test(lbl) ? "ONE WAY" : "unclear";
  const end = x.sd.outDays === 0 ? "ends at car" : "later days";
  const k = `${end} | ${dir}`;
  tally[k] = (tally[k] || 0) + 1;
  (ex[k] = ex[k] || []).push(`${x.id}: "${(sec ? sec.fromTo : "").slice(0, 70)}"`);
}
console.log(md.length, "routes read as a summit day from camp");
for (const k of Object.keys(tally).sort()) { console.log(`  ${k.padEnd(32)} ${tally[k]}`); for (const e of ex[k].slice(0, 3)) console.log("      " + e); }
