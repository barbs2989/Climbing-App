// TESTING A STORY, not confirming one. 16% of camping sites sit BELOW their route's trailhead,
// and the first eight examples were all named "...Campground" — so the obvious reading is "these
// are drive-to car campgrounds, and gain-from-the-trailhead is a meaningless question for them".
//
// That reading is plausible, which is exactly why it needs a global check rather than a glance at
// eight rows. If it is right, roadside vocabulary should be far commoner among the BELOW sites
// than among the ABOVE ones. If the two populations look alike, the story is wrong and the
// negatives are simply bad elevations.
//
// It also asks a question that would silently corrupt every derived gain: how many of these
// routes have MORE THAN ONE trailhead waypoint? Measuring against an arbitrary one of two is the
// documented two-trailhead trap, and it produces a wrong number with no symptom.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,bivy,waypoints&bivy=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ft = (o) => (o && has(o.elev) ? Number(o.elev) : o && has(o.elevM) ? Number(o.elevM) * 3.28084 : null);
const wpType = (w) => String((w && (w.type || w.kind)) || "").trim().toLowerCase();
const isTrailhead = (w) => /trailhead|trail head/.test(wpType(w));
const isCamp = (w) => /camp|bivy|bivouac/.test(wpType(w));

// Vocabulary of a place you DRIVE to. Deliberately narrow: "camp" alone is useless (every site
// here is a camp), and "road" appears in approach prose for backcountry sites too.
const ROADSIDE = /\b(campground|car camp|roadhead|road head|drive[- ]?in|trailhead camp|pullout|pull[- ]?out|forest service campground|state park|exit \d)/i;
// Vocabulary of a place you WALK to and sleep high on the route.
const BACKCOUNTRY = /\b(high camp|bivy|bivouac|basin|moraine|glacier|col\b|saddle|ridge camp|advanced base|snowfield|tarn)/i;

let above = 0, below = 0, aboveRoad = 0, belowRoad = 0, aboveBack = 0, belowBack = 0;
let multiTh = 0, routesWithTh = 0;
const belowExamples = [], belowNonRoad = [];

for (const row of rows) {
  const ws = arr(row.waypoints);
  const ths = ws.filter(isTrailhead);
  if (ths.length) routesWithTh++;
  if (ths.length > 1) multiTh++;
  const thFt = ft(ths[0]);
  if (thFt == null) continue;
  const sites = arr(row.bivy).map((b) => ({ name: (b && b.name) || "", notes: (b && b.notes) || "", ft: ft(b) }))
    .concat(ws.filter(isCamp).map((w) => ({ name: (w && w.name) || "", notes: (w && w.directions) || "", ft: ft(w) })));
  for (const s of sites) {
    if (s.ft == null) continue;
    const text = `${s.name} ${s.notes}`;
    const road = ROADSIDE.test(text), back = BACKCOUNTRY.test(text);
    if (s.ft >= thFt) { above++; if (road) aboveRoad++; if (back) aboveBack++; }
    else {
      below++; if (road) belowRoad++; if (back) belowBack++;
      if (belowExamples.length < 5) belowExamples.push(`${Math.round(s.ft - thFt)} ft  "${s.name.slice(0, 70)}"`);
      if (!road && belowNonRoad.length < 10) belowNonRoad.push(`${Math.round(s.ft - thFt)} ft  ${row.id}  "${s.name.slice(0, 70)}"`);
    }
  }
}

const p = (n, d) => (d ? Math.round((n / d) * 100) : 0);
console.log(`== sites with a comparable trailhead elevation: ${above + below}\n`);
console.log(`   AT OR ABOVE the trailhead : ${above}`);
console.log(`      roadside vocabulary    : ${aboveRoad} (${p(aboveRoad, above)}%)`);
console.log(`      backcountry vocabulary : ${aboveBack} (${p(aboveBack, above)}%)\n`);
console.log(`   BELOW the trailhead       : ${below}`);
console.log(`      roadside vocabulary    : ${belowRoad} (${p(belowRoad, below)}%)`);
console.log(`      backcountry vocabulary : ${belowBack} (${p(belowBack, below)}%)\n`);

const lift = p(belowRoad, below) - p(aboveRoad, above);
console.log(`   roadside language is ${lift >= 0 ? "+" : ""}${lift} points commoner among BELOW sites`);
console.log(lift >= 25
  ? `   -> STORY HOLDS: a site below the trailhead is overwhelmingly one you DRIVE to.`
  : `   -> STORY DOES NOT HOLD: the two populations look alike, so the negatives are not explained by car campgrounds.`);

console.log(`\n== TWO-TRAILHEAD TRAP`);
console.log(`   routes with a trailhead waypoint : ${routesWithTh}`);
console.log(`   ...with MORE THAN ONE            : ${multiTh} (${p(multiTh, routesWithTh)}%)  <- a gain measured against an arbitrary one`);

if (belowExamples.length) { console.log(`\n   below-trailhead examples:`); belowExamples.forEach((e) => console.log(`      ${e}`)); }
if (belowNonRoad.length) { console.log(`\n   below AND no roadside vocabulary (the residue the story does NOT explain):`); belowNonRoad.forEach((e) => console.log(`      ${e}`)); }
