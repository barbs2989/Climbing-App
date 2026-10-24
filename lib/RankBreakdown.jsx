// "How N points add up" (0357): the climbs behind one climber's number on one Ranks board.
//
// Opened from the value column of a ranking row. Reads rank_breakdown(), which returns every log
// leaderboard() counted for that climber with what it adds to each board, computed by the same
// SQL, so the lines below sum to the number on the row. Following 8a.nu's scorecard (the ascents a
// score is summed from) and theCrag's CPR timeline (the ascent list under a column). Logs the viewer
// may not read come back hidden and are summed into one "kept private" line, never named.
import { createPortal } from "react-dom";
import { C, shortDate, uElev } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";
import { useRankBreakdown } from "./db";

const TIER = { confirmed: "Partner confirmed · ×1", evidence: "Photo or GPS · ×0.75", self: "Self-logged · ×0.5" };
// The keys a log ranks under, as leaderboard()'s vkeys: sport and trad also rank as rock.
const keysOf = (d) => (d === "sport" || d === "trad") ? [d, "rock"] : [d];
// How each board scores, in a sentence; the rows say how much each climb gave.
const HOW = {
  points: "Each different climb you sent scores once, from its best log: 8 + grade² × 0.35 (5.10a counts as 10, each letter a quarter; V, WI and M grades are converted to the same scale). Top rope and Follow score one letter lower. A partner-confirmed climb scores in full, a photo or GPS track ×0.75, a self-logged one ×0.5.",
  onsight: "An Onsight or Flash that was your first log on the climb scores 10 + grade² × 0.3, weighted the same way as Send points. Sport, trad and bouldering only.",
  sendsYr: "Different climbs sent in the last 12 months.", sendsLife: "Different climbs sent, all time.",
  vert: "For each climb finished in the last 12 months: a peak’s gain from the trailhead, else the climb’s length.",
  days: "Different days with a logged climb in the last 12 months.",
  active: "Every climb logged, attempts included. Conditions reports are not climbs.",
  peaksYr: "Different summits logged as Summit in the last 12 months.", peaksLife: "Different summits logged as Summit.",
  classics_b: "Different classic climbs sent.",
};

// One line per scoring item for this board: {key, title, sub, val, hidden}.
function itemsFor(board, rows) {
  const sent = rows.filter((r) => r.sent);
  const bestPer = (list, score) => { const m = new Map(); list.forEach((r) => { const o = m.get(r.route_key); if (!o || score(r) > score(o)) m.set(r.route_key, r); }); return [...m.values()]; };
  const one = (r, val) => ({ key: r.log_id, r, val, hidden: r.hidden });
  if (board === "points") return bestPer(sent, (r) => +r.send_pts).map((r) => one(r, +r.send_pts)).sort((a, b) => b.val - a.val);
  if (board === "onsight") return rows.filter((r) => +r.onsight_pts > 0).map((r) => one(r, +r.onsight_pts)).sort((a, b) => b.val - a.val);
  if (board === "sendsYr" || board === "sendsLife") return bestPer(sent.filter((r) => board === "sendsLife" || r.recent), (r) => r.date_climbed || "").map((r) => one(r, 1));
  if (board === "classics_b") return bestPer(sent.filter((r) => r.classic), (r) => r.date_climbed || "").map((r) => one(r, 1));
  if (board === "vert") return sent.filter((r) => r.recent && +r.climb_ft > 0).map((r) => one(r, +r.climb_ft));
  if (board === "active") return rows.map((r) => one(r, 1));
  if (board === "peaksYr" || board === "peaksLife") { const m = new Map(); rows.filter((r) => r.peak_key && (board === "peaksLife" || r.recent)).forEach((r) => { if (!m.has(r.peak_key)) m.set(r.peak_key, r); }); return [...m.values()].map((r) => one(r, 1)); }
  if (board === "days") {
    const m = new Map(); rows.filter((r) => r.recent).forEach((r) => { const o = m.get(r.day_key) || { key: r.day_key, rs: [], hidden: true }; o.rs.push(r); if (!r.hidden) o.hidden = false; m.set(r.day_key, o); });
    return [...m.values()].map((o) => ({ key: o.key, day: o, val: 1, hidden: o.hidden }));
  }
  return [];
}

export default function RankBreakdown({ target, onClose }) {
  const q = useRankBreakdown({ userId: target && target.userId, areaId: target && target.areaId, enabled: !!target, version: target && target.version });
  if (!target) return null;
  const { board, disc, backedOnly, name, isMe, label, total, fmt } = target;
  const rows = (q.data || []).filter((r) => (!backedOnly || r.tier !== "self") && (disc === "all" || keysOf(r.disc).includes(disc)));
  const items = itemsFor(board, rows);
  const shown = items.filter((x) => !x.hidden), priv = items.filter((x) => x.hidden);
  const privSum = priv.reduce((s, x) => s + x.val, 0);
  const valText = (v) => board === "points" || board === "onsight" ? (Math.round(v * 10) / 10).toLocaleString() + " pts" : board === "vert" ? uElev(v) : "";
  const title = "How " + (isMe ? "you got " : name + " got ") + total + " " + label.toLowerCase();
  const line = (x) => {
    if (x.day) { const named = x.day.rs.filter((r) => !r.hidden); return <div key={x.key} style={{ padding: "9px 0", borderTop: "1px solid " + C.borderLight }}><div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{shortDate(named[0].date_climbed)}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{named.map((r) => r.route_name).join(" · ") + (x.day.rs.length > named.length ? " · and " + (x.day.rs.length - named.length) + " kept private" : "")}</div></div>; }
    const r = x.r;
    return <div key={x.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: "1px solid " + C.borderLight }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.route_name}{r.grade ? <span style={{ fontWeight: 600, color: C.textSub }}>{" · " + r.grade}</span> : null}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{[r.date_climbed ? shortDate(r.date_climbed) : "", r.tick_type, r.area_name].filter(Boolean).join(" · ")}</div>
        {(board === "points" || board === "onsight") ? <div style={{ fontSize: 11.5, color: r.tier === "self" ? C.amber : C.green, marginTop: 2 }}>{TIER[r.tier] || ""}</div> : null}
      </div>
      {valText(x.val) ? <div style={{ flexShrink: 0, fontSize: 13.5, fontWeight: 700, color: C.blue, fontVariantNumeric: "tabular-nums" }}>{valText(x.val)}</div> : null}
    </div>;
  };
  return createPortal(<div onClick={onClose} tabIndex={-1} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100001, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid " + C.border }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        {HOW[board] ? <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginBottom: 6 }}>{HOW[board]}{backedOnly ? " Backed climbs only is on, so self-logged climbs are left out." : ""}</div> : null}
        {q.isError ? <div style={{ fontSize: 13, color: C.amber, padding: "14px 0" }}>Couldn’t load the climbs behind this number. Try again in a moment.</div>
          : q.isPending ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 0" }}>Loading climbs…</div>
          : !items.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 0" }}>No logged climb counts toward this board yet.</div>
          : <div>
            {shown.map(line)}
            {priv.length ? <div style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: "1px solid " + C.borderLight }}><div style={{ flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 1.45 }}>{priv.length + " more " + (board === "days" ? (priv.length === 1 ? "day" : "days") : (priv.length === 1 ? "climb" : "climbs")) + " they keep private — counted, but not shown to you."}</div>{valText(privSum) ? <div style={{ flexShrink: 0, fontSize: 13.5, fontWeight: 700, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{valText(privSum)}</div> : null}</div> : null}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "2px solid " + C.border, fontSize: 14, fontWeight: 800, color: C.text }}><span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt}</span></div>
          </div>}
      </div>
    </div>
  </div>, document.body);
}
