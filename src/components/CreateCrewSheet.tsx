import { useState } from "react";
import { createPortal } from "react-dom";
import { C, SL, mtnOf } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";

/** A saved list and the climbs on it a crew can be formed for — App's crewPickGroups(). */
export interface CreateCrewSheetPick {
  list: { id: string; name: string };
  rs: ReadonlyArray<{ id: string; name: string; grade?: string }>;
}
export interface CreateCrewSheetProps {
  picks: ReadonlyArray<CreateCrewSheetPick>;
  /** Climbs that already have an active crew of yours: listed, but not offered again. */
  formedIds: ReadonlyArray<string>;
  onClose: () => void;
  onRoute: (routeId: string) => void;
  onArea: () => void;
  onFindClimb: () => void;
}

/** Past this many saved climbs the sheet offers a filter box. */
const FILTER_AT = 10;

/* + CREATE A CREW, SECTIONED (owner 2026-11-14: "make it clear where that list comes from" / "it needs to be sectioned out better").
   It was a native <select> whose optgroup labels are faint, so a crag session, every saved list and "find it in Climbs" read as one run of
   options, and nothing said the climbs came from your saved lists. Three headed sections now: a crag session, your saved climbs (named by
   list, My Objectives first — crewPickGroups' order — each climb once), and a climb you have not saved yet. */
export default function CreateCrewSheet({ picks, formedIds, onClose, onRoute, onArea, onFindClimb }: CreateCrewSheetProps) {
  const [q, setQ] = useState("");
  const total = picks.reduce((n, g) => n + g.rs.length, 0);
  const ql = q.trim().toLowerCase();
  const shown = ql ? picks.map(g => ({ list: g.list, rs: g.rs.filter(r => (r.name || "").toLowerCase().includes(ql)) })).filter(g => g.rs.length) : picks;
  const row = { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, boxSizing: "border-box" as const, textAlign: "left" as const, padding: "8px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.text, fontFamily: "inherit", cursor: "pointer" };
  const sub = { display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 1, overflowWrap: "anywhere" as const };
  const section = { marginBottom: 16 };
  return createPortal(<div onClick={onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") onClose(); }} role="dialog" aria-modal="true" aria-label="Create a crew" style={{ position: "fixed", inset: 0, zIndex: 1150, background: C.scrimStrong, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: "18px 18px 0 0", border: "1px solid " + C.border, width: "100%", maxWidth: 520, padding: 16, boxSizing: "border-box", maxHeight: "90%", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>Create a crew</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, paddingLeft: 12 }}>Pick where. You invite people once the crew exists.</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>

      <div style={section}>
        <SL>At a crag</SL>
        <button type="button" onClick={onArea} style={row}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>Crag session at an area…</span><span style={sub}>Several climbs at one area — you pick the area, discipline and group size.</span></span></button>
      </div>

      <div style={section}>
        <SL>From your saved climbs{total ? " · " + total : ""}</SL>
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, margin: "-4px 0 8px" }}>
          {total ? "Every climb on your lists — My Objectives first, then each list you made. A climb on two lists shows once." : "Climbs you save to My Objectives or any of your lists show up here."}
        </div>
        {total > FILTER_AT ? <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter your saved climbs" aria-label="Filter your saved climbs" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, marginBottom: 8, fontFamily: "inherit" }} /> : null}
        {shown.map(g => <div key={g.list.id} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: C.label, margin: "0 2px 5px", overflowWrap: "anywhere" }}>{g.list.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.rs.map(r => { const has = formedIds.includes(r.id); const where = [r.grade, mtnOf(r)].filter(Boolean).join(" · ");
              return <button key={r.id} type="button" disabled={has} onClick={() => onRoute(r.id)} style={{ ...row, cursor: has ? "default" : "pointer", color: has ? C.textMuted : C.text }}>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{r.name}</span>{where ? <span style={sub}>{where}</span> : null}</span>
                {has ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 8px" }}>Crew formed</span> : null}
              </button>; })}
          </div>
        </div>)}
        {ql && !shown.length ? <div style={{ fontSize: 12, color: C.textMuted }}>No saved climb by that name.</div> : null}
      </div>

      <div>
        <SL>Somewhere else</SL>
        <button type="button" onClick={onFindClimb} style={row}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{total ? "Another climb — find it in Climbs…" : "A climb — find it in Climbs…"}</span><span style={sub}>Save it to a list from its page and it appears above.</span></span></button>
      </div>
    </div>
  </div>, document.body);
}
