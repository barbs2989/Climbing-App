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
// A REPORT ABOUT CONTENT CAN BE ACTED ON (0263). Since report_content(), a report about a message,
// post, comment, trip report, group, topo or list carries a SERVER-SIDE copy of what was reported
// (`snapshot`), and "Remove it" takes the content down for everyone but its author through
// moderate_content() -- audited, and closing every open report about the same item at once.
// And since 0264 the ACCOUNT can be acted on from any report about a real climber: Suspend 7 days
// (read-only until it lapses) or Ban (no sign-in; everything they posted removed). Both go through
// set_account_standing(), are logged, show the climber the reason, and can be appealed.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserReports, reviewUserReport, useMyFiledReports, moderateContent, setAccountStanding, useOpenAppeals, decideAppeal } from "./db";
import { C } from "../ClimbMatchCore";
import { clickable } from "./clickable";
import { askConfirm } from "./ConfirmSheet.jsx";

const AGES = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
};
// How long a report has WAITED, in the unit the 24-hour target is stated in.
const WAITED = (iso) => {
  if (!iso) return { text: "", late: false };
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  const text = h < 1 ? "waiting under an hour" : h < 48 ? "waiting " + Math.floor(h) + " h" : "waiting " + Math.floor(h / 24) + " days";
  return { text, late: h >= 20 };
};
export const REPORT_KIND_LABEL = {
  message: "Direct message", crew_message: "Crew chat message", group_post: "Group post", group_event: "Group event",
  comment: "Comment", trip_report: "Trip report", group: "Group", topo: "Topo", list: "List", profile: "Profile",
};

// What the person who FILED a report can see of it.
//
// The other half of the same hole. 0077 always allowed a reporter to read their own rows, and
// nothing ever did, so filing a harassment report was a one-way door: a toast, and then no way
// to tell whether the report still existed or had ever been looked at.
//
// IT REPORTS THAT SOMEBODY LOOKED, NOT WHAT THEY DECIDED, and the distinction is honesty rather
// than discretion. `actioned` and `dismissed` both collapse to "Closed" because this app has no
// suspension, no warning and no ban -- so surfacing the word "actioned" to a reporter would
// promise a consequence that no code anywhere implements. That is the same overclaim the
// reviewer's queue refuses to make with a Suspend button it cannot honour, seen from the other
// end. When an enforcement action exists, this is where it becomes tellable.
//
// Renders NOTHING when you have filed nothing, which is almost everyone -- a permanent empty
// "no reports" panel on every climber's settings screen is noise about a feature they have
// never used.
export function MyFiledReports() {
  const { data } = useMyFiledReports(true);
  if (!data || !data.length) return null;
  const label = (st) => (st === "reviewing" ? "Being looked at" : st === "open" ? "Filed" : "Closed");
  return (
    <div style={{ background: C.card, borderRadius: 12, border: "1px solid " + C.border, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
        Reports you have filed. “Closed” means ClimbMatch Safety reviewed it — what was decided
        about someone else stays private to them, whether that was removing what they posted,
        suspending or banning their account, or no action. Blocking is the part that is under your
        control.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.reason || "Report"}</span>
            <span style={{ fontSize: 12, color: C.textSub }}>{"about " + (r.reported_name || "a climber")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.status === "reviewing" ? C.amber : C.textMuted, marginLeft: "auto" }}>{label(r.status)}</span>
            <span style={{ fontSize: 11, color: C.textMuted, width: "100%" }}>{AGES(r.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  // Act on the ACCOUNT (0264). The reason the climber is shown is built from the report's reason, and
  // the confirm sheet shows it verbatim, so the reviewer sees exactly what the climber will read.
  const isAccount = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
  const restrict = (r, status) => {
    const reason = "Breaking the Community Guidelines — " + (r.reason || "reported by other climbers");
    const who = r.reported_name || "this climber";
    askConfirm({
      title: status === "banned" ? "Ban " + who + "?" : "Suspend " + who + " for 7 days?",
      body: (status === "banned"
        ? "They can’t sign in again, and everything they posted is removed. "
        : "For 7 days they can read but can’t post, message, comment or send friend requests. ")
        + "They’ll be shown: “" + reason + "”. They can appeal, and you can reverse it.",
      confirmLabel: status === "banned" ? "Ban account" : "Suspend 7 days",
    }).then((ok) => {
      if (!ok) return;
      setBusy(r.id);
      setAccountStanding(r.reported_id, status, status === "suspended" ? 7 : null, reason, status === "banned", r.id)
        .then(() => { refresh(); notify && notify(status === "banned" ? who + " is banned — every open report about them is closed." : who + " is suspended for 7 days."); })
        .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
        .finally(() => setBusy(null));
    });
  };
  // Take the reported content down, or keep it up. Both close EVERY open report about the item.
  const act = (r, action) => {
    const isProfile = r.target_kind === "profile";
    const ask = action === "remove"
      ? askConfirm({ title: isProfile ? "Clear this profile’s bio and photos?" : "Remove this " + (REPORT_KIND_LABEL[r.target_kind] || "content").toLowerCase() + "?",
          body: isProfile ? "Their bio, avatar and photos are cleared. This can’t be undone from here." : "It disappears for everyone except its author, who sees that ClimbMatch Safety removed it. You can restore it later.",
          confirmLabel: isProfile ? "Clear profile" : "Remove it" })
      : Promise.resolve(true);
    ask.then((ok) => {
      if (!ok) return;
      setBusy(r.id);
      moderateContent(r.target_kind, r.target_id, action === "remove" ? "remove" : "restore", r.id)
        .then(() => { refresh(); notify && notify(action === "remove" ? "Removed — every report about it is closed." : "Kept up — every report about it is dismissed."); })
        .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
        .finally(() => setBusy(null));
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((r) => (
        <div key={r.id} style={{ background: C.card, border: "1px solid " + (r.status === "reviewing" ? C.amber + "55" : C.border), borderRadius: 12, padding: "11px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {r.target_kind ? <span style={{ fontSize: 10.5, fontWeight: 800, color: C.blue, background: C.blueBg, borderRadius: 7, padding: "2px 6px" }}>{(REPORT_KIND_LABEL[r.target_kind] || r.target_kind).toUpperCase()}</span> : null}
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.reason || "No reason given"}</span>
            {r.status === "reviewing" ? <span style={{ fontSize: 10.5, fontWeight: 700, color: C.amber, background: C.amberBg, borderRadius: 7, padding: "2px 6px" }}>BEING REVIEWED</span> : null}
            {(() => { const w = WAITED(r.created_at); return <span title="Target: acted on within 24 hours" style={{ fontSize: 11.5, color: w.late ? C.red : C.textMuted, fontWeight: w.late ? 700 : 400, marginLeft: "auto" }}>{w.text}</span>; })()}
          </div>
          {/* Both sides named. A reviewer cannot judge an accusation without knowing who it is
              about, and `reported_name` is stored at report time so it survives a rename. */}
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
            {"About "}
            {r.reported_id && onViewProfile && !String(r.reported_id).startsWith("group:")
              ? <span {...clickable(() => onViewProfile(r.reported_id))} style={{ color: C.blue, fontWeight: 700, cursor: "pointer" }}>{r.reported_name || "a climber"}</span>
              : <span style={{ fontWeight: 700 }}>{r.reported_name || "a climber"}</span>}
            {" · filed by " + (r.reporter_label || (r.reporter ? "a signed-in climber" : "someone signed out"))}
          </div>
          {/* WHAT WAS REPORTED, as the server copied it at report time -- the reporter cannot write this. */}
          {r.target_kind && (r.snapshot || (Array.isArray(r.snapshot_media) && r.snapshot_media.length)) ? <div style={{ marginTop: 7, background: C.surface, border: "1px solid " + C.borderLight, borderLeft: "3px solid " + C.red, borderRadius: 9, padding: "8px 10px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: 0.4, marginBottom: 3 }}>WHAT WAS REPORTED</div>
            {r.snapshot ? <div style={{ fontSize: 13, color: C.text, lineHeight: 1.45, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", overscrollBehavior: "contain" }}>{r.snapshot}</div> : null}
            {Array.isArray(r.snapshot_media) && r.snapshot_media.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{r.snapshot_media.filter((u) => typeof u === "string" && u).slice(0, 8).map((u, i) => <a key={i} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={"Reported image " + (i + 1)} loading="lazy" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 7, border: "1px solid " + C.border }} /></a>)}</div> : null}
          </div> : null}
          {r.detail ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{(r.target_kind ? "Reporter’s note: " : "") + r.detail}</div> : null}
          {r.target_kind ? <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            <button disabled={busy === r.id} onClick={() => act(r, "remove")}
              style={{ padding: "7px 11px", borderRadius: 9, border: "none", background: C.redSolid, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              {busy === r.id ? "Working…" : r.target_kind === "profile" ? "Clear bio & photos" : "Remove it"}
            </button>
            {r.target_kind !== "profile" ? <button disabled={busy === r.id} onClick={() => act(r, "keep")}
              style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.green + "55", background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              Keep it up
            </button> : null}
            {r.status !== "reviewing" ? <button disabled={busy === r.id} onClick={() => set(r, "reviewing")}
              style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.amber + "55", background: C.amberBg, color: C.amber, fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              I'm looking at this
            </button> : null}
          </div> : null}
          {r.target_kind ? null : <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
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
          </div>}
          {isAccount(r.reported_id) ? <div style={{ display: "flex", gap: 7, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>ACCOUNT:</span>
            <button disabled={busy === r.id} onClick={() => restrict(r, "suspended")}
              style={{ padding: "6px 10px", borderRadius: 9, border: "1px solid " + C.amber + "55", background: C.surface, color: C.amber, fontSize: 12, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              Suspend 7 days
            </button>
            <button disabled={busy === r.id} onClick={() => restrict(r, "banned")}
              style={{ padding: "6px 10px", borderRadius: 9, border: "1px solid " + C.red + "55", background: C.surface, color: C.red, fontSize: 12, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
              Ban
            </button>
          </div> : null}
        </div>
      ))}
    </div>
  );
}

// APPEALS (0264). The author of taken-down content, or a suspended climber, asked a person to look
// again. "Reverse" restores the content or reinstates the account through decide_appeal(), which
// runs the same audited functions a reviewer would use by hand; "Keep the decision" upholds it.
const APPEAL_KIND = { account: "Account suspension or ban", ...REPORT_KIND_LABEL };
export function AppealQueue({ notify }) {
  const { data, isLoading, error } = useOpenAppeals(true);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Loading appeals…</div>;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load appeals — " + ((error && error.message) || "try again") + ". Do not read this as 'no appeals'."}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No open appeals.</div>;
  const decide = (a, decision) => {
    setBusy(a.id);
    decideAppeal(a.id, decision)
      .then(() => { qc.invalidateQueries({ queryKey: ["open-appeals"] }); qc.invalidateQueries({ queryKey: ["admin-queue-counts"] }); notify && notify(decision === "reversed" ? (a.target_kind === "account" ? "Reinstated." : "Restored.") : "Decision kept."); })
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {data.map((a) => {
      const w = WAITED(a.created_at);
      const p = a.appellantProfile;
      const who = p ? (p.show_name && p.name ? p.name : p.username ? "@" + p.username : "a climber") : "a climber";
      return <div key={a.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.blue, background: C.blueBg, borderRadius: 7, padding: "2px 6px" }}>{(APPEAL_KIND[a.target_kind] || a.target_kind).toUpperCase()}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{"From " + who}</span>
          <span style={{ fontSize: 11.5, color: w.late ? C.red : C.textMuted, fontWeight: w.late ? 700 : 400, marginLeft: "auto" }}>{w.text}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{a.message}</div>
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          <button disabled={busy === a.id} onClick={() => decide(a, "reversed")} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.green + "55", background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: busy === a.id ? "default" : "pointer" }}>{busy === a.id ? "Working…" : a.target_kind === "account" ? "Reverse — reinstate" : "Reverse — restore it"}</button>
          <button disabled={busy === a.id} onClick={() => decide(a, "upheld")} style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: busy === a.id ? "default" : "pointer" }}>Keep the decision</button>
        </div>
      </div>;
    })}
  </div>;
}
