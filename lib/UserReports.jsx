// The reviewer's queue for safety reports about climbers — the reading half of 0075, which
// went four hundred commits without one.
//
// `user_reports` had a single write and no reader anywhere: no query, no queue, no screen. So a
// climber reporting somebody for harassment got a confirmation and the report reached nobody.
// The modal that files these offers "Someone is in danger" as a reason.
//
// Gated on `useIsAdmin` exactly as RouteProposals and PhotoReports are, and cosmetically for the
// same reason: 0158's SELECT policy already returns nothing to a non-admin, so the gate stops a
// non-admin being shown an empty queue rather than being the boundary itself.
//
// DELIBERATELY PLAINER THAN THE PHOTO QUEUE. There is no thumbnail to show and no "take it down"
// equivalent, because what to DO about a reported climber — warn, suspend, block, nothing — is a
// policy question nobody has answered. Pretending otherwise by adding a Suspend button would put
// a control here that no code behind it implements. What this screen can honestly offer is the
// three states the schema already models, so a reviewer can record that they looked.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserReports, reviewUserReport } from "./db";
import { C } from "../ClimbMatchCore";
import { clickable } from "./clickable";

const AGES = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
};

export function UserReportQueue({ notify, onViewProfile }) {
  const { data, isLoading, error } = useUserReports();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["user-reports"] });

  // Three outcomes, three messages. "Nothing reported" over a failed read is the false clean
  // bill this codebase has been bitten by more than once, and it matters most on this screen.
  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Loading reports…</div>;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load the queue — " + ((error && error.message) || "try again") + ". Do not read this as 'no reports'."}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No open reports.</div>;

  const set = (r, status) => {
    setBusy(r.id);
    reviewUserReport(r.id, status)
      .then(() => { refresh(); notify && notify(status === "reviewing" ? "Marked as being reviewed" : status === "actioned" ? "Marked actioned" : "Report dismissed"); })
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((r) => (
        <div key={r.id} style={{ background: C.card, border: "1px solid " + (r.status === "reviewing" ? C.amber + "55" : C.border), borderRadius: 12, padding: "11px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.reason || "No reason given"}</span>
            {r.status === "reviewing" ? <span style={{ fontSize: 10.5, fontWeight: 700, color: C.amber, background: C.amberBg, borderRadius: 7, padding: "2px 6px" }}>BEING REVIEWED</span> : null}
            <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: "auto" }}>{AGES(r.created_at)}</span>
          </div>
          {/* Both sides named. A reviewer cannot judge an accusation without knowing who it is
              about, and `reported_name` is stored at report time so it survives a rename. */}
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
            {"About "}
            {r.reported_id && onViewProfile
              ? <span {...clickable(() => onViewProfile(r.reported_id))} style={{ color: C.blue, fontWeight: 700, cursor: "pointer" }}>{r.reported_name || "a climber"}</span>
              : <span style={{ fontWeight: 700 }}>{r.reported_name || "a climber"}</span>}
            {" · filed by " + (r.reporter_label || (r.reporter ? "a signed-in climber" : "someone signed out"))}
          </div>
          {r.detail ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{r.detail}</div> : null}
          <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            {r.status !== "reviewing"
              ? <button disabled={busy === r.id} onClick={() => set(r, "reviewing")}
                  style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.amber + "55", background: C.amberBg, color: C.amber, fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
                  {busy === r.id ? "Working…" : "I'm looking at this"}
                </button>
              : null}
            <button disabled={busy === r.id} onClick={() => set(r, "actioned")}
              style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.green + "55", background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              Actioned
            </button>
            <button disabled={busy === r.id} onClick={() => set(r, "dismissed")}
              style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: busy === r.id ? "default" : "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
