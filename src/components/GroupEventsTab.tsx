import { daysUntil, C, groupEventsEmptyLine } from "../../ClimbMatchCore.jsx";
import { useState } from "react";
import ListPage, { ListPageEmpty } from "./ListPage.tsx";
import { BTN_PRIMARY } from "../../lib/buttonStyles.js";

/* _gpt==="events"? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
import type { Dispatch, ReactNode, SetStateAction } from "react";

/** The group, as the events tab reads it. */
interface GroupEventsTabGroup { id: string; _db?: boolean; eventPolicy?: string | null }
/** One event on a group's calendar. */
interface GroupEventsTabEvent { date: string; time?: string | null; title?: string | null; location?: string | null }
/** The blank form the Create event button opens. */
interface GroupEventsTabForm { groupId: string; title: string; date: string; time: string; location: string; desc: string; capacity: string }

export interface GroupEventsTabProps {
  cl: GroupEventsTabGroup;
  /** Every group's events, keyed by group id. */
  eventsAll: Record<string, GroupEventsTabEvent[] | undefined>;
  /** Minutes since midnight for an event time string; 9999 when unreadable. */
  groupEvMin: (time: string | null | undefined) => number;
  groupEventRow: (cl: GroupEventsTabGroup, ev: GroupEventsTabEvent, o?: { inGroup?: boolean; past?: boolean }) => ReactNode;
  groupEventsQ: { isError?: boolean };
  /** The group id whose past events are fully expanded, if any. */
  grpPastAll: string | null;
  isMod: boolean;
  joined: boolean;
  setEventForm: Dispatch<SetStateAction<GroupEventsTabForm | null>>;
  setGrpPastAll: Dispatch<SetStateAction<string | null>>;
}

export default function GroupEventsTab({cl,eventsAll,groupEvMin,groupEventRow,groupEventsQ,grpPastAll,isMod,joined,setEventForm,setGrpPastAll}: GroupEventsTabProps){
  /* ALL PAST EVENTS IS A PAGE (owner 2026-11-19): "See all N past events" unfolded every one in place. The page stacks at 792, over the group view (790) and, under the event a row opens (795). grpPastAll is still App's: the id of the group whose page is open. */
  const [q,setQ]=useState("");const [order,setOrder]=useState("new");
  return <div>{(()=>{/* Matches the heading above it: "upcoming events". It used to list every event oldest-first, so
     a group's upcoming calendar opened with a meetup that had already happened. Past events sit in their own section under it. */
                    const _allEvs=(eventsAll[cl.id]||[]);const evs=_allEvs.filter(function(e){return e&&e.date&&(daysUntil(e.date) as number)>=0;}).sort(function(a,b){return a.date===b.date?groupEvMin(a.time)-groupEvMin(b.time):(a.date<b.date?-1:1);});const past=_allEvs.filter(function(e){const du=e&&e.date?daysUntil(e.date):null;return du!==null&&du<0;}).sort(function(a,b){return a.date<b.date?1:-1;});const pastAll=grpPastAll===cl.id;const canCreate=joined&&((cl.eventPolicy||"anyone")!=="mods"||isMod);return <div style={{marginBottom:20}}>{/* CREATE EVENT LEADS THE TAB (owner 2026-11-23): it sat small at the heading's right; now it is above Upcoming events, centred and wide, so it reads as the tab's main action. */canCreate?<button type="button" onClick={()=>setEventForm({groupId:cl.id,title:"",date:"",time:"",location:"",desc:"",capacity:""})} style={{...BTN_PRIMARY(C),display:"block",width:"100%",maxWidth:360,minHeight:46,margin:"0 auto 16px",padding:"11px 16px",fontSize:14,fontWeight:800}}>+ Create event</button>:null}<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10}}><div style={{fontSize:12,fontWeight:800,color:C.label,textTransform:"uppercase",letterSpacing:0.4}}>{"Upcoming events"+(evs.length?" · "+evs.length:"")}</div></div>{joined&&!isMod&&(cl.eventPolicy||"anyone")==="mods"?<div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.4}}>{"Moderators host this group’s events. Have an idea? Post it, or ask a moderator."}</div>:null}{evs.length?evs.map(function(ev){return groupEventRow(cl,ev,{inGroup:true});}):<div style={{fontSize:12,color:C.textMuted,textAlign:"center",padding:"14px 0",background:C.card,border:"1px solid "+C.border,borderRadius:12}}>{(cl._db&&!joined)?"The group’s calendar is for members — join to see its events.":(cl._db&&groupEventsQ.isError)?"Couldn’t load this group’s events just now.":groupEventsEmptyLine(_allEvs.length,evs.length)}</div>}{past.length?<div style={{marginTop:18}}><div style={Object.assign({marginBottom:10},{fontSize:12,fontWeight:800,color:C.label,textTransform:"uppercase",letterSpacing:0.4})}>{"Past events · "+past.length}</div>{past.slice(0,3).map(function(ev){return groupEventRow(cl,ev,{inGroup:true,past:true});})}{past.length>3?<button type="button" aria-haspopup="dialog" onClick={()=>setGrpPastAll(cl.id)} style={{minHeight:44,width:"100%",padding:"10px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"All "+past.length+" past events →"}</button>:null}{pastAll?(function(){const ql=q.trim().toLowerCase();const rows=past.filter(function(e){return !ql||((e.title||"")+" "+(e.location||"")).toLowerCase().includes(ql);});if(order==="old")rows.reverse();return <ListPage zIndex={792} title={"Past events ("+past.length+")"} onClose={()=>setGrpPastAll(null)} search={{value:q,onChange:setQ,label:"Search past events",placeholder:"Search by name or place"}} sort={{value:order,onChange:setOrder,label:"Sort past events",options:[["new","Most recent"],["old","Oldest first"]]}}>{rows.map(function(ev){return groupEventRow(cl,ev,{inGroup:true,past:true});})}{!rows.length?<ListPageEmpty>{"No past events match “"+q.trim()+"”."}</ListPageEmpty>:null}</ListPage>;})():null}</div>:null}</div>;})()}</div>;
}
