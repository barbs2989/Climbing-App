// The Review desk's newer sections (owner, 2026-11-24: "do all" of the admin-page list after the quality-control
// audit). ReviewDesk.jsx keeps the held-edits table; this file holds what was added around it:
//   HealthStrip     — oldest waiting item, median time to decide, last AI run, app errors today, live site vs main
//   HistorySection  — every decision (moderation_actions), newest first, with "Take back" on a live approval
//   FieldHistory    — every value one field has been sent, inside an expanded row
//   ClimbersSection — everyone who contributes: counts, approval rate, standing, reviewer switch, a drawer per climber
//   AppealsSection  — appeals against a contributing restriction or ban (decide_appeal)
//   LocksSection    — the hand-set confidence levels, with Unlock (back to the computed level)
//   WorklistSection — the data audits' findings (review_worklist, filled by scripts/review-worklist-load.mjs)
//   WordDiff        — a word-level diff of the page's text against the climber's
// Every write is an is_admin() / can_review() RPC in lib/db.js (0530). Nothing here writes a table directly.
import { useMemo, useState } from "react";
import {
  useModerationHistory, useFieldHistory, useDeskClimbers, useDeskClimber, setReviewer, withdrawApproval,
  useContributingAppeals, decideAppeal, useFieldLocks, setRouteFieldConfidence, useReviewWorklist, resolveWorklistItem, useDeskHealth,
} from "../lib/db";
import { ContributorStandingQueue } from "../lib/RouteQualityQueues";
import { C, DLOCALE } from "../ClimbMatchCore";

const BASE = import.meta.env.BASE_URL;
const isPrim = (v) => v == null || typeof v !== "object";
const show = (v) => (v == null || v === "" ? "" : isPrim(v) ? String(v) : JSON.stringify(v));
const clip = (s, n = 90) => { const t = String(s || "").replace(/\s+/g, " "); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const day = (iso) => { try { return new Date(iso).toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" }); } catch (_e) { return String(iso || "").slice(0, 10); } };
const ago = (iso) => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? "under an hour" : h < 48 ? Math.round(h) + " h" : Math.round(h / 24) + " days"; };
const who = (p, id) => (p ? (p.show_name === false && p.username ? "@" + p.username : p.name || (p.username ? "@" + p.username : null)) : null) || (id ? String(id).slice(0, 8) : "unknown");
const box = { whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.5, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", maxHeight: 240, overflowY: "auto", background: C.surface, color: C.textSub };
const Err = ({ e, what }) => e ? <div role="alert" style={{ color: C.red, fontSize: 13, margin: "8px 0" }}>Could not load {what} — {e.message}. This is not a report that there are none.</div> : null;
const Msg = ({ m }) => m ? <div role={m.ok ? "status" : "alert"} style={{ background: m.ok ? C.greenBg : C.redBg, color: m.ok ? C.green : C.red, border: "1px solid " + (m.ok ? C.greenDim : C.red), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, margin: "8px 0" }}>{m.text}</div> : null;
const routeLink = (id) => <a href={BASE + "?route=" + encodeURIComponent(id)} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}>open ↗</a>;
function useAct() {
  const [busy, setBusy] = useState(null), [msg, setMsg] = useState(null);
  const act = async (key, fn, ok) => { setBusy(key); setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); return true; } catch (e) { setMsg({ ok: false, text: (e && e.message) || "That did not go through." }); return false; } finally { setBusy(null); } };
  return { busy, msg, act };
}

// ── word diff ──────────────────────────────────────────────────────────────────────────────────────
// Longest-common-subsequence over words: removed words struck in red, added words in green. Long texts
// (over 1,500 words a side) are not diffed, so a pasted essay cannot stall the page.
export function WordDiff({ from, to }) {
  const parts = useMemo(() => {
    const a = String(from || "").split(/(\s+)/), b = String(to || "").split(/(\s+)/);
    if (a.length > 3000 || b.length > 3000) return null;
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { out.push([0, a[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push([-1, a[i++]]); else out.push([1, b[j++]]); }
    while (i < n) out.push([-1, a[i++]]); while (j < m) out.push([1, b[j++]]);
    return out;
  }, [from, to]);
  if (!parts) return <div style={{ ...box, color: C.textMuted }}>Too long to compare word by word.</div>;
  return <div style={box} aria-label="Changes, word by word">{parts.map(([k, t], i) => k === 0 ? <span key={i}>{t}</span>
    : k < 0 ? <del key={i} style={{ color: C.red, background: C.redBg }}>{t}</del> : <ins key={i} style={{ color: C.green, background: C.greenBg, textDecoration: "none" }}>{t}</ins>)}</div>;
}

// ── health strip ───────────────────────────────────────────────────────────────────────────────────
export function HealthStrip() {
  const q = useDeskHealth(true);
  const h = q.data;
  const cell = (label, value, warn) => <div style={{ border: "1px solid " + (warn ? C.amber : C.border), borderRadius: 9, padding: "6px 10px", minWidth: 130 }}>
    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 700, color: warn ? C.amber : C.text }}>{value}</div></div>;
  if (q.isLoading) return <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Checking the desk’s health…</div>;
  if (!h) return null;
  const unknown = "couldn’t check";
  const d = h.deploy;
  const live = !d ? unknown : !d.liveSha ? "no deployment found" : d.liveSha === d.headSha ? "serving the latest main" : "behind main (deploy " + day(d.liveAt) + ")";
  const aiAge = h.ai ? (Date.now() - Date.parse(h.ai)) / 864e5 : null;
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }} aria-label="Desk health">
    {cell("OLDEST WAITING", h.oldest == null ? unknown : h.oldest ? ago(h.oldest) : "nothing waiting", h.oldest && (Date.now() - Date.parse(h.oldest)) > 7 * 864e5)}
    {cell("MEDIAN TIME TO DECIDE (30 DAYS)", !h.decided ? unknown : h.decided.n ? (h.decided.medianH < 48 ? Math.round(h.decided.medianH) + " h" : Math.round(h.decided.medianH / 24) + " days") + " · " + h.decided.n + " decided" : "nothing decided yet")}
    {cell("AI CHECK LAST RAN", h.ai == null ? unknown : h.ai ? ago(h.ai) + " ago" : "never", aiAge != null && aiAge > 2)}
    {cell("APP ERRORS, LAST 24 H", h.errors == null ? unknown : String(h.errors), h.errors > 20)}
    {cell("LIVE SITE", live, !!(d && d.liveSha && d.liveSha !== d.headSha && Date.now() - Date.parse(d.headAt) > 3600e3))}
  </div>;
}

// ── field history (inside an expanded row) ─────────────────────────────────────────────────────────
const ST = { pending: ["Waiting", C.amber], approved: ["Approved", C.green], rejected: ["Turned down", C.red] };
export function FieldHistory({ routeId, areaId, field, label }) {
  const q = useFieldHistory(routeId, areaId, field);
  const [open, setOpen] = useState(false);
  const rows = q.data || [];
  return <div>
    <button type="button" className="rd-btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} every edit to {label}{q.data ? " (" + rows.length + ")" : ""}</button>
    {open ? <div style={{ marginTop: 8 }}>
      <Err e={q.error} what="this field's history" />
      {q.isLoading ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Loading…</div> : !rows.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>No edits on record.</div>
        : <table className="rd-table"><thead><tr><th>SENT</th><th>BY</th><th>VALUE</th><th>OUTCOME</th></tr></thead><tbody>{rows.map((r) => {
          const s = ST[r.status] || [r.status, C.textSub];
          const taken = /^Approval taken back:/.test(r.review_note || "");
          return <tr key={r.id}><td style={{ whiteSpace: "nowrap" }}>{day(r.created_at)}</td><td>{who(r.by, r.contributor)}</td>
            <td>{clip(show(r.applied_value != null ? r.applied_value : r.value), 140)}{r.applied_value != null ? <span style={{ color: C.textMuted }}> (adjusted)</span> : null}</td>
            <td><b style={{ color: s[1] }}>{taken ? "Taken back" : s[0]}</b>{r.reviewed_at ? " · " + day(r.reviewed_at) : ""}{r.decider ? " · " + who(r.decider, r.reviewed_by) : ""}{r.review_note && r.status === "rejected" ? <div style={{ color: C.textMuted, fontSize: 11.5 }}>{clip(r.review_note, 160)}</div> : null}</td></tr>;
        })}</tbody></table>}
    </div> : null}
  </div>;
}

// ── history ────────────────────────────────────────────────────────────────────────────────────────
const ACTION = {
  approve_contribution: "Approved", reject_contribution: "Turned down", withdraw_approval: "Approval taken back",
  flag_fixed: "Flag fixed", flag_dismissed: "Flag dismissed", lock_field: "Locked", unlock_field: "Unlocked",
  contrib_warn: "Warned", contrib_restrict: "Restricted", contrib_ban: "Banned from contributing", contrib_reinstate: "Reinstated",
  grant_reviewer: "Made a reviewer", revoke_reviewer: "No longer a reviewer",
  remove: "Removed", hold: "Held", restore: "Restored", auto_hold: "Held automatically", suspend: "Suspended", ban: "Banned", reinstate: "Account reinstated", remove_all: "Removed everything",
};
export function HistorySection({ admin }) {
  const q = useModerationHistory(true, 400);
  const { busy, msg, act } = useAct();
  const [f, setF] = useState({ action: "all", q: "" });
  const [undo, setUndo] = useState(null), [reason, setReason] = useState("");
  const rows = q.data || [];
  const shown = rows.filter((r) => (f.action === "all" || r.action === f.action) && (!f.q || ((r.note || "") + " " + who(r.ownerProfile, r.target_owner) + " " + ((r.contribution && ((r.contribution.routes && r.contribution.routes.name) || (r.contribution.areas && r.contribution.areas.name))) || "")).toLowerCase().includes(f.q.toLowerCase())));
  const actions = [...new Set(rows.map((r) => r.action))];
  return <div>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Every decision made on the desk, newest first{admin ? "" : " (edits and flags)"}. An approval that is still on the page can be taken back: the earlier value returns, the field unlocks, and the climber is told it was not a strike.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <select aria-label="Action" className="rd-sel" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}><option value="all">Every action</option>{actions.map((a) => <option key={a} value={a}>{ACTION[a] || a}</option>)}</select>
      <input aria-label="Search history" className="rd-in" placeholder="Search route, climber, note" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} style={{ flex: "1 1 200px" }} />
    </div>
    <Msg m={msg} /><Err e={q.error} what="the history" />
    {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : !shown.length ? <p style={{ color: C.textMuted }}>{rows.length ? "Nothing matches." : "No decisions yet."}</p>
      : <table className="rd-table"><thead><tr><th>WHEN</th><th>ACTION</th><th>WHAT</th><th>CLIMBER</th><th>BY</th><th></th></tr></thead><tbody>{shown.map((r) => {
        const c = r.contribution;
        const place = c ? ((c.routes && c.routes.name) || (c.areas && c.areas.name) || c.route_id || c.area_id) : null;
        const canUndo = r.action === "approve_contribution" && c && c.kind === "field" && c.status === "approved";
        return [<tr key={r.id}>
          <td style={{ whiteSpace: "nowrap" }}>{day(r.created_at)}</td>
          <td><b>{ACTION[r.action] || r.action}</b></td>
          <td>{place ? <>{place} · {c.field || c.kind} {c.route_id ? routeLink(c.route_id) : null}{c && c.status === "rejected" && r.action === "approve_contribution" ? <span style={{ color: C.textMuted }}> · since taken back</span> : null}</> : clip(r.note, 120)}</td>
          <td>{r.target_owner ? who(r.ownerProfile, r.target_owner) : "—"}</td>
          <td>{r.actor ? who(r.actorProfile, r.actor) : "system"}</td>
          <td>{canUndo ? <button className="rd-btn" disabled={!!busy} onClick={() => { setUndo(undo === r.id ? null : r.id); setReason(""); }}>Take back…</button> : null}</td>
        </tr>, undo === r.id ? <tr key={r.id + ":u"} className="rd-detail"><td colSpan={6}><div style={{ display: "grid", gap: 6, padding: "6px 4px 12px" }}>
          <div style={{ fontSize: 12.5 }}>Now on the page: <b>{clip(show(c.applied_value != null ? c.applied_value : c.value), 200)}</b>. {c.prior_value ? <>Before it: <b>{clip(show(c.prior_value.v), 200) || "(empty)"}</b>.</> : "The value before it was not recorded (approved before 0530); a grade or area value will ask you to use Edit value instead."}</div>
          <textarea className="rd-in" rows={2} aria-label="Why it is taken back (the climber reads this)" placeholder="Why? The climber is shown this (at least 10 characters). Not a strike." value={reason} onChange={(e) => setReason(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}><button className="rd-btn rd-bad" disabled={!!busy || reason.trim().length < 10} onClick={async () => { if (await act(r.id, () => withdrawApproval(c.id, reason.trim()), (place || "Edit") + " — approval taken back; the earlier value is on the page.")) { setUndo(null); q.refetch(); } }}>{busy === r.id ? "Working…" : "Confirm — take back"}</button>
            <button className="rd-btn" onClick={() => setUndo(null)}>Cancel</button></div>
        </div></td></tr> : null];
      })}</tbody></table>}
  </div>;
}

// ── climbers ───────────────────────────────────────────────────────────────────────────────────────
function ClimberDrawer({ c, admin, onClose }) {
  const q = useDeskClimber(c.id);
  const { busy, msg, act } = useAct();
  const d = q.data;
  return <div role="dialog" aria-modal="true" aria-label={"Climber: " + who(c.profile, c.id)} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", height: "100%", overflowY: "auto", overscrollBehavior: "contain", background: C.bg || C.surface, borderLeft: "1px solid " + C.border, padding: 16, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ fontSize: 17, margin: 0 }}>{who(c.profile, c.id)}</h2>
        <button className="rd-btn" aria-label="Close" onClick={onClose} style={{ marginLeft: "auto" }} autoFocus>Close</button></div>
      <div style={{ fontSize: 12.5, color: C.textSub, margin: "6px 0 10px" }}>{c.sent} sent · {c.approved} approved · {c.rejected} turned down · {c.pending} waiting · {c.flags} flags{c.joined ? " · joined " + day(c.joined) : ""}</div>
      <div style={{ fontSize: 12.5, marginBottom: 10 }}>Standing: <b>{c.standing ? c.standing.status + " · " + c.standing.strikes + " strike" + (c.standing.strikes === 1 ? "" : "s") : "ok"}</b>{c.standing && c.standing.until ? " until " + day(c.standing.until) : ""}{c.standing && c.standing.reason ? <div style={{ color: C.textMuted }}>{c.standing.reason}</div> : null}</div>
      {admin && !c.admin ? <button className="rd-btn" disabled={!!busy} onClick={() => act("rev", () => setReviewer(c.id, !c.reviewer), c.reviewer ? "No longer a reviewer." : "Now a reviewer: they can open this desk, approve, turn down and take back edits, and resolve flags. They cannot ban, lock or decide appeals.")}>{c.reviewer ? "Remove reviewer role" : "Make reviewer"}</button> : null}
      <Msg m={msg} /><Err e={q.error} what="this climber's record" />
      {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : d ? <>
        <h3 style={{ fontSize: 14, margin: "14px 0 6px" }}>Contributions ({d.contributions.length})</h3>
        {d.contributions.map((x) => { const s = ST[x.status] || [x.status, C.textSub]; return <div key={x.id} style={{ borderTop: "1px solid " + C.borderLight, padding: "6px 0", fontSize: 12.5 }}>
          <b style={{ color: s[1] }}>{/^Approval taken back:/.test(x.review_note || "") ? "Taken back" : s[0]}</b> · {x.kind === "field" ? x.field : x.kind} · {(x.routes && x.routes.name) || (x.areas && x.areas.name) || x.route_id || x.area_id || ""} · {day(x.created_at)}
          <div style={{ color: C.textSub }}>{clip(show(x.applied_value != null ? x.applied_value : x.value), 200)}</div>
          {x.reason ? <div style={{ color: C.textMuted }}>Why: {clip(x.reason, 200)}</div> : null}{x.review_note && x.status === "rejected" ? <div style={{ color: C.textMuted }}>Reason given: {clip(x.review_note, 200)}</div> : null}</div>; })}
        <h3 style={{ fontSize: 14, margin: "14px 0 6px" }}>Flags ({d.flags.length})</h3>
        {d.flags.map((x) => <div key={x.id} style={{ borderTop: "1px solid " + C.borderLight, padding: "6px 0", fontSize: 12.5 }}><b>{x.status}</b> · {(x.routes && x.routes.name) || x.route_id} · {x.field || "whole route"} · {day(x.created_at)}<div style={{ color: C.textSub }}>“{clip(x.note, 200)}”</div></div>)}
      </> : null}
    </div>
  </div>;
}
export function ClimbersSection({ admin }) {
  const q = useDeskClimbers(true);
  const [sel, setSel] = useState(null), [s, setS] = useState("");
  const rows = (q.data || []).filter((c) => !s || who(c.profile, c.id).toLowerCase().includes(s.toLowerCase()));
  const rate = (c) => (c.approved + c.rejected ? Math.round((100 * c.approved) / (c.approved + c.rejected)) + "%" : "—");
  return <div>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Everyone who has sent an edit, a flag, a climb or an area. Approval rate counts decided edits only. Open a climber for everything they sent{admin ? ", and to make them a reviewer" : ""}.</p>
    <input aria-label="Search climbers" className="rd-in" placeholder="Search by name" value={s} onChange={(e) => setS(e.target.value)} style={{ marginBottom: 10, width: "min(320px,100%)" }} />
    <Err e={q.error} what="climbers" />
    {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : !rows.length ? <p style={{ color: C.textMuted }}>No climbers have contributed yet.</p>
      : <table className="rd-table"><thead><tr><th>CLIMBER</th><th>SENT</th><th>APPROVED</th><th>TURNED DOWN</th><th>WAITING</th><th>FLAGS</th><th>RATE</th><th>STANDING</th></tr></thead><tbody>{rows.map((c) =>
        <tr key={c.id} className="rd-row" tabIndex={0} onClick={() => setSel(c)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(c); } }}>
          <td><b>{who(c.profile, c.id)}</b>{c.admin ? <span style={{ color: C.textMuted }}> · admin</span> : c.reviewer ? <span style={{ color: C.blue }}> · reviewer</span> : null}</td>
          <td>{c.sent}</td><td>{c.approved}</td><td>{c.rejected}</td><td>{c.pending}</td><td>{c.flags}</td><td>{rate(c)}</td>
          <td style={{ color: c.standing && c.standing.status !== "ok" ? C.red : C.textSub }}>{c.standing ? c.standing.status + (c.standing.strikes ? " · " + c.standing.strikes : "") : "ok"}</td></tr>)}</tbody></table>}
    {admin ? <><h2 style={{ fontSize: 15, margin: "20px 0 8px" }}>Contributor standing</h2>
      <p style={{ fontSize: 12.5, color: C.textMuted, marginTop: 0 }}>Climbers with turned-down edits: warned at 1 strike, paused for 90 days at 3, closed at 5. Reset, warn, restrict or ban by hand here.</p>
      <div style={{ maxWidth: 640 }}><ContributorStandingQueue /></div></> : null}
    {sel ? <ClimberDrawer c={sel} admin={admin} onClose={() => { setSel(null); q.refetch(); }} /> : null}
  </div>;
}

// ── appeals ────────────────────────────────────────────────────────────────────────────────────────
export function AppealsSection() {
  const q = useContributingAppeals(true);
  const { busy, msg, act } = useAct();
  const [notes, setNotes] = useState({});
  const rows = q.data || [];
  return <div style={{ maxWidth: 720 }}>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Climbers whose contributing was paused or closed by strikes, asking for another look. Reverse resets their standing to ok with no strikes; keep leaves it as it is. Your note is kept with the decision.</p>
    <Msg m={msg} /><Err e={q.error} what="appeals" />
    {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : !rows.length ? <p style={{ color: C.textMuted }}>No appeals.</p> : rows.map((a) =>
      <div key={a.id} style={{ border: "1px solid " + C.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13 }}><b>{who(a.profile, a.appellant)}</b> · {day(a.created_at)} · <b style={{ color: a.status === "open" ? C.amber : C.textSub }}>{a.status}</b></div>
        <div style={{ fontSize: 12.5, color: C.textSub, margin: "4px 0" }}>Standing now: {a.standing ? a.standing.status + " · " + a.standing.strikes + " strikes" + (a.standing.until ? " until " + day(a.standing.until) : "") : "ok"}{a.standing && a.standing.reason ? " — " + a.standing.reason : ""}</div>
        <div style={box}>{a.message}</div>
        {a.status === "open" ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <input className="rd-in" aria-label="Note kept with the decision (optional)" placeholder="Note (optional)" value={notes[a.id] || ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} style={{ flex: "1 1 200px" }} />
          <button className="rd-btn rd-ok" disabled={!!busy} onClick={() => act(a.id, () => decideAppeal(a.id, "reversed", notes[a.id]), "Appeal granted: standing reset to ok.")}>Reverse — let them contribute</button>
          <button className="rd-btn rd-bad" disabled={!!busy} onClick={() => act(a.id, () => decideAppeal(a.id, "upheld", notes[a.id]), "Appeal turned down: standing kept.")}>Keep the decision</button>
        </div> : a.decision_note ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Note: {a.decision_note}</div> : null}
      </div>)}
  </div>;
}

// ── locks ──────────────────────────────────────────────────────────────────────────────────────────
export function LocksSection() {
  const [s, setS] = useState(""), [term, setTerm] = useState("");
  const q = useFieldLocks(true, term);
  const { busy, msg, act } = useAct();
  const d = q.data;
  return <div>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Field levels set by hand or by an approval. High is locked: climbers can only flag it. Unlock sends a field back to the level the app computes from the route.</p>
    <form onSubmit={(e) => { e.preventDefault(); setTerm(s); }} style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      <input aria-label="Route name or id" className="rd-in" placeholder="Route name or id" value={s} onChange={(e) => setS(e.target.value)} style={{ flex: "1 1 220px" }} />
      <button className="rd-btn" type="submit">Search</button>{term ? <button className="rd-btn" type="button" onClick={() => { setS(""); setTerm(""); }}>Clear</button> : null}
    </form>
    <Msg m={msg} /><Err e={q.error} what="the locks" />
    {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : !d || !d.rows.length ? <p style={{ color: C.textMuted }}>{term ? "No hand-set levels on routes matching that." : "No hand-set levels."}</p> : <>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{d.total > d.rows.length ? "Showing the newest " + d.rows.length + " of " + d.total.toLocaleString() + ". Search to narrow." : d.total + " in all."}</div>
      <table className="rd-table"><thead><tr><th>ROUTE</th><th>FIELD</th><th>LEVEL</th><th>WHY</th><th>SET</th><th></th></tr></thead><tbody>{d.rows.map((r) =>
        <tr key={r.route_id + ":" + r.field}><td><b>{(r.routes && r.routes.name) || r.route_id}</b> {routeLink(r.route_id)}</td><td>{r.field}</td>
          <td style={{ color: r.level === "high" ? C.green : r.level === "low" ? C.red : C.textSub, fontWeight: 700 }}>{r.level}{r.level === "high" ? " · locked" : ""}</td>
          <td>{clip(r.reason, 80)}</td><td style={{ whiteSpace: "nowrap" }}>{r.set_at ? day(r.set_at) : "—"}</td>
          <td><button className="rd-btn" disabled={!!busy} onClick={async () => { if (await act(r.route_id + r.field, () => setRouteFieldConfidence(r.route_id, r.field, null, "Unlocked on the Review desk"), ((r.routes && r.routes.name) || r.route_id) + " · " + r.field + " is back to its computed level.")) q.refetch(); }}>Unlock</button></td></tr>)}</tbody></table></>}
  </div>;
}

// ── worklist ───────────────────────────────────────────────────────────────────────────────────────
export function WorklistSection() {
  const [status, setStatus] = useState("open"), [src, setSrc] = useState("all");
  const q = useReviewWorklist(true, status);
  const { busy, msg, act } = useAct();
  const [notes, setNotes] = useState({});
  const rows = q.data || [];
  const sources = [...new Set(rows.map((r) => r.audit))].sort();
  const shown = rows.filter((r) => src === "all" || r.audit === src);
  return <div>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>What the data audits found: impossible numbers, closures that may have expired, descriptions that disagree with their own stats. Filled by <code>node scripts/review-worklist-load.mjs</code>; a re-run closes what it no longer finds and reopens what comes back. Mark an item done once the route is fixed, or ignore it if the audit is wrong.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <select aria-label="Status" className="rd-sel" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="done">Done</option><option value="ignored">Ignored</option><option value="all">Everything</option></select>
      <select aria-label="Audit" className="rd-sel" value={src} onChange={(e) => setSrc(e.target.value)}><option value="all">Every audit</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <span style={{ fontSize: 12.5, color: C.textSub, alignSelf: "center" }}>{shown.length} item{shown.length === 1 ? "" : "s"}</span>
    </div>
    <Msg m={msg} /><Err e={q.error} what="the worklist" />
    {q.isLoading ? <p style={{ color: C.textMuted }}>Loading…</p> : !shown.length ? <p style={{ color: C.textMuted }}>{status === "open" ? "Nothing open. Run the loader to refresh it." : "Nothing here."}</p>
      : <table className="rd-table"><thead><tr><th>FOUND</th><th>AUDIT</th><th>FINDING</th><th></th></tr></thead><tbody>{shown.map((r) =>
        <tr key={r.id}><td style={{ whiteSpace: "nowrap" }}>{day(r.found_at)}</td><td style={{ color: C.textSub }}>{r.audit}</td>
          <td><b>{r.title}</b> {r.route_id ? routeLink(r.route_id) : null}{r.detail ? <div style={{ color: C.textSub, fontSize: 12, whiteSpace: "pre-wrap" }}>{clip(r.detail, 400)}</div> : null}{r.note ? <div style={{ color: C.textMuted, fontSize: 11.5 }}>Note: {r.note}</div> : null}</td>
          <td style={{ minWidth: 180 }}>{r.status === "open" ? <div style={{ display: "grid", gap: 4 }}>
            <input className="rd-in" aria-label="Note (optional)" placeholder="Note (optional)" value={notes[r.id] || ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <div style={{ display: "flex", gap: 6 }}><button className="rd-btn rd-ok" disabled={!!busy} onClick={async () => { if (await act(r.id, () => resolveWorklistItem(r.id, "done", notes[r.id]), "Marked done.")) q.refetch(); }}>Done</button>
              <button className="rd-btn" disabled={!!busy} onClick={async () => { if (await act(r.id, () => resolveWorklistItem(r.id, "ignored", notes[r.id]), "Ignored; the loader will not reopen it.")) q.refetch(); }}>Ignore</button></div></div>
            : <button className="rd-btn" disabled={!!busy} onClick={async () => { if (await act(r.id, () => resolveWorklistItem(r.id, "open", null), "Reopened.")) q.refetch(); }}>Reopen</button>}</td></tr>)}</tbody></table>}
  </div>;
}
