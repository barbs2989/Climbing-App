import { useState } from "react";
import { useCatalogAreaSearch } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase";
import { MOUNTAINS, seedRoutesOn } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

/** A peak, as the pickers hand it on. */
export interface PickedPeak { id: string; name: string }
interface PeakHit { id: string; name?: string | null; area_type?: string | null; trail?: string[] }

export interface PeakPickerProps {
  C: typeof Palette;
  /** The peak being searched, or null while none is chosen. */
  value: PickedPeak | null;
  onPick: (p: PickedPeak | null) => void;
  /** The climber's saved peaks, offered as one-tap chips over the search. */
  savedPeaks?: ReadonlyArray<PickedPeak>;
  /** What the search box is for, read aloud ("Search for a peak to find partners on"). */
  label: string;
}

/* PICK A PEAK — Partners › A peak and Join a crew › By Peak (owner 2026-11-18: "allow users to find partners and crews
   by peaks as well. So probably needs by peak tab"). The catalog search every area picker uses (useCatalogAreaSearch,
   every state, the Climbs tab's spelling rules), kept to rows whose type is peak; saved peaks sit above it as chips.
   While the demo content shows (signed out, seedRoutesOn) the demo's own peaks answer too, since its example crews sit on them. */
const LIM = 40;
export default function PeakPicker({ C, value, onPick, savedPeaks, label }: PeakPickerProps) {
  const [q, setQ] = useState("");
  const searchQ = useCatalogAreaSearch(USE_DB ? q : "", LIM);
  const dbHits: PeakHit[] = ((searchQ.data && searchQ.data.rows) || []).filter((a: PeakHit) => a && a.id && a.area_type === "peak");
  const seedHits: PeakHit[] = (!USE_DB || seedRoutesOn()) && q.trim().length >= 2 ? MOUNTAINS.filter((m) => m.areaType === "peak" && (m.name || "").toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12).map((m) => ({ id: String(m.id), name: m.name, area_type: "peak" })) : [];
  const hits = seedHits.concat(dbHits.filter((d) => !seedHits.some((x) => (x.name || "").toLowerCase() === (d.name || "").toLowerCase())));
  const chip = (on: boolean) => ({ minHeight: 36, padding: "7px 13px", borderRadius: 20, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", maxWidth: "100%", overflowWrap: "anywhere" as const });
  if (value) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.blueBg, border: "1px solid " + C.blueDim, borderRadius: 10, padding: "8px 11px", marginBottom: 12 }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: C.blue, overflowWrap: "anywhere" }}>{"Searching " + value.name}</span>
      <button type="button" onClick={() => { onPick(null); setQ(""); }} style={{ minHeight: 36, background: C.surface, border: "1px solid " + C.border, color: C.textSub, borderRadius: 8, padding: "7px 10px", fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}>Change</button>
    </div>
  );
  const qOk = q.trim().length >= 2;
  return (
    <div style={{ marginBottom: 12 }}>
      {savedPeaks && savedPeaks.length ? <div role="group" aria-label="Your saved peaks" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>{savedPeaks.map((p) => <button key={p.id} type="button" onClick={() => onPick(p)} style={chip(false)}>{p.name}</button>)}</div> : null}
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={label} placeholder="Search any peak — Rainier, Shuksan, Hood…" style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.field, background: C.surface, color: C.text, fontSize: 13 }} />
      {!q.trim() ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{savedPeaks && savedPeaks.length ? "Tap one of your saved peaks, or search for another." : "Type a peak’s name."}</div>
        : !qOk ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Keep typing — at least two letters.</div>
        : USE_DB && searchQ.isError ? <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>Couldn’t search peaks right now — check your connection and try again.</div>
        : !hits.length ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{USE_DB && searchQ.isPending ? "Searching…" : "No peak in the catalog is named “" + q.trim() + "”. Try part of the name."}</div>
        : <div style={{ marginTop: 6, maxHeight: 220, overflowY: "auto", overscrollBehavior: "contain" }}>{hits.map((a) => {
          const where = (a.trail || []).slice(-2).join(" › ");
          return <button key={a.id} type="button" onClick={() => { onPick({ id: a.id, name: a.name || "this peak" }); setQ(""); }} style={{ display: "block", width: "100%", textAlign: "left", minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + C.border, background: C.card, color: C.text, cursor: "pointer", marginBottom: 5 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{a.name}</span>
            {where ? <span style={{ display: "block", fontSize: 11.5, color: C.textSub, overflowWrap: "anywhere" }}>{where}</span> : null}
          </button>;
        })}</div>}
    </div>
  );
}
