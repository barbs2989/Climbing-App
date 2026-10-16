// Give a rack to routes whose own pitch notes already state their protection.
//
// The gear-research ask, measured, is not 4,938 routes. Of the 5,506 roped WA routes, 594 have
// been written up and 568 of those already carry a rack; only 30 are written up and rackless.
// The other 4,908 populate zero or one column each — catalog stubs called "10a Right" — where no
// published rack exists to find and DISC_RACK's honest "quickdraws" is already the right answer.
//
// Of those 30, a majority already STATE their protection inside `pitch_detail`: "3 bolts plus
// small gear for crux", "small nuts/cams", "protect w/ #5 Camalot", "Hand crack, natural gear;
// only unbolted pitch". That is not research, it is RE-HOMING — the same operation the
// climbing_route sweep performs, and it is verifiable the same way. A climber opening the RACK
// box sees a generic list while the route's own protection sits three sections away.
//
// WHAT THIS DELIBERATELY DOES NOT DO: invent a rack for the rest. Five Goose Egg routes carry an
// overview that a previous pass wrote saying, in as many words, "no published approach,
// pitch-by-pitch, or gear beta was found beyond this record". That is a documented NEGATIVE
// RESULT and writing a plausible rack over it would be fabrication of the exact kind
// check:enrichment-traceable exists to stop. Same for the Hozomeen, Molar Tooth, Mole and
// Pyramid lines, whose own beta says the protection is unrecorded or disputed.
//
// The stock per-discipline kit (DISC_ASSUMED) already supplies rope, harness, quickdraws,
// helmet, shoes and a nut tool, and mergeGearList folds the two together — so these entries
// carry only what is SPECIFIC to the route. Restating the stock items would re-create the
// duplication that work removed.
//
// --apply to write; dry by default. Every entry is verified traceable to the row's own text
// BEFORE anything is written, and the run aborts if any is not.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

/* Each rack is written from that route's OWN pitch_detail/beta and nothing else. The traceability
   check below re-derives that claim mechanically rather than trusting this comment. */
const RACKS = {
  wa_batskins: [
    "Natural gear for the pitch 1 arch, up to the ledge anchor",
    "Small gear for the pitch 2 crux, which also has 3 bolts",
    "Bolts protect the shallow groove where pitch 1 continues",
  ],
  wa_bobcat_cringe: [
    "Thin gear for the pitch 2 splitter — the crux takes tip jamming",
    "2 bolts and 1 fixed pin protect pitch 2 alongside the crack",
    "2-bolt belay at the top of pitch 1; chains at the top of pitch 2",
  ],
  wa_bowling_to_biscuits: [
    "Gear for the sustained corner jamming on pitch 2, which widens near the top",
    "2 bolts on pitch 1, ending at a 2-bolt chained anchor below the roof",
  ],
  wa_clay: [
    "Small finger-sized cams for pitch 2, alongside its 4 bolts",
    "Two bolts protect the lieback on pitch 1",
  ],
  wa_curious_poses: [
    "Small nuts and cams for the thin tips crux on pitch 1",
    "Gear for the flaring hands above the pitch 2 chimney",
    "Rap-ring anchor at the top",
  ],
  wa_narrow_arrow_overhang: [
    "Small, finicky gear: nuts, offsets, RPs and cams to 1 in",
    "3 bolts on the upper section, including the anchor",
    "2 bolts on the first pitch, to a ledge anchor",
  ],
  wa_sagittarius: [
    "#5 Camalot to protect the traverse left under the roofs on pitch 1",
    "Finger crack into a steep handcrack on pitch 1",
    "Fixed anchor at the top of pitch 1; summit anchor above pitch 2",
  ],
  wa_house_of_the_7th_bobcat: [
    "Gear for the pitch 1 handcrack and the short splitter above it",
    "One bolt on pitch 1; 2 closely spaced bolts at the pitch 2 crux",
    "Chain anchor at both belays",
  ],
  wa_princely_ambitions: [
    "Gear for the pitch 1 flakes and corner, and the pitch 2 dihedral crack",
    "One bolt on the pitch 1 face",
    "Wide gear for the dirty crack finishing pitch 2, at the rap station",
  ],
  wa_freedom_fighter_2: [
    "Gear for the clean layback crack on pitch 1",
    "Offwidth gear if you continue up pitch 2 — that crack is dirty and needs cleanup",
  ],
  wa_technicians_of_the_sacred: [
    "Natural gear for the pitch 6 hand crack — the only unbolted pitch on the route",
    "Pitch 3 is a sparsely bolted low-angle face",
  ],
  wa_starfish_enterprise: [
    "3 bolts on pitch 1, leading to a steep corner crack",
    "Semi-hanging belay at the top of pitch 1",
  ],
  wa_sisu: [
    "Bolted throughout — 16 bolts on pitch 1",
    "Pitches above run 6 to 12 bolts each",
  ],
};

const IDS = Object.keys(RACKS);
const k = anonKey();
const SEL = "id,name,discipline,grade,pitches,gear,detailed_rack,pro_needs,overview,description,beta,pitch_detail";
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();
if (rows.length !== IDS.length) { console.error(`expected ${IDS.length} rows, got ${rows.length} — refusing`); process.exit(1); }

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}

/* ── traceability ───────────────────────────────────────────────────────────────────────────
   Same rule check:enrichment-traceable applies to the climbing_route batches: prose may be
   rewritten freely, but every NUMBER and every load-bearing gear or feature word must already
   appear in the route's own text. Stemming is deliberately aggressive and runs on BOTH sides,
   so "bolts"/"bolted" and "jams"/"jamming" meet — over-stemming is safe when it is symmetric,
   and the alternative is a checker that flags correct work. */
/* Four bugs lived in the first draft of this checker and every one of them flagged CORRECT
   work — the direction that teaches people to ignore a guard, committed by the guard's own
   author. Recorded because each is a different way a text comparison lies:
     1. `leaves()` returns only STRING values, so pitch_detail's `"pitch": 1` never entered the
        source and the word "pitch" plus every pitch number read as invented.
     2. `.` was kept in the token pattern (so "5.10" survives), which left SENTENCE PERIODS
        attached — the source held "belay." and "cams.", so "belay" and "cams" did not match.
     3. `-` was kept too, so the source's "tip-jamming" was one token and "tip" missed.
     4. Generic connectives ("has", "alongside", "both", "first") and the generic word "gear"
        are not specifics at all, and demanding they be quoted is demanding a copy rather than
        a rewrite — the opposite of what re-homing is for.
   Numbers stay strict, because a number is the least forgiving kind of claim: "3 bolts" is
   either what the row says or it is fabrication. `pitch N` is stripped BEFORE that test, since
   a pitch index is structure rather than a protection claim — leaving it in would let any
   small number launder itself through a pitch number. */
const STOP = new Set(["the", "a", "an", "and", "or", "for", "to", "on", "at", "of", "in", "up", "its", "it",
  "that", "this", "with", "from", "above", "below", "near", "top", "also", "which", "only", "if", "you",
  "continue", "run", "each", "leading", "protect", "protects", "sized", "size", "line", "route", "them",
  "gear", "has", "have", "takes", "take", "alongside", "both", "first", "one", "two", "station", "cleanup",
  "needs", "pitch", "pitches", "throughout", "including", "there", "your", "these", "those", "but",
  /* Function words only. Directional words — left, right, upper, lower — stay OUT of this list
     on purpose: "traverse left" is a claim about the route and must be quotable from the row. */
  "where", "when", "while", "then", "as", "by", "not", "any", "all", "into", "after", "before"]);
/* The trailing-e strip is not cosmetic: without it "traverse" and "traverses" never meet, and
   CLAUDE.md already records exactly that bug biting check:enrichment-traceable. Over-stemming is
   safe here because the same function runs on both sides. */
const stem = (w) => w.replace(/(ing|ed|es|s)$/i, "").replace(/e$/i, "").toLowerCase();
/* Hyphens and slashes SPLIT (so "tip-jamming" yields "tip" and "jamming", and "nuts/cams" yields
   both), and a trailing period is dropped while an internal one is kept so "5.10" survives. */
const tokens = (s) => String(s).toLowerCase()
  .replace(/[^a-z0-9#.\/\- ]/g, " ")
  .split(/[\s\/\-]+/)
  .map(t => t.replace(/\.+$/, "").replace(/^\.+/, ""))
  .filter(Boolean);

function untraceable(entry, source) {
  const srcTokens = tokens(source);
  const src = srcTokens.join(" ");
  const srcStems = new Set(srcTokens.map(stem));
  const bad = [];
  // A pitch index is structure, not a claim about protection.
  const cleaned = String(entry).replace(/\bpitch(es)?\s+\d+/gi, " ");
  for (const raw of tokens(cleaned)) {
    if (!raw || STOP.has(raw)) continue;
    if (/^[#]?\d/.test(raw)) { const n = raw.replace(/^#/, ""); if (!srcTokens.includes(n) && !src.includes(n)) bad.push(raw); continue; }
    if (raw.length <= 2) continue;
    if (!srcStems.has(stem(raw))) bad.push(raw);
  }
  return bad;
}

/* ── self-test ──────────────────────────────────────────────────────────────────────────────
   Every entry passing is exactly what a BROKEN checker prints, and this checker had four bugs
   in its first draft — so it proves it can still fail before it is believed. The positive cases
   matter as much as the negative ones: a checker tightened until it rejects everything is no
   more useful than one that accepts everything, and the whole point of re-homing is that the
   prose may be rewritten. Runs on every invocation, not behind a flag. */
{
  const SRC = "Thin ramp then stemming corner with knobs to a testy balance crux high up; 3 bolts plus small gear for crux.";
  const cases = [
    // [entry, mustFail, why]
    ["3 bolts plus small gear at the crux", false, "a faithful rewrite of the source"],
    ["Small gear protects the stemming corner", false, "reworded, every specific present"],
    ["4 bolts plus small gear at the crux", true, "WRONG NUMBER — the row says 3"],
    ["Bring a #4 Camalot for the crux", true, "invented gear the row never mentions"],
    ["Two fixed pins protect the crux", true, "invented protection type"],
    ["Double ropes needed for the rappel", true, "invented, and about a different thing entirely"],
  ];
  let selfBad = 0;
  for (const [entry, mustFail, why] of cases) {
    const failed = untraceable(entry, SRC).length > 0;
    if (failed !== mustFail) { console.log(`  SELFTEST FAIL (${why}): "${entry}" -> ${failed ? "rejected" : "accepted"}, expected ${mustFail ? "rejected" : "accepted"}`); selfBad++; }
  }
  if (selfBad) { console.error(`\nself-test failed ${selfBad}/${cases.length} — the traceability check is not trustworthy, refusing to run.`); process.exit(1); }
  console.log(`self-test ok — the checker rejects wrong numbers and invented gear, and accepts a faithful rewrite (${cases.length} cases)\n`);
}

let failures = 0;
const planned = [];
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  if (leaves(r.gear).length || leaves(r.detailed_rack).length || leaves(r.pro_needs).length) {
    console.log(`SKIP ${r.id}: already carries a rack — refusing to overwrite`); continue;
  }
  const source = [r.overview, r.description, r.beta, ...leaves(r.pitch_detail)].filter(Boolean).join("  ");
  console.log(`\n### ${r.id} — ${r.name}  [${r.discipline} ${r.grade || "-"} ${r.pitches ?? "-"}p]`);
  let clean = true;
  for (const e of RACKS[r.id]) {
    const bad = untraceable(e, source);
    if (bad.length) { console.log(`   UNTRACEABLE  "${e}"\n        not in the row's own text: ${bad.join(", ")}`); clean = false; failures++; }
    else console.log(`   ok  ${e}`);
  }
  if (clean) planned.push({ id: r.id, gear: RACKS[r.id] });
}

console.log();
if (failures) { console.error(`REFUSING TO WRITE — ${failures} entr(ies) name something the route's own text does not. Fix the wording or drop the claim.`); process.exit(1); }
if (!planned.length) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log(`dry run — ${planned.length} route(s) would gain a rack, every entry traceable. Pass --apply to write.`); process.exit(0); }

for (const p of planned) await patchRow("routes", p.id, { gear: p.gear });

const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,gear&id=in.(${planned.map((p) => p.id).join(",")})`, { headers: headers(k) })).json();
let bad = 0;
for (const p of planned) {
  const got = back.find((x) => x.id === p.id);
  if (!got || JSON.stringify(got.gear) !== JSON.stringify(p.gear)) { console.error(`VERIFY FAILED ${p.id}: ${JSON.stringify(got && got.gear)}`); bad++; continue; }
  console.log(`   verified ${p.id}: ${got.gear.length} entries`);
}
if (bad) process.exit(1);
console.log(`\n${planned.length} route(s) given a rack from their own pitch notes, and verified.`);
