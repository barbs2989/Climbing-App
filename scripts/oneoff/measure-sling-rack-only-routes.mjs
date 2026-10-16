// Can the RACK box say "nobody has recorded what this route itself takes" ABOVE this route's own
// recorded rack?
//
// `rackGeneric` is `!routeRackFor(route)`, and routeRackFor reads contribRack -> detailedRack ->
// proNeeds -> rack. It does NOT read slingRack — while RouteRackBox pushes the sling-rack bullets
// into the list regardless. So a route carrying ONLY a sling rack renders its own webbing under a
// caption saying nobody recorded anything for it.
//
// Whether that is a defect or an unreachable branch is a question about the DATA, so it is
// measured rather than reasoned about. dbRouteToCamel fills `rack` from `rack` OR `gear`, so both
// count as "has a rack" here — mimic the mapper, never the column. Read-only.
import { selectAll } from "../lib/supabase-env.mjs";

const dead = (w) => { console.error(`\nMEASUREMENT FAILED — ${w}.\n`); process.exit(1); };
const has = (v) => Array.isArray(v) ? v.length > 0 : (typeof v === "string" ? v.trim() !== "" : v != null);

const rows = await selectAll("routes", "id,sling_rack,rack,gear,detailed_rack,pro_needs", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read — the answer would be a vacuous zero");

const only = rows.filter((r) => !has(r.rack) && !has(r.gear) && !has(r.detailed_rack) && !has(r.pro_needs));
console.log(`routes carrying a sling_rack: ${rows.length}`);
console.log(`...of which NOTHING else feeds routeRackFor (rack/gear/detailed_rack/pro_needs all empty): ${only.length}`);
for (const r of only.slice(0, 25)) console.log(`  ${r.id}   ${JSON.stringify(r.sling_rack).slice(0, 120)}`);
if (only.length > 25) console.log(`  … and ${only.length - 25} more`);
console.log(
  only.length
    ? `\n${only.length} route(s) show their OWN recorded rack under a caption saying nobody recorded one.`
    : `\nnone — the caption cannot contradict the bullets, because every sling_rack route also feeds routeRackFor. Unreachable, not a defect.`
);
