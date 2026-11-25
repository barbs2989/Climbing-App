import { C } from "../../ClimbMatchCore.jsx";

export interface StarsProps {
  /** The rating, 0–5. Without `outOf`, rounded to whole stars. */
  n: number;
  /** Font size in px (default 14). */
  size?: number;
  /** Draw this many stars, the unearned ones dimmed and a half star where the rating sits between two, so a 4.5
   *  printed beside it is drawn as four and a half, not five (review 2026-11-24). Omitted: the filled stars only. */
  outOf?: number;
}

/** A row of filled stars for a rating, in the palette's amber; with `outOf`, halves and the rest dimmed. Reads `C` at render time. */
export default function Stars({ n, size, outOf }: StarsProps) {
  if (!outOf) return <span style={{ color: C.amber, fontSize: size || 14 }}>{"★".repeat(Math.max(0, Math.round(n)))}</span>;
  const x = Math.max(0, Math.min(outOf, n));
  const full = Math.floor(x + 0.25), half = x - full >= 0.25 && x - full < 0.75 ? 1 : 0;
  const rest = Math.max(0, outOf - full - half);
  return <span style={{ color: C.amber, fontSize: size || 14 }}>
    {"★".repeat(full)}
    {half ? <span style={{ backgroundImage: "linear-gradient(90deg, " + C.amber + " 50%, " + C.textMuted + " 50%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: 1 }}>★</span> : null}
    {rest ? <span style={{ color: C.textMuted, opacity: 0.45 }}>{"★".repeat(rest)}</span> : null}
  </span>;
}
