#!/usr/bin/env node
// audit:road-coverage — which routes describe a WALK but say nothing about the ROAD to it?
//
// THE NUMBER THIS EXISTS TO REPLACE IS 1,371, AND THAT NUMBER IS NOT WORK. A probe once reported
// "1,371 WA routes carry access apparatus but no road block", which reads as a research backlog.
// Measured, those routes qualify as "carrying access apparatus" only because `access` is
// populated — and `access` is the CRAG-LEVEL land-manager blob, not a per-route record: there are
// 18 distinct blobs across all 1,371 rows, one of them covering 1,128 of them. 55% are bouldering
// problems, 1.1% carry any approach prose at all, and 0.3% carry a dist_km. A road block describes
// THE DRIVE TO A WALK; those routes describe no walk, so the count is a property of how `access`
// was imported and not a gap in the catalog.
//
// Ask it the other way round — of the routes that DO describe a walk, how many say nothing about
// the road? — and it collapses to a readable number. Same turn that collapsed "research gear for
// 4,938 routes" into 13 routes of re-homing. `npm run audit:hazard-redundancy`,
// `audit:waypoint-order` and `audit:terrain` all carry the same warning in the other direction:
// ASK WHAT A COUNT IS A COUNT OF BEFORE TREATING IT AS A BACKLOG.
//
// It splits the findings the way every backlog here gets split:
//   COPY      — a sibling block already describes THE ROAD THIS ROUTE'S OWN PROSE NAMES.
//   COPY?     — a sibling block describes THE PLACE IT STARTS FROM, but names no road in common.
//   RESEARCH  — neither.
//
// COPY? IS A SEPARATE AND WEAKER BUCKET ON PURPOSE, and the reason is measured rather than assumed.
// A roads-only test put FIVE genuine copies in RESEARCH, because a route's approach prose names a
// TRAILHEAD far more often than it names tarmac — "the PCT trailhead at Exit 52", "the trail toward
// Libby Lake", "the Lightning Creek trailhead on Ross Lake". (The applier had already widened its
// own gate from a road name to a trailhead name; that widening was simply never carried back here,
// so the audit and the thing it feeds disagreed.) But the place signal is noisier: on the 9 rows it
// reached, 5 were real, 3 were refused on reading, 1 was unrelated. Folding it into COPY would
// repeat the over-promising recorded below, one release after fixing it. A place match says WHERE
// TO LOOK; only reading the row says whether to copy.
//
// THE BUCKET TEST WAS "DOES THE PROSE MENTION A ROAD?" AND THAT OVER-PROMISED, WHICH IS THIS
// AUDIT'S OWN DISEASE COMMITTED BY ITS OWN AUTHOR. Under that test it filed three routes as
// RE-HOMING, i.e. fillable by copy. All three were checked by hand and NOT ONE was:
//   - wa_little_annapurna_south_face names Highway 97 and Ingalls Creek Road; its one sibling
//     block is Icicle Creek Road / FR 7601 to Stuart Lake — the OTHER SIDE OF THE RANGE. The row's
//     own overview says it uses "the seldom-used Ingalls Creek/Crystal Creek side rather than the
//     Enchantments basin", so a bare sibling copy would have sent a party to the wrong trailhead.
//     The two-trailhead case (Lundin, Remmel, Carru, Howard), stated outright by the row.
//   - wa_upper_castle_toprope_wall names US-2 at Tumwater Canyon milepost 96.5. ZERO road blocks
//     exist anywhere in the catalog naming Tumwater, and all 125 US-2 blocks are Stevens Pass /
//     Skykomish / Baring, 40-80 miles down the same highway. "A drive has several named legs" —
//     a true statement about the wrong stretch of the same road is not a donor.
//   - wa_south_face_direct had no donor because IT WAS FILED ON THE WRONG AREA: a Vasiliki Tower
//     trad route sitting on wa_art_building, a University of Washington campus crag holding four
//     boulder problems. The missing block was the symptom; the area was the defect. Moved, and it
//     then filled by copy from its real sibling.
//
// So the test is now whether a donor block NAMES THE SAME ROAD, compared on road IDENTIFIERS rather
// than on sentences — `audit:trailhead-road` records that one road is spelled many ways ("SR-20" /
// "State Route 20" / "North Cascades Highway"), so a string comparison reports agreement as
// disagreement. Routes whose prose names a road that no donor matches are counted separately: the
// fact is in the catalog and the BLOCK is not, which is still a source hunt.
//
// Donors stay scoped to the SAME AREA deliberately. Widening to the subtree or the state makes the
// identifier match vacuous in the wide direction — 283 WA routes carry a block naming "#20", and
// SR-20 runs 130 miles.
//
// Report-only and read-only. NOT a build gate — a property of the DB, not the checkout, so no code
// change can cause or fix it; same reasoning as `check:counts`.
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (kk, d) => { const i = argv.indexOf(kk); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();
const LIMIT = Number(arg("--limit", 40));

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,area_id,road,access,approach_logistics,waypoints,approach,beta,overview,dist_km,gain_ft",
  `id=like.${STATE}_*`, { pageSize: 1000 });
// Fail closed: an empty read makes every route look covered, which is the false-pass direction.
if (!rows.length) { console.error(`FAIL — read 0 routes for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }

/* A route "describes a walk" if it carries approach prose, a trailhead pin, or a measured
   approach. Any one of those means the page already tells a climber to go somewhere on foot, and
   therefore already implies a drive it says nothing about. */
const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);

/* The needle is a NAMED road or a gate, never the bare word "road" — "walk the old road grade" is
   not a statement about driving, and matching it would report correct rows. Same discipline the
   trailhead-road audit had to learn six times over. */
const ROADISH = /\b(?:FS ?R?|FR|NF|USFS)[- ]?\d+\b|\b(?:SR|US|I)[- ]?\d+\b|\bHighway \d+\b|\b[A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Road|Rd|Highway|Hwy)\b/;
const GATEISH = /\bgate(?:d)?\b|\bplowed\b|\bclosed (?:for|in|until|beyond|to vehicles)\b|\bopens? (?:in|by|around|~|about|early|mid|late)\b|\bwashed out\b|\bhigh[- ]clearance\b|\b4wd\b|\bpassenger car\b|\bsno[- ]?park\b|\bNorthwest Forest Pass\b/i;
const proseOf = (r) => [r.approach, r.beta, r.overview].filter((x) => typeof x === "string").join("\n");

/* Road IDENTIFIERS, not sentences. A numbered route normalises to "#20" however it is written; a
   proper-noun road name normalises to its distinctive word. GENERIC is the stop-list — a token
   every road name shares carries no information, and leaving one in makes the match vacuous in the
   WIDE direction, which is the mirror of a too-narrow proxy and the failure that matters here. */
const GENERIC = new Set(["forest", "service", "road", "creek", "river", "county", "national", "park", "trailhead", "access", "main", "north", "south", "east", "west", "upper", "lower", "old", "new"]);
/* Extra stop-words that only bite on PLACE names. A colour or a compass word in front of a place
   noun is not an identity — "White Chuck Glacier" and "White Chuck Road" are a real pair, but
   "Silver Creek" / "Silver Lake" / "Silver Star" are three unrelated places sharing a colour, and
   admitting one makes the match vacuous in the WIDE direction. */
const PLACE_GENERIC = new Set(["white", "black", "silver", "green", "red", "blue", "big", "little", "long", "high", "middle", "first", "second", "the", "a", "of", "and", "group", "wilderness", "state", "mount", "mt"]);
function roadIds(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  for (const m of text.matchAll(/\b(?:FSR|FS|FR|NF|USFS|SR|US|I|Highway|Hwy|State Route|Interstate)[\s-]?(\d{1,4})\b/gi)) out.add(`#${m[1]}`);
  for (const m of text.matchAll(/\b((?:[A-Z][a-zA-Z]+[\s-]){1,3})(?:Road|Rd|Highway|Hwy)\b/g)) {
    for (const w of m[1].trim().split(/[\s-]+/)) { const k = w.toLowerCase(); if (!GENERIC.has(k)) out.add(k); }
  }
  return out;
}

/* PLACE identifiers — a SECOND, deliberately weaker signal, because a route's approach prose
   overwhelmingly names a TRAILHEAD rather than the tarmac: "the PCT trailhead at Exit 52", "the
   trail toward Libby Lake", "the Lightning Creek trailhead on Ross Lake". Matching roads alone put
   FIVE genuine copies in the RESEARCH bucket — the same widening the applier had already made for
   `wa_the_balanced_rock` and which was never carried back here.
   It stays a separate bucket rather than being folded into `roadIds` because it is measurably
   noisier, and the entry that this audit's own bucket labels must not over-promise is one release
   old. Measured on the 9 it reaches: 5 real, 3 refused on reading, 1 unrelated. */
const PLACE_NOUN = "Lake|Lakes|Creek|Pass|Campground|Camp|Village|Basin|Canyon|River|Trailhead|Trail|Resort|Glacier|Peak|Mountain|Butte|Ridge";
function placeIds(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  /* A freeway exit number is the sharpest trailhead identifier there is on the I-90 corridor, and
     it appears in prose with no road token beside it. */
  for (const m of text.matchAll(/\bExit\s+(\d{1,4})\b/gi)) out.add(`exit-${m[1]}`);
  for (const m of text.matchAll(new RegExp(`\\b((?:[A-Z][a-zA-Z]+[\\s-]){1,3})(?:${PLACE_NOUN})\\b`, "g"))) {
    for (const w of m[1].trim().split(/[\s-]+/)) { const k = w.toLowerCase(); if (!GENERIC.has(k) && !PLACE_GENERIC.has(k)) out.add(k); }
  }
  return out;
}

/* SELF-TEST, RUN BEFORE ANY VERDICT IS PRINTED. The expected result of the COPY bucket is a small
   number and today it is ZERO — which is exactly what a broken matcher prints. If roadIds() stops
   extracting, every route gets an empty identifier set, nothing can ever match, and the audit
   reports "0 copyable" as confidently as it reports a real finding. So the matcher has to prove it
   can FIRE and that it can stay QUIET, on cases needing no database. The quiet cases are the ones
   that matter: they pin the two real refusals above, so a future widening that re-admits them
   fails here rather than silently returning a wrong worklist. */
{
  const T = (id, area, approach, road) => ({ id, area_id: area, discipline: "trad", approach, beta: null, overview: null, road: road || null, access: null, approach_logistics: null, waypoints: [], dist_km: 4.8, gain_ft: null });
  const run = (rs, want) => findRoadSilent(rs).find((f) => f.r.id === want);
  let bad = 0;
  const expect = (label, got, kind) => { if (!got || got.kind !== kind) { console.error(`SELF-TEST FAIL — ${label}: expected ${kind}, got ${got ? got.kind : "no finding at all"}`); bad++; } };

  /* FIRES: the real Vasiliki case that this audit's one applied copy came from. */
  expect("same crag, same highway -> COPY", run([
    T("t", "crag_a", "from the SR-20 pullout near mile marker 166 to Burgundy Col"),
    T("d", "crag_a", "x", { name: "SR-20 highway pullout, Silver Star/Wine Spires area, Washington Pass" }),
  ], "t"), "COPY");

  /* FIRES across spellings — one road is written many ways, so a string compare would miss this. */
  expect("State Route 20 vs Highway 20 -> COPY", run([
    T("t", "crag_a", "take State Route 20 east to the trailhead"),
    T("d", "crag_a", "x", { name: "Blue Lake Trailhead, Highway 20, Washington Pass" }),
  ], "t"), "COPY");

  /* QUIET: the Little Annapurna refusal. Same peak, and the only sibling block is the road up the
     OTHER side of the range. This is the case the bucket test was widened to catch. */
  expect("Ingalls Creek vs Icicle Creek on one peak -> RESEARCH", run([
    T("t", "peak_a", "From Highway 97 south of the Y-junction, turn onto Ingalls Creek Road/Trailhead"),
    T("d", "peak_a", "x", { name: "Icicle Creek Road to Forest Road 7601 (Mountaineer Creek Road)" }),
  ], "t"), "RESEARCH");

  /* QUIET: a block on a DIFFERENT area is never a donor, however well the roads match. This is what
     keeps a bare highway number admissible — US-2 runs 300 miles and a Stevens Pass block is a true
     statement about the wrong leg, but it can never reach a Tumwater Canyon route. */
  expect("matching road on another area -> RESEARCH", run([
    T("t", "crag_tumwater", "Castle Rock stands beside US-2 in Tumwater Canyon at milepost 96.5"),
    T("d", "crag_stevens", "x", { name: "Old Stevens Pass Highway (Tye Road) near Wellington, off US-2" }),
  ], "t"), "RESEARCH");

  /* QUIET: a generic token carries no information, and admitting one makes the match vacuous in the
     WIDE direction — "road" is in every road name. */
  expect("generic tokens do not match -> RESEARCH", run([
    T("t", "crag_a", "walk the old road grade from the gate"),
    T("d", "crag_a", "x", { name: "Forest Service Road 6024" }),
  ], "t"), "RESEARCH");

  /* FIRES on the PLACE signal, which is what five genuine copies needed. Neither side names a
     road at all — the route says "the PCT trailhead at Exit 52", the block says "I-90 Exit 52 to
     PCT North". A roads-only matcher scores this RESEARCH, which is what it did. */
  expect("trailhead named, no road named -> COPY?", run([
    T("t", "crag_a", "From the PCT trailhead at Exit 52 (Snoqualmie Pass), hike north to Commonwealth Creek"),
    T("d", "crag_a", "x", { name: "I-90 Exit 52 to PCT North (Commonwealth Basin) Trailhead" }),
  ], "t"), "COPY?");

  /* A ROAD match must outrank a place match, so the strong bucket cannot be diluted by the weak
     one. Both signals are present here and the verdict must be COPY, not COPY?. */
  expect("road match outranks place match -> COPY", run([
    T("t", "crag_a", "from the SR-20 pullout near Blue Lake Trailhead"),
    T("d", "crag_a", "x", { name: "Blue Lake Trailhead, Highway 20, Washington Pass" }),
  ], "t"), "COPY");

  /* QUIET: a colour shared by two unrelated places is not an identity. Silver Creek (Ross Lake),
     Silver Lake and Silver Star are three different places, and admitting the colour makes the
     place match vacuous in the WIDE direction — the same failure the road stop-list prevents. */
  expect("a shared colour word is not a place identity -> RESEARCH", run([
    T("t", "crag_a", "a trail climbs Silver Creek to the Silver Lake basin camp"),
    T("d", "crag_a", "x", { name: "Silver Star Creek Road to the gate" }),
  ], "t"), "RESEARCH");

  /* And the walk gate itself: a route describing no walk is not a finding at all, whatever its
     road block says. Without this the audit could silently drift back to the 1,371. */
  {
    const r = T("t", "crag_a", null); r.dist_km = null;
    if (findRoadSilent([r]).length) { console.error(`SELF-TEST FAIL — a route describing no walk was reported as a finding.`); bad++; }
  }
  if (bad) { console.error(`\nRefusing to report: the finder is broken, so "0 copyable" would mean nothing.`); process.exit(1); }
  console.log(`self-test: the finder fires on 4 cases (2 road, 1 place, 1 precedence), stays quiet on 4, and ignores a route with no walk.`);
}

/* The whole finding pass, as a function of the rows, so the self-test can drive THE REAL PIPELINE
   over synthetic routes rather than poking a helper in isolation. That distinction earned itself
   here: a first self-test compared two prose strings directly, declared the matcher broken because
   a Tumwater route and a Stevens Pass block share the token "#2", and it was testing something the
   pipeline never does — donors are scoped to the same AREA, and a crag is one place, so two routes
   that can be donor and target cannot be 60 miles apart on the same highway. Testing the helper
   would have driven a "fix" that refused the one real copy this audit has made. */
function findRoadSilent(all) {
  const byArea = {};
  for (const r of all) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);
  /* SAME AREA, and that scoping is what makes a bare highway number admissible evidence at all.
     283 WA routes carry a block naming "#20" and SR-20 runs 130 miles, so state-wide this match
     would be meaningless; within one crag it is the same pullout. Do not widen the scope without
     also strengthening the identifier test. */
  const donorsFor = (r) => (byArea[r.area_id] || []).filter((s) => s.id !== r.id && has(s.road));

  const out = [];
  for (const r of all) {
    if (!walks(r) || !roadSilent(r)) continue;
    const p = proseOf(r);
    const road = ROADISH.exec(p), gate = GATEISH.exec(p);
    const want = roadIds(p);
    const wantPlace = placeIds(p);
    const donors = donorsFor(r);
    /* A donor qualifies only if its block names one of the same roads. A sibling that carries SOME
       road block is not evidence about THIS route's drive — that is the whole Little Annapurna
       lesson, where the only sibling described the opposite side of the range. */
    const matched = donors.filter((s) => { const have = roadIds(leaves(s.road).join(" ")); return [...want].some((x) => have.has(x)); });
    /* The weaker signal, kept separate: the block names the same PLACE the route starts from. */
    const placeMatched = donors.filter((s) => { const have = placeIds(leaves(s.road).join(" ")); return [...wantPlace].some((x) => have.has(x)); });
    const winner = matched[0] || placeMatched[0] || null;
    out.push({
      r,
      kind: matched.length ? "COPY" : placeMatched.length ? "COPY?" : "RESEARCH",
      namesRoad: Boolean(road || gate),
      token: (road && road[0]) || (gate && gate[0]) || null,
      donors: donors.length,
      matched: matched.length,
      placeMatched: placeMatched.length,
      donorId: winner ? winner.id : null,
      shared: winner ? [...(matched.length ? want : wantPlace)].filter((x) => (matched.length ? roadIds(leaves(winner.road).join(" ")) : placeIds(leaves(winner.road).join(" "))).has(x)) : [],
    });
  }
  return out;
}

const walkers = rows.filter(walks);
const findings = findRoadSilent(rows);

/* Context, printed so nobody re-derives the misleading figure and reads it as work. */
const enriched = rows.filter((r) => has(r.access) || has(r.approach_logistics) || has(r.waypoints));
const bareCount = enriched.filter(roadSilent).length;
const blobs = new Set(enriched.filter((r) => roadSilent(r) && has(r.access)).map((r) => JSON.stringify(r.access)));

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
const rehome = findings.filter((f) => f.kind === "COPY");
const placeOnly = findings.filter((f) => f.kind === "COPY?");
const research = findings.filter((f) => f.kind === "RESEARCH");
/* The middle case, counted so it cannot be mistaken for either end: the road IS named in the row's
   own prose, so the fact is in the catalog — but no sibling carries a block for that road, so
   there is nothing to copy and the repair is still a source hunt. */
const namedNoDonor = research.filter((f) => f.namesRoad);

console.log(`\n=== routes that describe a WALK but say nothing about the ROAD ===`);
console.log(`${rows.length} ${STATE.toUpperCase()} routes`);
console.log(`  ${walkers.length} describe a walk (approach prose | trailhead pin | dist_km | gain_ft)`);
console.log(`  ${findings.length} of those carry NO road block and NO approach_logistics  (${pct(findings.length, walkers.length)})\n`);
console.log(`  ${rehome.length} have a sibling block for THE ROAD their own prose names   -> COPY   (strong)`);
console.log(`  ${placeOnly.length} have one for the PLACE they start from, but not the road  -> COPY?  (candidate)`);
console.log(`  ${research.length} have neither                                             -> RESEARCH`);
console.log(`     of the RESEARCH rows, ${namedNoDonor.length} DO name a road in their own prose, but no sibling`);
console.log(`     carries a block for it — the fact is in the catalog, the block is not.`);
console.log(`  ${findings.filter((f) => f.donors > 0).length} have a sibling carrying SOME road block (not evidence about this route's drive)`);

for (const bucket of [["COPY", rehome], ["COPY?", placeOnly], ["RESEARCH", research]]) {
  if (!bucket[1].length) continue;
  console.log(`\n--- ${bucket[0]} (${bucket[1].length}) ---`);
  for (const f of bucket[1].slice(0, LIMIT)) {
    const tail = f.donorId ? `donor ${f.donorId}${f.shared.length ? ` [${f.shared.join(",")}]` : ""}` : `${f.donors} sibling block(s), 0 matching`;
    console.log(`  ${f.r.id.padEnd(50)} [${String(f.r.discipline).padEnd(9)}] ${tail}${f.token ? `   own prose: "${f.token}"` : ""}`);
  }
  if (bucket[1].length > LIMIT) console.log(`  … ${bucket[1].length - LIMIT} more (raise --limit)`);
}

console.log(`\n--- context: the number this audit exists to REPLACE ---`);
console.log(`${bareCount} routes carry access apparatus and no road block — but that is NOT a backlog.`);
console.log(`They qualify through \`access\` alone, which is a crag-level land-manager blob: ${blobs.size} distinct`);
console.log(`blobs cover all ${bareCount} rows. Mostly boulder and sport rows that describe no walk at all, so`);
console.log(`there is no drive for a road block to describe. Ask what a count is a count OF.`);

console.log(`\nA SIBLING BLOCK IS A DONOR, NOT AN ANSWER, and a matching one is still only a CANDIDATE.`);
console.log(`A peak can have two genuine trailheads (Lundin, Remmel, Carru, Howard), and a road block can`);
console.log(`outlive the trailhead it described (audit:trailhead-road section 2). The COPY bucket means`);
console.log(`a copy is POSSIBLE, never that it is right — read the row before applying one.`);
console.log(`Report only; nothing was changed.`);
