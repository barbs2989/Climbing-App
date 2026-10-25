// "Add an area" — a climber proposes a crag, peak or area the catalog lacks, INSIDE the area page
// they opened it from (0360). Mountain Project's "Add to Page → Sub-Area", in the app rather than
// only on a website, with the duplicate check MP leaves to its admins done up front: as the name
// is typed, the places already filed under that name anywhere in the catalog are listed, each with
// its path, and tapping one goes there instead.
//
// Nothing is filed here. `onSubmit(value)` is App's: it owns the session, the login prompt and the
// toast (check:claims), and resolves true once the contributions row is written. The area shows
// only after the owner approves it (approve_new_area), and the sheet says so.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useCatalogAreaSearch } from "./db";
import { POP_CLOSE } from "./popupChrome.js";
import { BTN, CHIP, INPUT } from "./buttonStyles.js";
import { clickable } from "./clickable";

const KINDS = [["crag", "Crag, wall or boulder", "Has climbs on it"], ["peak", "Peak", "A summit with routes up it"], ["region", "Area", "Holds crags or peaks of its own"]];
const NAME_MAX = 120, DESC_MAX = 1500;

export default function AddArea({ parent, C, onClose, onSubmit, onOpenArea }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("crag");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState(null); // { lat, lng }
  const [locMsg, setLocMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const p = parent || {};
  const nm = name.trim();
  const dupQ = useCatalogAreaSearch(nm, 5);
  const dups = (dupQ.data && dupQ.data.rows) || [];
  const input = INPUT(C);
  const lbl = { fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };
  const canSubmit = !!parent && nm.length > 0 && nm.length <= NAME_MAX && desc.length <= DESC_MAX && !busy;

  const here = () => {
    if (!navigator.geolocation) { setLocMsg("This device can't share its location."); return; }
    setLocMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      pos => { setLoc({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) }); setLocMsg(null); },
      () => setLocMsg("Couldn't get your location — you can leave it out."),
      { enableHighAccuracy: true, timeout: 15000 });
  };
  const submit = async () => {
    if (!canSubmit || !onSubmit) return;
    setBusy(true); setErr(null);
    try {
      const ok = await onSubmit({ name: nm, areaType: kind, description: desc.trim() || null, lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, parentName: p.name || null });
      if (ok) setSent(true);
    } catch (e) { setErr((e && e.message) || "Could not send it — check your connection and retry."); }
    setBusy(false);
  };

  return createPortal(<div role="dialog" aria-modal="true" aria-label={"Add an area to " + (p.name || "this area")} style={{ position: "fixed", inset: 0, background:C.scrimStrong, zIndex: 100000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, overflowY: "auto", overscrollBehavior: "contain", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sent ? "Thanks for contributing" : "Add an area"}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
      {sent ? <div style={{ padding: 16 }}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>{"✓"}</div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>{nm + " sent for review"}</div>
        <div style={{ background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 11, padding: "11px 13px", fontSize: 12.5, color: C.text, lineHeight: 1.55, marginBottom: 12 }}>{"Every new area is checked before it shows. Once it’s live under " + (p.name || "its area") + ", you can add its climbs."}</div>
        <button onClick={onClose} style={{ ...BTN, width: "100%", background: C.blueSolid, color:C.onSolid, border: "none" }}>Done</button>
      </div> : <div style={{ minHeight: 0, padding: 16, overflowY: "auto", overscrollBehavior: "contain", flex: 1 }}>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>{"A new crag, peak or area inside "}<b>{p.name || "this area"}</b>{". It’s checked before it shows on the page."}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={NAME_MAX} placeholder="What climbers call it" aria-label="Area name" style={input} />
          {dups.length ? <div style={{ marginTop: 8, border: "1px solid " + C.amber + "55", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ fontSize: 12, color: C.text, background: C.amberBg, padding: "7px 10px", lineHeight: 1.45 }}>{"Already in the catalog? Open it rather than adding it twice:"}</div>
            {dups.map(a => <div key={a.id} {...clickable(() => onOpenArea && onOpenArea(a))} style={{ padding: "8px 10px", cursor: "pointer", borderTop: "1px solid " + C.borderLight, background: C.surface }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{a.name}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>{(a.trail || []).join(" › ") + (a.route_count ? " · " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") : "")}</div>
            </div>)}
          </div> : null}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>What is it?</div>
          <div role="group" aria-label="What kind of area" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {KINDS.map(k => <button key={k[0]} onClick={() => setKind(k[0])} aria-pressed={kind === k[0]} style={{ ...CHIP, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, textAlign: "left", minHeight: 44, border: "1px solid " + (kind === k[0] ? C.blue : C.border), background: kind === k[0] ? C.blueBg : C.card, color: kind === k[0] ? C.blue : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><span>{k[1]}</span><span style={{ fontSize: 11.5, fontWeight: 500, color: C.textMuted }}>{k[2]}</span></button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>About it (optional)</div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={DESC_MAX} placeholder="The rock, the style of climbing, where it sits" aria-label="About this area" style={{ ...input, resize: "vertical", minHeight: 76 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>Location (optional)</div>
          {loc ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}><span style={{ flex: 1 }}>{loc.lat + ", " + loc.lng}</span><button onClick={() => setLoc(null)} style={{ ...CHIP, border: "1px solid " + C.border, background: C.card, color: C.textSub, cursor: "pointer" }}>Clear</button></div>
            : <button onClick={here} style={{ ...BTN, width: "100%", border: "1px solid " + C.border, background: C.card, color: C.text }}>{"I’m standing at it — use my location"}</button>}
          {locMsg ? <div role="status" style={{ fontSize: 11.5, color: C.textMuted, marginTop: 5 }}>{locMsg}</div> : null}
        </div>

        {err ? <div role="alert" style={{ fontSize: 12.5, color: C.red, lineHeight: 1.45, marginBottom: 10 }}>{err}</div> : null}
        <button onClick={submit} disabled={!canSubmit} style={{ ...BTN, width: "100%", background: canSubmit ? C.blueSolid : C.card, color: canSubmit ? C.onSolid : C.textMuted, border: "1px solid " + (canSubmit ? C.blueSolid : C.border), cursor: canSubmit ? "pointer" : "default" }}>{busy ? "Sending…" : nm ? "Send " + nm + " for review" : "Name the area to send it"}</button>
      </div>}
    </div>
  </div>, document.body);
}
