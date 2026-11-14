import { useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../../ClimbMatchCore.jsx";
import { BTN, CHIP } from "../../lib/buttonStyles.js";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import TopoZoomPhoto from "./TopoZoomPhoto.tsx";
import TopoCaption from "./TopoCaption.tsx";
import TopoCaptionBox from "./TopoCaptionBox.tsx";
import SaveOfflineChip, { type SavedMediaEntry } from "./SaveOfflineChip.tsx";
import PhotoDescribeBox from "./PhotoDescribeBox.tsx";
import TopoVariantKey from "./TopoVariantKey.tsx";
import TopoPinKey from "./TopoPinKey.tsx";
import TopoPinLegend from "./TopoPinLegend.tsx";
import type { TopoLine } from "./TopoLineOverlay.tsx";

/** A topo line as the viewer lists it. */
export interface TopoModalLine extends TopoLine {
  id?: string | number;
  /** What each variation is, aligned with `variants` by index. */
  variant_labels?: (string | null)[] | null;
  /** The signed-in climber drew it: Edit and Delete are offered. */
  mine?: boolean;
}
/** A topo photo as the viewer takes it. */
export interface TopoModalPhoto {
  id: string | number;
  url: string;
  alt?: string | null;
  caption?: string | null;
  lines: TopoModalLine[];
  /** What Save offline keeps for it; without it there is no chip. */
  saveEntry?: SavedMediaEntry | null;
  /** Other climbers have drawn on it, so its uploader cannot take it down. */
  othersDrew?: boolean;
}
/** Where this topo sits among the route's topos, and the buttons that step through them. */
export interface TopoModalPos {
  i: number;
  n: number;
  onPrev: () => void;
  onNext: () => void;
}
export interface TopoPhotoModalProps {
  photo: TopoModalPhoto;
  pos?: TopoModalPos | null;
  onClose: () => void;
  /** Opens the line editor on this photo. */
  onDraw: (photo: TopoModalPhoto) => void;
  /** Saves a description of the photo; without it the box is not drawn. */
  onDescribe?: ((photo: TopoModalPhoto, text: string) => unknown) | null;
  /** Saves the caption; without it there is no caption editor. */
  onCaption?: ((photo: TopoModalPhoto, text: string) => unknown) | null;
  onEditLine?: ((photo: TopoModalPhoto, line: TopoModalLine) => void) | null;
  /** Each delete resolves true once it landed (the viewer then goes back to the first line). */
  onDeleteLine?: ((photo: TopoModalPhoto, line: TopoModalLine) => Promise<boolean>) | null;
  onDeletePhoto?: ((photo: TopoModalPhoto) => Promise<boolean>) | null;
}

/**
 * The enlarged topo: the zooming photo with its drawn line, then the caption, the key and the buttons to edit or delete.
 * A portalled dialog over the page. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function TopoPhotoModal({photo,pos,onClose,onDraw,onDescribe,onCaption,onEditLine,onDeleteLine,onDeletePhoto}: TopoPhotoModalProps){
  const [altIdx,setAltIdx]=useState(0);const [editCap,setEditCap]=useState(false);
  const active=photo.lines[altIdx]||null;const [delBusy,setDelBusy]=useState(false);
  const del=function(fn: () => Promise<boolean>){if(delBusy)return;setDelBusy(true);fn().then(function(ok){setDelBusy(false);if(ok)setAltIdx(0);});};
  return createPortal(<div onClick={onClose} role="dialog" aria-modal="true" aria-label="Topo" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:9400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,borderRadius:16,width:"100%",maxWidth:520,border:"1px solid "+C.border,overflowX:"hidden",overflowY:"auto",maxHeight:"92vh",overscrollBehavior:"contain"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid "+C.border}}>
        <div style={{fontSize:14,fontWeight:700}}>{pos&&pos.n>1?"Topo "+(pos.i+1)+" of "+pos.n:"Topo"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {/* Every topo on the route from inside the viewer, as a photo lightbox steps through its set. */}
          {pos&&pos.n>1?<button onClick={pos.onPrev} aria-label="Previous topo" style={{...CHIP,padding:"6px 11px",border:"1px solid "+C.border,background:C.surface,color:C.text}}>‹</button>:null}
          {pos&&pos.n>1?<button onClick={pos.onNext} aria-label="Next topo" style={{...CHIP,padding:"6px 11px",border:"1px solid "+C.border,background:C.surface,color:C.text}}>›</button>:null}
          <button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button>
        </div>
      </div>
      {/* The photo's frame holds the photo's own aspect, capped at 58vh tall, so the overlay's
          `inset:0` box IS the painted photo at 1x; TopoZoomPhoto sizes the layer for any zoom. */}
      <TopoZoomPhoto photo={photo} active={active}/>
      <div style={{padding:"12px 14px"}}>
        {editCap&&onCaption?<TopoCaptionBox key={photo.id} initial={photo.caption} onSave={function(t){return onCaption(photo,t);}} style={{marginBottom:12}}/>:<TopoCaption key={photo.id} text={photo.caption}/>}
        {(onCaption&&!editCap)?<button onClick={function(){setEditCap(true);}} style={{background:"none",border:"none",padding:"0 0 10px",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{photo.caption?"Edit caption":"+ Add a caption"}</button>:null}
        {photo.saveEntry?<SaveOfflineChip key={photo.url} entry={photo.saveEntry} style={{marginBottom:12}}/>:null}
        {onDescribe?<PhotoDescribeBox key={photo.id} initial={photo.alt} onSave={function(d){return onDescribe(photo,d);}} style={{position:"static",left:"auto",right:"auto",margin:"0 0 12px",maxWidth:"none",background:C.surface}}/>:null}
        {active?<TopoVariantKey variants={active.variants} labels={active.variant_labels}/>:null}
        {active?<TopoPinKey pins={active.pins}/>:null}
        {(active&&((active.pins&&active.pins.length)||(active.variants&&active.variants.length)))?<TopoPinLegend style={{paddingTop:9,marginBottom:12,borderTop:"1px solid "+C.border}}/>:null}
        {!photo.lines.length?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:10}}>No one has drawn this route's line on this photo yet.</div>:null}
        {photo.lines.length>1?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{photo.lines.map(function(l,i){return <button key={l.id||i} onClick={function(){setAltIdx(i);}} aria-current={i===altIdx?"true":undefined} style={{...CHIP,border:"1px solid "+(i===altIdx?C.blue:C.border),background:i===altIdx?C.blueBg:C.surface,color:i===altIdx?C.onSolid:C.textSub}}>{l.label||(i===0?"Latest":"Alt "+i)}</button>;})}</div>:null}
        {(active&&active.label&&photo.lines.length<2)?<div style={{fontSize:12.5,color:C.textSub,marginBottom:10}}>{active.label}</div>:null}
        {(active&&active.mine&&onEditLine)?<div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={function(){onEditLine(photo,active);}} style={{...BTN,flex:2,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>Edit your line</button>
          {onDeleteLine?<button onClick={function(){del(function(){return onDeleteLine(photo,active);});}} disabled={delBusy} style={{...BTN,flex:1,border:"1px solid "+C.red+"66",background:C.surface,color:C.red}}>{delBusy?"Deleting…":"Delete line"}</button>:null}
        </div>:null}
        {(active&&active.mine&&onEditLine)?null:<button onClick={function(){onDraw(photo);}} style={{...BTN,width:"100%",border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>{photo.lines.length?"Draw your own line":"Draw this route's line"}</button>}
        {onDeletePhoto?(photo.othersDrew
          ?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:10}}>Other climbers have drawn their lines on this photo, so it stays up for them.</div>
          :<button onClick={function(){del(function(){return onDeletePhoto(photo);});}} disabled={delBusy} style={{background:"none",border:"none",padding:"12px 0 0",color:C.red,fontSize:12.5,fontWeight:700,cursor:delBusy?"default":"pointer"}}>{delBusy?"Deleting…":"Delete this photo"}</button>):null}
      </div>
    </div>
  </div>,document.body);
}
