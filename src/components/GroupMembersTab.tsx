import { groupJoinPath } from "../../lib/groupRules.js";
import { C, SZ5, pubName, climberLine, pubFirst } from "../../ClimbMatchCore.jsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { approveAllGroupRequests, setGroupMemberRole, unbanGroupMember } from "../../lib/db";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import { POP_REMOVE } from "../../lib/popupChrome.js";
import type { Dispatch, ReactNode, SetStateAction } from "react";

/** A member id: a profile uuid on a stored group, a number on an example one. */
type GroupMembersTabId = string | number;
/** A row of the roster: a resolved profile, an example climber, or the placeholder for one that would not resolve. */
interface GroupMembersTabPerson {
  id: GroupMembersTabId;
  name: string;
  avatar?: string;
  online?: boolean;
  _profile?: boolean;
  [k: string]: unknown;
}
/** The group, as the Members tab reads it. */
interface GroupMembersTabGroup {
  id: string;
  name?: string;
  _db?: boolean;
  ownerId?: GroupMembersTabId | null;
  moderatorIds?: GroupMembersTabId[];
  joinQuestions?: unknown[];
}
/** A pending request to join (or invitation to) a group. */
interface GroupMembersTabRequest { type?: string; groupId: string }
/** A live read; only what this tab reads. */
interface GroupMembersTabQuery<T = unknown> { data?: T | null; isError?: boolean; refetch?: () => unknown }
/** A banned member's row. */
interface GroupMembersTabBan { user_id: string; reason?: string | null }
/** The remove-member sheet's draft. */
interface GroupMembersTabAction { kind: string; groupId: string; userId: GroupMembersTabId; name: string; targetIsMod: boolean; db: boolean; ban: boolean; reason: string; busy: boolean }

/* _gpt==="members"? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export interface GroupMembersTabProps {
  _canSeeRoster: boolean;
  /** Whether an id is a real profile id (a uuid) rather than an example climber's. */
  _isUid: (id: GroupMembersTabId) => boolean;
  /** Your own id in this group: your uid on a stored group, 0 on a local one. */
  _meGid: GroupMembersTabId;
  _memN: number;
  _roster: GroupMembersTabPerson[];
  cl: GroupMembersTabGroup;
  groupAnyPerson: (id: GroupMembersTabId) => GroupMembersTabPerson | null | undefined;
  groupJoinReqCard: (rq: GroupMembersTabRequest, cl: GroupMembersTabGroup, key: string, inGroup: boolean) => ReactNode;
  groupJoinReqsQ: GroupMembersTabQuery;
  groupReqsAll: GroupMembersTabRequest[];
  grpProfilesUnavailable: boolean;
  isCreator: boolean;
  isMod: boolean;
  joined: boolean;
  /** Which groups have the full roster showing, by group id. */
  membersOpen: Record<string, boolean>;
  modIds: GroupMembersTabId[];
  myGroupsQ: GroupMembersTabQuery;
  openGrpBansQ: { data: GroupMembersTabBan[]; refetch?: () => unknown };
  setGroupMods: Dispatch<SetStateAction<Record<string, GroupMembersTabId[]>>>;
  setMemberAction: Dispatch<SetStateAction<GroupMembersTabAction | null>>;
  setMembersOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  setOpenGroupId: Dispatch<SetStateAction<string | null>>;
  setProfileModal: (p: GroupMembersTabPerson) => void;
  setShowBanList: Dispatch<SetStateAction<boolean>>;
  showBanList: boolean;
  showToast: (msg: string) => void;
  uid: string | null | undefined;
  /** public or private, as this group is currently set. */
  vis: string;
}

export default function GroupMembersTab({_canSeeRoster,_isUid,_meGid,_memN,_roster,cl,groupAnyPerson,groupJoinReqCard,groupJoinReqsQ,groupReqsAll,grpProfilesUnavailable,isCreator,isMod,joined,membersOpen,modIds,myGroupsQ,openGrpBansQ,setGroupMods,setMemberAction,setMembersOpen,setOpenGroupId,setProfileModal,setShowBanList,showBanList,showToast,uid,vis}: GroupMembersTabProps){
  return _canSeeRoster?<div>{isMod?(function(){/* MEMBER REQUESTS, on the group's own page. They were reachable only under Crew › Requests, so an organizer looking at their group saw no sign anyone was waiting. */const _rq=groupReqsAll.filter(function(r){return r.type!=="invite"&&r.groupId===cl.id;});if(!_rq.length&&groupJoinPath(cl,vis)!=="request")return null;return <div style={{marginBottom:18}}><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Member requests · "+_rq.length}</div>{_rq.length>1&&cl._db?<button onClick={function(){askConfirm({title:"Approve all "+_rq.length+" requests?",body:"They all join "+cl.name+" at once."+((cl.joinQuestions||[]).length?" Read their answers below first.":""),confirmLabel:"Approve all"}).then(function(ok){if(!ok)return;approveAllGroupRequests(cl.id).then(function(n){if(groupJoinReqsQ.refetch)groupJoinReqsQ.refetch();if(myGroupsQ.refetch)myGroupsQ.refetch();showToast(n===1?"1 request approved":n+" requests approved");}).catch(function(){showToast("Couldn’t approve those — try again.");});});}} style={{width:"100%",marginBottom:9,padding:"9px",borderRadius:9,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"Approve all ("+_rq.length+")"}</button>:null}{_rq.length?_rq.map(function(rq,ix){return groupJoinReqCard(rq,cl,"gjr"+ix,true);}):<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 12px"}}>{cl._db&&groupJoinReqsQ.isError?"Couldn’t load requests just now — try again in a moment.":"Nobody is waiting right now. New requests appear here and under Menu › Requests."}</div>}</div>;})():null}<div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Members · "+_memN}</div>{grpProfilesUnavailable?<div style={{fontSize:11.5,color:C.textMuted,marginBottom:7,lineHeight:1.45}}>{"Couldn’t load member names just now. The count is right — the names below are not."}</div>:null}<div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:20}}>{(membersOpen[cl.id]?_roster:_roster.slice(0,6)).map(function(c){const cmod=modIds.indexOf(c.id)>=0;return <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderRadius:10}}><div {...(c._profile?{}:clickable(function(){setOpenGroupId(null);setProfileModal(c);}))} style={c._profile?Object.assign({},SZ5,{cursor:"default"}):SZ5}><Av src={c.avatar} size={38} online={c.online}/><div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>{pubName(c)}{cmod?<span style={{fontSize:11,fontWeight:700,color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:5,padding:"1px 6px"}}>MOD</span>:null}</div><div style={{fontSize:12,color:C.textMuted}}>{c._profile?(cl.ownerId===c.id?"Owner":(modIds.indexOf(c.id)>=0?"Moderator":"Member")):climberLine(c)}</div></div></div>{(isCreator&&joined&&c.id!==_meGid)?<button onClick={function(){const _dbm=!!(uid&&cl._db&&_isUid(c.id));const _setMods=function(on: boolean){setGroupMods(function(p){const cur=p[cl.id]||cl.moderatorIds||[];const nx=on?(cur.indexOf(c.id)>=0?cur:cur.concat([c.id])):cur.filter(function(x){return x!==c.id;});const o: Record<string, GroupMembersTabId[]>={};Object.keys(p).forEach(function(k){o[k]=p[k];});o[cl.id]=nx;return o;});};_setMods(!cmod);showToast((cmod?(pubFirst(c)+" is no longer a moderator"):(pubFirst(c)+" is now a moderator"))+(uid?"":" on this device — sign in to keep it"));if(_dbm)setGroupMemberRole(cl.id,c.id,cmod?"member":"moderator").then(function(){if(myGroupsQ.refetch)myGroupsQ.refetch();}).catch(function(){_setMods(cmod);showToast("Couldn’t change that — only the group owner can set moderators.");});}} style={{flexShrink:0,fontSize:11.5,fontWeight:700,padding:"5px 9px",borderRadius:8,border:"1px solid "+(cmod?C.border:C.blue),background:cmod?C.surface:C.blueBg,color:cmod?C.textMuted:"#fff",cursor:"pointer",marginRight:14}}>{cmod?"− Mod":"+ Mod"}</button>:null}{((isMod&&!cmod)||(isCreator&&joined&&c.id!==_meGid&&c.id!==cl.ownerId))?<button onClick={function(){setMemberAction({kind:"remove",groupId:cl.id,userId:c.id,name:pubFirst(c),targetIsMod:cmod,db:!!(uid&&cl._db&&_isUid(c.id)),ban:false,reason:"",busy:false});}} aria-label={"Remove "+pubFirst(c)} style={POP_REMOVE}>{"✕"}</button>:null}</div>;})}{_roster.length>6?<button onClick={function(){setMembersOpen(function(p){const o: Record<string, boolean>={};Object.keys(p).forEach(function(k){o[k]=p[k];});o[cl.id]=!p[cl.id];return o;});}} style={{width:"100%",marginTop:6,padding:"9px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{membersOpen[cl.id]?"Show fewer":"Show all "+_memN+" members"}</button>:null}</div>{isMod&&cl._db&&((openGrpBansQ.data)||[]).length?<div style={{marginBottom:18}}><button onClick={function(){setShowBanList(!showBanList);}} aria-expanded={showBanList} style={{minHeight:44,background:"none",border:"none",padding:0,color:C.textMuted,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{(showBanList?"Hide":"Show")+" banned · "+openGrpBansQ.data.length}</button>{showBanList?<div style={{marginTop:8}}>{openGrpBansQ.data.map(function(b){const who=groupAnyPerson(b.user_id);const nm=who?pubName(who):"A climber";return <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 4px"}}><Av src={who?who.avatar:""} size={30}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{nm}</div>{b.reason?<div style={{fontSize:11.5,color:C.textMuted}}>{b.reason}</div>:null}</div><button onClick={function(){askConfirm({title:"Lift the ban on "+nm+"?",body:"They’ll be able to ask to join, or be invited, again.",confirmLabel:"Lift ban"}).then(function(ok){if(!ok)return;unbanGroupMember(cl.id,b.user_id).then(function(){if(openGrpBansQ.refetch)openGrpBansQ.refetch();showToast("Ban lifted");}).catch(function(){showToast("Couldn’t lift that ban — try again.");});});}} style={{padding:"7px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>Lift ban</button></div>;})}</div>:null}</div>:null}</div>:<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"16px 14px",textAlign:"center"}}>{_memN!=null?<div><div style={{fontSize:26,fontWeight:800,color:C.text}}>{_memN}</div><div style={{fontSize:13,fontWeight:700,color:C.textSub,marginTop:2}}>{_memN===1?"member":"members"}</div></div>:null}<div style={{fontSize:12,color:C.textMuted,marginTop:8,lineHeight:1.45}}>{"Only members can see who’s in this group — join to see the member list."}</div></div>;
}
