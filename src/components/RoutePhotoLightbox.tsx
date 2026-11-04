import { createPortal } from "react-dom";
import { C, photoAlt, onImgErr, FALLBACK_COVER } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import MediaImg from "./MediaImg.tsx";
import SaveOfflineChip from "./SaveOfflineChip.tsx";
import { clickable } from "../../lib/clickable";
import Lbl from "./Lbl.tsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import Comments from "./Comments.tsx";
import type { CommentsProps, CommentAuthor, MentionCandidate } from "./Comments.tsx";
import type { Dispatch, SetStateAction } from "react";

/** A photo as the route page holds it: url, who took it, and the flags that decide which controls show. */
export interface PhotoLightboxPhoto {
  url: string;
  alt?: string | null;
  caption?: string | null;
  by?: string | null;
  avatar?: string | null;
  date?: string | null;
  /** The stored row's id, present on contributed photos. */
  _rowId?: string | number | null;
  _saved?: boolean;
  _mine?: boolean;
  /** The trip report the photo came from, if any. */
  ascent?: Record<string, unknown> | null;
}
/** The open photo and the key its likes and comments hang on. */
export interface PhotoLightboxState { ph: PhotoLightboxPhoto; key: string }
/** The like state kept per photo key. */
export interface PhotoLightboxLike { likedByMe: boolean; likes: number }

export interface RoutePhotoLightboxProps {
  blocked?: ReadonlyArray<{ id: string | number }> | null;
  canModeratePhotos?: boolean;
  commentApi: Pick<CommentsProps, "onAdd" | "onEdit" | "onDelete" | "onLike" | "onReply">;
  comments?: CommentsProps["comments"] | null;
  connections?: ReadonlyArray<MentionCandidate> | null;
  /** The route's area, passed back to the trip report this opens. */
  mtn: unknown;
  onBlockClimber?: (author: CommentAuthor) => void;
  onOpenReport?: (report: Record<string, unknown>) => void;
  onRemovePhoto?: (ph: PhotoLightboxPhoto) => unknown;
  /** Files a report on a photo; Report is only offered when it is given. */
  onReportPhoto?: (ph: PhotoLightboxPhoto, reason: string) => void;
  onViewProfile?: CommentsProps["onViewProfile"];
  photoLightbox: PhotoLightboxState;
  photoLikes: Record<string, PhotoLightboxLike>;
  photoRemoving: boolean;
  photoReporting: boolean;
  route: { id: string | number; name?: string | null };
  setPhotoLightbox: (v: PhotoLightboxState | null) => void;
  setPhotoLikes: Dispatch<SetStateAction<Record<string, PhotoLightboxLike>>>;
  setPhotoRemoving: (v: boolean) => void;
  setPhotoReporting: Dispatch<SetStateAction<boolean>>;
}

/* photoLightbox?createPortal( — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RoutePhotoLightbox({blocked,canModeratePhotos,commentApi,comments,connections,mtn,onBlockClimber,onOpenReport,onRemovePhoto,onReportPhoto,onViewProfile,photoLightbox,photoLikes,photoRemoving,photoReporting,route,setPhotoLightbox,setPhotoLikes,setPhotoRemoving,setPhotoReporting}: RoutePhotoLightboxProps){
  return createPortal(<div onClick={function(){setPhotoLightbox(null);}} role="dialog" aria-modal="true" aria-label="Photo" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",overflowY:"auto",overscrollBehavior:"contain"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:520,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{position:"sticky",top:0,background:C.bg,zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid "+C.border}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{"Photo"}</div><button aria-label="Close photo" onClick={function(){setPhotoLightbox(null);}} style={POP_CLOSE}>{"✕"}</button></div><div style={{position:"relative"}}><MediaImg loading="lazy" decoding="async" src={photoLightbox.ph.url} alt={photoAlt(photoLightbox.ph&&photoLightbox.ph.alt,(photoLightbox.ph&&photoLightbox.ph.caption)||("Photo of "+route.name))} style={{width:"100%",maxHeight:"50vh",objectFit:"contain",background:"#000"}} onError={onImgErr(FALLBACK_COVER)}/></div><div style={{padding:"12px 16px 20px"}}>{photoLightbox.ph.by?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:8}}>{"Photo by "+photoLightbox.ph.by}</div>:null}{(photoLightbox.ph._rowId||photoLightbox.ph._saved)&&/^https?:/.test(photoLightbox.ph.url||"")?<SaveOfflineChip key={photoLightbox.ph.url} entry={{url:photoLightbox.ph.url,kind:"photo",routeId:route.id,row:{url:photoLightbox.ph.url,alt:photoLightbox.ph.alt||null,by:photoLightbox.ph.by||null,avatar:photoLightbox.ph.avatar||null,date:photoLightbox.ph.date||null}}} style={{marginBottom:10}}/>:null}<div style={{display:"flex",gap:16,alignItems:"center",marginBottom:6}}><span {...clickable(function(){setPhotoLikes(function(p){const cur=p[photoLightbox.key]||{likedByMe:false,likes:0};const o: Record<string, PhotoLightboxLike>={};Object.assign(o,p);o[photoLightbox.key]={likedByMe:!cur.likedByMe,likes:cur.likes+(cur.likedByMe?-1:1)};return o;});})} style={{fontSize:13,fontWeight:700,color:(photoLikes[photoLightbox.key]||{}).likedByMe?C.blue:C.textMuted,cursor:"pointer"}}>{(photoLikes[photoLightbox.key]||{}).likedByMe?"Liked":"Like"}</span>{(photoLikes[photoLightbox.key]||{}).likes?<span style={{fontSize:13,color:C.textMuted}}>{<Lbl s={"👍 "+(photoLikes[photoLightbox.key]||{}).likes}/>}</span>:null}{photoLightbox.ph.ascent&&onOpenReport?<span {...clickable(function(){onOpenReport(Object.assign({},photoLightbox.ph.ascent,{route:route,mtn:mtn}));setPhotoLightbox(null);})} style={{fontSize:13,fontWeight:700,color:C.blue,cursor:"pointer",marginLeft:"auto"}}>{"View full trip report →"}</span>:null}{(onRemovePhoto&&photoLightbox.ph._rowId&&(photoLightbox.ph._mine||canModeratePhotos))?<span {...clickable(function(){if(photoRemoving)return;const _ph=photoLightbox.ph;askConfirm(_ph._mine?{title:"Remove your photo?",body:"It is removed for everyone and cannot be undone.",confirmLabel:"Remove photo"}:{title:"Take down this photo"+(_ph.by?(" by "+_ph.by):"")+"?",body:"It is removed for everyone and cannot be undone.",confirmLabel:"Take down"}).then(function(ok){if(!ok)return;setPhotoRemoving(true);Promise.resolve(onRemovePhoto(_ph)).then(function(){setPhotoLightbox(null);}).finally(function(){setPhotoRemoving(false);});});})} style={{fontSize:13,fontWeight:700,color:C.red,cursor:"pointer",marginLeft:"auto",padding:"8px 10px"}}>{photoRemoving?"Removing…":(photoLightbox.ph._mine?"Remove":"Take down")}</span>:null}{(onReportPhoto&&photoLightbox.ph._rowId&&!photoLightbox.ph._mine)?<span {...clickable(function(){setPhotoReporting(function(v){return !v;});})} style={{fontSize:13,fontWeight:700,color:C.textMuted,cursor:"pointer",marginLeft:photoLightbox.ph._mine?"auto":14,padding:"8px 10px"}}>{photoReporting?"Cancel":"Report"}</span>:null}</div>{photoReporting?<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{[["not_this_route","Not this route"],["inappropriate","Inappropriate"],["not_their_photo","Not their photo"],["other","Something else"]].map(function(r){return <button key={r[0]} onClick={function(){setPhotoReporting(false);(onReportPhoto as NonNullable<typeof onReportPhoto>)(photoLightbox.ph,r[0]);}} style={{padding:"7px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{r[1]}</button>;})}</div>:null}<Comments blockedIds={(blocked||[]).map(function(b){return b.id;})} onBlock={onBlockClimber} targetId={photoLightbox.key} comments={comments||[]} onAdd={commentApi.onAdd} onViewProfile={onViewProfile} onEdit={commentApi.onEdit} onDelete={commentApi.onDelete} onLike={commentApi.onLike} onReply={commentApi.onReply} mentionCandidates={connections}/></div></div></div>,document.body);
}
