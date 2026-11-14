import { uImp, wpPlaced, wpType, C, ROUTE_GAP } from "../../ClimbMatchCore.jsx";
import { _shortDist } from "../../lib/shortDist.js";
import { useState, useRef, useCallback, useEffect } from "react";
import { USE_DB } from "../../lib/supabase";
import { pendingBaseCheckins, savePendingBaseCheckins, acquireBaseFix, distM, baseCheckinMessage, headingFromOrientation, smoothHeading, baseGuide, relativeBearing, bearingDeg, BASE_CONFIRM_MIN, turnWord } from "../../lib/baseCheckin";
import { checkInAtRouteBase, withdrawBaseCheckin } from "../../lib/db";
import { EMPTY_ARR } from "../../lib/emptyArr.js";
import { declinationDeg } from "../../lib/declination";
import CardHead from "./CardHead.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { BTN } from "../../lib/buttonStyles.js";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";

/** One clustered spot climbers checked in at (route_base_spots): never who, never when. */
interface BaseSpot {
  lat: number;
  lng: number;
  /** How many climbers stood there. */
  n: number;
  /** The signed-in climber is one of them. */
  mine?: boolean;
  /** Enough climbers agree for the spot to become the route's Base pin. */
  confirmed?: boolean;
}
type Coord = number | string | null | undefined;
interface CheckinState {
  phase: string;
  late?: boolean;
  res?: unknown;
  withdraw?: boolean;
}
interface Guide {
  phase?: string;
  err?: string;
  fix?: {lat: number; lng: number; accuracy: number};
}
interface Compass {
  err?: string;
  waiting?: boolean;
  heading?: number;
  acc?: number;
}

export interface BaseCheckinPanelProps {
  /** The route; reads its id, placed waypoints, location note and the area's coordinate. */
  route: {
    id: string;
    _dbArea?: {lat?: Coord; lng?: Coord; areaType?: string | null} | null;
    waypoints?: {lat: number | string; lng: number | string; type?: string | null}[] | null;
    location?: string | null;
  };
  /** The signed-in climber's id; none means check-in is not offered. */
  who?: string | null;
  /** The clustered check-in spots, read once by RouteDetail and shared with the map. */
  spots?: BaseSpot[] | null;
  /** The query behind `spots`. */
  q: {refetch?: (() => unknown) | null; isError?: boolean; isPending?: boolean};
}

/* A distance in the climber's units, switching to mi/km past a kilometre so "1,998 m" reads as "1.2 mi". */
function _baseDist(m: number){return m>=1000?(uImp()?((m/1609.34).toFixed(1)+" mi"):((m/1000).toFixed(1)+" km")):_shortDist(m);}
/* A request that never reached the server — the one failure worth keeping on the phone for later. */
function _isNoSignal(e: {message?: string} | null | undefined){if(typeof navigator!=="undefined"&&navigator.onLine===false)return true;const m=String((e&&e.message)||e||"");return /failed to fetch|network|load failed|fetch failed/i.test(m);}
/* "I'm at the base" (0188). The phone judges whether its own GPS fix is good, steady and still; the
   DATABASE judges whether that point is at this climb, because a rule the browser applies can be
   skipped by a crafted request. So the screen reports the server's answer, never its own guess.
   Other climbers see each checked-in spot and how many climbers stood there — never who, never when.
   ONE CONSENSUS, THE DATABASE'S (0363 route_base_spots): the spots arrive already clustered, the
   top one CONFIRMED once BASE_CONFIRM_MIN climbers agree and are a majority, and a confirmed spot
   becomes the route's own Base pin — so the map, this card, the waypoint list and the GPX all read
   the same start. An unconfirmed spot is shown as what it is and never outranks the recorded pin.
   It sits UNDER THE ROUTE MAP, which draws the same spots (GPXMap's baseSpots); `q` and `spots` are
   read once by RouteDetail and handed to both, so the map and this card cannot disagree.
   FIND THE BASE: a live distance and compass direction from the phone to the best-known start — a
   confirmed spot, else the Base pin the route records, else a spot not yet confirmed. Inside GPS error it
   stops pointing and shows the route's own LOCATION note (0243), because that, not GPS, is what tells
   two neighbouring lines apart.
   Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function BaseCheckinPanel({route,who,spots,q}: BaseCheckinPanelProps){
  const [st,setSt]=useState<CheckinState>({phase:"idle"});const [prog,setProg]=useState<{good:number}|null>(null);
  const [guide,setGuide]=useState<Guide|null>(null);const guideRef=useRef<number|null>(null);
  const stopGuide=useCallback(function(){if(guideRef.current!=null){try{navigator.geolocation.clearWatch(guideRef.current);}catch(e){/* nothing to clear */}guideRef.current=null;}},[]);
  /* POINT THE WAY: the phone's compass, corrected from magnetic to TRUE north by the declination at the base (lib/declination.js), turns an arrow toward the start. */
  const [compass,setCompass]=useState<Compass|null>(null);const compassRef=useRef<{type:string;fn:(ev: Event)=>void;timer:ReturnType<typeof setTimeout>}|null>(null);
  const stopCompass=useCallback(function(){const c=compassRef.current;if(c){try{window.removeEventListener(c.type,c.fn);}catch(e){/* nothing to remove */}clearTimeout(c.timer);compassRef.current=null;}},[]);
  useEffect(function(){return function(){stopGuide();stopCompass();};},[stopGuide,stopCompass]);
  useEffect(function(){stopGuide();setGuide(null);stopCompass();setCompass(null);},[route.id,stopGuide,stopCompass]);
  const area=route._dbArea||{};
  const baseWp=(route.waypoints||[]).find(function(w){return wpPlaced(w)&&wpType(w)==="Base";});
  const hasAnchor=(area.lat!=null&&area.lng!=null&&Number.isFinite(+area.lat)&&Number.isFinite(+area.lng))||!!baseWp;
  /* Check-ins taken with no signal wait on this phone. Send them whenever this panel mounts with a
     connection or the browser comes back online; the server still judges each one. */
  const refetch=q.refetch;
  const flush=useCallback(function(){if(!who||!USE_DB)return;const list=pendingBaseCheckins(who);if(!list.length)return;const keep: {routeId: string; fix: unknown}[]=[];let chain=Promise.resolve();list.forEach(function(p){chain=chain.then(function(){return checkInAtRouteBase(p.routeId,p.fix).then(function(res){if(p.routeId===route.id)setSt(res.ok?{phase:"done",late:true}:{phase:"refused",res:res});}).catch(function(e){if(_isNoSignal(e))keep.push(p);});});});chain.then(function(){savePendingBaseCheckins(who,keep);if(refetch)refetch();});},[who,route.id,refetch]);
  useEffect(function(){flush();if(typeof window==="undefined")return;window.addEventListener("online",flush);return function(){window.removeEventListener("online",flush);};},[flush]);
  if(!USE_DB)return null;
  const clusters=spots||EMPTY_ARR;const mineAny=clusters.some(function(p){return p.mine===true;});
  if(!hasAnchor&&!clusters.length)return null;
  const go=function(){if(!who||st.phase==="locating"||st.phase==="sending")return;setSt({phase:"locating"});setProg(null);
    acquireBaseFix(typeof navigator!=="undefined"?navigator.geolocation:null,{onProgress:setProg}).then(function(fix){
      if(!fix.ok){setSt({phase:"refused",res:fix});return;}
      setSt({phase:"sending"});
      checkInAtRouteBase(route.id,fix).then(function(res){setSt(res.ok?{phase:"done"}:{phase:"refused",res:res});if(res.ok&&refetch)refetch();}).catch(function(e){
        if(_isNoSignal(e)){const list=pendingBaseCheckins(who).filter(function(p){return p.routeId!==route.id;}).concat([{routeId:route.id,fix:fix}]);setSt(savePendingBaseCheckins(who,list)?{phase:"queued"}:{phase:"error"});}
        else setSt({phase:"error"});});});};
  const withdraw=function(){if(!who)return;setSt({phase:"withdrawing"});withdrawBaseCheckin(who,route.id).then(function(){setSt({phase:"idle"});if(refetch)refetch();}).catch(function(){setSt({phase:"error",withdraw:true});});};
  const busy=st.phase==="locating"||st.phase==="sending"||st.phase==="withdrawing";
  const top=clusters[0];const confirmed=!!(top&&top.confirmed);
  /* Held (0363): a confirmed spot more than 200 m from the recorded pin is a different place, not a correction, so the pin waits for a review. */
  const pinGap=confirmed&&baseWp?distM(top,{lat:+baseWp.lat,lng:+baseWp.lng}):null;const held=pinGap!=null&&pinGap>200;
  const target=confirmed?{lat:top.lat,lng:top.lng,what:"the spot "+top.n+" climbers confirmed on-site"}:baseWp?{lat:+baseWp.lat,lng:+baseWp.lng,what:"the start this route records"}:top?{lat:top.lat,lng:top.lng,what:"the spot "+(top.n===1?"one climber":top.n+" climbers")+" checked in at — not confirmed yet"}
    /* Last, a CRAG's own coordinate: a base pin on a crag sits 0–1 m from it (measured for 0188), so it
       gets a climber to the wall. Never a PEAK's — that is the summit, kilometres from any start. */
    :(area.areaType==="crag"&&Number.isFinite(+(area.lat as number))&&Number.isFinite(+(area.lng as number))&&area.lat!=null&&area.lng!=null)?{lat:+(area.lat as number),lng:+(area.lng as number),what:"the crag’s location on file, not this climb’s own start — nobody has marked that yet"}:null;
  const startGuide=function(){if(!target)return;const geo=typeof navigator!=="undefined"?navigator.geolocation:null;if(!geo||!geo.watchPosition){setGuide({err:baseCheckinMessage({reason:"unsupported"},_baseDist)});return;}
    stopGuide();setGuide({phase:"locating"});
    guideRef.current=geo.watchPosition(function(pos){const c=pos.coords||{};setGuide({fix:{lat:c.latitude,lng:c.longitude,accuracy:c.accuracy}});},
      function(err){if(err&&err.code===1){stopGuide();setGuide({err:baseCheckinMessage({reason:"denied"},_baseDist)});}else setGuide(function(g){return g&&g.fix?g:{err:baseCheckinMessage({reason:"unavailable"},_baseDist)};});},
      {enableHighAccuracy:true,maximumAge:0,timeout:30000});};
  /* iOS (and Chrome since 151) hand out orientation only after a permission asked from a tap, so this runs from the button. A reading that is not north-referenced is ignored (headingFromOrientation), and a phone that gives none in 4 s is told so. */
  const startCompass=function(){if(!target||typeof window==="undefined")return;const DOE=window.DeviceOrientationEvent as (typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<string>})|undefined;if(!DOE){setCompass({err:"This browser can’t read a compass. Use the direction above."});return;}
    const decl=declinationDeg(target.lat,target.lng);
    const listen=function(){stopCompass();const type="ondeviceorientationabsolute" in window?"deviceorientationabsolute":"deviceorientation";
      const angle=function(){const o=window.screen&&window.screen.orientation;return o&&Number.isFinite(o.angle)?o.angle:0;};
      const fn=function(ev: Event){const h=headingFromOrientation(ev,angle(),decl);if(!h)return;setCompass(function(c){const prev=c&&Number.isFinite(c.heading)?c.heading:null;const next=smoothHeading(prev,h.heading);return prev!=null&&Math.abs(((next-prev+540)%360)-180)<1.5&&(c as Compass).acc===h.accuracy?c:{heading:next,acc:h.accuracy};});};
      const timer=setTimeout(function(){setCompass(function(c){return c&&Number.isFinite(c.heading)?c:{err:"This phone isn’t giving a compass reading. Use the direction above."};});},4000);
      window.addEventListener(type,fn);compassRef.current={type:type,fn:fn,timer:timer};setCompass({waiting:true});};
    if(typeof DOE.requestPermission==="function")DOE.requestPermission().then(function(r: string){if(r==="granted")listen();else setCompass({err:"Compass access is off for this site. Allow motion and orientation in your browser settings to use it."});}).catch(function(){setCompass({err:"Couldn’t turn the compass on. Use the direction above."});});
    else listen();};
  const g=guide&&guide.fix&&target?baseGuide(guide.fix,target,_baseDist):null;
  const rel=g&&!g.arrived&&compass&&Number.isFinite(compass.heading)?relativeBearing(bearingDeg((guide as Guide).fix,target),compass.heading):null;
  const locNote=String(route.location||"").trim();
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:ROUTE_GAP,marginBottom:12}}>
    <CardHead style={{marginBottom:8}}>BASE OF THE CLIMB</CardHead>
    {q.isError?<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>Couldn’t load check-ins at the base — try again in a moment.</div>
    :top?<div style={{marginBottom:9}}>
      <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:3}}>{top.lat.toFixed(5)+", "+top.lng.toFixed(5)}</div>
      <div style={{fontSize:12,color:confirmed?C.green:C.textSub,fontWeight:confirmed?600:400,marginBottom:3}}>{(confirmed?"✓ Confirmed on-site by ":"Checked in on-site by ")+top.n+" climber"+(top.n!==1?"s":"")+(top.mine?", including you":"")+(clusters.length>1?" · "+(clusters.length-1)+" other spot"+(clusters.length-1!==1?"s":"")+" reported":"")}</div>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:5}}>{confirmed?(held?"That is "+_baseDist(Math.round(pinGap))+" from the start this route records, so ClimbMatch checks it before the Base pin moves.":"The route’s Base pin on the map follows this spot."):(baseWp?"The Base pin on the map is still the start this route records. ":"")+"A spot becomes this route’s Base pin once "+BASE_CONFIRM_MIN+" climbers check in within 25 m of each other and are most of those who checked in."}</div>
      <a href={"https://www.google.com/maps/search/?api=1&query="+top.lat.toFixed(6)+","+top.lng.toFixed(6)} target="_blank" rel="noopener noreferrer" style={{fontSize:12.5,color:C.blue,fontWeight:600,textDecoration:"none"}}>Open the base in maps ›</a>
    </div>
    :q.isPending?<LoadingRows C={C} label="Loading check-ins…" style={{marginBottom:8}}/>
    :<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{baseWp?"Nobody has checked in at the base yet — the Base pin on the map is where this route records its start.":"Nobody has checked in at the base yet."}</div>}
    {target?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 11px",marginBottom:10}}>
      {!guide?<button onClick={startGuide} style={{...BTN,width:"100%",background:C.blueBg,color:"#fff",border:`1px solid ${C.blueDim}`}}>How far am I from the base?</button>
      :<div><div role="status" aria-live="polite">
        <div style={{fontSize:13,color:guide.err?C.amber:g&&g.arrived?C.green:C.text,fontWeight:600,lineHeight:1.45}}>{guide.err?guide.err:g?g.line:"Finding you — this works best out in the open…"}</div>
        {g?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:3}}>{"Measured to "+target.what+". Updates as you walk."}</div>:null}
        {g&&locNote&&g.d<=100?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginTop:6}}><span style={{fontWeight:700,color:C.text}}>Where it starts: </span>{locNote}</div>:null}
        </div>
        {/* Outside the live region: the arrow's words change with every turn of the phone, and announcing each would drown out the distance. */}
        {g&&!g.arrived?(!compass?<button onClick={startCompass} style={{...BTN,width:"100%",marginTop:8,background:"transparent",color:C.blue,border:`1px solid ${C.blueDim}`}}>Point the way with your compass</button>
          :compass.err?<div style={{fontSize:12,color:C.amber,lineHeight:1.45,marginTop:6}}>{compass.err}</div>
          :rel!=null?<div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" style={{flexShrink:0}}><circle cx="22" cy="22" r="20" fill="none" stroke={C.border} strokeWidth="2"/><path d="M22 5 L31 31 L22 25 L13 31 Z" fill={C.blue} transform={"rotate("+rel.toFixed(1)+" 22 22)"}/></svg>
            <div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{turnWord(rel)}</div>
              <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:2}}>{"Hold your phone flat in front of you. Metal gear and the rock itself can pull a compass off"+(Number.isFinite(compass.acc)&&(compass.acc as number)>25?" — it is unsure right now (±"+Math.round(compass.acc as number)+"°); move the phone in a figure eight to recalibrate":"")+"."}</div></div>
          </div>
          :<div style={{fontSize:12,color:C.textSub,marginTop:6}}>Waiting for the compass…</div>):null}
        <button onClick={function(){stopGuide();setGuide(null);stopCompass();setCompass(null);}} style={{marginTop:7,padding:0,background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Stop</button>
      </div>}
    </div>:null}
    {st.phase==="done"?<div role="status" style={{fontSize:12.5,color:C.green,fontWeight:600,marginBottom:8}}>{st.late?"✓ Your saved check-in was sent and accepted — thanks for marking the start.":"✓ You’re checked in at the base — thanks for marking the start for the next party."}</div>
    :st.phase==="refused"?<div role="status" style={{fontSize:12.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{baseCheckinMessage(st.res,_baseDist)}</div>
    :st.phase==="queued"?<div role="status" style={{fontSize:12.5,color:C.textSub,lineHeight:1.45,marginBottom:8}}>No signal here — your GPS reading is saved on this phone and will be sent, and checked, the next time you open this climb with a connection.</div>
    :st.phase==="error"?<div role="status" style={{fontSize:12.5,color:C.red,marginBottom:8}}>{st.withdraw?"Couldn’t remove your check-in — try again.":"Couldn’t check you in — try again."}</div>
    :st.phase==="locating"?<div role="status" style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Getting a steady GPS fix — stand still"+(prog?" ("+prog.good+" good reading"+(prog.good!==1?"s":"")+")":"")+"…"}</div>
    :st.phase==="sending"?<div role="status" style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>Checking your position against this climb…</div>:null}
    {who?<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button onClick={go} disabled={busy} aria-busy={busy?"true":undefined} style={{padding:"8px 12px",background:busy?C.border:C.blueSolid,color:C.onSolid,border:"none",borderRadius:9,fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{mineAny?"I’m at the base — check in again":"I’m at the base — check in"}</button>
      {mineAny?<button onClick={function(){askConfirm({title:"Remove your check-in?",body:"Checking in again means being back at the base of the climb.",confirmLabel:"Remove check-in"}).then(function(ok){if(ok)withdraw();});}} disabled={busy} style={{padding:"8px 12px",background:C.surface,color:C.textSub,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:busy?"default":"pointer"}}>Remove my check-in</button>:null}
    </div>:<div style={{fontSize:12,color:C.textMuted}}>Sign in to check in when you’re standing at the start of the climb.</div>}
    {who?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:8}}>Uses your phone’s GPS, and only works at the start of the climb: your position is checked against where this climb is on file. Other climbers see the spot and how many climbers stood there — never who, or when.</div>:null}
  </div>;
}
