import { C } from "../../ClimbMatchCore.jsx";

export interface TypingIndicatorProps {
  /** Who is typing: one name, several, or nothing (renders nothing). */
  names?: string | readonly string[] | null;
}

/** "Ana is typing…", "Ana and Ben are typing…", "Ana, Ben and Cy are typing…" — under a chat. Reads `C` at render time. */
export default function TypingIndicator({ names }: TypingIndicatorProps) {
  const list: readonly string[] = Array.isArray(names) ? names : typeof names === "string" && names ? [names] : [];
  if (!list.length) return null;
  const label = list.length === 1 ? list[0] + " is typing…" : list.length === 2 ? list[0] + " and " + list[1] + " are typing…" : list.slice(0, -1).join(", ") + " and " + list[list.length - 1] + " are typing…";
  return <div style={{ color: C.textMuted, fontSize: 13, fontStyle: "italic" }}>{label}</div>;
}
