import { useEffect } from "react";
import { createPortal } from "react-dom";
import { C, ROUTES, listShareText, listSheetHtml, printSheet, pubName, routeShareBits, shareOrCopy } from "../../ClimbMatchCore.jsx";
import { dbRouteToCamel, useProfilesByIds, useRoutesByIds, useSharedList } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import ShareExportRow from "./ShareExportRow.tsx";

/** A climbing list as `useSharedList` returns it (camelCase), or as a profile hands it over. */
export interface SharedList {
  id?: string | number;
  name: string;
  description?: string | null;
  userId?: string | null;
  routeIds?: ReadonlyArray<string | number> | null;
}
/** A route the list resolves: the seed `ROUTES` shape, the caller's `routeById`, or a `dbRouteToCamel` row. */
/** A `routes` row as `useRoutesByIds` returns it; `dbRouteToCamel` takes the whole row. */
export interface DbRouteRow { id: string | number; [k: string]: unknown }
export interface ListRoute {
  id: string | number;
  name: string;
}
export interface SharedListViewProps {
  /** The list itself, when opened from a profile; otherwise `listId` is read. */
  list?: SharedList | null;
  /** The `?list=` id of a shared link. */
  listId?: string | null;
  onClose?: () => void;
  onOpenRoute?: (r: ListRoute) => void;
  routeById?: (id: string | number) => ListRoute | null | undefined;
  /** The toast. */
  notify?: (msg: string) => void;
}

/* ANOTHER CLIMBER'S PUBLIC LIST — opened from their profile (`list` given) or from a shared link
   (`listId`, `?list=`). Before this, `shared` was written and nothing anywhere read it. A failed read
   and a private list are different answers and are SAID differently: RLS returns a private list as
   zero rows (useSharedList -> null), a network failure throws. */
export default function SharedListView({list:given,listId,onClose,onOpenRoute,routeById,notify}: SharedListViewProps){
  const q=useSharedList(given?null:listId);const l: SharedList | null=given||(q.data||null);
  const ownerQ=useProfilesByIds(l&&l.userId?[l.userId]:[]);const ownerRow=((ownerQ.data||[])[0])||null;
  const owner=ownerRow?pubName({name:ownerRow.name,showName:ownerRow.show_name,username:ownerRow.username}):"";
  const ids=(l&&l.routeIds)||[];const dbIds=ids.filter(function(id){return !ROUTES.some(function(r){return r.id===id;})&&!(routeById&&routeById(id));});
  const rq=useRoutesByIds(USE_DB?dbIds:[]);const dbMap: Record<string, ListRoute>={};(rq.data||[]).forEach(function(row: DbRouteRow){dbMap[row.id]=dbRouteToCamel(row);});
  const items=ids.map(function(id){return {id:id,r:ROUTES.find(function(x){return x.id===id;})||(routeById?routeById(id):null)||dbMap[id]||null};});
  const loadingRoutes=!!(dbIds.length&&rq.isLoading);const unresolved=items.filter(function(x){return !x.r;}).length;
  const msg=function(t: string,col?: string){return <div style={{fontSize:13,color:col||C.textMuted,lineHeight:1.5,padding:"14px 2px"}}>{t}</div>;};
  /* No click-the-backdrop-to-close: that is a control only a mouse can use (check:clickable). The ✕ and
     Escape both close it, and Escape works whatever has focus. */
  useEffect(function(){const k=function(e: KeyboardEvent){if(e.key==="Escape"&&onClose)onClose();};document.addEventListener("keydown",k);return function(){document.removeEventListener("keydown",k);};},[onClose]);
  return createPortal(<div role="dialog" aria-label={l?"List: "+l.name:"Shared list"} aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9850,overflowY:"auto",overscrollBehavior:"contain",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"12px 8px"}}><div style={{background:C.bg,width:"100%",maxWidth:520,borderRadius:16,border:"1px solid "+C.border,padding:"14px 16px 18px"}}>
    <div style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:800,color:C.blue,letterSpacing:0.4,textTransform:"uppercase"}}>{"Climbing list"}</div><div style={{fontSize:18,fontWeight:800,color:C.text,lineHeight:1.3,marginTop:3,overflowWrap:"anywhere"}}>{l?l.name:"Shared list"}</div>{l?<div style={{fontSize:12.5,color:C.textSub,marginTop:3}}>{(owner?"by "+owner+" · ":"")+ids.length+(ids.length===1?" climb":" climbs")}</div>:null}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
    {(!given&&q.isLoading)?msg("Loading the list…"):(!given&&q.isError)?msg("Couldn’t load this list. Check your connection and try again.",C.amber):!l?msg("This list is private, or its owner has deleted it."):<div>
      {l.description?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5,marginTop:10,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{l.description}</div>:null}
      <div style={{marginTop:12}}>{!ids.length?msg("No climbs on this list yet."):items.map(function(x,i){const r=x.r;if(!r)return null;return <button key={x.id} onClick={function(){onOpenRoute?.(r);}} aria-label={"Open "+r.name} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",padding:"10px 12px",marginBottom:7,borderRadius:11,border:"1px solid "+C.border,background:C.card,cursor:"pointer"}}><span style={{flexShrink:0,width:22,fontSize:12,fontWeight:700,color:C.textMuted}}>{i+1}</span><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:14,fontWeight:700,color:C.text,lineHeight:1.35}}>{r.name}</span><span style={{display:"block",fontSize:12,color:C.textMuted,marginTop:2}}>{routeShareBits(r).join(" · ")}</span></span><span aria-hidden="true" style={{flexShrink:0,color:C.textMuted,fontSize:16}}>{"›"}</span></button>;})}{loadingRoutes?msg("Loading climbs…"):(unresolved&&!loadingRoutes)?msg((unresolved===1?"1 climb":unresolved+" climbs")+" on this list couldn’t be loaded.",C.amber):null}</div>
      {ids.length?<ShareExportRow label={l.name} onShare={function(){shareOrCopy(l.name,listShareText(l,items,true),notify);}} onPdf={function(){printSheet(l.name,listSheetHtml(l,items,true),notify);}}/>:null}
    </div>}
  </div></div>,document.body);
}
