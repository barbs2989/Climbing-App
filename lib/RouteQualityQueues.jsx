// The owner's three route quality control queues (0307–0309), mounted in the Me tab's admin block.
//
//   FieldContributionQueue   — every held route edit, oldest first, clustered so "3 climbers suggested
//                              X" is one card. Approve, approve with an edited value, reject with a
//                              reason (a strike unless unticked), or lock the field at HIGH as it is.
//   RouteFlagQueue           — "this looks wrong" notes from climbers; mark fixed or dismiss, each
//                              telling the reporter.
//   ContributorStandingQueue — every climber with a strike or a hand-set standing; reset, warn,
//                              restrict or ban, with a reason the climber is shown.
//
// Gated on `useIsAdmin` by the caller, but that gate is cosmetic by design: every RPC re-checks
// is_admin() in SQL (0309), so a tampered client gets a refusal rather than a write. The clustering
// is `sameEditValue` — the same comparison the page used for its old 3-agree gate, guarded by
// check:consensus-clustering — and the server only verifies that clustered ids share a route and
// field. Every date is formatted through DLOCALE (check:date-locale).
import { useState, useEffect, useMemo } from "react";
import {
  useFieldContributions, approveFieldContribution, rejectFieldContribution, setRouteFieldConfidence,
  useContributionFields, useRouteRowsByIds, useOpenRouteFlags, resolveRouteFlag,
  useContributionStandings, setContributionStanding, fetchProfilesByIds,
} from "./db";
import { C, DLOCALE, sameEditValue, pubNameRow } from "../ClimbMatchCore";

const REASONS = [
  "Doesn’t match the guidebook or the climbers who logged it",
  "Can’t be checked from what was sent",
  "Already on the page, or not a correction",
  "Belongs in a different field",
  "Not about this route",
];

const when = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (_e) { return String(iso).slice(0, 10); } };
const isPrim = (v) => v == null || typeof v !== "object";
// One line per pitch / rappel / waypoint / variant, so a reviewer can read a structured value and
// see which rows changed.
function rowsOf(v) {
  if (!Array.isArray(v)) return null;
  if (!v.length || isPrim(v[0])) return null;
  return v.map(function (r, i) {
    if (!r || typeof r !== "object") return String(r);
    const head = r.pitch != null ? "P" + r.pitch : r.n != null ? "#" + r.n : r.name || r.label || ("row " + (i + 1));
    const rest = Object.keys(r).filter((k) => ["pitch", "n", "name", "label", "photos", "comments"].indexOf(k) < 0 && r[k] != null && r[k] !== "" && !(Array.isArray(r[k]) && !r[k].length))
      .map((k) => k + ": " + (isPrim(r[k]) ? String(r[k]) : JSON.stringify(r[k]))).join(" · ");
    return head + (rest ? " — " + rest : "");
  });
}
function fmtVal(v) {
  if (v == null || v === "") return "";
  if (isPrim(v)) return String(v);
  if (Array.isArray(v) && (!v.length || isPrim(v[0]))) return v.join(", ");
  const rows = rowsOf(v);
  if (rows) return rows.join("\n");
  return Object.keys(v).map((k) => k + ": " + (isPrim(v[k]) ? String(v[k]) : JSON.stringify(v[k]))).join("\n");
}
const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

function Val({ v, tone }) {
  const txt = fmtVal(v);
  return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.5, color: tone === "new" ? C.text : C.textSub, background: tone === "new" ? C.greenBg : C.surface, border: "1px solid " + (tone === "new" ? C.greenDim : C.border), borderRadius: 8, padding: "7px 9px", marginTop: 4, maxHeight: 220, overflowY: "auto", overscrollBehavior: "contain" }}>{txt || "(empty)"}</div>;
}
// Per-row diff for structured arrays (pitches, rappels, waypoints, ways in): which rows a proposal
// adds, changes or removes relative to the column as stored.
function RowDiff({ cur, nxt }) {
  const a = rowsOf(cur) || [], b = rowsOf(nxt);
  if (!b) return null;
  const aj = (cur || []).map((r) => JSON.stringify(r)), bj = (nxt || []).map((r) => JSON.stringify(r));
  const n = Math.max(a.length, b.length);
  const lines = [];
  for (let i = 0; i < n; i++) {
    const same = aj[i] != null && aj[i] === bj[i];
    const kind = i >= a.length ? "added" : i >= b.length ? "removed" : same ? "same" : "changed";
    lines.push({ kind, text: kind === "removed" ? a[i] : b[i] });
  }
  const col = { added: C.green, removed: C.red, changed: C.amber, same: C.textMuted };
  return <div style={{ marginTop: 6 }}>
    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.3 }}>ROW BY ROW</div>
    {lines.map((l, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: col[l.kind], textDecoration: l.kind === "removed" ? "line-through" : "none" }}>{(l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : l.kind === "changed" ? "~ " : "  ") + l.text}</div>)}
  </div>;
}

function useNames(ids) {
  const key = Array.from(new Set((ids || []).filter(Boolean))).sort().join(",");
  const [names, setNames] = useState({});
  useEffect(function () {
    if (!key) return;
    let live = true;
    fetchProfilesByIds(key.split(",")).then(function (rows) {
      if (!live) return;
      const m = {}; (rows || []).forEach(function (p) { m[p.id] = pubNameRow(p) || String(p.id).slice(0, 8); });
      setNames(m);
    }).catch(function () {});
    return function () { live = false; };
  }, [key]);
  return names;
}

const btn = (kind, busy) => ({
  padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", flex: 1,
  background: busy ? C.surface : kind === "ok" ? C.blueSolid : kind === "bad" ? C.redBg : C.surface,
  color: busy ? C.textMuted : kind === "ok" ? "#fff" : kind === "bad" ? C.red : C.textSub,
  border: kind === "ok" && !busy ? "none" : "1px solid " + (kind === "bad" ? C.red : C.border),
});
const fld = { width: "100%", background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" };
function Msg({ msg }) {
  if (!msg) return null;
  return <div role={msg.kind === "err" ? "alert" : "status"} style={{ background: msg.kind === "err" ? C.redBg : C.greenBg, color: msg.kind === "err" ? C.red : C.green, border: "1px solid " + (msg.kind === "err" ? C.red : C.greenDim), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{msg.text}</div>;
}

// ── 1. Held route edits ──────────────────────────────────────────────────────────────
export function FieldContributionQueue({ onOpenRoute }) {
  const q = useFieldContributions("pending");
  const fieldsQ = useContributionFields();
  const rows = q.data || [];
  const routeIds = useMemo(() => Array.from(new Set(rows.map((r) => r.route_id).filter(Boolean))), [rows]);
  const routesQ = useRouteRowsByIds(routeIds);
  const names = useNames(rows.map((r) => r.contributor));
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [mode, setMode] = useState({});     // clusterKey -> "edit" | "reject"
  const [draft, setDraft] = useState({});   // clusterKey -> text
  const [reason, setReason] = useState({}); // clusterKey -> text
  const [noStrike, setNoStrike] = useState({});

  const clusters = useMemo(function () {
    const by = {};
    rows.forEach(function (r) { const k = r.route_id + "\u0000" + r.field; (by[k] || (by[k] = [])).push(r); });
    const out = [];
    Object.keys(by).forEach(function (k) {
      const gs = [];
      by[k].forEach(function (r) {
        let g = null;
        for (let i = 0; i < gs.length; i++) if (sameEditValue(r.field, gs[i].rows[0].value, r.value)) { g = gs[i]; break; }
        if (!g) { g = { key: k + "\u0000" + gs.length, route_id: r.route_id, field: r.field, rows: [] }; gs.push(g); }
        g.rows.push(r);
      });
      gs.forEach(function (g) { g.who = Array.from(new Set(g.rows.map((r) => r.contributor))); out.push(g); });
    });
    out.sort((a, b) => String(a.rows[0].created_at).localeCompare(String(b.rows[0].created_at)));
    return out;
  }, [rows]);

  const act = async (key, fn, okText) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: "ok", text: okText }); setMode((m) => ({ ...m, [key]: null })); }
    catch (e) { setMsg({ kind: "err", text: (e && e.message) || "That did not go through." }); }
    finally { setBusy(null); }
  };
  const parseDraft = (g, text) => {
    const v0 = g.rows[0].value;
    if (typeof v0 === "number") { const n = Number(text); if (!Number.isFinite(n)) throw new Error("Enter a number."); return n; }
    if (typeof v0 === "string" || v0 == null) return String(text);
    if (Array.isArray(v0) && (!v0.length || isPrim(v0[0]))) return String(text).split(",").map((s) => s.trim()).filter(Boolean);
    try { return JSON.parse(text); } catch (_e) { throw new Error("The edited value must be valid JSON for this field."); }
  };
  const draftText = (g) => { const v = g.rows[0].value; return isPrim(v) ? String(v == null ? "" : v) : (Array.isArray(v) && (!v.length || isPrim(v[0]))) ? v.join(", ") : JSON.stringify(v, null, 1); };

  if (q.isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "8px 0" }}>Loading held edits…</div>;
  if (q.error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>Could not load the held edits — {(q.error && q.error.message) || "the request failed"}. This is not a report that there are none.</div>;

  return <div>
    <Msg msg={msg} />
    {!clusters.length ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>No route edits are waiting for review.</div>
      : clusters.map(function (g) {
        const r0 = g.rows[0];
        const f = (fieldsQ.data || {})[g.field];
        const label = (f && f.label) || g.field;
        const routeRow = (routesQ.data || {})[g.route_id];
        const cur = f && f.column_name && routeRow ? routeRow[f.column_name] : undefined;
        const name = (r0.routes && r0.routes.name) || g.route_id;
        const isBusy = busy === g.key;
        const m = mode[g.key];
        const also = g.rows.slice(1).map((r) => r.id);
        return <div key={g.key} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</div>
            <button onClick={() => onOpenRoute && onOpenRoute(g.route_id, name)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Open route →</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[r0.routes && r0.routes.discipline, "sent " + when(r0.created_at), g.who.length > 1 ? g.who.length + " climbers suggested this" : "by " + (names[r0.contributor] || String(r0.contributor || "").slice(0, 8))].filter(Boolean).join(" · ")}</div>
          <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: C.text }}>{label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, marginTop: 4 }}>{isEmpty(cur) ? "ON THE PAGE NOW: nothing" : "ON THE PAGE NOW"}</div>{!isEmpty(cur) ? <Val v={cur} /> : null}</div>
            <div><div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 4 }}>PROPOSED</div><Val v={r0.value} tone="new" /></div>
          </div>
          <RowDiff cur={cur} nxt={r0.value} />
          {m === "edit" ? <div style={{ marginTop: 9 }}>
            <textarea aria-label={"Edit the value for " + label} value={draft[g.key] != null ? draft[g.key] : draftText(g)} onChange={(e) => setDraft((d) => ({ ...d, [g.key]: e.target.value }))} rows={4} style={fld} />
            <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
              <button disabled={isBusy} style={btn("ok", isBusy)} onClick={() => act(g.key, async () => { const v = parseDraft(g, draft[g.key] != null ? draft[g.key] : draftText(g)); await approveFieldContribution(r0.id, v, also); }, "Approved with your edit — the field is now high confidence.")}>{isBusy ? "Working…" : "Approve edited value"}</button>
              <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => setMode((x) => ({ ...x, [g.key]: null }))}>Cancel</button>
            </div>
          </div> : m === "reject" ? <div style={{ marginTop: 9 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>{REASONS.map((t) => <button key={t} onClick={() => setReason((x) => ({ ...x, [g.key]: t }))} style={{ padding: "5px 8px", borderRadius: 14, border: "1px solid " + (reason[g.key] === t ? C.blue : C.border), background: reason[g.key] === t ? C.blueBg : C.surface, color: reason[g.key] === t ? C.blue : C.textSub, fontSize: 11.5, cursor: "pointer" }}>{t}</button>)}</div>
            <textarea aria-label="Why this edit is turned down (the climber reads this)" value={reason[g.key] || ""} onChange={(e) => setReason((x) => ({ ...x, [g.key]: e.target.value }))} rows={2} placeholder="Why? The climber is shown this (at least 10 characters)." style={fld} />
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textSub, marginTop: 6 }}><input type="checkbox" checked={!!noStrike[g.key]} onChange={(e) => setNoStrike((x) => ({ ...x, [g.key]: e.target.checked }))} /> Honest mistake — don’t count it as a strike</label>
            <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
              <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => act(g.key, () => rejectFieldContribution(r0.id, reason[g.key] || "", also, !noStrike[g.key]), noStrike[g.key] ? "Turned down; the climber was told. No strike." : "Turned down; the climber was told and it counts as a strike.")}>{isBusy ? "Working…" : "Confirm — turn down"}</button>
              <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => setMode((x) => ({ ...x, [g.key]: null }))}>Cancel</button>
            </div>
          </div> : <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
            <button disabled={isBusy} style={btn("ok", isBusy)} onClick={() => act(g.key, () => approveFieldContribution(r0.id, null, also), "Approved — it is on the page and the field is now high confidence.")}>{isBusy ? "Working…" : "Approve"}</button>
            <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => setMode((x) => ({ ...x, [g.key]: "edit" }))}>Edit &amp; approve</button>
            <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => setMode((x) => ({ ...x, [g.key]: "reject" }))}>Turn down</button>
            <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => act(g.key, async () => { await setRouteFieldConfidence(g.route_id, g.field, "high", "Locked by ClimbMatch as stored"); await rejectFieldContribution(r0.id, "The value on the page was checked and locked at high confidence; this edit was not applied.", also, false); }, "Locked as stored; the edit was turned down without a strike.")}>Keep &amp; lock</button>
          </div>}
        </div>;
      })}
  </div>;
}

// ── 2. Flags ─────────────────────────────────────────────────────────────────────────
export function RouteFlagQueue({ onOpenRoute }) {
  const q = useOpenRouteFlags(true);
  const fieldsQ = useContributionFields();
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [note, setNote] = useState({});
  const rows = q.data || [];
  if (q.isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "8px 0" }}>Loading flags…</div>;
  if (q.error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>Could not load the flags — {(q.error && q.error.message) || "the request failed"}. This is not a report that there are none.</div>;
  const act = async (id, status) => {
    setBusy(id); setMsg(null);
    try { await resolveRouteFlag(id, status, note[id] || ""); setMsg({ kind: "ok", text: status === "fixed" ? "Marked fixed — the reporter was thanked." : "Dismissed — the reporter was told." }); }
    catch (e) { setMsg({ kind: "err", text: (e && e.message) || "That did not go through." }); }
    finally { setBusy(null); }
  };
  return <div>
    <Msg msg={msg} />
    {!rows.length ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>No flags are open.</div>
      : rows.map(function (r) {
        const f = (fieldsQ.data || {})[r.field];
        const name = (r.routes && r.routes.name) || r.route_id;
        const isBusy = busy === r.id;
        return <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</div>
            <button onClick={() => onOpenRoute && onOpenRoute(r.route_id, name)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Open route →</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[r.field ? ((f && f.label) || r.field) : "Whole route", "flagged " + when(r.created_at), "by " + (r.reporterProfile ? (pubNameRow(r.reporterProfile) || "a climber") : "a climber")].join(" · ")}</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: 7, whiteSpace: "pre-wrap" }}>{"“" + r.note + "”"}</div>
          <textarea aria-label="Note to the reporter (optional)" value={note[r.id] || ""} onChange={(e) => setNote((x) => ({ ...x, [r.id]: e.target.value }))} rows={1} placeholder="Note to the reporter (optional)" style={{ ...fld, marginTop: 8 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
            <button disabled={isBusy} style={btn("ok", isBusy)} onClick={() => act(r.id, "fixed")}>{isBusy ? "Working…" : "Fixed it"}</button>
            <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => act(r.id, "dismissed")}>No change needed</button>
          </div>
        </div>;
      })}
  </div>;
}

// ── 3. Contributor standing ──────────────────────────────────────────────────────────
export function ContributorStandingQueue() {
  const q = useContributionStandings(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [reason, setReason] = useState({});
  const rows = q.data || [];
  if (q.isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "8px 0" }}>Loading contributor standing…</div>;
  if (q.error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>Could not load contributor standing — {(q.error && q.error.message) || "the request failed"}. This is not a report that nobody has a strike.</div>;
  const act = async (uid, status, days) => {
    setBusy(uid); setMsg(null);
    try { await setContributionStanding(uid, status, status === "ok" ? 0 : null, days, reason[uid] || ""); setMsg({ kind: "ok", text: status === "ok" ? "Reset — they can edit again and were told." : "Updated — they were told, with your reason." }); }
    catch (e) { setMsg({ kind: "err", text: (e && e.message) || "That did not go through." }); }
    finally { setBusy(null); }
  };
  const LBL = { ok: "OK", warned: "Warned", restricted: "Restricted", banned: "Banned from contributing" };
  return <div>
    <Msg msg={msg} />
    {!rows.length ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>Nobody has a strike.</div>
      : rows.map(function (r) {
        const isBusy = busy === r.user_id;
        const col = r.status === "banned" || r.status === "restricted" ? C.red : r.status === "warned" ? C.amber : C.green;
        return <div key={r.user_id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.profile ? (pubNameRow(r.profile) || "a climber") : String(r.user_id).slice(0, 8)}</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: col }}>{LBL[r.status] || r.status}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[r.strikes + " strike" + (r.strikes === 1 ? "" : "s"), r.last_strike_at ? "last " + when(r.last_strike_at) : null, r.until ? "until " + when(r.until) : null].filter(Boolean).join(" · ")}</div>
          {r.reason ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 5, lineHeight: 1.5 }}>{"Last reason: " + r.reason}</div> : null}
          <textarea aria-label="Reason the climber will be shown" value={reason[r.user_id] || ""} onChange={(e) => setReason((x) => ({ ...x, [r.user_id]: e.target.value }))} rows={1} placeholder="Reason the climber will be shown (needed for warn, restrict and ban)" style={{ ...fld, marginTop: 8 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
            <button disabled={isBusy} style={btn("ok", isBusy)} onClick={() => act(r.user_id, "ok", null)}>{isBusy ? "Working…" : "Reset strikes"}</button>
            <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => act(r.user_id, "warned", null)}>Warn</button>
            <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => act(r.user_id, "restricted", 90)}>Restrict 90 days</button>
            <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => act(r.user_id, "banned", null)}>Ban from contributing</button>
          </div>
        </div>;
      })}
  </div>;
}
