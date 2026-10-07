// check:area-duplicates — is any PLACE in the catalog filed twice?
//
// 2026-09-25..30: Mountain Project imports filed MP's `North Cascades › Mt. Baker` beside our
// `Bellingham and Mt Baker Hwy › Mount Baker` (~225 copies, 0213/0215/0217), and MP's parallel
// discipline trees put every crag's bouldering and ice under a second copy of the crag
// ("*Joshua Tree Bouldering* › Hidden Valley Area Bouldering" beside "Hidden Valley Area").
// 0221 folded 268 such pairs into one area each. The user: "fold into 1 area … i don't want
// duplicates". The MP import is still running state by state, so this asks, daily, whether a new
// one has landed.
//
// A PAIR is two areas in one state, under different parents, neither inside the other, both
// holding climbs, with coordinates under 3 km apart and the same name key — either 0214's
// catalog_key ("Mt." = "Mount", "The"/"Peak"/"Area"/"Ice"/"Crag" ignored), or that key with
// "Bouldering"/"Boulders"/"Mixed"/"Problems" also ignored when at least one of the two names
// carries such a word. A name that says ICE never pairs with one that says BOULDERING (0221's
// rule: "Cathedral Ledge Ice Climbs" and "Cathedral Ledge Bouldering" are two disciplines).
//
// Most pairs this finds on a clean catalog are DIFFERENT places sharing a generic name — the West
// Face of Daff Dome and of Fairview Dome, a Warm-Up Boulder in two canyons, Kraft Boulders beside
// Kraft Crags. Each was READ, and they are LISTED in scripts/data/area-duplicates-baseline.json.
// Any pair not on the list fails. A LIST, not a count: a count holds level when one pair is
// fixed and another lands.
//
// A SECOND pass (0255) pairs two areas under the SAME parent on the plain key, at any distance, with or
// without a coordinate or climbs — the first pass skipped them, and 209 such groups ("Pawn, The" beside
// "The Pawn") had collected unseen.
//
// What it cannot see: a copy under ANOTHER parent over 3 km from its twin (coordinate slop larger than
// that) or with no coordinate or no climbs yet, and a copy spelled differently beyond what the key folds
// ("Kody Block" vs "The Kody Boulder"). Long Hill's copy of Hidden in Plain Sight Boulders was all three
// (another parent, 4 km, other boulder names) and was found by its CLIMBS, not its name. The DB trigger (0216/0218) refuses a same-key
// area within 1.5 km at insert time; this is the after-the-fact sweep over what got past it.
//
//   npm run check:area-duplicates                      report; exit 1 on a pair not on the list
//   npm run check:area-duplicates -- --write-baseline   re-list today's pairs (only after READING each new one)
//
// Credentials: anon key; `areas` is publicly readable. No DB link needed, so it runs daily in CI.

import fs from "fs";
import path from "path";
import { selectAll } from "./lib/supabase-env.mjs";
import { searchCanon } from "../lib/search.js";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const BASELINE = path.join(ROOT, "scripts/data/area-duplicates-baseline.json");
const WRITE = process.argv.includes("--write-baseline");

// 0214 catalog_key's stoplist, word for word; `wide` adds the discipline words 0221 folded on.
const STOP = new Set(["the", "mount", "mountain", "mountains", "peak", "peaks", "area", "areas", "climbing", "climbs", "crag", "crags", "ice", "route", "via", "and", "of"]);
const WIDE = new Set(["bouldering", "boulders", "mixed", "problems"]);
const words = n => searchCanon(String(n ?? "")).split(" ").filter(Boolean);
const catalogKey = n => { const w = words(n); return w.filter(x => !STOP.has(x)).join(" ") || w.join(" "); };
const wideKey = n => { const k = catalogKey(n); return k.split(" ").filter(x => !WIDE.has(x)).join(" ") || k; };
const discWord = n => /\bice\b|mixed/i.test(n) ? "ice" : /boulder/i.test(n) ? "boulder" : "";
const DISC = /bouldering|boulders|\bice\b|mixed/i;
const km = (a, b) => { const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };

await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1 });   // cold start: see check-area-counts.mjs
const areas = await selectAll("areas", "id,name,parent_id,path,lat,lng,route_count", "", { pageSize: 1000 });
if (areas.length < 40000) { console.error(`check:area-duplicates: read only ${areas.length} areas — an empty read is not a clean catalog`); process.exit(2); }

const live = areas.filter(a => a.route_count > 0 && a.lat != null && a.lng != null && String(a.path).split(".").length >= 3);
const groups = new Map();
for (const a of live) {
  const st = String(a.path).split(".").slice(0, 2).join(".");
  a._k = catalogKey(a.name); a._w = wideKey(a.name); a._d = DISC.test(a.name);
  for (const k of new Set([a._k, a._w])) (groups.get(st + "|" + k) || groups.set(st + "|" + k, []).get(st + "|" + k)).push(a);
}
const within = (x, y) => String(y.path).startsWith(String(x.path) + ".");
const pairs = new Map();
for (const [g, list] of groups) {
  const k = g.slice(g.indexOf("|") + 1);
  if (k.length < 4 || list.length < 2) continue;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const x = list[i], y = list[j];
    if (x.parent_id === y.parent_id || within(x, y) || within(y, x)) continue;
    const plain = x._k === y._k, wide = x._w === y._w && (x._d || y._d);
    if (!plain && !wide) continue;
    if (!plain && discWord(x.name) && discWord(y.name) && discWord(x.name) !== discWord(y.name)) continue;
    const d = km(x, y);
    if (d >= 3) continue;
    const [a, b] = [x, y].sort((p, q) => p.id < q.id ? -1 : 1);
    pairs.set(a.id + "|" + b.id, `${a.name} / ${b.name} (${d.toFixed(2)} km)`);
  }
}
// SAME PARENT (0255): two children of one area under one key are one place filed twice — "Pawn, The"
// beside "The Pawn", "Mount X" beside "Mt. X", "Catskills" beside "Catskills (Ice)". The pass above skips
// them; 209 such groups had collected by 2026-10-07. No distance, coordinate or climb is required here:
// one copy of Poke-O-Moonshine had no coordinate, and an empty copy is still a second row on the screen.
// The plain key only: a crag beside its own "X Bouldering" / "X Boulders" sibling (the WIDE key, ~75
// pairs on 2026-10-07) is not paired here yet — some are one place, some a separate boulder field.
const sib = new Map();
for (const a of areas) {
  if (!a.parent_id || String(a.path).split(".").length < 3) continue;
  const k = a.parent_id + "|" + catalogKey(a.name);
  (sib.get(k) || sib.set(k, []).get(k)).push(a);
}
for (const [g, list] of sib) {
  const k = g.slice(g.indexOf("|") + 1);
  if (k.length < 3 || list.length < 2) continue;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const x = list[i], y = list[j];
    const [a, b] = [x, y].sort((p, q) => p.id < q.id ? -1 : 1);
    pairs.set(a.id + "|" + b.id, `${a.name} / ${b.name} (same parent)`);
  }
}
const found = Object.fromEntries([...pairs].sort());

if (WRITE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify({ written: new Date().toISOString().slice(0, 10), pairs: found }, null, 1) + "\n");
  console.log(`wrote ${Object.keys(found).length} READ pairs to ${path.relative(ROOT, BASELINE)}`);
  process.exit(0);
}
const base = JSON.parse(fs.readFileSync(BASELINE, "utf8")).pairs;
const fresh = Object.keys(found).filter(k => !(k in base));
const gone = Object.keys(base).filter(k => !(k in found)).length;
console.log(`areas=${areas.length}  same-place pairs=${Object.keys(found).length}  (listed ${Object.keys(base).length}, ${gone} since gone)`);
if (fresh.length) {
  console.error(`\ncheck:area-duplicates FAILED — ${fresh.length} pair(s) not on the list:`);
  for (const k of fresh) console.error(`  ${k.replace("|", "  ~  ")}   ${found[k]}`);
  console.error(`\nRead each one. The SAME place twice: fold it into one area (0221 is the pattern). Two
different places sharing a name: re-run with --write-baseline to list it as read.`);
  process.exit(1);
}
console.log("check:area-duplicates: ok — no place is filed twice beyond the pairs read as different places.");
