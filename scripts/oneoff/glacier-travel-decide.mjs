// Turns a state's review batches into its final glacier-travel / snow-in-season verdicts.
//
//   node scripts/oneoff/glacier-travel-decide.mjs --state or --verify-in   # check out-*.json, write verify-in-*.json
//   node scripts/oneoff/glacier-travel-decide.mjs --state or --final       # fold verify-out-*.json (and research-out-*.json) in, write final.json
//   node scripts/oneoff/glacier-travel-decide.mjs --state or --research-in # optional: write research-in-*.json, the routes still unsure
//
// The second read (verify) covers the RISKY "no glacier" calls: the route's own text names a glacier, or the
// first reviewer's "no" did not rest on the route's text. Where the two reads disagree the answer moves toward
// keeping the warning: yes + unsure -> yes, anything else that disagrees -> unsure. Never toward "no".
// No database. Files live in research-data/glacier-travel-2026-11-23/<state>/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const STATE = argv[argv.indexOf("--state") + 1];
if (!/^[a-z]{2}$/.test(String(STATE))) { console.error("needs --state <slug>"); process.exit(2); }
const dir = path.join(ROOT, "research-data", "glacier-travel-2026-11-23", STATE);
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const files = (re) => fs.readdirSync(dir).filter((f) => re.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
const VALS = new Set(["yes", "no", "unsure"]);

const audit = Object.fromEntries(read("audit.json").map((r) => [r.id, r]));
const inn = new Map(); for (const f of files(/^in-\d+\.json$/)) read(f).forEach((r) => inn.set(r.id, r));
const first = new Map(), problems = [];
for (const f of files(/^out-\d+\.json$/)) for (const r of read(f)) {
  if (!inn.has(r.id)) { problems.push(f + ": unknown id " + r.id); continue; }
  if (first.has(r.id)) { problems.push(f + ": " + r.id + " answered twice"); continue; }
  if (!VALS.has(r.glacier) || !VALS.has(r.snowInSeason)) { problems.push(f + ": " + r.id + " has a value that is not yes/no/unsure"); continue; }
  if (!r.why || !["text", "knowledge", "web"].includes(r.basis)) problems.push(f + ": " + r.id + " lacks a why or a basis");
  first.set(r.id, r);
}
const unanswered = [...inn.keys()].filter((id) => !first.has(id));
if (unanswered.length) problems.push(`${unanswered.length} input routes have no answer: ${unanswered.slice(0, 6).join(", ")}`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
const tally = (rs, f) => rs.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const all = [...first.values()];
console.log(`${STATE}: ${all.length} routes answered; glacier ${JSON.stringify(tally(all, (r) => r.glacier))}; snow ${JSON.stringify(tally(all, (r) => r.snowInSeason))}`);

// The second read also takes every route the first read left UNSURE on either fact: it researches those online,
// and a researched answer settles a fact the first read could not (a first-read yes or no is never overturned
// to "no" by it, only moved toward the warning).
const risky = all.filter((r) => (r.glacier === "no" && (audit[r.id].textGlacier || r.basis !== "text")) || r.glacier === "unsure" || r.snowInSeason === "unsure");

if (argv.includes("--verify-in")) {
  const PER = 60, N = Math.max(1, Math.ceil(risky.length / PER)), per = Math.ceil(risky.length / N);
  for (const f of files(/^verify-in-\d+\.json$/)) fs.unlinkSync(path.join(dir, f));
  for (let i = 0; i < N && risky.length; i++) fs.writeFileSync(path.join(dir, `verify-in-${i + 1}.json`), JSON.stringify(risky.slice(i * per, (i + 1) * per).map((r) => inn.get(r.id)), null, 1));
  console.log(`  risky "no glacier" calls and unsure routes for a second read: ${risky.length} in ${risky.length ? N : 0} file(s)`);
} else if (argv.includes("--final") || argv.includes("--research-in")) {
  const second = new Map(); for (const f of files(/^verify-out-\d+\.json$/)) read(f).forEach((r) => second.set(r.id, r));
  const research = new Map();
  if (!argv.includes("--research-in")) for (const f of files(/^research-out-\d+\.json$/)) read(f).forEach((r) => { if (!VALS.has(r.glacier) || !VALS.has(r.snowInSeason)) throw new Error(f + ": " + r.id + " has a bad value"); research.set(r.id, r); });
  const region = fs.existsSync(path.join(dir, "region.json")) ? read("region.json") : null;
  if (region && (region.glacier !== "no" || !region.why)) throw new Error("region.json must say glacier: no and give its why");
  // With a regional fact, a risky first-read call needs no second read: the place itself settles the glacier question.
  const missed = region ? [] : risky.filter((r) => !second.has(r.id));
  if (missed.length) { console.error(`${missed.length} risky calls have no second read: ${missed.slice(0, 6).map((r) => r.id).join(", ")}`); process.exit(1); }
  const agree = (a, b) => a === b ? a : (a === "yes" || b === "yes") && (a === "unsure" || b === "unsure") ? "yes" : "unsure";
  const keep = (a, b, web) => a === "unsure" && web ? b : agree(a, b);
  let changedG = 0, changedS = 0;
  const out = all.map((r) => {
    const x = second.get(r.id); let g = r.glacier, s = r.snowInSeason;
    if (x) { if (!VALS.has(x.glacier) || !VALS.has(x.snowInSeason)) throw new Error("second read of " + r.id + " has a bad value"); const web = x.basis === "web", g2 = keep(g, x.glacier, web), s2 = keep(s, x.snowInSeason, web); if (g2 !== g) changedG++; if (s2 !== s) changedS++; g = g2; s = s2; }
    // RESEARCH ROUND (optional, research-out-*.json): one more online look at routes still unsure after both
    // reads. It can settle an UNSURE fact, and only on a source the researcher read (basis "web").
    const q = research.get(r.id); let researched = false;
    if (q && q.basis === "web") {
      if (g === "unsure" && q.glacier !== "unsure") { g = q.glacier; researched = true; }
      if (s === "unsure" && q.snowInSeason !== "unsure") { s = q.snowInSeason; researched = true; }
    }
    // REGIONAL FACT (optional, region.json): a state or province with NO glacier anywhere settles the glacier
    // question as "no" for a route still unsure after the reads. A documented fact about the place (RULE.md:
    // "a guidebook-level fact"), written by hand with its reason, never applied to a place that holds a glacier.
    // `iceSeason: true` also settles snowInSeason "yes" on a route still unsure there: winter ice and snow lines,
    // whose normal season IS the snow season (REVIEW-PROMPT step 6).
    let regional = false;
    if (region && g === "unsure") { g = "no"; regional = true; }
    if (region && region.iceSeason && s === "unsure") { s = "yes"; regional = true; }
    if (g === "yes") s = "yes";
    const a = audit[r.id];
    return { id: r.id, name: a.name, peak: a.area, discipline: a.disc, kindToday: a.kind, glacier: g, snowInSeason: s, basis: r.basis, why: r.why, verified: !!x, ...(x && (x.glacier !== r.glacier || x.snowInSeason !== r.snowInSeason) ? { secondReview: x.glacier + "/" + x.snowInSeason + ": " + x.why } : {}), ...(researched ? { research: q.glacier + "/" + q.snowInSeason + ": " + q.why } : {}), ...(regional ? { regional: region.why } : {}) };
  });
  if (argv.includes("--research-in")) {
    const open = out.filter((r) => r.glacier === "unsure" || r.snowInSeason === "unsure");
    for (const f of files(/^research-in-\d+\.json$/)) fs.unlinkSync(path.join(dir, f));
    const PER = 25, N = Math.max(1, Math.ceil(open.length / PER)), per = Math.ceil(open.length / N);
    for (let i = 0; i < N && open.length; i++) fs.writeFileSync(path.join(dir, `research-in-${i + 1}.json`), JSON.stringify(open.slice(i * per, (i + 1) * per).map((r) => Object.assign({}, inn.get(r.id), { stillUnsure: [r.glacier === "unsure" ? "glacier" : null, r.snowInSeason === "unsure" ? "snowInSeason" : null].filter(Boolean) })), null, 1));
    console.log(`  still unsure after both reads: ${open.length}, written to ${open.length ? N : 0} research file(s)`);
    process.exit(0);
  }
  fs.writeFileSync(path.join(dir, "final.json"), JSON.stringify(out, null, 1));
  console.log(`  second read of ${second.size}: moved glacier on ${changedG}, snow on ${changedS}${region ? `; regional fact settled ${out.filter((r) => r.regional).length}` : ""}`);
  console.log(`  FINAL glacier ${JSON.stringify(tally(out, (r) => r.glacier))}; snow ${JSON.stringify(tally(out, (r) => r.snowInSeason))}`);
  console.log(`  by outcome ${JSON.stringify(tally(out, (r) => r.glacier === "yes" ? "glacier" : r.glacier === "unsure" ? "glacier not settled (warnings kept)" : r.snowInSeason === "yes" ? "snow, no glacier" : r.snowInSeason === "unsure" ? "no glacier, snow not settled" : "dry in season"))}`);
} else { console.error("needs --verify-in or --final"); process.exit(2); }
