import { POP_BACK, POP_CLOSE } from "../../lib/popupChrome.js";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import { pubName, C, ME } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import MessageRow from "./MessageRow.tsx";
import TypingIndicator from "./TypingIndicator.tsx";
import ChatComposer from "./ChatComposer.tsx";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatMessage, ReactKey } from "./MessageRow.tsx";

interface DirectChatScreenPerson {
  id: string | number;
  name: string;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  online?: boolean;
  objectiveIds?: ReadonlyArray<string> | null;
}
interface DirectChatScreenRoute { id: string | number; name: string }
interface DirectChatScreenCrew { id: string | number; routeId?: string | number | null }
/** The profile (and resume) popups to reopen when Back returns from a chat opened over them. */
interface DirectChatScreenOverlay { profile: DirectChatScreenPerson | null; resume: unknown }

export interface DirectChatScreenProps {
  activeCrews: ReadonlyArray<DirectChatScreenCrew>;
  /** Climber ids whose reply is being typed right now. */
  aiTyping: Record<string, boolean | undefined>;
  chatEndRef: MutableRefObject<HTMLDivElement | null>;
  chatFromInbox: boolean;
  chatWith: DirectChatScreenPerson;
  /** Per-climber: false once the oldest stored message is loaded. */
  dmMore: Record<string, boolean | undefined>;
  formCrew: (routeId: string | number, partners: unknown[]) => void;
  loadMoreDMs: () => void;
  msgBack: string;
  msgBackOverlay: DirectChatScreenOverlay | null;
  msgPaging: boolean;
  msgs: Record<string, ChatMessage[] | undefined>;
  notifyDmTyping: () => void;
  openRoute: (route: DirectChatScreenRoute) => void;
  reactAt: ReactKey | null;
  reactTimer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  routeById: (id: string | number) => DirectChatScreenRoute | undefined;
  sendMsg: (climberId: string | number, text: string, opts?: { image: true; alt: string }) => void;
  setChatFromInbox: Dispatch<SetStateAction<boolean>>;
  setChatWith: (c: null) => void;
  setCrewView: (v: string) => void;
  setInboxOpen: (open: boolean) => void;
  setMsgBackOverlay: (o: null) => void;
  setMsgs: Dispatch<SetStateAction<Record<string, ChatMessage[] | undefined>>>;
  setOpenCrewId: (id: string | number) => void;
  setProfileModal: (p: DirectChatScreenPerson | null) => void;
  setReactAt: (key: ReactKey | null) => void;
  setResumeFor: (r: unknown) => void;
  setSoHidden: Dispatch<SetStateAction<Record<string, boolean | undefined>>>;
  setTab: (tab: string) => void;
  soHidden: Record<string, boolean | undefined>;
  uid: string | null;
}

/* tab==="crew"&&chatWith? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function DirectChatScreen({activeCrews,aiTyping,chatEndRef,chatFromInbox,chatWith,dmMore,formCrew,loadMoreDMs,msgBack,msgBackOverlay,msgPaging,msgs,notifyDmTyping,openRoute,reactAt,reactTimer,routeById,sendMsg,setChatFromInbox,setChatWith,setCrewView,setInboxOpen,setMsgBackOverlay,setMsgs,setOpenCrewId,setProfileModal,setReactAt,setResumeFor,setSoHidden,setTab,soHidden,uid}: DirectChatScreenProps){
  return <div style={{display:"flex",flexDirection:"column",height:"100%",padding:"14px 14px max(14px, env(safe-area-inset-bottom))",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12,flexShrink:0}}><button onClick={()=>{setChatWith(null);if(chatFromInbox){setInboxOpen(true);}else{setTab(msgBack);if(msgBackOverlay){setProfileModal(msgBackOverlay.profile);setResumeFor(msgBackOverlay.resume);}}setMsgBackOverlay(null);setChatFromInbox(false);}} aria-label="Back" style={POP_BACK}>← Back</button><div {...clickable(()=>setProfileModal(chatWith))} style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",flex:1,minWidth:0}}><Av src={chatWith.avatar} size={34} online={chatWith.online}/><div style={{minWidth:0}}><div style={{fontWeight:600,fontSize:15}}>{pubName(chatWith)}</div><div style={{display:"flex",alignItems:"center",gap:7,marginTop:2}}>{chatWith.online?<span style={{fontSize:11,color:C.green,fontWeight:600}}>● Active now</span>:<span style={{fontSize:11,color:C.textMuted}}>Active recently</span>}</div></div></div></div>{(()=>{const shared=(chatWith.objectiveIds||[]).filter(function(id){return (ME.objectiveIds||[]).indexOf(id)>=0;});const sr=shared.length?routeById(shared[0]):null;if(!sr||soHidden[chatWith.id])return null;const ec=activeCrews.find(function(c){return c.routeId===sr.id;});return <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:12,padding:"10px 54px 10px 12px",minHeight:52,boxSizing:"border-box",marginBottom:9,flexShrink:0,position:"relative"}}><button onClick={()=>setSoHidden(function(h){const n=Object.assign({},h);n[chatWith.id]=true;return n;})} aria-label="Dismiss shared objectives" style={Object.assign({},POP_CLOSE,{position:"absolute",top:4,right:4})}>✕</button><div style={{fontSize:13,color:C.text,fontWeight:800,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9,paddingRight:18}}>{"You both want · "+shared.length+" shared objective"+(shared.length!==1?"s":"")}</div><div style={{fontSize:13.5,fontWeight:700,color:C.text,marginBottom:9}}>{sr.name+(shared.length>1?" (+"+(shared.length-1)+" more)":"")}</div><div style={{display:"flex",gap:7}}><button onClick={()=>openRoute(sr)} style={{flex:1,padding:"8px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>View route</button>{ec?<button onClick={()=>{setOpenCrewId(ec.id);setChatWith(null);setCrewView("crews");setTab("crew");}} style={{flex:1,padding:"8px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Open crew →</button>:<button onClick={()=>{formCrew(sr.id,[]);}} style={{flex:1,padding:"8px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Form a crew</button>}</div></div>;})()}
        <div style={{flex:1,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",display:"flex",flexDirection:"column",gap:7,marginBottom:8}}>{!(msgs[chatWith.id]&&(msgs[chatWith.id] as ChatMessage[]).length)?<div style={{textAlign:"center",padding:20,color:C.textMuted,fontSize:13}}><div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ActionIcon name="chat" size={29} color={C.textMuted}/></div>Start planning your climb.</div>:null}{(uid&&dmMore[chatWith.id]!==false&&(msgs[chatWith.id]||[]).length>0)?<button onClick={loadMoreDMs} disabled={msgPaging} style={{padding:"8px 12px",fontSize:12,background:C.surface,border:"1px solid "+C.border,borderRadius:8,color:C.textSub,cursor:"pointer",alignSelf:"center",marginBottom:4,opacity:msgPaging?0.5:1}}>{msgPaging?"Loading…":"Load earlier messages"}</button>:null}{(msgs[chatWith.id]||[]).map((m,i)=><MessageRow key={i} m={m} reportKind="message" avatarSrc={chatWith.avatar} showName={false} reactKey={i} reactAt={reactAt} reactTimer={reactTimer} onSetReactAt={setReactAt} isLast={i===(msgs[chatWith.id]||[]).length-1} onReact={e=>{setMsgs(function(mm){const arr=(mm[chatWith.id]||[]).slice();if(arr[i])arr[i]=Object.assign({},arr[i],{reaction:arr[i].reaction===e?null:e});return Object.assign({},mm,{[chatWith.id]:arr});});}}/>)}<TypingIndicator names={aiTyping[chatWith.id]?[chatWith.name]:[]}/><div ref={chatEndRef}/></div>
        <ChatComposer key={chatWith.id} variant="dm" quickReplies={["Sounds good ","What time?","I'll bring the rack","Let's pick a day"]} placeholder="Message…" onSend={(t,opts)=>sendMsg(chatWith.id,t,opts)} onTyping={notifyDmTyping}/>
      </div>;
}
