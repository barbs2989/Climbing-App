// AFTER A SHARED CLIMB (owner 2026-11-23: "after a shared climb, make it easy to log it together, exchange a
// vouch, and climb again"). The three next moves used to live in three places, and only on a CREW: the past
// crew card's Log / Vouch / Climb with them again. A climb logged with tagged partners and no crew ended at a
// toast, and a partner who answered "I was there" got one Vouch link and nothing in their own logbook.
//
// This sheet opens at both moments -- the logger's save (LogClimbSheet / QuickLog, when the log tags a
// real partner) and the partner's "I was there" (LogTagConfirmations' confirmed handler in App) -- and
// offers the same three moves for that one climb. It writes nothing itself: Log it too opens the log form
// with the climb, the day and the other climber already filled in; Vouch opens GiveVouch with this climb
// first; Climb with them again opens the Crews tab's own Start-a-crew sheet for these people. So every
// write is the one those screens already make, and every claim on this sheet is one of theirs.
//
// The shell is CrewStepSheet's: the dialog element IS the backdrop and carries the close (lib/dialogA11y.js
// relies on that shape), portalled to <body> (check:overlays). zIndex 1300 puts it over the bell's panel
// (1200), where "I was there" is usually tapped; GiveVouch (9850) opens over it, so the sheet is still
// there when the vouch is saved and the row turns to Vouched.
import { createPortal } from "react-dom";
import { C, pubName, pubFirst } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import { BTN, BTN_GO, BTN_SECONDARY } from "../../lib/buttonStyles.js";
import { useWideScreen } from "../../lib/wideLayout.js";
import Av from "./Av.tsx";

/** A climber on the shared climb: a real profile or an example climber. */
export interface PostClimbPerson { id: string | number; name?: string; username?: string; showName?: boolean; avatar?: string }
/** The shared climb this sheet is about. */
export interface PostClimb {
  routeId: string | number;
  routeName: string;
  /** The route itself, when the caller holds it (App's lookup misses a climb opened from a link). */
  route?: { id: string | number; name?: string } | null;
  /** The day climbed, YYYY-MM-DD. */
  date: string | null;
  people: PostClimbPerson[];
  /** True when the climb is already in YOUR logbook (you logged it, or you logged it too). */
  logged: boolean;
  /** Who logged it, when it was a partner's log you confirmed. */
  loggedBy?: PostClimbPerson | null;
  /** One line at the top, e.g. what your answer just did. */
  note?: string | null;
}
export interface PostClimbSheetProps {
  climb: PostClimb;
  /** Ids you have already vouched for. */
  vouchedIds: ReadonlyArray<string | number>;
  /** The day, as the climber's date preference prints it. */
  dayLabel: (ymd: string) => string;
  onClose: () => void;
  onLogIt: () => void;
  onVouch: (p: PostClimbPerson) => void;
  onClimbAgain: () => void;
}

/** Names as a sentence: "Avery", "Avery and Blake", "Avery, Blake and Casey". */
function joinNames(names: string[]): string {
  if (names.length < 2) return names.join("");
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

export default function PostClimbSheet({ climb, vouchedIds, dayLabel, onClose, onLogIt, onVouch, onClimbAgain }: PostClimbSheetProps) {
  const wide = useWideScreen();
  const close = (e?: { stopPropagation: () => void }) => { if (e) e.stopPropagation(); onClose(); };
  const firsts = climb.people.map(function (p) { return pubFirst(p) as string; });
  const sub = climb.routeName + (climb.date ? " · " + dayLabel(climb.date) : "");
  const H = { fontSize: 11.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5, margin: "0 0 7px" };
  const SOLID = { ...BTN, border: "1px solid " + C.blueSolid, background: C.blueSolid, color: C.onSolid };
  const section = { padding: "12px 0", borderTop: "1px solid " + C.borderLight };
  return createPortal(<div onClick={(e) => { if (e.target === e.currentTarget) close(e); }} role="dialog" aria-modal="true" aria-label={"Climbed together: " + climb.routeName} style={{ position: "fixed", inset: 0, zIndex: 1300, background: C.scrim, display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center", padding: wide ? 16 : 0, boxSizing: "border-box" }}>
    <div style={{ background: C.surface, color: C.text, borderRadius: wide ? 18 : "18px 18px 0 0", border: "1px solid " + C.border, width: "100%", maxWidth: 520, boxSizing: "border-box", maxHeight: wide ? "88vh" : "90vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px", borderBottom: "1px solid " + C.borderLight, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, overflowWrap: "anywhere" }}>{"You climbed with " + joinNames(firsts)}</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4, overflowWrap: "anywhere" }}>{sub}</div>
        </div>
        <button type="button" onClick={close} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 16px 4px" }}>
        {climb.note ? <div style={{ fontSize: 13, color: C.green, fontWeight: 700, lineHeight: 1.45, padding: "10px 0 2px", overflowWrap: "anywhere" }}>{climb.note}</div> : null}
        {climb.logged ? null : <div style={{ ...section, borderTop: climb.note ? section.borderTop : "none" }}>
          <div style={H}>Log it together</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.45, marginBottom: 9 }}>{"Add it to your logbook too. The climb, the day and your partner are filled in; you add how it went."}</div>
          <button type="button" onClick={onLogIt} style={{ ...BTN_GO(C), width: "100%", minHeight: 44, fontWeight: 800 }}>Log it too</button>
        </div>}
        <div style={{ ...section, borderTop: (climb.logged && !climb.note) ? "none" : section.borderTop }}>
          <div style={H}>Vouch for who you climbed with</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 8 }}>A vouch shows on their profile. Vouch only for a partner you would rope up with again.</div>
          {climb.people.map(function (p) {
            const done = vouchedIds.indexOf(p.id) >= 0;
            const nm = pubName(p) as string;
            return <div key={String(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <Av src={p.avatar} size={32}/>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{nm}{done ? <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginTop: 1 }}>Vouched</div> : null}</div>
              <button type="button" onClick={function () { onVouch(p); }} aria-label={(done ? "Edit your vouch for " : "Vouch for ") + nm} style={{ ...(done ? BTN_SECONDARY(C) : { ...BTN, border: "1px solid " + C.amber, background: C.amberBg, color: C.amber, fontWeight: 800 }), minHeight: 44, flexShrink: 0 }}>{done ? "Edit vouch" : "Vouch"}</button>
            </div>;
          })}
        </div>
        <div style={section}>
          <div style={H}>Climb again</div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.45, marginBottom: 9 }}>{"Start a crew with " + joinNames(firsts) + " for your next climb. " + (climb.people.length > 1 ? "They each get" : "They get") + " an invite to accept or decline."}</div>
          <button type="button" aria-haspopup="dialog" onClick={onClimbAgain} style={{ ...SOLID, width: "100%", minHeight: 44, fontWeight: 800 }}>Climb with them again</button>
        </div>
      </div>
      <div style={{ display: "flex", padding: "10px 16px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid " + C.borderLight, flexShrink: 0 }}>
        <button type="button" onClick={close} style={{ ...BTN_SECONDARY(C), flex: 1, minHeight: 44, fontWeight: 800 }}>Not now</button>
      </div>
    </div>
  </div>, document.body);
}
