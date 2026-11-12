import { useState } from "react";
import RouteFinderInline from "./RouteFinderInline.tsx";
import type { RouteFinderInlineProps } from "./RouteFinderInline.tsx";
import Chevron from "./Chevron.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface AreaActionRowProps {
  C: typeof Palette;
  /** Climbs under this area; with none there is nothing to find, so the finder chip is not drawn. */
  routeCount: number;
  /** Opens the Route finder screen (no preset). */
  onFinder: () => void;
  /** Website: the discipline list for the inline form; empty = the chip opens the finder screen instead. */
  inlineDiscs?: string[];
  myGrades?: RouteFinderInlineProps["myGrades"];
  onFindInline?: RouteFinderInlineProps["onFind"];
  /** How many of the climber's objectives are inside this area; null while unknown or signed out. */
  objectivesHere: number | null;
  onObjectives: () => void;
  onNear: () => void;
  /** Phone only: section padding/rule come from the sheet; first = no top rule. */
  first?: boolean;
}

// ONE aligned row under the description (owner, 2026-11-11: "a route finder box right below that with the number
// of objectives ... clickable in a nice aligned one row"). Route finder · ★ N objectives here · Map, equal height
// and equal width. On the website the finder chip opens the inline form under the row rather than leaving the page.
// Mountain Project keeps a ~300px Route Finder form always open on its area pages; here it is one tap away.
export default function AreaActionRow({ C, routeCount, onFinder, inlineDiscs, myGrades, onFindInline, objectivesHere, onObjectives, onNear, first }: AreaActionRowProps) {
  const [inlineOpen, setInlineOpen] = useState(false);
  const inline = !!(inlineDiscs && inlineDiscs.length && onFindInline);
  const chip = (on: boolean) => ({ flex: "1 1 0", minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 6px", borderRadius: 10, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const, overflow: "hidden" });
  const objLabel = objectivesHere == null ? "Objectives" : objectivesHere + " objective" + (objectivesHere !== 1 ? "s" : "") + " here";
  // Three chips share a ~330px column on the website, so the word stays short and the count is a badge.
  return <div style={{ padding: "12px 14px", borderTop: first ? "none" : "1px solid " + C.border }}>
    <div role="group" aria-label="Find climbs here" style={{ display: "flex", gap: 8 }}>
      {routeCount > 0 ? <button onClick={() => (inline ? setInlineOpen(o => !o) : onFinder())} aria-expanded={inline ? inlineOpen : undefined} style={{ ...chip(true), minHeight: 44 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{"Route finder"}</span>
        {inline ? <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron open={inlineOpen} size={13} color={"currentColor"} /></span> : null}
      </button> : null}
      <button onClick={onObjectives} aria-label={objectivesHere == null ? "My objectives in this area" : objLabel + " — open them"} style={chip(false)}>
        <span aria-hidden="true" style={{ color: C.amber, flexShrink: 0 }}>{"★"}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{"Objectives"}</span>
        {objectivesHere ? <span aria-hidden="true" style={{ flexShrink: 0, minWidth: 18, padding: "1px 6px", borderRadius: 9, background: C.amber, color: "#1a1200", fontSize: 11, fontWeight: 800, lineHeight: "16px", textAlign: "center" }}>{objectivesHere}</span> : null}
      </button>
      <button onClick={onNear} style={{ ...chip(false), flex: "0.7 1 0" }}>{"Map"}</button>
    </div>
    {inline && inlineOpen && inlineDiscs && onFindInline ? <div style={{ marginTop: 10 }}><RouteFinderInline discs={inlineDiscs} myGrades={myGrades ?? null} onFind={onFindInline} C={C} /></div> : null}
  </div>;
}
