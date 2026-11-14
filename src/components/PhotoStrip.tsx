import { useState } from "react";
import { createPortal } from "react-dom";
import { C, FALLBACK_COVER, onImgErr, photoAlt } from "../../ClimbMatchCore.jsx";
import { photoThumb } from "../../lib/photoThumb";
import { POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import { clickable } from "../../lib/clickable";
import PhotoDescribeBox from "./PhotoDescribeBox.tsx";

export interface PhotoStripProps {
  /** Photo URLs in display order. */
  photos?: string[] | null;
  /** Alt text keyed by photo URL (read through `photoAlt`). */
  alts?: Record<string, string> | null;
  /** Handed the chosen File beside its preview object URL; its presence renders the Add photo tile. */
  onAdd?: (file: File, preview: string) => void;
  /** Takes the OPENED photo down; its presence renders the Remove button inside the viewer. Rejecting keeps the viewer open. */
  onRemove?: (url: string) => unknown | Promise<unknown>;
  /** An add is in flight: the tile reads Adding… and takes no file. */
  busy?: boolean;
  /** The last add's failure, shown above the strip. */
  err?: string | null;
  /** Saves alt text for the opened photo; its presence renders the describe box inside the viewer. */
  onDescribe?: (url: string, text: string) => unknown | Promise<unknown>;
}

/**
 * A horizontal strip of photo thumbnails with an optional Add photo tile, and a full-screen viewer for the tapped
 * one. Removal and describing live in the viewer, never on a thumbnail: opening the exact photo IS the confirmation
 * step. `check:photo-removal` reads this signature and the `onRemove?` gate.
 */
export default function PhotoStrip({photos,onAdd,onRemove,busy,err,alts,onDescribe}: PhotoStripProps){
  const [view,setView]=useState<string | null>(null);
  const [removing,setRemoving]=useState(false);
  if((!photos||!photos.length)&&!onAdd)return null;
  return <div>
    {err?<div role="alert" style={{fontSize:12,color:C.red,background:C.redBg,border:"1px solid "+C.red+"55",borderRadius:9,padding:"8px 11px",marginBottom:8,lineHeight:1.45}}>{err}</div>:null}
    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,marginBottom:12}}>{(photos||[]).map((ph,i)=><img loading="lazy" decoding="async" key={i} src={photoThumb(ph,150)} onError={onImgErr(FALLBACK_COVER)} {...clickable(()=>setView(ph))} aria-label={"Open photo "+(i+1)+(photoAlt(alts&&alts[ph])?": "+photoAlt(alts&&alts[ph]):"")} style={{width:150,height:104,borderRadius:11,objectFit:"cover",flexShrink:0,border:`1px solid ${C.border}`,cursor:"pointer"}}/>)}{onAdd?<label aria-label="Add photo" style={{width:120,height:104,borderRadius:11,flexShrink:0,border:`1.5px dashed ${busy?C.blueDim:C.border}`,background:C.surface,color:busy?C.blue:C.textMuted,fontSize:12.5,fontWeight:600,cursor:busy?"default":"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}><span style={{fontSize:23,lineHeight:1}}>{busy?"":"+"}</span>{busy?"Adding…":"Add photo"}{/* The FILE is handed up beside its preview URL. A blob: URL shows a photo and cannot upload one, and discarding the File here is why this strip could only ever be local — the same lesson the route photo sheet already carries. */}<input type="file" accept="image/*" disabled={busy} onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)onAdd(f,URL.createObjectURL(f));e.target.value="";}} className="cm-file-input"/></label>:null}</div>
    {view?createPortal(<div onClick={()=>{if(!removing)setView(null);}} role="dialog" aria-label="Photo viewer" aria-modal="true" data-sheet="viewer" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><img loading="lazy" decoding="async" src={view} alt={photoAlt(alts&&alts[view],"Enlarged photo")} onError={onImgErr(FALLBACK_COVER)} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/><button onClick={()=>{if(!removing)setView(null);}}  style={Object.assign({},POP_CLOSE_MEDIA,{position:"absolute",top:16,right:16})} aria-label="Close">✕</button>{/* Removal lives HERE rather than as a ✕ on each thumbnail, because RouteDetail already removes your OWN photo from inside its lightbox and one convention beats two. Opening this exact photo full-screen IS the confirmation step, which is what makes a single tap safe without a blocking window.confirm — the same reasoning that gives RouteDetail a confirm only when taking down somebody ELSE's. The viewer deliberately stays open when onRemove rejects, so a failed removal can be retried against the photo it was about rather than against the strip. */}{onRemove?<button onClick={e=>{e.stopPropagation();if(removing)return;setRemoving(true);Promise.resolve(onRemove(view)).then(()=>setView(null),()=>{}).finally(()=>setRemoving(false));}} disabled={removing} style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.62)",border:"1px solid "+C.red+"99",color:C.red,borderRadius:10,padding:"10px 18px",fontSize:13.5,fontWeight:700,cursor:removing?"default":"pointer",lineHeight:1}}>{removing?"Removing…":"Remove photo"}</button>:null}{onDescribe?<PhotoDescribeBox key={view} initial={alts&&alts[view]} onSave={d=>onDescribe(view,d)} style={{bottom:onRemove?70:22}}/>:null}</div>,document.body):null}
  </div>;
}
