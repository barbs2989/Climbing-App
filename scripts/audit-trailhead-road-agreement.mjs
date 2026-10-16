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
//   - The route page renders this — RouteDetail's GETTING THERE panel prints
//     `road.status+(road.seasonalGate?" — "+road.seasonalGate:"")`, and "Seasonal closures" from
//     `ac.closures || ac.closure || ac.seasonal` — so the screen looks finished on every one of
//     them. (Cited by EXPRESSION, not by line: this file packs many declarations onto one physical
//     line and the numbers this once carried had already drifted ~300 lines. A comment naming a
//     line number is a claim that rots silently; one naming an expression can be grepped.)
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
//   node scripts/audit-trailhead-road-agreement.mjs [--radius 500] [--state wa]
//
// Scans the whole catalog by default. `--state wa` narrows it and PRINTS A WARNING, because an
// id-prefix scope drops legacy ids and a comparative audit judged against a truncated cluster fails
// in the false-pass direction. See the note beside RADIUS below.
import fs from "fs";
import path from "path";
import { selectAll, anonKey } from "./lib/supabase-env.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
// SCOPE DEFAULTS TO THE WHOLE CATALOG, and that is a correction rather than a preference.
//
// It used to default to `id=like.wa_*`, and that filter SPLIT A CLUSTER AND HID A REAL DEFECT.
// Five routes share the Mowich Lake trailhead, and `rainier_central_mowich_face` carries a LEGACY
// id with no `wa_` prefix — so under the WA scope the row recording the permanent bridge closure
// was filtered out, nothing was left for `wa_liberty_cap_ptarmigan_ridge_finish` to disagree with,
// and it went on saying the road opens in July. CLAUDE.md already records the general trap:
// "`id like 'wa_%'` is the reflex filter and it misses legacy ids."
//
// A comparative audit is far more exposed to this than a per-row one: dropping a row does not just
// lose that row's finding, it removes the EVIDENCE its neighbours are judged against. Silent, and
// in the false-pass direction.
//
// The whole catalog is affordable because the qualifying population is tiny — 205,543 routes, of
// which 925 carry both a trailhead coordinate and road prose, and 922 of those are Washington. So
// the "expensive" scope costs about a minute and the "cheap" one was buying nothing.
const RADIUS = Number(arg("radius", 500));
const STATE = arg("state", "").toLowerCase();
const ALL = !STATE;

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
  if (!ALL) console.log(`  NOTE: an id-prefix scope misses legacy ids, which can remove the evidence a cluster is judged against — this is how a fifth Mowich route stayed hidden. Prefer the default whole-catalog scan.`);
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


// --- section 3: cluster by MILEPOST, because a road serves many trailheads -----------------------
/* SECTIONS 1 AND 2 CLUSTER BY TRAILHEAD COORDINATE, AND THIS FILE'S OWN HEADER SAYS "THE UNIT OF
   TRUTH IS THE ROAD, NOT THE ROUTE." Those two sentences do not agree. A road serves many
   trailheads, so two routes describing ONE closure from different trailheads never land in the same
   500 m cluster — and this audit reported 0 across all 205,543 routes while the catalog said both
   "Closed as of Dec 2025 — Mountain Loop Highway landslide at MP 37.5 blocks access" and "Open
   (Mountain Loop Highway reopened mid-May 2026 after a landslide closure near milepost 37.5)".
   49 routes name that corridor across 17 trailheads.

   A MILEPOST is the key that works: an exact point on an exact road, naming one closure EVENT. The
   road NAME alone is far too broad — on that corridor it also covers the Monte Cristo Road, which
   is separately and legitimately vehicle-closed, and an ordinary winter gate. Forest ORDER NUMBERS
   were measured and rejected earlier as a detector for a class of zero; mileposts had not been
   tried.

   PRECISION WAS MEASURED BEFORE THIS SHIPPED, and the first run was 33% — 3 disputed of which 1 was
   real, the same precision section 2 shipped at and was rightly criticised for. Four suppressions,
   each a distinct way road prose defeats this key, all four found by READING the output rather than
   by trusting the count:
     1. SEASONAL — a gate that closes every winter and reopens every spring says both, truthfully.
        Without it the four largest clusters were SR-20 winter mileposts (MP 134 across 62 routes,
        MP 171 across 48, MP 120 across 20, MP 178 across 18). 271 of 514 mentions.
     2. HYPOTHETICAL — "Normally 2.5-3 hours from Seattle ... when fully open" is a counterfactual,
        not a claim the road is open. Same family as the negation trap section 1 records.
     3. A BARE "Closed" — IN_FORCE demanded "is closed"/"closes", so "Closed to vehicles at the
        Glacier Creek bridge (~MP 3.0)" matched NOTHING and the row counted only as lifted, on a
        HISTORICAL reopening narrated inside it (a 2021 washout bypassed in Nov 2023) with nothing
        to do with the current closure. Past tense is excluded so narration cannot read as a
        current claim.
     4. A ROUTE ON BOTH SIDES IS NARRATING, NOT DISPUTING — judged per ROUTE, not per value.
   With all four, 1 disputed and it was the real one.

   "closed at MP X" and "open to MP X" are the SAME fact (shut beyond that point) — the mirror
   section 1 already had to learn — so the contradiction tested is lifted-vs-in-force only. */
const MP_RE = /\b(?:milepost|mile ?post|mile marker|\bMP)\.?\s*(\d{1,3}(?:\.\d)?)/gi;
const SEASONAL_MP = /\b(seasonal|winter|snow(?:pack|fall)?|avalanche|each (?:spring|summer|winter)|every winter|gated|gate[sd]? (?:in|for)|plow|spring opening|typically (?:opens|closes))/i;
const HYPOTHETICAL = /\b(?:when|once|if|until|before)\b[^.;]{0,40}\bopen/i;
const LIFTED = /\breopen(?:ed|ing)?\b|\brepairs? (?:reopened|completed)|\bnow open\b|\bfully open\b|\bopen for the season\b/i;
const MP_IN_FORCE = /(?<!was )(?<!were )(?<!been )(?<!previously )(?<!formerly )\bclosed?\b|\bcloses\b|\bblocks?\b|\bimpassable\b/i;
const MPSTOP = new Set([...ROADSTOP, "mile", "milepost"]);
const mptoks = x => [...new Set([...String(x || "").toLowerCase().matchAll(/[a-z]{3,}/g)].map(m => m[0]).filter(t => !MPSTOP.has(t)))];

const mpItems = [];
for (const r of rows) {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  const vals = { "road.name": rd.name, "road.status": rd.status, "road.driveNote": rd.driveNote,
    "road.seasonalGate": rd.seasonalGate, "access.closures": ac.closures, "access.seasonal": ac.seasonal };
  for (const [k, v] of Object.entries(vals)) {
    if (typeof v !== "string") continue;
    for (const m of v.matchAll(MP_RE)) {
      const nameTokens = mptoks(rd.name);
      const idTokens = nameTokens.length ? nameTokens : mptoks(v);
      const seasonal = SEASONAL_MP.test(v), hypo = HYPOTHETICAL.test(v);
      mpItems.push({ id: r.id, field: k, mp: m[1], v, idTokens, fromName: !!nameTokens.length,
        lifted: !seasonal && !hypo && LIFTED.test(v), inForce: !seasonal && MP_IN_FORCE.test(v) });
    }
  }
}
const mpClusters = [];
for (const it of mpItems) {
  const c = mpClusters.find(c => c.mp === it.mp && c.tokens.some(t => it.idTokens.includes(t)));
  if (c) { c.items.push(it); for (const t of it.idTokens) if (!c.tokens.includes(t)) c.tokens.push(t); }
  else mpClusters.push({ mp: it.mp, tokens: [...it.idTokens], items: [it] });
}
const mpFindings = [];
for (const c of mpClusters) {
  if (new Set(c.items.map(i => i.id)).size < 2) continue;
  const liftedRaw = new Set(c.items.filter(i => i.lifted).map(i => i.id));
  const forceRaw = new Set(c.items.filter(i => i.inForce).map(i => i.id));
  const lifted = [...liftedRaw].filter(id => !forceRaw.has(id));
  const inForce = [...forceRaw].filter(id => !liftedRaw.has(id));
  if (lifted.length && inForce.length) mpFindings.push({ c, lifted, inForce });
}
for (const f of mpFindings) {
  console.log(`\nMP ${f.c.mp} (${f.c.tokens.slice(0, 4).join("/")}) — one closure, two answers:`);
  console.log(`   REOPENED per: ${f.lifted.join(", ")}`);
  console.log(`   IN FORCE per: ${f.inForce.join(", ")}`);
  for (const i of f.c.items) console.log(`      ${i.id} ${i.field}: ${i.v.slice(0, 150)}`);
}

/* SECTION 4: SAME ROAD, TWO POSITIONS FOR ONE GATE.
   Section 3 keys on the MILEPOST, so a disagreement ABOUT the milepost can never form a
   cluster — the two claims land in different buckets and are never compared. That is the
   blind spot this closes, and it is a property of the clustering key rather than of the
   needle: [[a-detectors-clustering-key-decides-what-it-can-see]].

   Found by reading the Suiattle cluster by hand: five routes describe ONE closure event
   (December 2025 atmospheric-river flood, USFS order 06-05-26-03, April 2026 - January 2028)
   and place its gate at MP 4 on two routes and MP 4.5 on three. A party planning off the
   first walks half a mile it did not budget for; off the second, it drives to a gate that
   is not there.

   The unit is the ROAD, not the milepost and not the trailhead — one road carries one gate
   per closure event, and routes reaching it from different trailheads still describe the
   same gate. Clustering by road name alone is what this file's own header calls far too
   broad, so three things narrow it: only IN-FORCE mentions count (seasonal gates and
   hypotheticals are already stripped by section 3's tests), a route stating SEVERAL
   mileposts is describing several gates rather than disagreeing with anyone, and the
   identity tokens come from road.name with ROADSTOP applied, so "River"/"Creek"/"Road"
   cannot merge two unrelated roads. */
const roadClusters = new Map();
for (const it of mpItems) {
  // road.name only. The prose fallback section 3 uses is a guess at which road a sentence is
  // about, and a guess cannot support a claim that two routes contradict each other.
  if (!it.inForce || !it.fromName) continue;
  // EXACT identity, never overlap. Overlap CHAINS: a Ptarmigan Traverse route whose road.name
  // is "Cascade River Road (north approach) or Suiattle River Road (south approach)" shares a
  // token with each, so an overlap test merges two unrelated roads into one cluster and reports
  // Cascade's MP 20 winter gate as a third position for Suiattle's flood gate. Measured: that
  // draft reported 6 findings of which at least 2 were this. A route naming two roads now keys
  // to its own bucket and simply finds no partner, which is the correct answer for a value that
  // does not say which road the milepost belongs to.
  const key = [...it.idTokens].sort().join("|");
  if (!roadClusters.has(key)) roadClusters.set(key, { tokens: it.idTokens, items: [] });
  roadClusters.get(key).items.push(it);
}
const posFindings = [];
for (const c of roadClusters.values()) {
  const byRoute = new Map();
  for (const i of c.items) { if (!byRoute.has(i.id)) byRoute.set(i.id, new Set()); byRoute.get(i.id).add(i.mp); }
  // A route naming several mileposts is describing several gates on one road, which is ordinary
  // and true. Only routes committing to ONE position can contradict each other.
  const single = [...byRoute.entries()].filter(([, mps]) => mps.size === 1)
                                       .map(([id, mps]) => [id, [...mps][0]]);
  if (single.length < 2) continue;
  // COMPARE NUMERICALLY, NEVER AS STRINGS. "MP 3" and "MP 3.0" are one position written two
  // ways, and a Set of strings calls them a disagreement — reported as "2 positions (spread
  // 0.0 mi)", which is self-evidently not a disagreement at all. Measured on the live catalog
  // while testing a wider needle: Glacier Creek Road produced exactly that, four routes all
  // saying mile 3. A spread of zero is the tell, and the guard must not emit one.
  const nums = [...new Set(single.map(([, mp]) => Number(mp)))].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (nums.length < 2) continue;
  const distinct = nums.map(String);
  posFindings.push({ c, single, distinct, spread: nums[nums.length - 1] - nums[0] });
}
posFindings.sort((a, b) => b.spread - a.spread);
for (const f of posFindings) {
  console.log(`
${f.c.tokens.slice(0, 4).join("/")} — one gate, ${f.distinct.length} positions (spread ${f.spread.toFixed(1)} mi):`);
  for (const [id, mp] of f.single.sort((a, b) => Number(a[1]) - Number(b[1]))) console.log(`   MP ${String(mp).padEnd(6)} ${id}`);
}

const multi = clusters.filter(c => c.length > 1);
console.log(`\n${"=".repeat(78)}`);
console.log(`${rows.length} routes read · ${pts.length} carry both a trailhead coordinate and road prose`);
console.log(`${clusters.length} trailhead cluster(s) within ${RADIUS} m · ${multi.length} shared by more than one route`);
console.log(`${findings.length} cluster(s) where one route says the road is CLOSED and another says it OPENS.`);
console.log(`${wrongRoad.length} route(s) whose road.name names a DIFFERENT road from their trailhead neighbours,`);
console.log(`${mpClusters.length} milepost cluster(s) · ${mpFindings.length} where one closure gets two answers (section 3).`);
console.log(`${roadClusters.size} road cluster(s) · ${posFindings.length} where one gate is given two POSITIONS (section 4).`);
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
