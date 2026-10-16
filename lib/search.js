// HOW A TYPED NAME IS MATCHED — the JS half of migration 0190.
//
// Climbers do not type names the way the catalog spells them: "mt baker" for "Mount Baker",
// "bobs wall" for "Bob's Wall", "ne face" for "Northeast Face", "baker mt" in either order.
// Every DB-backed search used to require the typed string verbatim as one substring, so
// whichever spelling the climber picked, the other half of the catalog was invisible.
//
// The rule, identical here and in SQL:
//   clean(s)   lowercase, fold accents, drop apostrophes, other punctuation -> one space
//   norm(name) every word of clean(name) replaced by ALL its spellings (SEARCH_FORMS)
//   canon(s)   every word replaced by its CANONICAL spelling — used only for ranking
//   match      every word of clean(query) occurs somewhere in norm(name)
//
// The NAME carries every spelling rather than the QUERY being rewritten, so a half-typed word
// keeps working: "mount st" reaches Mount Stuart ("st" is inside "stuart") and Mount St. Helens
// ("st" is one of its forms). Rewriting the query (st -> saint) loses Stuart mid-word.
//
// SEARCH_FORMS MUST EQUAL `search_forms()` in the newest migration that defines it.
// `npm run check:search-norm` reads both and fails the build if they differ: the global route
// search tokenises here and filters `name_search` (built by SQL), so a spelling added on one
// side only would match in one box and not the next.

// canonical -> aliases. Canonical is what ranking compares; all forms are what matching sees.
// 0201 widened it from the place words to every abbreviation route names were MEASURED to use
// (whole-word counts over 205k names, 2026-09-24): "Direct" 1,712 / "Dir"; "Variation" 724 /
// "Var"; "Left" 2,674; "1st" 48 / "First" 462; "Dr" 146; "Gulley" 14 misspelling "Gully"; etc.
// Left OUT on purpose: single letters L/R/I/V/X (a letter is a name, a grade or a numeral before
// it is an abbreviation), "tr" (top rope, not trail), "ft" (feet as often as fort), "no" (the
// word no before it is "number"), "sec" (second or section), "cr" (crack or creek).
export const SEARCH_FORMS = {
  mount: ["mt"], mountain: ["mtn"], mountains: ["mtns"], saint: ["st"], peak: ["pk"],
  northeast: ["ne"], northwest: ["nw"], southeast: ["se"], southwest: ["sw"],
  north: ["n"], south: ["s"], east: ["e"], west: ["w"],
  ridge: ["rdg"], glacier: ["glac", "gl"], creek: ["crk", "ck"], lake: ["lk"], canyon: ["cyn"],
  fork: ["fk"], point: ["pt"], road: ["rd"], highway: ["hwy"], trail: ["trl"], avenue: ["ave"],
  boulder: ["bldr"], tower: ["twr"], gully: ["gulley"], couloir: ["coulior"],
  direct: ["dir"], variation: ["var"], route: ["rte"], extension: ["ext"], alternate: ["alt"],
  original: ["orig"], section: ["sect"],
  left: ["lt"], right: ["rt"], upper: ["upr"], lower: ["lwr"], middle: ["mid"], center: ["ctr", "centre"],
  first: ["1st"], second: ["2nd"], third: ["3rd"], fourth: ["4th"], fifth: ["5th"],
  doctor: ["dr"], mister: ["mr"], junior: ["jr"], senior: ["sr"],
  one: ["1"], two: ["2"], three: ["3"], four: ["4"], five: ["5"],
  six: ["6"], seven: ["7"], eight: ["8"], nine: ["9"], ten: ["10"],
};
// Single-letter compass points map one way only: "n" already occurs inside "north".
const ONE_WAY = new Set(["north", "south", "east", "west"]);
// Three-letter compass points expand one way into the two directions they sit between, so
// "north ridge" and "northeast ridge" both reach an "NNE Ridge". Never the reverse: a North
// Ridge is not an NNE one.
export const SEARCH_COMPOUND = {
  nne: "nne north northeast ne", nnw: "nnw north northwest nw", ene: "ene east northeast ne",
  ese: "ese east southeast se", sse: "sse south southeast se", ssw: "ssw south southwest sw",
  wnw: "wnw west northwest nw", wsw: "wsw west southwest sw",
};

const FORMS_OF = (() => {
  const m = new Map();
  for (const [canon, aliases] of Object.entries(SEARCH_FORMS)) {
    const all = [canon, ...aliases].join(" ");
    if (!ONE_WAY.has(canon)) m.set(canon, all);
    for (const a of aliases) m.set(a, all);
  }
  for (const [w, all] of Object.entries(SEARCH_COMPOUND)) m.set(w, all);
  return m;
})();
const formsOf = (w) => FORMS_OF.get(w) || w;

const ACCENT_FROM = "áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ";
const ACCENT_TO = "aaaaaaaeeeeeiiiiiooooooouuuuuncyy";

export function searchClean(s) {
  let t = String(s == null ? "" : s).toLowerCase();
  let out = "";
  for (const ch of t) { const i = ACCENT_FROM.indexOf(ch); out += i >= 0 ? ACCENT_TO[i] : ch; }
  out = out.replace(/&/g, " and ").replace(/['’‘`´]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  // A direction written in two parts is one word: "South East Ridge", "North-East Gully" (83
  // names), "N.E. Face", "(S E Side)". Letters join only as a PAIR — "N.E.R.F." and
  // "S.W.A.W. Crack" are acronyms, and the next single letter is what says so.
  return out.replace(/(^| )(north|south) (east|west)(?= |$)/g, "$1$2$3")
    .replace(/(^| )([ns]) ([ew])(?= [a-z0-9]{2}| *$)/g, "$1$2$3");
}
const words = (s) => searchClean(s).split(" ").filter(Boolean);
export const searchNorm = (s) => words(s).map(formsOf).join(" ");
export const searchCanon = (s) => words(s).map((w) => formsOf(w).split(" ")[0]).join(" ");
// The words a query must contain. [a-z0-9] only, so safe inside a LIKE/ilike pattern unescaped.
export const searchTokens = (q) => words(q);

// Does `name` match `q`? `normName` may be passed when the caller already holds name_search.
export function searchMatches(q, name, normName) {
  const toks = searchTokens(q);
  if (!toks.length) return true;
  const hay = normName != null ? String(normName) : searchNorm(name);
  return toks.every((t) => hay.includes(t));
}

// Strip one leading honorific from a CANONICAL string, the way areas_in_subtree's `bare` does.
export const searchBare = (canon) => String(canon || "").replace(/^(mount|the) /, "");
