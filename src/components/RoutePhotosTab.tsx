import { RSL as SL, C, ROUTE_GAP, photoAlt, onImgErr, FALLBACK_COVER } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import MediaImg from "./MediaImg.tsx";
import ActionIcon from "./ActionIcon.tsx";
import { climbNoun } from "../../lib/discLabels.js";
import type { PhotoLightboxPhoto, PhotoLightboxState } from "./RoutePhotoLightbox.tsx";

export interface RoutePhotosTabProps {
  /** Photos contributed to the route on their own (kind 'photo' rows); null while unread or failed. */
  dbPhotos?: ReadonlyArray<PhotoLightboxPhoto> | null;
  /** Present when the climber can draw topo lines; with `topoConsensus` it marks photos that carry one. */
  onAddTopo?: unknown;
  /** The contributions read failed. */
  photosUnavailable?: boolean;
  /** Photos added locally this session when signed out. */
  quickPhotos: ReadonlyArray<PhotoLightboxPhoto>;
  /** The trip reports read failed. */
  reportsUnavailable?: boolean;
  route: { id: string | number; name?: string | null; /** bouldering calls its line a PROBLEM (lib/discLabels climbNoun) */ discipline?: string | null; };
  /** Photos carried by trip reports. */
  routePhotos: ReadonlyArray<PhotoLightboxPhoto>;
  setPhotoLightbox: (v: PhotoLightboxState | null) => void;
  setQuickPhotoOpen: (v: boolean) => void;
  /** The topo line the climbers agree on for one photo key, if any. */
  topoConsensus?: ((photoKey: string) => { canonical?: unknown } | null | undefined) | null;
}

/* tab==="photos"? — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RoutePhotosTab({dbPhotos,onAddTopo,photosUnavailable,quickPhotos,reportsUnavailable,route,routePhotos,setPhotoLightbox,setQuickPhotoOpen,topoConsensus}: RoutePhotosTabProps){
  return (function(){/* Three sources, and the order is oldest-provenance first: photos carried by a trip report, then photos contributed to the route on their own (kind:'photo' rows, which arrive already saved), then anything added locally this session when signed out. */const shown=routePhotos.concat(dbPhotos||[]).concat(quickPhotos);return <div style={{padding:"0 0 4px"}}><SL first>{"Photos"+(shown.length?" · "+shown.length:"")}</SL><div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"8px 11px",marginBottom:ROUTE_GAP}}>{"Add photos of the "+climbNoun(route)+". Tap any photo to see it full size, like it, and talk about it — photos from climbers’ trip reports show up here too, and tapping one opens the report behind it. To draw a topo line or drop pitch and hazard markers, use the topo section on the Overview tab."}</div><button onClick={function(){setQuickPhotoOpen(true);}} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",marginBottom:9}}>{"+ Add photo"}</button>{photosUnavailable&&(dbPhotos||[]).some(function(p){return p._saved;})?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{"No signal — showing the photos you saved on this device. Any others need a connection."}</div>:null}{shown.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{shown.map(function(ph,pi){const pKey=route.id+"__photo__"+(ph.url||pi);const pTc=(onAddTopo&&topoConsensus)?topoConsensus(pKey):null;return <div key={pi} {...clickable(function(){setPhotoLightbox({ph:ph,key:pKey});})} style={{position:"relative",paddingBottom:"100%",borderRadius:9,overflow:"hidden",background:C.card,cursor:"pointer"}}><MediaImg loading="lazy" decoding="async" thumb={180} src={ph.url} alt={photoAlt(ph&&ph.alt,(ph&&ph.caption)||("Photo "+(pi+1)+" of "+route.name))} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>{pTc?<span title={pTc.canonical?"Has a topo line — draw and edit lines in the Overview tab's topo section":"No topo line yet — lines are drawn in the Overview tab's topo section"} style={{position:"absolute",right:4,top:4,width:22,height:22,borderRadius:"50%",background:pTc.canonical?C.blueSolid:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="target" size={13} color="#fff"/></span>:null}{ph.by?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"12px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:12,color:C.onSolid,fontWeight:600,overflowWrap:"anywhere"}}>{ph.by.split(" ")[0]}</div>:null}</div>;})}</div>:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>{/* TWO queries feed `shown` and either failing makes it incomplete, so both gate this one sentence -- `routePhotos` comes from the merged `activity`, whose DB half is useRouteTripReports, and `dbPhotos` from the contributions read. Combining them is right HERE for that reason and nowhere else; every other flag in this app keys on ONE query. Found by the guard rather than by reading: check:outage measured this screen as CHANGED / says-empty=YES / says-broken=no on the first run that walked it. */}{(photosUnavailable||reportsUnavailable)?"Couldn’t load this route’s photos — try again in a moment.":"No photos yet — be the first to add one."}</div>}</div>;})();
}
