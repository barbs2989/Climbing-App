// Enrichment data display components
// Used on route detail page, Details and Safety tabs
import { monthRank, seasonWindowMonths } from "./lib/seasonWindow.js";
import PeakMetadataPanel from "./src/components/PeakMetadataPanel.tsx";
import SeasonalGuidancePanel from "./src/components/SeasonalGuidancePanel.tsx";
import CrowdsPanel from "./src/components/CrowdsPanel.tsx";
import PartnerRequirementsPanel from "./src/components/PartnerRequirementsPanel.tsx";
export { PartnerRequirementsPanel };
export { CrowdsPanel };
export { SeasonalGuidancePanel };
export { PeakMetadataPanel };
export { monthRank, seasonWindowMonths };


// Long hand-written/generated blurbs (peak geology blurbs, approach/descent narrative, etc.)
// are stored as one dense paragraph. Break them into readable paragraphs on 2-4 sentence
// boundaries rather than rendering a single unbroken wall of text.
// Groups prose into paragraphs of 2-3 sentences. Splitting must never lose text.
//
// The previous implementation collected sentences with
// /[^.!?]+[.!?]+(?:\s+|$)/g and built the result only from what matched, so any
// span the scanner skipped was silently discarded. That trailing (?:\s+|$)
// requires whitespace after the period, and a decimal point is a period followed
// by a digit — "5.9", "1.2 miles", "#0.5". Climbing copy is full of them, so the
// scanner re-anchored past the decimal and every character before it vanished:
// a 139-char description rendered as "9s in Washington.", and one route's
// approach directions lost the sentence naming the parking spots it then told
// you to walk between.
//
// So: split AFTER a terminator only when whitespace and a new sentence follow,
// which a decimal never satisfies. An abbreviation ("Mt. Rainier") can still
// split in the wrong place, but that only regroups paragraphs — it cannot drop
// text, which is the failure that matters.
export function splitParagraphs(text) {
  if (!text) return [];
  const src = String(text);
  const MARK = "\u0001";
  const sentences = src
    .replace(/([.!?]+["'”’)\]]*)(\s+)(?=[A-Z0-9"'“‘(\[])/g, "$1$2" + MARK)
    .split(MARK);
  // Belt and braces against this whole bug class: if the pieces no longer
  // reconstruct the input, keep the text whole rather than ship a truncation.
  if (sentences.join("") !== src) return [src.trim()].filter(Boolean);
  const perPara = sentences.length > 6 ? 3 : 2;
  const paras = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paras.push(sentences.slice(i, i + perPara).join("").trim());
  }
  return paras.filter(Boolean);
}


// DataQualityPanel (the DATA QUALITY box) was removed along with DATA CONFIDENCE: both
// reported how complete a route's data was, at the top of Overview, and per-section
// GapNotes now say it where it is actionable. That leaves the `data_quality` column with
// no reader on purpose — recorded in check:field-renders' KNOWN map, not left to be
// rediscovered as a bug.
