// Per-field confidence on the route page (0307–0309): the level a climber SEES, and the one
// control that is always available — flag it.
//
//   ConfidenceCtx  — provided by App around RouteDetail: { levels: {formKey: "high"|"medium"|"low"},
//                    routeId, onFlag(formKey, label) }. Null everywhere else, so the heading
//                    components in core render nothing extra outside a route page.
//   HEAD_KEYS      — section heading text → the contribute-form key whose level the heading shows.
//                    The headings come from many components (SL, CardHead, Capped titles), so the
//                    map is by TEXT, which is the one thing they share.
//   ConfChip       — the level, and a ⚑ Flag button. High = "locked": the edit pencil for that
//                    field opens the flag sheet instead of the editor (openFix in RouteDetail).
//
// The wording is deliberately about how SURE the page is, never where a value came from:
// check:no-sources forbids source / provenance / attribution on screen, and the earlier
// per-section origin pill was removed on purpose (docs/guards/route-page.md).
import { createContext } from "react";
import { C } from "../ClimbMatchCore.jsx";

/** @type {import("react").Context<{ levels?: Record<string, string>, routeId?: unknown, onFlag?: ((key: string, label: unknown) => void) | null } | null>} */
export const ConfidenceCtx = createContext(null);

export const HEAD_KEYS = {
  "BETA": "beta", "PRO TIPS": "beta", "CLIMBER BETA": "beta",
  "KNOWN HAZARDS": "haz", "SEASONAL HAZARDS": "seasonalHazards",
  "GEAR & ESSENTIALS": "whatToBring", "RACK": "rack", "PADS": "pads", "ROPEWORK": "ropeNote",
  "ACCESS & REGULATIONS": "access", "ROAD CONDITIONS": "road", "GETTING THERE": "road",
  "TRAILHEAD": "approachLogistics", "APPROACH": "approach", "WALK-IN": "approach",
  "DESCENT": "descentText", "RAPPELS": "rap",
  "ROUTE BREAKDOWN": "pitchDetail", "CLIMBING ROUTE": "climbingRoute",
  "CLIMATE & SEASON": "climate", "ASPECT & SUN": "aspect",
  "SEASONAL GUIDANCE": "seasonalGuidance", "CROWDS": "crowds", "CROWDS & SOLITUDE": "crowds",
  "PARTNER REQUIREMENTS": "partnerRequirements", "EMERGENCY & RESCUE": "emergency",
  "TECHNICAL STATS": "grade", "ROUTE FACTS": "grade",
  "CAMPING & BIVY": "bivy", "WAYPOINTS": "waypoints", "KEY WAYPOINTS": "waypoints",
  "CELL / SAT COVERAGE": "comms", "CELL COVERAGE": "comms",
  "ROUTE DESCRIPTION": "overview", "MY ITINERARY": "itinerary", "TRIP PLAN": "itinerary",
  "WAYS IN": "approachVariants",
};
// Heading text as rendered → key, tolerant of a trailing count ("CLIMBING ROUTE · 4 sections").
export function headKey(text) {
  if (typeof text !== "string") return null;
  const t = text.replace(/\s*[·—-]\s*\d.*$/, "").trim().toUpperCase().replace(/&AMP;/g, "&");
  return HEAD_KEYS[t] || null;
}
export const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" };
const LEVEL_HELP = {
  high: "High confidence — checked and locked. If it has changed, flag it.",
  medium: "Medium confidence — on file, not yet checked by a climber or ClimbMatch. You can suggest an edit.",
  low: "Low confidence — missing, inferred, or flagged. Please add or correct what you know.",
};
export function levelColors(level) {
  return level === "high" ? [C.green, C.greenBg, C.greenDim] : level === "medium" ? [C.amber, C.amberBg, C.amber + "66"] : [C.textMuted, C.surface, C.border];
}

export function ConfChip({ level, label, onFlag, compact }) {
  if (!level) return null;
  const [col, bg, bd] = levelColors(level);
  const name = (label || "this detail").toString().replace(/\s+/g, " ").trim();
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: compact ? 4 : 6 }}>
    <span title={LEVEL_HELP[level]} aria-label={name + ": " + LEVEL_LABEL[level] + " confidence" + (level === "high" ? ", locked" : "")} style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: col, background: bg, border: "1px solid " + bd, borderRadius: 6, padding: "1px 6px", lineHeight: 1.6, whiteSpace: "nowrap" }}>{LEVEL_LABEL[level] + (level === "high" ? " · locked" : "")}</span>
    {onFlag ? <button onClick={function (e) { e.stopPropagation(); onFlag(); }} title={"Flag " + name + " as wrong"} aria-label={"Flag " + name + " as wrong"} style={{ background: "transparent", border: "1px solid " + C.border, color: C.textSub, borderRadius: 6, fontSize: 11, lineHeight: 1.4, padding: "1px 6px", cursor: "pointer", whiteSpace: "nowrap" }}>{"Flag"}</button> : null}
  </span>;
}

// One line under the route's first section explaining the three levels, shown once per page.
export function ConfidenceLegend() {
  return <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, margin: "0 0 10px", padding: "7px 10px", background: C.surface, border: "1px solid " + C.border, borderRadius: 9 }}>
    {"Every detail on this page carries a confidence level. "}<b style={{ color: C.green }}>High</b>{" is checked and locked — flag it if it has changed. "}<b style={{ color: C.amber }}>Medium</b>{" is on file and open to your edits. "}<b style={{ color: C.textSub }}>Low</b>{" is missing, inferred or flagged — your edit is most welcome there. Adding to an empty detail puts it on the page at once; a change goes live when a second climber sends the same, or once ClimbMatch checks it."}
  </div>;
}
