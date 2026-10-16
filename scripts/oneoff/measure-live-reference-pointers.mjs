// MEASURE THE CLASS BEFORE BUILDING THE DETECTOR.
//
// The user decided 2026-09-02 that a pointer telling a climber to go and check something for
// themselves is a LIVE REFERENCE and stays — the same reasoning that already keeps 2,479
// land-manager alert pages and ranger phone numbers. This asks how big that class is, and
// prints every candidate sentence so the boundary can be read rather than trusted.
//
// It deliberately reuses the audit's OWN needles (ANCHOR LOST if they move) rather than
// re-implementing them. A second regex disagreeing with the guard is far more likely to be the
// second regex — this repo has already lost an hour to exactly that on this audit.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");

function lift(name) {
  const m = src.match(new RegExp("^const " + name + " = (/.*/[a-z]*);$", "m"));
  if (!m) { console.error(`ANCHOR LOST: could not lift ${name} from the audit.`); process.exit(1); }
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}
const NAMED = lift("NAMED"), ACT = lift("ACT"), LIVE = lift("LIVE");

const CN = lift("COMMON_NOUN");
const deCommonNoun = (t) => t.replace(CN, (m) => "x".repeat(m.length));

// Lift the audit's OWN column list too. Hand-typing it produced `permits`, which is not a
// column (it is `permit`), and PostgREST answered 42703 — the same lesson as the needles.
const pcm = src.match(/const PROSE_COLS = \[[\s\S]*?\];/);
if (!pcm) { console.error("ANCHOR LOST: PROSE_COLS"); process.exit(1); }
const PROSE = eval(pcm[0].replace("const PROSE_COLS =", "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/;\s*$/, ""));

const rows = await selectAll("routes", "id," + PROSE.join(","), "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

function leaves(v, out) {
  if (v == null) return out;
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (typeof v === "object") { for (const k of Object.keys(v)) leaves(v[k], out); return out; }
  return out;
}

const values = [];
for (const r of rows) for (const f of PROSE) for (const t of leaves(r[f], [])) values.push({ id: r.id, field: f, text: t });

// A POINTER is an advisory aimed at the READER — go and look at this yourself. The publisher
// is the OBJECT of the verb, not the authority behind a claim.
const POINTER = /\b(?:check|re-?check|verify|confirm|consult|read|see|refer to|look at|monitor|watch|review|search)\b[^.;]{0,60}?(?:WTA|Washington Trails Association|AllTrails|SummitPost|Peakbagger|Mountain ?Project|Wikipedia|CalTopo|Gaia|CascadeClimbers|NWHikers|trip report|forum|guidebook)/i;

const SENT = (t) => t.split(/(?<=[.;!?])\s+/).filter((x) => x.trim());

/* A LOOSER CROSS-CHECK, because the first run of POINTER returned 0 and a 0 out of a
   proximity-window regex is exactly the vacuous result this repo keeps recording. LOOSE asks
   only whether the citing sentence contains an advisory verb ANYWHERE, with no requirement that
   the publisher be its object. It will over-report; that is the point — if LOOSE is also 0, the
   strict 0 is a fact about the data rather than an artefact of my window. */
const LOOSE = /\b(?:check|re-?check|verify|consult|read|refer to|look at|monitor|search|before you go|before heading|worth reading)\b/i;

let cited = 0, allPointer = 0, mixed = 0, noPointer = 0, looseHits = 0;
const showAll = [], showMixed = [], showLoose = [];
for (const v of values) {
  const t = deCommonNoun(v.text);
  if (!(NAMED.test(t) || ACT.test(t))) continue;
  cited++;
  const sents = SENT(t);
  const citing = sents.filter((s) => NAMED.test(s) || ACT.test(s));
  if (!citing.length) { noPointer++; continue; }
  const ptr = citing.filter((s) => POINTER.test(s) && !ACT.test(s));
  if (ptr.length === citing.length) { allPointer++; if (showAll.length < 14) showAll.push([v, citing]); }
  else if (ptr.length) { mixed++; if (showMixed.length < 10) showMixed.push([v, citing, ptr]); }
  else noPointer++;
  if (citing.some((s) => LOOSE.test(s))) { looseHits++; if (showLoose.length < 20) showLoose.push([v, citing.filter((s) => LOOSE.test(s))]); }
}

console.log(`values scanned: ${values.length}`);
console.log(`cited (the audit's current finding set): ${cited}`);
console.log(`  EVERY citing sentence is a pointer  -> would become LIVE: ${allPointer}`);
console.log(`  MIXED (some pointer, some attribution) -> must STAY a finding: ${mixed}`);
console.log(`  no pointer at all -> stays a finding: ${noPointer}`);
console.log(`  LOOSE cross-check (advisory verb ANYWHERE in a citing sentence): ${looseHits}\n`);

console.log("=== LOOSE HITS — read these; they are the only place a pointer could be hiding ===");
for (const [v, ss] of showLoose) {
  console.log(`\n${v.id}  ${v.field}`);
  for (const s of ss) console.log("   ~ " + s.trim().slice(0, 200));
}
console.log("");

console.log("=== WOULD BECOME LIVE (read these — the whole decision rests on them) ===");
for (const [v, citing] of showAll) {
  console.log(`\n${v.id}  ${v.field}`);
  for (const s of citing) console.log("   • " + s.trim().slice(0, 200));
}
console.log("\n\n=== MIXED — a pointer AND an attribution in one value, so it must stay ===");
for (const [v, citing, ptr] of showMixed) {
  console.log(`\n${v.id}  ${v.field}`);
  for (const s of citing) console.log((ptr.includes(s) ? "   ptr  " : "   ATTR ") + s.trim().slice(0, 190));
}
