#!/usr/bin/env node
// What climbs sit under each area of a season batch, by discipline? An area's season reaches the
// header of EVERY route filed on it or on its children (lib/seasonText.js routeSeasonShort), so an
// ice window on an area that also holds rock routes would tell a rock climber to come in January.
// areas.disciplines is empty on most areas, so this counts the routes themselves: those on the
// area and on its direct children (the reach of the header fallback). Read-only, service key.
//   node scripts/oneoff/season-disciplines.mjs audits/season/apply-NN.json --cache <areas.json>
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const k = requireServiceKey();
const ids = Object.keys(JSON.parse(fs.readFileSync(args[0], "utf8")));
const rows = JSON.parse(fs.readFileSync(args[args.indexOf("--cache") + 1], "utf8"));
const kids = new Map(); for (const a of rows) if (a.parent_id) kids.set(a.parent_id, [...(kids.get(a.parent_id) || []), a.id]);
for (const id of ids) {
  const under = [id, ...(kids.get(id) || [])], n = {};
  for (let i = 0; i < under.length; i += 80) {
    const part = under.slice(i, i + 80).map(encodeURIComponent).join(",");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=discipline&area_id=in.(${part})&limit=5000`, { headers: headers(k) });
    if (!r.ok) { console.error("read failed", r.status, await r.text()); process.exit(1); }
    for (const x of await r.json()) n[x.discipline || "?"] = (n[x.discipline || "?"] || 0) + 1;
    await new Promise(res => setTimeout(res, 300));
  }
  console.log(id.padEnd(48), Object.entries(n).sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d} ${c}`).join(", "));
}
