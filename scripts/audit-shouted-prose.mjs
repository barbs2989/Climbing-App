// audit:shouted-prose — does any string a climber reads SHOUT in ALL CAPS?
//
// Walks every rendered text column of `routes` and `areas.blurb` through scripts/lib/shouted-prose.mjs
// (which records what counts as shouting and what does not). Skips `name` (some real climb names are
// capitalised) and `fa` (climber initials). Exits 1 when anything shouts.
//
//   npm run audit:shouted-prose            summary + first findings
//   npm run audit:shouted-prose -- --all   every finding
//   npm run audit:shouted-prose -- --wa    Washington only (fast)
import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";
import { shoutedStrings } from "./lib/shouted-prose.mjs";

const args = process.argv.slice(2);
const key = requireServiceKey();
const COLS = "id,season,gear,hazards,overview,beta,turnaround,rappels,face,comms,descent,obj_haz,waypoints,timing,detailed_rack,what_to_bring,pro_tips,watch_out,pro_needs,best_season,approach,descent_text,bail,pitch_detail,itinerary,access,road,climate,emergency,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,difficulty,approach_logistics,rope_note,rappel_detail,rappel_count_note,features,approach_variants,climbing_route,bivy,description,crux,rock,landing,pads,start_type";
const filter = args.includes("--wa") ? "id=like.wa_*" : "";
const findings = [];
const areas = await selectAll("areas", "id,blurb", filter, { key, pageSize: 1000 });
for (const a of areas) for (const f of shoutedStrings(a.blurb, "blurb")) findings.push({ table: "areas", id: a.id, ...f });
const routes = await selectAll("routes", COLS, filter, { key, pageSize: 1000 });
for (const r of routes) {
  const { id, ...rest } = r;
  for (const f of shoutedStrings(rest)) findings.push({ table: "routes", id, ...f });
}
console.log(`audit:shouted-prose — ${areas.length} areas, ${routes.length} routes scanned; ${findings.length} shouted strings on ${new Set(findings.map(f => f.id)).size} rows`);
for (const f of args.includes("--all") ? findings : findings.slice(0, 40)) console.log(`  ${f.table}.${f.id}  ${f.path}  ${f.fragments.slice(0, 8).join(" ")}`);
process.exit(findings.length ? 1 : 0);
