// "Climbs to confirm": the logs a connection tagged you on ("Climbed with"). Your answer is what
// makes their climb count fully on Ranks (confirmed), or takes it off every board (denied) --
// the server rule is in 0194. Rendered on Ranks and the Logbook; it renders nothing until there
// is something to answer, and says so when the read fails rather than looking like nothing.
import { useState } from "react";
import { useLogTagsForMe, respondToLogTag } from "./db";
import { C, DLOCALE, pubName } from "../ClimbMatchCore.jsx";

const dayOf = (d) => {
  if (!d) return "";
  const t = new Date(d + "T12:00:00");
  return isNaN(t) ? d : t.toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" });
};

export default function LogTagConfirmations({ uid, showToast }) {
  const q = useLogTagsForMe(uid);
  const [busy, setBusy] = useState(null);
  if (!uid) return null;
  if (q.isError) {
    return <div style={{ fontSize: 12, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber, borderRadius: 8, padding: "7px 10px", marginBottom: 9, lineHeight: 1.45 }}>Couldn’t check for climbs you were tagged on — any waiting for your confirmation aren’t shown.</div>;
  }
  const pending = (q.data || []).filter((t) => !t.verdict);
  if (!pending.length) return null;
  const answer = (t, verdict) => {
    setBusy(t.log_id);
    respondToLogTag(t.log_id, verdict)
      .then(() => {
        const who = pubName({ name: t.author_name, username: t.author_username, showName: true });
        if (showToast) showToast(verdict === "confirmed" ? "Confirmed — " + who + "’s climb now counts fully on Ranks." : "Marked as not with you — " + who + "’s climb no longer counts on Ranks.");
        return q.refetch();
      })
      .catch(() => { if (showToast) showToast("Couldn’t save your answer — nothing changed. Try again."); })
      .finally(() => setBusy(null));
  };
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>Climbs to confirm</div>
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45, marginBottom: 8 }}>A partner tagged you on these. Confirming one makes it count fully on their rankings; saying you weren’t there takes it off every board.</div>
      {pending.map((t, i) => {
        const who = pubName({ name: t.author_name, username: t.author_username, showName: true });
        const what = (t.route_name || "a climb") + (t.route_grade ? " (" + t.route_grade + ")" : "");
        return (
          <div key={t.log_id} style={{ borderTop: i ? `1px solid ${C.borderLight}` : "none", padding: "8px 0" }}>
            <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.45 }}><b>{who}</b>{" logged " + what + (t.date_climbed ? " on " + dayOf(t.date_climbed) : "") + (t.tick_type ? " · " + t.tick_type : "")}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
              <button disabled={busy === t.log_id} onClick={() => answer(t, "confirmed")} aria-label={"Confirm you climbed " + what + " with " + who} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", background: C.greenChip, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>I was there</button>
              <button disabled={busy === t.log_id} onClick={() => answer(t, "denied")} aria-label={"Say you did not climb " + what + " with " + who} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Wasn’t me</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
