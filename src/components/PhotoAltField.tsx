import { C, PHOTO_ALT_MAX } from "../../ClimbMatchCore.jsx";

export interface PhotoAltFieldProps {
  /** The description so far. */
  value?: string | null;
  onChange: (value: string) => void;
  /** The field's label (default "Describe this photo (optional)"). */
  label?: string;
  /** Show the one-line explanation of what the description is for. */
  hint?: boolean | string;
  autoFocus?: boolean;
}

/**
 * The alt-text field for a photo: a labelled input capped at `PHOTO_ALT_MAX` characters, with an
 * optional hint that the text is read aloud to climbers who use a screen reader. Reads `C` and
 * `PHOTO_ALT_MAX` at render time.
 */
export default function PhotoAltField({ value, onChange, label, hint, autoFocus }: PhotoAltFieldProps) {
  return (
    <label style={{ display: "block", marginTop: 6 }}>
      <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>{label || "Describe this photo (optional)"}</span>
      <input value={value || ""} maxLength={PHOTO_ALT_MAX} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Climber on a sunny granite slab, second pitch" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, boxSizing: "border-box" }} />
      {hint ? <span style={{ display: "block", fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{"Read aloud to climbers who use a screen reader. Say what the photo shows."}</span> : null}
    </label>
  );
}
