// audit:optimal-season, fifth pass (2026-11-18). Owner decisions on the held rows, and "do research to
// decide the rest" (read through the owner's Chrome, plus the AAJ):
//   Adams Wilson Glacier Headwall  owner: snow season + access note. Header Jul-Sep -> May-Jun; the
//       window says the east side is Yakama land open to the public only on summer dates set each year.
//   Goode NE Face                  owner: clear the wrong beta. Its beta ("Grade IV 5.5 ... 6-8 pitches")
//       describes the 1966 NE Buttress beside it (audits/route-grades/deep/out/g5.json); grade kept.
//   Snowking Standard              researched: The Mountaineers' page for this exact line (same Cascade
//       River Road / FR-1570 approach, Cyclone Lake, the small glacier) calls it a very good early-season
//       climb, May-June, and a WTA trip report climbed it on snow on May 26, 2019. Header May-Jul was
//       right; window, calendar and When to go said mid-summer.
//   Forbidden NE Face              researched: the AAJ report of the face's first ascent was climbed in
//       mid-September in fine late-season weather, from Boston Basin over Sharkfin Col (a summer
//       approach). Header Jul-Sep was right; the "late spring" window, calendar and When to go had no source.
// Dry by default; --apply writes. Each row is pinned to the values read before this was written.
// Rollback: audits/optimal-season/2026-11-18-d.rollback.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");

const FIXES = [
  { id: "wa_mount_adams_wilson_glacier_headwall",
    pin: { season: "Jul-Sep", window: "May to June" },
    set: { season: "May-Jun" },
    window: "May to June, while snow covers the headwall. This east side is Yakama land, open to the public only on summer dates set each year (day use, tribal permit), so check access before planning" },
  { id: "wa_goode_mountain_northeast_face",
    pin: { betaStart: "Grade IV 5.5 alpine rock with 6-8 pitches" },
    set: { beta: null } },
  { id: "wa_snowking_mountain_standard",
    pin: { season: "May-Jul", window: "Mid-July through early September, once the approach brush/trail is snow-free and the Snowking Glacier is still well-covered" },
    set: { best_season: "Early season, May to July, while snow still covers the upper mountain; it stays climbable into early autumn." },
    window: "May to July, while snow still covers the slopes above Cyclone Lake; later in summer the long approach is dry and water is scarce",
    months: {
      May: { status: "good", reason: "Snow over the ridge and the upper slopes; the trail can still be snow-covered in places" },
      June: { status: "optimal", reason: "The early-season window: snow over the upper mountain makes for the smoothest climb" },
      July: { status: "good", reason: "Still in season; the snow thins on the upper slopes as the month goes on" },
      August: { status: "marginal", reason: "Climbable, but the upper slopes are largely melted out and there is little water on the approach" },
      September: { status: "marginal", reason: "Climbable, but the upper slopes are largely melted out and there is little water on the approach" },
      October: { status: "marginal", reason: "Early autumn: new snow and short days on a long outing" },
    } },
  { id: "wa_forbidden_peak_northeast_face",
    pin: { season: "Jul-Sep", window: "Late spring to early summer, for the best face ice and snow." },
    set: { best_season: "July through September, once the Boston Basin approach and Sharkfin Col are in shape." },
    window: "July through September, once the Boston Basin approach and Sharkfin Col are in shape; settled late-summer weather suits the face",
    months: {
      June: { status: "marginal", reason: "Early: snow lingers on the Boston Basin approach and the col" },
      July: { status: "good", reason: "In season once the approach and the col have melted out" },
      August: { status: "good", reason: "In season" },
      September: { status: "good", reason: "In season; settled late-summer weather, but shorter days" },
    } },
];

requireServiceKey();
const ids = FIXES.map((f) => f.id);
const read = async () => Object.fromEntries((await selectAll("routes", "id,season,best_season,beta,seasonal_guidance", `id=in.(${ids.join(",")})`, { pageSize: 1000 })).map((r) => [r.id, r]));
const rows = await read();
const plan = [], rollback = [];
let refused = 0;
for (const f of FIXES) {
  const r = rows[f.id], sg = r && r.seasonal_guidance;
  const why = !r ? "no such route"
    : f.pin.season && r.season !== f.pin.season ? `season is "${r.season}"`
    : f.pin.window && (!sg || sg.optimalWindow !== f.pin.window) ? `window changed: "${sg && sg.optimalWindow}"`
    : f.pin.betaStart && !String(r.beta || "").startsWith(f.pin.betaStart) ? "beta changed" : null;
  if (why) { console.log(`REFUSE ${f.id}: ${why}`); refused++; continue; }
  const body = { ...f.set };
  if (f.window || f.months) body.seasonal_guidance = { ...sg, ...(f.window ? { optimalWindow: f.window } : {}), ...(f.months ? { monthBreakdown: f.months } : {}) };
  plan.push({ id: f.id, body });
  rollback.push({ id: f.id, ...Object.fromEntries(Object.keys(body).map((k) => [k, r[k]])) });
  console.log(`${APPLY ? "WRITE" : "would"} ${f.id}: ${Object.keys(body).join(" + ")}`);
}
if (refused) { console.error(`\n${refused} refused — nothing written.`); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write."); process.exit(0); }
const dir = path.join(ROOT, "audits", "optimal-season");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "2026-11-18-d.rollback.json"), JSON.stringify(rollback, null, 1) + "\n");
for (const p of plan) await patchRow("routes", p.id, p.body);
// jsonb reorders keys: compare by key (pass two's lesson).
const canon = (v) => v && typeof v === "object" ? Object.keys(v).sort().map((k) => [k, canon(v[k])]) : v;
const after = await read();
let bad = 0;
for (const p of plan) {
  const ok = Object.entries(p.body).every(([k, v]) => JSON.stringify(canon(after[p.id][k])) === JSON.stringify(canon(v)));
  console.log(`${ok ? "landed" : "NOT LANDED"} ${p.id}`); if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
