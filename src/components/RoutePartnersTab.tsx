import { tx } from "../../lib/tapWords.js";
import { OPEN_CREWS, C, CLIMBERS, FALLBACK_AV, pubName, DLOCALE, CAT, RSL as SL, catOf, agreedDate } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import ListPage from "./ListPage.tsx";
import { useState } from "react";
import Av from "./Av.tsx";
import { USE_DB } from "../../lib/supabase";
import { BTN, BTN_SECONDARY } from "../../lib/buttonStyles.js";
import { useReliabilityOf, usePartnerSignals, usePartnerCounts, usePartnerClimbGrades, useVerifiedUsers, usePartnerAreasOfUsers, usePartnerFreeUntil } from "../../lib/db.js";
import RealClimberRow from "./RealClimberRow.tsx";
import EmptyState from "./EmptyState.tsx";
import ListMeOnRouteBox, { routeListingWindow } from "./ListMeOnRouteBox.tsx";
import type { MyRouteListing } from "./ListMeOnRouteBox.tsx";
import type { Dispatch, SetStateAction } from "react";
import type { PartnerRow, RealClimberRowProps, ReliabilityRecord } from "./RealClimberRow.tsx";

/** Anyone the buttons act on: an example climber or a real profile projected to the same shape. */
interface PartnersTabPerson { id: string | number }
/** An example climber, as the match cards read one. */
type PartnersTabSeed = (typeof CLIMBERS)[number];
/** A live read, as the hooks hand it back; only the flags and rows this tab reads. */
interface PartnersTabQuery<T> { data?: T | null; isLoading?: boolean; isError?: boolean; error?: unknown }
/** An open crew, from the demo list or the database. */
interface PartnersTabCrew {
  id: string | number;
  routeId?: string | number | null;
  areaId?: string | null;
  spots: number;
  date?: string | null;
  organizer?: string | number | null;
  discipline: string;
  /** The organiser's real profile, when the crew is stored. */
  _org?: { name: string; avatar?: string | null } | null;
}
/** One of the climber's OWN active crews on this route or at its crag. */
interface PartnersTabMyCrew { id: string | number; routeId?: string | number | null; areaId?: string | null; discipline?: string | null; dates?: string[] | null }

export interface RoutePartnersTabProps {
  /** The climber has listed themselves at this crag. */
  _listedHere: boolean;
  /** The listed climbers at the crag. */
  _raRes: PartnersTabQuery<PartnerRow[]>;
  /** Their match objectives, keyed by climber id. */
  _rpObj: PartnersTabQuery<Record<string, string[]>>;
  /** The climbers who saved this route. */
  _rpRes: PartnersTabQuery<PartnerRow[]>;
  areaPartners: PartnerRow[];
  cragOnly?: boolean;
  crewsExpand: boolean;
  dbCrews?: PartnersTabCrew[] | null;
  /** "friends", "in", "out" or none, for a climber id. */
  friendState: (id: string | number) => string | null | undefined;
  mtn: { name?: string | null };
  onConnect: (c: PartnersTabPerson) => void;
  onFindPartners?: (() => void) | null;
  onFindPartnersInArea?: ((area: { id: string | undefined; name: string; areaType?: string }) => void) | null;
  onListMe?: ((listing: { areaId: string | undefined; name: string; areaType?: string; disciplines: string[] }) => void) | null;
  onPlan: (c: PartnersTabPerson) => void;
  /** Opens a climber's résumé (the card's climbs chip); only offered when their résumé is public. */
  onResume?: ((c: unknown) => void) | null;
  onRequestJoin?: ((crewId: string | number, name: string) => void) | null;
  onViewProfile: RealClimberRowProps["onOpen"] & ((c: PartnersTabPerson) => void);
  /** Example climbers who marked this route as an objective. */
  partners: ReadonlyArray<PartnersTabSeed>;
  partnersExpand: boolean;
  realPartners: PartnerRow[];
  /** Ids of the crews the climber has asked to join. */
  requested?: ReadonlyArray<string | number> | null;
  route: { id: string; name: string; mountainId?: string; _dbArea?: { areaType?: string } | null };
  /** The sentence about how many listed climbers are saved offline, or "". */
  savedNote: (listed: number) => string;
  setCrewsExpand: Dispatch<SetStateAction<boolean>>;
  setPartnersExpand: Dispatch<SetStateAction<boolean>>;
  who?: string | number | null;
  /** "route", "climb", "hike": the page's noun for this route. */
  noun: string;
  /** The open-crews read failed: the section must not say no crew is forming. */
  crewsUnavailable?: boolean;
  /** The climber's own active crews on this route or at its crag, listed first under Current crews. */
  myCrewsHere?: ReadonlyArray<PartnersTabMyCrew> | null;
  onOpenCrew?: ((crewId: string | number) => void) | null;
  /** Start a crew for THIS route, listed so others can ask to join. Null when signed out. */
  onStartCrew?: (() => void) | null;
  /** Start a session at this route's crag, with these climbers invited. Null when the place cannot hold an area crew. */
  onStartSession?: ((partners: PartnersTabPerson[]) => void) | null;
  /** The climber's own route listings (0489), their read's failure, and profiles.discoverable. */
  myRouteListings?: MyRouteListing[] | null;
  routeListingsError?: boolean;
  routeListingsLoading?: boolean;
  discoverable?: boolean;
  onOpenPrivacy?: (() => void) | null;
  notify?: (msg: string) => void;
}

/* tab==="partners"? — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
/* A crew whose day has passed is not forming: Join a crew drops it (CrewFinder, the same test), and this tab
   offered "2 spots open · Sep 12" on Baker's North Ridge in November (partner walk, 2026-11-18). An undated crew stays. */
function upcoming(oc: { date?: string | null }): boolean { if (!oc.date) return true; const t0 = new Date(); t0.setHours(0, 0, 0, 0); return new Date(oc.date + "T12:00:00") >= t0; }

export default function RoutePartnersTab({_listedHere,_raRes,_rpObj,_rpRes,areaPartners,cragOnly,crewsExpand,dbCrews,friendState,mtn,onConnect,onFindPartners,onFindPartnersInArea,onListMe,onPlan,onRequestJoin,onResume,onViewProfile,partners,partnersExpand,realPartners,requested,route,savedNote,setCrewsExpand,setPartnersExpand,who,noun,crewsUnavailable,myCrewsHere,onOpenCrew,onStartCrew,onStartSession,myRouteListings,routeListingsError,routeListingsLoading,discoverable,onOpenPrivacy,notify}: RoutePartnersTabProps){
  /* Level and years (partner_signals) and public climbs / vouches (partner_counts, 0460/0463) for this tab's real cards, one read each. Unknown leaves the line or chip out. */
  const [crewOrder,setCrewOrder]=useState("soon");
  const _ids=(realPartners||[]).concat(areaPartners||[]).map(function(p){return p.id;});
  const _sigQ=usePartnerSignals(_ids,USE_DB&&!!who),_ctQ=usePartnerCounts(_ids,USE_DB&&!!who),/* 0518: their reliability, half of each card's reliability term */_relQ=useReliabilityOf(_ids,USE_DB&&!!who);
  /* ONE MATCH % FROM EVERY DOOR (owner check 2026-11-18): the same card in Partners showed Avery at 70% and "Ice WI3", and here
     64% and "Ice". The partner RPCs return no climb_grades and no verification, and Partners reads both for its rows (withCg,
     rowVerQ) while this tab did not, so compat() scored her on fewer grades and without her verification. Same two reads here. */
  const _cgQ=usePartnerClimbGrades(_ids,USE_DB&&!!who),_verQ=useVerifiedUsers(USE_DB&&who?_ids:[]);
  /* ...and their LISTED AREAS and free-this-weekend date (review 2026-11-23): without the areas the match % left out the whole shared-areas term here, so the same climber scored lower on this tab than in Partners; without the date the green "free this weekend" line never showed. */
  const _arQ=usePartnerAreasOfUsers(USE_DB&&who?_ids:[]),_frQ=usePartnerFreeUntil(_ids,USE_DB&&!!who);
  const _listing=function(p: PartnerRow){return _arQ.data?((_arQ.data as Record<string,RealClimberRowProps["listing"]>)[p.id]||undefined):undefined;};
  const _withCg=function(p: PartnerRow): PartnerRow{const cg=_cgQ.data?(_cgQ.data as Record<string,unknown>)[p.id]:undefined;const fr=_frQ.data?(_frQ.data as Record<string,string|null>)[p.id]:undefined;let q=p;if(!p.climb_grades&&cg)q=Object.assign({},q,{climb_grades:cg}) as PartnerRow;if(p.free_until===undefined&&fr!==undefined)q=Object.assign({},q,{free_until:fr}) as PartnerRow;return q;};
  const _cardExtra=function(p: PartnerRow){const sg=((_sigQ.data||{}) as Record<string,{level?:string|null;since?:number|null}>)[p.id]||{};const ct=_ctQ.data?(_ctQ.data as Record<string,{climbs:number;vouches:number}>)[p.id]:undefined;const yr=sg.since?new Date().getFullYear()-sg.since:null;return {level:sg.level||null,years:yr&&yr>0?yr:null,climbs:ct?ct.climbs:undefined,vouches:ct?ct.vouches:undefined,climbsPrivate:!p.resume_public,/* The climbs chip opens their résumé here too (polish 2026-11-18), gated on resume_public like Partners. */onClimbs:(p.resume_public&&onResume)?function(x: unknown){onResume(x);}:null,onVouches:function(x: unknown){(onViewProfile as (c: unknown, tab?: string) => void)(x,"vouches");}};};
  /* SIGNED IN, THE TAB IS REAL CLIMBERS AND REAL CREWS ONLY (owner's standing rule, applied here 2026-11-23): the example
     crews and example climber cards rendered beside a real account's own data. A guest and the no-database demo keep them. */
  const signedIn=!!(USE_DB&&who);
  const _an=mtn.name||"this crag";
  const day=function(d: string){return new Date(d+"T12:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});};
  /* CURRENT CREWS (owner, 2026-11-23): ONE section, always drawn, in place of "Crews on this climb" and "Sessions at <crag>",
     which appeared only when a crew existed and left your own crews out. Yours first, then every open crew on this route and,
     on a crag route, every session at its crag. A crew whose day has passed is not forming (the `upcoming` test above). */
  const openHere=[...(signedIn?[]:(OPEN_CREWS as PartnersTabCrew[])),...(dbCrews||[])].filter(function(oc){return (oc.routeId===route.id||(!!cragOnly&&!!oc.areaId&&oc.areaId===route.mountainId))&&oc.spots>0&&upcoming(oc);});
  const mine=(myCrewsHere||[]).slice();
  const openRow=function(oc: PartnersTabCrew){const org=oc._org||CLIMBERS.find(function(c){return c.id===oc.organizer;})||{name:"Climber",avatar:FALLBACK_AV};const req=(requested||[]).includes(oc.id);const sp=oc.spots;const who1=oc._org?pubName(org):String(org.name||"Climber").split(" ")[0];return <div key={oc.id} style={crewRowBox}><Av src={org.avatar||FALLBACK_AV} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{oc.areaId?who1+"’s "+((CAT[oc.discipline]||{}).label||oc.discipline||"crag")+" session":who1+"’s crew"}</div><div style={{fontSize:12,color:C.textMuted}}>{sp+" spot"+(sp!==1?"s":"")+" open"+(oc.date?" · "+day(oc.date):"")}</div></div><button aria-pressed={req} title={req?tx("Tap to withdraw your request"):undefined} onClick={()=>onRequestJoin&&onRequestJoin(oc.id,oc.areaId?_an:route.name)} style={{flexShrink:0,minHeight:40,padding:"7px 12px",borderRadius:9,border:"1px solid "+(req?C.border:C.blueDim),background:req?C.surface:C.blueBg,color:req?C.textMuted:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{req?"✓ Requested · undo":"Request join"}</button></div>;};
  const crewRowBox={display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.borderHi,borderRadius:10,padding:"9px 11px",marginBottom:9};
  /* NO SECOND "START A CREW" FOR A CLIMB YOU ALREADY HAVE A CREW ON (review, 2026-11-23): the sheet it opens offers that one climb, greyed "Crew formed", so the button led nowhere. Your crew is the row above, with Open crew. A session at a crag can always be started. */
  const startCrew=onStartSession?function(){onStartSession([]);}:(mine.some(function(c){return !c.areaId;})?null:onStartCrew);
  const realRow=function(p: PartnerRow){return {id:p.id,name:p.name||"Climber",avatar:p.avatar||"",username:p.username||"",showName:!!p.show_name,_real:true,objectiveIds:(_rpObj.data&&_rpObj.data[p.id])||[]};};
  const crewBtn={...BTN_SECONDARY(C),minHeight:40,borderRadius:9,border:"1px solid "+C.borderHi};
  const seedCards=signedIn?[]:partners;
  const savedShown=realPartners.filter(function(p){return p.saved!==false;}).length;
  const listedHere=(myRouteListings||[]).some(function(l){return l.routeId===route.id;});
  return <div>
        <div role="region" aria-label="Current crews" style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 13px",marginBottom:12}}>
          <CardHead style={{marginBottom:5}}>Current crews</CardHead>
          <div style={{fontSize:11.5,color:C.textMuted,marginBottom:10,lineHeight:1.5}}>{cragOnly?"Crews for this climb and sessions at "+_an+". Ask to join one, or start your own.":"Crews forming for this "+noun+". Ask to join one, or start your own."}</div>
          {mine.map(function(c){const when=(agreedDate as (x: unknown) => string | null | undefined)(c)||(c.dates||[])[0]||"";return <div key={"mine-"+c.id} style={crewRowBox}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{c.areaId?"Your "+((CAT[c.discipline||""]||{}).label||"crag")+" session at "+_an:"Your crew for this "+noun}</div><div style={{fontSize:12,color:C.textMuted}}>{when?day(when):"No day picked yet"}</div></div>{onOpenCrew?<button type="button" onClick={function(){onOpenCrew(c.id);}} style={{flexShrink:0,minHeight:40,padding:"7px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>Open crew</button>:null}</div>;})}
          {openHere.slice(0,3).map(openRow)}
          {/* ALL CREWS IS A PAGE (owner 2026-11-19): it opens with a sort, soonest day first, instead of unfolding in place. */openHere.length>3?<button type="button" aria-haspopup="dialog" onClick={()=>setCrewsExpand(true)} style={{width:"100%",minHeight:44,padding:"8px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:9}}>{"All "+openHere.length+" open crews →"}</button>:null}
          {crewsExpand?<ListPage title={"Open crews here ("+openHere.length+")"} onClose={()=>setCrewsExpand(false)} sort={{value:crewOrder,onChange:setCrewOrder,label:"Sort crews",options:[["soon","Soonest day"],["spots","Most spots open"]]}}>{openHere.map((oc,ix)=>({oc,ix})).sort((x,y)=>crewOrder==="spots"?y.oc.spots-x.oc.spots||x.ix-y.ix:(x.oc.date||"9999")<(y.oc.date||"9999")?-1:(x.oc.date||"9999")>(y.oc.date||"9999")?1:x.ix-y.ix).map(x=>openRow(x.oc))}</ListPage>:null}
          {crewsUnavailable?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,padding:"2px 2px 9px"}}>Couldn’t load the crews forming here — check your connection and try again.</div>:(!mine.length&&!openHere.length?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"2px 2px 9px"}}>No crews are forming here yet.</div>:null)}
          {startCrew?<button type="button" onClick={startCrew} style={{...BTN,width:"100%",minHeight:44,background:C.blueSolid,color:C.onSolid,border:"1px solid "+C.blueSolid}}>{onStartSession?"Start a crew at "+_an:"Start a crew"}</button>:(USE_DB&&!who?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"2px"}}>Sign in to start a crew.</div>:null)}
        </div>
        {cragOnly?<div>
          {/* A CRAG route (0300): partners are the climbers listed at this crag, inside it, or across a wider area that contains it — found by AREA, never by this one route. */}
          <SL>{"Climbers at "+_an}</SL>
          {signedIn?<div style={{marginBottom:12}}><div style={{display:"flex",gap:8,marginBottom:10}}><button onClick={()=>onListMe&&onListMe({areaId:route.mountainId,name:mtn.name||"",areaType:(route._dbArea||{}).areaType,disciplines:[catOf(route)]})} aria-pressed={_listedHere} style={{...BTN,flex:1,background:_listedHere?C.greenBg:C.blueBg,color:_listedHere?C.green:"#fff",border:"1px solid "+(_listedHere?C.green:C.blueDim)}}>{_listedHere?"Listed at "+_an+" ✓ · edit":"List me at "+_an}</button><button onClick={()=>onFindPartnersInArea&&onFindPartnersInArea({id:route.mountainId,name:mtn.name||"",areaType:(route._dbArea||{}).areaType})} style={{...BTN,flex:1,background:C.surface,color:C.textSub,border:"1px solid "+C.border}}>{"See all at "+_an}</button></div>
            {_raRes.isLoading?<div style={{fontSize:12,color:C.textMuted,padding:"6px 2px"}}>{"Finding climbers at "+_an+"…"}</div>:_raRes.error?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,padding:"6px 2px"}}>Couldn’t load the climbers listed here — check your connection and try again.</div>:areaPartners.length?<div>{areaPartners.map(function(p){const c=realRow(p);/* THE ONE PARTNER CARD here too (owner 2026-11-18). A crag row had NO crew action (2026-11-23): Plan a session opens the area crew sheet with this climber invited, as Partners does. */return <RealClimberRow key={p.id} p={_withCg(p)} verified={_verQ.data?(_verQ.data as Set<string>).has(String(p.id)):undefined} reliability={_relQ.data?(_relQ.data as Record<string, ReliabilityRecord>)[String(p.id)]:undefined} objIds={_rpObj.data?_rpObj.data[p.id]:undefined} objErr={_rpObj.isError} onOpen={onViewProfile} friendState={function(id){return friendState(id)||"none";}} onConnect={function(){onConnect(c);}} listing={_listing(p)} action={onStartSession?<button type="button" onClick={()=>onStartSession([c])} style={crewBtn}>Plan a session</button>:<button type="button" onClick={()=>onPlan(c)} style={crewBtn}>Form crew</button>} {..._cardExtra(p)}/>;})}<div style={{fontSize:11.5,color:C.textMuted,marginTop:2,lineHeight:1.5}}>{"Listed at "+_an+" or an area containing it."}</div></div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px"}}>{_listedHere?"No one else is listed at "+_an+" yet.":"Nobody is listed at "+_an+" yet — list yourself and climbers searching it can find you."}</div>}
          </div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px",marginBottom:12}}>Sign in to see who climbs here, and to list yourself.</div>}
        </div>:<SL>{"Find a partner for this "+noun}</SL>}
        {(signedIn&&!cragOnly)?<div style={{marginBottom:12}}>
          <ListMeOnRouteBox routeId={route.id} noun={noun} C={C} uid={String(who)} myListings={myRouteListings} listingsError={routeListingsError} listingsLoading={routeListingsLoading} discoverable={discoverable} onOpenPrivacy={onOpenPrivacy} notify={notify}/>
          {_rpRes.isLoading?<div style={{fontSize:12,color:C.textMuted,padding:"6px 2px"}}>{"Finding climbers for this "+noun+"…"}</div>:_rpRes.error?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,padding:"6px 2px"}}>{"Couldn’t load the climbers listed for this "+noun+" — check your connection and try again."}</div>:realPartners.length?<div>{realPartners.map(function(p){/* Listed climbers come first (0489), each saying so with their dates and note; a climber who only saved the route follows, as before. Every row can be added, or a crew formed with them. */const c=realRow(p);const win=p.listed?routeListingWindow({freeFrom:p.free_from,freeTo:p.free_to}):"";return <RealClimberRow key={p.id} p={_withCg(p)} verified={_verQ.data?(_verQ.data as Set<string>).has(String(p.id)):undefined} reliability={_relQ.data?(_relQ.data as Record<string, ReliabilityRecord>)[String(p.id)]:undefined} objIds={_rpObj.data?_rpObj.data[p.id]:undefined} objErr={_rpObj.isError} onOpen={onViewProfile} friendState={function(id){return friendState(id)||"none";}} onConnect={function(){onConnect(c);}} listing={_listing(p)} tag={p.listed?"Listed for this "+noun+(win?" · f"+win.slice(1):""):"Saved this "+noun} extras={p.listed&&p.listing_note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,overflowWrap:"anywhere"}}>{"“"+p.listing_note+"”"}</div>:null} action={<button type="button" onClick={()=>onPlan(c)} style={crewBtn}>Form crew</button>} {..._cardExtra(p)}/>;})}{savedNote(savedShown).trim()?<div style={{fontSize:11.5,color:C.textMuted,marginTop:2,lineHeight:1.5}}>{savedNote(savedShown).trim()}</div>:null}</div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px"}}>{(listedHere?"No one else is listed for this "+noun+" yet.":"Nobody is listed for this "+noun+" yet — list yourself and climbers looking at it can find you.")+(savedNote(0)?" "+savedNote(0):"")}</div>}
        </div>:null}
        {(USE_DB&&!who&&!cragOnly)?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px",marginBottom:12}}>{"Sign in to see the climbers looking for a partner on this "+noun+", and to list yourself."}</div>:null}
        {seedCards.length===0?((USE_DB||cragOnly)?null:<EmptyState C={C} icon="partners">No partners listed yet for this route.</EmptyState>):(partnersExpand?seedCards:seedCards.slice(0,4)).map(c=>{/* Example climbers on the ONE partner card too (owner 2026-11-18), as on Partners. */const _cc=c as unknown as Record<string, unknown> & {id:string|number;name?:string;username?:string;showName?:boolean;avatar?:string;bio?:string;location?:string;objectiveIds?:string[];verified?:boolean;online?:boolean;level?:string;years?:number;communityVouches?:number};return <RealClimberRow key={String(c.id)} cand={_cc} p={{id:String(c.id),name:_cc.name,username:_cc.username,show_name:!!_cc.showName,avatar:_cc.avatar,bio:_cc.bio,location:_cc.location}} objIds={_cc.objectiveIds||[]} verified={!!_cc.verified} listing={null} online={_cc.online} level={_cc.level||null} years={_cc.years||null} vouches={_cc.communityVouches==null?null:_cc.communityVouches} onVouches={function(){(onViewProfile as (x: unknown, tab?: string) => void)(c,"vouches");}} onOpen={function(){onViewProfile(c);}} friendState={function(id){return friendState(id)||"none";}} onConnect={function(){onConnect(c);}} action={<button type="button" onClick={()=>onPlan(c)} style={crewBtn}>Form crew</button>}/>;})}
        {seedCards.length>4?<button onClick={()=>setPartnersExpand(v=>!v)} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{partnersExpand?"Show fewer":"See "+(seedCards.length-4)+" more partner"+(seedCards.length-4!==1?"s":"")}</button>:null}
        {/* On a crag route a signed-in climber already has "See all at <crag>"; this one opened the finder on the climb, which offers only a button to that same search. */onFindPartners&&!(cragOnly&&USE_DB&&who)?<button onClick={onFindPartners} style={{...BTN,width:"100%",marginTop:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>{"Explore all partners in the finder ›"}</button>:null}
      </div>;
}
