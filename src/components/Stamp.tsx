import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { FONT_MONO } from "../../lib/fonts.js";

export interface StampProps {
  /** The value: a grade ("5.10a", "Class 3"), a commitment grade, a protection rating. */
  label?: ReactNode;
  /** Ink and outline colour. Default is the plain text colour; pass a status colour only when the value IS a warning (an R or X rating). */
  color?: string;
  /** The larger size the route header uses beside its discipline pill. */
  lg?: boolean;
}

/**
 * A VALUE drawn as a square-cornered stamp, the way a guidebook boxes a grade. A grade is a value, not a
 * tag, so it is not a `Pill`: no tinted fill and no hue of its own (owner, 2026-11-23: grades go neutral so
 * amber means caution and nothing else). The fill is the card colour, solid, because the route header draws
 * these over a cover photo. Reads `C` at render time.
 */
export default function Stamp({ label, color, lg }: StampProps) {
  const ink = color || C.text;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        background: C.card,
        color: ink,
        border: "1.5px solid " + ink,
        borderRadius: 4,
        padding: lg ? "2.5px 8px" : "1.5px 6px",
        fontFamily: FONT_MONO,
        fontSize: lg ? 13 : 11.5,
        fontWeight: 600,
        lineHeight: 1.35,
      }}
    >
      {label}
    </span>
  );
}
