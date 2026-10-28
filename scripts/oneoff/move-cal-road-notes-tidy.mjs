// Four Trip plan notes that read wrong once move-cal-road-notes.mjs took their road sentence away:
// one pointed at "the same page" (the moved sentence), one said "so plan the first night elsewhere"
// without the closed camp that was the reason, one was left saying only "assumes the road is drivable",
// one talked about the route's own 'snow/scramble' label. Each is rewritten in plain words, only if the
// note is still exactly what the move left.
//   node scripts/oneoff/move-cal-road-notes-tidy.mjs [--write]
import { SUPABASE_URL, headers, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import fs from "node:fs";
const key = requireServiceKey();
const plan = JSON.parse(fs.readFileSync(new URL("./move-cal-road-notes.plan.json", import.meta.url), "utf8"));
const NEXT = {
  wa_mount_duckabush_standard: "More than 50 downed trees have been reported between the trailhead and the Upper Duckabush ford, so check current trail conditions before planning this trip.",
  wa_bear_mountain_chilliwack_north_buttress: "Best climbed July-September once the Chilliwack River crossing has dropped and the Bear Creek ford and approach gullies are manageable. This plan uses the US approach over Hannegan Pass; a North Cascades National Park wilderness permit is needed for every night past the pass.",
  wa_lichtenberg_mountain_se_route: "",
  wa_mount_hardy_snow_scramble: "This high alpine route often holds snow into July; the scree and talus firm up by August-September.",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
for (const [id, cal] of Object.entries(NEXT)) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,itinerary`, { headers: headers(key) });
  const [row] = await r.json();
  const want = plan.find((p) => p.id === id).cal.trim();
  if (!row || row.itinerary.cal !== want) { console.log("SKIP, note changed:", id); continue; }
  const it = { ...row.itinerary }; if (cal) it.cal = cal; else delete it.cal;
  console.log(id, "->", cal || "(removed)");
  if (!process.argv.includes("--write")) continue;
  await patchRow("routes", id, { itinerary: it });
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=itinerary`, { headers: headers(key) });
  const [a] = await r2.json();
  if ((a.itinerary.cal || "") !== cal) { bad++; console.log("RE-READ MISMATCH", id); }
  await sleep(1200);
}
console.log("mismatches", bad); process.exit(bad ? 1 : 0);
