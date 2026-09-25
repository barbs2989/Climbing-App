// Read-only: every WA route that mentions White Chuck anywhere a climber reads it, and what it says.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,approach,access,waypoints,bivy,descent_text", "id=like.wa_*", { key, pageSize: 1000 });
const RE = /white chuck|rat trap|fsr?[- ]?23\b|fr[- ]?23\b/i;
for (const r of rows) {
  const hits = [];
  const scan = (label, v) => { const s = typeof v === "string" ? v : JSON.stringify(v || ""); const m = s.match(new RegExp(".{0,90}(" + RE.source + ").{0,120}", "i")); if (m) hits.push(label + ": …" + m[0].replace(/\s+/g, " ") + "…"); };
  scan("approach", r.approach); scan("closures", (r.access || {}).closures); scan("access(other)", Object.fromEntries(Object.entries(r.access || {}).filter(([k]) => k !== "closures")));
  scan("trailheads", (r.waypoints || []).filter(w => /trailhead/i.test(w.type || ""))); scan("descent", r.descent_text);
  if (hits.length) console.log("\n" + r.id + " (" + r.area_id + ")\n  " + hits.join("\n  "));
}
