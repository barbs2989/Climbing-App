import { useState } from "react";
import { createPortal } from "react-dom";
import { C, fuzzyMatch } from "../../ClimbMatchCore.jsx";
import { POP_BACK, POP_REMOVE } from "../../lib/popupChrome.js";
import { SOLID_FILL } from "../../lib/buttonStyles.js";
import ActionIcon from "./ActionIcon.tsx";
import EmptyState from "./EmptyState.tsx";

/** One place My climbs & areas searches: an area you are LISTED at, or one you SAVED. */
export interface YourPlace {
  id: string;
  name: string;
  kind: "listed" | "saved";
}

export interface YourPlacesPageProps {
  places: ReadonlyArray<YourPlace>;
  /** The ids picked now; none picked searches every place. */
  picked: ReadonlyArray<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  onClose: () => void;
}

/* YOUR PLACES, AS A PAGE (owner 2026-11-26: "I DON'T like how there's a bunch of boxes there. We should just have a button that
   opens up a new page to show all of your places"). Find partners › My climbs & areas drew every listed and saved place as a
   wrapping chip above the results (12, then Show all), which ran a screen deep for a climber with many. The results screen now
   has one row and one button; this page lists every place, one per row, searchable once there are more than eight. Picking
   works as the chips did: any number ticked searches just those, All (none ticked) searches every place. */
export default function YourPlacesPage({ places, picked, onToggle, onAll, onClose }: YourPlacesPageProps) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const rows = places.filter(p => !ql || fuzzyMatch(ql, p.name));
  const none = !picked.length;
  const row = (on: boolean) => ({ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 52, padding: "10px 12px", borderRadius: 12, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.card, color: C.text, cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit", boxSizing: "border-box" as const });
  const tick = (on: boolean) => <span aria-hidden="true" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 12, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid " + (on ? C.blue : C.border), background: on ? C.blue : "transparent" }}>{on ? <ActionIcon name="check" size={14} color={C.onSolid} /> : null}</span>;
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Your places" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 9500, display: "flex", flexDirection: "column", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
      <button type="button" onClick={onClose} style={POP_BACK}>{"← Back"}</button>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1, minWidth: 0 }}>{"Your places · " + places.length}</div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "14px 16px 24px" }}>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, margin: "0 2px 12px" }}>{"The places you’re listed at or saved. Tick one or more to search just those, or All to search every one."}</div>
      {places.length > 8 ? <div style={{ position: "relative", marginBottom: 10 }}>
        <input type="search" aria-label="Search your places" value={q} onChange={e => setQ(e.target.value)} placeholder="Search your places" style={{ width: "100%", minWidth: 0, height: 44, boxSizing: "border-box", borderRadius: 10, border: "1px solid " + C.field, background: C.surface, color: C.text, fontFamily: "inherit", padding: "0 44px 0 12px", fontSize: 14, outline: "none" }} />
        {q ? <button type="button" onClick={() => setQ("")} aria-label="Clear search" style={{ ...POP_REMOVE, position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>✕</button> : null}
      </div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!ql ? <button type="button" onClick={onAll} aria-pressed={none} style={row(none)}>{tick(none)}<span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>All places</span></button> : null}
        {rows.map(p => { const on = picked.indexOf(p.id) >= 0; return <button type="button" key={p.id} onClick={() => onToggle(p.id)} aria-pressed={on} style={row(on)}>{tick(on)}<span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{p.name}</span><span style={{ display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>{p.kind === "listed" ? "You’re listed here" : "Saved"}</span></span></button>; })}
      </div>
      {!rows.length ? <EmptyState C={C} icon="search" style={{ padding: "28px 14px" }}>{"None of your places match “" + q.trim() + "”."}</EmptyState> : null}
    </div>
    <div style={{ flexShrink: 0, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid " + C.border, background: C.bg }}>
      <button type="button" onClick={onClose} style={{ width: "100%", minHeight: 48, borderRadius: 12, border: "none", ...SOLID_FILL(C), color: C.onSolid, fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{none ? "Show climbers at all places" : "Show climbers at " + (picked.length === 1 ? "1 place" : picked.length + " places")}</button>
    </div>
  </div>, document.body);
}
