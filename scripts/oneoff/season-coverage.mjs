#!/usr/bin/env node
// How many routes now show a season in the header? The census cache plus every apply-*.json
// written since (the applier only fills empty columns, so a batch id is a season on that area).
// Routes with their own routes.season are not counted here (1,035 at the 2026-10-28 census).
// No DB.   node scripts/oneoff/season-coverage.mjs --cache <areas.json>
import fs from "fs";

const rows = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf("--cache") + 1], "utf8"));
const set = new Set(rows.filter(a => Array.isArray(a.season_months) && a.season_months.length).map(a => a.id));
for (const f of fs.readdirSync("audits/season").filter(f => /^apply-.*\.json$/.test(f))) for (const id of Object.keys(JSON.parse(fs.readFileSync("audits/season/" + f, "utf8")))) set.add(id);
const byId = new Map(rows.map(a => [a.id, a]));
const kids = new Map(); for (const a of rows) if (a.parent_id) kids.set(a.parent_id, (kids.get(a.parent_id) || 0) + (a.route_count || 0));
let total = 0, cov = 0;
for (const a of rows) {
  const n = Math.max(0, (a.route_count || 0) - (kids.get(a.id) || 0)); if (!n) continue;
  total += n; if (set.has(a.id) || (a.parent_id && set.has(byId.get(a.parent_id)?.id))) cov += n;
}
console.log(`areas with a season: ${set.size}; routes whose header shows an area season: ${cov} of ${total} (${(100 * cov / total).toFixed(1)}%)`);
