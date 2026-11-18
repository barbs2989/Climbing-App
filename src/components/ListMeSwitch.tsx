import { useEffect, useState } from "react";
import { removePartnerArea, savePartnerArea } from "../../lib/db";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface ListMeSwitchProps {
  /** The saved area or peak this switch lists the climber at. */
  areaId: string;
  /** Its name, for the switch's spoken name and the toast. */
  name: string;
  C: typeof Palette;
  /** The signed-in climber's id. */
  uid: string;
  /** Whether the climber's own listings hold this place; undefined while they load. */
  listed: boolean | undefined;
  notify?: (msg: string) => void;
}

/* LIST ME, beside each saved area and peak in Logbook › Saved (owner 2026-11-18): "make a [switch] next to each area to
   allow them to list themselves in partner search for that area. Also same for peaks." Saving is a private bookmark
   (saved_areas); this switch is the public half — a partner_areas listing, the same write as the area page's Partners
   here card and Partners › Pick an area's List me box, optimistic the same way. A peak is a place since 0456. */
export default function ListMeSwitch({ areaId, name, C, uid, listed, notify }: ListMeSwitchProps) {
  const [busy, setBusy] = useState(false);
  const [opt, setOpt] = useState<boolean | null>(null);
  useEffect(() => { setOpt(null); }, [listed, areaId]);
  if (listed === undefined) return null;
  const on = opt == null ? listed : opt;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setOpt(!on);
    try {
      if (on) await removePartnerArea(uid, areaId);
      else await savePartnerArea(uid, { areaId, disciplines: [] });
      if (notify) notify(on ? "No longer listed at " + name : "Listed at " + name + " — climbers searching it in Partners can find you");
    } catch (e: unknown) {
      setOpt(null);
      if (notify) notify((on ? "Couldn’t remove your listing — " : "Couldn’t list you at " + name + " — ") + ((e && (e as Error).message) || "try again"));
    } finally { setBusy(false); }
  };
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={busy} aria-label={"List me in partner search at " + name} title={on ? "You’re listed here in partner search — tap to stop" : "List yourself here in partner search"} style={{ flexShrink: 0, minHeight: 44, minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "0 4px", background: "none", border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
      <span aria-hidden="true" style={{ position: "relative", width: 34, height: 20, borderRadius: 10, background: on ? C.green : C.border, transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left .15s" }} />
      </span>
      <span aria-hidden="true" style={{ fontSize: 10, fontWeight: 700, color: on ? C.green : C.textSub, whiteSpace: "nowrap" }}>{on ? "Listed" : "List me"}</span>
    </button>
  );
}
