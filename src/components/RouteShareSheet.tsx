import { createPortal } from "react-dom";
import { C, mtnOf, CLIMBERS, realProfileId, pubName, FALLBACK_AV, gradeLabel, printSheet } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import CardHead from "./CardHead.tsx";
import { USE_DB } from "../../lib/supabase";
import Av from "./Av.tsx";
import ShareVia from "./ShareVia.tsx";
import { routeSheetHtml } from "../../lib/routeSheet.js";

/** A climber offered in the share list: a connection, or a seed climber. */
interface ShareSheetClimber { id: string | number; name?: string | null; username?: string | null; showName?: boolean | null; avatar?: string | null; _profile?: boolean }

export interface RouteShareSheetProps {
  /** The area breadcrumb past the root (desktop only); empty otherwise. */
  _crumbs: ReadonlyArray<{ name: string }>;
  /** The trimmed search text. */
  _shareQ: string;
  blocked?: ReadonlyArray<{ id?: string | number | null }> | null;
  connections?: ReadonlyArray<ShareSheetClimber> | null;
  mtn: { name: string };
  notify: (msg: string) => void;
  onShareRoute?: (route: RouteShareSheetProps["route"], to: ShareSheetClimber) => void;
  route: { id: string | number; name: string; grade?: string | null };
  setShareOpen: (v: boolean) => void;
  setShareSearch: (v: string) => void;
  shareLink: string;
  /** The live profile search for the typed name. */
  shareRes?: { data?: ReadonlyArray<{ id: string | number; name?: string | null; username?: string | null; show_name?: boolean | null; showName?: boolean | null; avatar?: string | null }> | null; isLoading?: boolean; error?: unknown } | null;
  shareSearch: string;
  who?: string | number | null;
}

/* shareOpen?createPortal( — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RouteShareSheet({_crumbs,_shareQ,blocked,connections,mtn,notify,onShareRoute,route,setShareOpen,setShareSearch,shareLink,shareRes,shareSearch,who}: RouteShareSheetProps){
  return createPortal(<div onClick={()=>setShareOpen(false)} role="dialog" aria-modal="true" aria-label="Share this route" style={{position:"fixed",inset:0,background:C.scrim,zIndex:230,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",padding:"10px 18px 18px",maxHeight:"86vh",overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderBottom:"none",boxShadow:"0 -10px 44px rgba(0,0,0,0.55)"}}><div {...clickable(()=>setShareOpen(false))} title="Collapse" style={{width:42,height:5,borderRadius:3,background:C.border,margin:"0 auto 12px",cursor:"pointer"}}></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Share this route</div><button aria-label="Close share" onClick={()=>setShareOpen(false)} style={POP_CLOSE}>✕</button></div><div style={{fontSize:13,color:C.textSub,marginBottom:15}}>{route.name+" · "+route.grade+" · "+mtnOf(route)}</div><CardHead style={{marginBottom:8}}>Send to a friend in ClimbMatch</CardHead><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 8px",lineHeight:1.45}}>It arrives in their Messages as a chat from you, with a link that opens this climb.</div>{(function(){const q=shareSearch.trim().toLowerCase();const conn=(connections||[]);const others=USE_DB?[]:CLIMBERS.filter(function(c){return c.id!==0&&!conn.some(function(f){return f.id===c.id;});});/* A live account is offered its real climbers only: seed climbers are not people it can share a climb with. */const pool=conn.concat(others);let matches=q?pool.filter(function(c){return ((realProfileId(c.id)?pubName(c):c.name)||"").toLowerCase().indexOf(q)>=0;}):pool;const real=((shareRes&&shareRes.data)||[]).filter(function(p){return p&&p.id&&String(p.id)!==String(who)&&!(blocked||[]).some(function(b){return String(b&&b.id)===String(p.id);})&&!matches.some(function(c){return String(c.id)===String(p.id);});}).map(function(p){return {id:p.id,name:p.name||"",username:p.username||"",showName:!!(p.show_name||p.showName),avatar:p.avatar||FALLBACK_AV,_profile:true};});matches=matches.concat(real);return <div style={{marginBottom:16}}><input aria-label="Search climbers by name" value={shareSearch} onChange={function(e){setShareSearch(e.target.value);}} placeholder="Search climbers by name" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13.5,boxSizing:"border-box",outline:"none"}}/>{matches.length?<div style={{maxHeight:236,overflowY:"auto",overscrollBehavior:"contain",marginTop:8}}>{matches.slice(0,40).map(function(c){const fr=conn.some(function(f){return f.id===c.id;});return <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0"}}><Av src={c.avatar} size={34}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,overflowWrap:"anywhere"}}>{(c._profile||realProfileId(c.id))?pubName(c):c.name}</div><div style={{fontSize:11.5,color:C.textMuted}}>{c._profile?"Climber on ClimbMatch":realProfileId(c.id)?(fr?"Partner":"Climber on ClimbMatch"):(fr?"Partner":"Climber")}</div></div><button onClick={function(){if(onShareRoute)onShareRoute(route,c);setShareOpen(false);setShareSearch("");}} style={{flexShrink:0,padding:"9px 15px",borderRadius:9,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Send</button></div>;})}</div>:<div style={{fontSize:12.5,color:C.textSub,marginTop:10,lineHeight:1.5}}>{q?(shareRes&&shareRes.isLoading&&_shareQ.length>=2?"Searching…":shareRes&&shareRes.error?"Couldn’t search climbers right now — check your connection and try again.":("No climbers match “"+shareSearch+"”.")):"Add friends to send climbs straight into their Messages — or send it another way below."}</div>}</div>;})()}<CardHead style={{marginBottom:6}}>Send another way</CardHead><div style={{fontSize:12,color:C.textMuted,marginBottom:8,lineHeight:1.45}}>The link opens this climb for anyone, with or without an account.</div><ShareVia title={route.name} text={route.name+" ("+gradeLabel(route)+") · "+mtnOf(route)+"\n"+shareLink} link={shareLink} onToast={notify}/><button onClick={function(){printSheet(route.name,routeSheetHtml(route,mtn.name,_crumbs.map(function(c){return c.name;})),notify);}} aria-label="Save this route as a PDF" style={{width:"100%",marginTop:12,minHeight:44,padding:"9px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Save as PDF</button><div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.4}}>Opens in a new tab — close it, or tap ← Back to ClimbMatch on it, and you are back here.</div></div></div>,document.body);
}
