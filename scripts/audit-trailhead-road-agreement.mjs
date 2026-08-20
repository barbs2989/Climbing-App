// Routes that share one trailhead must not disagree about whether the road to it is OPEN.
//
// This is the general form of the Mowich defect. Four Mount Rainier routes share the Mowich Lake
// trailhead; ONE of them recorded that WSDOT permanently closed the Fairfax Bridge in April 2025,
// while the other three still said "Seasonal, unpaved" with a `seasonalGate` of "Typically opens
// ~July". The seasonalGate is the dangerous half — it does not merely omit the closure, it actively
// tells somebody to plan a July trip to a road with no public access.
//
// WHY NO EXISTING AUDIT CAN SEE THIS:
//   - `audit:trailhead-agreement` compares a route's two copies of its OWN trailhead. Every Mowich
//     row agreed with itself perfectly. The contradiction is BETWEEN routes, not within one.
//   - Every coverage check asks whether `road.status` is populated. All four were populated, with
//     plausible, well-written English. A wrong answer and a right one are identical from there.
//   - The route page renders this (`RouteDetail.jsx` ~2176 prints `road.status — road.seasonalGate`,
//     ~2181 prints "Seasonal closures" from `ac.closures || ac.closure || ac.seasonal`), so the
//     screen looks finished on every one of them.
//
// THE UNIT OF TRUTH IS THE ROAD, NOT THE ROUTE. A road is either gated or it is not; that fact
// cannot vary by which climb you picked at the end of it. So a cluster of routes sharing one
// trailhead is a set of independent recordings of one fact, and a disagreement means at least one
// is wrong. This is the same argument `audit:trailhead-agreement` makes about a route's two copies
// of its own trailhead, one level up.
//
// CLUSTERING IS BY COORDINATE, NOT BY NAME, and that is load-bearing: the Mowich rows are variously
// "Mowich Lake" and "Mowich Lake Trailhead", so a name key would have split the very cluster this
// exists to find. Names are how this data disagrees; coordinates are how it identifies.
//
// REPORT-ONLY, and it must stay so. It cannot tell you WHICH row is right — only that they cannot
// both be. The repair needs the road's actual current status from outside the database, which is
// research. Read both rows and check the road before changing either.
//
//   node scripts/audit-trailhead-road-agreement.mjs [--state wa] [--radius 500] [--all]
import fs from "fs";
import path from "path";
import { selectAll, anonKey } from "./lib/supabase-env.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const STATE = arg("state", "wa").toLowerCase();
const RADIUS = Number(arg("radius", 500));
const ALL = process.argv.includes("--all");

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

// --- the two needles ------------------------------------------------------------------------
// CLOSED is deliberately narrow. "Closed" alone is far too broad — almost every forest road in
// Washington is described as closed in winter, seasonally, or by a gate that opens each summer,
// and matching those would report the entire catalog. What is wanted is a road that is NOT COMING
// BACK this season: a washout, a permanent decommissioning, a bridge that is gone.
const CLOSED = /\b(permanently closed|no public (?:vehicle|access|motor)|closed indefinitely|indefinite(?:ly)? closed?|not expected to reopen|no reopening (?:estimate|date)|no longer (?:accessible|maintained|driv)|decommissioned|impassable to vehicles|road is gone|bridge (?:was |is )?(?:out|removed|permanently))/i;
// "closed to vehicles" and "closed beyond" are NOT here either, and they were TRIED: adding them
// took the run from 11 findings to 20, and every new one was a SEASONAL gate — "closed to vehicles
// until the seasonal spring opening", "road close for the season", "closed after Dec 2". A seasonal
// closure is entirely compatible with a sibling saying the road opens in July; that is the same
// fact stated from the two ends of the year, not a contradiction. The dangerous class is a road
// that is NOT COMING BACK, which is what Mowich was.
//
// "washed out" is NOT here, and that omission is measured. Washington forest roads are described as
// washed out constantly, almost always about a historical event that has since been repaired or
// about a section beyond the trailhead; it fired on rows whose very next clause said "passable to
// passenger cars". A needle that flags correct work teaches people to ignore the audit.
// OPEN is an affirmative claim that you can drive there — a normal season, or a gate that opens.
// "open to <place>" is in the OPEN needle so that a row asserting BOTH — "Paved and open to Barlow
// Pass; permanently closed to vehicles beyond" — is disqualified from both buckets rather than
// filed under one. That row is not wrong and not in disagreement with anybody; it is describing two
// segments of one highway, which is what the whole Barlow cluster does. Rows claiming both are
// already excluded (`p.closed && !p.open`), so widening OPEN here is what makes that exclusion fire.
// "open to foot/bike traffic" is carved out, because that describes a road closed to VEHICLES.
//
// The lookbehind on "plowed" is not decoration: "Not plowed in winter" is the COMMONEST phrasing of
// that word in this catalog and it means the opposite. A needle that reads a negation as its own
// assertion produces a finding out of two rows that actually agree.
const OPEN = /\b(?:typically |usually |normally |often |generally )?(?:opens?|open) (?:~|about |around |in |by |from |early |mid|late )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\bnot open until\b|\bopens? (?:each |every )?(?:spring|summer)\b|\bgate opens?\b|\bopen (?:year[- ]round|all year)\b|\bopen to (?!foot|bike|hiker|pedestrian|non[- ]?motor|the public\b)|(?<!not )(?<!never )(?<!un)plowed\b|\bpaved (?:to|all the way)\b/i;

// Keyed by field, NOT concatenated. A blob cannot say which field fired, and the first run of this
// audit was unjudgeable for exactly that reason: the "closed" rows at Pete Lake and Smith Brook
// both said "passable to passenger cars" in the text printed beside the verdict, because the match
// had come from a different field entirely.
const roadFields = r => {
  const o = {};
  for (const [k, v] of [["road.status", (r.road || {}).status], ["road.seasonalGate", (r.road || {}).seasonalGate],
    ["road.notes", (r.road || {}).notes], ["access.closures", (r.access || {}).closures],
    ["access.closure", (r.access || {}).closure], ["access.seasonal", (r.access || {}).seasonal]])
    if (v) o[k] = String(v);
  return o;
};
// A closure phrase sitting inside SEASONAL language is a gate, not a defect. Checked against the
// sentence the match landed in rather than the whole field, because a row legitimately describes
// both a winter gate and a permanent closure and only the second is a contradiction.
const SEASONAL_CTX = /\b(seasonal|winter|snow|spring opening|each (?:spring|summer)|until (?:the )?(?:spring|summer|snow)|plow)/i;
// A closure the row itself labels as belonging to a DIFFERENT road is not a claim about this
// trailhead's road — it is useful context, correctly written. `wa_mount_appleton_standard` sits at
// Sol Duc and its road block is entirely about Sol Duc Road; the flagged phrase is "the ALTERNATE
// Elwha-side road (Olympic Hot Springs Rd) is permanently closed beyond Madison Falls". The
// "beyond <the trailhead>" rule cannot reach it, because Madison Falls is genuinely not the Sol Duc
// trailhead — that rule was deliberately written so this case would survive, on the belief it was
// real. Reading the row is what settled it. This is the seventh tightening and every one has been
// the same lesson: road prose describes MORE THAN ONE ROAD, and a needle blind to which road a
// sentence is about will keep manufacturing contradictions out of correct writing.
const OTHER_ROAD_CTX = /\b(alternate|alternative|the other|other side|[a-z]+-side\b|on the exit|exit\)|approach from the (?:north|south|east|west))/i;

// An OPEN phrase in the PAST TENSE is not a claim that you can drive there — it is usually the
// sentence explaining the closure. `wa_mount_rainier_ptarmigan_ridge` says "FORMERLY open to
// vehicles mid-July–mid-October; as of the 2025 bridge closure …", and reading that as an open-road
// assertion made the row claim both things at once, which silently dropped it from the report
// entirely. That row is one of the real findings, so the failure was a false NEGATIVE — the
// direction that matters.
const PAST_CTX = /\b(formerly|previously|historically|used to|prior to|before the|no longer|as of the \d{4} (?:bridge |road )?closure)\b/i;

// Where did a needle fire? Returns [field, the matched phrase in context] or null.
const fire = (fields, re, suppress) => {
  for (const [k, v] of Object.entries(fields)) {
    const m = v.match(re);
    if (!m) continue;
    const ctx = v.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
    if (suppress && suppress.test(ctx)) continue;
    return [k, v.slice(Math.max(0, m.index - 45), m.index + m[0].length + 55).replace(/\s+/g, " ").trim(), m[0]];
  }
  return null;
};

// --- read ------------------------------------------------------------------------------------
// `--fixture <json>` reads a synthetic catalog instead of Supabase. The faults this audit reports
// live in the DATA, so a checker cannot inject them by editing code and cannot write to the live
// project either — a fixture is the only way to prove the needles still fire. See
// scripts/oneoff/inject-trailhead-road-agreement-cases.mjs.
const FIXTURE = arg("fixture", "");
let rows;
if (FIXTURE) {
  rows = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  console.log(`reading ${rows.length} route(s) from fixture ${path.basename(FIXTURE)} …`);
} else {
  anonKey(); // fail loudly now rather than mid-scan
  const filter = ALL ? "" : `id=like.${STATE}_*`;
  console.log(`reading routes${ALL ? " (whole catalog)" : ` matching ${STATE}_*`} …`);
  rows = await selectAll("routes", "id,name,area_id,road,access,approach_logistics,waypoints", filter, { pageSize: 1000 });
}
// Fail closed: an empty read makes every cluster look consistent, which is the false-pass direction.
if (!rows.length) { console.error("read 0 routes — the scan is broken, not the catalog clean"); process.exit(1); }

// A route enters the scan only if it has BOTH a trailhead coordinate (to cluster on) and some road
// prose (to compare). Anything else is not evidence either way and must not dilute the denominator.
const pts = [];
for (const r of rows) {
  const al = r.approach_logistics || {};
  let lat = num(al.trailheadLat), lng = num(al.trailheadLng), name = al.trailhead;
  if (lat === null) {
    const w = (Array.isArray(r.waypoints) ? r.waypoints : []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
    if (w) { lat = num(w.lat); lng = num(w.lng); name = name || w.name; }
  }
  if (lat === null || lng === null) continue;
  const fields = roadFields(r);
  // Section 1 needs road PROSE; section 2 needs only a road NAME. Gating entry on prose alone hid
  // every route that names its road and says nothing else about it from section 2 entirely — found
  // by an injection case, which is the whole argument for writing them.
  if (!Object.keys(fields).length && !(r.road || {}).name) continue;
  pts.push({ id: r.id, name: r.name, lat, lng, th: String(name || "?"), fields, roadName: (r.road || {}).name, driveNote: (r.road || {}).driveNote,
    closed: fire(fields, CLOSED, new RegExp(`${SEASONAL_CTX.source}|${OTHER_ROAD_CTX.source}`, "i")), open: fire(fields, OPEN, PAST_CTX) });
}

// --- cluster by coordinate (single-link, greedy) ------------------------------------------------
const clusters = [];
for (const p of pts) {
  const c = clusters.find(c => c.some(q => hav(p.lat, p.lng, q.lat, q.lng) <= RADIUS));
  if (c) c.push(p); else clusters.push([p]);
}

const findings = [];
for (const c of clusters) {
  if (c.length < 2) continue;
  const closed = c.filter(p => p.closed && !p.open);
  const open = c.filter(p => p.open && !p.closed);
  if (!closed.length || !open.length) continue;
  findings.push({ c, closed, open });
}
// A closure BEYOND the trailhead does not stop you reaching the trailhead. Barlow Pass is the case
// that forced this: every row there agrees — "Mountain Loop Highway is paved TO Barlow Pass; Monte
// Cristo Road BEYOND the pass is permanently closed to vehicles". One clause is about arriving, the
// other about continuing, and reading them as a contradiction turned eleven consistent rows into a
// finding. Suppressed only when the closure names the trailhead ITSELF, which is computable and
// says exactly the right thing: Sol Duc's "permanently closed beyond MADISON FALLS" survives,
// because Madison Falls is not the Sol Duc trailhead — that row is describing a different road.
const stop = new Set(["the","a","of","and","to","at","trailhead","th","road","rd","fr","nf","trail","area","campground","np","national","park","forest"]);
const toks = x => new Set(String(x || "").toLowerCase().match(/[a-z]{3,}/g) || []);
for (const c of clusters) {
  const named = c.find(p => p.th && p.th !== "?");
  const thTok = [...toks(named && named.th)].filter(t => !stop.has(t));
  for (const p of c) {
    if (!p.closed) continue;
    if (!/\b(beyond|past|above|upstream of)\b/i.test(p.closed[1])) continue;
    const after = p.closed[1].split(/\b(?:beyond|past|above|upstream of)\b/i).slice(1).join(" ");
    const at = toks(after);
    if (thTok.length && thTok.some(t => at.has(t))) p.closed = null; // the closure is past the trailhead
  }
  // THE MIRROR, and it is needed for the same reason: "open TO <somewhere that is not the
  // trailhead>" is not a claim that you can reach the trailhead. Trinity sits at the END of the
  // Chiwawa River Road, so "Open to Atkinson Flat Campground (~mile 16); closed to vehicles beyond"
  // AGREES with the rows saying the road to Trinity is shut — it is the same fact from the near
  // side. Without this the suppression is one-directional and simply moves the noise.
  for (const p of c) {
    if (!p.open) continue;
    if (!/\b(?:open|paved) to\b/i.test(p.open[2])) continue;
    const after = p.open[1].split(/\b(?:open|paved) to\b/i).slice(1).join(" ");
    const at = toks(after);
    if (thTok.length && !thTok.some(t => at.has(t))) p.open = null; // reaches somewhere else
  }
}
const kept = [];
for (const f of findings) {
  const closed = f.c.filter(p => p.closed && !p.open), open = f.c.filter(p => p.open && !p.closed);
  if (closed.length && open.length) kept.push({ c: f.c, closed, open });
}
findings.length = 0; findings.push(...kept);
findings.sort((a, b) => b.c.length - a.c.length);

for (const f of findings) {
  const th = f.closed[0].th;
  console.log(`\n${"=".repeat(78)}\n${th}   — ${f.c.length} routes share this trailhead, and they disagree`);
  for (const p of f.closed) {
    console.log(`  CLOSED  ${p.id}`);
    console.log(`          matched "${p.closed[2]}" in ${p.closed[0]}`);
    console.log(`          …${p.closed[1]}…`);
  }
  for (const p of f.open) {
    console.log(`  OPEN    ${p.id}`);
    console.log(`          matched "${p.open[2]}" in ${p.open[0]}`);
    console.log(`          …${p.open[1]}…`);
  }
  const rest = f.c.filter(p => !f.closed.includes(p) && !f.open.includes(p));
  if (rest.length) console.log(`  (${rest.length} more in this cluster make no clear claim either way)`);
}

// ─── SECTION 2: does a route's road.name even name THIS trailhead's road? ─────────────────────
//
// Section 1 asks whether siblings disagree about a road being OPEN. It is structurally blind to a
// row describing the WRONG ROAD ENTIRELY, because a correct statement about the wrong road
// contradicts nobody. `wa_mount_barnes_scramble` sits at the Sol Duc trailhead with `road.name` =
// "Olympic Hot Springs Road (to Whiskey Bend Trailhead)" — every word of it true, and about a road
// on the other side of the Olympics.
//
// This is a class I CREATED. Earlier batches in this sweep moved a route's trailhead to settle a
// disagreement between its two copies of that trailhead, and left the `road` block describing the
// road that was removed. So the detector is pointed at my own work first.
//
// The test is comparative, not absolute: a road name is flagged only when the OTHER routes at the
// same trailhead agree on a name it shares nothing with. That is what keeps it quiet on legitimate
// variation ("Sol Duc Road" / "Sol Duc Hot Springs Road" overlap on `duc`) while catching a name
// drawn from a different drainage. A lone route at a trailhead has nothing to be compared against
// and is never flagged — the same reason section 1 needs a cluster.
const ROADSTOP = new Set(["road","rd","the","and","from","via","to","at","trailhead","th","access","park","national","forest","service","fs","fr","nf","hwy","highway","route","sr","us","county","main","north","south","east","west","upper","lower","river","creek","lake","pass","area","campground","entrance","becomes","off"]);
const rtoks = x => new Set([...String(x || "").toLowerCase().matchAll(/[a-z]{3,}/g)].map(m => m[0]).filter(t => !ROADSTOP.has(t)));

const mismatched = [];
for (const c of clusters) {
  if (c.length < 3) continue; // need a real majority to compare against
  const named = c.filter(p => p.roadName);
  if (named.length < 3) continue;
  // How many siblings share each token? A token carried by most of the cluster identifies the road.
  const freq = new Map();
  for (const p of named) for (const t of rtoks(p.roadName)) freq.set(t, (freq.get(t) || 0) + 1);
  const core = [...freq.entries()].filter(([, n]) => n >= Math.ceil(named.length / 2)).map(([t]) => t);
  if (!core.length) continue; // the cluster does not agree on a road name; nothing to measure against
  // A DRIVE HAS SEVERAL NAMED LEGS, and different rows name different ones. Comparing road NAMES
  // alone therefore reports one journey described from two points along it: "Ruth Creek Road (FSR
  // 32)" against a cluster whose core is `hannegan` — Hannegan Pass Road IS FR 32; "I-90 /
  // Snoqualmie Pass" against `alpental`, which is at Snoqualmie Pass; "Railroad Creek Road" against
  // `chelan, lucerne, holden`, which are the boat and the village you pass through to reach it.
  // Measured on a 20-row sample of the first draft, that class was most of the output and precision
  // sat near 25-30%.
  //
  // The evidence to tell them apart is already in the cluster: if a NEIGHBOUR's own driveNote or
  // status mentions the road this row names, the two are describing one journey and there is no
  // finding. Prose is read here rather than just `name`, because that is where a route spells the
  // drive out leg by leg ("Mountain Loop Highway 19.7 mi to Sloan Creek Road (FR 49)").
  //
  // This is the same segment-blindness section 1 needed four separate rules for. Road prose is
  // written about MORE THAN ONE ROAD, and every needle over it has to be told so.
  // THE ECHO MUST COME FROM A ROW THAT AGREES WITH THE CLUSTER, or two identically-wrong rows
  // shield each other: `sitkum_glacier` and `frostbite_ridge` both name White Chuck Road at a North
  // Fork Sauk trailhead, each corroborating the other's error, and an unrestricted echo test
  // silently dropped both. A same-journey explanation is only worth anything from a row that has
  // the road right in the first place.
  // `driveNote` MUST be in this prose and was not: `roadFields()` covers status/seasonalGate/notes
  // for section 1's needles, but driveNote is precisely where a route spells the drive out leg by
  // leg ("From Darrington, drive the Mountain Loop Highway 19.7 mi to Sloan Creek Road (FR 49)").
  // Without it the same-journey test could not see the sentence that proves two names are one road.
  // Found by an injection case, not by reading the code.
  const clusterProse = named.filter(q => core.some(x => rtoks(q.roadName).has(x)))
    .map(q => [q, [q.roadName, q.driveNote, ...Object.values(q.fields)].filter(Boolean).join(" ").toLowerCase()]);
  for (const p of named) {
    const t = rtoks(p.roadName);
    if (core.some(x => t.has(x))) continue;
    const mine = [...t];
    if (!mine.length) continue;
    const echoed = clusterProse.some(([q, prose]) => q !== p && mine.some(x => prose.includes(x)));
    if (echoed) continue; // a neighbour describes this road as part of the same drive
    mismatched.push({ p, core, peers: named.filter(q => q !== p).slice(0, 3) });
  }
}

// A road name that is a PLACEHOLDER is a different finding from one naming the wrong drainage, and
// they need opposite repairs — one wants research, the other wants a copy from a neighbour. Split,
// so the count is not one bucket of two unrelated things.
const VAGUE = /^(remote|forest\/park|various|multiple|approach|access|unpaved|paved|gravel|verify|n\/a|unknown|see |depends)/i;
const vague = mismatched.filter(m => VAGUE.test(String(m.p.roadName).trim()));
const wrongRoad = mismatched.filter(m => !VAGUE.test(String(m.p.roadName).trim()));

for (const m of wrongRoad) {
  console.log(`\n${"=".repeat(78)}\n${m.p.th}   — this route names a road its neighbours do not`);
  console.log(`  ${m.p.id}`);
  console.log(`      road.name: ${m.p.roadName}`);
  console.log(`  ${m.peers.length} of its neighbours at this trailhead instead say:`);
  for (const q of m.peers) console.log(`      ${q.id}: ${q.roadName}`);
  console.log(`  shared road words in this cluster: ${m.core.join(", ")}`);
}

const multi = clusters.filter(c => c.length > 1);
console.log(`\n${"=".repeat(78)}`);
console.log(`${rows.length} routes read · ${pts.length} carry both a trailhead coordinate and road prose`);
console.log(`${clusters.length} trailhead cluster(s) within ${RADIUS} m · ${multi.length} shared by more than one route`);
console.log(`${findings.length} cluster(s) where one route says the road is CLOSED and another says it OPENS.`);
console.log(`${wrongRoad.length} route(s) whose road.name names a DIFFERENT road from their trailhead neighbours,`);
if (vague.length) console.log(`  plus ${vague.length} whose road.name is a placeholder rather than a road ("${vague.slice(0, 2).map(m => m.p.roadName).join('", "')}" …).`);
if (wrongRoad.length) {
  console.log(`\nSection 2 is a HYPOTHESIS LIST, weaker than section 1 and deliberately so: a route can`);
  console.log(`legitimately share a trailhead with routes that drive in from another road, and a peak with`);
  console.log(`two approaches will look like this whichever one it records. Read the route before moving`);
  console.log(`anything. What it is genuinely good at is the class this sweep CREATED — a trailhead moved`);
  console.log(`to settle a disagreement, leaving the road block describing the road that was removed.`);
}
if (findings.length) {
  console.log(`\nReport only — this cannot say which row is right, only that they cannot both be.`);
  console.log(`A road is either gated or it is not; that fact does not vary by which climb you picked.`);
  console.log(`Check the road's ACTUAL current status from outside the database before changing either row.`);
}
process.exit(0);
