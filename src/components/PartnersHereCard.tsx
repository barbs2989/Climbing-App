import { usePartnerAreaCount, usePartnersInArea, removePartnerArea, savePartnerArea } from "../../lib/db";
import { useState, useEffect } from "react";
import Chevron from "./Chevron.tsx";
import { BTN_LINK, BTN } from "../../lib/buttonStyles.js";
import type { ComponentType } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type { PartnerRow, RealClimberRowProps } from "./RealClimberRow.tsx";

export interface PartnersHereCardArea { id: string; name: string; area_type?: string | null; disciplines?: string[] | null }
export interface PartnersHereCardListing { areaId?: string; [column: string]: unknown }
export interface PartnersHereCardProps {
  area: PartnersHereCardArea;
  C: typeof Palette;
  /** The signed-in climber's id; absent means signed out and the card asks to sign in. */
  uid?: string | null;
  /** The climber's own partner-area listings. */
  myListings?: PartnersHereCardListing[] | null;
  /** Opens the listing editor preset to this area (dates and climbing types). */
  onListMe?: (pre: { areaId: string; name: string; areaType?: string | null; disciplines: string[] }) => void;
  onFindPartnersInArea?: (a: { id: string; name: string; areaType?: string | null }) => void;
  onViewProfile?: RealClimberRowProps["onOpen"];
  PartnerRow?: ComponentType<RealClimberRowProps>;
  notify?: (msg: string) => void;
  onStartCrew?: (area: PartnersHereCardArea) => void;
  onCrewsHere?: (area: PartnersHereCardArea) => void;
  /** Opens Groups Discover listing the groups near this area (0396). */
  onGroupsHere?: (area: PartnersHereCardArea) => void;
  openCrewCountAt?: (areaId: string) => number;
}

const CRAG_FAMILY = ["trad", "sport", "toprope", "aid", "bouldering"];
export default function PartnersHereCard({ area, C, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, PartnerRow, notify, onStartCrew, onCrewsHere, onGroupsHere, openCrewCountAt }: PartnersHereCardProps) {
  // CREWS HERE (0302): a crag session is a crew bound to this area. Start one from the page you are on, or
  // see the open ones in Join a crew → By Area, preset to this area.
  const crewN = openCrewCountAt ? openCrewCountAt(area.id) : 0;
  const on = !!uid;
  const countQ = usePartnerAreaCount(area.id, on);
  const rowsQ = usePartnersInArea(area.id, null, null, on, 3);
  const [busy, setBusy] = useState(false);
  // OPTIMISTIC: the tap flips the button and the count at once; `optListed` holds the guess until the
  // refetched listings agree (the effect drops it then), and a failed write drops it straight away.
  const [optListed, setOptListed] = useState<boolean | null>(null);
  const serverListed = !!(myListings || []).find((l: PartnersHereCardListing) => l && l.areaId === area.id);
  useEffect(() => { setOptListed(null); }, [serverListed]);
  const listed = optListed == null ? serverListed : optListed;
  const count = countQ.data == null ? countQ.data : Math.max(0, countQ.data + (listed === serverListed ? 0 : listed ? 1 : -1));
  const rows = (rowsQ.data || []).filter((p: PartnerRow) => p && p.id && String(p.id) !== String(uid));
  const toggle = async () => {
    if (!on || busy) return;
    setBusy(true);
    setOptListed(!listed);
    try {
      if (listed) await removePartnerArea(uid, area.id);
      else await savePartnerArea(uid, { areaId: area.id, disciplines: (area.disciplines || []).filter((d: string) => CRAG_FAMILY.includes(d)) });
    } catch (e: unknown) { setOptListed(null); if (notify) notify((listed ? "Couldn’t remove your listing — " : "Couldn’t list you here — ") + ((e && (e as Error).message) || "try again")); }
    finally { setBusy(false); }
  };
  const openAll = () => onFindPartnersInArea && onFindPartnersInArea({ id: area.id, name: area.name, areaType: area.area_type });
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Partners here</div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{!on ? "Sign in to see who climbs here." : countQ.isError ? "Couldn’t load who’s listed." : count == null ? "Counting…" : count === 0 ? "Nobody listed here yet — be the first." : count + " climber" + (count === 1 ? "" : "s") + " listed here or nearby"}</div>
        </div>
        {on ? <button onClick={toggle} disabled={busy} aria-pressed={listed} aria-label={listed ? "Listed at " + area.name + " — tap to remove" : "List me at " + area.name} style={{ flexShrink: 0, minHeight: 40, padding: "0 13px", borderRadius: 10, border: "1px solid " + (listed ? C.green : C.blueDim), background: listed ? C.greenBg : C.blueBg, color: listed ? C.green : "#fff", fontSize: 12.5, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{listed ? "Listed ✓" : "List me here"}</button> : null}
      </div>
      {/* Once listed, the follow-up — when you can climb here and what — is a real, full-width
          control, not a bare word. It and "See all" used to spread `BTN_LINK` as an object; it is a
          FUNCTION of C, so both rendered as the browser's default grey button: tiny, hard to see,
          and the owner's first complaint about this card. */}
      {on && listed && onListMe ? (
        <button onClick={() => onListMe({ areaId: area.id, name: area.name, areaType: area.area_type, disciplines: (area.disciplines || []).filter((d: string) => CRAG_FAMILY.includes(d)) })} aria-label={"Add the dates and climbing types for your listing at " + area.name} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 4, padding: "10px 12px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, cursor: "pointer", textAlign: "left" }}>
          <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: C.blueBg, border: "1px solid " + C.blueDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: C.text }}>Add dates or climbing types</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>When you can climb here, and what — so the right partners find you.</span>
          </span>
          <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
        </button>
      ) : null}
      {on && rows.length && PartnerRow ? <div style={{ marginTop: 6 }}>{rows.map((p: PartnerRow) => <PartnerRow key={p.id} p={p} onOpen={onViewProfile} />)}</div> : null}
      {on && (count > 0 || rows.length) ? <button onClick={openAll} style={{ ...BTN_LINK(C), padding: "6px 0 0", fontSize: 12.5 }}>{"See all at " + area.name + " →"}</button> : null}
      {onStartCrew || onCrewsHere ? <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid " + C.border }}>
        {onStartCrew ? <button onClick={() => onStartCrew(area)} style={{ ...BTN, flex: 1, border: "1px solid " + C.blueDim, background: C.blueBg, color:C.onSolid }}>Start a crew here</button> : null}
        {onCrewsHere ? <button onClick={() => onCrewsHere(area)} style={{ ...BTN, flex: 1, border: "1px solid " + C.border, background: C.surface, color: C.textSub }}>{"Crews here" + (crewN ? " · " + crewN : "")}</button> : null}
      </div> : null}
      {/* GROUPS NEAR HERE (0396): a climber looking at a crag they are travelling to can find the local groups from it. */}
      {onGroupsHere ? <button onClick={() => onGroupsHere(area)} style={{ ...BTN_LINK(C), padding: "10px 0 0", fontSize: 12.5 }}>{"Climbing groups near " + area.name + " →"}</button> : null}
    </div>
  );
}
