// The applier's donor rule is SAME AREA. Two of the three RE-HOMING routes report zero sibling
// blocks, so that rule cannot reach them — but a road is not a property of an area, it is a
// property of a drive, and a route one area over can be at the end of the same tarmac.
//
// So this asks the question the right way round: take the road IDENTIFIERS out of the target's own
// prose, and find every WA route whose `road` block names one of the same identifiers, wherever it
// sits in the tree. Area adjacency becomes context printed beside the candidate rather than the
// gate. The gate stays two-source — (A) the target's own prose names the road, (B) some row already
// carries a researched block for THAT road.
//
// Identifiers, not strings: `audit:trailhead-road` records that a drive has several named legs and
// that road prose spells one road many ways ("SR-20" / "State Route 20" / "North Cascades Highway"),
// so comparing sentences reports agreement as disagreement. Numbered-route tokens normalise to
// "#20"; proper-noun road names normalise to their distinctive word.
import { selectAll } from "../lib/supabase-env.mjs";

const TARGETS = ["wa_little_annapurna_south_face", "wa_south_face_direct", "wa_upper_castle_toprope_wall"];

/* Stop-list: a token every road name shares carries no information, and leaving one in makes the
   comparison vacuous in the WIDE direction — the mirror of a too-narrow proxy. */
const GENERIC = new Set(["forest", "service", "road", "creek", "river", "county", "national", "park", "trailhead", "access", "main", "north", "south", "east", "west", "upper", "lower", "old", "new"]);

function ids(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  for (const m of text.matchAll(/\b(?:FSR|FS|FR|NF|USFS|SR|US|I|Highway|Hwy|State Route|Interstate)[\s-]?(\d{1,4})\b/gi)) out.add(`#${m[1]}`);
  for (const m of text.matchAll(/\b((?:[A-Z][a-zA-Z]+[\s-]){1,3})(?:Road|Rd|Highway|Hwy)\b/g)) {
    for (const w of m[1].trim().split(/[\s-]+/)) { const k = w.toLowerCase(); if (!GENERIC.has(k)) out.add(k); }
  }
  return out;
}

const leaves = (v, out = []) => {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
};

/* `path=like.*` is a 42883 on an ltree column, and a hand-typed `cd.` path silently returns 200
   with zero rows when it omits an intermediate segment — which reads as "this state has no areas"
   rather than as a broken query. So DERIVE the subtree path from a row known to be inside it. */
const seed = await selectAll("areas", "id,name,path", "id=eq.wa_upper_castle", { pageSize: 5 });
if (seed.length !== 1) { console.error("FAIL — could not read the seed area to derive a WA path."); process.exit(1); }
const segs = String(seed[0].path).split(".");
const wi = segs.indexOf("washington");
if (wi < 0) { console.error(`FAIL — seed path has no washington segment: ${seed[0].path}`); process.exit(1); }
const WA_PATH = segs.slice(0, wi + 1).join(".");

const areas = await selectAll("areas", "id,name,path", `path=cd.${WA_PATH}`, { pageSize: 1000 });
if (!areas.length) { console.error(`FAIL — read zero areas under ${WA_PATH}; a broken scan, not a clean tree.`); process.exit(1); }
const areaBy = Object.fromEntries(areas.map((a) => [a.id, a]));

const all = await selectAll("routes", "id,name,area_id,road,approach,beta,overview", "id=like.wa_*", { pageSize: 1000 });
if (!all.length) { console.error("FAIL — read zero routes."); process.exit(1); }
const rowBy = Object.fromEntries(all.map((r) => [r.id, r]));
console.log(`WA subtree = ${WA_PATH}\nread ${areas.length} WA areas, ${all.length} wa_* routes\n`);

for (const tid of TARGETS) {
  const t = rowBy[tid];
  if (!t) { console.error(`FAIL — ${tid} returned no row`); process.exit(1); }
  const prose = [t.approach, t.beta, t.overview].filter((x) => typeof x === "string").join("\n");
  const want = ids(prose);
  const tArea = areaBy[t.area_id];
  console.log(`${"=".repeat(92)}\n${tid}   area=${t.area_id} (${tArea ? tArea.name : "?"})`);
  console.log(`   path      ${tArea ? tArea.path : "?"}`);
  console.log(`   road ids from its OWN prose: ${[...want].join(", ") || "(none)"}`);

  const hits = [];
  for (const r of all) {
    if (r.id === tid || !r.road || !leaves(r.road).length) continue;
    const have = ids(leaves(r.road).join(" "));
    const shared = [...want].filter((x) => have.has(x));
    if (shared.length) hits.push({ r, shared, have });
  }
  console.log(`   ${hits.length} WA route(s) carry a road block naming one of those\n`);

  /* Group by the block itself — a road block repeated across a crag is one researched fact, not
     N independent corroborations, and printing it N times reads as agreement it has not earned. */
  const byBlock = {};
  for (const h of hits) {
    const k = JSON.stringify(h.r.road);
    (byBlock[k] = byBlock[k] || { n: 0, shared: h.shared, sample: h.r, areas: new Set() });
    byBlock[k].n++; byBlock[k].areas.add(h.r.area_id);
  }
  const groups = Object.entries(byBlock).sort((a, b) => b[1].n - a[1].n);
  for (const [k, g] of groups.slice(0, 6)) {
    const a = areaBy[g.sample.area_id];
    console.log(`   -- ${g.n} route(s) across ${g.areas.size} area(s); shares ${g.shared.join(",")}`);
    console.log(`      sample ${g.sample.id}  area=${g.sample.area_id} (${a ? a.name : "?"})`);
    console.log(`      path   ${a ? a.path : "?"}`);
    const road = JSON.parse(k);
    for (const [kk, vv] of Object.entries(road)) if (typeof vv === "string" && vv.trim()) console.log(`      ${kk}: ${vv.slice(0, 190)}`);
    console.log("");
  }
  if (groups.length > 6) console.log(`   ... ${groups.length - 6} more distinct block(s) not printed\n`);
}
