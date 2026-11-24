import { C } from "../../ClimbMatchCore.jsx";

export interface StarsProps {
  /** The rating, 0–5; rounded to whole stars. */
  n: number;
  /** Font size in px (default 14). */
  size?: number;
  /** Draw this many stars, the unearned ones dimmed, so a 4 reads as four OUT OF five. Omitted: the filled stars only. */
  outOf?: number;
}

/** A row of filled stars for a rating, in the palette's amber; with `outOf`, the rest dimmed. Reads `C` at render time. */
export default function Stars({ n, size, outOf }: StarsProps) {
  const k = Math.max(0, Math.round(n));
  const rest = outOf ? Math.max(0, outOf - k) : 0;
  return <span style={{ color: C.amber, fontSize: size || 14 }}>{"★".repeat(k)}{rest ? <span style={{ color: C.textMuted, opacity: 0.45 }}>{"★".repeat(rest)}</span> : null}</span>;
}
