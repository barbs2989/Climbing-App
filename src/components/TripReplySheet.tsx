import { useState } from "react";
import { createPortal } from "react-dom";
import { C, pubNameRow, shortDate } from "../../ClimbMatchCore.jsx";
import { POP_BACK } from "../../lib/popupChrome.js";
import { replyToTripReport, useProfilesByIds } from "../../lib/db.js";
import { TRIP_OUTCOME_LABEL } from "./TripRecapSheet.tsx";
import Av from "./Av.tsx";

/** A report about me, as useTripReportsAboutMe returns it (0518). */
export interface TripReportAboutMe {
  id: string;
  crewId: string | null;
  reporterId: string;
  tripDate: string;
  outcome: string;
  reply: string | null;
  note: string | null;
}

export interface TripReplySheetProps {
  report: TripReportAboutMe;
  /** The climb or area the crew went to, when the crew is still on this device. */
  placeName?: string | null;
  onClose: () => void;
  showToast: (msg: string) => void;
}

interface ProfileRow { id: string; name?: string | null; username?: string | null; show_name?: boolean; avatar?: string | null }

/** Your side of a trip report about you: "I was there" (a report you dispute doesn't count), or a note your crewmate
 *  reads on their recap (context; it still counts). */
export default function TripReplySheet({ report, placeName, onClose, showToast }: TripReplySheetProps) {
  const profQ = useProfilesByIds([report.reporterId]);
  const who = ((profQ.data || []) as ProfileRow[]).find((p) => p.id === report.reporterId);
  const name = (who ? pubNameRow(who) : "") || "A crewmate";
  const first = name.split(" ")[0];
  const [note, setNote] = useState(report.note || "");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(report.reply);
  const label = TRIP_OUTCOME_LABEL[report.outcome] || report.outcome;
  const send = (kind: "was_there" | "note") => {
    if (kind === "note" && !note.trim()) { showToast("Write a few words first"); return; }
    setBusy(true);
    replyToTripReport(report.id, kind, kind === "note" ? note.trim() : (note.trim() || null))
      .then(() => { setReply(kind); showToast(kind === "was_there" ? "Sent — this report no longer counts toward your reliability" : "Sent — " + first + " sees your note on their recap"); onClose(); })
      .catch((e: Error) => showToast("Couldn’t send that — " + (e && e.message ? e.message : "check your connection and try again.")))
      .finally(() => setBusy(false));
  };

  return createPortal(<div role="dialog" aria-modal="true" aria-label="Your side of a trip report" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1300, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ minHeight: "100%" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
        <button onClick={onClose} style={POP_BACK}>← Back</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Your side</div>
      </div>
      <div style={{ padding: "14px 16px 40px" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 14 }}>
          <Av src={who ? who.avatar : null} size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.45 }}><b>{name}</b>{" marked you "}<b>{label}</b></div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2, overflowWrap: "anywhere" }}>{(placeName || "A crew trip") + " · " + shortDate(report.tripDate)}</div>
          </div>
        </div>
        {reply === "was_there" ? <div style={{ fontSize: 13, color: C.green, background: C.greenBg, border: "1px solid " + C.greenDim, borderRadius: 10, padding: "9px 11px", marginBottom: 12, lineHeight: 1.45 }}>You said you were there, so this report doesn’t count toward your reliability.</div> : null}
        <button onClick={() => send("was_there")} disabled={busy || reply === "was_there"} aria-pressed={reply === "was_there"}
          style={{ width: "100%", textAlign: "left", display: "block", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, marginBottom: 14, cursor: reply === "was_there" ? "default" : "pointer",
            border: "1px solid " + (reply === "was_there" ? C.green : C.blueDim), background: reply === "was_there" ? C.greenBg : C.blueBg, color: C.onSolid }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: reply === "was_there" ? C.green : C.onSolid }}>{reply === "was_there" ? "✓ I was there" : "I was there"}</span>
          <span style={{ display: "block", fontSize: 12.5, color: C.textSub, lineHeight: 1.45, marginTop: 3 }}>{"That isn’t what happened. A report you dispute doesn’t count, and " + first + " sees that you replied."}</span>
        </button>
        <label htmlFor="trip-reply-note" style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{"Or add context for " + first}</label>
        <textarea id="trip-reply-note" value={note} maxLength={280} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="The road was closed, I messaged at 6am…"
          style={{ width: "100%", boxSizing: "border-box", background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 11px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>{note.length + " / 280 · the report still counts"}</span>
          <button onClick={() => send("note")} disabled={busy || !note.trim()} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: busy || !note.trim() ? "default" : "pointer", opacity: note.trim() ? 1 : 0.6 }}>Send note</button>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55, marginTop: 16 }}>
          Your profile shows reliability as counts, like “Showed up for 9 of 10 crew trips”, from what crewmates report after crew trips. Turning back for weather, conditions or safety is never counted against anyone.
        </div>
      </div>
    </div>
  </div>, document.body);
}
