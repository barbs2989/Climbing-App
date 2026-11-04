import { POP_BACK } from "../../lib/popupChrome.js";
import { photoThumb } from "../../lib/photoThumb";
import { clickable } from "../../lib/clickable";
import { pubName, onImgErr, FALLBACK_AV, C, crewChatParticipantLine, pubFirst, FALLBACK_COVER, placeSub } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import DiscIcon from "./DiscIcon.tsx";
import MessageRow from "./MessageRow.tsx";
import TypingIndicator from "./TypingIndicator.tsx";
import ChatComposer from "./ChatComposer.tsx";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatMessage, ReactKey } from "./MessageRow.tsx";

interface CrewChatScreenPerson {
  id: string | number;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
}
/** A crew chat bubble: the shared message shape plus the sender's avatar. */
interface CrewChatScreenMsg extends ChatMessage { avatar?: string | null }
/** What crewPlace() resolves a crew to; `kind` is "route", "area" or "missing". */
interface CrewChatScreenPlace {
  kind: string;
  name?: string;
  areaId?: string | null;
  disc?: string;
  parentName?: string | null;
  grade?: string | null;
}
/** The crew's route when it has one; `{}` when it has none. */
interface CrewChatScreenRoute { id?: string | number; name?: string; cover?: string; grade?: string | null }

export interface CrewChatScreenProps {
  activeCrew: { _dbId?: unknown } | null | undefined;
  activeCrewMembers: ReadonlyArray<CrewChatScreenPerson>;
  activeCrewMsgs: ReadonlyArray<CrewChatScreenMsg>;
  /** The members other than the climber. */
  activeCrewOthers: ReadonlyArray<CrewChatScreenPerson>;
  activeCrewPlace: CrewChatScreenPlace | null;
  activeCrewRoute: CrewChatScreenRoute;
  chatCrew: string | number;
  chatEndRef: MutableRefObject<HTMLDivElement | null>;
  chatFromInbox: boolean;
  /** Per-crew: false once the oldest stored message is loaded. */
  crewMsgMore: Record<string, boolean | undefined>;
  /** Per-crew: the names of members typing right now. */
  crewTyping: Record<string, ReadonlyArray<string> | undefined>;
  loadMoreCrewMsgs: () => void;
  msgBack: string;
  msgPaging: boolean;
  notifyCrewTyping: () => void;
  openAreaById: (id: string | null | undefined) => void;
  openRoute: (route: CrewChatScreenRoute) => void;
  reactAt: ReactKey | null;
  reactTimer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  saveFloatPlanFromChat: (crewId: string | number, text: string, from: string | null | undefined) => void;
  sendCrewMsg: (crewId: string | number, text: string, opts?: { image: true; alt: string }) => void;
  setChatCrew: (c: null) => void;
  setChatFromInbox: (v: boolean) => void;
  setCrewMsgs: Dispatch<SetStateAction<Record<string, CrewChatScreenMsg[] | undefined>>>;
  setInboxOpen: (open: boolean) => void;
  setProfileModal: (p: CrewChatScreenPerson) => void;
  setReactAt: (key: ReactKey | null) => void;
  setTab: (tab: string) => void;
  uid: string | null;
}

/* tab==="crew"&&chatCrew&&activeCrew? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function CrewChatScreen({activeCrew,activeCrewMembers,activeCrewMsgs,activeCrewOthers,activeCrewPlace,activeCrewRoute,chatCrew,chatEndRef,chatFromInbox,crewMsgMore,crewTyping,loadMoreCrewMsgs,msgBack,msgPaging,notifyCrewTyping,openAreaById,openRoute,reactAt,reactTimer,saveFloatPlanFromChat,sendCrewMsg,setChatCrew,setChatFromInbox,setCrewMsgs,setInboxOpen,setProfileModal,setReactAt,setTab,uid}: CrewChatScreenProps){
  return <div style={{display:"flex",flexDirection:"column",height:"100%",padding:"14px 14px max(14px, env(safe-area-inset-bottom))",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12,flexShrink:0}}><button onClick={()=>{setChatCrew(null);if(chatFromInbox){setInboxOpen(true);}else{setTab(msgBack);}setChatFromInbox(false);}} aria-label="Back" style={POP_BACK}>← Back</button><div style={{display:"flex"}}>{activeCrewMembers.slice(0,4).map((c,i)=><img decoding="async" key={c.id} src={photoThumb(c.avatar,30)} {...clickable(()=>setProfileModal(c))} aria-label={"View "+pubName(c)+"’s profile"} onError={onImgErr(FALLBACK_AV)} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.bg}`,marginLeft:i?-8:0,cursor:"pointer"}}/>)}</div><div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15}}>{(activeCrewPlace&&activeCrewPlace.name)||"Your"} crew</div><div style={{fontSize:12,color:C.textMuted}}>{crewChatParticipantLine(activeCrewOthers.length)}</div></div></div><div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10,flexShrink:0}}><span style={{fontSize:12,fontWeight:600,color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"3px 9px"}}>You</span>{activeCrewOthers.map(c=><span key={c.id} {...clickable(()=>setProfileModal(c))} style={{fontSize:12,fontWeight:600,color:C.text,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"3px 9px",cursor:"pointer"}}>{pubFirst(c)}</span>)}</div>
        <div style={{flex:1,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>{!activeCrewMsgs.length?<div style={{textAlign:"center",padding:20,color:C.textMuted,fontSize:13}}><div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ActionIcon name="crews" size={29} color={C.textMuted}/></div>Plan the trip with your whole crew.</div>:null}{activeCrewRoute&&activeCrewRoute.id?<div {...clickable(()=>{openRoute(activeCrewRoute);})} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.border,borderRadius:11,padding:"8px 10px",marginBottom:11,cursor:"pointer",flexShrink:0}}><div style={{width:40,height:40,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" className="cover-x" src={activeCrewRoute.cover} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{activeCrewRoute.name}</div><div style={{fontSize:11.5,color:C.textSub}}>{"Crew objective · "+activeCrewRoute.grade}</div></div><span style={{color:C.blue,fontSize:13,fontWeight:700,flexShrink:0}}>View &rarr;</span></div>:(activeCrewPlace&&activeCrewPlace.kind==="area")?/* An AREA crew's chat (0302) carries its place the way a route crew's carries the objective: the crag, the session's discipline, and a way to the area page. */<div {...clickable(()=>openAreaById(activeCrewPlace.areaId))} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.border,borderRadius:11,padding:"8px 10px",marginBottom:11,cursor:"pointer",flexShrink:0}}><div style={{width:40,height:40,borderRadius:8,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><DiscIcon d={activeCrewPlace.disc} size={20} color={C.blue}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{activeCrewPlace.name}</div><div style={{fontSize:11.5,color:C.textSub}}>{"Crew session · "+placeSub(activeCrewPlace)}</div></div><span style={{color:C.blue,fontSize:13,fontWeight:700,flexShrink:0}}>Open area &rarr;</span></div>:null}{(uid&&activeCrew&&activeCrew._dbId&&crewMsgMore[chatCrew]!==false&&activeCrewMsgs.length>0)?<button onClick={loadMoreCrewMsgs} disabled={msgPaging} style={{padding:"8px 12px",fontSize:12,background:C.surface,border:"1px solid "+C.border,borderRadius:8,color:C.textSub,cursor:"pointer",alignSelf:"center",marginBottom:4,opacity:msgPaging?0.5:1}}>{msgPaging?"Loading…":"Load earlier messages"}</button>:null}{activeCrewMsgs.map((m,i)=><MessageRow key={i} m={m} reportKind="crew_message" onSaveFloatPlan={t=>saveFloatPlanFromChat(chatCrew,t,m.name)} avatarSrc={m.avatar} showName={true} reactKey={"c"+i} reactAt={reactAt} reactTimer={reactTimer} onSetReactAt={setReactAt} isLast={i===activeCrewMsgs.length-1} onReact={e=>{setCrewMsgs(function(mm){const arr=(mm[chatCrew]||[]).slice();if(arr[i])arr[i]=Object.assign({},arr[i],{reaction:arr[i].reaction===e?null:e});return Object.assign({},mm,{[chatCrew]:arr});});}}/>)}<TypingIndicator names={crewTyping[chatCrew]||[]}/><div ref={chatEndRef}/></div>
        <ChatComposer key={"c"+chatCrew} variant="crew" quickReplies={["On my way ","Sounds good!","Running late","Let’s lock a day","Who’s driving?"]} placeholder="Message the crew…" onSend={(t,opts)=>sendCrewMsg(chatCrew,t,opts)} onTyping={notifyCrewTyping}/>
      </div>;
}
