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

export function shortGrade(raw) {
  const s = asStr(raw);
  if (!s) return s;
  let cut = -1;
  for (const d of CUTS) { const i = s.indexOf(d); if (i > 0 && (cut < 0 || i < cut)) cut = i; }
  return cut < 0 ? s : s.slice(0, cut).trim();
}

export function gradeDetail(raw) {
  const s = asStr(raw);
  const short = shortGrade(s);
  if (!short || short.length >= s.length) return "";
  let rest = s.slice(short.length).trim().replace(/^[\s,;:—–-]+/, "");
  // Unwrap a remainder that is one whole parenthetical, so the note reads as a
  // sentence rather than "(…)". Anything with more structure is left intact.
  if (rest.startsWith("(") && rest.endsWith(")") && rest.indexOf(")") === rest.length - 1) rest = rest.slice(1, -1).trim();
  if (/^[a-z]/.test(rest)) rest = rest[0].toUpperCase() + rest.slice(1);
  return rest;
}
