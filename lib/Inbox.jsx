// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { tx } from "./tapWords.js";
import { clickable } from "./clickable";
import { searchMatches } from "./search";
import { useProfilesByIds } from "./db";
import { useEffect, useRef, useState } from "react";
import { C, CLIMBERS, ME, ROUTES, SZ5, crewPlace, crewSize, pubFirst, pubName } from "../ClimbMatchCore.jsx";
import SwipeRow from "../src/components/SwipeRow.tsx";
import Av from "../src/components/Av.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import { POP_BACK } from "./popupChrome.js";
import ListPage, { ListPageEmpty } from "../src/components/ListPage.tsx";
import { HEAD_H, ZOOM } from "./wideLayout.js";
import { dmKey, crewKey, MUTE_CHOICES } from "./conversationState.js";
import { usePaneTop } from "./usePaneTop.js";
import { previewText, PREVIEW_LINE, isMessageRequest } from "./chatPreview.js";

/* `pane` is the desktop website's placement (lib/wideLayout.js): "side" is the LEFT PANE of the
   two-pane Messages page — a 280px column at the page column's left edge, the open conversation
   drawn to its right — and "drop" is the drop-down under the top bar's chat icon, whose header
   opens the two-pane page (onExpand). Absent on a phone: the full-screen view, as before.
   Both are drawn at the website's ZOOM (owner 2026-11-04) like the page beside them; being fixed,
   each zooms ITSELF, so its own top/left/width are written divided by ZOOM. */
const PANE_STYLE={
  side:{zoom:ZOOM,position:"fixed",top:HEAD_H/ZOOM,bottom:0,left:"calc(var(--cm-col-left) / "+ZOOM+")",width:280/ZOOM,background:C.bg,zIndex:35,overflowY:"auto",overscrollBehavior:"contain",borderRight:"1px solid "+C.border,borderLeft:"1px solid "+C.border,boxSizing:"border-box"},
  drop:{zoom:ZOOM,position:"fixed",top:70/ZOOM,right:"calc(var(--cm-shell-right) / "+ZOOM+")",width:400/ZOOM,maxHeight:"calc((100vh - 90px) / "+ZOOM+")",background:C.surface,zIndex:1450,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:14,boxShadow:"0 18px 50px rgba(0,0,0,0.6)",boxSizing:"border-box"},
};
/* MANAGING A CONVERSATION (0422, owner 2026-11-14: "audit what Facebook does — blocking, mute, mark as unread,
   delete … swipe to delete or archive"). As Messenger: swipe RIGHT to archive, LEFT to delete (your copy only;
   it asks first), and a ⋯ beside every thread opens the rest inline under it — Mark as unread / read, Mute
   (1 hour, 8 hours, 24 hours, until you turn it back on), Archive, and on a direct chat Restrict and Block.
   The ⋯ is a sibling of the tappable row, never a button inside a button, and it is what a mouse, a keyboard
   or a screen reader uses: the swipe is touch only. App (ClimbMatch.jsx) does the work in `onAct`; `convo`
   (lib/conversationState.js) answers what each thread's state is. */
const chip={minHeight:44,padding:"0 12px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12.5,fontWeight:700,cursor:"pointer"};
function ThreadMenu({d,convo,onAct,unreadish,restricted,onDone}){
  const [muteOpen,setMuteOpen]=useState(false);
  const muted=convo.isMuted(d.key),archived=d.archived;
  const go=function(what,arg){onDone();onAct(what,d,arg);};
  if(muteOpen)return <div role="group" aria-label={"Mute "+d.name} style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 0 2px 52px"}}>
    {MUTE_CHOICES.map(function(m){return <button key={m[0]} onClick={function(){go("mute",m[1]);}} style={chip}>{m[0]}</button>;})}
    <button onClick={function(){setMuteOpen(false);}} style={{...chip,color:C.textMuted}}>Cancel</button>
  </div>;
  return <div role="group" aria-label={"Options for "+d.name} style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 0 2px 52px"}}>
    <button onClick={function(){go(unreadish?"read":"unread");}} style={chip}>{unreadish?"Mark as read":"Mark as unread"}</button>
    {muted?<button onClick={function(){go("unmute");}} style={chip}>Unmute</button>:<button onClick={function(){setMuteOpen(true);}} aria-expanded={false} style={{...chip,minHeight:44}}>Mute…</button>}
    <button onClick={function(){go(archived?"unarchive":"archive");}} style={chip}>{archived?"Unarchive":"Archive"}</button>
    {d.kind==="dm"&&d.real?<button onClick={function(){go(restricted?"unrestrict":"restrict");}} style={chip}>{restricted?"Unrestrict":"Restrict"}</button>:null}
    {d.kind==="dm"?<button onClick={function(){go("block");}} style={chip}>Block</button>:null}
    <button onClick={function(){go("delete");}} style={{...chip,color:C.red}}>Delete</button>
  </div>;
}
/* No conversation state given (a guard rendering the inbox alone): every thread is plain, and the actions do nothing. */
const NO_CONVO={isArchived:()=>false,isMuted:()=>false,isMarkedUnread:()=>false,isAccepted:()=>false};
export default function Inbox({restrictedIds,dmUnavailable,crewUnavailable,dmLoading,msgs,crews,crewMsgs,connections,onOpenDM,onOpenCrew,onClose,onAct:_onAct,convo:_convo,msgFrom,crewUnread,dmUnread,placeOf,routeById,pane,onExpand,onDismiss}){
  /* The drop-down leaves on a click outside it or Esc, as a website's menus do. The chat icon that
     opens it is not "outside": it toggles the drop-down itself. */
  const rootRef=useRef(null);
  useEffect(function(){if(pane!=="drop"||!onDismiss)return undefined;const down=function(e){var t=e.target;if(rootRef.current&&!rootRef.current.contains(t)&&!(t.closest&&t.closest('[aria-label="Messages"]'))&&!(t.closest&&/* a tap inside a page or sheet opened from here (Archived chats, a confirm) is not "outside" */t.closest('[role=dialog]')))onDismiss();};const key=function(e){if(e.key==="Escape")onDismiss();};document.addEventListener("mousedown",down);document.addEventListener("keydown",key);return function(){document.removeEventListener("mousedown",down);document.removeEventListener("keydown",key);};},[pane,onDismiss]);
  const [itab,setItab]=useState("friends");usePaneTop(rootRef,itab);const [msgQ,setMsgQ]=useState("");const mqOk=str=>!msgQ.trim()||(str||"").toLowerCase().includes(msgQ.trim().toLowerCase());
  const [menuFor,setMenuFor]=useState(null);const [archOpen,setArchOpen]=useState(false);const [reqOpen,setReqOpen]=useState(false);const [archQ,setArchQ]=useState("");
  const convo=_convo||NO_CONVO,onAct=_onAct||function(){};
  const dmIds=Object.keys(msgs||{}).filter(id=>(msgs[id]||[]).length>0);
  const _realDmIds=dmIds.filter(id=>!/^\d+$/.test(id));const dmProfilesQ=useProfilesByIds(_realDmIds);
  /* A THREAD IS DROPPED BELOW UNTIL ITS SENDER'S PROFILE ARRIVES (dmThreads filters on `c`), and the
     profile read starts only once the messages have landed -- a second round trip. In that window the
     messages are loaded, `dmLoading` is false, and the list used to say "No friend chats yet" to a
     climber with a message waiting: check:message-delivery read exactly that on CI when the profile
     read ran past its settle window (runs 43108689522, 43110748702). The names still loading is
     loading, and a failed names read is a failed read, not an empty inbox. */
  const _dmUnnamed=_realDmIds.some(id=>!(dmProfilesQ.data||[]).some(p=>p.id===id));
  const dmNamesLoading=_dmUnnamed&&dmProfilesQ.isLoading;const dmNamesUnavailable=_dmUnnamed&&dmProfilesQ.isError;
  const dmThreads=dmIds.map(id=>{const c=/^\d+$/.test(id)?(+id===0?ME:CLIMBERS.find(x=>x.id===+id)):((dmProfilesQ.data||[]).find(p=>p.id===id));const arr=msgs[id]||[];return c?{c:c,last:arr[arr.length-1]}:null;}).filter(Boolean).sort((a,b)=>((b.last&&b.last.ts)||0)-((a.last&&a.last.ts)||0));  const crewThreads=(crews||[]).map(cr=>{/* ONE place, a route or an area (0302): the thread is named for either. */const r=(placeOf?placeOf(cr):crewPlace(cr,{}))||{};const arr=(crewMsgs&&crewMsgs[cr.id])||[];return {cr:cr,r:r,last:arr.length?arr[arr.length-1]:null,count:arr.length,un:(crewUnread&&crewUnread[cr.id])||0};}).filter(t=>t.count||t.un).sort((a,b)=>(b.un-a.un)||(((b.last&&b.last.ts)||0)-((a.last&&a.last.ts)||0)));
  /* What onAct needs to know about a thread: which one (key), whose (name, c / dbId) and its newest message's
     time — Delete hides up to exactly that message, Archive lasts until a newer one. */
  const dmDesc=t=>{const key=dmKey(t.c.id),lastTs=(t.last&&t.last.ts)||0;return {kind:"dm",key:key,id:t.c.id,c:t.c,real:!/^\d+$/.test(String(t.c.id)),name:pubName(t.c),lastTs:lastTs,archived:convo.isArchived(key,lastTs)};};
  const crewDesc=t=>{const key=crewKey(t.cr.id),lastTs=(t.last&&t.last.ts)||0;return {kind:"crew",key:key,id:t.cr.id,dbId:t.cr._dbId,name:(t.r.name||"Crew")+" crew",lastTs:lastTs,archived:convo.isArchived(key,lastTs)};};
  const dmLive=dmThreads.filter(t=>!dmDesc(t).archived),dmArch=dmThreads.filter(t=>dmDesc(t).archived&&!(restrictedIds&&restrictedIds.has(String(t.c.id))));
  const crewLive=crewThreads.filter(t=>!crewDesc(t).archived),crewArch=crewThreads.filter(t=>crewDesc(t).archived);
  /* WHO IS A FRIEND, A CREWMATE, A REQUEST. */
  const isFr=t=>(connections||[]).some(c=>c.id===t.c.id);const crewMateIds=new Set();(crews||[]).forEach(c=>(c.members||[]).forEach(m=>{if(m&&m.status==="confirmed"&&m.climberId!=null)crewMateIds.add(String(m.climberId));}));const isCrewMate=t=>crewMateIds.has(String(t.c.id));/* RESTRICTED (0270): always in Message requests, in every filter -- reachable, never in the main list, never badged. */const isRes=t=>!!(restrictedIds&&restrictedIds.has(String(t.c.id)));/* A MESSAGE REQUEST (0546) is a chat from someone who is not your friend or crewmate, until you ACCEPT it or reply -- no friend request needed, as Messenger. An accepted chat is yours in every filter. */const iReplied=t=>(msgs[t.c.id]||[]).some(m=>m&&m.from==="me");const isReq=t=>isMessageRequest({msgFrom:msgFrom,isFriend:isFr(t),isCrewMate:isCrewMate(t),accepted:convo.isAccepted(dmKey(t.c.id)),iReplied:iReplied(t)});const isMine=t=>isFr(t)||isCrewMate(t)||convo.isAccepted(dmKey(t.c.id))||iReplied(t);const reqT=(msgFrom==="requests"?dmThreads.filter(t=>isReq(t)&&!isRes(t)):[]).concat(dmThreads.filter(isRes));
  /* The Archived chats page closes with its last row: left set, the next Archive reopened it by itself (2026-11-23). */
  const _archN=(itab==="crews"?crewArch:dmArch).length;useEffect(function(){if(!_archN)setArchOpen(false);},[_archN,itab]);
  /* ...and the Message requests page with its last request. */
  const _reqN=reqT.length;useEffect(function(){if(!_reqN)setReqOpen(false);},[_reqN]);

  const friendsNoDM=(connections||[]).filter(f=>dmIds.indexOf(String(f.id))<0);
  const lastTxt=previewText;
  const row={padding:"11px 4px 11px 12px",marginBottom:0,background:C.card,border:"1px solid "+C.border,borderRadius:12};
  const rowTop={display:"flex",alignItems:"center",gap:10};
  const lbl={fontSize:12,color:C.label,textTransform:"uppercase",letterSpacing:0.4,marginBottom:7,fontWeight:700};
  const prev={fontSize:12.5,color:C.textSub,fontWeight:400,letterSpacing:0.1,marginTop:1,...PREVIEW_LINE};
  const hint=<div style={{fontSize:11.5,color:C.textMuted,margin:"0 2px 8px"}}>{tx("Swipe right to archive · swipe left to delete · or tap ⋯")}</div>;
  /* One thread row, a direct chat or a crew's. `body` is what the row shows; `nu` its unread count. A MUTED
     thread keeps its count but draws it grey with a struck bell, and it leaves every badge; MARKED UNREAD draws
     a dot and counts once, until the thread is opened. */
  const Thread=function(d,nu,open,body,restricted){
    const muted=convo.isMuted(d.key),marked=convo.isMarkedUnread(d.key),unreadish=nu>0||marked;
    return <SwipeRow hover key={d.key} onDelete={()=>onAct("delete",d)} onArchive={d.archived?undefined:()=>onAct("archive",d)}><div style={row}><div style={rowTop}>
      <div {...clickable(function(){/* a chat opened from the Archived chats page lands under it otherwise */setArchOpen(false);open();})} style={SZ5}>{body(unreadish)}</div>
      {muted?<span role="img" aria-label="Muted" style={{display:"inline-flex",flexShrink:0}}><ActionIcon name="bell-off" size={14} color={C.textMuted}/></span>:null}
      {nu>0?<span aria-label={nu+" unread"} style={{flexShrink:0,minWidth:18,height:18,borderRadius:9,background:muted?C.border:C.actionSolid,color:muted?C.textSub:C.onSolid,fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{nu}</span>:marked?<span role="img" aria-label="Marked unread" style={{flexShrink:0,width:10,height:10,borderRadius:5,background:muted?C.textMuted:C.actionSolid}}/>:null}
      <button onClick={()=>setMenuFor(m=>m===d.key?null:d.key)} aria-label={"Options for "+d.name} aria-expanded={menuFor===d.key} style={{minHeight:44,flexShrink:0,alignSelf:"stretch",minWidth:36,background:"none",border:"none",color:C.textMuted,fontSize:18,fontWeight:700,cursor:"pointer",padding:"0 8px"}}>⋯</button>
    </div>{menuFor===d.key?<ThreadMenu d={d} convo={convo} onAct={onAct} unreadish={unreadish} restricted={restricted} onDone={()=>setMenuFor(null)}/>:null}</div></SwipeRow>;
  };
  const dmRow=function(t){var d=dmDesc(t);var nu=(dmUnread||{})[t.c.id]||0;return Thread(d,nu,()=>onOpenDM(t.c),function(bold){return <><Av src={t.c.avatar} size={42} online={t.c.online}/><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}><span style={{fontSize:14,fontWeight:700,overflowWrap:"anywhere"}}>{pubName(t.c)}</span></div>{(()=>{var sh=(t.c.objectiveIds||[]).filter(function(id){return (ME.objectiveIds||[]).indexOf(id)>=0;});var sr=sh.length?((routeById&&routeById(sh[0]))||ROUTES.find(function(r){return r.id===sh[0];})||null):null;return sr?<div style={{fontSize:11,color:C.blue,fontWeight:600,marginTop:1,overflowWrap:"anywhere"}}>{"↳ both want "+sr.name}</div>:null;})()}<div style={bold?Object.assign({},prev,{color:C.text,fontWeight:600}):prev}>{lastTxt(t.last)||tx("Tap to open")}</div></div></>;},!!(restrictedIds&&restrictedIds.has(String(t.c.id))));};
  const crewRow=function(t){var d=crewDesc(t);return Thread(d,0,()=>onOpenCrew(t.cr),function(bold){var muted=convo.isMuted(d.key);return <><div style={{width:42,height:42,borderRadius:10,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ActionIcon name="crews" size={20} color={C.blue}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700}}>{t.r.name||"Crew"}{t.un?<span style={{marginLeft:6,fontSize:12,fontWeight:800,color:muted?C.textSub:C.onSolid,background:muted?C.border:C.actionSolid,borderRadius:9,padding:"1px 7px",verticalAlign:"middle"}}>{t.un+" new"}</span>:null}</div><div style={bold?Object.assign({},prev,{color:C.text,fontWeight:600}):prev}>{lastTxt(t.last)||(crewSize(t.cr)+" climber"+(crewSize(t.cr)===1?"":"s")+tx(" · tap to open"))}</div></div></>;});};
  /* One MESSAGE REQUEST (0546): who, and one clean line of what they sent; then Accept or Decline. Accept moves the
     chat to your chats with no friend request; Decline deletes your copy (it asks first). A RESTRICTED climber's
     chat (0270) offers Unrestrict instead of Accept, since restricting is what keeps it here. */
  const reqRow=function(t){var d=dmDesc(t);var res=isRes(t);var b={minHeight:44,padding:"0 16px",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"};return <div key={d.key} style={{...row,padding:"11px 12px",marginBottom:8}}>
    <div {...clickable(()=>{setReqOpen(false);onOpenDM(t.c);})} style={SZ5}><Av src={t.c.avatar} size={42} online={t.c.online}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,...PREVIEW_LINE}}>{pubName(t.c)}</div><div style={prev}>{lastTxt(t.last)||"Wants to message you"}</div></div></div>
    <div style={{display:"flex",gap:8,marginTop:9,paddingLeft:52}}>{res?<button onClick={()=>onAct("unrestrict",d)} style={{...b,border:"none",background:C.actionSolid,color:C.onSolid}}>Unrestrict</button>:<button onClick={()=>onAct("accept",d)} style={{...b,border:"none",background:C.actionSolid,color:C.onSolid}}>Accept</button>}<button onClick={()=>onAct("decline",d)} style={{...b,border:"1px solid "+C.border,background:"transparent",color:C.text}}>Decline</button></div>
  </div>;};
  /* Archived chats sit under their own heading, closed until asked for, as Messenger keeps them out of the
     list without deleting anything. A new message brings a thread back by itself. Since 2026-11-19 (owner) the heading is a button and the
     archived threads are a page with a search box: it was a dropdown at the foot of the tab. */
  const archBlock=function(list,render,nameOf){if(!list.length)return null;const ql=archQ.trim().toLowerCase();const rows=list.filter(function(t){return !ql||String(nameOf(t)||"").toLowerCase().includes(ql);});return <div style={{marginTop:14}}><button type="button" aria-haspopup="dialog" onClick={()=>setArchOpen(true)} style={{display:"inline-flex",alignItems:"center",minHeight:44,background:"none",border:"none",padding:"0 2px",color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"Archived chats ("+list.length+") →"}</button>{archOpen?<ListPage zIndex={1150} title={"Archived chats ("+list.length+")"} onClose={()=>setArchOpen(false)} search={{value:archQ,onChange:setArchQ,label:"Search archived chats",placeholder:"Search archived chats by name"}}>{rows.map(render)}{!rows.length?<ListPageEmpty>{"No archived chats match “"+archQ.trim()+"”."}</ListPageEmpty>:null}</ListPage>:null}</div>;};
  return (<div ref={rootRef} style={pane?PANE_STYLE[pane]:{position:"fixed",inset:0,background:C.bg,zIndex:1100,overflowY:"auto",overscrollBehavior:"contain",maxWidth:520,margin:"0 auto",boxSizing:"border-box"}}>
    <div style={{position:"sticky",top:0,background:C.surface,borderBottom:"1px solid "+C.border,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,zIndex:2}}>
      {pane==="drop"?null:<button onClick={onClose} style={POP_BACK}>← Back</button>}
      <div style={{fontSize:15,fontWeight:700,color:C.text,flex:pane==="drop"?1:undefined}}>Messages</div>
      {pane==="drop"&&onExpand?<button onClick={onExpand} style={{background:"none",border:"none",padding:"4px 2px",color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>Open messages</button>:null}
    </div>
    <div style={{maxWidth:560,margin:"0 auto",padding:"14px 16px 40px",color:C.text}}>
      <div style={{display:"flex",gap:8,marginBottom:14}}>{[["friends","Friends",dmLive.filter(t=>reqT.indexOf(t)<0).length],["crews","Crews",crewLive.length]].map(z=><button key={z[0]} onClick={()=>{setItab(z[0]);setMenuFor(null);}} aria-label={z[2]?z[1]+", "+z[2]:z[1]} aria-current={itab===z[0]?"true":undefined} style={{flex:1,padding:"9px 4px",borderRadius:11,border:"1px solid "+(itab===z[0]?C.blue:C.border),cursor:"pointer",background:itab===z[0]?C.blueBg:C.card,color:itab===z[0]?C.onSolid:C.textSub,fontSize:13,fontWeight:700}}>{z[1]}{z[2]?<span style={{marginLeft:5,fontSize:12,fontWeight:800,opacity:0.85}}>{z[2]}</span>:null}</button>)}</div>
      {(dmThreads.length||crewThreads.length)?<div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"0 11px",marginBottom:12}}><span style={{display:"inline-flex",color:C.textMuted}}><ActionIcon name="search" size={13} color={C.textMuted}/></span><input aria-label="Search messages" value={msgQ} onChange={e=>setMsgQ(e.target.value)} placeholder="Search messages…" style={{flex:1,padding:"9px 0",border:"none",background:"transparent",color:C.text,fontSize:13.5,outline:"none"}}/></div>:null}{itab==="friends"?(()=>{const shown=t=>mqOk(pubName(t.c)+" @"+(t.c.username||""));const mainT=(msgFrom==="everyone"?dmLive:msgFrom==="requests"?dmLive.filter(t=>!isReq(t)):dmLive.filter(isMine)).filter(t=>!isRes(t)).filter(shown);const archT=dmArch.filter(shown);return <div>
        {reqT.length?<button type="button" aria-haspopup="dialog" onClick={()=>setReqOpen(true)} aria-label={"Message requests, "+reqT.length} style={{display:"flex",alignItems:"center",gap:10,width:"100%",minHeight:52,marginBottom:12,padding:"8px 12px",background:C.card,border:"1px solid "+C.border,borderRadius:12,color:C.text,cursor:"pointer",textAlign:"left"}}><ActionIcon name="chat" size={20} color={C.blue}/><span style={{flex:1,fontSize:14,fontWeight:700}}>Message requests</span><span style={{minWidth:20,height:20,borderRadius:10,background:C.actionSolid,color:C.onSolid,fontSize:11.5,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 6px"}}>{reqT.length}</span><span aria-hidden="true" style={{color:C.textMuted,fontSize:16}}>›</span></button>:null}
        {reqOpen&&reqT.length?<ListPage zIndex={1150} title={"Message requests ("+reqT.length+")"} onClose={()=>setReqOpen(false)} intro={<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{"From climbers you aren’t friends with. Open one to read it, then accept it into your chats or decline it. Settings › Privacy chooses who lands here."}</div>}>{reqT.map(reqRow)}</ListPage>:null}
        {mainT.length?hint:null}
        <div className="cm-stagger">{mainT.map(dmRow)}</div>
        {friendsNoDM.length?<div style={{marginTop:dmThreads.length?10:0}}><div style={lbl}>Start a chat</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{friendsNoDM.map(f=><button key={f.id} onClick={()=>onOpenDM(f)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:"transparent",border:"none",cursor:"pointer",width:64}}><Av src={f.avatar} size={46} online={f.online}/><span style={{fontSize:12,color:C.textSub,maxWidth:64,overflowWrap:"anywhere"}}>{pubFirst(f)}</span></button>)}</div></div>:null}
        {(!mainT.length&&!reqT.length&&!friendsNoDM.length)?<div style={{textAlign:"center",padding:archT.length?"28px 20px 8px":"48px 20px",color:C.textMuted}}><div style={{display:"flex",justifyContent:"center",marginBottom:10}}><ActionIcon name="chat" size={34} color={C.textMuted}/></div><div style={{fontSize:12,color:C.textMuted,fontWeight:600,marginBottom:5}}>{(dmUnavailable||dmNamesUnavailable)?"Couldn't load your chats":(dmLoading||dmNamesLoading)?"Loading your chats…":archT.length?"Every chat is archived":"No friend chats yet"}</div>{(dmLoading||dmNamesLoading)&&!(dmUnavailable||dmNamesUnavailable)?null:<div style={{fontSize:13,lineHeight:1.6}}>{(dmUnavailable||dmNamesUnavailable)?"Your conversations are still here — this list just couldn't be loaded. Try again in a moment.":archT.length?"They come back here when someone writes. Open Archived chats to read them now.":"Message a partner from their profile and your chats will live here."}</div>}</div>:null}
        {archBlock(archT,dmRow,function(t){return pubName(t.c);})}
      </div>;})():null}
      {itab==="crews"?(()=>{const shown=t=>(!msgQ.trim()||searchMatches(msgQ,t.r.name));const liveT=crewLive.filter(shown),archT=crewArch.filter(shown);return <div>
        {crewUnavailable?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.6,padding:"6px 0 10px"}}>Couldn’t check your crew chats for new messages — the counts here may be behind until the connection returns.</div>:null}
        {liveT.length?<>{hint}{liveT.map(crewRow)}</>:<div style={{textAlign:"center",padding:archT.length?"28px 20px 8px":"48px 20px",color:C.textMuted}}><div style={{display:"flex",justifyContent:"center",marginBottom:10}}><ActionIcon name="chat" size={34} color={C.textMuted}/></div><div style={{fontSize:12,color:C.textMuted,fontWeight:600,marginBottom:5}}>{archT.length?"Every crew chat is archived":"No crew chats yet"}</div><div style={{fontSize:13,lineHeight:1.6}}>{archT.length?"They come back here when someone writes. Open Archived chats to read them now.":"Start a crew on a climb and the conversation shows up here."}</div></div>}
        {archBlock(archT,crewRow,function(t){return (t.r&&t.r.name)||"Crew";})}
      </div>;})():null}
    </div>
  </div>);
}
