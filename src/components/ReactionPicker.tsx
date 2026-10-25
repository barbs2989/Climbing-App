import { createPortal } from "react-dom";
import { C, REACTIONS } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";

export interface ReactionPickerProps {
  /** Called with the reaction's key (`REACTIONS[].k`). */
  onPick: (key: string) => void;
  onClose: () => void;
}

/**
 * The reaction sheet: a bottom sheet over a scrim listing every reaction in `REACTIONS` as a 4-column
 * grid of buttons: the reaction's line icon (when it has one) over its word — the app draws no emoji. Portalled to document.body like every other overlay; the scrim and the
 * ✕ both close it. Reads `C` and `REACTIONS` at render time.
 */
export default function ReactionPicker({ onPick, onClose }: ReactionPickerProps) {
  return createPortal(
    <div onClick={onClose} role="dialog" aria-label="React" aria-modal="true" style={{ position: "fixed", inset: 0, background:C.scrim, zIndex: 9700, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 440, maxHeight: "62vh", overflowY: "auto", overscrollBehavior: "contain", borderRadius: "16px 16px 0 0", border: "1px solid " + C.border, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>React</div>
          <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {REACTIONS.map(function (r) {
            return (
              <button key={r.k} onClick={() => onPick(r.k)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 12, border: "1px solid " + C.border, background: C.surface, cursor: "pointer" }}>
                {r.i ? <span aria-hidden="true" style={{ display: "flex" }}><ActionIcon name={r.i} size={20} color={C.blue} /></span> : null}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textSub, textAlign: "center" }}>{r.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
