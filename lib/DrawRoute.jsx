import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { C, CRAG_CATS, catOf, trailheadPoint, uElev, wpIs, wpPlaced } from "../ClimbMatchCore.jsx";
import TrailDrawMap, { fmtTrailLen, trailLenM } from "./TrailDrawMap.jsx";
import { POP_BACK } from "./popupChrome.js";

/* DRAW AN APPROACH (desktop website, owner 2026-10-22): click points on the map from the trailhead
   (or a crag's parking) toward the climb, see the line's length and the height it gains and loses,
   and download it as GPX. On a crag the line can also be SUGGESTED as the trail in — the existing
   reviewed submission (GpsSubmissionModal's draw tab) opens with it already drawn. Elsewhere that
   form asks for the climb's own track, not an approach, so the suggestion is not offered there.
   The downloaded file says what it is: a line drawn by hand, not a recording. */
const TOOL_C = { bg: C.bg, bg70: C.surface, text: C.text, text70: C.textMuted, accent: C.blue, warning: C.orange, error: C.red, success: C.green, border: C.border };

// Up to 100 points evenly along the drawn line, for one elevation read.
function samples(pts) {
  if (pts.length < 2) return pts.slice();
  const seg = [], out = [];
  let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = trailLenM([pts[i - 1], pts[i]]); seg.push(d); tot += d; }
  const n = Math.min(100, Math.max(2, Math.ceil(tot / 25)));
  for (let k = 0; k < n; k++) {
    let want = tot * k / (n - 1), i = 0;
    while (i < seg.length - 1 && want > seg[i]) { want -= seg[i]; i++; }
    const f = seg[i] ? Math.min(1, want / seg[i]) : 0, a = pts[i], b = pts[i + 1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

function gpxOf(name, pts, eles) {
  const esc = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const desc = "Hand-drawn on the ClimbMatch map — a sketch of the way in, not a recorded GPS track.";
  const seg = pts.map(function (p, i) { const e = eles && eles.length === pts.length ? eles[i] : null; return "<trkpt lat=\"" + p[0] + "\" lon=\"" + p[1] + "\">" + (e != null ? "<ele>" + e + "</ele>" : "") + "</trkpt>"; }).join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"ClimbMatch\" xmlns=\"http://www.topografix.com/GPX/1/1\"><metadata><desc>" + esc(desc) + "</desc></metadata><trk><name>" + esc(name) + "</name><desc>" + esc(desc) + "</desc><trkseg>" + seg + "</trkseg></trk></gpx>";
}

export default function DrawRouteView({ route, mtn, onClose, onSuggest }) {
  const crag = CRAG_CATS.includes(catOf(route));
  const th = trailheadPoint(route);
  const start = th && isFinite(Number(th.lat)) && isFinite(Number(th.lng)) ? { lat: Number(th.lat), lng: Number(th.lng) } : null;
  const top = (route.waypoints || []).find(function (w) { return wpPlaced(w) && (wpIs(w, "Summit") || wpIs(w, "Topout")); });
  const endPt = top ? { lat: Number(top.lat), lng: Number(top.lng) } : (mtn && mtn.lat != null && mtn.lng != null && isFinite(Number(mtn.lat)) && isFinite(Number(mtn.lng)) ? { lat: Number(mtn.lat), lng: Number(mtn.lng) } : null);
  const marks = crag ? undefined : { start: "T", end: top && wpIs(top, "Summit") ? "S" : "B", startName: "the trailhead", endName: top && wpIs(top, "Summit") ? "the summit" : "the climb" };
  const [pts, setPts] = useState([]);
  const [prof, setProf] = useState(null); // {key, gain, loss, eles} | {key, error}
  const key = pts.map(function (p) { return p[0] + "," + p[1]; }).join(";");
  useEffect(function () {
    if (pts.length < 2) return undefined;
    let live = true;
    const sp = samples(pts);
    const t = setTimeout(function () {
      const url = "https://api.open-meteo.com/v1/elevation?latitude=" + sp.map(function (p) { return p[0].toFixed(5); }).join(",") + "&longitude=" + sp.map(function (p) { return p[1].toFixed(5); }).join(",");
      fetch(url).then(function (r) { if (!r.ok) throw new Error("elevation " + r.status); return r.json(); }).then(function (j) {
        const e = (j && j.elevation) || [];
        if (e.length !== sp.length) throw new Error("elevation shape");
        let gain = 0, loss = 0;
        for (let i = 1; i < e.length; i++) { const d = e[i] - e[i - 1]; if (d > 0) gain += d; else loss -= d; }
        if (live) setProf({ key: key, gain: gain * 3.28084, loss: loss * 3.28084 });
      }).catch(function () { if (live) setProf({ key: key, error: true }); });
    }, 600);
    return function () { live = false; clearTimeout(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` is `pts` serialised; keying on it (not the array) stops a refetch on every render
  const lenM = trailLenM(pts);
  const p = prof && prof.key === key ? prof : null;
  const download = function () {
    const gpx = gpxOf(route.name + " — drawn approach", pts, null);
    const url = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = String(route.name || "route").replace(/[^a-z0-9]+/gi, "_") + "_drawn_approach.gpx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };
  const stat = { flex: 1, minWidth: 110, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 12px" };
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4 };
  // Portalled to <body>: the route page renders inside #appscroll, whose stacking would put this under the app header (check:overlays).
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Draw the approach" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, zIndex: 1100 }}>
      <button onClick={onClose} style={POP_BACK}>← Back</button>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{"Draw the approach · " + route.name}</div>
    </div>
    <div style={{ padding: "14px 16px 40px", color: C.text }}>
      <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5, margin: "0 0 12px" }}>{crag ? "Click along the way in, from where you park to the base of the crag. Download it as GPX, or suggest it as this crag’s trail." : "Click along the way in, from the trailhead toward the climb. Download it as GPX to plan with or load on your watch."}</p>
      <TrailDrawMap start={start} end={endPt} pts={pts} setPts={setPts} C={TOOL_C} marks={marks} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <div style={stat}><div style={lbl}>Length</div><div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{pts.length > 1 ? fmtTrailLen(lenM) : "—"}</div></div>
        <div style={stat}><div style={lbl}>Gain · loss</div><div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{pts.length < 2 ? "—" : !p ? <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Measuring…</span> : p.error ? <span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>Couldn’t read the terrain</span> : "↑" + uElev(p.gain) + " · ↓" + uElev(p.loss)}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={download} disabled={pts.length < 2} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.blueDim, background: C.blueBg, color: pts.length < 2 ? C.textMuted : "#fff", fontSize: 13.5, fontWeight: 700, cursor: pts.length < 2 ? "default" : "pointer" }}>⤓ Download GPX</button>
        {crag && onSuggest ? <button onClick={function () { onSuggest(pts); }} disabled={pts.length < 3} title={pts.length < 3 ? "Draw at least three points" : undefined} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: pts.length < 3 ? C.card : C.blueSolid, color: pts.length < 3 ? C.textMuted : "#fff", fontSize: 13.5, fontWeight: 700, cursor: pts.length < 3 ? "default" : "pointer" }}>Suggest this as the trail</button> : null}
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: "12px 0 0" }}>The gain and loss are read from terrain heights along your line, so they follow the ground, not the trail’s switchbacks. A drawn line is a sketch — check it against the map and the ground before you rely on it.</p>
    </div>
  </div>, document.body);
}
