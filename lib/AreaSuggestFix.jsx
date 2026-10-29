// "Suggest an edit" for an AREA — the area page's answer to the route page's SuggestFix.
//
// Eight fields (lib/areaFields.js), the crag's parking pin among them (0378); each row shows the current value, the climber's own edit
// still awaiting review if there is one, and an input. One contributions row per changed field
// (area_id, route_id null, kind 'field'). Every edit is HELD for the owner (0319), like a route
// edit; on approval the database writes the areas column. The sheet says so in the route
// editor's words.
//
// `onSubmit(edits)` is App's: it owns the session, the login prompt and the toasts, so this
// sheet never claims a write it could not make (check:claims). It resolves to true when the
// rows were written. `area` may be null while a guard walks the overlay by name; the sheet
// then renders its fields with nothing to submit to.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AREA_EDIT_FIELDS, ASPECTS, MONTH_ABBR, PIN_NAME_MAX, myPendingAreaEdits, monthsLabel, pinLabel, pinProblem } from "./areaFields";
import WaypointMapPicker from "../src/components/WaypointMapPicker.tsx";
import { ROCK_OPTIONS } from "./rockType";
import { POP_CLOSE } from "./popupChrome.js";
import { BTN, CHIP, INPUT } from "./buttonStyles.js";

// Kilometres between two points (haversine) — only to warn when a parking pin lands far from the crag.
function kmApart(a, b) {
  const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLn = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLn / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const FAR_KM = 15;

export default function AreaSuggestFix({ area, field, rows, myId, C, onClose, onSubmit }) {
  const scrollRef = useRef(null);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { n, allEmpty }
  const [err, setErr] = useState(null);
  // A long current value (a description) opens in full on "Show all" rather than stopping at 140 characters.
  const [fullCur, setFullCur] = useState({});
  useEffect(() => {
    if (!field || !scrollRef.current) return;
    const t = setTimeout(() => { const el = scrollRef.current && scrollRef.current.querySelector("#af-section-" + field); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }, 80);
    return () => clearTimeout(t);
  }, [field]);
  const a = area || {};
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  const input = INPUT(C);
  // The parking pin's draft: strings while typed, so "47." is not refused mid-keystroke. It starts
  // from the pin on file, so the map opens where the car goes now and a move is one tap.
  const hasPin = a.parking_lat != null && a.parking_lng != null && isFinite(Number(a.parking_lat)) && isFinite(Number(a.parking_lng));
  const pin = vals.parking_pin || { lat: hasPin ? String(a.parking_lat) : "", lng: hasPin ? String(a.parking_lng) : "", name: "" };
  const setPin = (patch) => set("parking_pin", { ...pin, ...patch });
  const crag = a.lat != null && a.lng != null && isFinite(Number(a.lat)) && isFinite(Number(a.lng)) ? { lat: Number(a.lat), lng: Number(a.lng), name: a.name || "The crag" } : null;
  const pinWps = useMemo(() => { const la = Number(pin.lat), ln = Number(pin.lng); return pin.lat !== "" && pin.lng !== "" && isFinite(la) && isFinite(ln) ? [{ type: "Trailhead", name: pin.name || "Parking", lat: la, lng: ln }] : []; }, [pin.lat, pin.lng, pin.name]);
  const pinFar = crag && pinWps.length ? kmApart(crag, pinWps[0]) : 0;
  const lbl = { fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };

  // What changed, validated against each field's limits. Unchanged and blank rows are skipped.
  const edits = [];
  const problems = {};
  for (const f of AREA_EDIT_FIELDS) {
    const v = vals[f.k];
    if (v == null) continue;
    const cur = f.cur(a);
    if (f.type === "pin") {
      if (String(v.lat).trim() === "" && String(v.lng).trim() === "") continue;
      const p = pinProblem(v.lat, v.lng, v.name);
      if (p) { problems[f.k] = p; continue; }
      const val = { lat: Math.round(Number(v.lat) * 1e6) / 1e6, lng: Math.round(Number(v.lng) * 1e6) / 1e6 };
      const nm = String(v.name || "").trim();
      if (nm) val.name = nm;
      if (pinLabel(val.lat, val.lng, nm || a.parking_name) === cur) continue;
      edits.push({ field: f.k, value: val, wasEmpty: !cur });
    } else if (f.type === "months") {
      const m = Array.isArray(v) ? [...new Set(v.map(Number))].sort((x, y) => x - y) : [];
      if (!m.length) continue;
      if (monthsLabel(m) === cur) continue;
      edits.push({ field: f.k, value: m, wasEmpty: !cur });
    } else if (f.type === "int") {
      const s = String(v).trim();
      if (!s) continue;
      const n = Number(s);
      if (!Number.isInteger(n) || n < f.min || n > f.max) { problems[f.k] = "A whole number of minutes, " + f.min + " to " + f.max + "."; continue; }
      if (cur === n + " min") continue;
      edits.push({ field: f.k, value: n, wasEmpty: !cur });
    } else {
      const s = String(v).trim();
      if (!s) continue;
      if (s === cur) continue;
      if (f.type === "aspect" && !ASPECTS.includes(s)) { problems[f.k] = "Pick one of the directions."; continue; }
      if (f.min && s.length < f.min) { problems[f.k] = "At least " + f.min + " characters."; continue; }
      if (f.max && s.length > f.max) { problems[f.k] = "At most " + f.max + " characters (" + s.length + " now)."; continue; }
      edits.push({ field: f.k, value: s, wasEmpty: !cur });
    }
  }
  const canSubmit = !!area && edits.length > 0 && !Object.keys(problems).length && !busy;
  const submit = async () => {
    if (!canSubmit || !onSubmit) return;
    setBusy(true); setErr(null);
    try {
      const ok = await onSubmit(edits);
      if (ok) setSent({ n: edits.length, allEmpty: edits.every(e => e.wasEmpty) });
    } catch (e) { setErr((e && e.message) || "Could not save your suggestion — check your connection and retry."); }
    setBusy(false);
  };

  return createPortal(<div role="dialog" aria-modal="true" aria-label={"Suggest an edit to " + (a.name || "this area")} style={{ position: "fixed", inset: 0, background:C.scrimStrong, zIndex: 100000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, overflowY: "auto", overscrollBehavior: "contain", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sent ? "Thanks for contributing" : "Suggest an edit"}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
      {sent ? <div style={{ padding: 16 }}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>{"✓"}</div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>{sent.n === 1 ? "Sent for review" : sent.n + " edits sent for review"}</div>
        <div style={{ background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 11, padding: "11px 13px", fontSize: 12.5, color: C.text, lineHeight: 1.55, marginBottom: 12 }}>{"Every edit is checked before it shows. You’ll be told when it’s checked, and it credits you once it’s live."}</div>
        <button onClick={onClose} style={{ ...BTN, width: "100%", background: C.blueSolid, color:C.onSolid, border: "none" }}>Done</button>
      </div> : <div ref={scrollRef} style={{ minHeight: 0, padding: 16, overflowY: "auto", overscrollBehavior: "contain", flex: 1 }}>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>{"Spotted something wrong or missing about "}<b>{a.name || "this area"}</b>{"? Fill in any fields below — leave the rest blank. Every edit is checked before it shows on the page."}</div>
        {AREA_EDIT_FIELDS.map(f => {
          const cur = f.cur(a);
          const pend = myPendingAreaEdits(rows, myId).filter(r => r.field === f.k).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
          const v = vals[f.k];
          return <div key={f.k} id={"af-section-" + f.k} style={{ marginBottom: 14, scrollMarginTop: 8 }}>
            <div style={lbl}>{f.label}</div>
            <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}>{cur ? <>{"Now: "}<span style={{ color: C.textSub, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{cur.length > 140 && !fullCur[f.k] ? cur.slice(0, 140).trim() + "…" : cur}</span>{cur.length > 140 ? <button type="button" onClick={() => setFullCur(o => ({ ...o, [f.k]: !o[f.k] }))} aria-expanded={!!fullCur[f.k]} style={{ background: "none", border: "none", padding: "0 0 0 6px", color: C.blue, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{fullCur[f.k] ? "Show less" : "Show all"}</button> : null}</> : "Not on file yet."}</div>
            {pend ? <div style={{ fontSize: 11.5, color: C.text, background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 8, padding: "6px 9px", marginBottom: 6 }}>{"Awaiting review: "}<b>{f.type === "months" ? monthsLabel(pend.value) : f.fmt ? f.fmt(pend.value) : String(pend.value)}</b></div> : null}
            {f.type === "long" ? <textarea value={v || ""} onChange={e => set(f.k, e.target.value)} rows={3} maxLength={f.max} placeholder={f.hint} aria-label={f.label} style={{ ...input, resize: "vertical", minHeight: 76 }} /> : null}
            {f.type === "text" ? <><input value={v || ""} onChange={e => set(f.k, e.target.value)} maxLength={f.max} placeholder={f.hint} aria-label={f.label} style={input} list={"af-opts-" + f.k} />{f.k === "rock" ? <datalist id={"af-opts-" + f.k}>{ROCK_OPTIONS.map(o => <option key={o} value={o} />)}</datalist> : null}</> : null}
            {f.type === "int" ? <input value={v || ""} onChange={e => set(f.k, e.target.value)} inputMode="numeric" placeholder={f.hint} aria-label={f.label + " (minutes)"} style={input} /> : null}
            {f.type === "aspect" ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{f.opts.map(o => <button key={o} onClick={() => set(f.k, v === o ? "" : o)} aria-pressed={v === o} style={{ ...CHIP, border: "1px solid " + (v === o ? C.blue : C.border), background: v === o ? C.blueBg : C.card, color: v === o ? C.onSolid : C.textSub }}>{o === "varies" ? "Varies" : o}</button>)}</div> : null}
            {f.type === "months" ? <div style={{ display: "flex", gap: 3 }}>{MONTH_ABBR.map((m, i) => { const on = Array.isArray(v) && v.includes(i + 1); return <button key={m} onClick={() => set(f.k, on ? (v || []).filter(x => x !== i + 1) : [...(v || []), i + 1])} aria-pressed={on} aria-label={m} style={{ flex: 1, minWidth: 0, minHeight: 36, padding: 0, borderRadius: 7, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : C.card, color: on ? C.green : C.textSub, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>{m[0]}</button>; })}</div> : null}
            {f.type === "pin" ? <div>
              <WaypointMapPicker waypoints={pinWps} activeIdx={0} peakCoord={crag} tapHint={pinWps.length ? "Tap the map to move the parking pin" : "Tap the map where climbers park"} onPick={(la, ln) => setPin({ lat: la.toFixed(6), lng: ln.toFixed(6) })} />
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={pin.lat} onChange={e => setPin({ lat: e.target.value })} inputMode="decimal" placeholder="Latitude" aria-label="Parking latitude" style={{ ...input, flex: 1, minWidth: 0 }} />
                <input value={pin.lng} onChange={e => setPin({ lng: e.target.value })} inputMode="decimal" placeholder="Longitude" aria-label="Parking longitude" style={{ ...input, flex: 1, minWidth: 0 }} />
              </div>
              <input value={pin.name} onChange={e => setPin({ name: e.target.value })} maxLength={PIN_NAME_MAX} placeholder={hasPin && a.parking_name && a.parking_name !== "Trailhead" ? "Name (now: " + a.parking_name + ")" : "Name, if it has one (e.g. Main lot)"} aria-label="Parking name (optional)" style={input} />
              <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 5 }}>{f.hint}</div>
              {pinFar > FAR_KM ? <div role="status" style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.45, marginTop: 5 }}>{"This pin is " + Math.round(pinFar) + " km from the crag — check it is the right spot before sending."}</div> : null}
            </div> : null}
            {problems[f.k] ? <div role="alert" style={{ fontSize: 11.5, color: C.amber, marginTop: 5 }}>{problems[f.k]}</div> : null}
          </div>;
        })}
        {err ? <div role="alert" style={{ fontSize: 12.5, color: C.red, lineHeight: 1.45, marginBottom: 10 }}>{err}</div> : null}
        <button onClick={submit} disabled={!canSubmit} style={{ ...BTN, width: "100%", background: canSubmit ? C.blueSolid : C.card, color: canSubmit ? C.onSolid : C.textMuted, border: "1px solid " + (canSubmit ? C.blueSolid : C.border), cursor: canSubmit ? "pointer" : "default" }}>{busy ? "Sending…" : edits.length ? "Send " + edits.length + " " + (edits.length === 1 ? "edit" : "edits") : "Fill in a field to send"}</button>
      </div>}
    </div>
  </div>, document.body);
}
