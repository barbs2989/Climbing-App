import { uImp, uTempN, uWindN, C, uTemp, uTempDelta, uWind, uPrecip } from "../../ClimbMatchCore.jsx";
import { useState, useEffect } from "react";
import { spanEnding, clockHr, HourStepper, Tile, NOT_MEASURED, compass } from "../../lib/HourTiles.jsx";
import HourChartCard from "./HourChartCard.tsx";
import type { HourRow, HourSeries, HourBars, HourY } from "./HourChartCard.tsx";
import type { ReactNode } from "react";

export interface HourlyChartProps {
  /** One day's hours, in order; fewer than two draws nothing. */
  all?: HourRow[] | null;
  /** The `utc` of the hour picked in the chips. */
  selUtc?: string | null;
}
import { wxTempColor, wxWindColor, skyWord } from "../../lib/wxColors.js";

/* HOURLY — five small panels sharing one time axis: temperature with feels-like and dew point (one
   unit, so one axis), rain AMOUNT, chance of rain with cloud cover (both percent), humidity, and
   wind with gusts and the direction it blows from. Never two scales on one panel. One day at a
   time: the day is picked above the charts. Hover or drag reads every value for an
   hour; hours already gone are shaded. Rain and its chance are drawn over the hour BEFORE their
   time stamp, which is the hour they describe.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
const rainN=function(inch: number|null|undefined){return inch==null?null:uImp()?inch:inch*25.4;};
export default function HourlyChart({all,selUtc}: HourlyChartProps){
  const [pin,setPin]=useState<number|null>(null);useEffect(function(){setPin(null);},[selUtc]);
  const n=all?all.length:0;
  const sel=all?all.findIndex(function(h: HourRow){return h.utc===selUtc;}):-1;
  const selIdx=pin!=null&&pin<n?pin:(sel>=0?sel:0);
  // The chip row opens on the picked hour, not on midnight; HourStepper scrolls the ROW (never the page) to keep it in view.
  if(!all||all.length<2)return null;
  const W=340,L=34,R=58,xw=(W-L-R)/(n-1),x=function(i: number){return L+i*xw;};
  const T=all.map(function(h){return uTempN(h.temp);}),F=all.map(function(h){return uTempN(h.feels);}),D=all.map(function(h){return uTempN(h.dew);});
  const tv=T.concat(F,D).filter(function(v){return v!=null;});
  const PR=all.map(function(h){return rainN(h.precip);}),prMax=Math.max.apply(null,PR.map(function(v){return v||0;}));
  const RH=all.map(function(h){return h.rh;}),POP=all.map(function(h){return h.pop;}),CL=all.map(function(h){return h.cloud;});
  const Wd=all.map(function(h){return uWindN(h.wind);}),G=all.map(function(h){return uWindN(h.gust);});
  const wv=Wd.concat(G).filter(function(v){return v!=null;});
  // A wet hour's scale: never below 0.04" (1 mm), so a trace of drizzle reads as a trace.
  const prTop=Math.max(uImp()?0.04:1,prMax);
  const arrowStep=3;
  const windArrows=function(y: HourY){return all.map(function(h: HourRow,i: number){if(i%arrowStep!==0||h.windDir==null||Wd[i]==null)return null;return <g key={"a"+i} transform={"translate("+x(i).toFixed(1)+","+y(Wd[i]).toFixed(1)+") rotate("+Math.round(h.windDir+180)+") scale(.75)"} opacity=".8"><path d="M0,-7 L5,4.5 L0,2 L-5,4.5 Z" fill={C.text} stroke={C.indigo} strokeWidth="1"/></g>;});};
  const spanOf=function(h: HourRow){return spanEnding(h.hr);},atOf=function(h: HourRow){return "at "+clockHr(h.hr);};
  const card=function(key: string,title: string,series: HourSeries[],lo: number,hi: number,axisFmt: (v: number)=>string,bars: HourBars|null,extra: ((y: HourY)=>ReactNode)|null,readout: (h: HourRow)=>ReactNode){return <HourChartCard key={key} all={all} selIdx={selIdx} title={title} series={series} lo={lo} hi={hi} axisFmt={axisFmt} bars={bars} extra={extra} readout={readout}/>;};
  return <div>
    <div style={{marginBottom:6}}><HourStepper index={selIdx} count={n} onPick={setPin} label={function(i: number){return clockHr(all[i].hr);}}>{all.map(function(h,i){const on=i===selIdx;return <button key={h.utc} onClick={function(){setPin(i);}} aria-pressed={on} aria-label={clockHr(h.hr)+(h.past?", already past":"")} style={{flex:"0 0 auto",minWidth:58,minHeight:44,boxSizing:"border-box",padding:"8px 8px",borderRadius:8,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:"transparent",color:on?C.onSolid:C.textSub,fontSize:12,fontWeight:on?800:600,cursor:"pointer",opacity:h.past?0.6:1}}>{clockHr(h.hr)}</button>;})}</HourStepper></div>
    {tv.length?card("t","Temperature",[{name:"Temp",vals:T,color:C.orange},{name:"Feels",vals:F,color:C.yellow,dash:"2 3"},{name:"Dew pt",vals:D,color:C.cyan,dash:"4 3"}],Math.floor(Math.min.apply(null,tv)),Math.ceil(Math.max.apply(null,tv)),function(v: number){return v+"°";},null,null,function(h: HourRow){const damp=h.temp!=null&&h.dew!=null&&h.temp-h.dew<5;return [
      <Tile key="t" label="Temperature" when={atOf(h)} value={h.temp!=null?uTemp(h.temp):NOT_MEASURED} tone={h.temp!=null?wxTempColor(h.temp):null}/>,
      <Tile key="f" label="Feels like" when={atOf(h)} value={h.feels!=null?uTemp(h.feels):NOT_MEASURED}/>,
      <Tile key="d" label="Dew point" when={atOf(h)} value={h.dew!=null?uTemp(h.dew):NOT_MEASURED} tone={damp?C.amber:null} sub={h.temp!=null&&h.dew!=null?(damp?"Air within "+uTempDelta(h.temp-h.dew)+"° of it: damp":"Air "+uTempDelta(h.temp-h.dew)+"° above it"):null}/>];}):null}
    {wv.length?card("w","Wind and gusts",[{name:"Wind",vals:Wd,color:C.indigo},{name:"Gusts",vals:G,color:C.indigo,dash:"4 3"}],0,Math.max(10,Math.ceil(Math.max.apply(null,wv))),function(v: number){return String(v);},null,windArrows,function(h: HourRow){return [
      <Tile key="w" label="Wind" when={atOf(h)} value={h.wind==null?NOT_MEASURED:uWind(h.wind)} tone={h.wind!=null?wxWindColor(h.wind):null} sub={h.windDir!=null?"from the "+compass(h.windDir):null}/>,
      <Tile key="g" label="Gusts" when={spanOf(h)} value={h.gust==null?NOT_MEASURED:uWind(h.gust)} tone={h.gust!=null?wxWindColor(h.gust):null} sub={h.gust==null?null:(h.wind!=null&&(uWindN(h.gust) as number)<=(uWindN(h.wind) as number)?"no stronger than the wind":"strongest moment in that hour")}/>];}):null}
    {card("r","Rain amount ("+(uImp()?"inches":"mm")+")",[],0,prTop,function(v: number){return v===0?"0":uImp()?v.toFixed(2):v.toFixed(1);},{name:"Rain",vals:PR,color:C.blue},null,function(h: HourRow){const trace=h.precip!=null&&h.precip>0&&uImp()&&h.precip<0.005;return [
      <Tile key="r" label="Rain" when={spanOf(h)} value={h.precip==null?NOT_MEASURED:h.precip===0?"None":trace?"Trace":uPrecip(h.precip)} tone={(h.precip as number)>0?C.blue:null} sub={trace?"under 0.01 in":null}/>];})}
    {card("p","Chance of rain and cloud cover",[{name:"Cloud",vals:CL,color:C.textSub}],0,100,function(v: number){return v+"%";},{name:"Chance",vals:POP,color:C.blue},null,function(h: HourRow){return [
      <Tile key="p" label="Chance of rain" when={spanOf(h)} value={h.pop==null?NOT_MEASURED:h.pop+"%"} tone={(h.pop as number)>=50?C.blue:null} sub={h.pop==null?null:"of measurable rain"}/>,
      <Tile key="c" label="Cloud" when={atOf(h)} value={h.cloud==null?NOT_MEASURED:Math.round(h.cloud)+"%"} sub={h.cloud==null?null:skyWord(h.cloud)}/>];})}
    {card("h","Humidity",[{name:"Humidity",vals:RH,color:C.teal}],0,100,function(v: number){return v+"%";},null,null,function(h: HourRow){return [
      <Tile key="h" label="Humidity" when={atOf(h)} value={h.rh==null?NOT_MEASURED:Math.round(h.rh)+"%"}/>];})}
  </div>;
}
