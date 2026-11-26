import { foldKeepingPlace } from "../../lib/keepPlace.js";
import { EditIconButton, CopyCoordButton, noParkingPinButNoteLine, noParkingPinLine } from "../../lib/areaChrome";
import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import ActionIcon from "./ActionIcon";
import WalkInMap, { walkInPts } from "../../lib/WalkInMap.jsx";
import { fmtTrailLen, trailLenM } from "../../lib/TrailDrawMap.jsx";
import { MIN_RECORDED_PTS } from "../../lib/track.js";
import { useCragParkingAbove } from "../../lib/db";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { safeHref } from "../../lib/safeUrl.js";

// MapLibre is fetched only when a climber asks for 3D, as on the route and area maps.
// Named apart from NearMePanel's own lazy Route3DView: the guards read both components as one file's code.
const WalkIn3DView = lazy(() => import("../../lib/Route3DView.jsx"));
// The trail form the route page's "Add the trail" opens (#2532): Draw on map first, then Paste, Upload, How to export.
const CragTrailForm = lazy(() => import("../../lib/GpsSubmissionModal.jsx"));

export interface AreaGettingThereArea {
  /** The ltree path (root first); a wall with no parking of its own reads its crag's through it. */
  path?: string | null;
  name: string;
  area_type?: string | null;
  parking_note?: string | null;
  approach?: string | null;
  approach_min?: number | null;
  parking_name?: string | null;
  parking_lat?: number | string | null;
  parking_lng?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  coords_approx?: boolean | null;
  /** The crag's approved walk in (0397), [[lat,lng],...], and whether it was recorded or traced. */
  walkin_gpx?: unknown[] | null;
  walkin_kind?: string | null;
}
export interface AreaGettingThereProps {
  area: AreaGettingThereArea;
  C: typeof Palette;
  /** Opens the editor on a field ("approach", "parking_note", "parking_pin"); absent hides every edit control. */
  onEdit?: ((field: string) => void) | null;
  /** Drawn as a section of the area sheet (no card of its own): the words first, clamped, then the map. */
  flat?: boolean;
  /** A climb filed directly on this crag. A trail is submitted against a climb and approved onto THAT climb's area
   *  (review_gps_submission, 0397), so only a climb on this area lands it here; absent hides Draw the trail. */
  trailRoute?: { id: string | number; name: string } | null;
}
// In the sheet, long directions open at about five lines with Show more (owner, 2026-11-11: "a getting there text
// description with maps below that").
const FLAT_CLAMP_CHARS = 320, FLAT_CLAMP_PX = 108;

// One leg of the way in: an icon in a tinted circle, a rail down to the next leg, then the leg's title and words
// (owner, 2026-11-23: "update the ui of getting there"). The icon is decoration; the title says what the leg is.
interface StepProps { icon: string; tone: "amber" | "green"; title: string; meta?: ReactNode; last?: boolean; children?: ReactNode; C: typeof Palette }
function Step({ icon, tone, title, meta, last, children, C }: StepProps) {
  return <div style={{ display: "flex", gap: 11 }}>
    <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <span style={{ width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", background: tone === "amber" ? C.amberBg : C.greenBg, border: "1px solid " + (tone === "amber" ? C.amber : C.greenDim) }}><ActionIcon name={icon} size={16} color={tone === "amber" ? C.amber : C.green} /></span>
      {last ? null : <span style={{ flex: 1, width: 2, minHeight: 10, margin: "4px 0", borderRadius: 1, background: C.border }} />}
    </div>
    <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 4 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 8px", minHeight: 30 }}><span style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{title}</span>{meta}</div>
      {children}
    </div>
  </div>;
}

// ── GETTING THERE: drive & park, walk in, and the maps links — the area's own columns only ──
export default function AreaGettingThere({ area, C, onEdit, flat, trailRoute }: AreaGettingThereProps) {
  const [more, setMore] = useState(false);
  const [view3d, setView3d] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const ownNote = area.parking_note && String(area.parking_note).trim();
  const walk = area.approach && String(area.approach).trim();
  const ownPark = area.parking_lat != null && area.parking_lng != null && isFinite(Number(area.parking_lat)) && isFinite(Number(area.parking_lng)) ? { lat: Number(area.parking_lat), lng: Number(area.parking_lng) } : null;
  // A wall with no parking of its own shows its CRAG's (the rule a climb's page has followed since #3800), named as the
  // crag's; its own pencil and pin links still edit this wall's own fields.
  const upQ = useCragParkingAbove(area);
  const up = !ownNote && !ownPark && upQ.data ? upQ.data as { name: string | null; note: string | null; lat: number | null; lng: number | null; pinName: string | null } : null;
  const note = ownNote || (up && up.note) || null;
  const park = ownPark || (up && up.lat != null && up.lng != null ? { lat: up.lat, lng: up.lng } : null);
  const parkName = ownPark || ownNote ? area.parking_name : up ? up.pinName : null;
  const crag = area.lat != null && area.lng != null ? { lat: Number(area.lat), lng: Number(area.lng) } : null;
  const dest = park || crag;
  // A PEAK's own coordinate is its summit, not a crag (owner note 2026-11-26: "Getting there section on peaks map shows c
  // for crag when it's a peak not a crag"), so its pin, key, 3D pin and fallback wording say summit.
  const isPeak = area.area_type === "peak";
  const place = isPeak ? "summit" : "crag";
  // The same recorded-track-or-nothing floor the climbs' maps apply (MIN_RECORDED_PTS).
  const trailPts = walkInPts(area.walkin_gpx);
  const trail = trailPts.length >= MIN_RECORDED_PTS ? trailPts : null;
  const lbl: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: C.label, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };
  const linkSt: CSSProperties = { flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxSizing: "border-box", minHeight: 44, padding: "8px 10px", borderRadius: 10, border: "1px solid " + C.greenDim, background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" };
  const chipSt: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: C.surface, border: "1px solid " + C.borderLight, color: C.textSub, fontSize: 11.5, fontWeight: 700, maxWidth: "100%", overflowWrap: "anywhere" };
  const ll = dest ?dest.lat + "," + dest.lng : "";
  const to = park ? "parking" : place;
  // The crag-wide parking pin is a suggestable field (0378), so the page offers it where it is missing and where it sits.
  const pinLink = { display: "inline-flex", alignItems: "center", minHeight: 44, background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" };
  const long = !!flat && ((note || "").length + (walk || "").length) > FLAT_CLAMP_CHARS;
  const clampSt: CSSProperties | undefined = long && !more ? { maxHeight: FLAT_CLAMP_PX, overflow: "hidden", WebkitMaskImage: "linear-gradient(to bottom, #000 65%, transparent)", maskImage: "linear-gradient(to bottom, #000 65%, transparent)" } : undefined;
  // No recorded walk in: in the sheet the map still comes after the words, with the parking (P) and crag (C) pins.
  const pinMap = flat && !trail && dest && !area.coords_approx;
  // DRAW THE TRAIL (owner, 2026-11-24: "allow people to draw the approach to crags"). The form already existed, but only
  // a crag climb's Planner reached it, so in production nobody had ever sent one. A walk in is one line per crag
  // (withCragWalkIn draws it on every crag climb), so it is offered on a crag or wall with a pin to start from.
  const canDraw = !!trailRoute && !!dest && !area.coords_approx && (area.area_type === "crag" || area.area_type === "wall");
  return <div style={flat ? { padding: "12px 14px", borderTop: "1px solid " + C.border } : { background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}><div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Getting there</div>{onEdit ? <EditIconButton C={C} onClick={() => onEdit(ownNote ? "approach" : "parking_note")} title={"Edit how to get to " + area.name} /> : null}</div>
    {!note && !walk ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: dest ? 10 : 0 }}>{(park ? "No written directions yet" : "No directions on file yet") + ". Know the way in? "}{onEdit ? <button onClick={() => onEdit("parking_note")} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Add it</button> : "Add it"}{"."}</div> : null}
    <div style={clampSt}>
    {note || park ? <Step icon="car" tone="amber" title="Drive & park" last={!(walk || area.approach_min)} C={C} >
      {up ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 4 }}>{"Parking for " + (up.name || "the crag") + ", shared by every wall there."}</div> : null}
      {parkName && parkName !== "Trailhead" ? <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12.5, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 4 }}><span aria-hidden="true" style={{ display: "flex", flexShrink: 0, marginTop: 2 }}><ActionIcon name="pin" size={13} color={C.amber} /></span><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{parkName}</span></div> : null}
      {note ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginTop: 2, marginBottom: park ? 8 : 0 }}>{note}</div> : null}
      {park ? <CopyCoordButton lat={park.lat} lng={park.lng} what="parking" C={C} /> : null}
      {park && onEdit ? <button onClick={() => onEdit("parking_pin")} style={pinLink}>{up ? "Pin this wall's own parking" : "Move the pin"}</button> : null}
    </Step> : null}
    {walk || area.approach_min ? <Step icon="walk" tone="green" title="Walk in" last C={C} meta={area.approach_min ? <span style={chipSt}><ActionIcon name="clock" size={12} color={C.green} />{"about " + area.approach_min + " min"}</span> : null}>
      {walk ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginTop: 2 }}>{walk}</div> : null}
    </Step> : null}
    </div>
    {long ? <button onClick={(e) => foldKeepingPlace(e, () => setMore(m => !m), more)} aria-expanded={more} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", background: "none", border: "none", padding: "0 0 6px 41px", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{more ? "Show less" : "Show more"}</button> : null}
    {pinMap && dest ? <div style={{ marginTop: 4, marginBottom: 12 }}><WalkInMap pts={[]} park={park} crag={crag} summit={isPeak} height={180} zoom={14} label={"Map of " + area.name + (park ? " with the parking pin (P)" : "")} on3d={() => setView3d(true)} expandable title={"Getting to " + area.name} /></div> : null}
    {trail ? <div style={{ marginTop: 4, marginBottom: 12 }}>
      <div style={lbl}>{"Trail to the " + place + " · " + fmtTrailLen(trailLenM(trail))}</div>
      <WalkInMap pts={trail} park={park} crag={crag} summit={isPeak} on3d={() => setView3d(true)} expandable title={"Trail to " + area.name} />
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 6 }}>{"From the parking (P) to the " + (isPeak ? "summit (S)" : "crag (C)") + ". " + (area.walkin_kind === "traced" ? "A climber traced it on the map; it is not a GPS recording. " : "") + (isPeak ? "" : "Every climb here shows it on its crag map.")}</div>
    </div> : null}
    {canDraw ? <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 10px", marginTop: trail || pinMap ? -6 : 4, marginBottom: 10 }}>
      {trail ? null : <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>No trail to the crag on file yet.</span>}
      <button type="button" onClick={() => setDrawOpen(true)} style={{ ...pinLink, gap: 6 }}><ActionIcon name="map" size={14} color={C.blue} />{trail ? "Suggest a better trail" : "Draw the trail"}</button>
    </div> : null}
    {canDraw && drawOpen && trailRoute ? createPortal(<Suspense fallback={null}><CragTrailForm routeId={String(trailRoute.id)} routeName={area.name} crag parkAt={park} cragAt={crag} initialPts={null} initialShape={null} onClose={() => setDrawOpen(false)} onSuccess={() => { /* the form shows its own receipt; its Done closes it */ }} /></Suspense>, document.body) : null}
    {/* The crag over the terrain: the same pins as the flat map above, and the walk in where one is on file, with the
        same caveat when the line was traced rather than recorded. No crag has a walk in on file yet (2026-11-18), so the
        pin map is the one climbers meet. "P" and "C" (a peak's "S") are fixed letters, not data. */}
    {(trail || pinMap) && view3d ? <Suspense fallback={null}><WalkIn3DView title={trail ? area.name + " walk in" : area.name} kind={trail ? "walk-in map" : place + " map"} maxZoom={trail || (park && crag) ? 17.5 : 16} exaggeration={1} onClose={() => setView3d(false)}
      tracks={trail ? [{ id: "walkin", color: C.orange, label: "Trail to the " + place + (area.walkin_kind === "traced" ? " (traced on the map, not a GPS recording)" : ""), pts: trail }] : []}
      waypoints={(park ? [{ lat: park.lat, lng: park.lng, name: parkName && parkName !== "Trailhead" ? parkName : "Parking", color: C.blue, iconHtml: "P" }] : []).concat(crag ? [{ lat: crag.lat, lng: crag.lng, name: area.name, color: C.orange, iconHtml: isPeak ? "S" : "C" }] : [])} /></Suspense> : null}
    {dest ? <div style={{ padding: "10px 12px 12px", borderRadius: 10, background: C.surface, border: "1px solid " + C.borderLight }}>
      <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><ActionIcon name="nav" size={13} color={C.label} />{park ? "Directions to parking" : "Directions"}</div>
      {park ? null : <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}>{note ? noParkingPinButNoteLine(place) : noParkingPinLine(place)}{onEdit ? <>{" "}<button onClick={() => onEdit("parking_pin")} style={pinLink}>Add the parking pin</button></> : null}</div>}
      {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.45, marginBottom: 6 }}>Coordinates are approximate, so these are rough.</div> : null}
      {/* The mount above is gated on ["crag", "peak", "wall"].includes(area.area_type) — a drive link is offered only where there is somewhere to park. */}
      <div style={{ display: "flex", gap: 8 }}>
        <a href={safeHref("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + ll)} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Google Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}><ActionIcon name="map" size={15} color={C.green} />Google Maps</a>
        <a href={safeHref("https://maps.apple.com/?dirflg=d&daddr=" + ll)} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Apple Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}><ActionIcon name="map" size={15} color={C.green} />Apple Maps</a>
      </div>
    </div> : null}
  </div>;
}
