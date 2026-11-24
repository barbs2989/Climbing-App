// Builds final-seasonal.json: seasonal-decisions.json (the careful text-only answers) with the web check
// (web-out-*.json) applied on top. A web answer counts only when `verified` (a source supported it); an unverified
// route keeps its careful answers and gets no date. A date is written only on a route that is snow yes and glacier
// no, except Forbidden West Ridge, which the owner settled (2026-11-24: the couloir early season, then the
// Cat Scratch gullies once it melts out). Read-only on the database.
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const col = (v) => (v === "unsure" ? null : v ?? null);
const ins = []; for (let i = 1; i <= 10; i++) ins.push(...J(`seasonal-in-${i}.json`));
const now = new Map(ins.map((r) => [r.id, { glacier_travel: col(r.glacierNow), snow_in_season: col(r.snowInSeasonNow) }]));
const out = new Map(J("seasonal-decisions.json").map((d) => [d.id, { id: d.id, glacier_travel: d.glacier_travel, snow_in_season: d.snow_in_season, snow_free_from: d.snow_free_from, basis: "text" }]));
out.set("wa_forbidden_peak_west_ridge", { id: "wa_forbidden_peak_west_ridge", glacier_travel: "yes", snow_in_season: "yes", snow_free_from: "08-15", basis: "owner" });
let verified = 0, unverified = 0;
for (let i = 1; i <= 3; i++) for (const w of J(`web-out-${i}.json`)) {
  if (!w.verified) { unverified++; continue; }
  verified++;
  const base = out.get(w.id) || Object.assign({ id: w.id }, now.get(w.id));
  const g = col(w.glacier), s = col(w.snowInSeason);
  const date = w.snowFreeFrom && s === "yes" && g === "no" ? w.snowFreeFrom : null;
  out.set(w.id, { id: w.id, glacier_travel: g === "yes" && s !== "yes" ? "yes" : g, snow_in_season: g === "yes" ? "yes" : s, snow_free_from: date, basis: "web" });
  if (base.snow_in_season === "yes" && s === "no") out.get(w.id).note = "web: dry in season (was yes)";
}
// Drop rows that change nothing against the catalog's current answers.
const rows = [...out.values()].filter((r) => { const n = now.get(r.id) || {}; return r.snow_free_from || r.glacier_travel !== (n.glacier_travel ?? null) || r.snow_in_season !== (n.snow_in_season ?? null); });
fs.writeFileSync(path.join(dir, "final-seasonal.json"), JSON.stringify(rows, null, 1));
console.log(`final-seasonal: ${rows.length} rows (${rows.filter((r) => r.snow_free_from).length} dated); web verified ${verified}, unverified ${unverified}`);
