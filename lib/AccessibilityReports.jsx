// The owner's queue for accessibility reports (0343, 0354) -- the reading half of the Accessibility
// statement's report form.
//
// Before it the reports reached a table the owner had to remember to open in the Supabase dashboard,
// while the statement promised "we reply". The 2026-10-22 accessibility risk audit counted that as
// worse evidence than no form: a report nobody answers is a dated record of being told. So the
// reports wait here, in Profile -> Review, counted into the Review badge (useAdminQueueCounts), and
// each one shows the address to reply to and how long it has waited against the 5-business-day
// reply the statement now promises (7 calendar days, so a weekend is not counted as late).
//
// Gated on useIsAdmin by the caller, as the other queues are; accessibility_report_queue() refuses
// a non-admin by itself, so the gate is cosmetic.

import { useState } from "react";
import { useAccessibilityReportQueue, setAccessibilityReportStatus } from "./db";
import { C } from "../ClimbMatchCore";

const WAITED = (iso) => {
  if (!iso) return { text: "", late: false };
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  const text = h < 1 ? "waiting under an hour" : h < 48 ? "waiting " + Math.floor(h) + " h" : "waiting " + Math.floor(h / 24) + " days";
  return { text, late: h >= 24 * 5 };
};

export function AccessibilityReportQueue({ notify }) {
  const { data, isLoading, error } = useAccessibilityReportQueue(true, "open");
  const [busy, setBusy] = useState(null);
  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Loading accessibility reports…</div>;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load accessibility reports — " + ((error && error.message) || "try again") + ". Do not read this as 'no reports'."}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No open accessibility reports.</div>;
  const close = (r) => {
    setBusy(r.id);
    setAccessibilityReportStatus(r.id, "done")
      .then(() => notify && notify("Marked as answered."))
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {data.map((r) => {
      const w = WAITED(r.created_at);
      const subject = "Your ClimbMatch accessibility report";
      const mail = r.reply_to ? "mailto:" + encodeURIComponent(r.reply_to) + "?subject=" + encodeURIComponent(subject) : null;
      return <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.from_guest ? "From a visitor (not signed in)" : "From " + (r.reporter_name || "a climber")}</span>
          <span style={{ fontSize: 11.5, color: w.late ? C.red : C.textMuted, fontWeight: w.late ? 700 : 400, marginLeft: "auto" }}>{w.text}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{r.problem}</div>
        {r.screen || r.assistive ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>{[r.screen ? "Screen: " + r.screen : null, r.assistive ? "Uses: " + r.assistive : null].filter(Boolean).join(" · ")}</div> : null}
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{r.reply_to ? "Reply to " + r.reply_to : "No address on file — the account has no email."}</div>
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          {mail ? <a href={mail} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.blueDim, background: C.blueBg, color: "#fff", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Reply by email</a> : null}
          <button disabled={busy === r.id} onClick={() => close(r)} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: busy === r.id ? "default" : "pointer" }}>{busy === r.id ? "Working…" : "Mark as answered"}</button>
        </div>
      </div>;
    })}
  </div>;
}
