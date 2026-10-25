import { useState } from "react";
import { C, DLOCALE } from "../ClimbMatchCore.jsx";

/* THE CALENDAR AS A MONTH (desktop website, owner 2026-10-22): the Calendar's own two sources —
   your crews' agreed climbing days and group events — laid out on a month grid above the lists,
   the way a desktop calendar reads. Nothing else goes on it (owner: crew days + group events only).
   Days are LOCAL calendar keys (YYYY-MM-DD), the same keys both sources carry; month and weekday
   names go through DLOCALE, the climber's date preference. A day shows two entries and a count of
   the rest; every entry opens what the list below would open. */
const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

export default function MonthGrid({ climbs, events, onOpenCrew, onOpenEvent }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const start = new Date(ym.y, ym.m, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const shown = cells[35].getMonth() !== ym.m ? cells.slice(0, 35) : cells;
  const byDay = {};
  (climbs || []).forEach(x => { if (x && x.date) (byDay[x.date] = byDay[x.date] || []).push({ key: "c" + x.crew.id, label: (x.route && x.route.name) || "Crew climb", color: C.teal, open: () => onOpenCrew && onOpenCrew(x.crew) }); });
  (events || []).forEach(e => { if (e && e.date) (byDay[e.date] = byDay[e.date] || []).push({ key: "e" + e.groupId + "_" + e.id, label: e.title || "Event", color: e.accent || C.blueSolid, open: () => onOpenEvent && onOpenEvent(e.groupId, e.id) }); });
  const today = ymd(now);
  const title = first.toLocaleDateString(DLOCALE, { month: "long", year: "numeric" });
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(2026, 0, 4 + i).toLocaleDateString(DLOCALE, { weekday: "short" }));
  const step = d => setYm(p => { const t = new Date(p.y, p.m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const navBtn = { width: 44, height: 44, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, cursor: "pointer" };
  return (
    <section aria-label="Month view" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={() => step(-1)} aria-label="Previous month" style={navBtn}>‹</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800 }}>{title}</div>
        {ym.y !== now.getFullYear() || ym.m !== now.getMonth() ? <button onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })} style={{ ...navBtn, width: "auto", padding: "0 10px", fontSize: 12.5, fontWeight: 700 }}>Today</button> : null}
        <button onClick={() => step(1)} aria-label="Next month" style={navBtn}>›</button>
      </div>
      <div role="grid" aria-label={title} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden", background: C.border, gap: 1 }}>
        {weekdays.map(w => <div key={w} role="columnheader" style={{ background: C.surface, padding: "6px 4px", fontSize: 11, fontWeight: 800, color: C.textMuted, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 }}>{w}</div>)}
        {shown.map(d => {
          const k = ymd(d), items = byDay[k] || [], inMonth = d.getMonth() === ym.m, isToday = k === today;
          return <div key={k} role="gridcell" aria-label={d.toLocaleDateString(DLOCALE, { weekday: "long", month: "long", day: "numeric" }) + (items.length ? ", " + items.length + (items.length === 1 ? " entry" : " entries") : "")} style={{ background: inMonth ? C.bg : C.surface, minHeight: 78, padding: 4, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <div style={{ alignSelf: "flex-end", minWidth: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 800 : 600, background: isToday ? C.blueSolid : "transparent", color: isToday ? C.onSolid : inMonth ? C.text : C.textMuted }}>{d.getDate()}</div>
            {items.slice(0, 2).map(it => <button key={it.key} onClick={it.open} title={it.label} style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderLeft: "3px solid " + it.color, borderRadius: 4, background: C.card, color: C.text, fontSize: 11, fontWeight: 700, padding: "2px 5px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</button>)}
            {items.length > 2 ? <div style={{ fontSize: 10.5, color: C.textMuted, paddingLeft: 3 }}>{"+" + (items.length - 2) + " more"}</div> : null}
          </div>;
        })}
      </div>
    </section>
  );
}
