import { C, gdisc, CAT } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import { setGroupVisibility, setGroupPrefs, splitTypedPlace } from "../../lib/db";
import { groupJoinLabel, groupJoinPath } from "../../lib/groupRules.js";
import DiscIcon from "./DiscIcon.tsx";
import type { GroupLinkDraft } from "./GroupCustomizeFields.tsx";
import type { Dispatch, SetStateAction } from "react";

/** A join question a group asks. */
interface GroupAboutTabQuestion { options?: string[]; [k: string]: unknown }
/** The group, as the About tab reads it. */
interface GroupAboutTabGroup {
  id: string;
  name?: string;
  blurb?: string | null;
  location: string;
  /** The catalog area it climbs from (0396), and that area's name. */
  areaId?: string | null;
  areaName?: string;
  /** The state it is filed under (0511), and its area's state when the browser placed it itself. */
  region?: string | null;
  areaRegion?: string;
  disciplines?: string[];
  kind?: string;
  policy?: string | null;
  eventPolicy?: string | null;
  invitePolicy?: string | null;
  /** Its own avatar and cover photo (0454), when it has them. */
  avatarUrl?: string;
  coverUrl?: string;
  _db?: boolean;
  joinQuestions: GroupAboutTabQuestion[];
  rules: Array<{ title?: string; details?: string | null }>;
  /** What its organizers customized (0506). */
  accent?: string;
  announcement?: string;
  welcomeText?: string;
  links?: GroupLinkDraft[];
  modTitle?: string;
}
/** The editor's draft, opened from Group settings. */
interface GroupAboutTabForm {
  editId: string;
  name: string;
  disciplines: string[];
  location: string;
  areaId: string | null;
  areaName: string;
  /** Where it climbs (0511): the picked area's state, or a typed place and its state. */
  areaRegion: string;
  placeMode: string;
  placeText: string;
  placeState: string;
  blurb: string;
  policy: string;
  eventPolicy: string;
  visibility: string;
  questions: GroupAboutTabQuestion[];
  rules: Array<{ title?: string; details?: string | null }>;
  invitePolicy: string;
  /** The group's own pictures (0454); "" for none. */
  avatarUrl: string;
  coverUrl: string;
  /** What the organizers customized (0506); "" / [] for none. */
  accent: string;
  announcement: string;
  welcomeText: string;
  links: GroupLinkDraft[];
  modTitle: string;
}
/** A live read; only the refetch this tab calls. */
interface GroupAboutTabQuery { refetch?: () => unknown }

/* _gpt==="about"? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export interface GroupAboutTabProps {
  cl: GroupAboutTabGroup;
  createdGroups: ReadonlyArray<{ id: string }>;
  /** Your notification level for a group: "off" silences its event reminders; any other value leaves them on. */
  groupNotifLevel: (groupId: string) => string;
  isMod: boolean;
  joined: boolean;
  myGroupPrefsQ: GroupAboutTabQuery;
  myGroupsQ: GroupAboutTabQuery;
  /** Which groups have their rules expanded, by group id. */
  rulesOpen: Record<string, boolean>;
  setGroupForm: Dispatch<SetStateAction<GroupAboutTabForm | null>>;
  setGroupNotifOverride: Dispatch<SetStateAction<Record<string, string>>>;
  setGroupReport: Dispatch<SetStateAction<{ groupId: string } | null>>;
  setGroupVis: Dispatch<SetStateAction<Record<string, string>>>;
  setRulesOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  showToast: (msg: string) => void;
  uid: string | null | undefined;
  /** public or private, as this group is currently set. */
  vis: string;
}

export default function GroupAboutTab({cl,createdGroups,groupNotifLevel,isMod,joined,myGroupPrefsQ,myGroupsQ,rulesOpen,setGroupForm,setGroupNotifOverride,setGroupReport,setGroupVis,setRulesOpen,showToast,uid,vis}: GroupAboutTabProps){
  return <div><div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:8}}>About this group</div>{cl.blurb?<p style={{fontSize:13.5,color:C.textSub,lineHeight:1.55,margin:"0 0 14px",whiteSpace:"pre-wrap"}}>{cl.blurb}</p>:null}<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"2px 12px",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0"}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name={vis==="private"?"lock":"globe"} size={18} color={C.textSub}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.text}}>{vis==="private"?"Private group":"Public group"}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{vis==="private"?"Hidden from search · join by invite only":"Anyone can find this group in search"}</div></div>{isMod?<button onClick={function(){const nv=vis==="private"?"public":"private";const _pv=vis;const _dbv=!!(uid&&cl._db);const _setVis=function(v: string){setGroupVis(function(p){const o: Record<string,string>={};Object.keys(p).forEach(function(k){o[k]=p[k];});o[cl.id]=v;return o;});};_setVis(nv);showToast((nv==="private"?"Group set to private":"Group set to public")+(uid?"":" on this device — sign in to keep it"));if(_dbv)setGroupVisibility(cl.id,nv).then(function(){if(myGroupsQ.refetch)myGroupsQ.refetch();}).catch(function(){_setVis(_pv);showToast("Couldn’t change that — only a group manager can. It’s back to "+(_pv==="private"?"private":"public")+".");});}} style={{flexShrink:0,padding:"7px 12px",borderRadius:9,border:"1px solid "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:12,fontWeight:700,cursor:"pointer"}}>{vis==="private"?"Make public":"Make private"}</button>:null}</div>{vis!=="private"?<div style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderTop:"1px solid "+C.borderLight}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name="user" size={18} color={C.textSub}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.text}}>Who can join</div><div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{groupJoinLabel(cl,vis,true).replace(/^✓ /,"")}</div></div></div>:null}{(cl.location||"").trim()?<div style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderTop:"1px solid "+C.borderLight}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name="pin" size={18} color={C.textSub}/></span><div style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:C.text}}>{"Based in "+cl.location.trim()}</div></div>:null}{cl.areaName?<div style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderTop:"1px solid "+C.borderLight}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name="pin" size={18} color={C.textSub}/></span><div style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:C.text}}>{"Climbs around "+cl.areaName}</div></div>:null}{gdisc(cl).length?<div style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderTop:"1px solid "+C.borderLight}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name="mountain" size={18} color={C.textSub}/></span><div style={{flex:1,minWidth:0,display:"flex",gap:6,flexWrap:"wrap"}}>{gdisc(cl).map(function(d: string){return <span key={d} style={{fontSize:12,fontWeight:700,color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:4}}>{CAT[String(d).toLowerCase()]?<DiscIcon d={String(d).toLowerCase()} size={12} color={C.textSub}/>:null}{d}</span>;})}</div></div>:null}</div>{/* THE GROUP'S LINKS (0506): its website, Instagram, a sign-up form. Only https addresses reach the database, and each opens in a new tab with no opener. */(cl.links||[]).length?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"2px 12px",marginBottom:12}}>{(cl.links||[]).map(function(l,ix){return <a key={ix} href={l.url} target="_blank" rel="noopener noreferrer nofollow" style={{display:"flex",alignItems:"center",gap:11,minHeight:44,padding:"8px 0",borderTop:ix?"1px solid "+C.borderLight:"none",color:C.blue,textDecoration:"none"}}><span style={{flexShrink:0,display:"inline-flex"}}><ActionIcon name="link" size={18} color={C.textSub}/></span><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13,fontWeight:700}}>{l.label}</span><span style={{display:"block",fontSize:11.5,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(l.url).replace(/^https:\/\//,"")}</span></span></a>;})}</div>:null}{isMod&&createdGroups.some(function(g){return g.id===cl.id;})?<button onClick={function(){setGroupForm({editId:cl.id,name:cl.name||"",avatarUrl:cl.avatarUrl||"",coverUrl:cl.coverUrl||"",accent:cl.accent||"",announcement:cl.announcement||"",welcomeText:cl.welcomeText||"",links:(cl.links||[]).map(function(l){return {label:l.label,url:l.url};}),modTitle:cl.modTitle||"",disciplines:(cl.disciplines||[]).slice(),location:cl.areaId?(cl.location||""):"",areaId:cl.areaId||null,areaName:cl.areaName||"",areaRegion:cl.areaId?(cl.areaRegion||cl.region||""):"",/* a group with no area reopens on the place it typed, so saving asks for its state */placeMode:!cl.areaId&&(cl.location||"").trim()?"custom":"",placeText:cl.areaId?"":splitTypedPlace(cl.location).place,placeState:cl.areaId?"":splitTypedPlace(cl.location).abbr,blurb:cl.blurb||"",policy:cl.policy||"open",eventPolicy:cl.eventPolicy||"anyone",visibility:vis,questions:(cl.joinQuestions||[]).map(function(q){return Object.assign({},q,{options:(q.options||[]).slice()});}),rules:(cl.rules||[]).map(function(r){return Object.assign({},r);}),invitePolicy:cl.invitePolicy||"members"});}} style={{width:"100%",marginBottom:12,padding:"10px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>Group settings</span><span style={{fontSize:12,fontWeight:600,color:C.textMuted}}>{(groupJoinPath(cl,vis)==="request"?((cl.joinQuestions||[]).length?(cl.joinQuestions.length+" question"+(cl.joinQuestions.length===1?"":"s")+" to join"):"Approval to join"):groupJoinPath(cl,vis)==="invite"?"Invite only":"Open to all")+" ›"}</span></button>:null}{(cl.rules||[]).length?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",marginBottom:12}}><button onClick={function(){setRulesOpen(function(p){const o=Object.assign({},p);o[cl.id]=!p[cl.id];return o;});}} aria-expanded={!!rulesOpen[cl.id]} style={{minHeight:44,width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",padding:0,color:C.text,fontSize:13,fontWeight:800,cursor:"pointer"}}><span>{"Group rules · "+cl.rules.length}</span><span style={{color:C.textMuted,fontSize:12,fontWeight:600}}>{rulesOpen[cl.id]?"Hide":"Read them"}</span></button>{rulesOpen[cl.id]?<ol style={{margin:"9px 0 0",paddingLeft:20}}>{cl.rules.map(function(r,ix){return <li key={ix} style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:6}}><span style={{fontWeight:700,color:C.text}}>{r.title}</span>{r.details?<div style={{fontSize:12,color:C.textMuted}}>{r.details}</div>:null}</li>;})}</ol>:null}</div>:null}{cl._db&&joined?<div style={{marginBottom:12}}><div role="group" aria-label="Event reminders from this group" style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:12,fontWeight:700,color:C.textSub,marginRight:2}}>Event reminders</span>{[["highlights","On"],["off","Off"]].map(function(o){const on=o[0]==="off"?groupNotifLevel(cl.id)==="off":groupNotifLevel(cl.id)!=="off";return <button key={o[0]} aria-pressed={on} onClick={function(){if(on)return;const prev=groupNotifLevel(cl.id);const put=function(v: string){setGroupNotifOverride(function(m){const n=Object.assign({},m);n[cl.id]=v;return n;});};put(o[0]);setGroupPrefs(cl.id,uid,{notify:o[0]}).then(function(){if(myGroupPrefsQ.refetch)myGroupPrefsQ.refetch();showToast(o[0]==="off"?"Event reminders from "+cl.name+" are off":"Event reminders from "+cl.name+" are on");}).catch(function(){put(prev);showToast("Couldn’t save that — try again.");});}} style={{flexShrink:0,padding:"6px 11px",borderRadius:14,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{o[1]}</button>;})}</div></div>:null}<div style={{marginTop:18,textAlign:"center"}}>{cl._db?<button onClick={()=>setGroupReport({groupId:cl.id})} style={{background:"none",border:"none",color:C.textMuted,fontSize:11.5,cursor:"pointer",textDecoration:"underline"}}>Report this group</button>:null}</div></div>;
}
