// The FILTER CHIPS were the last controls reading imperial to a metric climber, and the length
// labels also disagreed with the filter they label.
//
// Two questions, and the second is the load-bearing one:
//   1. Does each chip render in the climber's units? The SLIDERS beside these already did
//      (`"Within "+uDistMi(radiusMi)`), so this was one app answering one question two ways.
//   2. Does each length label agree with the PREDICATE? `passesFilters` tests `ft>=600` for the
//      third bucket, so a 600 ft route is in it -- while the second bucket was labelled
//      "201-600 ft". A label that claims a route its own filter puts elsewhere is the defect;
//      the units were the reason to be in the file.
//
// EXECUTED against the real exports rather than read, because a label built from one map is
// exactly the thing a reader talks themselves into believing is right.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(ROOT, ".filter-units-"));
let fails = 0, ran = 0;
const ok = (cond, msg) => { ran++; if (cond) console.log("  ok    " + msg); else { fails++; console.log("  FAIL  " + msg); } };

// `process.exit()` SKIPS `finally`, so every fail-closed path below would leak the temp directory
// it just made -- and this one is created INSIDE the repo (react resolves from the nearest
// node_modules, so a bundle in the OS temp dir throws). Nine leaked into `git status` before this
// was fixed, one per failing injection run, which is the trap check:block-guarantees already
// records. Set the code and RETURN; the cleanup in `finally` is what actually ends the run.
const die = (msg) => { console.error(msg); process.exitCode = 1; throw new Error("__probe_stop__"); };

try {
  const entry = path.join(tmp, "entry.mjs");
  fs.writeFileSync(entry, 'export { ROUTE_LENGTHS, routeLengthLabel, uDistMi, uDistMiUnitLong, passesFilters, __set_UNITS } from "../ClimbMatchCore.jsx";\n');
  const out = path.join(tmp, "b.mjs");
  execSync(`npx esbuild ${entry} --bundle --format=esm --platform=node --jsx=automatic ` +
           `--loader:.jsx=jsx --define:import.meta.env={} --external:react --external:react-dom ` +
           `--external:@tanstack/react-query --external:@supabase/supabase-js --outfile=${out}`,
           { stdio: ["ignore", "ignore", "pipe"] });
  const m = await import(out);
  for (const n of ["ROUTE_LENGTHS", "routeLengthLabel", "uDistMi", "passesFilters", "__set_UNITS"]) {
    if (m[n] === undefined) die("BROKEN: " + n + " is not exported — nothing below was checked.");
  }
  const BUCKETS = m.ROUTE_LENGTHS.filter((b) => b[0] !== "any");
  if (BUCKETS.length < 4) die("BROKEN: fewer than 4 length buckets — the map moved.");

  // ---- 1. the labels render in the climber's units -------------------------------------------
  m.__set_UNITS("imperial");
  const impLabels = BUCKETS.map((b) => m.routeLengthLabel(b[0]));
  console.log("\nimperial length labels: " + impLabels.join("  |  "));
  ok(impLabels.every((s) => / ft\b/.test(s)), "every imperial length label carries ft");
  ok(m.uDistMi(50) === "50 mi", 'imperial distance chip reads "Within 50 mi"  (got "' + m.uDistMi(50) + '")');

  m.__set_UNITS("metric");
  const metLabels = BUCKETS.map((b) => m.routeLengthLabel(b[0]));
  console.log("metric   length labels: " + metLabels.join("  |  "));
  ok(metLabels.every((s) => / m\b/.test(s)), "every metric length label carries m");
  ok(!metLabels.some((s) => /\bft\b/.test(s)), "no metric length label still says ft");
  ok(/km$/.test(m.uDistMi(50)), 'metric distance chip converts  (got "Within ' + m.uDistMi(50) + '")');
  ok(m.uDistMiUnitLong() === "kilometres", "the aria-label unit word converts too");

  // The two must actually DIFFER, or a helper that ignored the setting would satisfy both above.
  ok(impLabels.join() !== metLabels.join(), "the two unit modes produce DIFFERENT labels");

  // ---- 2. every label agrees with the predicate it labels ------------------------------------
  // This is the half that was wrong: read each bucket's stated bounds back out of its own label
  // and confirm passesFilters agrees about both ends AND about the value just outside them.
  m.__set_UNITS("imperial");
  const route = (ft) => ({ id: "x", routeFt: ft, discipline: "trad", grade: "5.9", pitches: 4 });
  const inBucket = (ft, k) => m.passesFilters(route(ft), { length: k });
  for (const [k, lo, hi] of BUCKETS) {
    if (lo != null) {
      ok(inBucket(lo, k), k + ": the filter accepts its own low bound " + lo + " ft");
      ok(!inBucket(lo - 1, k), k + ": the filter rejects " + (lo - 1) + " ft, one below it");
    }
    if (hi != null) {
      ok(inBucket(hi, k), k + ": the filter accepts its own high bound " + hi + " ft");
      ok(!inBucket(hi + 1, k), k + ": the filter rejects " + (hi + 1) + " ft, one above it");
    }
  }
  // The historical defect, pinned by value: 600 ft belongs to the THIRD bucket, and the second
  // bucket's label used to claim it.
  ok(inBucket(600, "600") && !inBucket(600, "200"), "600 ft is in the 600 bucket, not the 201- one");
  ok(!/600/.test(m.routeLengthLabel("200")), 'the 201- label no longer claims 600  (reads "' + m.routeLengthLabel("200") + '")');
  ok(!/1500/.test(m.routeLengthLabel("600")), 'the 600 label no longer claims 1500  (reads "' + m.routeLengthLabel("600") + '")');

  // ---- 3. every bucket is reachable ----------------------------------------------------------
  ok(BUCKETS.every(([k]) => m.routeLengthLabel(k) !== "Length"), "no bucket falls through to the placeholder");
  ok(m.routeLengthLabel("nonsense") === "Length", "an unknown key falls back rather than throwing");

  // ---- 4. the CALL SITES use them, read from SOURCE -------------------------------------------
  // Executing the helpers proves they convert; it says nothing about whether the chips call them.
  // Injection case `hardcoded-length-map` MISSED against a probe that stopped at section 3, which
  // is the trap the bail-form probe already recorded: assert the HELPER and a reverted FORM stays
  // green. SSR cannot click a filter chip, so the wiring is read from the file, and matched on the
  // EXPRESSION rather than the helper's name so the comment beside the fix cannot satisfy it.
  const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
  const mask = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  ok(/ROUTE_LENGTHS\.map\(\s*b\s*=>\s*\[\s*b\[0\]\s*,\s*routeLengthLabel\(/.test(mask),
     "the length chips are BUILT from ROUTE_LENGTHS, not a second literal map");
  ok(/label:\s*routeLengthLabel\(/.test(mask), "the applied-filter chip goes through routeLengthLabel too");
  ok(!/"20[01]\s*[–-]\s*600 ft"/.test(mask), "no hand-copied length literal survives anywhere");
  ok(/"Within "\+uDistMi\(\s*50\s*\)/.test(mask), "the distance chip calls uDistMi rather than naming a unit");
  ok(!/aria-label="[^"]*\bin miles\b/.test(mask), "no aria-label still hardcodes miles");
  ok((mask.match(/uDistMiUnitLong\(\)/g) || []).length >= 5, "every distance aria-label takes the unit word from the setting");

  console.log("\n" + (ran - fails) + "/" + ran + " assertions passed");
  if (fails) process.exitCode = 1;
} catch (e) {
  // A fail-closed stop is already reported and already has its exit code; anything else is a real
  // crash and must not be swallowed, or a broken probe would read as a clean one.
  if (!e || e.message !== "__probe_stop__") throw e;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
