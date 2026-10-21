import { C } from "../../ClimbMatchCore.jsx";

export interface BarProps {
  /** The filled amount, in the same unit as `max`. */
  val: number;
  /** The full-width amount (default 100, so a percentage needs no `max`). */
  max?: number;
  /** Fill colour (default the palette's solid blue). */
  color?: string;
  /** Height in px (default 6). */
  h?: number;
}

/** A horizontal progress bar: a track in the border colour, a fill that never exceeds 100%, animated on change. Reads `C` at render time. */
export default function Bar({ val, max, color, h }: BarProps) {
  return (
    <div style={{ background: C.border, borderRadius: 3, overflow: "hidden", height: h || 6 }}>
      <div style={{ width: `${Math.min(100, (val / (max || 100)) * 100)}%`, height: "100%", background: color || C.blueSolid, borderRadius: 3, transition: "width .4s" }} />
    </div>
  );
}
