import { EditIconButton, CopyCoordButton, NO_PARKING_PIN_BUT_NOTE_LINE, NO_PARKING_PIN_LINE } from "../../lib/areaChrome";

// ── GETTING THERE: drive & park, walk in, and the maps links — the area's own columns only ──
export default function AreaGettingThere({ area, C, onEdit }) {
  const note = area.parking_note && String(area.parking_note).trim();
  const walk = area.approach && String(area.approach).trim();
  const park = area.parking_lat != null && area.parking_lng != null && isFinite(Number(area.parking_lat)) && isFinite(Number(area.parking_lng)) ? { lat: Number(area.parking_lat), lng: Number(area.parking_lng) } : null;
  const crag = area.lat != null && area.lng != null ? { lat: Number(area.lat), lng: Number(area.lng) } : null;
  const dest = park || crag;
  const lbl = { fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };
  const linkSt = { flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.greenDim, background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" };
  const ll = dest ? dest.lat + "," + dest.lng : "";
  const to = park ? "parking" : "crag";
  // The crag-wide parking pin is a suggestable field (0378), so the page offers it where it is missing and where it sits.
  const pinLink = { display: "inline-flex", alignItems: "center", minHeight: 44, background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" };
  return <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}><div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Getting there</div>{onEdit ? <EditIconButton C={C} onClick={() => onEdit(note ? "approach" : "parking_note")} title={"Edit how to get to " + area.name} /> : null}</div>
    {!note && !walk ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: dest ? 10 : 0 }}>{"No directions on file yet. Know the way in? "}{onEdit ? <button onClick={() => onEdit("parking_note")} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Add it</button> : "Add it"}{"."}</div> : null}
    {note || park ? <div style={{ marginBottom: 10 }}>
      <div style={lbl}>{"Drive & park" + (area.parking_name && area.parking_name !== "Trailhead" ? " · " + area.parking_name : "")}</div>
      {note ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginBottom: park ? 6 : 0 }}>{note}</div> : null}
      {park ? <CopyCoordButton lat={park.lat} lng={park.lng} what="parking" C={C} /> : null}
      {park && onEdit ? <button onClick={() => onEdit("parking_pin")} style={pinLink}>Move the pin</button> : null}
    </div> : null}
    {walk || area.approach_min ? <div style={{ marginBottom: 10 }}>
      <div style={lbl}>{"Walk in" + (area.approach_min ? " · about " + area.approach_min + " min" : "")}</div>
      {walk ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{walk}</div> : null}
    </div> : null}
    {dest ? <div>
      <div style={lbl}>{park ? "Directions to parking" : "Directions"}</div>
      {park ? null : <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}>{note ? NO_PARKING_PIN_BUT_NOTE_LINE : NO_PARKING_PIN_LINE}{onEdit ? <>{" "}<button onClick={() => onEdit("parking_pin")} style={pinLink}>Add the parking pin</button></> : null}</div>}
      {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.45, marginBottom: 6 }}>Coordinates are approximate, so these are rough.</div> : null}
      {/* The mount above is gated on ["crag", "peak", "wall"].includes(area.area_type) — a drive link is offered only where there is somewhere to park. */}
      <div style={{ display: "flex", gap: 8 }}>
        <a href={"https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + ll} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Google Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}>Google Maps</a>
        <a href={"https://maps.apple.com/?dirflg=d&daddr=" + ll} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Apple Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}>Apple Maps</a>
      </div>
    </div> : null}
  </div>;
}
