// THE CHEAPEST FILL THERE IS: the catalog already holds this camp's height, on another route.
//
// solve-camp-elevations.mjs has a WAYPOINT-donor path (the waypoint store is 98% populated) and no
// BIVY-to-BIVY one, so a camp whose height is recorded on a sibling route stayed blank.
// measure-missing-camp-elevations.mjs has been labelling these FREE the whole time — "same name,
// same region, elevation already known" — and nothing acted on the label.
//
// THE GATES, and each is a mistake this catalog has already paid for:
//   - IDENTITY, never token overlap. The loose version of this gate accepted 855 rows and gave a
//     town park in Darrington a ridge camp's 4,900 ft, because it treated `pass`, `camp`, `lake`
//     and `basin` as noise when they are FEATURE TYPES THAT DISCRIMINATE. Only a trailing CAMP
//     word is stripped, so "Whatcom Camp" still does not equal "Whatcom Pass".
//   - SAME REGION (the 4-segment ltree prefix). A namesake is the standing failure here: "Five
//     Mile Camp" exists in both the North Cascades and the Olympics, 250 km apart.
//   - UNANIMITY, which is stricter than the solver's own 400 ft cross-check tolerance and is the
//     point of this script. Where donors disagree at all, one of them is wrong and copying either
//     is a silent pick. "Whatcom Camp, Brush Creek below Whatcom Pass" has donors at 5,286 and
//     5,500 ft — inside the solver's tolerance, and refused here. A 214 ft spread on a camp is a
//     finding, not a rounding difference.
//
// This propagates a number the catalog already publishes rather than deriving a new one, so there
// is nothing to corroborate against the ground: if the donor is wrong, the recipients were already
// being shown that wrong number on every other route carrying the camp.
import { SUPABASE_URL, requireServiceKey, headers, patchRow, selectAll } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const H = headers(requireServiceKey());

const areas = await selectAll("areas", "id,path", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL CLOSED: zero areas"); process.exit(1); }
const A = new Map(areas.map((a) => [a.id, a]));
const region = (id) => String((A.get(id) || {}).path || "").split(".").slice(0, 4).join(".");

const rows = await selectAll("routes", "id,area_id,bivy,high_point_ft", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes with a bivy list"); process.exit(1); }

const CAMPWORDS = /\b(camp|campsite|camps|bivouac|bivy|bivies|site|sites)\b/gi;
const ident = (s) => s.toLowerCase().split(/[,—–(]/)[0].replace(CAMPWORDS, " ").replace(/\s+/g, " ").trim();

const known = new Map(), blank = new Map();
for (const r of rows) {
  const k = region(r.area_id);
  if (!k) continue;
  (r.bivy || []).forEach((b, i) => {
    if (!b || !b.name) return;
    const id = ident(b.name);
    if (id.length < 4) return;                       // not a distinctive place name
    const key = id + "|" + k;
    if (b.elev != null && Number.isFinite(Number(b.elev))) {
      if (!known.has(key)) known.set(key, []);
      known.get(key).push({ elev: Number(b.elev), from: r.id });
    } else {
      if (!blank.has(key)) blank.set(key, []);
      blank.get(key).push({ route: r.id, idx: i, name: b.name, hp: r.high_point_ft });
    }
  });
}
if (!known.size) { console.log("FAIL CLOSED: no populated camp elevations indexed"); process.exit(1); }

const plan = [], refused = [];
for (const [key, bs] of blank) {
  const k = known.get(key);
  if (!k || !k.length) continue;
  const lo = Math.min(...k.map((x) => x.elev)), hi = Math.max(...k.map((x) => x.elev));
  if (lo !== hi) {
    refused.push(`${key.split("|")[0]}: donors disagree ${lo}-${hi} ft (${k.length}) — one is wrong, not picking`);
    continue;
  }
  // the row must not contradict itself: a camp above the route's own high point is impossible
  const bad = bs.filter((b) => b.hp != null && Number.isFinite(Number(b.hp)) && lo > Number(b.hp) + 200);
  if (bad.length) {
    refused.push(`${key.split("|")[0]}: ${lo} ft is above the high point of ${bad.length} recipient(s)`);
    continue;
  }
  for (const b of bs) plan.push({ ...b, elev: lo, donors: k.length, from: k[0].from });
}

console.log(`${plan.length} row(s) fillable from a UNANIMOUS same-region sibling\n`);
for (const p of plan) {
  console.log(`  ${p.route}  bivy[${p.idx}]  "${p.name}"`);
  console.log(`     ${p.elev} ft from ${p.donors} unanimous donor(s), e.g. ${p.from}`);
}
if (refused.length) {
  console.log(`\nrefused ${refused.length}:`);
  for (const r of refused) console.log(`  ${r}`);
}
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }
if (!plan.length) { console.log("nothing to write"); process.exit(0); }

const byRoute = new Map();
for (const p of plan) {
  if (!byRoute.has(p.route)) byRoute.set(p.route, []);
  byRoute.get(p.route).push(p);
}
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,bivy&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json())[0];
};

let wrote = 0;
for (const [route, ps] of byRoute) {
  const row = await get(route);
  const next = JSON.parse(JSON.stringify(row.bivy));
  for (const p of ps) {
    if (!next[p.idx] || next[p.idx].name !== p.name) {
      console.log(`REFUSED — ${route} bivy[${p.idx}] is no longer "${p.name}"`); process.exit(1);
    }
    if (next[p.idx].elev != null) {                  // strict coalesce: blank cells only
      console.log(`REFUSED — ${route} bivy[${p.idx}] already carries ${next[p.idx].elev}`); process.exit(1);
    }
    next[p.idx] = { ...next[p.idx], elev: p.elev };
  }
  await patchRow("routes", route, { bivy: next });
  wrote++;
}

console.log(`\nwrote ${wrote} row(s); re-reading to reconcile`);
let ok = 0;
for (const p of plan) {
  const back = (await get(p.route)).bivy[p.idx];
  if (back && Number(back.elev) === p.elev && back.name === p.name) ok++;
  else console.log(`  MISMATCH ${p.route} bivy[${p.idx}]`);
}
console.log(`verified ${ok}/${plan.length}`);
process.exitCode = ok === plan.length ? 0 : 1;
