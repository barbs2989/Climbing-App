import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useSavedMedia, useToggleSavedMedia } from "../../lib/db.js";

/** What is saved to the device: the photo's URL, plus whatever the saved-media list keeps beside it. */
export interface SavedMediaEntry {
  url: string;
  [field: string]: unknown;
}
export interface SaveOfflineChipProps {
  /** The photo or topo to save; matched against the saved list by `url`. */
  entry: SavedMediaEntry;
  style?: CSSProperties;
}

/**
 * Save offline / Saved offline: keeps one photo or topo on this device so it opens with no signal, and takes it
 * off again. The button says what it is set to (aria-pressed); a failure is announced. Reads `C` at render time.
 * Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function SaveOfflineChip({entry,style}: SaveOfflineChipProps){const q=useSavedMedia();const t=useToggleSavedMedia();const [busy,setBusy]=useState(false);const [err,setErr]=useState<string|null>(null);
  const saved=!!(q.data||[]).find(function(m: SavedMediaEntry){return m.url===entry.url;});
  const go=function(){if(busy)return;setBusy(true);setErr(null);(saved?t.remove(entry.url):t.save(entry)).catch(function(e: {message?: string}|null){setErr((e&&e.message)||"Couldn’t save it — check your connection");}).finally(function(){setBusy(false);});};
  return <div style={style}><button onClick={go} disabled={busy} aria-pressed={saved} aria-label={saved?"Saved offline on this device — remove it":"Save offline on this device"} style={{padding:"6px 11px",borderRadius:8,border:"1px solid "+(saved?C.blueDim:C.border),background:saved?C.blueBg:C.surface,color:saved?C.onSolid:C.text,fontSize:12,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?(saved?"Removing…":"Saving…"):saved?"✓ Saved offline":"Save offline"}</button>{saved&&!busy?<span style={{fontSize:11.5,color:C.textMuted,marginLeft:8}}>{"Opens with no signal · tap to remove"}</span>:null}{err?<div role="alert" style={{fontSize:11.5,color:C.red,marginTop:5}}>{err}</div>:null}</div>;}
