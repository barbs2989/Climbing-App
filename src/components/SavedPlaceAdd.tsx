import { useState } from "react";
import { useCatalogAreaSearch } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase";
import { MOUNTAINS, seedRoutesOn } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

interface PlaceHit { id: string; name?: string | null; area_type?: string | null; trail?: ReadonlyArray<string> | null }

export interface SavedPlaceAddProps {
  C: typeof Palette;
  /** Which box this sits in: Saved areas offers everything that is not a peak, Saved peaks only peaks. */
  kind: "area" | "peak";
  /** Every id already saved, so a hit that is saved says so instead of offering to save it twice. */
  savedIds: ReadonlyArray<string>;
  /** Saves one place: App's toggleBookmark, the call the Save button on the area page makes. */
  onSave: (id: string) => void;
}

/* ADD AN AREA OR A PEAK FROM THE SAVED BOX ITSELF (owner 2026-11-23: "We should allow them to add areas and peaks
   directly on those boxes there too"). Until now the only way to save a place was to browse to its page on the Climbs
   tab and tap Save there. This is the catalog search every area picker uses (useCatalogAreaSearch, every state, the
   Climbs tab's spelling rules), split on area_type the way the two boxes are; a tap saves through the same
   toggleBookmark, so it persists and toasts the same way. The box stays open after a save so several can be added.
   While the demo content shows (signed out, seedRoutesOn) the demo's own places answer too, as in PeakPicker. */
const LIM = 40;
export default function SavedPlaceAdd({ C, kind, savedIds, onSave }: SavedPlaceAddProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const peak = kind === "peak";
  const noun = peak ? "peak" : "area";
  const fits = (t: string | null | undefined) => (peak ? t === "peak" : t !== "peak" && t !== "world");
  const searchQ = useCatalogAreaSearch(USE_DB && open ? q : "", LIM);
  const rows: PlaceHit[] = (searchQ.data && searchQ.data.rows) || [];
  const dbHits = rows.filter((a) => a && a.id && fits(a.area_type));
  const term = q.trim().toLowerCase();
  const qOk = term.length >= 2;
  const seedHits: PlaceHit[] = (!USE_DB || seedRoutesOn()) && qOk ? MOUNTAINS.filter((m) => fits(m.areaType) && (m.name || "").toLowerCase().includes(term)).slice(0, 12).map((m) => { const p = MOUNTAINS.find((x) => x.id === m.parentId); return { id: String(m.id), name: m.name, area_type: m.areaType, trail: p && p.name ? [p.name] : [] }; }) : [];
  const hits = seedHits.concat(dbHits.filter((d) => !seedHits.some((x) => (x.name || "").toLowerCase() === (d.name || "").toLowerCase())));
  const isSaved = (id: string) => savedIds.indexOf(id) >= 0;
  const note = { fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.5 };
  if (!open) return (
    <button type="button" aria-expanded={false} onClick={() => setOpen(true)} style={{ width: "100%", minHeight: 44, marginTop: 10, padding: "10px", borderRadius: 10, border: "1px dashed " + C.blueDim, background: "none", color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"+ Add " + (peak ? "a peak" : "an area")}</button>
  );
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid " + C.border }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label={"Search for " + (peak ? "a peak" : "an area") + " to save"} placeholder={peak ? "Search any peak — Rainier, Shuksan, Hood…" : "Search any area — Index, Smith Rock, Red Rock…"} style={{ flex: 1, minWidth: 0, boxSizing: "border-box", minHeight: 44, padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13 }} />
        <button type="button" aria-expanded={true} onClick={() => { setOpen(false); setQ(""); }} style={{ flexShrink: 0, minHeight: 44, padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.textSub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
      </div>
      {!term ? <div style={note}>{"Type the " + noun + "’s name, then tap it to save it."}</div>
        : !qOk ? <div style={note}>Keep typing — at least two letters.</div>
        : USE_DB && searchQ.isError && !hits.length ? <div style={{ ...note, color: C.amber }}>{"Couldn’t search " + noun + "s right now — check your connection and try again."}</div>
        : !hits.length ? <div style={note}>{USE_DB && searchQ.isPending ? "Searching…" : "No " + noun + " in the catalog is named “" + q.trim() + "”. Try part of the name."}</div>
        : <div style={{ marginTop: 8, maxHeight: 264, overflowY: "auto", overscrollBehavior: "contain" }}>{hits.map((a) => {
          const where = (a.trail || []).slice(-2).join(" › ");
          const had = isSaved(a.id);
          const nm = a.name || "this " + noun;
          return <button key={a.id} type="button" disabled={had} onClick={() => onSave(a.id)} aria-label={had ? nm + ", already saved" : "Save " + nm} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", minHeight: 44, padding: "8px 10px", borderRadius: 9, border: "1px solid " + (had ? C.greenDim : C.border), background: had ? C.greenBg : C.card, color: C.text, cursor: had ? "default" : "pointer", marginBottom: 5 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{nm}</span>
              {where ? <span style={{ display: "block", fontSize: 11.5, color: C.textSub, overflowWrap: "anywhere" }}>{where}</span> : null}
            </span>
            <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: had ? C.green : C.blue }}>{had ? "✓ Saved" : "+ Save"}</span>
          </button>;
        })}{rows.length >= LIM ? <div style={note}>{"Not here? Type more of the name."}</div> : null}</div>}
    </div>
  );
}
