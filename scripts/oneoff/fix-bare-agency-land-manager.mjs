// The land-manager line on the Planner tab says only "U.S. Forest Service" on routes whose own row
// knows the forest, the ranger district and the wilderness.
//
// `access` carries two spellings of one fact. RouteDetail renders `ac.land_manager || ac.landManager`,
// and that order is DELIBERATE and correct — the comment beside it records why: `landManager` is legacy
// free prose (984 routes, 474 distinct values, a quarter over 110 characters, sometimes a whole
// sentence), so preferring it meant the canonical value was never seen. Measured across all 8,365 WA
// routes, the canonical value is the better one on balance where the two differ (555 rows): it names a
// ranger district 114 times against 69, a specific forest 45 against 23, a wilderness 159 against 76.
//
// THIS FIXES THE RESIDUE OF THAT DECISION, IN THE DATA RATHER THAN IN THE READER. On a small number of
// rows the canonical value is a bare agency name carrying no information at all — "U.S. Forest Service"
// — while the shadowed legacy value names the forest, the district and the wilderness. Six Amphitheater
// Mountain routes read "U.S. Forest Service" on screen while the row itself holds "Okanogan-Wenatchee
// National Forest, Methow Valley Ranger District (Pasayten Wilderness)". Which district administers the
// land is what decides who you call and which permit you need, so a bare agency name is close to
// useless on a screen a party plans access from.
//
// WHY NOT CHANGE THE READER: it was already set this way on purpose, and flipping it back would restore
// the defect that comment describes on 555 rows to fix 15. The data is the wrong half here.
//
// THE GATE IS CONSISTENCY, NOT LENGTH. The replacement must be the SAME agency, only more specific: the
// shown value must be a bare Forest Service name and nothing else, and the hidden value must name a
// National Forest. So this cannot swap in a different landowner — a National Park, a state or tribal
// manager in the hidden field is refused, not promoted. Nothing is typed: every replacement is a string
// the row already holds.
//
// The legacy value is left in place. It is the fallback the render comment describes, and after this
// write the two agree in substance anyway.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// The shown value must be EXACTLY one of these and nothing more — a bare agency with no unit named.
const BARE = /^(u\.?\s?s\.?\s*forest service|usfs|us forest service|forest service|usda forest service|national forest service)\.?$/i;
// The hidden value must name a National Forest, i.e. the same agency at a finer grain.
const SPECIFIC = /national forest/i;
// ...and must not name a different landowner, which would be a substitution rather than a refinement.
const OTHER_OWNER = /national park|state park|dnr|department of natural resources|indian reservation|tribal|bureau of land management|blm|county|private/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

let bareShown = 0;
const plan = [], refused = [];
for (const r of rows) {
  const a = r.access; if (!a || typeof a !== "object") continue;
  const shown = a.land_manager, hidden = a.landManager;
  if (typeof shown !== "string" || !BARE.test(shown.trim())) continue;
  bareShown++;
  if (typeof hidden !== "string" || !SPECIFIC.test(hidden)) { refused.push({ id: r.id, why: "no specific forest in the legacy value", hidden }); continue; }
  if (OTHER_OWNER.test(hidden)) { refused.push({ id: r.id, why: "legacy value names a DIFFERENT landowner — refinement not established", hidden }); continue; }
  plan.push({ id: r.id, from: shown, to: hidden, premise: a });
}
if (!bareShown) { console.error("no bare-agency land_manager found at all — the scan is broken, refusing"); process.exit(1); }

console.log(`\nrows whose SHOWN land manager is a bare agency name: ${bareShown}`);
console.log(`  ...repairable from the row's own legacy value: ${plan.length}`);
console.log(`  ...refused: ${refused.length}\n`);
for (const p of plan) {
  console.log(`  ${p.id}`);
  console.log(`      from ${JSON.stringify(p.from)}`);
  console.log(`      to   ${JSON.stringify(p.to.slice(0, 130))}`);
}
for (const r of refused) console.log(`  REFUSED ${r.id}: ${r.why}\n      legacy = ${JSON.stringify(String(r.hidden ?? "(absent)").slice(0, 110))}`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.access;
  if (!cur || cur.land_manager !== p.from || cur.landManager !== p.to) { console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue; }
  await patchRow("routes", p.id, { access: { ...cur, land_manager: p.to } });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) { if (after.get(p.id)?.access?.land_manager === p.to) ok++; else console.log(`  NOT APPLIED: ${p.id}`); }
console.log(`verified ${ok} of ${plan.length}`);
