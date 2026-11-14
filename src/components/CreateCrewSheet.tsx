import { useState } from "react";
import { createPortal } from "react-dom";
import { C, SL, mtnOf } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";

/** A saved list and the climbs on it a crew can be formed for — App's crewPickGroups(). */
export interface CreateCrewSheetPick {
  list: { id: string; name: string };
  rs: ReadonlyArray<{ id: string; name: string; grade?: string }>;
}

/** Past this many saved climbs the list offers a filter box. */
const FILTER_AT = 10;

const ROW = { display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, boxSizing: "border-box" as const, textAlign: "left" as const, padding: "8px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.text, fontFamily: "inherit", cursor: "pointer" };
const SUB = { display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 1, overflowWrap: "anywhere" as const };

export interface SavedClimbListProps {
  picks: ReadonlyArray<CreateCrewSheetPick>;
  /** Climbs that already have an active crew of yours: listed, but not offered again. */
  formedIds?: ReadonlyArray<string>;
  onRoute: (routeId: string) => void;
  /** Every row off, e.g. until the group picker has someone picked. */
  disabled?: boolean;
  /** Shown instead of the list when nothing is saved. */
  emptyText?: string;
  /** Overrides the "From your saved climbs" heading and its line (the climb page's Start a crew offers one climb that may not be saved). */
  heading?: string;
  intro?: string;
}

/* YOUR SAVED CLIMBS, the one list every crew picker offers (owner 2026-11-14: "make it clear where that list comes from").
   The rows are crewPickGroups' order — My Objectives first, then each list you made, each climb once — under one sub-heading
   per list, with a line that says so. + Create a crew, Climb again with a past crew and Form a crew from a group all draw it. */
export function SavedClimbList({ picks, formedIds = [], onRoute, disabled = false, emptyText, heading, intro }: SavedClimbListProps) {
  const [q, setQ] = useState("");
  const total = picks.reduce((n, g) => n + g.rs.length, 0);
  const ql = q.trim().toLowerCase();
  const shown = ql ? picks.map(g => ({ list: g.list, rs: g.rs.filter(r => (r.name || "").toLowerCase().includes(ql)) })).filter(g => g.rs.length) : picks;
  return <div>
    <SL>{heading || ("From your saved climbs" + (total ? " · " + total : ""))}</SL>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, margin: "-4px 0 8px" }}>
      {intro ? intro : total ? "Every climb on your lists — My Objectives first, then each list you made. A climb on two lists shows once." : (emptyText || "Climbs you save to My Objectives or any of your lists show up here.")}
    </div>
    {total > FILTER_AT ? <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter your saved climbs" aria-label="Filter your saved climbs" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, marginBottom: 8, fontFamily: "inherit" }} /> : null}
    {shown.map(g => <div key={g.list.id} style={{ marginBottom: 10 }}>
      {g.list.name ? <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: C.label, margin: "0 2px 5px", overflowWrap: "anywhere" }}>{g.list.name}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {g.rs.map(r => { const has = formedIds.includes(r.id); const off = has || disabled; const where = [r.grade, mtnOf(r)].filter(Boolean).join(" · ");
          return <button key={r.id} type="button" disabled={off} onClick={() => onRoute(r.id)} style={{ ...ROW, cursor: off ? "default" : "pointer", color: off ? C.textMuted : C.text }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{r.name}</span>{where ? <span style={SUB}>{where}</span> : null}</span>
            {has ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 8px" }}>Crew formed</span> : null}
          </button>; })}
      </div>
    </div>)}
    {ql && !shown.length ? <div style={{ fontSize: 12, color: C.textMuted }}>No saved climb by that name.</div> : null}
  </div>;
}

export interface CreateCrewSheetProps {
  picks: ReadonlyArray<CreateCrewSheetPick>;
  formedIds: ReadonlyArray<string>;
  onClose: () => void;
  /** `opts.private` is the Who can join? answer (true = just people you invite). */
  onRoute: (routeId: string, opts?: { private: boolean }) => void;
  /** Ask Who can join? at the top (the main + Create a crew). Left out, the sheet asks nothing. */
  askWhoCanJoin?: boolean;
  /** Passed to SavedClimbList: a heading and line for the list instead of "From your saved climbs". */
  listHeading?: string;
  listIntro?: string;
  /** A crag session through StartCrewSheet; the section is left out without it. */
  onArea?: () => void;
  /** Off to Climbs to save one; the section is left out without it. */
  onFindClimb?: () => void;
  title?: string;
  subtitle?: string;
}

/* + CREATE A CREW, SECTIONED (owner 2026-11-14: "it needs to be sectioned out better"). It was a native select element whose optgroup
   labels are faint, so a crag session, every saved list and "find it in Climbs" read as one run of options. Three headed sections
   now: a crag session, your saved climbs (SavedClimbList), and a climb you have not saved yet. Climb again with a past crew opens
   it too, titled for those climbers. */
export default function CreateCrewSheet({ picks, formedIds, onClose, onRoute, onArea, onFindClimb, askWhoCanJoin = false, listHeading, listIntro, title = "Create a crew", subtitle = "Pick where. You invite people once the crew exists." }: CreateCrewSheetProps) {
  const total = picks.reduce((n, g) => n + g.rs.length, 0);
  /* WHO CAN JOIN, ASKED ONCE HERE (owner 2026-11-14). A new crew used to be listed for anyone to ask to join
     ("Open crew — 1 spot left") without the organiser ever being asked. Default: just the people you invite.
     It stays changeable under the crew's ⋯ More. */
  const [invitesOnly, setInvitesOnly] = useState(true);
  const pickRoute = (id: string) => onRoute(id, askWhoCanJoin ? { private: invitesOnly } : undefined);
  return createPortal(<div onClick={onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") onClose(); }} role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 1150, background: C.scrimStrong, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: "18px 18px 0 0", border: "1px solid " + C.border, width: "100%", maxWidth: 520, padding: 16, boxSizing: "border-box", maxHeight: "90%", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, borderLeft: "3px solid " + C.blue, paddingLeft: 9, overflowWrap: "anywhere" }}>{title}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, paddingLeft: 12 }}>{subtitle}</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>

      {askWhoCanJoin ? <div role="radiogroup" aria-label="Who can join this crew?" style={{ marginBottom: 16 }}>
        <SL>Who can join?</SL>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([[true, "Just people I invite", "Not listed. Only climbers you invite see it."], [false, "Let others ask to join", "Listed under Join a crew. You approve each request."]] as const).map(([v, label, sub]) => {
            const on = invitesOnly === v;
            return <button key={label} type="button" role="radio" aria-checked={on} onClick={() => setInvitesOnly(v)} style={{ ...ROW, display: "block", textAlign: "left", minHeight: 64, background: on ? C.blueBg : C.card, border: "1px solid " + (on ? C.blue : C.border), cursor: "pointer", color: C.text }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>{(on ? "● " : "○ ") + label}</span><span style={SUB}>{sub}</span></button>;
          })}
        </div>
      </div> : null}

      {onArea ? <div style={{ marginBottom: 16 }}>
        <SL>At a crag</SL>
        <button type="button" onClick={onArea} style={ROW}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>Crag session at an area…</span><span style={SUB}>Several climbs at one area — you pick the area, discipline and group size.</span></span></button>
      </div> : null}

      <div style={{ marginBottom: onFindClimb ? 16 : 0 }}><SavedClimbList picks={picks} formedIds={formedIds} onRoute={pickRoute} heading={listHeading} intro={listIntro} /></div>

      {onFindClimb ? <div>
        <SL>Somewhere else</SL>
        <button type="button" onClick={onFindClimb} style={ROW}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{total ? "Another climb — find it in Climbs…" : "A climb — find it in Climbs…"}</span><span style={SUB}>Save it to a list from its page and it appears above.</span></span></button>
      </div> : null}
    </div>
  </div>, document.body);
}
