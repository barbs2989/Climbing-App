import type { CSSProperties, MouseEvent } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface ShareExportRowProps {
  /** Opens the share sheet (or copies the link). */
  onShare: () => void;
  /** Saves the sheet as a PDF. */
  onPdf: () => void;
  /** What is being shared, for the buttons' accessible names ("Share <label>", "Save <label> as a PDF"). */
  label: string;
}

/** The two-button row under a list or itinerary: Share…, and Save as PDF. Clicks stop at the row so a tappable card behind it does not open. Reads `C` at render time. */
export default function ShareExportRow({ onShare, onPdf, label }: ShareExportRowProps) {
  const bs: CSSProperties = { flex: 1, minWidth: 0, padding: "8px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button onClick={function (e: MouseEvent) { e.stopPropagation(); onShare(); }} aria-label={"Share " + label} style={bs}>{"Share…"}</button>
      <button onClick={function (e: MouseEvent) { e.stopPropagation(); onPdf(); }} aria-label={"Save " + label + " as a PDF"} style={bs}>{"Save as PDF"}</button>
    </div>
  );
}
