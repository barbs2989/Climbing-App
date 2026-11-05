// TYPED SEARCH (competitor review item 12, owner 2026-11-04): a climber who types "5.9 trad near
// Leavenworth" or "WI4" into the website's header search is describing a FILTER, not naming a
// climb, and the plain name search finds nothing for it. This reads the grade, the discipline(s)
// and the place out of the words, so WideSearch can offer "open the Route finder with these
// filters" as the first row. The parse is on purpose conservative: a word is a discipline only
// when it is one of the spellings below, and a token is a grade only when lib/grade.js's own
// parser — the ONE grade parser (check:grade-parser) — reads a number from it. Everything else
// is the place.
//
// Imports nothing from the app bundle: lib/grade.js and lib/discLabels.js carry no React.
import { gradeNumFrom } from "./grade.js";
import { DISC_LABELS } from "./discLabels.js";

// Every spelling a climber might type for a discipline the finder offers. Hiking is not a finder
// discipline, so "hike" is a plain word here. The finder's own labels (DISC_LABELS) are included
// so the two cannot disagree on the canonical spellings; the rest are the short forms people type.
const DISC_WORDS = (() => {
  const m = {};
  for (const k of Object.keys(DISC_LABELS)) if (k !== "hiking") m[DISC_LABELS[k].toLowerCase()] = k;
  Object.assign(m, {
    toprope: "toprope", "top-rope": "toprope", tr: "toprope",
    boulder: "bouldering", boulders: "bouldering", bouldering: "bouldering",
    scramble: "scrambling", scrambles: "scrambling",
    mountaineer: "mountaineering", mtn: "mountaineering",
    "ice-climbing": "ice", "mixed-climbing": "mixed",
  });
  return m;
})();

// Finder scales each discipline offers (mirrors DISC_GRADE_SCALES in RouteFinderPanel.tsx; a grade
// on a scale the typed discipline does not offer is dropped rather than mis-filed).
const DISC_SCALES = { sport: ["yds"], trad: ["yds"], toprope: ["yds"], bouldering: ["v"], scrambling: ["class", "yds"], mountaineering: ["class", "yds", "wi"], alpine: ["yds", "class", "wi"], aid: ["aid", "yds"], mixed: ["m", "yds"], ice: ["wi", "yds"] };
// With no discipline typed, a grade implies the disciplines graded on its scale.
const SCALE_DISCS = { yds: ["sport", "trad", "toprope"], v: ["bouldering"], wi: ["ice"], m: ["mixed"], aid: ["aid"], class: ["scrambling"] };

// One grade token -> { sys, lo, hi } in the finder's own option labels (GRADE_SCALES there):
// "5.10a", "V4", "WI4", "M6", "A2/C2", "Class 3". A bare "5.10" is the whole band 5.10a–5.10d;
// "5.10+" is c–d and "5.10-" is a–b. Returns null for a token lib/grade.js cannot read.
function gradeToken(t) {
  let m;
  if ((m = t.match(/^5\.(\d{1,2})([a-d])?([+-])?$/i))) {
    const b = parseInt(m[1], 10);
    if (gradeNumFrom(t, "yds") == null) return null;
    if (b < 10) return { sys: "yds", lo: "5." + b, hi: "5." + b };
    if (b > 15) return null;
    const L = m[2] ? m[2].toLowerCase() : null;
    if (L) return { sys: "yds", lo: "5." + b + L, hi: "5." + b + L };
    if (m[3] === "+") return { sys: "yds", lo: "5." + b + "c", hi: "5." + b + "d" };
    if (m[3] === "-") return { sys: "yds", lo: "5." + b + "a", hi: "5." + b + "b" };
    return { sys: "yds", lo: "5." + b + "a", hi: "5." + b + "d" };
  }
  if ((m = t.match(/^v(b|\d{1,2})$/i))) { const l = "V" + m[1].toUpperCase(); if (gradeNumFrom(l, "v") == null) return null; if (m[1] !== "B" && m[1] !== "b" && parseInt(m[1], 10) > 17) return null; return { sys: "v", lo: l, hi: l }; }
  if ((m = t.match(/^wi(\d)$/i))) { const l = "WI" + m[1]; if (gradeNumFrom(l, "wi") == null || +m[1] < 1 || +m[1] > 7) return null; return { sys: "wi", lo: l, hi: l }; }
  if ((m = t.match(/^m(\d{1,2})$/i))) { const l = "M" + m[1]; if (gradeNumFrom(l, "m") == null || +m[1] < 1 || +m[1] > 14) return null; return { sys: "m", lo: l, hi: l }; }
  if ((m = t.match(/^[ac](\d)$/i))) { if (gradeNumFrom(t.toUpperCase(), "aid") == null || +m[1] > 5) return null; return { sys: "aid", lo: "A" + m[1] + "/C" + m[1], hi: "A" + m[1] + "/C" + m[1] }; }
  return null;
}

/**
 * @param {string} q the words typed
 * @returns {{ discs: string[], gSys: string, gLo: string, gHi: string, place: string, label: string } | null}
 *   null when the words name neither a grade nor a discipline (then they are a plain name search).
 */
export function parseTypedSearch(q) {
  const raw = String(q || "").trim();
  if (!raw) return null;
  // "class 3" / "3rd class" are two words; fold them into one token first.
  const text = raw.replace(/\bclass\s+(\d)\b/gi, "class$1").replace(/\b(\d)(?:st|nd|rd|th)\s+class\b/gi, "class$1").replace(/\btop\s+rope\b/gi, "toprope");
  const words = text.split(/\s+/).filter(Boolean);
  const discs = [], rest = [];
  let lo = null, hi = null, sys = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[,;]+$/, "");
    const d = DISC_WORDS[w.toLowerCase()];
    if (d) { if (!discs.includes(d)) discs.push(d); continue; }
    let g = null, m;
    if ((m = w.match(/^class(\d)$/i))) { const l = "Class " + m[1]; g = gradeNumFrom(l, "class") != null && +m[1] >= 1 && +m[1] <= 5 ? { sys: "class", lo: l, hi: l } : null; }
    else if ((m = w.match(/^([^-–]+)[-–]([^-–]+)$/)) && gradeToken(m[1]) && gradeToken(m[2])) { const a = gradeToken(m[1]), b = gradeToken(m[2]); if (a.sys === b.sys) g = { sys: a.sys, lo: a.lo, hi: b.hi }; }
    else g = gradeToken(w);
    if (g && (!sys || sys === g.sys)) {
      // "5.9 to 5.11a" / "5.9 - 5.11a": the next grade on the same scale closes a range.
      sys = g.sys;
      if (lo == null) { lo = g.lo; hi = g.hi; }
      else hi = g.hi;
      if (words[i + 1] && /^(to|-|–|through)$/i.test(words[i + 1])) { const n = words[i + 2] && gradeToken(words[i + 2].replace(/[,;]+$/, "")); if (n && n.sys === sys) { hi = n.hi; i += 2; } }
      continue;
    }
    rest.push(w);
  }
  if (!discs.length && !sys) return null;
  // The grade must be on a scale every typed discipline offers, else it is dropped.
  let gSys = "", gLo = "", gHi = "";
  if (sys) {
    const ok = discs.length ? discs.every(d => (DISC_SCALES[d] || []).includes(sys)) : true;
    if (ok) { gSys = sys; gLo = lo; gHi = hi; if (!discs.length) discs.push(...SCALE_DISCS[sys]); }
  }
  if (!discs.length) return null;
  // The place: what is left once the linking words go. "near", "in", "at", "around", "by" and
  // "climbs"/"routes"/"climbing" are not a place's name.
  const place = rest.filter(w => !/^(near|in|at|around|by|climbs?|routes?|climbing|problems?|the)$/i.test(w)).join(" ").trim();
  const gradeText = gLo ? (gLo === gHi ? gLo : gLo + "–" + gHi) : "";
  const discText = discs.length === 3 && gSys === "yds" && !discs.some(d => !SCALE_DISCS.yds.includes(d)) ? "" : discs.map(d => DISC_LABELS[d]).join(", ");
  const label = [discText, gradeText].filter(Boolean).join(" ") || "Climbs";
  return { discs, gSys, gLo, gHi, place, label };
}
