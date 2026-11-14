import { useState, useRef } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { BTN_SM } from "../../lib/buttonStyles.js";
import ActionIcon from "./ActionIcon.tsx";
import PhotoRow, { type PhotoRowItem } from "./PhotoRow.tsx";

export interface PitchPhotosProps {
  items: (string | PhotoRowItem)[];
  /** Uploads the picked files; without it a signed-out climber is told to sign in. */
  onAdd?: ((files: File[]) => unknown) | null;
}

/** A pitch's photos and its Add a photo of this pitch button (several at once). Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function PitchPhotos({items,onAdd}: PitchPhotosProps){
  const [busy,setBusy]=useState(false);const inp=useRef<HTMLInputElement>(null);
  return <div style={{marginBottom:9}}>
    {items.length?<PhotoRow items={items} w={160} h={108}/>:null}
    {onAdd?<div style={{marginTop:items.length?8:0}}>
      <button disabled={busy} onClick={function(){if(inp.current)inp.current.click();}} style={{...BTN_SM,background:C.surface,color:C.blue,border:"1px solid "+C.border,display:"inline-flex",alignItems:"center",gap:6,opacity:busy?0.6:1,cursor:busy?"default":"pointer"}}><ActionIcon name="camera" size={14} color={C.blue}/>{busy?"Adding…":(items.length?"Add another photo of this pitch":"Add a photo of this pitch")}</button>
      <input ref={inp} type="file" accept="image/*" multiple hidden aria-label="Add a photo of this pitch" onChange={function(e){const fs=Array.from(e.target.files||[]);e.target.value="";if(!fs.length)return;setBusy(true);Promise.resolve(onAdd(fs)).finally(function(){setBusy(false);});}}/>
    </div>:(items.length?null:<div style={{background:C.card,borderRadius:8,padding:"12px",textAlign:"center",border:`1px dashed ${C.border}`,fontSize:12,color:C.textMuted,lineHeight:1.5}}>No photos of this pitch yet. Sign in to add one.</div>)}
  </div>;}
