// The Review desk's SAFETY section (review.html#safety; owner, 2026-11-26: "I would like it so that it gets pushed
// to my admin dashboard so that I can review it, and what ways can we act upon that as the admin").
//
// Four lists, all admin-only (RLS, 0158/0156/0264) and every button an audited, is_admin()-checked write:
//   Waiting        — user_reports open/reviewing: a climber, or a piece of content with the server's copy of it (0263)
//   Reported photos — content_reports on route photos (0156)
//   Appeals        — moderation_appeals against a removal, a suspension or a ban (0264); 'contributing' appeals
//                    stay in the desk's Appeals section
//   Closed         — the last 100 decided reports, so a decision can be found again
// Actions: remove / hide / keep the content (moderate_content), mark the report, suspend / ban / reinstate the
// account (set_account_standing), and decide an appeal (decide_appeal). Each new report, reported photo or appeal
// also puts a notice in every admin's bell (0551). The "How to decide" panel is the written policy the
// App Store and Google Play reviewers expect a developer to follow (docs/APP-STORE-READINESS-AUDIT.md).
import { useState } from "react";
import {
  useSafetyReports, reviewUserReport, moderateContent, setAccountStanding, usePhotoReports, dismissPhotoReport,
  takeDownReportedPhoto, useSafetyAppeals, decideAppeal, isAccountId, useAdminQueueCounts,
} from "../lib/db";
import { C, DLOCALE } from "../ClimbMatchCore";
import { safeHref } from "../lib/safeUrl.js";

const BASE = import.meta.env.BASE_URL;
const KIND = {
  message: "Direct message", crew_message: "Crew chat message", group_post: "Group post", group_event: "Group event",
  comment: "Comment", trip_report: "Trip report", group: "Group", topo: "Topo", topo_line: "Topo line", list: "List",
  profile: "Profile", account: "Account suspension or ban",
};
// The reasons that put somebody's safety at stake rise to the top of the list, whatever their age.
const SEVERE = /danger|child|threat|violence|unsafe|sexual|private information/i;
const PHOTO_REASON = { not_this_route: "Not this route", inappropriate: "Inappropriate", not_their_photo: "Not their photo", other: "Something else" };
const day = (iso) => { try { return new Date(iso).toLocaleString(DLOCALE, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (_e) { return String(iso || "").slice(0, 16); } };
const waited = (iso) => {
  if (!iso) return { text: "", late: false };
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  return { text: h < 1 ? "waiting under an hour" : h < 48 ? "waiting " + Math.floor(h) + " h" : "waiting " + Math.floor(h / 24) + " days", late: h >= 20 };
};
const nameOf = (p, fallback) => (p ? (p.show_name === false && p.username ? "@" + p.username : p.name || (p.username ? "@" + p.username : null)) : null) || fallback || "a climber";
const box = { whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.5, border: "1px solid " + C.border, borderLeft: "3px solid " + C.red, borderRadius: 8, padding: "8px 10px", maxHeight: 220, overflowY: "auto", background: C.surface, color: C.text };
const card = { border: "1px solid " + C.border, borderRadius: 10, padding: 12, marginBottom: 10, background: C.card };
const small = { fontSize: 12, color: C.textMuted };
const Err = ({ e, what }) => e ? <div role="alert" style={{ color: C.red, fontSize: 13, margin: "8px 0" }}>Could not load {what} — {e.message}. This is not a report that there are none.</div> : null;

function useAct() {
  const [busy, setBusy] = useState(null), [msg, setMsg] = useState(null);
  const act = async (key, fn, ok) => { setBusy(key); setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); return true; } catch (e) { setMsg({ ok: false, text: (e && e.message) || "That did not go through." }); return false; } finally { setBusy(null); } };
  const Msg = () => msg ? <div role={msg.ok ? "status" : "alert"} style={{ background: msg.ok ? C.greenBg : C.redBg, color: msg.ok ? C.green : C.red, border: "1px solid " + (msg.ok ? C.greenDim : C.red), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, margin: "8px 0" }}>{msg.text}</div> : null;
  return { busy, act, Msg };
}

export default function SafetySection() {
  const [tab, setTab] = useState("waiting");
  const counts = useAdminQueueCounts(true).data || null;
  const openQ = useSafetyReports(tab === "waiting", true);
  const photosQ = usePhotoReports(tab === "photos" || tab === "waiting");
  const appealsQ = useSafetyAppeals(true);
  const openAppeals = (appealsQ.data || []).filter((a) => a.status === "open").length;
  const nOpen = openQ.data ? openQ.data.length : null, nPhotos = photosQ.data ? photosQ.data.length : null;
  const oldest = counts && counts.safetyOldestAt ? waited(counts.safetyOldestAt) : null;
  const TABS = [["waiting", "Waiting" + (nOpen != null ? " · " + nOpen : "")], ["photos", "Reported photos" + (nPhotos != null ? " · " + nPhotos : "")], ["appeals", "Appeals" + (openAppeals ? " · " + openAppeals : "")], ["closed", "Closed"], ["rules", "How to decide"]];
  return <div style={{ maxWidth: 760 }}>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>
      Reports climbers filed about other climbers or what they posted, content automatic screening held, reported route photos, and appeals. The Community Guidelines promise a person reads every report and aims to act within 24 hours (App Store guideline 1.2 and Google Play’s user-generated content policy both require acting on reports). Each new one also lands in your bell in the app.
      {oldest && oldest.text ? <b style={{ color: oldest.late ? C.red : C.textSub }}>{" Oldest: " + oldest.text + "."}</b> : null}
    </p>
    <div role="tablist" aria-label="Safety lists" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={"rd-btn" + (tab === k ? " rd-ok" : "")} onClick={() => setTab(k)}>{l}</button>)}
    </div>
    {tab === "waiting" ? <ReportList q={openQ} open /> : tab === "photos" ? <PhotoList q={photosQ} /> : tab === "appeals" ? <AppealList q={appealsQ} /> : tab === "closed" ? <ClosedList /> : <Rules />}
  </div>;
}

function ClosedList() {
  const q = useSafetyReports(true, false);
  return <ReportList q={q} open={false} />;
}

function ReportList({ q, open }) {
  const rows = (q.data || []).slice();
  if (open) rows.sort((a, b) => (SEVERE.test(b.reason || "") ? 1 : 0) - (SEVERE.test(a.reason || "") ? 1 : 0) || String(a.created_at).localeCompare(String(b.created_at)));
  return <div>
    <Err e={q.error} what="reports" />
    {q.isLoading ? <p style={small}>Loading…</p> : !q.error && !rows.length ? <p style={small}>{open ? "No reports waiting." : "No closed reports yet."}</p> : rows.map((r) => <ReportCard key={r.id} r={r} open={open} />)}
  </div>;
}

function ReportCard({ r, open }) {
  const { busy, act, Msg } = useAct();
  const [note, setNote] = useState("");
  const [acct, setAcct] = useState(null); // null | "suspended" | "banned" | "active"
  const [days, setDays] = useState(7);
  const [wipe, setWipe] = useState(true);
  const [why, setWhy] = useState("Breaking the Community Guidelines — " + (r.reason || "reported by other climbers"));
  const w = waited(r.created_at), severe = SEVERE.test(r.reason || "");
  const kind = r.target_kind ? (KIND[r.target_kind] || r.target_kind) : "Climber";
  const who = nameOf(r.reportedProfile, r.reported_name);
  const account = isAccountId(r.reported_id);
  const st = r.standing && r.standing.status !== "active" ? r.standing : null;
  const b = !!busy;
  return <div style={{ ...card, borderColor: severe && open ? C.red : C.border }}>
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, color: C.blue, background: C.blueBg, borderRadius: 7, padding: "2px 6px" }}>{kind.toUpperCase()}</span>
      <b style={{ fontSize: 13.5, color: severe ? C.red : C.text }}>{r.reason || "No reason given"}</b>
      {r.status === "reviewing" ? <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>BEING LOOKED AT</span> : null}
      {!open ? <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>{r.status === "actioned" ? "ACTIONED" : "DISMISSED"}{r.reviewed_at ? " " + day(r.reviewed_at) : ""}</span> : null}
      {open ? <span title="Target: acted on within 24 hours" style={{ marginLeft: "auto", fontSize: 12, color: w.late ? C.red : C.textMuted, fontWeight: w.late ? 700 : 400 }}>{w.text}</span> : null}
    </div>
    <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4 }}>
      About <b>{who}</b>{r.reportedProfile && r.reportedProfile.username ? " (@" + r.reportedProfile.username + ")" : ""}
      {account ? " · " + r.reportsAbout + (r.reportsAbout === 1 ? " report about them ever" : " reports about them ever") : ""}
      {st ? <b style={{ color: C.red }}>{" · " + st.status + (st.until ? " until " + day(st.until) : "")}</b> : null}
      {" · filed by " + (r.reporter ? nameOf(r.reporterProfile, "a signed-in climber") : (r.reporter_label || "someone signed out")) + " " + day(r.created_at)}
    </div>
    {r.snapshot || (Array.isArray(r.snapshot_media) && r.snapshot_media.length) ? <div style={{ marginTop: 7 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: 0.4, marginBottom: 3 }}>WHAT WAS REPORTED (copied by the server{r.snapshot_at ? " " + day(r.snapshot_at) : ""})</div>
      {r.snapshot ? <div style={box}>{r.snapshot}</div> : null}
      {Array.isArray(r.snapshot_media) && r.snapshot_media.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{r.snapshot_media.filter((u) => typeof u === "string" && u).slice(0, 8).map((u, i) =>
        <a key={i} href={safeHref(u)} target="_blank" rel="noopener noreferrer"><img src={u} alt={"Reported image " + (i + 1)} loading="lazy" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 7, border: "1px solid " + C.border, filter: "blur(6px)" }} /></a>)}
        <span style={small}>Blurred; open one to see it full size.</span></div> : null}
    </div> : null}
    {r.detail ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, whiteSpace: "pre-wrap" }}><b>Reporter’s note:</b> {r.detail}</div> : null}
    <Msg />
    {open ? <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9, alignItems: "center" }}>
        {r.target_kind ? <>
          <input className="rd-in" aria-label="Note kept with the decision (optional)" placeholder="Note kept with the decision (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: "1 1 200px" }} />
          <button className="rd-btn rd-bad" disabled={b} onClick={() => act("rm", () => moderateContent(r.target_kind, r.target_id, "remove", r.id, note), r.target_kind === "profile" ? "Profile bio and photos cleared; every report about it is closed." : "Removed for everyone but its author, who is told why and can appeal. Every report about it is closed.")}>{r.target_kind === "profile" ? "Clear bio & photos" : "Remove it"}</button>
          {r.target_kind !== "profile" ? <button className="rd-btn" disabled={b} onClick={() => act("hold", () => moderateContent(r.target_kind, r.target_id, "hold", r.id, note), "Hidden from everyone but its author while you decide.")}>Hide while I decide</button> : null}
          {r.target_kind !== "profile" ? <button className="rd-btn rd-ok" disabled={b} onClick={() => act("keep", () => moderateContent(r.target_kind, r.target_id, "restore", r.id, note), "Kept up; every report about it is dismissed.")}>Keep it up</button> : null}
        </> : <>
          <button className="rd-btn rd-ok" disabled={b} onClick={() => act("ac", () => reviewUserReport(r.id, "actioned"), "Marked actioned.")}>Actioned</button>
          <button className="rd-btn" disabled={b} onClick={() => act("di", () => reviewUserReport(r.id, "dismissed"), "Dismissed.")}>Dismiss</button>
        </>}
        {r.status !== "reviewing" ? <button className="rd-btn" disabled={b} onClick={() => act("rv", () => reviewUserReport(r.id, "reviewing"), "Marked as being looked at.")}>I’m looking at this</button> : null}
        {r.target_kind && r.target_kind !== "profile" ? <button className="rd-btn" disabled={b} onClick={() => act("di", () => reviewUserReport(r.id, "dismissed"), "This report is dismissed; the content was not touched.")}>Dismiss report only</button> : null}
      </div>
    </> : null}
    {account ? <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px dashed " + C.border }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.textMuted }}>ACCOUNT</span>
        <button className="rd-btn" disabled={b} aria-expanded={acct === "suspended"} onClick={() => setAcct(acct === "suspended" ? null : "suspended")}>Suspend…</button>
        <button className="rd-btn rd-bad" disabled={b} aria-expanded={acct === "banned"} onClick={() => setAcct(acct === "banned" ? null : "banned")}>Ban…</button>
        {st ? <button className="rd-btn rd-ok" disabled={b} aria-expanded={acct === "active"} onClick={() => setAcct(acct === "active" ? null : "active")}>Reinstate…</button> : null}
      </div>
      {acct ? <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
        <label style={small}>What {who} will be shown (they can appeal):
          <input className="rd-in" value={why} onChange={(e) => setWhy(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 3 }} /></label>
        {acct === "suspended" ? <label style={small}>For <select className="rd-sel" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 3, 7, 30, 90, 365].map((d) => <option key={d} value={d}>{d === 1 ? "1 day" : d + " days"}</option>)}</select> — they can sign in and read, but cannot post, message, comment or send friend requests.</label> : null}
        {acct === "banned" ? <label style={{ ...small, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={wipe} onChange={(e) => setWipe(e.target.checked)} /> Also remove everything they posted</label> : null}
        <div><button className={"rd-btn " + (acct === "active" ? "rd-ok" : "rd-bad")} disabled={b || (acct !== "active" && !why.trim())}
          onClick={() => act("acct", () => setAccountStanding(r.reported_id, acct, acct === "suspended" ? days : null, acct === "active" ? "Reinstated" : why.trim(), acct === "banned" && wipe, r.id),
            acct === "banned" ? who + " is banned: they cannot sign in" + (wipe ? ", and what they posted is removed." : ".") : acct === "suspended" ? who + " is suspended for " + days + " days." : who + " is reinstated.").then((ok) => { if (ok) setAcct(null); })}>
          {acct === "banned" ? "Ban " + who : acct === "suspended" ? "Suspend " + who + " " + days + (days === 1 ? " day" : " days") : "Reinstate " + who}</button></div>
      </div> : null}
    </div> : null}
  </div>;
}

function PhotoList({ q }) {
  const { busy, act, Msg } = useAct();
  const rows = q.data || [];
  return <div>
    <Msg /><Err e={q.error} what="reported photos" />
    {q.isLoading ? <p style={small}>Loading…</p> : !q.error && !rows.length ? <p style={small}>No reported photos.</p> : rows.map((r) => {
      const v = r.contributions && r.contributions.value;
      const url = v && typeof v === "object" ? v.url : typeof v === "string" ? v : null;
      const w = waited(r.created_at);
      return <div key={r.id} style={{ ...card, display: "flex", gap: 10 }}>
        {url ? <a href={safeHref(url)} target="_blank" rel="noopener noreferrer"><img src={url} alt="Reported photo" loading="lazy" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, filter: "blur(6px)" }} /></a>
          : <div style={{ width: 84, height: 84, borderRadius: 8, background: C.surface, ...small, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>photo missing</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8 }}><b style={{ fontSize: 13.5 }}>{PHOTO_REASON[r.reason] || r.reason}</b><span style={{ marginLeft: "auto", fontSize: 12, color: w.late ? C.red : C.textMuted, fontWeight: w.late ? 700 : 400 }}>{w.text}</span></div>
          <div style={small}>{r.route_id ? <a href={safeHref(BASE + "?route=" + encodeURIComponent(r.route_id))} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>{r.route_id} ↗</a> : "route unknown"} · blurred; open it to see it full size</div>
          {r.detail ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4 }}>{r.detail}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button className="rd-btn rd-ok" disabled={!!busy} onClick={() => act(r.id, () => dismissPhotoReport(r.id), "Kept up; report dismissed.")}>Keep it up</button>
            <button className="rd-btn rd-bad" disabled={!!busy || !r.contribution_id} onClick={() => act(r.id, () => takeDownReportedPhoto(r.contribution_id, url), "Photo taken down and its file deleted.")}>Take down</button>
          </div>
        </div>
      </div>;
    })}
  </div>;
}

function AppealList({ q }) {
  const { busy, act, Msg } = useAct();
  const [notes, setNotes] = useState({});
  const rows = q.data || [];
  return <div>
    <p style={{ ...small, marginTop: 0, lineHeight: 1.5 }}>Someone asked for another look at a removal, a suspension or a ban. Reverse puts the content back or reinstates the account; Keep leaves the decision as it is. A person must decide every appeal (the Terms promise it).</p>
    <Msg /><Err e={q.error} what="appeals" />
    {q.isLoading ? <p style={small}>Loading…</p> : !q.error && !rows.length ? <p style={small}>No appeals.</p> : rows.map((a) => <div key={a.id} style={card}>
      <div style={{ fontSize: 13 }}><b>{nameOf(a.profile)}</b> · {KIND[a.target_kind] || a.target_kind} · {day(a.created_at)} · <b style={{ color: a.status === "open" ? C.amber : C.textSub }}>{a.status}</b></div>
      {a.target_kind === "account" && a.standing ? <div style={small}>Standing now: {a.standing.status}{a.standing.until ? " until " + day(a.standing.until) : ""} — {a.standing.reason}</div> : null}
      {a.lastAction ? <div style={small}>What was done: {a.lastAction.action} {day(a.lastAction.created_at)}{a.lastAction.note ? " — " + a.lastAction.note : ""}</div> : null}
      <div style={{ ...box, borderLeft: "1px solid " + C.border, marginTop: 6 }}>{a.message}</div>
      {a.status === "open" ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <input className="rd-in" aria-label="Note kept with the decision (optional)" placeholder="Note (optional)" value={notes[a.id] || ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} style={{ flex: "1 1 200px" }} />
        <button className="rd-btn rd-ok" disabled={!!busy} onClick={() => act(a.id, () => decideAppeal(a.id, "reversed", notes[a.id]), "Appeal granted: " + (a.target_kind === "account" ? "the account is reinstated." : "the content is back."))}>Reverse</button>
        <button className="rd-btn rd-bad" disabled={!!busy} onClick={() => act(a.id, () => decideAppeal(a.id, "upheld", notes[a.id]), "Appeal turned down: the decision stands.")}>Keep the decision</button>
      </div> : a.decision_note ? <div style={{ ...small, marginTop: 6 }}>Note: {a.decision_note}</div> : null}
    </div>)}
  </div>;
}

// The enforcement guide. Kept short and concrete so it is followed; the reasoning and sources are in
// docs/APP-STORE-READINESS-AUDIT.md.
const RULES = [
  ["Every report: within 24 hours", "Open it, read what the server copied, decide, and press one of the buttons. If you need longer, press “I’m looking at this” so the reporter sees it is being handled. Severe reasons are listed first, whatever their age."],
  ["A child at risk, or sexual content involving a minor", "Do not download, screenshot, forward or re-share it. Remove it, ban the account with “also remove everything they posted”, and report it to the NCMEC CyberTipline (report.cybertip.org) the same day; US law requires it once you know. Keep the report row: it is the record. Never send such an image to any AI tool."],
  ["Threats, violence, or someone in danger", "If anyone may be in immediate danger, call 911 (or the local emergency number) first. Remove the content and ban or suspend. Note what you did in the decision note."],
  ["Harassment, hate, sexual content between adults, doxxing (private information)", "Remove the content. First time: suspend 7 days. Again, or severe: ban."],
  ["Spam, scams, fake profiles, impersonation", "Ban and remove everything they posted. A real person impersonated: clear the profile and ban."],
  ["Dangerous or false safety information, wrong photos", "Remove it, or keep it up if it is a fair disagreement about conditions. Usually no account action."],
  ["Not a rule break", "Keep it up / Dismiss. The reporter can still block the person; blocking is theirs to choose."],
  ["Appeals", "Read the appeal and what was done. Reverse if the decision was wrong or too harsh, otherwise keep it. Add a note; it is kept with the decision."],
  ["What the reporter sees", "That ClimbMatch Safety reviewed it (“Closed”), never what was decided about someone else."],
];
function Rules() {
  return <div>
    {RULES.map(([h, t]) => <div key={h} style={{ ...card, padding: "10px 12px" }}><b style={{ fontSize: 13.5 }}>{h}</b><div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, marginTop: 3 }}>{t}</div></div>)}
  </div>;
}
