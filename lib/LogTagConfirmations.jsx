// "Climbs to confirm": the logs a connection tagged you on ("Climbed with"). Your answer is what
// makes their climb count fully on Ranks (confirmed), or takes it off every board (denied) --
// the server rule is in 0194.
//
// ANSWERED WHERE IT IS ASKED (owner, 2026-11-11: "find a better place for climbs to confirm"). This
// was a card pinned above the Logbook (every sub-tab) and Ranks, and each pending tag was ALSO an
// alert whose only job was to send you to that card. A tag is a yes/no question, like a friend
// request, so it is now a row with its two answers wherever Notifications lists it: the bell's
// panel (under Requests), Home's Notifications list and the desktop rail -- as Strava's "tagged you
// in an activity" and Facebook's friend requests are answered in the notification itself. Ranks
// keeps only a one-line link while any wait, because the answers change its boards.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { respondToLogTag } from "./db";
import { C, DLOCALE, pubName } from "../ClimbMatchCore.jsx";

const dayOf = (d) => {
  if (!d) return "";
  const t = new Date(d + "T12:00:00");
  return isNaN(t) ? d : t.toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" });
};

/* One tag (a log_tags_for_me row), its line and its two answers. `compact` is the desktop rail's
   narrow card: a shorter line and smaller buttons. Answering refetches the tags, and every list
   that shows this row is derived from them, so the row leaves all of them at once. */
/** @param {{ tag: any, showToast?: (t: string, d?: number) => void, compact?: boolean }} props */
export function LogTagRow({ tag: t, showToast, compact = false }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const who = pubName({ name: t.author_name, username: t.author_username, showName: true });
  const what = (t.route_name || "a climb") + (t.route_grade ? " (" + t.route_grade + ")" : "");
  const answer = (verdict) => {
    setBusy(true);
    respondToLogTag(t.log_id, verdict)
      .then(() => {
        if (showToast) showToast(verdict === "confirmed" ? "Confirmed — thanks for backing up " + who + "’s climb." : "Marked as not with you — " + who + "’s climb no longer counts on Ranks.");
        return qc.invalidateQueries({ queryKey: ["log-tags-for-me"] });
      })
      .catch(() => { if (showToast) showToast("Couldn’t save your answer — nothing changed. Try again."); })
      .finally(() => setBusy(false));
  };
  const btn = { flex: 1, minHeight: compact ? 36 : 40, padding: compact ? "6px 8px" : "8px 10px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 };
  return (
    <div style={{ padding: compact ? "6px 0" : "9px 11px", background: compact ? "transparent" : C.card, border: compact ? "none" : "1px solid " + C.borderLight, borderRadius: 10, marginBottom: 6 }}>
      <div style={{ fontSize: compact ? 13 : 12.5, color: C.text, lineHeight: 1.4 }}>
        <b>{who}</b>{compact ? " tagged you on " + what : " tagged you on " + what + (t.date_climbed ? " · " + dayOf(t.date_climbed) : "") + (t.tick_type ? " · " + t.tick_type : "") + ". Were you there?"}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
        <button disabled={busy} onClick={() => answer("confirmed")} aria-label={"Confirm you climbed " + what + " with " + who} style={{ ...btn, border: "none", background: C.greenChip, color: C.green }}>I was there</button>
        <button disabled={busy} onClick={() => answer("denied")} aria-label={"Say you did not climb " + what + " with " + who} style={{ ...btn, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub }}>Wasn’t me</button>
      </div>
    </div>
  );
}
