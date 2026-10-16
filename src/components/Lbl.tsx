import { EMOJI_ICON } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";

export interface LblProps {
  /** The label text. A leading emoji that `EMOJI_ICON` knows is drawn as the matching `ActionIcon`; anything else renders as-is. */
  s: string | number;
  /** Icon size in px when a leading emoji is swapped for an icon (default 14). */
  size?: number;
}

/**
 * The app's own label: text whose leading emoji (if any) is replaced by the line icon it stands for.
 * Returns the plain string unchanged when there is no leading emoji or the emoji has no icon, so a
 * screen reader reads the label it always did — `check:control-names` counts an `<Lbl>` child as a
 * certain name for that reason.
 */
export default function Lbl({ s, size }: LblProps) {
  const str = String(s);
  const m = str.match(/^((?:[←-⯿\u{1F000}-\u{1FAFF}]|\u{FE0F}|\u{200D})+)\s*([\s\S]*)$/u);
  if (!m) return str;
  const key = m[1].replace(/\u{FE0F}|\u{200D}/gu, "");
  const nm = EMOJI_ICON[key];
  if (!nm) return str;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
      <ActionIcon name={nm} size={size || 14} color="currentColor" />
      {m[2]}
    </span>
  );
}
