import { FONT_DISPLAY } from "../../lib/fonts.js";
import { tx } from "../../lib/tapWords.js";
import { useState, type CSSProperties } from "react";
import { C, ago, pubFirst, realProfileId, seedHistoryFor, shortDate } from "../../ClimbMatchCore.jsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import ActionIcon from "./ActionIcon.tsx";
import Av from "./Av.tsx";
import Chevron from "./Chevron.tsx";
import ListPage, { ListPageEmpty } from "./ListPage.tsx";
import type { Tick } from "./TickList.tsx";
import { feedVerbCap } from "../../lib/feedVerb.js";
import { withProtection } from "../../lib/grade";

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
  /** A conditions-only report: the friend was there and did not climb it. */
  scoutOnly?: boolean | null;
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

/** FRIENDS' RECENT ACTIVITY (Crew › Friends): each connection's climbs and vouches, newest first, three at a time; each a card with Kudos / Message / Vouch along its bottom. */
/* `realFeed` is App's realFriendFeed ({a,r,fr}): a REAL friend's shared logs. seedHistoryFor() is [] for them, so the feed
   used to vanish for every real account. Their kudos is a real row (realKudosOn / onRealKudos -> giveKudos), not local. */
export default function FriendsFeed({connections,realFeed,realKudosOn,onRealKudos,onOpenRoute,onOpenProfile,onKudos,onMsg,onVouch,onUnvouch,hasVouched}: FriendsFeedProps){
  const [exp,setExp]=useState(false);const [q,setQ]=useState("");const [kind,setKind]=useState("all");const [order,setOrder]=useState("new");const [kud,setKud]=useState<Record<string, boolean>>({});
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
  const show=items.slice(0,3);
  /* EACH ACTION ITS OWN COLOUR (owner, 2026-10-24: "all grey doesn't look good for those buttons"). Three grey outlines read as disabled. Strava's kudos and Facebook's reactions carry a colour; here Kudos is amber (the award), Message blue, Vouch green (the shield). Not yet given: a tint of that colour with the icon in it. Given: the solid colour with a check, so "done" still reads apart from "not yet". */
  const actSt=(col: string,bg: string,on: boolean): CSSProperties=>({flex:1,minWidth:0,minHeight:36,padding:"7px 4px",borderRadius:8,border:"1px solid "+(on?col:col+"73"),background:on?col:bg,color:on?C.bg:C.text,fontSize:11.5,fontWeight:700,cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5});
  /* WHEN, as Strava's feed prints it: "today" or "3d ago" for this week, then the date in the climber's own format. */
  const when=(d?: string | null)=>{const t=Date.parse(d||"");if(isNaN(t))return shortDate(d);return Date.now()-t<7*86400000?ago(d):shortDate(d);};
  /* ONE CARD, THREE BANDS (owner note 2026-11-25: "Update ui on your friends list for FRIENDS' RECENT ACTIVITY"). The three buttons used to stand in a column on the right of every row, taking ~45% of a 390px phone, so a climb's name wrapped onto three lines beside them ("Henry's / Fork Route (Class / 2+)"). Strava's and Facebook's feed card, and Home's Recent friend activity here: who and when on top, the activity across the full width, the actions in a bar along the bottom. A row is the same on the tab and on the All activity page. Opening a profile, a climb or a chat leaves the page first: each lands under it otherwise. */
  const row=(it: FeedItem,i: number)=><div key={i} style={{display:"flex",flexDirection:"column",gap:9,padding:"10px 11px",background:C.card,borderRadius:12,marginBottom:7,border:`1px solid ${C.border}`}}><button onClick={()=>{setExp(false);onOpenProfile(it.f);}} aria-label={"View "+fname(it.f)+"’s profile"} style={{display:"flex",alignItems:"center",gap:10,alignSelf:"flex-start",maxWidth:"100%",minWidth:0,background:"none",border:"none",padding:0,margin:0,textAlign:"left",color:C.text,cursor:"pointer"}}><Av src={it.f.avatar} size={34}/><div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,overflowWrap:"anywhere"}}>{fname(it.f)}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{when(it.date)}</div></div></button>{it.type==="send"?<button onClick={()=>{setExp(false);onOpenRoute(it.route);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",minHeight:36,background:"none",border:"none",borderTop:"1px solid "+C.borderLight,padding:"8px 0 0",textAlign:"left",color:C.text,cursor:"pointer",fontSize:13,lineHeight:1.4}}><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}>{feedVerbCap({tickType:it.tickType,scoutOnly:it.a&&it.a.scoutOnly})+" "}<b style={{color:C.blue}}>{it.route.name}</b>{/* a catalog climb may have no grade on record: print none, not "(null)" */it.route.grade?<span style={{color:C.textSub}}>{" · "+withProtection(it.route.grade,it.route)}</span>:null}</span><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></button>:<div style={{display:"flex",alignItems:"center",gap:8,borderTop:"1px solid "+C.borderLight,padding:"8px 0 0",fontSize:13,color:C.text,lineHeight:1.4}}><ActionIcon name="shield" size={14} color={C.green}/><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}>{"Earned a vouch from "}<b>{it.from||"a partner"}</b></span></div>}<div style={{display:"flex",gap:7}}>{(()=>{const kk=it.f.id+":"+(it.route?it.route.id:it.from)+":"+it.date;const on=it.kt?!!(realKudosOn&&realKudosOn(it)):!!kud[kk];return <button onClick={()=>{if(it.kt){if(onRealKudos)onRealKudos(it);return;}const _go=function(){setKud(k=>Object.assign({},k,{[kk]:!on}));if(!on&&onKudos)onKudos(it);};if(!on)return _go();askConfirm({title:"Take back your kudos?",confirmLabel:"Take back"}).then(function(ok){if(ok)_go();});}} aria-pressed={on} title={on?tx("Tap to take back your kudos"):"Give kudos"} className={on?"cm-pop":undefined} style={actSt(C.amber,C.amberBg,on)}><ActionIcon name={on?"check":"award"} size={13} color={on?C.bg:C.amber}/>Kudos</button>;})()}<button onClick={()=>{setExp(false);if(onMsg)onMsg(it.f);}} title="Message" style={actSt(C.blue,C.blueBg,false)}><ActionIcon name="chat" size={13} color={C.blue}/>Message</button>{hasVouched&&hasVouched(it.f.id)?<button onClick={()=>onUnvouch&&onUnvouch(it.f)} aria-pressed={true} title={tx("You vouched — tap to withdraw")} style={actSt(C.green,C.greenBg,true)}><ActionIcon name="check" size={13} color={C.bg}/>Vouched</button>:<button onClick={()=>onVouch&&onVouch(it.f)} title="Vouch" style={actSt(C.green,C.greenBg,false)}><ActionIcon name="shield" size={13} color={C.green}/>Vouch</button>}</div></div>;
  /* ALL ACTIVITY IS A PAGE (owner 2026-11-19): "Show all N" unfolded every row in place, with nothing to find one by. */
  const ql=q.trim().toLowerCase();
  const pageRows=items.filter(it=>(kind==="all"||it.type===kind)&&(!ql||(fname(it.f)+" "+(it.route?it.route.name:"")+" "+(it.from||"")).toLowerCase().includes(ql)));
  if(order==="old")pageRows.reverse();
  return <div style={{marginTop:18,marginBottom:14,paddingTop:15,borderTop:"1px solid "+C.borderLight}}><div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:9}}><div style={{fontFamily:FONT_DISPLAY,fontSize:18,lineHeight:1.15,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:0.7}}>Friends’ recent activity</div>{/* the count, as the two sections above it carry theirs ("1 to add", "8 suggested") */}<span style={{fontSize:12,color:C.textMuted,whiteSpace:"nowrap"}}>{items.length+" update"+(items.length===1?"":"s")}</span></div>{/* TWO TARGETS, NOT ONE -- the same split as Home's Recent friend activity (owner, 2026-10-21). The row used to open the ROUTE for a climb and the profile only for a vouch, so a friend's profile was unreachable from any climb row. Avatar + name is the profile button; the climb line is the route button. */}{show.map(row)}{items.length>3?<button type="button" aria-haspopup="dialog" onClick={()=>setExp(true)} style={{width:"100%",minHeight:44,marginTop:3,padding:"9px",background:C.card,border:"1px solid "+C.border,borderRadius:10,color:C.blue,fontSize:13,fontWeight:600,cursor:"pointer"}}>{"See all "+items.length+" updates →"}</button>:null}{exp?<ListPage title={"Friends’ activity ("+items.length+")"} onClose={()=>setExp(false)} search={{value:q,onChange:setQ,label:"Search friends’ activity",placeholder:"Search by friend or climb"}} sort={{value:order,onChange:setOrder,label:"Sort activity",options:[["new","Newest first"],["old","Oldest first"]]}} filter={{value:kind,onChange:setKind,label:"Show",options:[["all","All"],["send","Climbs"],["vouch","Vouches"]]}}>{pageRows.map(row)}{!pageRows.length?<ListPageEmpty>No activity matches.</ListPageEmpty>:null}</ListPage>:null}</div>;
}
