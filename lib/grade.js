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
