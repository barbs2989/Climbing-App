// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { clickable } from "./clickable";
import { useState } from "react";
import { useProfilesByIds } from "./db";
import { C, CLIMBERS, SL, notifTarget, pubName } from "../ClimbMatchCore.jsx";
import SwipeRow from "../src/components/SwipeRow.tsx";
import Av from "../src/components/Av.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import { POP_BACK } from "./popupChrome.js";
import Chevron from "../src/components/Chevron.tsx";

export default function NotifPanel({requests,requestsUnavailable,notifs,onAccept,onDecline,onOpenProfile,onGo,onClose,onArchive,onDelete,onClearAll,archived,onRestore}){const [archOpen,setArchOpen]=useState(false);
  /* WHO a notification is about. CLIMBERS alone gave a REAL climber's notification (a friend accept, kudos) no
     avatar, and tapping it opened nothing. Real ids resolve through one profiles read for the whole panel. */
  const _uids=Array.from(new Set(notifs.concat(archived||[]).map(n=>n.climberId).filter(id=>typeof id==="string")));const profQ=useProfilesByIds(_uids);
  const who=id=>{if(typeof id==="string"){const p=(profQ.data||[]).find(x=>x.id===id);return p?{id:p.id,name:p.name||"Climber",avatar:p.avatar||"",username:p.username||"",showName:!!p.showName}:null;}return CLIMBERS.find(x=>x.id===id)||null;};
  const av=id=>{const c=who(id);return c&&c.avatar?c.avatar:null;};
  const empty=!requests.length&&!notifs.length;
  /* REQUESTS FIRST, TOGETHER (owner, 2026-10-22: "does the top notification page show items like this?"). Crew invites, climbers asking onto your crew,
     group invites and join requests, event invites and accepted friend requests were mixed into Activity among post and reminder rows; only friend
     requests had their own section. Every notice filed under the "requests" switch now sits under one REQUESTS heading with the friend requests,
     and the heading links to the Requests screen, where each can be answered and what you sent can be withdrawn -- as Facebook's notifications
     lead with friend requests and "See all", and LinkedIn's invitations open Manage › Received / Sent. */
  const row=n=>{const a=n.climberId!=null?av(n.climberId):null;const _t=notifTarget(n);const tappable=!!_t;return <SwipeRow key={n.id} radius={11} onDelete={()=>onDelete&&onDelete(n.id)} onArchive={()=>onArchive&&onArchive(n.id)}><div {...(_t?clickable(()=>{if(_t.kind==="profile"){const c=who(_t.climberId);if(c)onOpenProfile(c);}else{onGo(_t.to);}}):{})} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 11px",background:C.bg,cursor:tappable?"pointer":"default"}}><div style={{flexShrink:0}}>{/* The photo stands alone: a type badge pinned to its corner sat ON the climber's face (owner note 2026-10-24). Instagram and LinkedIn draw none; the sentence beside it says what happened. */}{a?<Av src={a} size={36}/>:<div style={{width:36,height:36,borderRadius:"50%",background:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{/* n.icon is an ActionIcon NAME ("user", "crews", "shield"), the same convention the
    Unfinished business list uses — rendering it bare printed the word instead of an icon. */}
                <ActionIcon name={n.icon||(n.goto?"calendar":(n.route||n.recap)?"log":"bell")} size={17} color={C.textMuted}/></div>}</div><div style={{flex:1,fontSize:13,color:C.textSub,lineHeight:1.5}}>{n.text}</div>{tappable?<span style={{color:C.blue,fontSize:14,flexShrink:0}}>→</span>:null}</div></SwipeRow>;};
  const reqNotifs=notifs.filter(n=>n.cat==="requests"),actNotifs=notifs.filter(n=>n.cat!=="requests");
  return <div onClick={onClose} role="dialog" aria-label="Notifications" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1200,overflowY:"auto",overscrollBehavior:"contain",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"12px 8px"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:440,border:`1px solid ${C.border}`,overflow:"hidden"}}>
      {/* ← Back on the LEFT, the bulk action alone on the RIGHT (owner note 2026-10-23: "Clear all button is too close to the x out button.
      We also need a back button here on the top left"). Facebook, Instagram and LinkedIn open notifications with a back arrow top-left and no ✕,
      so Back replaces the ✕ rather than adding a second way out; "Archive all" then has the right edge to itself. It said "Clear all", but
      it archives (everything stays under Archived, restorable), and swipe-left now DELETES, so "clear" would name the wrong one. */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}><button onClick={onClose} style={POP_BACK}>← Back</button><div style={{flex:1,minWidth:0,color:C.text,fontSize:17,fontWeight:700}}>Notifications</div>{notifs.length?<button onClick={()=>onClearAll&&onClearAll()} style={{flexShrink:0,background:C.card,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:8,padding:"0 12px",height:36,fontSize:12.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Archive all</button>:null}</div>
      {notifs.length?<div style={{padding:"8px 16px 0",fontSize:11.5,color:C.textMuted}}>Swipe right to archive · swipe left to delete</div>:null}
      <div style={{padding:"12px 14px",maxHeight:"72vh",overflowY:"auto",overscrollBehavior:"contain"}}>
        {(requests.length||reqNotifs.length)?<div style={{marginBottom:14}}><SL action={<button onClick={()=>onGo({tab:"crew",view:"requests"})} style={{background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",padding:"6px 0",whiteSpace:"nowrap"}}>See all requests ›</button>}>Requests</SL>{/* The two buttons never shrank and the name column had no floor, so at 360px the
        middle column collapsed to ~90px: "wants to be your climbing friend · 53" wrapped
        into a four-line tower that swallowed the 40px avatar beside it. The row now wraps
        — the buttons drop to their own line before the name is allowed to get that narrow —
        and both lines of text ellipsize rather than stacking. The words then had to FIT that
        floor: "wants to be your climbing friend" measured 182px against a 150px column at the
        app's full 520px width, so every real request read "wants to be your climbin…". "sent a
        friend request" measured 117px and fits the 140px floor at every width. */}
      {requests.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:10,rowGap:8,marginBottom:9,flexWrap:"wrap"}}><div {...clickable(()=>onOpenProfile(c))} aria-label={"View "+pubName(c)+"’s profile"} style={{cursor:"pointer",flexShrink:0}}><Av src={c.avatar} size={40}/></div><div {...clickable(()=>onOpenProfile(c))} style={{flex:"1 1 140px",minWidth:140,cursor:"pointer"}}><div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pubName(c)}</div><div style={{fontSize:12,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{"sent a friend request"}</div></div><div style={{display:"flex",gap:12,flexShrink:0,marginLeft:"auto"}}><button onClick={()=>onAccept(c)} style={{flexShrink:0,padding:"6px 12px",background:C.green,color:"#04110a",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>✓ Accept friend</button><button onClick={()=>onDecline(c.id)} style={{flexShrink:0,padding:"6px 10px",background:C.card,color:C.textMuted,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Decline</button></div></div>)}{reqNotifs.length?<div style={{display:"flex",flexDirection:"column",gap:6}}>{reqNotifs.map(row)}</div>:null}</div>:null}
        {actNotifs.length?<div><SL>Activity</SL>{actNotifs.map(row)}</div>:null}
        {archived&&archived.length?<div style={{marginTop:14}}><div {...clickable(()=>setArchOpen(o=>!o))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:archOpen?8:0}}><SL>{"Archived ("+archived.length+")"}</SL><Chevron open={archOpen} color={C.textMuted}/></div>{archOpen?<div style={{display:"flex",flexDirection:"column"}}>{archived.map(function(n){return <SwipeRow key={n.id} radius={11} onDelete={()=>onDelete&&onDelete(n.id)}><div style={{display:"flex",alignItems:"center",gap:10,background:C.bg,border:"1px solid "+C.border,borderRadius:11,padding:"9px 11px"}}><span style={{fontSize:16,flexShrink:0,opacity:0.7,display:"flex",alignItems:"center"}}><ActionIcon name={n.icon||"bell"} size={15} color={C.textMuted}/></span><span style={{flex:1,fontSize:12.5,color:C.textMuted,lineHeight:1.4}}>{n.text}</span><button onClick={()=>onRestore&&onRestore(n.id)} style={{flexShrink:0,padding:"5px 11px",borderRadius:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Restore</button></div></SwipeRow>;})}</div>:null}</div>:null}{/* A FAILED friends read leaves `requests` empty too; "all caught up" would then vouch for requests nobody could read. */}{empty&&requestsUnavailable?<div style={{textAlign:"center",padding:"30px 12px",color:C.textMuted,fontSize:13.5,lineHeight:1.5}}>Couldn’t load your friend requests — this is not an empty list. Check your connection and try again.</div>:empty?<div style={{textAlign:"center",padding:"34px 0",color:C.textMuted}}><div style={{fontSize:31,marginBottom:8}}>✅</div><div style={{fontSize:14}}>You’re all caught up.</div></div>:null}
      </div>
    </div>
  </div>;
}
