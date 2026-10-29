import { useSession } from "../AuthContext.tsx";
import { useState, useRef } from "react";
import { useRouteTopos, topoPhotoUrl, uploadTopoPhoto, updateTopoLine, submitTopoLine, updateTopoCaption, deleteTopoLine, deleteTopoPhoto, updateTopoAlt } from "../../lib/db";
import { USE_DB } from "../../lib/supabase";
import { topoEmptyCopy } from "../../lib/topoEmptyCopy.js";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { ROUTE_GAP, RSL as SL, C } from "../../ClimbMatchCore.jsx";
import LoadingRows from "./LoadingRows.tsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";
import TopoThumb from "./TopoThumb.tsx";
import { clickable } from "../../lib/clickable";
import TopoPinLegend from "./TopoPinLegend.tsx";
import TopoPhotoModal from "./TopoPhotoModal.tsx";
import { createPortal } from "react-dom";
import TopoCaptionBox from "./TopoCaptionBox.tsx";
import TopoDrawer from "./TopoDrawer.tsx";
import type { TopoDrawerPin, TopoDrawerResult } from "./TopoDrawer.tsx";
import type { TopoPoint } from "./TopoLineOverlay.tsx";
import type { TopoModalLine, TopoModalPhoto } from "./TopoPhotoModal.tsx";

export interface TopoSectionProps {
  /** The route page the topos belong to; the area is the peak or crag it hangs under. */
  route: {id: string; mountainId: string};
}
/** A line as a `topo_lines` row carries it. */
interface TopoDbLine extends TopoModalLine {
  route_id?: string | number | null;
  created_at?: string | null;
  created_by?: string | null;
}
/** A `topos` row with its lines embedded. */
interface TopoRow {
  id: string | number;
  storage_path: string;
  alt?: string | null;
  caption?: string | null;
  created_by?: string | null;
  topo_lines?: TopoDbLine[] | null;
}
/** A line drawn with no database behind it. */
type LocalLine = TopoModalLine & {ts: number};
/** A photo as this section lists and edits it. */
interface TopoSectionPhoto extends TopoModalPhoto {
  /** Stored in the database (false: held in this session only). */
  db: boolean;
  storagePath?: string | null;
  mine?: boolean;
  /** The line being edited; absent when drawing a new one. */
  editLine?: TopoModalLine;
  /** Just uploaded: the editor asks for its caption first. */
  fresh?: boolean;
}
type FileTarget = HTMLInputElement & {files: FileList};

/** The route page's TOPO section: photos with drawn lines, add / draw / edit / delete. Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function TopoSection({route}: TopoSectionProps){
  const areaId=route.mountainId;const _topoSess=useSession();const _topoUid=_topoSess&&_topoSess.user&&_topoSess.user.id;
  const [localPhotos,setLocalPhotos]=useState<{id: string; url: string}[]>([]);
  const [localLines,setLocalLines]=useState<Record<string,LocalLine[]>>({});
  const [busy,setBusy]=useState(false);
  /* alert() blocked the whole page for a failed upload, in an app that reports every other
     write inline. It also hid WHICH photo failed, since the dialog outlives the row. This
     renders in the section, next to the thing that failed, and clears on the next attempt.
     Not swallowed either way — check:write-feedback exists because a silent failure behind
     a success message is the worse bug. */
  const [err,setErr]=useState<string|null>(null);
  const [viewerIdx,setViewerIdx]=useState<number|null>(null);
  const [drawFor,setDrawFor]=useState<TopoSectionPhoto|null>(null);
  /* A topo belongs to the route page it was posted from (0364): areaId is the whole PEAK on an alpine route, so reading by it put a north-face photo on every south-side route. */const dbTopos=useRouteTopos(USE_DB?route.id:null,areaId);const toposUnavailable=!!(USE_DB&&dbTopos&&dbTopos.isError);const topoCopy=topoEmptyCopy(toposUnavailable);/* No signal: useRouteTopos answered with the topos SAVED on this device, which may be fewer than the crag has. */const toposSavedOnly=!!(dbTopos&&dbTopos.data&&dbTopos.data._savedFrom==="media");

  const photos: TopoSectionPhoto[]=USE_DB
    ?(dbTopos.data||[]).map(function(t: TopoRow){const _u=topoPhotoUrl(t.storage_path);return {id:t.id,url:_u,db:true,storagePath:t.storage_path,alt:t.alt||null,caption:t.caption||null,mine:!!(_topoUid&&t.created_by===_topoUid),saveEntry:{url:_u,kind:"topo",areaId:areaId,routeId:route.id,row:t},
        lines:(t.topo_lines||[]).filter(function(l){return l.route_id===route.id;}).slice().sort(function(a,b){return (b.created_at||"").localeCompare(a.created_at||"");}).map(function(l){return Object.assign({},l,{mine:!!(_topoUid&&l.created_by===_topoUid)});}),
        /* Lines on this photo by anyone else, for ANY route: deleting the photo would take theirs with it (cascade). */
        othersDrew:(t.topo_lines||[]).some(function(l){return l.created_by!==_topoUid;})};})
    :localPhotos.map(function(p){return {id:p.id,url:p.url,db:false,
        lines:(localLines[p.id]||[]).slice().sort(function(a,b){return b.ts-a.ts;})};});

  const pickFile=function(){
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    inp.onchange=function(e: Event){const f=(e.target as FileTarget).files&&(e.target as FileTarget).files[0];if(f)addPhoto(f);};
    inp.click();
  };
  const addPhoto=function(file: File){
    setErr(null);
    if(USE_DB){
      setBusy(true);
      uploadTopoPhoto(areaId,route.id,file).then(function(t){
        setBusy(false);dbTopos.refetch();
        setDrawFor({id:t.id,url:topoPhotoUrl(t.storage_path) as string,db:true,lines:[],fresh:true});
      }).catch(function(e){setBusy(false);setErr((e&&e.message)||"Couldn't upload that photo.");});
    } else {
      const rd=new FileReader();
      rd.onload=function(){
        const id="local_"+Date.now()+"_"+Math.round(Math.random()*1e6);
        setLocalPhotos(function(p){return p.concat([{id:id,url:rd.result as string}]);});
        setDrawFor({id:id,url:rd.result as string,db:false,lines:[]});
      };
      rd.readAsDataURL(file);
    }
  };
  const submitLine=function(photo: TopoSectionPhoto,data: TopoDrawerResult){
    setErr(null);
    if(photo.db&&photo.editLine){
      updateTopoLine(photo.editLine.id,{points:data.points,pins:data.pins,label:data.label||null,variants:data.variants||[],variant_labels:data.variantLabels||[]}).then(function(){
        dbTopos.refetch();setDrawFor(null);
      }).catch(function(e){setErr((e&&e.message)||"Couldn't save your changes.");});
    } else if(photo.db){
      submitTopoLine(photo.id,route.id,data.points,data.pins,data.label||null,data.variants,data.variantLabels).then(function(){
        dbTopos.refetch();setDrawFor(null);
      }).catch(function(e){setErr((e&&e.message)||"Couldn't save that line.");});
    } else {
      setLocalLines(function(m){
        const o=Object.assign({},m);
        o[photo.id]=(o[photo.id]||[]).concat([{id:"line_"+Date.now(),points:data.points,variants:data.variants||[],variant_labels:data.variantLabels||[],pins:data.pins,label:data.label||null,ts:Date.now()}]);
        return o;
      });
      setDrawFor(null);
    }
  };

  const saveCaption=function(p: TopoModalPhoto,t: string){return updateTopoCaption(p.id,t).then(function(){return dbTopos.refetch();});};
  /* YOUR OWN TOPO CAN BE FIXED OR TAKEN DOWN (topo audit, 2026-10-24). updateTopoLine, deleteTopoLine
     and deleteTopoPhoto were written with their RLS (0026: own update / own delete) and never called, so
     a misplaced dot meant drawing a second line beside the first forever, and a photo posted on the
     wrong route could not come down. Mountain Project and 27 Crags both let the uploader edit and
     delete their own; like theirs, a photo other climbers have drawn on stays (it is theirs too) —
     so its uploader cannot take it down. */
  const drawDirty=useRef(false);
  const closeDraw=function(){if(!drawDirty.current)return setDrawFor(null);askConfirm({title:"Discard this drawing?",body:"The points and markers you placed are not saved.",confirmLabel:"Discard"}).then(function(ok){if(ok){drawDirty.current=false;setDrawFor(null);}});};
  const editLine=function(p: TopoModalPhoto,l: TopoModalLine){setViewerIdx(null);setDrawFor(Object.assign({},p,{editLine:l}) as TopoSectionPhoto);};
  const removeLine=function(_p: TopoModalPhoto,l: TopoModalLine){
    return askConfirm({title:"Delete your line?",body:"Your line and its markers come off this photo for everyone. The photo stays.",confirmLabel:"Delete line"}).then(function(ok){
      if(!ok)return false;setErr(null);
      return deleteTopoLine(l.id).then(function(){return dbTopos.refetch();}).then(function(){return true;}).catch(function(e){setErr((e&&e.message)||"Couldn't delete that line.");return false;});
    });
  };
  const removePhoto=function(p: TopoModalPhoto){
    return askConfirm({title:"Delete this topo photo?",body:"The photo, and any line you drew on it, come down for everyone.",confirmLabel:"Delete photo"}).then(function(ok){
      if(!ok)return false;setErr(null);
      return deleteTopoPhoto(p.id,(p as TopoSectionPhoto).storagePath).then(function(){setViewerIdx(null);return dbTopos.refetch();}).then(function(){return true;}).catch(function(e){setErr((e&&e.message)||"Couldn't delete that photo.");return false;});
    });
  };

  if(USE_DB&&dbTopos.isLoading)return <div style={{marginBottom:ROUTE_GAP}}><SL>TOPO</SL><LoadingRows C={C} label="Loading topo photos…" style={{padding:20}}/></div>;

  return <div style={{marginBottom:ROUTE_GAP}}>
    <SL action={<button onClick={pickFile} disabled={busy} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:11.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"+ Add photo"}</button>}>TOPO</SL>
    {err?<div role="alert" style={{background:C.redBg,border:"1px solid "+C.red+"66",borderRadius:10,padding:"9px 12px",marginBottom:9,display:"flex",alignItems:"center",gap:9}}><span style={{flex:1,fontSize:12.5,color:C.red,lineHeight:1.45}}>{err}</span><button onClick={function(){setErr(null);}} aria-label="Dismiss error" style={POP_CLOSE}>✕</button></div>:null}
    {!photos.length?
      <div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"22px 16px",textAlign:"center"}}>
        <div style={{marginBottom:6,opacity:0.75,display:"flex",justifyContent:"center"}}><ActionIcon name="camera" size={24} color={C.textMuted}/></div>
        <div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:4}}>{topoCopy.head}</div>
        <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>{topoCopy.body}</div>
        <button onClick={pickFile} disabled={busy} style={{padding:"8px 16px",borderRadius:9,border:"1px solid "+C.blueDim,background:busy?C.card:C.blueBg,color:busy?C.textMuted:"#fff",fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"Add a topo photo"}</button>
      </div>
    :<div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:2}}>
      {photos.map(function(p,i){
        /* The caption's opening lines sit under the thumbnail, so a reader sees there IS context before opening it. */
        return <div key={p.id} style={{flexShrink:0,width:132}}><TopoThumb p={p} onOpen={function(){setViewerIdx(i);}}/>{p.caption?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",overflowWrap:"anywhere"}}>{p.caption}</div>:null}</div>;
      })}
      <div {...clickable(pickFile)} style={{flexShrink:0,width:132,height:132,borderRadius:11,border:"1px dashed "+C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.blue,fontSize:12,fontWeight:700,gap:6}}>
        <span style={{fontSize:22}}>+</span>Add photo
      </div>
    </div>}
    {toposSavedOnly?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginTop:8}}>{"No signal — showing the "+photos.length+" topo"+(photos.length!==1?"s":"")+" you saved on this device. Any others need a connection."}</div>:null}
    {photos.some(function(p){return p.lines[0]&&((p.lines[0].pins&&p.lines[0].pins.length)||(p.lines[0].variants&&p.lines[0].variants.length));})?<TopoPinLegend style={{marginTop:8}}/>:null}
    {(viewerIdx!=null&&photos[viewerIdx])?<TopoPhotoModal key={photos[viewerIdx].id} photo={photos[viewerIdx]} pos={{i:viewerIdx,n:photos.length,onPrev:function(){setViewerIdx((viewerIdx+photos.length-1)%photos.length);},onNext:function(){setViewerIdx((viewerIdx+1)%photos.length);}}} onClose={function(){setViewerIdx(null);}} onDraw={function(p){setDrawFor(p as TopoSectionPhoto);}} onDescribe={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?function(p,d){return updateTopoAlt(p.id,d).then(function(){return dbTopos.refetch();});}:undefined} onCaption={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?saveCaption:undefined} onEditLine={USE_DB?editLine:undefined} onDeleteLine={USE_DB?removeLine:undefined} onDeletePhoto={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?removePhoto:undefined}/>:null}
    {drawFor?createPortal(<div onClick={closeDraw} role="dialog" aria-modal="true" aria-label={drawFor.editLine?"Edit your line":"Draw this route's line"} style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:9500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,borderTopLeftRadius:18,borderTopRightRadius:18,width:"100%",maxWidth:520,padding:"16px 16px 22px",border:"1px solid "+C.border,maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800}}>{drawFor.editLine?"Edit your line":"Draw this route's line"}</div>
          <button onClick={closeDraw} style={POP_CLOSE} aria-label="Close">✕</button>
        </div>
        {/* The photo was just posted: ask for its caption here, while the climber still remembers why they took it. Saved on its own, so cancelling the drawing keeps it. */}
        {(drawFor.fresh&&drawFor.db)?<TopoCaptionBox key={drawFor.id} initial={null} onSave={function(t){return saveCaption(drawFor,t);}} style={{marginBottom:12}}/>:null}
        <TopoDrawer key={drawFor.id+":"+(drawFor.editLine?drawFor.editLine.id:"new")} dirtyRef={drawDirty} initial={drawFor.editLine?{photoUrl:drawFor.url,points:drawFor.editLine.points,variants:(drawFor.editLine.variants||[]) as TopoPoint[][],variantLabels:drawFor.editLine.variant_labels||[],pins:(drawFor.editLine.pins||[]) as TopoDrawerPin[],label:drawFor.editLine.label||""}:{photoUrl:drawFor.url}} onCancel={function(){drawDirty.current=false;setDrawFor(null);}} onSubmit={function(data: TopoDrawerResult){drawDirty.current=false;submitLine(drawFor,data);}}/>
      </div>
    </div>,document.body):null}
  </div>;
}
