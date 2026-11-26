// The owner's Review desk (owner, 2026-11-14): "when someone flags it, I as the owner need a way to
// check their flag and recommendation of edit … in a database or table way … not part of the app in
// the menu." One table holds every HELD route/area edit (contributions kind 'field', status
// 'pending') and every OPEN route flag (route_flags). Beside each one is what the nightly AI checker
// concluded (review_ai_verdicts, 0436): agree / disagree / partly / unsure, how well sourced, the
// value it thinks is right, and its sources.
//
// The AI never acts. Every button here is one of the existing is_admin()-checked RPCs (0309) through
// lib/db.js, the same calls the old Menu queues made, so this page adds no new write path:
//   edit  → Approve · Use AI value (approve with the AI's value) · Turn down · Keep & lock
//   flag  → Use AI value (files the value as the owner's own edit, approves it, marks the flag
//           fixed — an admin's edit passes the high-confidence lock, 0308) · Fixed it · No change
//   order → a climber's suggested LEFT-TO-RIGHT ORDER for a wall (contributions kind 'wall_order', 0485;
//           owner, 2026-11-23): Use this order (resolve_wall_order rewrites the wall's one stored order)
//           · Keep current order. Not sent to the AI checker.
// Two more sections beside the table (owner, 2026-11-23): Trails & GPS tracks (gps_submissions, 0397)
// and Accessibility reports (0343/0354), each the same queue component the app's Menu used to open.
// Identical edits cluster with sameEditValue, exactly as the old queue did.
// 2026-11-24 (owner, after the quality-control audit: "do all"): History (with Take back), Climbers (with the
// reviewer switch and Contributor standing, moved here off the Menu), Appeals, Locks and Worklist sections, a
// health strip, a word diff and every earlier edit of the field inside each row, keyboard shortcuts, and a
// REVIEWER role (0530) who may open the desk and work edits and flags but not ban, lock or decide appeals.
// Those sections live in DeskSections.jsx.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../src/AuthContext.tsx";
import { supabase } from "../lib/supabase";
import { HealthStrip, HistorySection, ClimbersSection, AppealsSection, LocksSection, WorklistSection, FieldHistory, WordDiff } from "./DeskSections";
import {
  useCanReview, useFieldContributions, useOpenRouteFlags, useContributionFields, useRouteRowsByIds,
  useAreaEditRowsByIds, approveFieldContribution, rejectFieldContribution, setRouteFieldConfidence,
  resolveRouteFlag, submitContribution, REMOVAL_NOTE, useWallOrderSuggestions, useWallRoutesByAreaIds, resolveWallOrder,
  useAdminQueueCounts,
} from "../lib/db";
import { GpsSubmissionQueue } from "../lib/GpsSubmissionQueue";
import { AccessibilityReportQueue } from "../lib/AccessibilityReports";
import { RouteProposalQueue, AreaProposalQueue, AreaPlacementQueue } from "../lib/RouteProposals";
import { AppFeedbackQueue } from "../lib/AppFeedback";
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

// ── AI verdicts (0436) ───────────────────────────────────────────────────────────────
function useAiVerdicts(enabled) {
  return useQuery({
    queryKey: ["review-ai-verdicts"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("review_ai_verdicts")
        .select("item_kind,item_id,item_hash,ai_value,verdict,confidence,sources,reasoning,model,checked_at,auto_action,auto_note,auto_at,auto_hash").limit(5000);
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
// THE REVIEW AUTOPILOT (0534, scripts/review-autopilot.mjs; owner 2026-11-25) acts on what two sources settle and
// leaves the rest here with auto_action 'needs_owner' and a sentence saying why. An item it DID decide has left the
// queue (approved, turned down or closed), so the only autopilot state a row in this table can carry is "Needs you".
const needsOwner = (v) => !!(v && v.auto_action === "needs_owner" && (!v.auto_hash || v.auto_hash === v.item_hash));
function VerdictChip({ v }) {
  const k = v ? v.verdict : "none";
  const s = VERDICT[k] || VERDICT.none;
  return <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
    <span style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 700, color: s.col, background: s.bg, border: "1px solid " + (k === "none" ? C.border : s.col), borderRadius: 12, padding: "2px 8px" }}>
      {s.label}{v && v.confidence !== "none" ? " · " + v.confidence : ""}
    </span>
    {needsOwner(v) ? <span title={v.auto_note || ""} style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 700, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber, borderRadius: 12, padding: "2px 8px" }}>Needs you</span> : null}
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
.rd-ok{background:${C.actionSolid};color:#fff;border-color:${C.actionSolid}}
.rd-ai{background:${C.greenBg};color:${C.green};border-color:${C.greenDim}}
.rd-bad{background:${C.redBg};color:${C.red};border-color:${C.red}}
.rd-sel,.rd-in{background:${C.surface};color:${C.text};border:1px solid ${C.border};border-radius:8px;padding:7px 9px;font-size:12.5px;font-family:inherit}
`;
const box = { whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12.5, lineHeight: 1.5, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", maxHeight: 240, overflowY: "auto", background: C.surface, color: C.textSub };

// ── gate ─────────────────────────────────────────────────────────────────────────────
export default function ReviewDesk() {
  const { user, loading } = useAuth();
  const admin = useCanReview(user && user.id);
  const page = (body) => <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 16px 60px" }}><style>{CSS}</style>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Review desk</h1>
      <span style={{ fontSize: 12.5, color: C.textMuted }}>Climber flags, suggested edits and wall orders, proposed climbs and areas, wrong place claims, submitted trails and GPS tracks, accessibility reports, and feedback. Edits, flags and proposals are researched by AI every hour: what two independent sources settle it decides for you (each decision is on History, where you can take it back); the rest is marked Needs you. Everything else waits for you.</span>
      <a href={BASE} style={{ marginLeft: "auto", color: C.blue, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Open ClimbMatch →</a>
    </header>{body}</div>;
  if (!supabase) return page(<p>This build has no database connection.</p>);
  if (loading || (user && admin.isLoading)) return page(<p style={{ color: C.textMuted }}>Checking who is signed in…</p>);
  if (!user) return page(<p>Sign in on <a href={BASE} style={{ color: C.blue }}>ClimbMatch</a> with the owner account, then reload this page.</p>);
  if (admin.error) return page(<p role="alert" style={{ color: C.red }}>Could not check your account — {admin.error.message}. Reload to try again.</p>);
  if (!admin.data || !admin.data.reviewer) return page(<p>Owner and reviewers only. This account cannot review edits.</p>);
  return page(<Desk admin={admin.data.admin} />);
}

// ── sections ─────────────────────────────────────────────────────────────────────────
// TRAILS & GPS TRACKS and ACCESSIBILITY REPORTS moved here off the app's Menu (owner, 2026-11-23: keep
// them, but not as Menu boxes). Their shapes are not a row of the edits table (a line drawn on a map;
// a report answered by email), so each is its own section, rendered by the SAME queue component the
// Menu sheet used: the review calls and their admin checks are unchanged. The count beside each tab
// (the first one too: held edits + open flags + suggested wall orders, so a wall order waiting is seen
// from any section) is useAdminQueueCounts, the read that used to badge the Menu; a failed count shows no number rather
// than a zero. A link can open a section directly: review.html#trails or review.html#access.
// PROPOSED CLIMBS & AREAS (0505, owner 2026-11-23: quality control on people who add a climb or an area) are
// the Menu's two proposal queues, with the AI checker's verdict on each card. review.html#proposals opens it.
// The five after them (2026-11-24) are DeskSections.jsx. A reviewer (0530) sees only the ones marked true.
// WRONG PLACE CLAIMS and FEEDBACK & RATINGS were the last two tiles of the app Menu's admin-only Review section;
// with them here that section, its full-screen sheet and the Menu button's count are gone (owner 2026-11-25: "Is the
// review section on menu only for me as the owner of the app? If so, remove since we created the admin page").
// review.html#placements and review.html#feedback open them; Feedback counts open notes, as the Menu tile did.
const SECTIONS = [["edits", "Edits, flags & wall orders", true], ["proposals", "Proposed climbs & areas"], ["placements", "Wrong place claims"], ["trails", "Trails & GPS tracks"], ["access", "Accessibility reports"],
  ["feedback", "Feedback & ratings"], ["history", "History", true], ["climbers", "Climbers"], ["appeals", "Appeals"], ["locks", "Locks"], ["worklist", "Worklist"]];
const fromHash = (admin) => { const h = (typeof window !== "undefined" && window.location.hash || "").slice(1); return SECTIONS.some(([k, , rev]) => k === h && (admin || rev)) ? h : "edits"; };
function Desk({ admin }) {
  const [sec, setSec] = useState(() => fromHash(admin));
  const countsQ = useAdminQueueCounts(admin);
  const n = countsQ.data || null;
  const [note, setNote] = useState(null);
  const pick = (k) => { setSec(k); setNote(null); try { window.history.replaceState(null, "", k === "edits" ? window.location.pathname + window.location.search : "#" + k); } catch (_e) { /* the section still switches */ } };
  const notify = (t) => { setNote(t); countsQ.refetch(); };
  const openRoute = (id) => { window.open(BASE + "?route=" + encodeURIComponent(id), "_blank", "noopener"); };
  return <div>
    {admin ? <HealthStrip /> : null}
    <div role="tablist" aria-label="Review sections" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, borderBottom: "1px solid " + C.border, paddingBottom: 10 }}>
      {SECTIONS.filter(([, , rev]) => admin || rev).map(([k, label]) => {
        const c = n ? n[k] : null;
        return <button key={k} role="tab" aria-selected={sec === k} className={"rd-btn" + (sec === k ? " rd-ok" : "")} onClick={() => pick(k)}>{label}{c ? " · " + c : ""}</button>;
      })}
    </div>
    {sec !== "edits" && note ? <div role="status" style={{ background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 9, padding: "9px 11px", fontSize: 12.5, marginBottom: 10 }}>{note}</div> : null}
    {sec === "trails" ? <div style={{ maxWidth: 640 }}>
      <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Trails to crags that climbers traced on the map or recorded, and GPS tracks of routes (0397). Check the line follows a real path from the parking pin (P) to the crag (C). Approving a crag trail saves it as the crag’s walk in, drawn on every climb there; it replaces any line already shown, and the old one is kept with the submission.</p>
      <GpsSubmissionQueue notify={notify} onOpenRoute={openRoute} />
    </div> : sec === "access" ? <div style={{ maxWidth: 640 }}>
      <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Problems climbers and visitors reported from the Accessibility statement. The statement promises a reply within 5 business days; reply by email, then mark it answered.</p>
      <AccessibilityReportQueue notify={notify} />
    </div> : sec === "placements" ? <div style={{ maxWidth: 640 }}>
      <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Climbers who say an area is filed in the wrong place. Nothing on the page changes until you move it: then mark the claim moved, or not wrong.</p>
      <AreaPlacementQueue />
    </div> : sec === "feedback" ? <div style={{ maxWidth: 640 }}>
      <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>What climbers and visitors sent from Feedback, and ratings that came with a comment. Reply by email if they left an address, then mark it read. Ratings without a comment only count toward the app rating above.</p>
      <AppFeedbackQueue notify={notify} />
    </div> : sec === "proposals" ? <ProposalsSection /> : sec === "history" ? <HistorySection admin={admin} /> : sec === "climbers" ? <ClimbersSection admin={admin} />
      : sec === "appeals" ? <AppealsSection /> : sec === "locks" ? <LocksSection /> : sec === "worklist" ? <WorklistSection /> : <EditsTable admin={admin} />}
  </div>;
}

function ProposalsSection() {
  const aiQ = useAiVerdicts(true);
  const ai = aiQ.data || {};
  return <div style={{ maxWidth: 640 }}>
    <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginTop: 0 }}>Climbs and areas climbers added. Nothing shows in the app until you approve it. Read any possible duplicate first; turning one down tells the climber your reason and is a strike unless you tick honest mistake (3 pauses their contributing for 90 days, 5 closes it).{aiQ.error ? " AI verdicts could not load: " + aiQ.error.message : ""}</p>
    <h2 style={{ fontSize: 15, margin: "14px 0 8px" }}>Proposed climbs</h2>
    <RouteProposalQueue ai={ai} />
    <h2 style={{ fontSize: 15, margin: "18px 0 8px" }}>Proposed areas</h2>
    <AreaProposalQueue ai={ai} />
  </div>;
}

// ── the table ────────────────────────────────────────────────────────────────────────
function EditsTable({ admin }) {
  const editsQ = useFieldContributions("pending", 1000);
  const flagsQ = useOpenRouteFlags(true);
  const fieldsQ = useContributionFields();
  const aiQ = useAiVerdicts(true);
  const edits = editsQ.data || NONE, flags = flagsQ.data || NONE;
  const routeIds = useMemo(() => Array.from(new Set([...edits.map((r) => r.route_id), ...flags.map((f) => f.route_id)].filter(Boolean))), [edits, flags]);
  const routesQ = useRouteRowsByIds(routeIds);
  const areaIds = useMemo(() => Array.from(new Set(edits.filter((r) => r.area_id && !r.route_id).map((r) => r.area_id))), [edits]);
  const areasQ = useAreaEditRowsByIds(areaIds);
  // SUGGESTED WALL ORDERS (0485; owner, 2026-11-23: "I receive it in the admin like what would happen when people
  // suggest edits"). A climber's left-to-right order for a wall is a row of this table, not a queue of its own.
  const ordersQ = useWallOrderSuggestions("pending");
  // Only an admin can write a wall's order (resolve_wall_order), so a reviewer is not shown them.
  const orders = (admin && ordersQ.data) || NONE;
  const wallIds = useMemo(() => Array.from(new Set(orders.map((o) => o.area_id).filter(Boolean))), [orders]);
  const wallsQ = useWallRoutesByAreaIds(wallIds);

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
    // A suggested wall order: the wall's climbs as they stand now against the line the climber sent.
    const walls = wallsQ.data || null;
    orders.forEach((o) => {
      const rs = walls && Object.prototype.hasOwnProperty.call(walls, o.area_id) ? walls[o.area_id] : null;
      const names = {}, inLine = {};
      (rs || []).forEach((x) => { names[x.id] = x.name; if (x.discipline !== "bouldering") inLine[x.id] = true; });
      const now = (rs || []).filter((x) => x.sort_order != null && x.discipline !== "bouldering").sort((a, b) => a.sort_order - b.sort_order).map((x) => String(x.id));
      const list = Array.isArray(o.value && o.value.order) ? o.value.order.map(String) : [];
      const nm = (id) => names[id] || "(a climb no longer on this wall)";
      // The place each listed climb WOULD take, numbered as resolve_wall_order numbers them: a climb that has left
      // the wall, a boulder problem and a repeat are skipped, so they neither count nor shift the "now N" marks.
      const place = {};
      let n = 0;
      list.forEach((id) => { if (inLine[id] && place[id] == null) place[id] = ++n; });
      out.push({
        key: "o:" + o.id, kind: "order", ids: [o.id], route_id: null, area_id: o.area_id, field: "wall_order", label: "Wall order",
        name: (o.areas && o.areas.name) || o.area_id, state: String(o.area_id || "").split("_")[0].toUpperCase(),
        cur: rs ? now.map(nm) : undefined, said: rs ? list.map(nm) : list.length + " climbs", note: (o.value && o.value.note) || "",
        removes: false, climbers: 1, created_at: o.created_at, ai: null, by: o.contributor || null,
        order: { loaded: !!rs, failed: !rs && !!wallsQ.error, now, list, known: n, names, place, rest: now.filter((id) => place[id] == null) },
      });
    });
    return out;
  }, [edits, flags, orders, fieldsQ.data, routesQ.data, areasQ.data, aiQ.data, wallsQ.data, wallsQ.error]);

  const states = useMemo(() => Array.from(new Set(rows.map((r) => r.state))).filter(Boolean).sort(), [rows]);
  const fieldsList = useMemo(() => Array.from(new Set(rows.map((r) => r.label))).sort(), [rows]);
  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const vRank = { disagree: 0, partly: 1, unsure: 2, agree: 3 };
    return rows.filter((r) => (f.type === "all" || r.kind === f.type)
      && (f.verdict === "all" || (f.verdict === "none" ? !r.ai && r.kind !== "order" : f.verdict === "needs" ? needsOwner(r.ai) : r.ai && r.ai.verdict === f.verdict))
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

  // KEYBOARD (2026-11-24): j / k open the next / previous row, a approves the open edit as sent, r opens
  // "Turn down", Escape closes the row. Ignored while typing in a box, and while a decision is running.
  const [keyCmd, setKeyCmd] = useState(null);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target, tag = t && t.tagName;
      if (e.ctrlKey || e.metaKey || e.altKey || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable) || busy) return;
      const i = shown.findIndex((r) => r.key === open);
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const next = shown[Math.min(shown.length - 1, Math.max(0, i < 0 ? 0 : i + (e.key === "j" ? 1 : -1)))];
        if (next) setOpen(next.key);
      } else if (e.key === "Escape" && open) setOpen(null);
      else if ((e.key === "a" || e.key === "r") && i >= 0 && shown[i].kind === "edit") { e.preventDefault(); setKeyCmd({ k: e.key, row: shown[i].key, at: Date.now() }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, open, busy]);

  const loadErr = editsQ.error || flagsQ.error || ordersQ.error;
  // A wall order is not sent to the nightly AI checker, so it never counts as "not yet checked".
  const counts = { edits: rows.filter((r) => r.kind === "edit").length, flags: rows.filter((r) => r.kind === "flag").length, orders: rows.filter((r) => r.kind === "order").length, unchecked: rows.filter((r) => !r.ai && r.kind !== "order").length, needs: rows.filter((r) => needsOwner(r.ai)).length };
  const th = (k, label) => <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : 1 }))} aria-sort={sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>{label}{sort.k === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</th>;

  return <div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 12.5, color: C.textSub }}>{counts.edits} edit{counts.edits === 1 ? "" : "s"} · {counts.flags} flag{counts.flags === 1 ? "" : "s"}{admin ? " · " + counts.orders + " wall order" + (counts.orders === 1 ? "" : "s") : ""} · {counts.unchecked} not yet checked by AI{aiQ.error ? " (AI verdicts could not load: " + aiQ.error.message + ")" : ""}</span>
      {counts.needs ? <button className="rd-btn" onClick={() => setF({ ...f, verdict: f.verdict === "needs" ? "all" : "needs" })} style={{ color: C.amber, borderColor: C.amber }}>{f.verdict === "needs" ? "Show everything" : counts.needs + " need" + (counts.needs === 1 ? "s" : "") + " you: the AI could not settle " + (counts.needs === 1 ? "it" : "them") + " online"}</button> : null}
      <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: "auto" }}>Keys: j / k next and previous · a approve · r turn down · Esc close</span>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <select aria-label="Type" className="rd-sel" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="all">Everything</option><option value="edit">Suggested edits</option><option value="flag">Flags</option><option value="order">Wall orders</option></select>
      <select aria-label="AI verdict" className="rd-sel" value={f.verdict} onChange={(e) => setF({ ...f, verdict: e.target.value })}><option value="all">Any AI verdict</option><option value="needs">Needs you (AI could not settle it)</option><option value="agree">AI agrees</option><option value="disagree">AI disagrees</option><option value="partly">Partly right</option><option value="unsure">AI unsure</option><option value="none">Not checked yet</option></select>
      <select aria-label="State" className="rd-sel" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}><option value="all">All states</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <select aria-label="Field" className="rd-sel" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}><option value="all">All fields</option>{fieldsList.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <input aria-label="Search" className="rd-in" placeholder="Search route, note, value" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} style={{ flex: "1 1 180px" }} />
      {bulk.length ? <button className="rd-btn rd-ok" disabled={!!busy} onClick={runBulk}>{busy === "bulk" ? "Approving…" : (bulk.length === 1 ? "Approve the 1 edit" : "Approve all " + bulk.length + " edits") + " the AI confirmed (2 sources)"}</button> : null}
    </div>
    {msg ? <div role={msg.ok ? "status" : "alert"} style={{ background: msg.ok ? C.greenBg : C.redBg, color: msg.ok ? C.green : C.red, border: "1px solid " + (msg.ok ? C.greenDim : C.red), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, marginBottom: 10 }}>{msg.text}</div> : null}
    {loadErr ? <div role="alert" style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>Could not load the queue — {loadErr.message}. This is not a report that it is empty.</div> : null}
    {editsQ.isLoading || flagsQ.isLoading || ordersQ.isLoading ? <p style={{ color: C.textMuted }}>Loading the queue…</p>
      : !shown.length ? <p style={{ color: C.textMuted }}>{rows.length ? "Nothing matches these filters." : "Nothing to review — no held edits, no open flags and no suggested wall orders."}</p>
      : <table className="rd-table">
        <thead><tr>{th("kind", "TYPE")}{th("route", "ROUTE")}{th("field", "FIELD")}<th>ON THE PAGE NOW</th><th>CLIMBER SAYS</th>{th("verdict", "AI VERDICT")}<th>AI VALUE</th>{th("age", "AGE")}</tr></thead>
        <tbody>{shown.map((r) => {
          const isOpen = open === r.key;
          return [
            <tr key={r.key} className={"rd-row" + (isOpen ? " rd-open" : "")} onClick={() => setOpen(isOpen ? null : r.key)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(isOpen ? null : r.key); } }} aria-expanded={isOpen}>
              <td><span className="rd-lab">Type</span><span style={{ fontWeight: 700, color: r.kind === "flag" ? C.orange : r.kind === "order" ? C.amber : C.blue }}>{r.kind === "flag" ? "⚑ Flag" : r.kind === "order" ? "⇄ Order" : "✎ Edit"}</span>{r.climbers > 1 ? <span style={{ color: C.textMuted }}> ×{r.climbers}</span> : null}{r.removes ? <div style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>removes</div> : null}</td>
              <td><span className="rd-lab">Route</span><span style={{ fontWeight: 700 }}>{r.name}</span> <span style={{ color: C.textMuted, fontSize: 11.5 }}>{r.state}{r.kind === "order" ? " · wall" : r.area_id ? " · area" : ""}</span></td>
              <td><span className="rd-lab">Field</span>{r.label}</td>
              <td style={{ color: C.textSub }}><span className="rd-lab">Now</span>{r.kind === "order" && !r.order.loaded ? <i style={{ color: r.order.failed ? C.red : C.textMuted }}>{r.order.failed ? "could not load the wall" : "loading…"}</i> : isEmpty(r.cur) ? <i style={{ color: C.textMuted }}>{r.kind === "order" ? "no order stored" : "empty"}</i> : short(r.cur)}</td>
              <td><span className="rd-lab">Climber</span>{r.kind === "flag" ? <i>“{short(r.note, 120)}”</i> : short(r.said)}</td>
              <td><span className="rd-lab">AI</span>{r.kind === "order" ? <span style={{ color: C.textMuted }}>—</span> : <VerdictChip v={r.ai} />}</td>
              <td><span className="rd-lab">AI value</span>{r.ai && !isEmpty(r.ai.ai_value) ? short(r.ai.ai_value) : <span style={{ color: C.textMuted }}>—</span>}</td>
              <td style={{ whiteSpace: "nowrap", color: C.textMuted }}><span className="rd-lab">Age</span>{when(r.created_at)} · {ageDays(r.created_at)}d</td>
            </tr>,
            isOpen ? <tr key={r.key + ":d"} className="rd-detail"><td colSpan={8}>{r.kind === "order" ? <OrderDetail row={r} busy={busy === r.key} act={act} refresh={wallsQ.refetch} fetching={wallsQ.isFetching} readError={wallsQ.error} /> : <Detail row={r} busy={busy === r.key} act={act} admin={admin} keyCmd={keyCmd && keyCmd.row === r.key ? keyCmd : null} />}</td></tr> : null,
          ];
        })}</tbody>
      </table>}
  </div>;
}

// ── a suggested wall order, expanded ─────────────────────────────────────────────────
// The wall as it is listed now beside the line the climber sent, each climb marked with the place it holds
// now. "Use this order" writes it for EVERY climber (resolve_wall_order renumbers routes.sort_order: the one
// stored order the wall's list, NEXT DOOR and the Route finder all read); "Keep current order" writes nothing
// to the wall. Either way the sender gets a notice if their account still exists (the desk does not claim it
// was told: the function does not say). The note is a REASON: it goes out only with "Keep current
// order" (0485 puts it in the rejection notice); on an approval it is kept on the record and not sent.
function OrderDetail({ row: r, busy, act, refresh, fetching, readError }) {
  const [note, setNote] = useState("");
  // The desk does not refetch on focus, and an approval renumbers from the LIVE rows: a tab left open could
  // preview a wall that has since gained or lost climbs. Opening the row reads the wall again, and "Use this
  // order" waits for that read: while it is in flight, or if it failed, the preview may not be the wall.
  useEffect(() => { if (refresh) refresh(); }, [refresh]);
  const o = r.order;
  const pos = {};
  o.now.forEach((id, i) => { pos[id] = i + 1; });
  const can = o.loaded && !o.failed && !fetching && !readError && o.known >= 2;
  const num = { display: "inline-block", minWidth: 24, color: C.textMuted };
  const list = { ...box, margin: 0, paddingLeft: 34, whiteSpace: "normal" };
  return <div style={{ padding: "10px 4px 16px", display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
      <div><div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>ON THE WALL NOW, LEFT TO RIGHT</div>
        {o.failed ? <div role="alert" style={{ ...box, color: C.red }}>Could not load this wall’s climbs, so the order cannot be shown or used. Reload the page to try again.</div> : !o.loaded ? <div style={box}>Loading the wall’s climbs…</div> : o.now.length ? <ol style={list}>{o.now.map((id) => <li key={id}>{o.names[id] || id}</li>)}</ol> : <div style={box}>(no order stored)</div>}</div>
      <div><div style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>CLIMBER SUGGESTS, LEFT TO RIGHT</div>
        <ol style={{ ...list, listStyle: "none", paddingLeft: 9 }}>
          {o.list.map((id, i) => {
            const p = o.place[id], first = o.list.indexOf(id) === i;
            const live = o.loaded && !!o.names[id] && p != null && first;
            return <li key={id + ":" + i} style={{ color: live || !o.loaded ? C.text : C.textMuted }}><span style={num}>{live ? p + "." : "–"}</span>{o.loaded ? (o.names[id] || "(a climb no longer on this wall)") : id}
              {!o.loaded || !o.names[id] ? null : !first ? <span style={{ color: C.textMuted }}> · listed twice</span> : p == null ? <span style={{ color: C.textMuted }}> · a boulder problem, not part of the line</span> : pos[id] == null ? <b style={{ color: C.amber }}> · no place now</b> : pos[id] !== p ? <b style={{ color: C.amber }}> · now {pos[id]}</b> : null}</li>;
          })}
          {/* resolve_wall_order keeps every placed climb the list does not name, AFTER the listed ones in its old order (a climb added to the wall since the suggestion was sent). It moves too, so it is shown. */}
          {o.loaded ? o.rest.map((id, i) => <li key={"r:" + id} style={{ color: C.textSub }}><span style={num}>{o.known + i + 1}.</span>{o.names[id] || id}<span style={{ color: C.textMuted }}> · not in the suggestion, follows in its old order</span>{pos[id] !== o.known + i + 1 ? <b style={{ color: C.amber }}> · now {pos[id]}</b> : null}</li>) : null}
        </ol>
        {r.note ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}><b>Why:</b> {r.note}</div> : null}
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Sent {when(r.created_at)} by {r.by ? String(r.by).slice(0, 8) : "an account that is gone"}</div></div>
    </div>
    {o.loaded && readError ? <div role="alert" style={{ fontSize: 12.5, color: C.red }}>Could not re-read this wall, so what is shown may be out of date and the order cannot be used. Reload the page to try again.</div> : null}
    {o.loaded && o.known < 2 ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Fewer than two of these climbs are still in the wall’s line, so there is nothing to order.</div> : null}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button className="rd-btn rd-ok" disabled={busy || !can} onClick={() => act(r, () => resolveWallOrder(r.ids[0], "approved", note), "order written; climbers see it the next time the wall’s list loads.")}>{busy ? "Working…" : fetching ? "Checking the wall…" : "Use this order"}</button>
      <input className="rd-in" aria-label="Reason, sent to the climber if you keep the current order (optional)" placeholder="Reason, sent to the climber if you keep the current order (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: "1 1 200px" }} />
      <button className="rd-btn rd-bad" disabled={busy} onClick={() => act(r, () => resolveWallOrder(r.ids[0], "rejected", note), "kept the current order.")}>Keep current order</button>
    </div>
  </div>;
}

// ── one item, expanded ───────────────────────────────────────────────────────────────
function Detail({ row: r, busy, act, admin, keyCmd }) {
  const ai = r.ai;
  const [mode, setMode] = useState(null); // "reject" | "edit"
  // The table's a / r keys (EditsTable): approve as sent, or open Turn down. Each key press is a new keyCmd.
  useEffect(() => {
    if (!keyCmd || busy || mode) return;
    if (keyCmd.k === "r") setMode("reject");
    else if (keyCmd.k === "a") act(r, () => approveFieldContribution(r.ids[0], null, r.ids.slice(1)), "approved; it is on the page and locked.");
  }, [keyCmd]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per key press; busy, mode, act and r are read at that moment on purpose
  const textDiff = r.kind === "edit" && typeof r.said === "string" && typeof r.cur === "string" && r.cur.trim() && r.said.trim();
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
    {textDiff ? <div><div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>WHAT CHANGES, WORD BY WORD</div><WordDiff from={r.cur} to={r.said} /></div> : null}
    {r.field && (r.route_id || r.area_id) ? <FieldHistory routeId={r.route_id} areaId={r.route_id ? null : r.area_id} field={r.field} label={r.label} /> : null}
    {ai ? <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
      <div><VerdictChip v={ai} /> <span style={{ color: C.textMuted, fontSize: 11.5 }}>checked {when(ai.checked_at)}{ai.model ? " · " + ai.model : ""}</span></div>
      {needsOwner(ai) && ai.auto_note ? <p style={{ margin: "6px 0", color: C.amber, fontWeight: 700 }}>Left for you: {ai.auto_note}</p> : null}
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
        {r.area_id || !admin ? null : <button className="rd-btn" disabled={busy} onClick={() => act(r, async () => { await setRouteFieldConfidence(r.route_id, r.field, "high", "Locked by ClimbMatch as stored"); await rejectFieldContribution(r.ids[0], "The value on the page was checked and locked at high confidence; this edit was not applied.", r.ids.slice(1), false); }, "kept as stored and locked; edit turned down without a strike.")}>Keep page value &amp; lock</button>}
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
