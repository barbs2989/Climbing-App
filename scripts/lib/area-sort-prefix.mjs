// THE SORT LABEL a source site puts in front of an area name so its own list sorts in guidebook
// order: "a1. The Uberfall - left", "B: Forgotten Wall", "(3) Snake Wall", "12 - Ruby Wall",
// "* Heart Creek Ice", "** Bouldering at Index", "- Crawford Notch". They were imported verbatim, so
// the Gunks' Trapps listed fifteen walls as "a1." … "l." (owner, 2026-10-07: "We don't want the
// letters before the name of the area"). A label is not part of the place's name.
//
// ONE function decides it, used by BOTH the one-off rename (scripts/oneoff/strip-area-sort-prefixes.mjs)
// and the importer's name matching (scripts/pipeline/import-route-grades.mjs). The source's location
// paths still carry the labels, so an importer comparing them raw against our stripped names would
// miss every renamed area and mint a duplicate beside it.
//
// Deliberately NOT a label: a number that is part of the name ("19 Mile Wall", ".50 Cal Tower",
// "$600 Boulder"), initials ("J. R. Wall"), "A- and B- Side Crack Boulder", "[Redacted] Tank".
// Punctuation markers may stack ("* A. Foo"); the letter/number label comes off ONCE, so
// "g. V3 - Middle Earth" keeps the "V3" that is part of its name.
const MARKERS = [
  /^\*+\s*/,                                    // "* Foo", "**Foo"
  /^Ξ\s+/,                                      // "Ξ 10. Big Red + Clifford"
  /^-+\s*(?=[A-Za-z0-9])/,                      // "- Crawford Notch", "-Camden Hills"
  /^\.\s+/,                                     // ". Western NH"
  /^,\s+/,                                      // ", The Vault"
];
const LABELS = [
  /^[A-Za-z]\d{0,2}[.)]\s+(?![A-Za-z]\.)/,      // "a. ", "a1. ", "A) " — not initials "J. R."
  /^\d{1,3}[a-z]?[.)]\s+/,                      // "1. ", "12a. ", "3) "
  /^\((?:\d{1,3}[a-z]?|[A-Za-z]\d{0,2})\)\s*/,  // "(3) ", "(E) ", "(a) "
  /^\d{1,3}[a-z]?\s*[-–—:]\s+(?=\S)/,           // "12 - ", "3: "
  /^[A-Za-z]\d{0,2}\s*:\s*/,                    // "B: ", "A2: "
  /^[A-Za-z]\d{0,2}\s+[-–—]\s+/,                // "A - " (a space BOTH sides: "A- and B- Side" is a name)
];

// A lone capital and a full stop that BEGIN a name — read, 2026-10-07: every other "E." / "N." in
// the catalog is one step of a lettered series of walls; these three are not.
const NAMES_NOT_LABELS = /^(?:J\. Paul|L\. Ron|N\. Fork)\b/;

export function stripSortPrefix(name) {
  const raw = String(name ?? "");
  const off = (s, res) => { const re = res.find(re => re.test(s) && s.replace(re, "").trim()); return re ? s.replace(re, "") : null; };
  let s = raw.replace(/^\s+/, "");
  for (let n = 0, t; n < 4 && (t = off(s, MARKERS)) != null; n++) s = t;
  if (!NAMES_NOT_LABELS.test(s)) s = off(s, LABELS) ?? s;
  s = s.replace(/\s*\*+$/, "").replace(/\s{2,}/g, " ").trim();   // "*Flagstaff Bouldering*"
  return s || raw.trim();
}
