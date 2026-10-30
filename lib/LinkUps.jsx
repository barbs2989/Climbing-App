import { useState, useMemo } from "react";
import { C, RSL, ROUTE_GAP, SUB_LABEL } from "../ClimbMatchCore.jsx";
import { useRouteLinkUps, useRoutesByIds, dbRouteToCamel } from "./db.js";
import { USE_DB } from "./supabase";
import Chevron from "../src/components/Chevron.tsx";

/* LINK-UPS — how climbers string this climb together with others in one push (owner's note,
   2026-10-28: "for routes that people often link up, we should provide information on those routes
   on how to do that ... the route will be different and plan for those that want to do that").
   Mountain Project files the famous enchainments as routes of their own and leaves the rest to a
   sentence in a peak's description, so a climber on the second peak never finds them; here ONE row
   (route_link_ups, 0395) renders on EVERY member climb's page, with the order, what joins each leg
   to the next, how the descent changes and the logistics. Researched, in our own words
   (research-data/link-ups/), never naming a source.
   Mounted only on alpine, mountaineering and scrambling pages, beside PAIRS WELL WITH: a crag's
   neighbours are already the trip. Nothing renders when the climb is in no link-up; a failed read
   says so instead of reading as "none" (check:read-failures). */
function LegName({ leg, here, r2, onOpenRoute }) {
  const label = <><span style={{ fontWeight: 700, color: here ? C.text : r2 ? C.blue : C.text }}>{leg.peak}</span>{leg.route ? <span style={{ color: C.textSub, fontWeight: 500 }}>{" · " + leg.route}</span> : null}</>;
  if (here) return <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}<span style={{ fontSize: 11, fontWeight: 700, color: C.green, marginLeft: 6, whiteSpace: "nowrap" }}>This climb</span></span>;
  if (!r2) return <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>;
  return <button type="button" onClick={function () { onOpenRoute && onOpenRoute(r2); }} aria-label={"Open " + leg.peak + (leg.route ? ", " + leg.route : "")} style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0, padding: 0, border: "none", background: "none", font: "inherit", textAlign: "left", cursor: "pointer", overflowWrap: "anywhere" }}><span>{label}</span><Chevron size={14} color={C.blue} /></button>;
}

function LinkUpCard({ lu, routeId, byId, onOpenRoute }) {
  const [open, setOpen] = useState(false);
  const legs = Array.isArray(lu.legs) ? lu.legs : [];
  const para = { fontSize: 12.5, color: C.textSub, lineHeight: 1.55, margin: "3px 0 0" };
  return <div style={{ background: C.card, borderRadius: 10, border: "1px solid " + C.border, marginBottom: ROUTE_GAP, overflow: "hidden" }}>
    <button type="button" onClick={function () { setOpen(!open); }} aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", border: "none", background: "none", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{lu.name}</span>
        <span style={{ display: "block", fontSize: 12, color: C.textSub, lineHeight: 1.45, marginTop: 2, overflowWrap: "anywhere" }}>{legs.map(function (l) { return l.peak; }).join(" → ")}{lu.duration ? <span style={{ color: C.textMuted }}>{" · " + lu.duration}</span> : null}</span>
      </span>
      <Chevron open={open} size={16} color={C.textMuted} />
    </button>
    {open ? <div style={{ padding: "0 12px 12px", borderTop: "1px solid " + C.border }}>
      <div style={{ ...SUB_LABEL, marginTop: 10 }}>The order</div>
      <ol style={{ margin: "4px 0 0", paddingLeft: 20 }}>
        {legs.map(function (l, i) {
          const here = l.route_id === routeId;
          return <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: i ? 6 : 0 }}>
            <LegName leg={l} here={here} r2={l.route_id && !here ? byId[l.route_id] : null} onOpenRoute={onOpenRoute} />
            {i && l.connect ? <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 1 }}>{l.connect}</div> : null}
          </li>;
        })}
      </ol>
      <div style={{ ...SUB_LABEL, marginTop: 12 }}>How to link them</div>
      <p style={para}>{lu.how}</p>
      {lu.descent ? <><div style={{ ...SUB_LABEL, marginTop: 12 }}>Descent</div><p style={para}>{lu.descent}</p></> : null}
      {lu.logistics ? <><div style={{ ...SUB_LABEL, marginTop: 12 }}>Logistics</div><p style={para}>{lu.logistics}</p></> : null}
    </div> : null}
  </div>;
}

export default function LinkUps({ route, onOpenRoute }) {
  const q = useRouteLinkUps(USE_DB && route ? route.id : null);
  const rows = useMemo(function () { return q.data || []; }, [q.data]);
  const otherIds = useMemo(function () { const out = []; rows.forEach(function (lu) { (lu.route_ids || []).forEach(function (id) { if (id !== route.id && out.indexOf(id) < 0) out.push(id); }); }); return out; }, [rows, route.id]);
  const othersQ = useRoutesByIds(otherIds);
  const byId = useMemo(function () { const m = {}; (othersQ.data || []).forEach(function (r) { m[r.id] = dbRouteToCamel(r); }); return m; }, [othersQ.data]);
  if (!USE_DB || !route) return null;
  if (q.isError) return <div style={{ marginBottom: 8 }}><RSL>LINK-UPS</RSL><div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5 }}>Couldn’t load the link-ups for this climb — this is not a claim that there are none. Check your connection and try again.</div></div>;
  if (!rows.length) return null;
  return <div style={{ marginBottom: 8 }}><RSL>LINK-UPS</RSL>
    <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginBottom: 7 }}>{rows.length === 1 ? "Climbers often do this climb as part of a longer push. Open it for the order, the connecting terrain and how the plan changes." : "Climbers often do this climb as part of a longer push. Open one for the order, the connecting terrain and how the plan changes."}</div>
    {rows.map(function (lu) { return <LinkUpCard key={lu.id} lu={lu} routeId={route.id} byId={byId} onOpenRoute={onOpenRoute} />; })}
  </div>;
}
