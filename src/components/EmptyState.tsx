import type { CSSProperties, ReactNode } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";

export interface EmptyStateProps {
  /** The dark-theme palette the caller renders with (core's `C`); passed in so `lib/` files that must not import core can use it. */
  C: typeof Palette;
  /** An `ActionIcon` name for what the list would hold ("search" for no matches, "mountain" for climbs…). */
  icon?: string;
  /** The sentence. Its words are unchanged from the bare line it replaced — guards read them. */
  children: ReactNode;
  /** An optional next step under the sentence (a button). */
  action?: ReactNode;
  /** Layout only (margin, padding) — never the look. */
  style?: CSSProperties;
}

/**
 * What a LIST shows when it has nothing in it: a muted line icon in a circle over the sentence that
 * says so, and an optional next step. Polish round 4 (2026-10-25) replaced the bare centred grey
 * sentences with it, so every empty list in the app reads the same way. Inline helper lines
 * ("No coordinate on file — add it…") stay as text; this is for a whole list standing empty.
 */
export default function EmptyState({ C, icon = "info", children, action, style }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 9, padding: "22px 14px", ...style }}>
      <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 20, background: C.surface, border: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ActionIcon name={icon} size={19} color={C.textMuted} />
      </span>
      <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, maxWidth: 320 }}>{children}</div>
      {action || null}
    </div>
  );
}
