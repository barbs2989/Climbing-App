import type { ReactNode } from "react";

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

/** The rounded tag every badge in the app is drawn with: a background, a colour, an optional icon, a label. */
export default function Pill({ label, color, bg, sm, icon }: PillProps) {
  return (
    <span
      style={{
        background: bg,
        color,
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
