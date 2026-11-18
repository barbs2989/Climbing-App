// audit:optimal-season, second pass (owner "keep going", 2026-11-18). The first pass
// (fix-optimal-season-2026-11-18.mjs) held these on thin evidence; a second, wider research round
// found at least two independent sources for THIS line on each, agreeing:
//   Adams North Ridge     header Jun-Sep -> Jun-mid Jul   snow ridge; loose and rockfall-prone once it melts (window and calendar already said so)
//   Adams Lava Headwall   header Jun -> May-Jun           early season, before hard neve and rockfall (window already May to June)
//   Tye Peak East Slopes  header Nov-Apr -> Dec-Apr, window + calendar -> the winter snow season; the row's own
//                         best_season already said "December through April ... no dry-season ascents documented",
//                         while the window and calendar described a summer talus scramble
//   Honeymoon Route       header Apr-Jun -> May-Jun, window + May   spring couloir, before it melts out to loose rock
//   Mount Lawson          header Jun-Aug -> Late Jun-Sep, window + June   season runs into September; June is snowbound early
//   Whatcom South Spur    window + August   in season July through September
// STILL HELD: Adams "Wilson Glacier Headwall" (the name is a Rainier route; the row may be misfiled),
// Goode "Northeast Face" (sources describe only the NE Buttress), Forbidden "Northeast Face" (name is
// ambiguous), Snowking (glacier vs west-ridge line), South Twin Sister (sources too broad).
//
// Dry by default; --apply writes. Each row is pinned to the season and window read before this was
// written; a LOCKED ledger field is refused. Rollback: audits/optimal-season/2026-11-18-b.rollback.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");
const SUMMER_TYE = "Snow-free but trailless: brush and talus above Skyline Ridge, and few people go";

const FIXES = [
  { id: "wa_mount_adams_north_ridge", season: ["Jun-Sep", "Jun-mid Jul"], window: "June through mid-July" },
  { id: "wa_mount_adams_lava_glacier_headwall", season: ["Jun", "May-Jun"], window: "May to June" },
  { id: "wa_tye_peak_e_route", season: ["Nov-Apr", "Dec-Apr"],
    window: ["Jul-Oct; core dry-talus conditions are most reliable August-September",
      "December to April on snow from Skyline Lake; without snow it is a brushy, trailless talus scramble that few people do"],
    months: { replace: true, set: {
      December: { status: "good", reason: "Usually snow-covered by mid-month; thin early snow over the boulder field makes slow going" },
      January: { status: "optimal", reason: "Consolidated snow from Skyline Lake; check avalanche conditions after new or wet snow" },
      February: { status: "optimal", reason: "Consolidated snow from Skyline Lake; check avalanche conditions after new or wet snow" },
      March: { status: "good", reason: "A deep snowpack and longer days; the slope can be loaded after storms" },
      April: { status: "marginal", reason: "Snow softens and thins on the lower slopes; go early in the day" },
      July: { status: "marginal", reason: SUMMER_TYE },
      August: { status: "marginal", reason: SUMMER_TYE },
      September: { status: "marginal", reason: SUMMER_TYE },
    } } },
  { id: "wa_honeymoon_route", season: ["Apr-Jun", "May-Jun"],
    window: ["Late June (once Royal Basin permits open, before rock fully dries out)",
      "Late spring to early July, while snow still fills the couloir and holds its loose rock in place"],
    months: { set: { May: { status: "good", reason: "Snow fills the couloir and holds the rock; the approach can still be snowbound, so start early before the snow softens" } } } },
  { id: "wa_mount_lawson_standard", season: ["Jun-Aug", "Late Jun-Sep"],
    window: ["June through August; August is the most reliable window",
      "Late June through September, once the high snow has melted; the fords get easier as the river drops"],
    months: { set: { June: { status: "marginal", reason: "Snow lingers on the upper trail into late June and the fords run high with snowmelt; treat a high river as a reason to turn back" } } } },
  { id: "wa_south_spur", season: ["Jul-Sep", "Jul-Sep"],
    window: ["Late July — solid snow cover for a manageable glacier crossing",
      "July through September; the Impasse and the glacier go best on solid snow, so a late-melting year's late July is often kindest"],
    months: { set: { August: { status: "good", reason: "In season; as the snow thins the glacier turns to ice and the moats widen, so check recent conditions" } } } },
];

const key = requireServiceKey();
const ids = FIXES.map((f) => f.id);
const rows = Object.fromEntries((await selectAll("routes", "id,season,seasonal_guidance", `id=in.(${ids.join(",")})`, { pageSize: 1000 })).map((r) => [r.id, r]));
const res = await fetch(`${SUPABASE_URL}/rest/v1/route_field_evidence?select=route_id,field,level&route_id=in.(${ids.join(",")})`, { headers: { apikey: key, Authorization: "Bearer " + key } });
if (!res.ok) { console.error("ledger read failed: " + res.status); process.exit(1); }
const locked = new Set((await res.json()).filter((e) => /^locked/.test(e.level || "")).map((e) => e.route_id + ":" + e.field));

const plan = [], rollback = [];
let refused = 0;
for (const f of FIXES) {
  const r = rows[f.id], sg = r && r.seasonal_guidance;
  const [wFrom, wTo] = Array.isArray(f.window) ? f.window : [f.window, f.window];
  const why = !r ? "no such route" : r.season !== f.season[0] ? `season is "${r.season}", expected "${f.season[0]}"`
    : !sg || sg.optimalWindow !== wFrom ? `window changed: "${sg && sg.optimalWindow}"`
    : ["season", "seasonal_guidance"].find((c) => locked.has(f.id + ":" + c)) ? "a field is LOCKED in the ledger" : null;
  if (why) { console.log(`REFUSE ${f.id}: ${why}`); refused++; continue; }
  const body = {};
  if (f.season[0] !== f.season[1]) body.season = f.season[1];
  if (wFrom !== wTo || f.months) {
    const mb = f.months ? (f.months.replace ? {} : { ...(sg.monthBreakdown || {}) }) : sg.monthBreakdown;
    if (f.months) Object.assign(mb, f.months.set);
    body.seasonal_guidance = { ...sg, optimalWindow: wTo, ...(mb ? { monthBreakdown: mb } : {}) };
  }
  plan.push({ id: f.id, body, filter: `season=eq.${encodeURIComponent(f.season[0])}` });
  rollback.push({ id: f.id, season: r.season, seasonal_guidance: sg });
  console.log(`${APPLY ? "WRITE" : "would"} ${f.id}: ${Object.keys(body).join(" + ")}${body.season ? ` (season -> ${body.season})` : ""}`);
}
if (refused) { console.error(`\n${refused} refused — nothing written.`); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write."); process.exit(0); }

const dir = path.join(ROOT, "audits", "optimal-season");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "2026-11-18-b.rollback.json"), JSON.stringify(rollback, null, 1) + "\n");
for (const p of plan) await patchRow("routes", p.id, p.body, { filter: p.filter });
const after = Object.fromEntries((await selectAll("routes", "id,season,seasonal_guidance", `id=in.(${ids.join(",")})`, { pageSize: 1000 })).map((r) => [r.id, r]));
let bad = 0;
for (const p of plan) {
  const a = after[p.id];
  // jsonb stores keys in its own order, so compare by key, not by JSON.stringify (the first
  // --apply reported four landed writes as NOT LANDED for exactly that reason).
  const canon = (v) => v && typeof v === "object" ? Object.keys(v).sort().map((k) => [k, canon(v[k])]) : v;
  const same = (x, y) => JSON.stringify(canon(x)) === JSON.stringify(canon(y));
  const ok = (!p.body.season || a.season === p.body.season) && (!p.body.seasonal_guidance || same(a.seasonal_guidance, p.body.seasonal_guidance));
  console.log(`${ok ? "landed" : "NOT LANDED"} ${p.id}`); if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
