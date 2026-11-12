import { useEffect, useState } from "react";
import { removePartnerArea, savePartnerArea } from "../../lib/db";
import { tx } from "../../lib/tapWords.js";
import Chevron from "./Chevron.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface ListMeInAreaBoxListing { areaId?: string; [column: string]: unknown }
export interface ListMeInAreaBoxProps {
  /** The place chosen in Partners › By Area: a crag, canyon, range, or a whole state/country. */
  areaId: string;
  areaName: string;
  C: typeof Palette;
  /** The signed-in climber's id. */
  uid: string;
  /** The climber's own partner-area listings, to know whether they are already listed here. */
  myListings?: ListMeInAreaBoxListing[] | null;
  /** Opens the listing editor preset to this area, for dates and climbing types. */
  onListMe?: (pre: { areaId: string; name: string; areaType?: string | null; disciplines: string[] }) => void;
  notify?: (msg: string) => void;
}

/* LIST ME HERE in Partners › By Area (owner request, 2026-11-11). The by-area list shows climbers LISTED
   at a place, and the only ways in were the area page's "Partners here" card or the My areas editor —
   neither on the screen where a climber has just picked the place they want partners at. This box sits
   right under the picker, so the climber who is looking can be found by the next one with one tap.
   Same write as the area page's card (savePartnerArea / removePartnerArea), optimistic the same way. */
export default function ListMeInAreaBox({ areaId, areaName, C, uid, myListings, onListMe, notify }: ListMeInAreaBoxProps) {
  const [busy, setBusy] = useState(false);
  const [optListed, setOptListed] = useState<boolean | null>(null);
  const serverListed = !!(myListings || []).find((l) => l && l.areaId === areaId);
  useEffect(() => { setOptListed(null); }, [serverListed, areaId]);
  const listed = optListed == null ? serverListed : optListed;
  const name = areaName || "this area";
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setOptListed(!listed);
    try {
      if (listed) await removePartnerArea(uid, areaId);
      else await savePartnerArea(uid, { areaId, disciplines: [] });
    } catch (e: unknown) {
      setOptListed(null);
      if (notify) notify((listed ? "Couldn’t remove your listing — " : "Couldn’t list you here — ") + ((e && (e as Error).message) || "try again"));
    } finally { setBusy(false); }
  };
  return (
    <div role="region" aria-label={"List yourself at " + name} style={{ marginTop: 12, padding: "13px 14px", borderRadius: 12, background: listed ? C.greenBg : C.blueBg, border: "2px solid " + (listed ? C.green : C.blueDim) }}>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: C.text, marginBottom: 4, overflowWrap: "anywhere" }}>{listed ? "You’re listed at " + name + " ✓" : "Climb at " + name + "?"}</div>
      <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 10 }}>{listed ? "Climbers who search " + name + " can find you and reach out." : "List yourself here so climbers searching " + name + " can find you — just like you’re finding them."}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={listed} aria-label={listed ? "Listed at " + name + tx(" — tap to remove") : "List me at " + name} style={{ flex: listed ? "0 0 auto" : "1 1 auto", minHeight: 44, padding: "0 16px", borderRadius: 10, border: listed ? "1px solid " + C.border : "none", background: listed ? C.surface : C.blueSolid, color: listed ? C.textSub : C.onSolid, fontSize: 13.5, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, overflowWrap: "anywhere" }}>{listed ? "Remove listing" : "List me at " + name}</button>
        {listed && onListMe ? (
          <button type="button" onClick={() => onListMe({ areaId, name: areaName, areaType: null, disciplines: [] })} aria-label={"Add the dates and climbing types for your listing at " + name} style={{ flex: "1 1 auto", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
            <span>Add dates or climbing types</span>
            <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron size={14} color={C.textMuted} /></span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
