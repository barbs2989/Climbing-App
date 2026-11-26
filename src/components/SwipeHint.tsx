import { C } from "../../ClimbMatchCore.jsx";
import { useWideScreen } from "../../lib/wideLayout.js";

export interface SwipeHintProps {
  /** The sentence, e.g. "Swipe left to remove a climb." */
  text: string;
}

/**
 * The at-rest line every swiping list prints (owner's note 2026-10-25: a swipe nobody is told about is
 * a control nobody finds). Phone only: on the website the row's ✕ is drawn and a mouse cannot swipe.
 * aria-hidden, because a screen reader cannot swipe either — it reaches the row's kept ✕ (phoneX,
 * lib/srOnly.js). Reads core (`C`) at render time only.
 */
export default function SwipeHint({ text }: SwipeHintProps) {
  const wide = useWideScreen();
  if (wide) return null;
  return <div aria-hidden="true" style={{ fontSize: 11.5, color: C.textMuted, margin: "0 2px 8px" }}>{text}</div>;
}
