// A climb's TOPO NUMBER, which a guidebook or the source export puts in front of the name to match its
// photo topo ("(01) Chicken Crack", "36. The Thomas Test", "1) Odin's Raven", "12 - Out West"). The
// number is the book's ordering, not the climb's name, and it reads as part of the name on every screen.
//
// Measured over all 316,017 routes (2026-10-07) before this rule was written:
//   * NUMBER labels are stripped wherever they appear: "(01) ", "01. ", "1) ", "12 - ", "28: ", and a
//     letter in brackets "(a) ". 96% sit in a numbered series on one wall; the stand-alone ones read the
//     same ("45. Deadman's Fingers" in Dead Man's Finger Cave).
//   * a LETTER label ("A. Pendulum", "B) Crescent", "C - Crack with face holds") is stripped ONLY where
//     the climb's area runs a letter SERIES (3+ different letters). Elsewhere a capital and a full stop
//     is a person's initial — "R. Crumb", "T. Rex", "C. W. Hicks Direct", "L. Ron Hubbard's Stack of
//     Rocks" — and 66 of 175 such names are not labels.
//   * NOT labels, kept: "#3 Route" / "#1 Unnamed" (the number IS the name), "23 Karat" / "39 Steps"
//     (951 names: a number then a word), "30 - 06" (a rifle round), "667: Neighbor of the Beast".
// f(f(x)) === f(x): the importer runs it over names this already stripped.

const NUMBER_LABELS = [
  /^\(\s*\d{1,3}[a-z]?\s*\)\s*/,            // (01) Chicken Crack, (7)Rainy Day Cave
  /^\(\s*[A-Za-z]\d{0,2}\s*\)\s*/,          // (a) South Face Left, (A) Feetlips
  /^\d{1,3}[a-z]?\.\s+/,                    // 36. The Thomas Test
  /^\d{1,3}[a-z]?\)\s*/,                    // 1) Odin's Raven
  /^\d{1,3}[a-z]?\s*[-–—:]\s+/,             // 12 - Out West, 28: Boulder Problem Crack, 08- Patte de chat
];
const LETTER_LABELS = [/^[A-Za-z][.)]\s+/, /^[A-Za-z]\s+[-–—]\s+/];
const NOT_LABELS = /^(?:667: Neighbor of the Beast)$/;

const off = (s, res) => { const re = res.find(r => r.test(s)); if (!re) return null; const t = s.replace(re, "").trim(); return t ? t : null; };

/** The climb's name without its topo label. `letterSeries`: the climb's area runs an A, B, C… series. */
export function stripRouteTopoLabel(name, { letterSeries = false } = {}) {
  const raw = String(name ?? ""), s = raw.trim();
  if (NOT_LABELS.test(s)) return s;
  let t = off(s, NUMBER_LABELS);
  if (t == null && letterSeries) t = off(s, LETTER_LABELS);
  // what is left must still be a NAME: "30 - 06" leaves "06", which is not one
  if (t == null || /^[\d\s.\-–—:]*$/.test(t)) return s;
  return t.replace(/\s{2,}/g, " ");
}

/** Area ids whose climbs run a LETTER series (3+ distinct letters in the label shape). */
export function letterSeriesAreas(routes) {
  const letters = new Map();
  for (const r of routes) {
    const m = String(r.name ?? "").trim().match(/^([A-Za-z])(?:[.)]\s+|\s+[-–—]\s+)\S/);
    if (!m) continue;
    (letters.get(r.area_id) || letters.set(r.area_id, new Set()).get(r.area_id)).add(m[1].toUpperCase());
  }
  return new Set([...letters].filter(([, l]) => l.size >= 3).map(([a]) => a));
}
