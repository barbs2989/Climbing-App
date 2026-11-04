import { C, catOf, ROUTE_GAP, DLOCALE, uTemp, uPrecip, uWind, RSL as SL, uTempN, uWindN, uImp } from "../../ClimbMatchCore.jsx";
import { CRAG_SCORE_DISCIPLINES, OPEN_DAY, scoreForecast, starsLabel, FACTOR_LABEL, aqiCategory, WEIGHTS, clockAt } from "../../lib/conditionsScore";
import { useState, useEffect, useMemo } from "react";
import { useCondPrefs, scorePrefs, CondPrefsControls } from "../../lib/CondPrefs.jsx";
import { fetchCragForecastMeasured, fetchCragAir, fetchCragClimate, fetchAlpineSpread } from "../../lib/forecast";
import { routeRock } from "../../lib/rockType";
import CardHead from "./CardHead.tsx";
import ActionIcon from "./ActionIcon.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { clockHr } from "../../lib/HourTiles.jsx";
import { modelSpread } from "../../lib/alpineConditions.js";
import { condRow, condNote } from "../../lib/condRows.jsx";
import { skyWord, wxTempColor, wxWindColor } from "../../lib/wxColors.js";
import { dayBox, dayLbl, dayVal, daySub } from "../../lib/dayStyles.js";
import HourlyChart from "./HourlyChart.tsx";
import ShadeMap from "../../lib/ShadeMap";
import SeasonChart from "./SeasonChart.tsx";
import type { SeasonChartProps } from "./SeasonChart.tsx";
import type { CSSProperties, ReactNode } from "react";

/* CONDITIONS — the crag Conditions tab (sport, trad, top-rope, bouldering; never alpine, scrambling,
   mountaineering, ice or mixed, where a dry-rock friction number would be wrong). The scoring is
   lib/conditionsScore.js; this renders it as SECTIONS, each under its own heading and one idea per
   row, because the tab is long and must read section by section:
     RIGHT NOW · BEST TIME TO CLIMB · HOURLY · ROCK & DRYING · SUN ON THE WALL · AIR QUALITY · SEASON
   (the route page then adds the weather sources and ROAD CONDITIONS below it).
   The forecast is fetched at the CRAG's coordinate, so a crag route with no waypoints still gets one.
   Every number is accountable: tapping an hour lists each factor's points, the rows add up to the
   points line, a cap names its reason, and a factor with no input says "not measured" instead of
   counting as zero or as a pass. A failed fetch says so and shows no stars — it is not a rating;
   a failed air-quality or climate read says "not measured", never "clean" or "no season". */
/** What a fetch left in state: its data, or that it failed (null while it loads). */
interface Fetched<T> {
  data?: T;
  error?: boolean;
}
type ScoreClimate = SeasonChartProps["clim"];

export interface ConditionsScoreCardProps {
  /** The crag route; the score reads its discipline, rock, aspect and area. */
  route: {
    id: string;
    aspect?: string | null;
    face?: string | null;
    _dbArea?: { aspect?: string | null } | null;
  };
  /** The crag's area, for the coordinate the forecast is fetched at. */
  mtn?: { lat?: number | string | null; lng?: number | string | null } | null;
  /** Opens the editor on the wall direction; none hides the "Add the wall direction" link. */
  onAddAspect?: (() => void) | null;
}

/** One hour of a scored day, as the strip and the "Why" list read it. `precip` is null when unmeasured; every comparison here treats that as none. */
interface ScoreHour {
  time: string;
  hr: number;
  stars: number | null;
  dryFrac?: number | null;
  precip: number;
  lit?: boolean;
}
/** One factor of an hour's score. Which fields exist depends on the factor (temp, humidity, dry, wind, sun); each is read only in its own branch. */
interface ScoreFactor {
  pts: number;
  val: number;
  note: string;
  dew: number | null;
  friction: { label: string } | null;
  raining: boolean;
  precip: number;
  atLeast: boolean;
  need: number;
  frac: number;
  pop: number;
  damp: boolean;
  gust: number | null;
  lit: boolean;
  want: string;
}

const _cragWx: Record<string,unknown>={},_cragAir: Record<string,unknown>={},_cragClim: Record<string,ScoreClimate>={},_cragSp: Record<string,unknown>={};
const DIR8=["N","NE","E","SE","S","SW","W","NW"];
const agoH=function(h: number){return h<48?h+" h ago":Math.round(h/24)+" days ago";};
const condBox={background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 14px"};
const aqiTone=function(a: number | null | undefined){return a==null?C.textMuted:a<=50?C.green:a<=100?C.amber:a<=150?C.orange:C.red;};
/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function ConditionsScoreCard({route,mtn,onAddAspect}: ConditionsScoreCardProps){
  const disc=catOf(route);const on=CRAG_SCORE_DISCIPLINES.includes(disc);
  const lat=mtn&&typeof mtn.lat==="number"?mtn.lat:(mtn&&mtn.lat!=null?+mtn.lat:null),lng=mtn&&typeof mtn.lng==="number"?mtn.lng:(mtn&&mtn.lng!=null?+mtn.lng:null);
  const hasPt=lat!=null&&lng!=null&&isFinite(lat)&&isFinite(lng);
  const ck=hasPt?lat.toFixed(3)+","+lng.toFixed(3):"";
  const [wx,setWx]=useState<Fetched<unknown>|null>(function(){return ck&&_cragWx[ck]?{data:_cragWx[ck]}:null;});
  const [aq,setAq]=useState<Fetched<unknown>|null>(function(){return ck&&_cragAir[ck]?{data:_cragAir[ck]}:null;});
  const [clim,setClim]=useState<Fetched<ScoreClimate>|null>(function(){return ck&&_cragClim[ck]?{data:_cragClim[ck]}:null;});
  const [tries,setTries]=useState(0);const [aqTries,setAqTries]=useState(0);const [climTries,setClimTries]=useState(0);
  const [dayI,setDayI]=useState(0);const [hrI,setHrI]=useState<number|null>(null);const [showPrefs,setShowPrefs]=useState(false);
  const cp=useCondPrefs();
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragWx[ck]){setWx({data:_cragWx[ck]});return;}
    let live=true;setWx(null);
    fetchCragForecastMeasured(lat,lng).then(function(j){_cragWx[ck]=j;if(live)setWx({data:j});},function(){if(live)setWx({error:true});});
    return function(){live=false;};
  },[ck,tries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragAir[ck]){setAq({data:_cragAir[ck]});return;}
    let live=true;setAq(null);
    fetchCragAir(lat,lng).then(function(j){_cragAir[ck]=j;if(live)setAq({data:j});},function(){if(live)setAq({error:true});});
    return function(){live=false;};
  },[ck,aqTries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragClim[ck]){setClim({data:_cragClim[ck]});return;}
    let live=true;setClim(null);
    fetchCragClimate(lat,lng).then(function(m){_cragClim[ck]=m;if(live)setClim({data:m});},function(){if(live)setClim({error:true});});
    return function(){live=false;};
  },[ck,climTries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  /* A SECOND READ of three other models' rain (owner, 2026-10-28: the alpine card says when models disagree; a crag
     never did). Adds a line when they split, and NOTHING when it fails: no read is not agreement, but it is no flag. */
  const [sp,setSp]=useState<unknown>(function(){return ck&&_cragSp[ck]?_cragSp[ck]:null;});
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragSp[ck]){setSp(_cragSp[ck]);return;}
    let live=true;setSp(null);
    fetchAlpineSpread(lat,lng,null).then(function(j){_cragSp[ck]=j;if(live)setSp(j);},function(){if(live)setSp(null);});
    return function(){live=false;};
  },[ck,hasPt,on,lat,lng]);
  useEffect(function(){setDayI(0);setHrI(null);},[route.id]);
  const [wantDate,setWantDate]=useState<string|null>(function(){const d=OPEN_DAY.date;OPEN_DAY.date=null;return d;});
  const rk=routeRock(route);
  const aspectText=route.aspect||route.face||(route._dbArea&&route._dbArea.aspect)||null;
  const score=useMemo(function(){
    if(!wx||!wx.data)return null;
    return scoreForecast(wx.data,{lat:lat,lng:lng,aspect:aspectText,family:rk?rk.family:null,rock:rk?rk.rock:null,discipline:disc},scorePrefs(cp),undefined,aq&&aq.data?aq.data:null);
  },[wx,aq,cp,route.id,rk&&rk.family,aspectText]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on rock family and route id; lat/lng/disc/rk follow the route and rk is rebuilt each render
  useEffect(function(){if(!wantDate||!score)return;const i=score.days.findIndex(function(d){return d.date===wantDate;});if(i>=0){setDayI(i);setHrI(null);}setWantDate(null);},[score,wantDate]);
  if(!on)return null;
  const box={background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:ROUTE_GAP};
  const head=<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><CardHead style={{marginBottom:0}}>CONDITIONS SCORE</CardHead>{hasPt?<button onClick={function(){setShowPrefs(!showPrefs);}} aria-expanded={showPrefs} aria-label="Your ideal conditions" style={{minHeight:44,background:"none",border:"1px solid "+(showPrefs?C.blue:C.border),color:showPrefs?C.blue:C.textSub,borderRadius:8,padding:"5px 9px",fontSize:11.5,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}><ActionIcon name="settings" size={12} color="currentColor"/>Your conditions</button>:null}</div>;
  if(!hasPt)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>No score for this climb: the crag it is on has no location on file yet, so there is no forecast to score.</div></div>;
  if(wx&&wx.error)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.amber,lineHeight:1.55,marginBottom:8}}>Couldn’t load the forecast, so there is no score. This is not a rating of the conditions.</div><button onClick={function(){setTries(tries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>;
  if(!score)return <div style={box} aria-busy="true">{head}<LoadingRows C={C} label="Loading the forecast…"/></div>;
  const days=score.days;const day=days[Math.min(dayI,days.length-1)];
  if(!day)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.textSub}}>The forecast came back with no days ahead to score.</div></div>;
  const col=function(s: number | null | undefined){return s==null?C.border:s>=4?C.green:s>=2.5?C.amber:C.red;};
  const fmt=function(s: number | null | undefined){return s==null?"–":s.toFixed(1);};
  const starRow=function(s: number | null | undefined){const out=[];for(let i=1;i<=5;i++)out.push(<span key={i} style={{color:s!=null&&s>=i-0.25?col(s):C.borderHi}}>★</span>);return out;};
  const dayName=function(d: {date: string},i: number){if(i===0)return "Today";return new Date(d.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{weekday:"short",timeZone:"UTC"});};
  const dayDate=function(d: {date: string}){return new Date(d.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{month:"short",day:"numeric",timeZone:"UTC"});};
  const whenOf=function(x: {date: string; hr: number}){const i=days.findIndex(function(d){return d.date===x.date;});return (i===0?"today":i===1?"tomorrow":i>0?dayName(days[i],i):x.date)+" "+clockHr(x.hr);};
  const hrs=day.hours;
  /* ONE CLOCK AXIS for every day's hour strip (owner, 2026-10-24: "the boxes aren't consistent size"): the columns
     run from the earliest daylight hour any day offers to the latest, and each hour sits in its own clock column.
     Sized by the day's own count, an evening's one remaining hour stretched across the whole card while a full day
     drew eleven narrow tiles; and the best-three-hours mark, a shadow on top of those tiles, made them look taller. */
  const hrLo=Math.min.apply(null,days.map(function(d){return d.hours.length?d.hours[0].hr:24;})),hrHi=Math.max.apply(null,days.map(function(d){return d.hours.length?d.hours[d.hours.length-1].hr:-1;}));
  const hrCol=function(x: {hr: number}){return x.hr-hrLo+1;};
  const hrGrid={display:"grid",gridTemplateColumns:"repeat("+Math.max(1,hrHi-hrLo+1)+",minmax(0,1fr))",gap:3};
  const selI=hrI!=null&&hrI<hrs.length?hrI:(day.best?day.best.i+1:0);const h=hrs[selI];
  const top=h?h.stars:day.stars;const lbl=starsLabel(top);const lblCol=col(top);
  const shadeAt=(function(){if(!day.sun||day.sun.set==null)return null;const r=day.sun.rise,st=day.sun.set,n=Date.now();if(n>=r&&n<=st)return n;const bh=day.best?day.hours[day.best.i]:null;return bh&&bh.utc>=r&&bh.utc<=st?bh.utc:Math.round((r+st)/2);})();
  const rockLbl=rk?rk.label:"Rock unknown";
  const facKeys=["temp","humidity","dry","wind","sun"];
  const facNote=function(k: string,f: ScoreFactor){
    if(k==="temp")return uTemp(f.val)+" · "+f.note;
    if(k==="humidity")return Math.round(f.val)+"% humidity"+(f.dew!=null?" · dew point "+uTemp(f.dew):"")+(f.friction?" · "+f.friction.label:"");
    if(k==="dry")return (f.raining?"Rain in the past hour ("+uPrecip(f.precip)+")":(f.atLeast?"No rain in the past 14 days":"Last rain "+agoH(f.val)))+" · "+rockLbl+" dries in about "+f.need+" h"+(!f.raining&&f.frac<1?" · about "+Math.round(f.frac*100)+"% dry":"")+(f.pop?" · "+f.pop+"% chance of rain":"")+(f.damp?" · air at its dew point":"");
    if(k==="wind")return uWind(f.val)+(f.gust!=null&&f.gust>f.val+3?", gusts "+uWind(f.gust):"");
    if(k==="sun")return (f.lit?"Wall in sun":"Wall in shade")+(f.want==="either"?"":" · you want "+f.want);
    return "";
  };
  const notMeasured=function(k: string){
    if(k==="sun")return score.aspectVaries?"Sun / shade: the wall faces several ways, so sun isn’t scored":"Sun / shade: this climb has no wall direction on file";
    return (FACTOR_LABEL as Record<string,string>)[k]+": no forecast value for this hour";
  };
  const cur=score.now;
  const wetSand=score.sandstone&&cur&&cur.dryFrac!=null&&cur.dryFrac<1;
  const dryLine=score.dryFrom?whenOf(score.dryFrom):score.dryBeyond?"Not within the 7-day forecast":null;
  /* WHEN WILL IT BE DRY — for any hour: the first later hour the drying model calls dry, or null when none does inside
     the forecast. The countdown chip and the tapped hour both read it, so they cannot disagree with "Likely dry from". */
  const dryAfter=function(x: {dryFrac?: number | null; utc: number} | null | undefined){if(!x||x.dryFrac==null||x.dryFrac>=1)return null;for(const d of days)for(const y of d.all)if(y.utc>x.utc&&y.dryFrac!=null&&y.dryFrac>=1)return y;return null;};
  /* A WET MORNING UNDER A GOOD DAY (owner's note, 2026-10-28: "red boxes in the morning because the rock may still be
     wet, but ... it says good conditions"). The day's score is its best 3 hours, so a dry afternoon makes it Good
     beside red morning tiles; this line says so in words, and each tile's own score (and its tapped "Why") stays the
     hour's. Null unless some daylight hour of the selected day is wet and the rock dries later that same day. */
  const wetTill=(function(){const w=hrs.filter(function(x: ScoreHour){return x.dryFrac!=null&&x.dryFrac<1;});if(!w.length||!day.best)return null;const y=dryAfter(w[w.length-1]);return y&&y.date===day.date&&y.daylight?y:null;})();
  /* ...and the same for DEW: most red mornings under a Good day were not rain at all (audit, 2026-10-28: 24 of 71 Good
     days at 18 crags had red hours before 11 AM, most from the dew-point cap, on dry desert mornings at Vantage and
     Smith Rock). The first hour after the last dew-capped hour before the best 3 hours; null if the best hours are damp too. */
  const dewTill=(function(){if(!day.best)return null;const dew=function(x: {caps: {why: string}[]}){return x.caps.some(function(c){return /dew point/.test(c.why);});};if(hrs.slice(day.best.i,day.best.i+3).some(dew))return null;let last=-1;for(let i=0;i<day.best.i;i++)if(dew(hrs[i]))last=i;return last>=0&&hrs[last+1]?hrs[last+1]:null;})();
  // The day's rain, the amount this card prints among three other models' (modelSpread, the alpine card's rule): null unless they split.
  const rainSplit=function(d: {rain: number | null; date: string}){const m=sp&&d.rain!=null?modelSpread(sp,d.date,null,d.rain):null;return m&&m.over.indexOf("rain")>=0?m.rain:null;};
  const dayRainSplit=rainSplit(day);
  const dryChip=(function(){if(!cur||cur.dryFrac==null||cur.dryFrac>=1||wetSand)return null;const y=dryAfter(cur),hrs=y?Math.max(1,Math.round((y.utc-Date.now())/3600e3)):null;
    const txt=cur.factors.dry&&cur.factors.dry.raining?"Raining — rock is wet":"Rock drying · about "+Math.round(cur.dryFrac*100)+"% dry";
    const when=y?((hrs as number)<=36?"Dry in about "+hrs+" h ("+whenOf(y)+")":"Dry by "+whenOf(y)):"Not dry within the 7-day forecast";
    return <div data-dry-countdown="1" style={{background:C.amberBg,border:"1px solid "+C.amber,borderRadius:10,padding:"8px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:C.amber}}>{txt}</div><div style={{fontSize:12.5,color:C.text,marginTop:2}}>{when}</div></div>;})();
  const sec=function(title: string,body: ReactNode,first?: boolean){return <div key={title}><SL first={first}>{title}</SL>{body}</div>;};
  const aqNow=aq&&aq.data&&cur&&cur.aqi!=null?cur.aqi:null;const aqCat=aqiCategory(aqNow);
  const dayAqCat=aqiCategory(day.aqiMax);
  const curF=cur&&cur.factors.dry;
  const sandWarn=<div role="alert" style={{background:C.redBg,border:"1px solid "+C.red,borderRadius:10,padding:"9px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:C.red}}>Wet sandstone is weak — holds can break. Stay off it until it’s dry</div><div style={{fontSize:12.5,color:C.text,marginTop:3,lineHeight:1.45}}>{dryLine?"Likely dry from "+dryLine+".":"Can’t tell yet when it will be dry."}</div></div>;
  return <div data-conditions-score="1">
    {cur?sec("Right now",<div style={condBox}>
      {wetSand?sandWarn:dryChip}
      <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:6}}><div style={{fontSize:26,fontWeight:800,lineHeight:1,color:C.text}}>{fmt(cur.stars)}</div><div><div aria-hidden="true" style={{fontSize:15,letterSpacing:1.2}}>{starRow(cur.stars)}</div><div style={{fontSize:12,color:col(cur.stars),fontWeight:800}}>{starsLabel(cur.stars)+" · "+clockHr(cur.hr)}</div></div></div>
      {cur.caps.length?condRow("Held down by",cur.caps.map(function(c: {why: string}){return c.why;}).join(" · "),C.amber):null}
      {condRow("Temperature",cur.temp!=null?uTemp(cur.temp)+(cur.feels!=null&&uTempN(cur.feels)!==uTempN(cur.temp)?" · feels like "+uTemp(cur.feels):""):"Not measured")}
      {condRow("Friction",cur.friction?cur.friction.label:"Not measured",cur.friction?(cur.friction.key==="crisp"?C.green:cur.friction.key==="ok"?C.text:C.amber):C.textMuted)}
      {condRow("Humidity",cur.rh!=null?Math.round(cur.rh)+"%"+(cur.dew!=null?" · dew point "+uTemp(cur.dew):""):"Not measured")}
      {condRow("Wind",cur.wind!=null?uWind(cur.wind)+(cur.windDir!=null?" from the "+DIR8[Math.round(cur.windDir/45)%8]:"")+(cur.gust!=null&&(uWindN(cur.gust) as number)>(uWindN(cur.wind) as number)?", gusts "+uWind(cur.gust):""):"Not measured")}
      {condRow("Cloud cover",cur.cloud!=null?Math.round(cur.cloud)+"% · "+skyWord(cur.cloud):"Not measured")}
      {condRow("Rain",cur.precip==null?"Not measured":cur.precip>0?uPrecip(cur.precip)+" in the past hour":"None in the past hour")}
      {condRow("Air quality",aqNow!=null?"AQI "+Math.round(aqNow)+" · "+(aqCat as {label: string}).label:aq&&aq.error?"Not measured (didn’t load)":!aq?"Loading…":"Not measured",aqNow!=null?aqiTone(aqNow):C.textMuted)}
    </div>,true):null}
    {sec("Best time to climb",<div style={box}>{head}
    {showPrefs?<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
      <div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:8}}>They change the score on every crag route and in the Best day to climb view. Also in the Menu and Settings.</div>
      <CondPrefsControls disc={disc}/>
    </div>:null}
    <div role="group" aria-label="Day" style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:10}}>{days.map(function(d,i){const on=i===Math.min(dayI,days.length-1);return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+(d.stars==null?"no score":fmt(d.stars)+" stars")} style={{flex:"0 0 58px",width:58,boxSizing:"border-box",minHeight:58,padding:"6px 2px",borderRadius:9,border:"1px solid "+(on?C.green:C.border),background:on?C.greenBg:"transparent",color:C.text,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:11.5,fontWeight:700}}>{dayName(d,i)}</div><div style={{fontSize:12,fontWeight:800,color:col(d.stars)}}>{fmt(d.stars)+" ★"}</div><div style={{fontSize:10.5,color:C.textMuted}}>{d.hi!=null?uTemp(d.hi)+"/"+uTemp(d.lo):""}</div></button>;})}</div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}><div style={{fontSize:34,fontWeight:800,lineHeight:1,color:C.text}}>{fmt(top)}</div><div><div aria-hidden="true" style={{fontSize:19,letterSpacing:1.5,lineHeight:1.1}}>{starRow(top)}</div><span style={{display:"inline-block",marginTop:3,padding:"2px 9px",borderRadius:20,fontSize:11.5,fontWeight:800,color:lblCol,background:top>=4?C.greenBg:top>=2.5?C.amberBg:C.redBg}}>{lbl}</span>{h?<div style={{fontSize:11,color:C.textMuted,marginTop:3}}>{"Overall score at "+clockHr(h.hr)+" · pick another hour below"}</div>:null}</div></div>
    <div style={{fontSize:13,color:C.text,marginBottom:day.capWhy.length?4:10}}>{day.best?<span>{"Best 3 hours "}<b>{clockHr(day.best.start)+" – "+clockHr(day.best.end)}</b>{" · "}<b style={{color:col(day.stars)}}>{fmt(day.stars)+" ★"}</b><span style={{color:C.textMuted}}>{" (the day’s score)"}</span></span>:(dayI===0?"Fewer than three daylight hours left to score":"Fewer than three daylight hours to score")}</div>
    {day.capWhy.length?<div style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Held down by: "+day.capWhy.join(" · ")}</div>:null}
    {dayRainSplit?<div data-rain-split="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Forecast models disagree on rain this day ("+uPrecip(dayRainSplit[0])+"–"+uPrecip(dayRainSplit[1])+"): treat the rain, and the drying after it, as uncertain."}</div>:null}
    {wetTill?<div data-wet-until="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Rock likely wet until "+clockHr(wetTill.hr)+": the hours before it score lower than the day. Tap one to see why."}</div>:null}
    {dewTill&&!(wetTill&&wetTill.hr>=dewTill.hr)?<div data-dew-until="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Air at its dew point until "+clockHr(dewTill.hr)+": dew may dampen the rock, so earlier hours score lower than the day. Tap one to see why."}</div>:null}
    {hrs.length?<div style={{marginBottom:10}}>
      <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:5}}>{dayI===0?"Pick an hour, rest of today ":"Pick an hour "}<span style={{textTransform:"none",letterSpacing:0,fontWeight:500}}>(daylight hours · colour is the overall score)</span></div>
      <div style={hrGrid}>{hrs.map(function(x: ScoreHour,i: number){return <button key={x.time} onClick={function(){setHrI(i);}} aria-pressed={i===selI} aria-label={clockHr(x.hr)+", overall score "+fmt(x.stars)+" stars"+(day.best&&i>=day.best.i&&i<day.best.i+3?", one of the best 3 hours":"")+(x.dryFrac!=null&&x.dryFrac<1?", rock about "+Math.round(x.dryFrac*100)+"% dry":"")+(x.precip>0?", "+uPrecip(x.precip)+" of rain":"")} style={{gridColumn:hrCol(x),boxSizing:"border-box",height:44,padding:0,borderRadius:5,cursor:"pointer",background:col(x.stars),opacity:0.6+(x.stars||0)/5*0.4,border:"2px solid "+(i===selI?C.text:"transparent")}}/>;})}</div>
      {day.best?<div aria-hidden="true" style={Object.assign({},hrGrid,{marginTop:3})}>{hrs.slice(day.best.i,day.best.i+3).map(function(x: ScoreHour){return <div key={x.time} style={{gridColumn:hrCol(x),height:3,borderRadius:2,background:C.green}}/>;})}</div>:null}
      <div style={Object.assign({},hrGrid,{marginTop:3})}>{hrs.map(function(x: ScoreHour,i: number){const c=hrCol(x);return <div key={x.time} style={{gridColumn:c,fontSize:9.5,color:C.textMuted,textAlign:"center",whiteSpace:"nowrap"}}>{i===0||((c-1)%3===0&&c-hrCol(hrs[0])>=3)?clockHr(x.hr).replace(" ",""):""}{score.bearing!=null?<div aria-hidden="true" style={{fontSize:10,color:x.lit?C.yellow:C.textMuted}}>{x.lit?"●":"▪"}</div>:null}{hrs.some(function(y: ScoreHour){return y.precip>0;})?<div aria-hidden="true" style={{fontSize:10,color:C.blue,minHeight:13}}>{x.precip>0?"•":""}</div>:null}</div>;})}</div>
    </div>:null}
    {h?<div>
      <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{"Why "+clockHr(h.hr)+" scores "+fmt(h.stars)+" · "+h.pts+" of "+h.max+" points"}</div>
      {h.dryFrac!=null&&h.dryFrac<1?(function(){const y=dryAfter(h);return <div data-hour-dry="1" style={{fontSize:12.5,color:C.amber,fontWeight:700,marginBottom:8}}>{(h.factors.dry&&h.factors.dry.raining?"Raining at "+clockHr(h.hr):"Rock about "+Math.round(h.dryFrac*100)+"% dry at "+clockHr(h.hr))+" · "+(y?"likely dry from "+whenOf(y):"not dry within the 7-day forecast")}</div>;})():null}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>{facKeys.filter(function(k){return (h.factors as Record<string,ScoreFactor>)[k];}).map(function(k){const f=(h.factors as Record<string,ScoreFactor>)[k],pc=f.pts/(WEIGHTS as Record<string,number>)[k];const fc=pc>=0.75?C.green:pc>=0.45?C.amber:C.red;return <div key={k} data-factor={k}>
        <div style={{display:"grid",gridTemplateColumns:"92px minmax(0,1fr) 44px",gap:8,alignItems:"center",fontSize:12.5}}><span style={{color:C.text}}>{(FACTOR_LABEL as Record<string,string>)[k]}</span><div style={{height:7,background:C.borderLight,borderRadius:4,overflow:"hidden"}}><div style={{width:Math.round(pc*100)+"%",height:"100%",background:fc}}/></div><span style={{textAlign:"right",color:C.textSub,fontVariantNumeric:"tabular-nums"}}>{f.pts+"/"+(WEIGHTS as Record<string,number>)[k]}</span></div>
        <div style={{fontSize:11.5,color:C.textMuted,marginLeft:100,lineHeight:1.45}}>{facNote(k,f)}</div>
      </div>;})}</div>
      {h.caps.length?<div data-caps="1" style={{fontSize:12,color:C.amber,marginTop:9,paddingLeft:9,borderLeft:"2px solid "+C.amber,lineHeight:1.5}}>{h.caps.map(function(c: {why: string; stars: number}){return <div key={c.why}>{"Capped at "+c.stars+" ★ — "+c.why}</div>;})}<div style={{color:C.textMuted}}>{"The factors alone would give "+fmt(h.rawStars)+"."}</div></div>:null}
      {h.missing.length?<div style={{fontSize:11.5,color:C.textMuted,marginTop:9,paddingLeft:9,borderLeft:"2px solid "+C.borderLight,lineHeight:1.5}}>{"Not measured, so left out of the score: "+h.missing.map(notMeasured).join("; ")+"."}{h.missing.indexOf("sun")>=0&&onAddAspect?<button onClick={onAddAspect} style={{display:"block",marginTop:4,padding:"3px 0",border:"none",background:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{"Know which way it faces? Add the wall direction →"}</button>:null}</div>:null}
    </div>:null}
    </div>)}
    {sec("Day by day",<div data-day-table="1" style={Object.assign({},condBox,{padding:0,overflow:"hidden"})}>
      {days.map(function(d,i){const on=i===Math.min(dayI,days.length-1);const trace=d.rain!=null&&d.rain>0&&uImp()&&d.rain<0.005;
        const tLine=d.hi!=null?uTemp(d.hi)+" / "+uTemp(d.lo)+(d.feelsHi!=null?", feels "+uTemp(d.feelsHi)+" / "+uTemp(d.feelsLo):""):"Temperature not measured";
        const rWhen=d.rain>0&&d.rainFrom!=null?clockHr(d.rainFrom)+"–"+clockHr(d.rainTo):"";
        const rLine=(d.rain==null?"Rain not measured":d.rain===0?"No rain":(trace?"A trace of rain (under 0.01\") over "+d.rainHrs+" h":uPrecip(d.rain)+" of rain over "+d.rainHrs+" h")+(rWhen?", "+rWhen:""))+(d.popMax?" · hourly chance up to "+d.popMax+"%":"");
        const wLine=[d.windMax!=null?"Wind to "+uWind(d.windMax)+(d.gustMax!=null&&(uWindN(d.gustMax) as number)>(uWindN(d.windMax) as number)?", gusts "+uWind(d.gustMax):""):"Wind not measured",d.rhMin!=null?"humidity "+Math.round(d.rhMin)+"–"+Math.round(d.rhMax as number)+"%":null,d.cloudAvg!=null?skyWord(d.cloudAvg).toLowerCase()+" ("+Math.round(d.cloudAvg)+"% cloud)":null].filter(Boolean).join(" · ");
        /* The day name and its stars sit on their OWN line above the boxes: beside them, at 390 px, three boxes
           shared what was left of a 50 px column and broke "52° / 38°" mid-number. A missing value is "—" here
           (the row's spoken label still says "not measured"); "Not measured" did not fit a third of a phone. */
        return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+(d.stars==null?"no score":fmt(d.stars)+" stars")+". "+tLine+". "+rLine+". "+wLine+"."} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 14px",margin:0,border:"none",borderTop:i?"1px solid "+C.border:"none",borderRadius:0,background:on?C.greenBg:"transparent",boxShadow:on?"inset 3px 0 0 "+C.green:"none",color:C.text,cursor:"pointer",font:"inherit"}}>
          <span style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}><span style={{fontSize:12.5,fontWeight:800}}>{dayName(d,i)}</span><span style={{fontSize:11.5,color:C.textMuted}}>{dayDate(d)}</span><span style={{fontSize:12,fontWeight:800,color:col(d.stars)}}>{fmt(d.stars)+" ★"}</span></span>
          <span style={{minWidth:0,display:"block"}}>
            <span style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5}}>
              <span style={dayBox as CSSProperties}><span style={dayLbl}>Temp</span><span style={Object.assign({},dayVal,{color:d.hi!=null?wxTempColor(d.hi):C.textMuted}) as CSSProperties}>{d.hi!=null?uTemp(d.hi)+" / "+uTemp(d.lo):"—"}</span><span style={daySub}>{d.hi!=null?"high / low"+(d.feelsHi!=null?", feels "+uTemp(d.feelsHi)+" / "+uTemp(d.feelsLo):""):""}</span></span>
              <span style={dayBox as CSSProperties}><span style={dayLbl}>Rain</span><span style={Object.assign({},dayVal,{color:d.rain==null?C.textMuted:d.rain>0?C.blue:C.text}) as CSSProperties}>{d.rain==null?"—":d.rain===0?"None":trace?"Trace":uPrecip(d.rain)}</span><span style={daySub}>{(d.rain>0?d.rainHrs+" h"+(rWhen?", "+rWhen:""):"")+(d.rain>0&&d.popMax?" · ":"")+(d.popMax?"hourly chance up to "+d.popMax+"%":"")+(rainSplit(d)?" · models split "+uPrecip((rainSplit(d) as number[])[0])+"–"+uPrecip((rainSplit(d) as number[])[1]):"")}</span></span>
              <span style={dayBox as CSSProperties}><span style={dayLbl}>Wind</span><span style={Object.assign({},dayVal,{color:d.windMax!=null?wxWindColor(d.windMax):C.textMuted}) as CSSProperties}>{d.windMax!=null?"to "+uWind(d.windMax):"—"}</span><span style={daySub}>{d.gustMax!=null&&d.windMax!=null&&(uWindN(d.gustMax) as number)>(uWindN(d.windMax) as number)?"gusts to "+uWind(d.gustMax):""}</span></span>
            </span>
            <span style={{display:"block",fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{[d.rhMin!=null?"Humidity "+Math.round(d.rhMin)+"–"+Math.round(d.rhMax as number)+"%":null,d.cloudAvg!=null?skyWord(d.cloudAvg)+" ("+Math.round(d.cloudAvg)+"% cloud)":null].filter(Boolean).join(" · ")}</span>
          </span>
        </button>;})}
      <div style={Object.assign({},condNote,{marginTop:0,padding:"9px 14px 11px",borderTop:"1px solid "+C.border})}>Temperature and rain cover the whole day; wind, humidity and cloud its daylight hours. Tap a day to open it above and in the charts.</div>
    </div>)}
    {sec("Hour by hour",<div style={condBox}>
      <div role="group" aria-label="Day for the hourly charts" style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:4}}>{days.slice(0,7).map(function(d,i){const on=i===Math.min(dayI,days.length-1);return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+dayDate(d)} style={{flex:"0 0 58px",width:58,minHeight:44,boxSizing:"border-box",padding:"6px 2px",borderRadius:9,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:"transparent",color:on?C.onSolid:C.textSub,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:12,fontWeight:on?800:700}}>{dayName(d,i)}</div><div style={{fontSize:10.5,color:on?C.blue:C.textMuted}}>{dayDate(d)}</div></button>;})}</div>
      <HourlyChart all={day.all} selUtc={h?h.utc:null}/>
    </div>)}
    {sec("Rock & drying",<div style={condBox}>
      {condRow("Rock",rockLbl,rk?C.text:C.textMuted)}
      {condRow("Drying time","About "+score.dryNeed+" h after a typical rain"+(cp.rain==="cautious"?" (you give it longer)":"")+"; less after a drizzle, longer after a soaking")}
      {condRow("Past rain",score.rainMeasured?(function(){const t=score.rainMeasured.through,l=score.local(t);return "Measured up to "+clockAt(score,t)+(l.date===days[0].date?" today":" "+new Date(l.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{weekday:"long",timeZone:"UTC"}))+"; forecast after that";})():"Modelled — no rain measurements reach this crag",score.rainMeasured?C.text:C.textMuted)}
      {curF?condRow("Last rain",curF.raining?"In the past hour":curF.atLeast?"None in the past 14 days":agoH(curF.val)+" · "+uPrecip(curF.rain24)+" in the day before it stopped"):null}
      {cur&&cur.dryFrac!=null?condRow("Rock now",cur.dryFrac>=1?(cur.factors.dry&&cur.factors.dry.damp?"Dried out from rain, but the air is at its dew point — shaded rock may be damp":"Likely dry"):"Likely wet — about "+Math.round(cur.dryFrac*100)+"% dried",cur.dryFrac>=1?C.green:C.amber):null}
      {dryLine?condRow("Likely dry from",dryLine):null}
      {score.seep?condRow("Seepage risk",<span><b style={{color:score.seep.risk==="high"?C.red:score.seep.risk==="moderate"?C.amber:C.green}}>{score.seep.risk==="high"?"High":score.seep.risk==="moderate"?"Moderate":"Low"}</b>{" · "+uPrecip(score.seep.rain7)+" of rain in 7 days, "+uPrecip(score.seep.rain14)+" in "+(score.seep.short?"the days on record":"14 days")}</span>):null}
      <div style={condNote}>Seepage is a risk from recent rain, not a reading: cracks, seams and overhangs can stay wet for days after the face is dry. Drying times are rules of thumb for the rock type.</div>
    </div>)}
    {sec("Sun on the wall",<div style={condBox}>
      {day.sun?condRow("Sunrise",clockAt(score,day.sun.rise)):null}
      {day.sun&&day.sun.set!=null?condRow("Sunset",clockAt(score,day.sun.set)):null}
      {score.bearing!=null?condRow("Wall faces",DIR8[Math.round(score.bearing/45)%8]):null}
      {score.bearing!=null&&day.wallSun?condRow("Sun on the wall",day.wallSun.on!=null?"Hits the wall at "+clockAt(score,day.wallSun.on)+" · leaves at "+clockAt(score,day.wallSun.off):"No direct sun on this wall today",day.wallSun.on!=null?C.yellow:C.textSub):null}
      {score.bearing==null?condRow("Sun on the wall",(score.aspectVaries?"The wall faces several ways, so when the sun reaches it isn’t worked out, and sun isn’t scored":"No wall direction on file for this climb, so when the sun reaches it isn’t worked out")+". The shade map below shows where the terrain casts shadow.",C.textMuted):null}
      {score.bearing!=null?<div style={condNote}>Times assume a clear sky; a yellow dot under the hours above marks the ones forecast to be in sun. Terrain and trees that shade the wall aren’t known.</div>:null}
    </div>)}
    {sec("Shade map",<div style={condBox}>{shadeAt!=null?<ShadeMap lat={lat} lng={lng} rise={day.sun.rise} set={day.sun.set} at0={shadeAt} dayKey={day.date} clock={function(u){return clockAt(score,u);}} C={C}/>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>The forecast has no sunrise and sunset for this day, so the shade can’t be drawn.</div>}</div>)}
    {sec("Air quality",<div style={condBox}>
      {!aq?<LoadingRows C={C} label="Loading air quality…"/>:aq.error?<div><div style={{fontSize:12.5,color:C.amber,lineHeight:1.5,marginBottom:8}}>Couldn’t load air quality, so smoke is not measured. This is not a clean-air reading.</div><button onClick={function(){setAqTries(aqTries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>:<div>
        {condRow("Now",aqNow!=null?"AQI "+Math.round(aqNow)+" · "+(aqCat as {label: string}).label:"Not measured",aqNow!=null?aqiTone(aqNow):C.textMuted)}
        {condRow(dayI===0?"Worst today":"Worst "+dayName(day,dayI),day.aqiMax!=null?"AQI "+Math.round(day.aqiMax)+" · "+(dayAqCat as {label: string}).label:"No air-quality forecast this far ahead",day.aqiMax!=null?aqiTone(day.aqiMax):C.textMuted)}
        {cur&&cur.pm25!=null?condRow("Fine smoke",Math.round(cur.pm25)+" µg/m³ of PM2.5 now"):null}
        <div style={condNote}>{"Above AQI "+score.aqLimits[0]+" the score is held to 2 ★, above "+score.aqLimits[1]+" to 1 ★ — smoke makes hard breathing the day’s real hazard."+(cp.aq?" (Your air-quality setting.)":"")}</div>
      </div>}
    </div>)}
    {sec("Season",<div style={condBox}>
      {!clim?<LoadingRows C={C} label="Loading the climate history…"/>:clim.error?<div><div style={{fontSize:12.5,color:C.amber,lineHeight:1.5,marginBottom:8}}>Couldn’t load the climate history for this crag. This says nothing about its season.</div><button onClick={function(){setClimTries(climTries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>:<SeasonChart clim={clim.data as ScoreClimate} band={score.band}/>}
    </div>)}
  </div>;
}
