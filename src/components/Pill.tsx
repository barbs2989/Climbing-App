import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { readableOn } from "../../lib/contrast.js";

export interface PillProps {
  /** The text (or node) inside the pill. */
  label?: ReactNode;
  /** Text colour. */
  color?: string;
  /** Background colour. */
  bg?: string;
  /** The compact size used in rows and headers. */
  sm?: boolean;
  /** An optional leading icon, drawn before the label. */
  icon?: ReactNode;
}

/** The rounded tag every badge in the app is drawn with: a background, a colour, an optional icon, a label.
 *  The text is lifted to 4.5:1 against its own tinted background (WCAG 1.4.3): at 11px, purple and red
 *  on their own tint read 3.9:1 and 4.1:1. A colour that already passes is drawn as given. */
export default function Pill({ label, color, bg, sm, icon }: PillProps) {
  return (
    <span
      style={{
        background: bg,
        color: color && bg ? readableOn(color, bg, C.card) : color,
        padding: sm ? "2px 7px" : "3px 10px",
        borderRadius: 20,
        fontSize: sm ? 11 : 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
