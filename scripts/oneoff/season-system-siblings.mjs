#!/usr/bin/env node
// For a system whose window has already been CONFIRMED on several of its sub-areas by independent
// research rounds (Joshua Tree, Red River Gorge, the Gunks…), list the sub-areas still without a
// season, with what was written on their siblings, so a reviewer can extend the system window to
// the ones that are plainly part of it. No DB: the census cache plus every apply-*.json.
//   node scripts/oneoff/season-system-siblings.mjs --cache <areas.json> <system id> [<system id> …]
import fs from "fs";

const args = process.argv.slice(2);
const ci = args.indexOf("--cache");
const rows = JSON.parse(fs.readFileSync(args[ci + 1], "utf8"));
const sysIds = args.filter((a, i) => i !== ci && i !== ci + 1);
const written = new Map();
for (const a of rows) if (Array.isArray(a.season_months) && a.season_months.length) written.set(a.id, a.season_months);
for (const f of fs.readdirSync("audits/season").filter(f => /^apply-.*\.json$/.test(f))) for (const [id, e] of Object.entries(JSON.parse(fs.readFileSync("audits/season/" + f, "utf8")))) written.set(id, e.season_months);
const units = new Set(JSON.parse(fs.readFileSync("audits/season/parents.json", "utf8")).map(e => e.id));
for (const sid of sysIds) {
  const kids = rows.filter(a => a.parent_id === sid);
  const wins = kids.filter(a => written.has(a.id)).map(a => `${a.name} ${JSON.stringify(written.get(a.id))}`);
  console.log(`\n${sid} — written on ${wins.length}: ${wins.join("; ")}`);
  for (const a of kids.filter(a => !written.has(a.id) && units.has(a.id))) console.log(`  open: ${a.id} | ${a.name}`);
}
