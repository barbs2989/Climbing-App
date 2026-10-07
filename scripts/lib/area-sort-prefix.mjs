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

// A letter that BEGINS a name — read, and the doubtful ones researched, 2026-10-07. Every other
// lone "E." / "N." / "Y - " in the catalog is one step of a lettered series of walls; these are not:
// J. Paul / L. Ron are people, N. Fork is North Fork, "Y - North Side" is a side of the crag called
// The Y (Los Alamos). "N. Red-Yellow" (Case Mountain) and "B. School" (St-Alban) could not be settled
// either way, so they keep what they have rather than lose a letter that may be their name.
const NAMES_NOT_LABELS = /^(?:J\. Paul|L\. Ron|N\. Fork|N\. Red-Yellow|B\. School|Y - (?:North|South) Side)\b/;
// ...and where the letter IS the name but the dash is the export's: Bowman Valley's "B Word" wall,
// Horse Flats' "Y Crack Boulder" (a Y-shaped crack) and "A Boulder" (beside "B1 Boulder", "X4 Boulder").
const LETTER_IS_NAME = /^([A-Z]) [-–—] (?=(?:Word|Boulder|Crack Boulder)\b)/;

export function stripSortPrefix(name) {
  const raw = String(name ?? "");
  const off = (s, res) => { const re = res.find(re => re.test(s) && s.replace(re, "").trim()); return re ? s.replace(re, "") : null; };
  let s = raw.replace(/^\s+/, "");
  for (let n = 0, t; n < 4 && (t = off(s, MARKERS)) != null; n++) s = t;
  if (LETTER_IS_NAME.test(s)) s = s.replace(LETTER_IS_NAME, "$1 ");
  else if (!NAMES_NOT_LABELS.test(s)) s = off(s, LABELS) ?? s;
  // A trailing "*" closes a leading one ("*Flagstaff Bouldering*") or stands alone ("Micro*"); one
  // that closes a starred phrase INSIDE the name ("**AREA CLOSED**", "*Lower Falls*") is kept.
  const bare = s.replace(/\s*\*+$/, "");
  if (!bare.includes("*")) s = bare;
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || raw.trim();
}
