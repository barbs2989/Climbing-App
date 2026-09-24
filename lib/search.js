// HOW A TYPED NAME IS MATCHED — the JS half of migration 0189.
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
export const SEARCH_FORMS = {
  mount: ["mt"], mountain: ["mtn"], mountains: ["mtns"], saint: ["st"], peak: ["pk"],
  northeast: ["ne"], northwest: ["nw"], southeast: ["se"], southwest: ["sw"],
  north: ["n"], south: ["s"], east: ["e"], west: ["w"],
};
// Single-letter compass points map one way only: "n" already occurs inside "north".
const ONE_WAY = new Set(["north", "south", "east", "west"]);

const FORMS_OF = (() => {
  const m = new Map();
  for (const [canon, aliases] of Object.entries(SEARCH_FORMS)) {
    const all = [canon, ...aliases].join(" ");
    if (!ONE_WAY.has(canon)) m.set(canon, all);
    for (const a of aliases) m.set(a, all);
  }
  return m;
})();
const formsOf = (w) => FORMS_OF.get(w) || w;

const ACCENT_FROM = "áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ";
const ACCENT_TO = "aaaaaaaeeeeeiiiiiooooooouuuuuncyy";

export function searchClean(s) {
  let t = String(s == null ? "" : s).toLowerCase();
  let out = "";
  for (const ch of t) { const i = ACCENT_FROM.indexOf(ch); out += i >= 0 ? ACCENT_TO[i] : ch; }
  return out.replace(/&/g, " and ").replace(/['’‘`´]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
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
