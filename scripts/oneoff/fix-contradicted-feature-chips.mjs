// Removes 13 `features` chips that the route's OWN text contradicts (2026-09-25 tag audit).
//
// All 410 routes carrying features were read against their own overview/beta/climbing_route/
// hazards; 19 chips were flagged and each was re-read by hand. Only the 13 below are removed —
// the six where the text disagrees with itself (Artic Rose "excellent protection throughout" vs
// "runout middle section", Mount Saul's "clean upper east face slabs", ...) are left alone.
// Four patterns account for all 13: a chip taken from the route NAME ("Notta Slab" is vertical;
// "Southeast Face" climbs a crack-chimney), a chip taken from a NEIGHBOURING line on the same
// peak (Garfield's face is Infinite Bliss's), a rock-feature chip on a Class 2-4 scramble, and
// "Sustained"/"Well-protected" on routes whose text says the opposite.
//
//   node scripts/oneoff/fix-contradicted-feature-chips.mjs          (dry run)
//   node scripts/oneoff/fix-contradicted-feature-chips.mjs --apply
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const REMOVE = [
  ["wa_blue_s_buttress", "Blue's Buttress", "Sustained", "occasional 5.6-5.7 crux pitches ... without continuous hard sections"],
  ["wa_castle_peak_tatoosh_southeast_face", "Southeast Face (Standard Route)", "Face", "the climbing is a crack-chimney system"],
  ["wa_mount_berge_southwest_route", "Southwest Route", "Technical", "Class 2-3 rock and steep heather/talus"],
  ["wa_unicorn_peak_r1", "Snow Lake / Unicorn Creek approach", "Face", "Class 3-4 scramble; 'face' names only a variation's aspect"],
  ["wa_notta_slab", "Notta Slab", "Slab", "a nice vertical middle section"],
  ["wa_phantom_peak_south_route", "South Route", "Face", "pocket glacier, broken rock step, ridge crest"],
  ["wa_remmel_mountain_nw_ridge", "NW Ridge", "Well-protected", "unprotected 3rd/4th-class-or-harder terrain near the summit"],
  ["wa_south_arete", "South Arete", "Sustained", "a short, moderate outing ... easier ground leads to the summit"],
  ["wa_slippery_slab_tower_ne_face", "Slippery Slab Tower NE Face", "Slab", "Despite its name, this route is neither slippery nor a slab"],
  ["wa_half_moon_southwest_slopes", "Southwest Slopes / Standard Scramble", "Face", "the South Face is a different line; this takes the SW Ridge"],
  ["wa_huckleberry_mountain_west_route", "West Route", "Face", "the 5.6 West Face is a separate 2001 line; this is the west-side gully"],
  ["wa_garfield_mountain_scramble", "Multi-Summit Scramble", "Face", "the only face named is Infinite Bliss's"],
  ["wa_complete_south_buttress", "Complete South Buttress", "Sustained", "easy, ledgy 3rd/4th-class slabs for many pitches ... wandering 5.6-5.8"],
];

const apply = process.argv.includes("--apply");
const key = requireServiceKey();
const here = path.dirname(fileURLToPath(import.meta.url));

async function read(ids) {
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,features&id=in.(${ids.map(encodeURIComponent).join(",")})`;
  const res = await fetch(q, { headers: headers(key) });
  if (!res.ok) throw new Error(`read -> ${res.status} ${await res.text()}`);
  return new Map((await res.json()).map(r => [r.id, r]));
}

const ids = [...new Set(REMOVE.map(x => x[0]))];
const live = await read(ids);
if (live.size !== ids.length) throw new Error(`expected ${ids.length} rows, read ${live.size} — refusing (service key? wrong id?)`);

const plan = new Map();
for (const [id, name, feat] of REMOVE) {
  const r = live.get(id);
  if (r.name !== name) throw new Error(`${id}: name is "${r.name}", expected "${name}" — refusing`);
  const cur = plan.get(id) || (Array.isArray(r.features) ? r.features : []);
  if (!cur.includes(feat)) { console.log(`skip  ${id}: "${feat}" already gone`); continue; }
  plan.set(id, cur.filter(f => f !== feat));
}
for (const [id, next] of plan) console.log(`${apply ? "write" : "would"} ${id}: ${JSON.stringify(live.get(id).features)} -> ${JSON.stringify(next)}`);
if (!apply) { console.log(`\ndry run: ${plan.size} rows. Re-run with --apply.`); process.exit(0); }

const backup = path.join(here, `feature-chip-fix-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(backup, JSON.stringify([...plan.keys()].map(id => ({ id, features: live.get(id).features })), null, 1));
console.log(`backup: ${path.relative(process.cwd(), backup)}`);
for (const [id, next] of plan) await patchRow("routes", id, { features: next });

// A 200 is not evidence the data changed: re-read and reconcile.
const after = await read([...plan.keys()]);
let bad = 0;
for (const [id, next] of plan) if (JSON.stringify(after.get(id)?.features) !== JSON.stringify(next)) { bad++; console.log(`MISMATCH ${id}: ${JSON.stringify(after.get(id)?.features)}`); }
console.log(bad ? `${bad} rows did not land` : `verified: ${plan.size} rows re-read and match`);
process.exit(bad ? 1 : 0);
