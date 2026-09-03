// A route tells a party the only way in is a corridor the Park Service has closed.
//
// wa_hozomeen_mountain_southeast_face says, in two separate fields, that the north-end Silver Skagit
// approach is shut and therefore to use Ross Lake instead:
//   watch_out[1]  "... — the south-end Ross Lake approach is the only current option"
//   access.closures "... — plan on the south-end Ross Lake approach instead."
//
// VERIFIED DIRECTLY FROM THE AGENCY THIS SESSION, not from a report. nps.gov/noca fire-closures.htm
// lists, under Border 2 Fire Closures: the Obelisk Trail, the Hozomeen Lake Trail and the Willow Lake
// Trail; the Eastbank Trail north of Lightning Creek; the Lightning Creek boat-in camps "docks
// included"; "Ross Lake north of Lightning Creek boat-in Camp to the U.S./Canada border. Launching and
// operating vessels in the closed area is prohibited"; "The entire Hozomeen area, including docks,
// public areas, camping, etc"; and the Hozomeen Cross-country Zone.
//
// So the recommended corridor is closed: the water taxi cannot run north of Lightning Creek, the docks
// are shut, and the destination itself is inside a closure. The border half of each sentence is true;
// the recommendation that follows it is an affirmative all-clear for ground nobody may enter, which on
// an access field is the direction that actually sends somebody out.
//
// THE REPAIR IS A TRUNCATION AT THE EM-DASH, AND NOTHING IS WRITTEN. Each edit cuts the clause after
// the dash and keeps everything before it, so the true statement survives and no closure prose is
// authored. The script asserts the result is a strict PREFIX of the original — the same constraint
// that made the approach-scope trims safe — so it cannot rewrite prose, only stop it earlier.
//
// WHY NOT ADD THE FIRE CLOSURE. Six sibling Hozomeen rows already carry a dated Border 2 sentence, and
// copying one would propagate a list that is itself short of the agency's. Writing the full NPS list
// means authoring dated prose that ages into exactly the stale-closure class audit:expiring-closures
// exists to catch. Removing a false claim needs no source; adding a true one needs a maintained one.
// The shortfall across all seven rows is reported instead.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_hozomeen_mountain_southeast_face";
const CUTS = [
  { where: "watch_out[1]", find: " — the south-end Ross Lake approach is the only current option" },
  { where: "access.closures", find: " — plan on the south-end Ross Lake approach instead." },
];

const rows = await selectAll("routes", "id,watch_out,access", `id=eq.${TARGET}`, { pageSize: 10 });
const r = rows[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }

const wo = Array.isArray(r.watch_out) ? r.watch_out.slice() : null;
if (!wo) { console.error("watch_out is not an array — refusing"); process.exit(1); }
const ac = { ...(r.access || {}) };

let planned = 0;
const idx = wo.findIndex(x => typeof x === "string" && x.includes(CUTS[0].find));
if (idx >= 0) {
  const before = wo[idx], after = before.slice(0, before.indexOf(CUTS[0].find));
  if (!before.startsWith(after) || !after.trim()) { console.error("truncation would not leave a prefix — refusing"); process.exit(1); }
  console.log(`  watch_out[${idx}]\n     from ${JSON.stringify(before)}\n     to   ${JSON.stringify(after)}`);
  wo[idx] = after; planned++;
} else console.log(`  watch_out: the clause is already gone`);

if (typeof ac.closures === "string" && ac.closures.includes(CUTS[1].find)) {
  const before = ac.closures, cut = before.slice(0, before.indexOf(CUTS[1].find));
  // Restore the full stop the cut removes. Kept provably non-rewriting: the result must be the prefix
  // plus at most a single period, asserted, so this cannot become a licence to edit the sentence.
  const after = /[.!?]$/.test(cut) ? cut : cut + ".";
  if (!before.startsWith(cut) || !cut.trim() || after.replace(/\.$/, "") !== cut.replace(/\.$/, "")) {
    console.error("truncation would not leave a prefix — refusing"); process.exit(1);
  }
  console.log(`  access.closures\n     from ${JSON.stringify(before)}\n     to   ${JSON.stringify(after)}`);
  ac.closures = after; planned++;
} else console.log(`  access.closures: the clause is already gone`);

if (!planned) { console.log("\nnothing to do."); process.exit(0); }
console.log(`\nclauses to remove: ${planned}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { watch_out: wo, access: ac });
const after = (await selectAll("routes", "id,watch_out,access", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
const stillWo = (after.watch_out || []).some(x => typeof x === "string" && x.includes(CUTS[0].find));
const stillAc = typeof after.access?.closures === "string" && after.access.closures.includes(CUTS[1].find);
console.log(stillWo || stillAc
  ? `NOT FULLY APPLIED — watch_out:${stillWo} access.closures:${stillAc}`
  : "verified: the row no longer recommends the closed Ross Lake corridor");
