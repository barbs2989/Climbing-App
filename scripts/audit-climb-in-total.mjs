#!/usr/bin/env node
// audit:climb-in-total — is CLIMBING in every planner Total? (owner rule, 2026-10-30)
//
// The Total always carries the climb. Two gaps are possible, and this census reports both:
//   1. VIA-NO-CLIMB — a way in that reaches the route through a sibling route's base, whose own text
//      describes climbing to reach that base (chimney, couloir, gully, scramble, ridge, pitch, glacier
//      crossing...) and which carries no climbToStartHrs. The walk alone is then the whole Total.
//   2. NO-CLIMB-ON-FILE — a route with no pitch count, no summit time and no derivable summit leg.
//      The planner cannot add a climb it has no figure for; its Total stays a floor ("≥"). Reported
//      so an owner can supply the figure, never filled with an invented one.
// Read-only. Exit 1 when VIA-NO-CLIMB is non-empty.
//
// Usage: node scripts/audit-climb-in-total.mjs [--json]

import { selectAll } from "./lib/supabase-env.mjs";

const asJson = process.argv.includes("--json");
const CLIMB_WORDS = /\b(chimney|chimneys|couloir|gully|scramble|scrambling|pitch|pitches|rock climb|climb(?:ing)? (?:up|to|through)|glacier crossing|crevasse|bergschrund|ice (?:climb|step|pitch)|rope|belay)\b/i;
const rows = await selectAll("routes", "id,name,pitches,length_m,discipline,timing,approach_variants", null, { pageSize: 1000 });

const viaNoClimb = [];
const noClimbOnFile = [];
for (const r of rows) {
  const tm = r.timing || {};
  const hasSummit = tm.summitTimeHrs != null;
  const derivedSummit = !hasSummit && tm.totalHrs != null && (tm.totalHrs - (tm.approachTimeHrs || 0) - (tm.descentTimeHrs || 0)) > 0;
  const pitched = r.pitches > 0;
  if (!hasSummit && !derivedSummit && !pitched && /^(alpine|ice|mixed|trad)\b/i.test(r.discipline || "")) {
    // planTimes estimates the pitches from the length (lib/planTimes.js climbPitches); a route with
    // neither a count nor a length has NO climb in its Total at all.
    noClimbOnFile.push({ id: r.id, name: r.name, discipline: r.discipline, lengthM: r.length_m ?? null });
  }
  for (const v of Array.isArray(r.approach_variants) ? r.approach_variants : []) {
    if (!v || !v.viaRouteId || v.climbToStartHrs != null) continue;
    const text = [v.name, v.summary, v.text, v.description, v.note, v.how, v.why].filter((x) => typeof x === "string").join(" ");
    if (CLIMB_WORDS.test(text)) viaNoClimb.push({ routeId: r.id, name: r.name, viaRouteId: v.viaRouteId, matched: (text.match(CLIMB_WORDS) || [""])[0], text: text.slice(0, 300) });
  }
}

if (asJson) console.log(JSON.stringify({ viaNoClimb, noClimbOnFile }, null, 2));
else {
  console.log(`audit:climb-in-total — ${rows.length} routes read`);
  console.log(`VIA-NO-CLIMB: ${viaNoClimb.length} way(s) in whose text describes climbing and carry no climbToStartHrs`);
  for (const x of viaNoClimb) console.log(`  ${x.routeId}  via ${x.viaRouteId}  [${x.matched}]  ${x.text.slice(0, 160)}`);
  const byLength = noClimbOnFile.filter((x) => x.lengthM > 0).length;
  console.log(`NO-CLIMB-ON-FILE: ${noClimbOnFile.length} climbing route(s) with no pitch count, summit time or derivable summit leg`);
  console.log(`  of which ${byLength} have a length: the climb is estimated from it (climbPitches); ${noClimbOnFile.length - byLength} have neither, so their Total has NO climb in it`);
}
process.exit(viaNoClimb.length ? 1 : 0);
