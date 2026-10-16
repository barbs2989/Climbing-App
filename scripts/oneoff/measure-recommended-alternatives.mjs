// HOW MANY ROUTES RECOMMEND AN ALTERNATIVE APPROACH, AND CAN THE CATALOG CHECK THEM?
//
// wa_north_star_mountain_east_route, its traverse sibling and wa_copper_peak_south_route each
// answered a closure by sending parties to the Phelps Creek / Trinity trailheads "instead" — and
// those trailheads are cut off by a second closure the catalog records on other routes. A positive
// recommendation is the worst place to be wrong: the party is there BECAUSE their first choice
// failed, so the fallback is the one thing they cannot cross-check.
//
// Before writing a detector for that, measure the class. This repo's own record (audit:area-parents
// shipping 41 findings of which 12 were real) is that a detector built before the class is sized
// spends its precision on noise.
//
// Report-only, read-only, anon key. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";

const FIELDS = [["road", "name"], ["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"],
                ["access", "closures"], ["access", "seasonal"]];

/* A RECOMMENDATION, not a mention. "the alternative is X" / "use X instead" / "approach via X
   instead" assert that X works; "X is also closed" does not. The construction has to carry the
   recommending word, because naming a second road is completely ordinary. */
const RECOMMENDS = /\b(?:instead|alternative(?:ly)?|the only (?:current |remaining )?(?:access|option|way)|use (?:the )?[A-Z])/;

// Does the same value also state that the thing it recommends is shut? Deliberately broad: this
// measurement is asking how many recommendations are ALREADY qualified, and over-counting those is
// the conservative direction for sizing a worklist.
const QUALIFIED = /clos(?:ed|ure)|gated|washed out|impassable|not a drive-to|no vehicle|foot(?: and| or |\/)bike/i;

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

let withRoad = 0, recommending = 0, unqualified = 0;
const samples = [];
for (const r of rows) {
  let any = false, rec = false, qual = false, hit = null;
  for (const [c, k] of FIELDS) {
    const v = r[c] && typeof r[c] === "object" ? r[c][k] : null;
    if (typeof v !== "string" || !v.trim()) continue;
    any = true;
    if (!RECOMMENDS.test(v)) continue;
    rec = true;
    if (QUALIFIED.test(v)) qual = true; else if (!hit) hit = { field: `${c}.${k}`, v };
  }
  if (any) withRoad++;
  if (!rec) continue;
  recommending++;
  if (qual || !hit) continue;
  unqualified++;
  if (samples.length < 14) samples.push({ id: r.id, ...hit });
}

console.log(`${withRoad} WA routes carry road/access prose.`);
console.log(`${recommending} (${(recommending / withRoad * 100).toFixed(1)}%) make a positive recommendation about an alternative approach.`);
console.log(`${unqualified} of those say nothing anywhere in the same value about that alternative being closed or gated.\n`);

console.log("SAMPLE — recommendations carrying no qualification in their own value:\n");
for (const s of samples) console.log(`   ${s.id}  ${s.field}\n      ${s.v.replace(/\s+/g, " ").slice(0, 210)}\n`);

console.log(`MEASURED AND NOT BUILT — read this before writing the detector.

An unqualified recommendation is NOT a defect: most alternatives are simply open, and saying so
needs no caveat. The class worth detecting is narrower — a recommendation whose target THIS CATALOG
records as closed on some OTHER route, which is what made the Spider Gap rows wrong.

The ${unqualified} candidates were read, and essentially all are correct work: Narada Falls really is the
winter/spring trailhead for the Tatoosh, the Ross Lake Resort water taxi really is an alternative
onto the east shore, and "camp at Lower Snowgrass instead" is a regulation rather than an approach.

The one that looks like a hit is not one either. wa_liberty_cap_ptarmigan_ridge_finish's driveNote
calls Mowich Lake "the standard trailhead" while the SR-165 Fairfax Bridge has been permanently shut
since April 2025 — but that same ROW says so, in access.closures and again in seasonalGate ("as of
the 2025 bridge closure, Mowich Lake itself requires a ~27-mile round trip"). This measurement is
per-VALUE, so it sees the unqualified half of an honest row.

So the detector is NOT built. It would need road identity resolved across many spellings (SR-20 /
State Route 20 / Highway 20 / North Cascades Highway — the normalisation audit:road-coverage had to
build) plus a per-row rather than per-value qualification test, to return a class whose only known
member was found by hand. audit:area-parents records the discipline: measure a detector's precision
before shipping it. This is that measurement, and it says no.

What DOES generalise is the shape, recorded for whoever meets it next: a fallback approach is the
worst place to be wrong, because the party is reading it precisely BECAUSE their first choice
failed.`);
