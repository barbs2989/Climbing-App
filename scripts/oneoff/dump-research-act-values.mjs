// Print the 10 research-act values in FULL, so a repair can be written as an exact find/replace
// rather than against the audit's truncated display text.
import { selectAll } from "../lib/supabase-env.mjs";

const IDS = [
  "wa_blizzard_peak_standard", "wa_castle_peak_pasayten_scramble", "wa_chiwawa_mountain_southwest",
  "wa_earl_peak_standup_creek_route", "wa_helmet_butte_standard_route", "wa_lizard_mountain_south_route",
  "wa_mount_carru_scramble", "wa_mount_degenhardt_southwest_route", "wa_old_snowy_mountain_r1",
];
const RESEARCH_ACT = /as of (this|the most recent|the latest|my|our)\s*(writing|research|update|check|report|reports|available|information|pass)|at the time of (writing|research)|as of this research/i;

const rows = await selectAll("routes", "id,road,access", `id=in.(${IDS.join(",")})`);
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

for (const r of rows) {
  for (const [obj, name] of [[r.road, "road"], [r.access, "access"]]) {
    if (!obj || typeof obj !== "object") continue;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== "string" || !RESEARCH_ACT.test(v)) continue;
      console.log(`\n=== ${r.id}  ${name}.${k}`);
      console.log(JSON.stringify(v));
      console.log(`    match: ${JSON.stringify(v.match(RESEARCH_ACT)[0])}`);
    }
  }
}
