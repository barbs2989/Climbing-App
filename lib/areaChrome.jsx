// Small controls shared by the route page and the area page. They take `C` as a prop because
// this module is imported by lib/DbAreaBrowser.jsx, which must not import ClimbMatchCore (core
// lazy-imports the browser; a static import back would make that cycle static).
//
// EditIconButton and CopyCoordButton used to be private to RouteDetail.jsx and closed over
// core's C; they moved here when the area page needed the same two controls (2026-10-15).
import { useState } from "react";
import ActionIcon from "../src/components/ActionIcon.tsx";

// The ONE look for an Edit button beside a section heading -- route sections, area sections, the
// Profile's sections and a pitch row. Outlined and quiet, with a blue pencil: a filled blue pill on
// every section was the loudest thing on both pages (2026-10-24).
export const editBtnStyle = (C) => ({ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 32, padding: "5px 11px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" });
export const EditPencil = ({ C }) => <span aria-hidden="true" style={{ display: "inline-flex" }}><ActionIcon name="log" size={14} color={C.blue} /></span>;

export const EditIconButton = ({ onClick, title, C }) => (
  <button onClick={onClick} title={title} aria-label={title} style={editBtnStyle(C)}><EditPencil C={C} />Edit</button>
);

export function CopyCoordButton({ lat, lng, what, C }) {
  const [copied, setCopied] = useState(false);
  const txt = lat.toFixed(5) + ", " + lng.toFixed(5);
  const copy = function () { var _p; var _no = function () { setCopied("fail"); setTimeout(() => setCopied(false), 2400); }; try { _p = navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) { } if (_p && _p.then) _p.then(function () { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(_no); else _no(); };
  return <button onClick={copy} aria-label={copied === "fail" ? "Couldn’t copy — your browser blocked clipboard access" : copied ? what + " coordinates copied" : "Copy " + what + " coordinates " + txt} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.textSub, cursor: "pointer", textAlign: "left" }}><span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere" }}>{txt}</span><span aria-hidden="true" style={{ fontSize: 11.5, fontWeight: 700, color: copied === "fail" ? C.amber : copied ? C.green : C.blue, flexShrink: 0 }}>{copied === "fail" ? "Copy failed" : copied ? "Copied ✓" : "Copy"}</span></button>;
}

// The honest line under directions that go to the formation rather than a parking spot —
// RouteDetail's CragLocationCard wording, shared so the two pages say the same thing.
export const NO_PARKING_PIN_LINE = "No parking spot on file, so these go to the crag itself — your maps app will stop at the nearest road, which may not be where climbers park.";
export const NO_PARKING_PIN_BUT_NOTE_LINE = "No parking pin on file yet, so these go to the crag itself — the note above says where climbers park.";
