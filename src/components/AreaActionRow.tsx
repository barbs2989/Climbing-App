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
// of objectives ... clickable in a nice aligned one row"). Route finder · ★ Objectives · Map: THREE EQUAL buttons,
// one third of the row each, 48px tall, all in the solid blue (owner, 2026-11-18: "map button is small compared to
// route finder and objectives. Make all those buttons the same size ... make all 3 of those buttons stand out more";
// Map used to be content-width, and it and Objectives were grey outlines). On the website the finder chip opens the inline form under the row rather than leaving the page.
// Mountain Project keeps a ~300px Route Finder form always open on its area pages; here it is one tap away.
export default function AreaActionRow({ C, routeCount, onFinder, inlineDiscs, myGrades, onFindInline, objectivesHere, onObjectives, onNear, first }: AreaActionRowProps) {
  const [inlineOpen, setInlineOpen] = useState(false);
  const inline = !!(inlineDiscs && inlineDiscs.length && onFindInline);
  const chip = { position: "relative" as const, boxSizing: "border-box" as const, flex: "1 1 0", minWidth: 0, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, alignContent: "center", gap: "0 5px", padding: "4px 5px", borderRadius: 11, border: "1px solid " + C.blue, background: C.blueSolid, color: C.onSolid, fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, textAlign: "center" as const, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" };
  const objLabel = objectivesHere == null ? "Objectives" : objectivesHere + " objective" + (objectivesHere !== 1 ? "s" : "") + " here";
  // Three buttons share a ~330px column on the website and ~115px each on a phone, so the word stays short and the
  // count is a badge on the button's CORNER, where it costs the label no width.
  return <div style={{ padding: "12px 14px", borderTop: first ? "none" : "1px solid " + C.border }}>
    <div role="group" aria-label="Find climbs here" style={{ display: "flex", gap: 8 }}>
      {routeCount > 0 ? <button onClick={() => (inline ? setInlineOpen(o => !o) : onFinder())} aria-expanded={inline ? inlineOpen : undefined} style={{ ...chip, minHeight: 48 }}>
        <span>{"Route finder"}</span>
        {inline ? <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron open={inlineOpen} size={13} color={"currentColor"} /></span> : null}
      </button> : null}
      <button onClick={onObjectives} aria-label={objectivesHere == null ? "My objectives in this area" : objLabel + " — open them"} style={chip}>
        <span aria-hidden="true" style={{ flexShrink: 0 }}>{"★"}</span>
        <span>{"Objectives"}</span>
        {objectivesHere ? <span aria-hidden="true" style={{ position: "absolute", top: -7, right: -5, boxSizing: "border-box", minWidth: 20, padding: "1px 6px", borderRadius: 10, background: C.amber, color: "#1a1200", border: "2px solid " + C.surface, fontSize: 11, fontWeight: 800, lineHeight: "16px", textAlign: "center" }}>{objectivesHere}</span> : null}
      </button>
      <button onClick={onNear} style={chip}>{"Map"}</button>
    </div>
    {inline && inlineOpen && inlineDiscs && onFindInline ? <div style={{ marginTop: 10 }}><RouteFinderInline discs={inlineDiscs} myGrades={myGrades ?? null} onFind={onFindInline} C={C} /></div> : null}
  </div>;
}
