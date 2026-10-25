import { useState, type CSSProperties } from "react";
import { C, pubFirst, realProfileId, seedHistoryFor, shortDate } from "../../ClimbMatchCore.jsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import ActionIcon from "./ActionIcon.tsx";
import Av from "./Av.tsx";
import Chevron from "./Chevron.tsx";
import type { Tick } from "./TickList.tsx";

/** A connection as the Friends list holds it: a seed climber (integer id) or a real profile (uuid). */
export interface FeedFriend {
  id: string | number;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  vouches?: ReadonlyArray<{ from?: string | null; date?: string | null }> | null;
}
/** The climb a feed row names; the seed `ROUTES` shape or a `dbRouteToCamel` row. */
export interface FeedRoute {
  id: string | number;
  name: string;
  grade?: string | null;
}
/** A real friend's shared log, as App's `realFriendFeed` carries it. */
export interface RealLog {
  date?: string | null;
  tickType?: string | null;
  _dbId?: string | null;
}
export interface RealFeedEntry { a: RealLog; r: FeedRoute; fr: FeedFriend }
interface FeedBase { f: FeedFriend; date?: string | null }
/** A climb a friend logged (seed history, or a real shared log with `a` and the kudos target `kt`). */
export interface SendItem extends FeedBase { type: "send"; route: FeedRoute; tickType?: string | null; from?: undefined; a?: RealLog; kt?: { userId: string | number; logId: string } | null }
/** A vouch a friend received. */
export interface VouchItem extends FeedBase { type: "vouch"; from?: string | null; route?: undefined; tickType?: undefined; a?: undefined; kt?: undefined }
export type FeedItem = SendItem | VouchItem;
export interface FriendsFeedProps {
  connections?: ReadonlyArray<FeedFriend> | null;
  realFeed?: ReadonlyArray<RealFeedEntry | null | undefined> | null;
  /** Whether you have already given kudos on a REAL log (a DB row), and the write that toggles it. */
  realKudosOn?: (it: FeedItem) => boolean;
  onRealKudos?: (it: FeedItem) => void;
  onOpenRoute: (r: FeedRoute) => void;
  onOpenProfile: (f: FeedFriend) => void;
  onKudos?: (it: FeedItem) => void;
  onMsg?: (f: FeedFriend) => void;
  onVouch?: (f: FeedFriend) => void;
  onUnvouch?: (f: FeedFriend) => void;
  hasVouched?: (id: string | number) => boolean;
}

/** FRIENDS' RECENT ACTIVITY (Crew › Friends): each connection's climbs and vouches, newest first, three at a time, with Kudos / Message / Vouch on every row. */
/* `realFeed` is App's realFriendFeed ({a,r,fr}): a REAL friend's shared logs. seedHistoryFor() is [] for them, so the feed
   used to vanish for every real account. Their kudos is a real row (realKudosOn / onRealKudos -> giveKudos), not local. */
export default function FriendsFeed({connections,realFeed,realKudosOn,onRealKudos,onOpenRoute,onOpenProfile,onKudos,onMsg,onVouch,onUnvouch,hasVouched}: FriendsFeedProps){
  const [exp,setExp]=useState(false);const [kud,setKud]=useState<Record<string, boolean>>({});
  const VB: Record<string, string>={Flash:"flashed",Onsight:"onsighted",Summit:"summited",Lead:"led",Send:"sent",Redpoint:"redpointed",Top:"topped out"};
  const items: FeedItem[]=[];
  (connections||[]).forEach(f=>{
    seedHistoryFor(f).forEach((t: Tick)=>items.push({type:"send",f:f,route:t.route,date:t.date,tickType:t.tickType}));
    (f.vouches||[]).forEach(v=>items.push({type:"vouch",f:f,from:v.from,date:v.date}));
  });
  (realFeed||[]).forEach(x=>{if(x&&x.fr&&x.r&&x.a&&x.a.date)items.push({type:"send",f:x.fr,route:x.r,date:x.a.date,tickType:x.a.tickType,a:x.a,kt:x.a._dbId?{userId:x.fr.id,logId:x.a._dbId}:null});});
  const fname=(f: FeedFriend)=>realProfileId(f.id)?pubFirst(f):String(f.name||"").split(" ")[0];
  if(!items.length)return null;
  const pd=(d?: string | null)=>{const t=Date.parse(d||"");return isNaN(t)?0:t;};
  items.sort((a,b)=>pd(b.date)-pd(a.date));
  const show=items.slice(0,exp?items.length:3);
  /* EACH ACTION ITS OWN COLOUR (owner, 2026-10-24: "all grey doesn't look good for those buttons"). Three grey outlines read as disabled. Strava's kudos and Facebook's reactions carry a colour; here Kudos is amber (the award), Message blue, Vouch green (the shield, already green once given). Not yet given: a tint of that colour with the icon in it. Given: the solid colour, so "done" still reads apart from "not yet". */
  const actSt=(col: string,bg: string,on: boolean): CSSProperties=>({minWidth:50,padding:"5px 4px",borderRadius:9,border:"1px solid "+(on?col:col+"73"),background:on?col:bg,color:on?C.bg:C.text,fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1,display:"flex",flexDirection:"column",gap:3,alignItems:"center",justifyContent:"center"});
  return <div style={{marginTop:18,marginBottom:14,paddingTop:15,borderTop:"1px solid "+C.borderLight}}><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Friends’ recent activity</div>{/* TWO TARGETS, NOT ONE -- the same split as Home's Recent friend activity (owner, 2026-10-21). The row used to open the ROUTE for a climb and the profile only for a vouch, so a friend's profile was unreachable from any climb row. Avatar + name is the profile button; the climb line is the route button. */}{show.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.card,borderRadius:12,marginBottom:7,border:`1px solid ${C.border}`}}><div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}><button onClick={()=>onOpenProfile(it.f)} aria-label={"View "+fname(it.f)+"’s profile"} style={{display:"flex",alignItems:"center",gap:8,alignSelf:"flex-start",maxWidth:"100%",minWidth:0,background:"none",border:"none",padding:0,margin:0,textAlign:"left",color:C.text,cursor:"pointer"}}><Av src={it.f.avatar} size={30}/><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fname(it.f)}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{shortDate(it.date)}</div></div></button>{it.type==="send"?<button onClick={()=>onOpenRoute(it.route)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",background:C.bg,border:"1px solid "+C.borderLight,borderRadius:8,padding:"6px 9px",textAlign:"left",color:C.text,cursor:"pointer",fontSize:12.5,lineHeight:1.4}}><span style={{flex:1,minWidth:0}}>{(VB[it.tickType||""]||"climbed").replace(/^./,c=>c.toUpperCase())+" "}<b style={{color:C.blue}}>{it.route.name}</b>{" ("+it.route.grade+")"}</span><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></button>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.4}}>{"Earned a vouch from "+(it.from||"a partner")}</div>}</div><div style={{display:"flex",gap:5,flexShrink:0}}>{(()=>{const kk=it.f.id+":"+(it.route?it.route.id:it.from)+":"+it.date;const on=it.kt?!!(realKudosOn&&realKudosOn(it)):!!kud[kk];return <button onClick={()=>{if(it.kt){if(onRealKudos)onRealKudos(it);return;}const _go=function(){setKud(k=>Object.assign({},k,{[kk]:!on}));if(!on&&onKudos)onKudos(it);};if(!on)return _go();askConfirm({title:"Take back your kudos?",confirmLabel:"Take back"}).then(function(ok){if(ok)_go();});}} aria-pressed={on} title={on?"Tap to take back your kudos":"Give kudos"} style={actSt(C.amber,C.amberBg,on)}><ActionIcon name="award" size={14} color={on?C.bg:C.amber}/>Kudos</button>;})()}<button onClick={()=>onMsg&&onMsg(it.f)} title="Message" style={actSt(C.blue,C.blueBg,false)}><ActionIcon name="chat" size={14} color={C.blue}/>Message</button>{hasVouched&&hasVouched(it.f.id)?<button onClick={()=>onUnvouch&&onUnvouch(it.f)} aria-pressed={true} title="You vouched — tap to withdraw" style={actSt(C.green,C.greenBg,true)}><ActionIcon name="shield" size={14} color={C.bg}/>Vouched</button>:<button onClick={()=>onVouch&&onVouch(it.f)} title="Vouch" style={actSt(C.green,C.greenBg,false)}><ActionIcon name="shield" size={14} color={C.green}/>Vouch</button>}</div></div>)}{items.length>3?<button onClick={()=>setExp(!exp)} style={{width:"100%",padding:"7px",background:"none",border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{exp?"Show less ":("Show all "+items.length+" ")}<Chevron inline open={exp} size={13} color={C.blue}/></button>:null}</div>;
}
