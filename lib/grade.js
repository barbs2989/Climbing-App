// Grade strings in the catalog often carry a qualifier along with the grade
// itself — "Class 3 (short 4th-class crux)", "5.11b/c (6c+ French, E4 6a
// British)", "4th class, described by guidebook sources as 'probably low 5th
// to most'". That reads fine in a detail panel but blows out the compact spots
// that only have room for the grade: the route rows on an area page and the
// route page's header pill/stat strip.
//
// shortGrade() keeps just the grade for those spots; gradeDetail() returns the
// qualifier so the route page can show it instead of dropping it.

// First qualifier boundary wins, so "Class 3-4 scrambling with one short,
// exposed step (Wikipedia lists…)" cuts at " scrambl", not at the later comma.
const CUTS = [" (", ",", ";", " scrambl", " with ", " on the ", " at the ", " for the ", " overall", " per ", " described ", " escaping ", " finishing ", " -- ", " — ", " – "];

function asStr(raw) { return typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim(); }

/* `routes.grade_num` is the normalized, sortable grade. Both finder RPCs read it
   (`routes_in_subtree` / `_count`, 0018/0019): they sort `grade_num ... nulls last` and
   filter `grade_num >= min_grade`. A route with a null one therefore sorts behind the whole
   catalog, and would be dropped outright by a range filter.
   #814 built the add-a-route approval path and does not set it, so every community-approved
   route landed with a null. This is the parser that fills it.

   WHY IT LIVES HERE AND NOT IN SQL. The obvious fix is to compute it inside
   `approve_new_route`, which would be a SECOND implementation — and there are already FOUR
   copies of this function in the pipeline (load-state, load-wa-rock-safe, import-alpine,
   oneoff/import-class2-3-routes). A fifth, in a different language, is the drift this
   codebase keeps paying for. So the number is computed here and passed into the RPC, which
   still owns the write because `routes` has no client INSERT/UPDATE policy at all — only
   "routes public read" (0001). Keeping the write in the RPC is deliberate; only the
   arithmetic moved.

   Lifted verbatim from scripts/pipeline/load-state.mjs so an approved route sorts among the
   catalog on the catalog's own scale rather than a near-miss of it — verified against real
   rows by scripts/oneoff/verify-grade-num-parity.mjs, which replays this against every
   populated (grade, discipline, grade_num) triple in WA rather than trusting the copy. */
const AGRADE = { F: 1, PD: 2, AD: 3, D: 4, TD: 5, ED: 6 };
const RGRADE = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

// Discipline -> grading system. The UI twin is `gradeSystemFor` in ClimbMatchCore.jsx; this
// is a copy rather than an import because lib/ must not depend on the app bundle. They must
// agree, and the parity script asserts the RESULT against the live column, which catches a
// divergence here as surely as one in the parser.
export function gradeSystemForDiscipline(disc) {
  if (disc === "bouldering") return "v";
  if (disc === "scrambling" || disc === "mountaineering" || disc === "hiking") return "class";
  if (disc === "trad" || disc === "sport" || disc === "alpine" || disc === "rock") return "yds";
  if (disc === "ice") return "wi";
  if (disc === "mixed") return "m";
  if (disc === "aid") return "aid";
  return null;
}

export function gradeNumFrom(g, s) {
  if (!g) return null;
  let m;
  if (s === "yds" && (m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0);
  if (s === "v" && (m = g.match(/V(\d+)/))) return parseInt(m[1]);
  if (s === "wi" && (m = g.match(/WI(\d+)/i))) return parseInt(m[1]);
  if (s === "m" && (m = g.match(/M(\d+)/))) return parseInt(m[1]);
  if (s === "aid" && (m = g.match(/[AC](\d)/))) return parseInt(m[1]);
  if ((m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0);
  if ((m = g.match(/\b(?:WI|AI)(\d+)/i))) return parseInt(m[1]);
  if ((m = g.match(/\bV(\d+)/))) return parseInt(m[1]);
  if ((m = g.match(/\b(TD|PD|AD|ED)\b/)) || (m = g.match(/^(D|F)[+-]?$/))) return AGRADE[m[1]];
  if ((m = g.match(/class\s*(\d)/i)) || (m = g.match(/(\d)\s*(?:rd|th|nd)?\s*class/i))) return parseInt(m[1]);
  /* A BARE ordinal — "4th", "3rd", "Easy 5th", "low 5th". The branch above requires the word
     "class", so these scored null while the stored column had them right (4, 5, 3): the
     catalog was populated by an importer that handled them and this parser did not. ~40 WA
     rows. Anchored on \b…\b and requiring the ordinal SUFFIX so it cannot swallow a technical
     grade — "5.10a" has no suffix, "V4" has no suffix, and the YDS branches above run first
     regardless, so "Grade III, 5.4" is still 4 rather than 3. */
  if ((m = g.match(/\b(\d)(?:st|nd|rd|th)\b/i))) return parseInt(m[1]);
  if ((m = g.match(/^\s*(VII|VI|IV|III|II|I|V)\b/))) return RGRADE[m[1]];
  return null;
}

/* What the approval path calls: proposal grade + discipline -> the sortable number.

   Do NOT pre-cut this with shortGrade(). That was the first version and the parity script
   caught it: `"Grade III, 5.4"` cuts at the comma to `"Grade III"`, and the roman-numeral
   branch is anchored with `^`, so the actual technical grade is thrown away and the route
   scores null instead of 5.4. The parsers above are written to scan a WHOLE catalog grade
   string and take the most specific thing in it — a commitment grade followed by a technical
   one is the normal shape here, not an exception. Removing the pre-cut moved agreement with
   the live column from 96.92% to 98.09%. shortGrade() is for DISPLAY; this is for sorting.

   The remaining 1.9% (153 of 8,021) is the STORED COLUMN disagreeing with itself, not this
   parser: `"alpine rock"` carries a stored 10 with no grade in the string at all, `"Class
   3-4"` a stored 2, `"Class 2-3"` a stored 2.5 (a midpoint convention none of the four
   importers share), `"V"` and `"III"` both a stored 4. That is what four import paths writing
   one column looks like, and it is why this matches load-state.mjs VERBATIM rather than being
   improved: a fifth dialect is the problem, not the fix.
   STALE UNTIL 2026-08-12, corrected here: this used to record a known gap — that a bare
   ordinal (`"4th"`, `"3rd"`, `"Easy 5th"`) scored null because the ordinal branch required the
   word "class" — and advised fixing it in the pipeline rather than here. That fix HAS since
   landed, in `gradeNumFrom` above, which is the single copy all five callers now share. Those
   three now return 4, 3 and 5. The advice was followed; the comment just outlived it.
   Asserted by `scripts/oneoff/probe-approval-gradenum-wiring.mjs` so it cannot rot back. */
export function gradeNumFor(grade, discipline) {
  const g = typeof grade === "string" ? grade.trim() : grade == null ? "" : String(grade).trim();
  if (!g) return null;
  const n = gradeNumFrom(g, gradeSystemForDiscipline(discipline));
  return Number.isFinite(n) ? n : null;
}

// A grade is a TOKEN, and shortGrade renders into a nowrap pill. It cuts at the qualifier
// delimiters above, but a value containing NONE of them used to pass through at any length —
// unbounded by construction, straight into a value-sized box. Its sibling seasonShort has always
// carried a hard cap; this closes the asymmetry.
//
// 48 is chosen to sit clear of BOTH bounds. Measured across 1,460
// distinct catalog grades with the long shapes deliberately over-sampled
// (scripts/oneoff/measure-grade-head-lengths.mjs), the longest shortGrade output is 34 characters
// — "Class 2 snow climb / non-technical" — and those must NOT be truncated, they are real
// compound grades that fit. And it stays clear of the other end too: check:token-boxes calls a
// box a paragraph past 60 characters, so a cap at 60 would emit 60 + an ellipsis = 61 and the
// capped value would trip the very guard it exists to satisfy. Anything past 48 is prose in the
// wrong column, and gradeDetail renders it in full beside the pill, so nothing is lost. Guard
// the reader, not the data that happens to exist today.
const MAX_GRADE_CHARS = 48;

function gradeHead(s) {
  let cut = -1;
  for (const d of CUTS) { const i = s.indexOf(d); if (i > 0 && (cut < 0 || i < cut)) cut = i; }
  return cut < 0 ? s : s.slice(0, cut).trim();
}

// How much of `head` is actually SHOWN. Split out so gradeDetail can begin the remainder at the
// same index — otherwise a capped grade would drop the characters between the two and the
// shortening would be a loss rather than a move.
function gradeShownLen(head) {
  if (head.length <= MAX_GRADE_CHARS) return head.length;
  const w = head.lastIndexOf(" ", MAX_GRADE_CHARS);
  return w > 20 ? w : MAX_GRADE_CHARS;
}

export function shortGrade(raw) {
  const s = asStr(raw);
  if (!s) return s;
  const head = gradeHead(s);
  const n = gradeShownLen(head);
  return n >= head.length ? head : head.slice(0, n).replace(/[\s,;-]+$/, "") + "\u2026";
}

// A COMMITMENT grade is not a climbing grade, and the CRUX GRADE tile was showing one.
//
// 117 catalog routes store `grade` as a compound string that leads with the commitment grade —
// "Grade IV, 5.9", "Grade II, Class 3-4", "Grade IV-V, AI3+". shortGrade() cuts at the first
// qualifier boundary and keeps the head, which on those rows is "Grade IV". The route page's
// TECHNICAL STATS tile did `shortGrade(route.cruxGrade || route.grade)` and printed that under
// the label "Crux grade" — so Mount Stuart's North Ridge, a 5.9, told a climber its crux was
// "Grade IV", a number about how long the day is. The same panel showed COMMITMENT IV two tiles
// away, and the header pill correctly read 5.9, so one screen stated the route's grade twice and
// disagreed with itself.
//
// The remainder is where the climbing grade went, and gradeDetail() already returns it.
//
// IT TAKES THE VALUE FROM THE SAME STRING, DELIBERATELY. The obvious alternative was the app's
// shared resolver `gradeLabelRaw` (rock_grade -> ice_grade -> alpine_grade -> grade), which is
// what the header uses. Measured over 1,117 routes it is WRONG here: those columns disagree with
// `grade` on many rows — it turns "Grade III, 5.6" into "3rd-4th class" and "Grade III, 5.7" into
// "Class 3-4", and on 4 sampled routes it replaces a good "5.6" with the alpine grade "V",
// putting a commitment grade back on the tile from the other direction. Reading the remainder of
// the string the head came from cannot inherit a disagreement between two columns.
//
// Only reachable when the tile would otherwise show a commitment grade AND NOTHING ELSE, so it
// cannot change a route that already displays a climbing grade. Measured: 112 fixed, 0 regressed.
// `scripts/oneoff/probe-crux-grade-tile.mjs` is that measurement, and it exits 1 on any regression.
/* WIDENED after the column-chain work below found the same defect one surface over: the first
   version of this pattern missed 20 catalog values whose head is just as much a commitment grade —
   a "+"/"-" suffix ("IV+", "III+", "VI-", 15 routes), an "Alpine " prefix ("Alpine IV", the NCCS
   spelling, 3), and an EN-DASH range ("Grade IV–V"), which this catalog writes as often as a
   hyphen. Six routes' crux tile gained a real climbing grade — Goode's Megalodon Ridge showed
   "IV+" against a stored "IV+, 5.10", Eldorado's West Arete "Alpine IV" against
   "Alpine IV, 5.8". Strictly a widening: a value the old pattern matched still matches. */
const COMMITMENT_ONLY = /^(?:Alpine\s+|Grade\s+)?[IVX]+[+-]?(\s*[-–—/]\s*[IVX]+[+-]?)?$/i;
export function cruxGrade(raw) {
  const head = shortGrade(raw);
  if (!COMMITMENT_ONLY.test(head)) return head;
  const rest = gradeDetail(raw);
  // No remainder to promote: keep the head. A blank tile under a label is worse than a wrong one,
  // because it reads as "this route has no crux" rather than as something to go and check.
  return rest ? shortGrade(rest) : head;
}

export function gradeDetail(raw) {
  const s = asStr(raw);
  if (!s) return "";
  // Starts where shortGrade stopped SHOWING, not at the length of what it returned — those
  // differ once a cap applies, because the returned string carries an ellipsis.
  const n = gradeShownLen(gradeHead(s));
  if (n >= s.length) return "";
  let rest = s.slice(n).trim().replace(/^[\s,;:—–-]+/, "");
  // Unwrap a remainder that is one whole parenthetical, so the note reads as a
  // sentence rather than "(…)". Anything with more structure is left intact.
  if (rest.startsWith("(") && rest.endsWith(")") && rest.indexOf(")") === rest.length - 1) rest = rest.slice(1, -1).trim();
  if (/^[a-z]/.test(rest)) rest = rest[0].toUpperCase() + rest.slice(1);
  return rest;
}

// A COMMITMENT GRADE IS NOT A CLIMBING GRADE — and until now it was the headline on 30 routes.
//
// cruxGrade() above fixed that for the TECHNICAL STATS tile, where the cause was a compound
// `grade` string whose head is the commitment grade. The route header pill, the stat strip, the
// sibling rows and every area-list row have the same defect from the other direction: they resolve
// the grade by walking a chain of COLUMNS, and `alpine_grade` sits ahead of `grade` in it. 517
// routes carry an `alpine_grade` and 274 of those hold a bare NCCS roman numeral — which is a
// commitment grade, not a difficulty. On 30 of them no rock or ice grade shadows it, so it is what
// the app displayed:
//
//   Slesse Mountain, NE Buttress    header pill "V"      while `grade` holds "5.9 A2"
//   Mount Alberta, Japanese Route   header pill "V"      while `grade` holds "5.6"
//   Bugaboo Spire, East Ridge       header pill "III"    while `grade` holds "5.7"
//   Eldorado Peak, East Ridge       header pill "Grade II" while `grade` holds "Grade II, Class 3, glacier"
//
// Slesse is the sharpest: the header pill read "V" while the CRUX GRADE tile a few inches below it
// — already fixed by cruxGrade() — read "5.9 A2". One screen stating the route's grade twice and
// disagreeing with itself, which is the sentence cruxGrade's own note opens with.
//
// THE APP'S OWN FORM SAYS A BARE ROMAN NUMERAL IS A COMMITMENT GRADE, so this is not a judgement
// about climbing imported from outside: the contribute sheet offers `commit` as exactly
// ["I","II","III","IV","V","VI"], and `alpineGrade` offers the French difficulty scale
// (F/PD/AD/D/TD/ED) with those same six romans appended. A value drawn from the overlap belongs in
// the commitment box; a French grade is a real difficulty and must keep displaying.
//
// THE TEST IS POSITIVE — does the value carry a CLIMBING grade — never a deny-list of commitment
// spellings. A deny-list is defeated by one more noun, and this catalog has them: "Grade II glacier
// climb", "Grade II-III glacier", "Grade II, moderate snow" are all commitment grades wearing a
// terrain word, and a pattern anchored on the numeral alone misses every one.
//
// IT IS NOT `gradeNumFrom`, DELIBERATELY, and the difference is the whole point. That parser has a
// last-resort branch that scores a bare roman numeral, so a commitment-only route still SORTS among
// the catalog rather than falling behind all of it. That is right for sorting and is exactly the
// case display has to reject. `scripts/oneoff/verify-climbing-grade-vocabulary.mjs` measures the two
// against every distinct grade value in the catalog, so the second list cannot drift into a fifth
// dialect: they may disagree only where the number came from that roman branch.
const CLIMBING_GRADE = [
  /5\.\d/,                                   // YDS
  /\b(?:WI|AI)\d/i,                          // water / alpine ice
  /\bM\d/,                                   // mixed
  /\bV\d/,                                   // bouldering
  /\b[AC][1-5]\b/,                           // aid
  /\b(?:TD|PD|AD|ED)\b/, /^\s*(?:D|F)[+-]?\s*$/, // French alpine difficulty
  /class\s*\d/i, /\d\s*(?:st|nd|rd|th)\s*class/i, // YDS class
  /\b\d(?:st|nd|rd|th)\b/,                   // a bare ordinal: "4th", "Easy 5th"
];
export function carriesClimbingGrade(raw) {
  const s = asStr(raw);
  return !!s && CLIMBING_GRADE.some((re) => re.test(s));
}

/* THE COLUMNS A DISPLAYED GRADE MAY COME FROM, in preference order, both spellings — a raw
   PostgREST row carries snake_case and `dbRouteToCamel` adds the camel aliases beside it, so one
   list serves the area browser and the route page. This is the chain that used to be written out
   THREE times — `gradeLabelRaw` in ClimbMatchCore.jsx, `rowGrade` in lib/DbAreaBrowser.jsx, and a
   third inside `climbRowItem` that only check:grade-parser's new section found. All three agreed
   on all 8,365 WA rows, which is what a hand-copy looks like before it drifts, and all three were
   wrong in the same way. */
const GRADE_SOURCES = ["rockGrade", "rock_grade", "iceGrade", "ice_grade", "alpineGrade", "alpine_grade", "grade", "commitment"];

export function gradeSources(route) {
  if (!route) return [];
  return GRADE_SOURCES.map((k) => route[k]).filter((v) => v != null && String(v).trim() !== "");
}

/* The grade a route SHOWS. Takes the first column that carries a climbing grade; if none does,
   keeps the first column there is, so a route whose record genuinely holds only a commitment grade
   still shows it rather than showing nothing. cruxGrade() then does the string-level half — the
   promotion that turns "Grade II, Class 3, glacier" into "Class 3" — so the two halves of this
   defect are fixed by one expression instead of disagreeing with each other. */
export function displayGrade(route) {
  const cands = gradeSources(route);
  for (const v of cands) if (carriesClimbingGrade(v)) return cruxGrade(v);
  return cands.length ? shortGrade(cands[0]) : "";
}
