import { C } from "../../ClimbMatchCore.jsx";

export interface StarsProps {
  /** The rating, 0–5; rounded to whole stars. */
  n: number;
  /** Font size in px (default 14). */
  size?: number;
}

/** A row of filled stars for a rating, in the palette's amber. Reads `C` at render time. */
export default function Stars({ n, size }: StarsProps) {
  return <span style={{ color: C.amber, fontSize: size || 14 }}>{"★".repeat(Math.round(n))}</span>;
}
