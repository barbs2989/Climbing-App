#!/usr/bin/env node
// Gather every `_conflicts` note the area-page research batches recorded (audits/area-pages/**),
// read each area's CURRENT stored values, and write research inputs for settling them.
//
//   node scripts/enrich/area-conflict-inputs.mjs --out DIR [--per 20]
//
// Read-only; anon key. The settled verdicts go to audits/area-pages/conflicts/ and are written by
// area-page-apply.mjs --overwrite (rock, aspect, approach, parking_note) and area-pin-apply.mjs
// (parking_name + pin, area coordinates).
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = opt("--out", "."), per = Number(opt("--per", 20));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []);
const notes = {};
for (const f of walk("audits/area-pages")) {
  if (f.includes("/conflicts/")) continue;
  const b = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [id, note] of Object.entries(b._conflicts || {})) notes[id] = note;
}
const ids = Object.keys(notes);
const k = anonKey();
const cols = "id,name,region,lat,lng,path,rock,aspect,approach,parking_name,parking_note,parking_lat,parking_lng,season_months";
const rows = [];
for (let i = 0; i < ids.length; i += 40) {
  const q = `areas?select=${cols}&id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(k) });
  if (!r.ok) { console.error("read failed", r.status, await r.text()); process.exit(1); }
  rows.push(...await r.json());
  await new Promise(res => setTimeout(res, 300));
}
const items = rows.map(a => {
  const { id, name, region, lat, lng, path: p, ...stored } = a;
  return { id, name, region, parentPath: p, lat, lng, stored, note: notes[id] };
});
console.error(`${ids.length} notes, ${items.length} areas read`);
let n = 1;
for (let i = 0; i < items.length; i += per, n++) {
  const f = `${out}/in-c${String(n).padStart(2, "0")}.json`;
  fs.writeFileSync(f, JSON.stringify(items.slice(i, i + per), null, 1));
  console.log(f);
}
