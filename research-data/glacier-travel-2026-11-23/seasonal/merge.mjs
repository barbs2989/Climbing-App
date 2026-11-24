// Merges seasonal-out-*.json into seasonal-decisions.json (what loads now) and seasonal-webcheck.json (what a web
// check must settle first). Read-only on the database. Rules (SEASONAL-RULE.md, owner 2026-11-24):
//  - snow_in_season: a flip TOWARD yes loads (more warnings: the careful error). A flip toward no waits for the web.
//  - glacier_travel: this pass read text only. A change toward yes or unsure loads unless the 2026-11-23 web
//    research settled that route (unsure-research.json); a change toward no never loads from absence of evidence.
//  - snow_free_from: loads when the final snow answer is yes AND the final glacier answer is no. On a glacier-yes or
//    unsure route a date removes glacier warnings late season, so it waits for the web check (Forbidden West Ridge).
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const ins = [], outs = [];
for (let i = 1; i <= 10; i++) { ins.push(...JSON.parse(fs.readFileSync(path.join(dir, `seasonal-in-${i}.json`), "utf8"))); outs.push(...JSON.parse(fs.readFileSync(path.join(dir, `seasonal-out-${i}.json`), "utf8"))); }
const webSettled = new Set(JSON.parse(fs.readFileSync(path.join(dir, "..", "unsure-research.json"), "utf8")).map((r) => r.id));
const inBy = new Map(ins.map((r) => [r.id, r]));
if (outs.length !== ins.length || outs.some((o) => !inBy.has(o.id))) throw new Error(`outputs (${outs.length}) do not match inputs (${ins.length})`);
const rank = { no: 0, unsure: 1, yes: 2 };
const decisions = [], web = [];
for (const o of outs) {
  const r = inBy.get(o.id);
  const reasons = [];
  let snow = r.snowInSeasonNow;
  if (o.snowInSeason !== snow) { if (rank[o.snowInSeason] > rank[snow]) snow = o.snowInSeason; else reasons.push(`snow ${snow} -> ${o.snowInSeason}`); }
  let glacier = r.glacierNow;
  if (o.glacier !== glacier) {
    if (rank[o.glacier] > rank[glacier] && !webSettled.has(o.id)) glacier = o.glacier;
    else if (rank[o.glacier] < rank[glacier]) reasons.push(`glacier ${glacier} -> ${o.glacier}`);
  }
  let from = null;
  if (o.snowFreeFrom && snow === "yes") { if (glacier === "no") from = o.snowFreeFrom; else reasons.push(`date ${o.snowFreeFrom} on a glacier-${glacier} route`); }
  const col = (v) => (v === "unsure" ? null : v);
  const changed = col(snow) !== col(r.snowInSeasonNow) || col(glacier) !== col(r.glacierNow) || from;
  if (changed) decisions.push({ id: o.id, name: r.name, glacier_travel: col(glacier), snow_in_season: col(snow), snow_free_from: from, was: { glacier_travel: col(r.glacierNow), snow_in_season: col(r.snowInSeasonNow) }, why: o.why });
  if (reasons.length) web.push({ id: o.id, name: r.name, peak: r.peak, season: r.season, proposed: { glacier: o.glacier, snowInSeason: o.snowInSeason, snowFreeFrom: o.snowFreeFrom, lateLine: o.lateLine }, reasons, why: o.why });
}
fs.writeFileSync(path.join(dir, "seasonal-decisions.json"), JSON.stringify(decisions, null, 1));
fs.writeFileSync(path.join(dir, "seasonal-webcheck.json"), JSON.stringify(web, null, 1));
const n = (f) => decisions.filter(f).length;
console.log(`routes: ${outs.length}; load now: ${decisions.length} (date set ${n((d) => d.snow_free_from)}, snow -> yes ${n((d) => d.snow_in_season === "yes" && d.was.snow_in_season !== "yes")}, glacier -> yes ${n((d) => d.glacier_travel === "yes" && d.was.glacier_travel !== "yes")}, glacier -> unsure ${n((d) => d.glacier_travel === null && d.was.glacier_travel !== null)}); web check: ${web.length}`);
