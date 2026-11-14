// The owner's Review desk (owner, 2026-11-14): "when someone flags it, I as the owner need a way to
// check their flag and recommendation of edit … in a database or table way … not part of the app in
// the menu." One table holds every HELD route/area edit (contributions kind 'field', status
// 'pending') and every OPEN route flag (route_flags). Beside each one is what the nightly AI checker
// concluded (review_ai_verdicts, 0433): agree / disagree / partly / unsure, how well sourced, the
// value it thinks is right, and its sources.
//
// The AI never acts. Every button here is one of the existing is_admin()-checked RPCs (0309) through
// lib/db.js, the same calls the old Menu queues made, so this page adds no new write path:
//   edit  → Approve · Use AI value (approve with the AI's value) · Turn down · Keep & lock
//   flag  → Use AI value (files the value as the owner's own edit, approves it, marks the flag
//           fixed — an admin's edit passes the high-confidence lock, 0308) · Fixed it · No change
// Identical edits cluster with sameEditValue, exactly as the old queue did.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../src/AuthContext.tsx";
import { supabase } from "../lib/supabase";
import {
  useIsAdmin, useFieldContributions, useOpenRouteFlags, useContributionFields, useRouteRowsByIds,
  useAreaEditRowsByIds, approveFieldContribution, rejectFieldContribution, setRouteFieldConfidence,
  resolveRouteFlag, submitContribution, REMOVAL_NOTE,
} from "../lib/db";
import { C, DLOCALE, sameEditValue } from "../ClimbMatchCore";
import { AREA_EDIT_FIELDS } from "../lib/areaFields";

const BASE = import.meta.env.BASE_URL;
const NONE = [];

// ── value display ────────────────────────────────────────────────────────────────────
const isPrim = (v) => v == null || typeof v !== "object";
const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
function fmtVal(v) {
  if (isEmpty(v)) return "";
  if (isPrim(v)) return String(v);
  if (Array.isArray(v)) {
    if (isPrim(v[0])) return v.join(", ");
    return v.map((r, i) => {
      if (!r || typeof r !== "object") return String(r);
      const head = r.pitch != null ? "P" + r.pitch : r.n != null ? "#" + r.n : r.name || r.label || r.item || "row " + (i + 1);
      const rest = Object.keys(r).filter((k) => !["pitch", "n", "name", "label", "item", "photos", "comments"].includes(k) && !isEmpty(r[k]))
        .map((k) => k + ": " + (isPrim(r[k]) ? String(r[k]) : JSON.stringify(r[k]))).join(" · ");
      return head + (rest ? " — " + rest : "");
    }).join("\n");
  }
  return Object.keys(v).map((k) => k + ": " + (isPrim(v[k]) ? String(v[k]) : JSON.stringify(v[k]))).join("\n");
}
const short = (v, n = 90) => { const t = fmtVal(v).replace(/\s+/g, " "); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const when = (iso) => { try { return new Date(iso).toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (_e) { return String(iso || "").slice(0, 10); } };
const ageDays = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

// ── AI verdicts (0433) ───────────────────────────────────────────────────────────────
function useAiVerdicts(enabled) {
  return useQuery({
    queryKey: ["review-ai-verdicts"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("review_ai_verdicts")
        .select("item_kind,item_id,item_hash,ai_value,verdict,confidence,sources,reasoning,model,checked_at").limit(5000);
      if (error) throw error;
      const by = {}; (data || []).forEach((v) => { by[v.item_kind + ":" + v.item_id] = v; });
      return by;
    },
  });
}
const VERDICT = {
  agree: { label: "AI agrees", col: C.green, bg: C.greenBg },
  disagree: { label: "AI disagrees", col: C.red, bg: C.redBg },
  partly: { label: "Partly right", col: C.amber, bg: C.amberBg },
  unsure: { label: "AI unsure", col: C.textSub, bg: C.surface },
  none: { label: "Not checked yet", col: C.textMuted, bg: "transparent" },
};
function VerdictChip({ v }) {
  const k = v ? v.verdict : "none";
  const s = VERDICT[k] || VERDICT.none;
  return <span style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 700, color: s.col, background: s.bg, border: "1px solid " + (k === "none" ? C.border : s.col), borderRadius: 12, padding: "2px 8px" }}>
    {s.label}{v && v.confidence !== "none" ? " · " + v.confidence : ""}
  </span>;
}

// ── styles ───────────────────────────────────────────────────────────────────────────
const CSS = `
.rd-table{width:100%;border-collapse:collapse;font-size:13px}
.rd-table th{position:sticky;top:0;background:${C.surface};color:${C.textMuted};font-size:11px;font-weight:700;letter-spacing:.3px;text-align:left;padding:8px;border-bottom:1px solid ${C.border};cursor:pointer;user-select:none;white-space:nowrap;z-index:1}
.rd-table td{padding:8px;border-bottom:1px solid ${C.borderLight};vertical-align:top;line-height:1.4}
.rd-row{cursor:pointer}
.rd-row:hover td{background:${C.card}}
.rd-row.rd-open td{background:${C.card}}
.rd-lab{display:none}
@media (max-width:760px){
  .rd-table thead{display:none}
  .rd-table,.rd-table tbody,.rd-table tr,.rd-table td{display:block;width:100%;box-sizing:border-box}
  .rd-row{border:1px solid ${C.border};border-radius:10px;margin-bottom:8px;padding:4px 0;background:${C.card}}
  .rd-table td{border:none;padding:3px 10px}
  .rd-lab{display:inline;color:${C.textMuted};font-size:11px;font-weight:700;margin-right:6px}
  .rd-detail td{padding:0}
}
.rd-btn{padding:8px 11px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid ${C.border};background:${C.surface};color:${C.textSub};min-height:36px}
.rd-btn:disabled{opacity:.55;cursor:default}
.rd-ok{background:${C.blueSolid};color:#fff;border-color:${C.blueSolid}}
.rd-ai{background:${C.greenBg};color:${C.green};border-color:${C.greenDim}}
.rd-bad{background:${C.redBg};color:${C.red};border-color:${C.red}}
.rd-sel,.rd-in{background:${C.surface};color:${C.text};border:1px solid ${C.border};border-radius:8px;padding:7px 9px;font-size:12.5px;font-family:inherit}
`;
const box = { whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.5, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", maxHeight: 240, overflowY: "auto", background: C.surface, color: C.textSub };

// ── gate ─────────────────────────────────────────────────────────────────────────────
export default function ReviewDesk() {
  const { user, loading } = useAuth();
  const admin = useIsAdmin(user && user.id);
  const page = (body) => <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 16px 60px" }}><style>{CSS}</style>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Review desk</h1>
      <span style={{ fontSize: 12.5, color: C.textMuted }}>Climber flags and suggested edits, each checked by AI overnight. Nothing changes until you act.</span>
      <a href={BASE} style={{ marginLeft: "auto", color: C.blue, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Open ClimbMatch →</a>
    </header>{body}</div>;
  if (!supabase) return page(<p>This build has no database connection.</p>);
  if (loading || (user && admin.isLoading)) return page(<p style={{ color: C.textMuted }}>Checking who is signed in…</p>);
  if (!user) return page(<p>Sign in on <a href={BASE} style={{ color: C.blue }}>ClimbMatch</a> with the owner account, then reload this page.</p>);
  if (admin.error) return page(<p role="alert" style={{ color: C.red }}>Could not check your account — {admin.error.message}. Reload to try again.</p>);
  if (!admin.data) return page(<p>Owner only. This account cannot review edits.</p>);
  return page(<Desk />);
}

// ── the table ────────────────────────────────────────────────────────────────────────
function Desk() {
  const editsQ = useFieldContributions("pending", 1000);
  const flagsQ = useOpenRouteFlags(true);
  const fieldsQ = useContributionFields();
  const aiQ = useAiVerdicts(true);
  const edits = editsQ.data || NONE, flags = flagsQ.data || NONE;
  const routeIds = useMemo(() => Array.from(new Set([...edits.map((r) => r.route_id), ...flags.map((f) => f.route_id)].filter(Boolean))), [edits, flags]);
  const routesQ = useRouteRowsByIds(routeIds);
  const areaIds = useMemo(() => Array.from(new Set(edits.filter((r) => r.area_id && !r.route_id).map((r) => r.area_id))), [edits]);
  const areasQ = useAreaEditRowsByIds(areaIds);

  const [f, setF] = useState({ type: "all", verdict: "all", state: "all", field: "all", q: "" });
  const [sort, setSort] = useState({ k: "age", dir: -1 });
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const rows = useMemo(() => {
    const fields = fieldsQ.data || {}, routes = routesQ.data || {}, areas = areasQ.data || {}, ai = aiQ.data || {};
    const out = [];
    // Held edits, clustered by target + field + sameEditValue (the old queue's rule).
    const by = {};
    edits.forEach((r) => { const k = (r.route_id || "area:" + r.area_id) + "\u0000" + r.field; (by[k] || (by[k] = [])).push(r); });
    Object.keys(by).forEach((k) => {
      const gs = [];
      by[k].forEach((r) => {
        let g = gs.find((x) => sameEditValue(r.field, x[0].value, r.value));
        if (!g) { g = []; gs.push(g); }
        g.push(r);
      });
      gs.forEach((g) => {
        const r0 = g[0];
        const isArea = !!(r0.area_id && !r0.route_id);
        const af = isArea ? AREA_EDIT_FIELDS.find((x) => x.k === r0.field) : null;
        const cf = isArea ? null : fields[r0.field];
        const route = routes[r0.route_id];
        const areaRow = isArea ? areas[r0.area_id] : null;
        const verdict = g.map((x) => ai["contribution:" + x.id]).find(Boolean) || null;
        out.push({
          key: "e:" + r0.id, kind: "edit", ids: g.map((x) => x.id), route_id: r0.route_id, area_id: isArea ? r0.area_id : null, field: r0.field,
          label: isArea ? ((af && af.label) || r0.field) : ((cf && cf.label) || r0.field),
          name: isArea ? ((r0.areas && r0.areas.name) || r0.area_id) : ((r0.routes && r0.routes.name) || (route && route.name) || r0.route_id),
          state: String(r0.route_id || r0.area_id || "").split("_")[0].toUpperCase(),
          cur: isArea ? (areaRow && af && af.cur ? af.cur(areaRow) : undefined) : (cf && route ? route[cf.column_name] : undefined),
          said: r0.value, note: g.map((x) => x.reason).filter(Boolean).join(" | "),
          removes: g.some((x) => x.review_note === REMOVAL_NOTE), climbers: new Set(g.map((x) => x.contributor)).size,
          created_at: r0.created_at, ai: verdict,
        });
      });
    });
    flags.forEach((fl) => {
      const cf = fields[fl.field];
      const route = routes[fl.route_id];
      out.push({
        key: "f:" + fl.id, kind: "flag", ids: [fl.id], route_id: fl.route_id, area_id: null, field: fl.field,
        label: fl.field ? ((cf && cf.label) || fl.field) : "Whole route",
        name: (fl.routes && fl.routes.name) || fl.route_id, state: String(fl.route_id || "").split("_")[0].toUpperCase(),
        cur: cf && route ? route[cf.column_name] : undefined, said: undefined, note: fl.note, removes: false, climbers: 1,
        created_at: fl.created_at, ai: ai["flag:" + fl.id] || null,
      });
    });
    return out;
  }, [edits, flags, fieldsQ.data, routesQ.data, areasQ.data, aiQ.data]);

  const states = useMemo(() => Array.from(new Set(rows.map((r) => r.state))).filter(Boolean).sort(), [rows]);
  const fieldsList = useMemo(() => Array.from(new Set(rows.map((r) => r.label))).sort(), [rows]);
  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const vRank = { disagree: 0, partly: 1, unsure: 2, agree: 3 };
    return rows.filter((r) => (f.type === "all" || r.kind === f.type)
      && (f.verdict === "all" || (f.verdict === "none" ? !r.ai : r.ai && r.ai.verdict === f.verdict))
      && (f.state === "all" || r.state === f.state) && (f.field === "all" || r.label === f.field)
      && (!q || (r.name + " " + r.note + " " + fmtVal(r.said)).toLowerCase().includes(q)))
      .sort((a, b) => {
        const k = sort.k;
        const va = k === "age" ? a.created_at : k === "route" ? String(a.name).toLowerCase() : k === "field" ? a.label : k === "verdict" ? (a.ai ? vRank[a.ai.verdict] : 9) : a.kind;
        const vb = k === "age" ? b.created_at : k === "route" ? String(b.name).toLowerCase() : k === "field" ? b.label : k === "verdict" ? (b.ai ? vRank[b.ai.verdict] : 9) : b.kind;
        return (va < vb ? -1 : va > vb ? 1 : 0) * (k === "age" ? -sort.dir : sort.dir);
      });
  }, [rows, f, sort]);

  const act = async (row, fn, ok) => {
    setBusy(row.key); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: row.name + " — " + ok }); setOpen(null); }
    catch (e) { setMsg({ ok: false, text: row.name + " — " + ((e && e.message) || "that did not go through.") }); }
    finally { setBusy(null); }
  };
  // Bulk: edits the AI agrees with at 2-source confidence, approved as the climber sent them.
  const bulk = shown.filter((r) => r.kind === "edit" && r.ai && r.ai.verdict === "agree" && r.ai.confidence === "2-source" && !r.removes);
  const runBulk = async () => {
    if (!window.confirm("Approve " + bulk.length + " edit(s) the AI confirmed with two independent sources?")) return;
    setBusy("bulk"); setMsg(null);
    let done = 0; const failed = [];
    for (const r of bulk) {
      try { await approveFieldContribution(r.ids[0], null, r.ids.slice(1)); done++; } catch (e) { failed.push(r.name + ": " + ((e && e.message) || "failed")); }
    }
    setBusy(null);
    setMsg({ ok: !failed.length, text: "Approved " + done + " of " + bulk.length + "." + (failed.length ? " Not approved — " + failed.join("; ") : "") });
  };

  const loadErr = editsQ.error || flagsQ.error;
  const counts = { edits: rows.filter((r) => r.kind === "edit").length, flags: rows.filter((r) => r.kind === "flag").length, unchecked: rows.filter((r) => !r.ai).length };
  const th = (k, label) => <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : 1 }))} aria-sort={sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>{label}{sort.k === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</th>;

  return <div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 12.5, color: C.textSub }}>{counts.edits} edit{counts.edits === 1 ? "" : "s"} · {counts.flags} flag{counts.flags === 1 ? "" : "s"} · {counts.unchecked} not yet checked by AI{aiQ.error ? " (AI verdicts could not load: " + aiQ.error.message + ")" : ""}</span>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <select aria-label="Type" className="rd-sel" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="all">Edits + flags</option><option value="edit">Suggested edits</option><option value="flag">Flags</option></select>
      <select aria-label="AI verdict" className="rd-sel" value={f.verdict} onChange={(e) => setF({ ...f, verdict: e.target.value })}><option value="all">Any AI verdict</option><option value="agree">AI agrees</option><option value="disagree">AI disagrees</option><option value="partly">Partly right</option><option value="unsure">AI unsure</option><option value="none">Not checked yet</option></select>
      <select aria-label="State" className="rd-sel" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}><option value="all">All states</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <select aria-label="Field" className="rd-sel" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}><option value="all">All fields</option>{fieldsList.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <input aria-label="Search" className="rd-in" placeholder="Search route, note, value" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} style={{ flex: "1 1 180px" }} />
      {bulk.length ? <button className="rd-btn rd-ok" disabled={!!busy} onClick={runBulk}>{busy === "bulk" ? "Approving…" : (bulk.length === 1 ? "Approve the 1 edit" : "Approve all " + bulk.length + " edits") + " the AI confirmed (2 sources)"}</button> : null}
    </div>
    {msg ? <div role={msg.ok ? "status" : "alert"} style={{ background: msg.ok ? C.greenBg : C.redBg, color: msg.ok ? C.green : C.red, border: "1px solid " + (msg.ok ? C.greenDim : C.red), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, marginBottom: 10 }}>{msg.text}</div> : null}
    {loadErr ? <div role="alert" style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>Could not load the queue — {loadErr.message}. This is not a report that it is empty.</div> : null}
    {editsQ.isLoading || flagsQ.isLoading ? <p style={{ color: C.textMuted }}>Loading the queue…</p>
      : !shown.length ? <p style={{ color: C.textMuted }}>{rows.length ? "Nothing matches these filters." : "Nothing to review — no held edits and no open flags."}</p>
      : <table className="rd-table">
        <thead><tr>{th("kind", "TYPE")}{th("route", "ROUTE")}{th("field", "FIELD")}<th>ON THE PAGE NOW</th><th>CLIMBER SAYS</th>{th("verdict", "AI VERDICT")}<th>AI VALUE</th>{th("age", "AGE")}</tr></thead>
        <tbody>{shown.map((r) => {
          const isOpen = open === r.key;
          return [
            <tr key={r.key} className={"rd-row" + (isOpen ? " rd-open" : "")} onClick={() => setOpen(isOpen ? null : r.key)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : r.key); } }} aria-expanded={isOpen}>
              <td><span className="rd-lab">Type</span><span style={{ fontWeight: 700, color: r.kind === "flag" ? C.orange : C.blue }}>{r.kind === "flag" ? "⚑ Flag" : "✎ Edit"}</span>{r.climbers > 1 ? <span style={{ color: C.textMuted }}> ×{r.climbers}</span> : null}{r.removes ? <div style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>removes</div> : null}</td>
              <td><span className="rd-lab">Route</span><span style={{ fontWeight: 700 }}>{r.name}</span> <span style={{ color: C.textMuted, fontSize: 11.5 }}>{r.state}{r.area_id ? " · area" : ""}</span></td>
              <td><span className="rd-lab">Field</span>{r.label}</td>
              <td style={{ color: C.textSub }}><span className="rd-lab">Now</span>{isEmpty(r.cur) ? <i style={{ color: C.textMuted }}>empty</i> : short(r.cur)}</td>
              <td><span className="rd-lab">Climber</span>{r.kind === "flag" ? <i>“{short(r.note, 120)}”</i> : short(r.said)}</td>
              <td><span className="rd-lab">AI</span><VerdictChip v={r.ai} /></td>
              <td><span className="rd-lab">AI value</span>{r.ai && !isEmpty(r.ai.ai_value) ? short(r.ai.ai_value) : <span style={{ color: C.textMuted }}>—</span>}</td>
              <td style={{ whiteSpace: "nowrap", color: C.textMuted }}><span className="rd-lab">Age</span>{when(r.created_at)} · {ageDays(r.created_at)}d</td>
            </tr>,
            isOpen ? <tr key={r.key + ":d"} className="rd-detail"><td colSpan={8}><Detail row={r} busy={busy === r.key} act={act} /></td></tr> : null,
          ];
        })}</tbody>
      </table>}
  </div>;
}

// ── one item, expanded ───────────────────────────────────────────────────────────────
function Detail({ row: r, busy, act }) {
  const ai = r.ai;
  const [mode, setMode] = useState(null); // "reject" | "edit"
  const [reason, setReason] = useState(ai && ai.verdict === "disagree" ? ai.reasoning.slice(0, 500) : "");
  const [noStrike, setNoStrike] = useState(false);
  const [draft, setDraft] = useState(() => { const v = ai && !isEmpty(ai.ai_value) ? ai.ai_value : r.said; return isPrim(v) ? String(v == null ? "" : v) : JSON.stringify(v, null, 1); });
  const [note, setNote] = useState("");
  const parse = (text) => {
    const ref = ai && !isEmpty(ai.ai_value) ? ai.ai_value : r.said !== undefined ? r.said : r.cur;
    if (typeof ref === "number") { const n = Number(text); if (!Number.isFinite(n)) throw new Error("Enter a number."); return n; }
    if (ref == null || typeof ref === "string") return String(text);
    try { return JSON.parse(text); } catch (_e) { throw new Error("The value must be valid JSON for this field."); }
  };
  const routeHref = r.route_id ? BASE + "?route=" + encodeURIComponent(r.route_id) : null;
  // A flag fixed with a value: file it as the owner's own edit (admins pass the lock, 0308), approve
  // that edit, then close the flag — so the page, the confidence lock and the reporter all update.
  const fixFlagWith = async (value) => {
    if (!r.field) throw new Error("This flag is about the whole route — open the route and fix it there.");
    const c = await submitContribution({ route_id: r.route_id, kind: "field", field: r.field, value });
    if (!c || !c.id) throw new Error("The edit was not saved.");
    await approveFieldContribution(c.id, null, []);
    await resolveRouteFlag(r.ids[0], "fixed", note || "Thanks — corrected.");
  };
  const aiVal = ai && !isEmpty(ai.ai_value) ? ai.ai_value : null;

  return <div style={{ padding: "10px 4px 16px", display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
      <div><div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>ON THE PAGE NOW</div><div style={box}>{fmtVal(r.cur) || "(empty)"}</div></div>
      <div><div style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{r.kind === "flag" ? "CLIMBER’S FLAG" : "CLIMBER SUGGESTS" + (r.climbers > 1 ? " (" + r.climbers + " climbers)" : "")}</div>
        <div style={box}>{r.kind === "flag" ? "“" + r.note + "”" : fmtVal(r.said) || "(empty)"}</div>
        {r.kind === "edit" && r.note ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}><b>Why:</b> {r.note}</div> : null}
        {r.removes ? <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginTop: 4 }}>This edit removes something from the page.</div> : null}</div>
      <div><div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>AI THINKS IT SHOULD BE</div><div style={{ ...box, borderColor: aiVal ? C.greenDim : C.border }}>{aiVal ? fmtVal(aiVal) : ai ? "(no value proposed)" : "(not checked yet)"}</div></div>
    </div>
    {ai ? <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
      <div><VerdictChip v={ai} /> <span style={{ color: C.textMuted, fontSize: 11.5 }}>checked {when(ai.checked_at)}{ai.model ? " · " + ai.model : ""}</span></div>
      <p style={{ margin: "6px 0", color: C.text }}>{ai.reasoning}</p>
      {(ai.sources || []).length ? <ol style={{ margin: 0, paddingLeft: 20, color: C.textSub }}>{ai.sources.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>
        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>{s.title || s.url}</a>{s.official ? <span style={{ color: C.green, fontWeight: 700 }}> · official</span> : null}
        {s.quote ? <div style={{ fontStyle: "italic" }}>“{s.quote}”</div> : null}
      </li>)}</ol> : <div style={{ color: C.textMuted }}>No sources found.</div>}
    </div> : <div style={{ fontSize: 12.5, color: C.textMuted }}>The AI has not checked this one yet; it runs nightly.</div>}

    {mode === "reject" ? <div style={{ display: "grid", gap: 6 }}>
      <textarea className="rd-in" rows={3} aria-label="Why this edit is turned down (the climber reads this)" placeholder="Why? The climber is shown this (at least 10 characters)." value={reason} onChange={(e) => setReason(e.target.value)} />
      <label style={{ fontSize: 12, color: C.textSub, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={noStrike} onChange={(e) => setNoStrike(e.target.checked)} /> Honest mistake — don’t count it as a strike</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="rd-btn rd-bad" disabled={busy} onClick={() => act(r, () => rejectFieldContribution(r.ids[0], reason, r.ids.slice(1), !noStrike), !noStrike ? "turned down with a strike; the climber was told." : "turned down; the climber was told.")}>{busy ? "Working…" : "Confirm — turn down"}</button>
        <button className="rd-btn" onClick={() => setMode(null)}>Cancel</button>
      </div>
    </div> : mode === "edit" ? <div style={{ display: "grid", gap: 6 }}>
      <textarea className="rd-in" rows={4} aria-label={"Value for " + r.label} value={draft} onChange={(e) => setDraft(e.target.value)} />
      {r.kind === "flag" ? <input className="rd-in" aria-label="Note to the reporter (optional)" placeholder="Note to the reporter (optional)" value={note} onChange={(e) => setNote(e.target.value)} /> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="rd-btn rd-ok" disabled={busy} onClick={() => act(r, async () => { const v = parse(draft); if (r.kind === "flag") await fixFlagWith(v); else await approveFieldContribution(r.ids[0], v, r.ids.slice(1)); }, "saved your value; the field is now locked.")}>{busy ? "Working…" : "Save this value"}</button>
        <button className="rd-btn" onClick={() => setMode(null)}>Cancel</button>
      </div>
    </div> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {r.kind === "edit" ? <>
        <button className="rd-btn rd-ok" disabled={busy} onClick={() => act(r, () => approveFieldContribution(r.ids[0], null, r.ids.slice(1)), "approved; it is on the page and locked.")}>{busy ? "Working…" : "Approve climber’s edit"}</button>
        {aiVal ? <button className="rd-btn rd-ai" disabled={busy} onClick={() => act(r, () => approveFieldContribution(r.ids[0], aiVal, r.ids.slice(1)), "approved with the AI’s value; locked.")}>Use AI value</button> : null}
        <button className="rd-btn" disabled={busy} onClick={() => setMode("edit")}>Edit value…</button>
        <button className="rd-btn rd-bad" disabled={busy} onClick={() => setMode("reject")}>Turn down…</button>
        {r.area_id ? null : <button className="rd-btn" disabled={busy} onClick={() => act(r, async () => { await setRouteFieldConfidence(r.route_id, r.field, "high", "Locked by ClimbMatch as stored"); await rejectFieldContribution(r.ids[0], "The value on the page was checked and locked at high confidence; this edit was not applied.", r.ids.slice(1), false); }, "kept as stored and locked; edit turned down without a strike.")}>Keep page value &amp; lock</button>}
      </> : <>
        {aiVal && r.field ? <button className="rd-btn rd-ai" disabled={busy} onClick={() => act(r, () => fixFlagWith(aiVal), "fixed with the AI’s value; the reporter was thanked.")}>Use AI value</button> : null}
        {r.field ? <button className="rd-btn" disabled={busy} onClick={() => setMode("edit")}>Enter value…</button> : null}
        <input className="rd-in" aria-label="Note to the reporter (optional)" placeholder="Note to the reporter (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: "1 1 200px" }} />
        <button className="rd-btn rd-ok" disabled={busy} onClick={() => act(r, () => resolveRouteFlag(r.ids[0], "fixed", note), "marked fixed; the reporter was thanked.")}>{busy ? "Working…" : "Fixed it"}</button>
        <button className="rd-btn" disabled={busy} onClick={() => act(r, () => resolveRouteFlag(r.ids[0], "dismissed", note || (ai && ai.verdict === "disagree" ? ai.reasoning.slice(0, 400) : "")), "dismissed; the reporter was told.")}>No change needed</button>
      </>}
      {routeHref ? <a href={routeHref} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 12.5, fontWeight: 700, marginLeft: "auto" }}>Open route in ClimbMatch ↗</a> : null}
    </div>}
  </div>;
}
