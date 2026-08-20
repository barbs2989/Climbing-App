// The token gate refused to clear wa_true_grit's `best_season` and `watch_out`, correctly: they
// name nothing Vesper-specific, so on that evidence alone they might be the route's own prose.
//
// But they describe "the peak's other north-face lines", "lingering early-season snow/ice", and
// "several unbridged creek crossings on the approach trail" — on a route filed at a Vantage
// basalt crag. The siblings at the same crag are an INDEPENDENT record of what an approach and a
// season look like there, the same way audit:trailhead-road uses a trailhead cluster. If none of
// them mentions snow or a creek crossing and their seasons are the desert spring/fall pattern,
// that is evidence about the place rather than a hunch about this row.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const AREA = "wa_postal_wall";
const COULEE = "wa_frenchman_coulee";
const SEL = "id,name,discipline,grade,pitches,season,best_season,approach,watch_out";

const wall = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&area_id=eq.${AREA}`, { headers: headers(k) })).json();
/* The whole coulee too — Postal Wall alone may be thinly enriched, and the season/approach of a
   crag is a property of the coulee, not of one wall. */
/* Derive the subtree path from the WALL's own row rather than hardcoding it. Two bugs came from
   not doing that, and both produced a believable wrong answer:
     - `path=like.*…*` is invalid on an ltree column — 42883, "operator does not exist: ltree ~~
       unknown".
     - the `cd.` version before it used a hand-typed path that MISSED the intermediate
       `wa_frenchman_coulee_aka_vantage` segment, so it returned 200 with ZERO areas. That reads
       as "this crag has no siblings" rather than "the query is wrong" — the vacuous-zero trap,
       inside a probe written to avoid exactly that. Fails closed on an empty subtree now. */
const wallArea = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,path&id=eq.${AREA}`, { headers: headers(k) })).json())[0];
if (!wallArea) { console.error(`area ${AREA} not found`); process.exit(1); }
const segs = String(wallArea.path).split(".");
const ci = segs.indexOf(COULEE);
if (ci < 0) { console.error(`"${COULEE}" is not a segment of ${wallArea.path} — refusing to guess`); process.exit(1); }
const subtree = segs.slice(0, ci + 1).join(".");
const _ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,path&path=cd.${subtree}`, { headers: headers(k) });
const _aj = await _ar.json();
if (!Array.isArray(_aj)) { console.error(`area query failed ${_ar.status}: ${JSON.stringify(_aj)}`); process.exit(1); }
const areas = _aj;
if (!areas.length) { console.error(`FAIL — 0 areas under ${subtree}; that is a broken query, not an empty catalog`); process.exit(1); }
console.log(`subtree ${subtree} -> ${areas.length} areas`);
const ids = areas.map((a) => a.id);
let coulee = [];
for (let i = 0; i < ids.length; i += 40) {
  const chunk = ids.slice(i, i + 40);
  coulee.push(...await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&area_id=in.(${chunk.join(",")})`, { headers: headers(k) })).json());
}

console.log(`\nPostal Wall: ${wall.length} routes · Frenchman Coulee subtree: ${coulee.length} routes across ${areas.length} areas\n`);

const ALPINE_TERRAIN = /\b(snow|ice|glacier|creek crossing|unbridged|north face|couloir|axe|crampons|basin|col\b|peak's)\b/i;
let withSeason = 0, withApproach = 0, alpineish = [];
const seasons = {};
for (const r of coulee) {
  if (r.season) { seasons[r.season] = (seasons[r.season] || 0) + 1; withSeason++; }
  if (r.approach) withApproach++;
  const txt = [r.approach, r.best_season, ...leaves(r.watch_out)].filter(Boolean).join("  ");
  const m = txt.match(ALPINE_TERRAIN);
  if (m) alpineish.push({ id: r.id, hit: m[0], txt: txt.slice(Math.max(0, txt.indexOf(m[0]) - 60), txt.indexOf(m[0]) + 80) });
}
console.log(`--- seasons recorded across the coulee (${withSeason} routes) ---`);
for (const [s, n] of Object.entries(seasons).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(n).padStart(4)}  ${s}`);

console.log(`\n--- routes in the coulee whose approach/season/watch_out mentions ALPINE terrain: ${alpineish.length} of ${coulee.length} ---`);
for (const a of alpineish.slice(0, 15)) console.log(`   ${a.id.padEnd(38)} [${a.hit}]  …${a.txt.replace(/\s+/g, " ")}…`);

console.log(`\n--- a few Postal Wall approaches, for what a normal one looks like here ---`);
for (const r of wall.filter((r) => r.approach).slice(0, 4)) console.log(`   ${r.id}: ${String(r.approach).slice(0, 190)}…`);
