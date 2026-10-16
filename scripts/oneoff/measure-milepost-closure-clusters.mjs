// SIZE THE CLASS BEFORE BUILDING A DETECTOR FOR IT. audit:area-parents shipped 41 candidates of
// which 12 were real, and audit:trailhead-road section 2 shipped at ~25-30% precision; both cost
// more than the measurement would have.
//
// The question: can a MILEPOST cluster routes that describe the same closure EVENT, where the
// audit's trailhead-coordinate clustering cannot? A milepost is an exact point on an exact road, so
// two rows naming "MP 37.5" on the Mountain Loop Highway are unambiguously about one thing —
// unlike the road name alone, which also covers the Monte Cristo Road and an ordinary winter gate.
//
// Forest ORDER NUMBERS were already measured and rejected: 5 distinct orders cited, 0 disputed, a
// detector for a class of zero. Mileposts had not been tried.
//
// Report-only. Prints the whole grid so precision can be judged rather than trusted.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report a clean catalog"); process.exit(1); }

const MP = /\b(?:milepost|mile ?post|mile marker|\bMP)\.?\s*(\d{1,3}(?:\.\d)?)/gi;
const ROADSTOP = new Set(["road","rd","the","and","from","via","to","at","trailhead","th","access","park",
  "national","forest","service","fs","fr","nf","hwy","highway","route","sr","us","county","main","north",
  "south","east","west","upper","lower","river","creek","lake","pass","area","campground","entrance","off","mile","milepost"]);
const rtoks = x => [...new Set([...String(x || "").toLowerCase().matchAll(/[a-z]{3,}/g)].map(m => m[0]).filter(t => !ROADSTOP.has(t)))];

// Does the value say the closure at this point has been LIFTED, or that it is IN FORCE?
// "closed at MP X" and "open to MP X" are the SAME fact (shut beyond that point) — the mirror
// section 1 of the audit already had to learn. The contradiction is lifted-vs-in-force only.
/* THREE NEEDLE BUGS, ALL FOUND BY READING THE FIRST RUN RATHER THAN BY TRUSTING ITS COUNT — it
   reported 3 disputed of which only 1 was real (33%, the same precision audit:trailhead-road
   section 2 shipped at and was rightly criticised for).

   1. A HYPOTHETICAL IS NOT A CLAIM. "Normally about 2.5-3 hours from Seattle ... when fully open"
      matched `fully open` and put two Suiattle routes in the LIFTED column while their own
      road.status says CLOSED. Same family as the negation trap audit:trailhead-road records
      ("Not plowed in winter" read as an open road) — a clause about a counterfactual state.
   2. IN_FORCE COULD NOT SPELL A BARE "Closed". It required "is closed"/"closes", so
      "Closed to vehicles at the Glacier Creek bridge (~MP 3.0)" matched NOTHING and the row
      counted only as LIFTED, on a HISTORICAL reopening narrated inside it (a 2021 washout at mile
      3.8 bypassed in Nov 2023) that has nothing to do with the current Dec 2025 closure. Past
      tense is excluded explicitly so narration does not read as a current claim.
   3. A ROUTE IN BOTH COLUMNS IS NARRATING, NOT DISPUTING. Handled at the cluster test below. */
const HYPOTHETICAL = /\b(?:when|once|if|until|before)\b[^.;]{0,40}\bopen/i;
const LIFTED = /\breopen(?:ed|ing)?\b|\brepairs? (?:reopened|completed)|\bnow open\b|\bfully open\b|\bopen for the season\b/i;
const IN_FORCE = /(?<!was )(?<!were )(?<!been )(?<!previously )(?<!formerly )\bclosed?\b|\bcloses\b|\bblocks?\b|\bimpassable\b|\bremains? closed\b|\bstill closed\b/i;
/* A SEASONAL GATE LEGITIMATELY SAYS BOTH, and without this the measurement is almost pure noise.
   SR-20's winter closure is described from both ends all over the catalog — "closes every winter",
   "reopened as late as June 25 in 2026" — and both are true of the same gate. The first run
   reported 10 disputed clusters of which the four largest were SR-20 gate mileposts (MP 134 with
   62 routes, MP 171 with 48, MP 120 with 20, MP 178 with 18). Section 1 of the audit needed the
   same suppression; this is that lesson arriving at a different key. */
const SEASONAL = /\b(seasonal|winter|snow(?:pack|fall)?|avalanche|each (?:spring|summer|winter)|every winter|gated|gate[sd]? (?:in|for)|plow|spring opening|typically (?:opens|closes))/i;

const items = [];
for (const r of rows) {
  const fields = {
    "road.name": r.road && r.road.name, "road.status": r.road && r.road.status,
    "road.driveNote": r.road && r.road.driveNote, "road.seasonalGate": r.road && r.road.seasonalGate,
    "access.closures": r.access && r.access.closures, "access.seasonal": r.access && r.access.seasonal,
  };
  const roadName = (r.road && r.road.name) || "";
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v !== "string") continue;
    for (const m of v.matchAll(MP)) {
      // Road identity for this mention: prefer the row's road.name, fall back to the value itself.
      const idTokens = rtoks(roadName).length ? rtoks(roadName) : rtoks(v);
      const seasonal = SEASONAL.test(v);
      const hypo = HYPOTHETICAL.test(v);
      items.push({ id: r.id, field: k, mp: m[1], v, idTokens, seasonal,
        lifted: !seasonal && !hypo && LIFTED.test(v), inForce: !seasonal && IN_FORCE.test(v) });
    }
  }
}
console.log(`${items.length} value-mention(s) name a milepost, across ${new Set(items.map(i => i.id)).size} route(s)\n`);

// Cluster on (milepost, shared road token). A shared distinctive token is what says "same road";
// the milepost is what says "same point on it".
const clusters = new Map();
for (const it of items) {
  let placed = false;
  for (const [key, c] of clusters) {
    if (c.mp !== it.mp) continue;
    if (!c.tokens.some(t => it.idTokens.includes(t))) continue;
    c.items.push(it); for (const t of it.idTokens) if (!c.tokens.includes(t)) c.tokens.push(t);
    placed = true; break;
  }
  if (!placed) clusters.set(`${it.mp}|${it.idTokens[0] || "?"}|${clusters.size}`, { mp: it.mp, tokens: [...it.idTokens], items: [it] });
}

let multi = 0, disputed = 0;
for (const c of clusters.values()) {
  const ids = new Set(c.items.map(i => i.id));
  if (ids.size < 2) continue;
  multi++;
  /* AT ROUTE LEVEL, NOT VALUE LEVEL. A route whose road.status says CLOSED and whose driveNote
     narrates an old reopening is describing one road over time — not disagreeing with anybody. It
     landed in both columns and manufactured two of the three first-run findings. Any route
     appearing on both sides is dropped from both. */
  const liftedRaw = new Set(c.items.filter(i => i.lifted).map(i => i.id));
  const forceRaw = new Set(c.items.filter(i => i.inForce).map(i => i.id));
  const both = [...liftedRaw].filter(id => forceRaw.has(id));
  const lifted = [...liftedRaw].filter(id => !forceRaw.has(id));
  const inForce = [...forceRaw].filter(id => !liftedRaw.has(id));
  const contested = lifted.length && inForce.length;
  if (contested) disputed++;
  console.log(`${contested ? ">> DISPUTED  " : "   agreed    "}MP ${c.mp}  ·  road tokens: ${c.tokens.slice(0, 4).join("/")}  ·  ${ids.size} route(s)`);
  if (lifted.length) console.log(`      LIFTED:   ${lifted.join(", ")}`);
  if (inForce.length) console.log(`      IN FORCE: ${inForce.join(", ")}`);
  if (both.length) console.log(`      says both (historical narration): ${both.join(", ")}`);
  if (contested) for (const i of c.items) console.log(`         ${i.id} ${i.field}: ${i.v.slice(0, 165)}`);
  console.log("");
}
const seasonalSuppressed = items.filter(i => i.seasonal).length;
console.log(`${clusters.size} milepost cluster(s) · ${multi} span more than one route · ${disputed} DISPUTED`);
console.log(`(${seasonalSuppressed} of ${items.length} mentions suppressed as SEASONAL — a gate that closes every winter and reopens every spring says both, truthfully)`);
console.log(disputed
  ? `\nJudge these by reading them. A cluster is only worth having if the milepost really does name\none event on one road — read the prose before treating any of it as a defect.`
  : `\nNo disputed milepost. A detector here would be a detector for a class of zero, like the\nforest-order-number one that was measured and rejected.`);
