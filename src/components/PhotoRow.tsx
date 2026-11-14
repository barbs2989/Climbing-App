import { useState } from "react";
import { createPortal } from "react-dom";
import { C, FALLBACK_COVER, onImgErr } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { photoThumb } from "../../lib/photoThumb";
import { POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";

/** One photo: its URL (`u` or `url`), who took it and a caption. */
export interface PhotoRowItem {
  u?: string;
  url?: string;
  a?: { user?: string | null; avatar?: string | null } | null;
  caption?: string | null;
}
export interface PhotoRowProps {
  /** Photos in order, each a URL or an item. Nothing renders without one. */
  items?: (string | PhotoRowItem)[] | null;
  /** Thumbnail width and height in px (default 128 x 96). */
  w?: number;
  h?: number;
}

/**
 * A scrolling row of photo thumbnails, each with its photographer and caption; a tap opens it full screen, portalled
 * to document.body. Reads `C` at render time. Moved verbatim from RouteDetail.jsx with the types added; an item's
 * photographer and caption are read off the OBJECT form only (`o`), which is what the old `it&&it.a` did for a string.
 */
export default function PhotoRow({items,w,h}: PhotoRowProps){
  const [view,setView]=useState<string|null|undefined>(null);
  if(!items||!items.length)return null;
  const W=w||128,H=h||96;
  return <div><div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6}}>{items.map((it,i)=>{const url=typeof it==="string"?it:(it.u||it.url);const o=typeof it==="string"?null:it;const a=(o&&o.a)||null;const cap=(o&&o.caption)||null;return <div key={i} style={{flexShrink:0,width:W}}><div {...clickable(()=>setView(url))} style={{position:"relative",cursor:"pointer"}}><img loading="lazy" decoding="async" src={photoThumb(url,W)} alt={cap||("Photo "+(i+1))} onError={onImgErr(FALLBACK_COVER)} style={{width:W,height:H,objectFit:"cover",borderRadius:11,border:`1px solid ${C.border}`}}/>{a&&a.user?<div style={{position:"absolute",left:6,bottom:6,display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.55)",borderRadius:20,padding:"2px 8px 2px 2px"}}><Av src={a.avatar} size={18}/><span style={{fontSize:12,color:C.onSolid,fontWeight:600}}>{(a.user||"").split(" ")[0]}</span></div>:null}</div>{cap?<div style={{fontSize:12,color:C.textSub,marginTop:4,lineHeight:1.4}}>{cap}</div>:null}</div>;})}</div>{view?createPortal(<div onClick={()=>setView(null)} role="dialog" aria-label="Photo viewer" aria-modal="true" data-sheet="viewer" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><img loading="lazy" decoding="async" src={view} alt="Enlarged photo" onError={onImgErr(FALLBACK_COVER)} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/><button onClick={()=>setView(null)}  style={Object.assign({},POP_CLOSE_MEDIA,{position:"absolute",top:16,right:16})} aria-label="Close">✕</button></div>,document.body):null}</div>;
}
