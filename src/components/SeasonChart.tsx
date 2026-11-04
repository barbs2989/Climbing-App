import { useState } from "react";
import type { PointerEvent } from "react";
import { uTempN, C, uTemp, uPrecip } from "../../ClimbMatchCore.jsx";
import { monthFit } from "../../lib/conditionsScore";
import { condRow, condNote } from "../../lib/condRows.jsx";

/** One month of the crag's climate history (the monthFit input). */
export interface SeasonMonth {
  lo: number;
  hi: number;
  wetDays: number;
  rain: number;
}
export interface SeasonChartProps {
  /** The crag's climate history: twelve months plus the span of years averaged. */
  clim: { months: SeasonMonth[]; years: string | number };
  /** The climber's ideal temperature band, [low, high] in degrees F. */
  band: [number, number];
}

/* Moved verbatim from RouteDetail.jsx; only the types were added.
   SEASON — twelve months of average high and low at the crag, from the last five years. A bar is
   one month's range; green months are PRIME for you (some of the climbing day, from the cool morning
   up to the afternoon high, in your ideal band, in a dry month: monthFit), amber GOOD (within a few
   degrees and under 16 wet days). Historical averages, never a forecast. */
export default function SeasonChart({clim,band}: SeasonChartProps){
  const [hv,setHv]=useState<number | null>(null);
  const ms=clim.months;const W=340,H=104,L=28,R=6,cw=(W-L-R)/12;
  const lo=Math.min.apply(null,ms.map(function(m: SeasonMonth){return (uTempN((m.lo)) as number);}).concat([(uTempN((band[0])) as number)]))-3,hi=Math.max.apply(null,ms.map(function(m: SeasonMonth){return (uTempN((m.hi)) as number);}).concat([(uTempN((band[1])) as number)]))+3;
  const y=function(v: number){return 4+(1-(v-lo)/(hi-lo))*(H-8);};
  const fitCol: Record<string, string>={prime:C.green,good:C.amber,off:C.borderHi};
  const NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curM=new Date().getMonth();
  const fits=ms.map(function(m: SeasonMonth){return monthFit(m,band);});
  const prime=NAMES.filter(function(_: string,i: number){return fits[i]==="prime";}),good=NAMES.filter(function(_: string,i: number){return fits[i]==="good";});
  const move=function(e: PointerEvent<SVGSVGElement>){const r=e.currentTarget.getBoundingClientRect();if(!r.width)return;const px=(e.clientX-r.left)/r.width*W;setHv(Math.max(0,Math.min(11,Math.floor((px-L)/cw))));};
  const m=hv!=null?ms[hv]:null;
  return <div>
    {condRow("Prime months",prime.length?prime.join(", "):"None — no dry month has a morning or afternoon in your range",prime.length?C.green:C.textSub)}
    {good.length?condRow("Good months",good.join(", "),C.amber):null}
    <div style={{marginTop:8}}><svg width="100%" viewBox={"0 0 "+W+" "+(H+14)} style={{display:"block",touchAction:"pan-y"}} onPointerMove={move} onPointerDown={move} onPointerLeave={function(){setHv(null);}} role="img" aria-label={"Average high and low by month. Prime: "+(prime.join(", ")||"none")+". Good: "+(good.join(", ")||"none")+"."}>
      <rect x={L} y={y((uTempN((band[1])) as number))} width={W-L-R} height={Math.max(0,y((uTempN((band[0])) as number))-y((uTempN((band[1])) as number)))} fill={C.green} opacity={0.1}/>
      <text x={L-4} y={y((uTempN((band[1])) as number))+3} fontSize="9" fill={C.textMuted} textAnchor="end">{(uTempN((band[1])) as number)+"°"}</text><text x={L-4} y={y((uTempN((band[0])) as number))+3} fontSize="9" fill={C.textMuted} textAnchor="end">{(uTempN((band[0])) as number)+"°"}</text>
      {ms.map(function(mo: SeasonMonth,i: number){const cx=L+cw*i+cw/2,t=y((uTempN((mo.hi)) as number)),b=y((uTempN((mo.lo)) as number));return <g key={i}><rect x={cx-6} y={t} width={12} height={Math.max(2,b-t)} rx={4} fill={fitCol[fits[i] as string]} opacity={hv==null||hv===i?1:0.55}/><text x={cx} y={H+11} fontSize="9.5" fill={i===curM?C.text:C.textMuted} fontWeight={i===curM?800:400} textAnchor="middle">{NAMES[i][0]}</text></g>;})}
    </svg></div>
    <div aria-live="polite" style={{fontSize:12.5,color:C.text,minHeight:19,marginTop:4}}>{m?<span><b>{NAMES[hv as number]}</b>{" · high "+uTemp(m.hi)+", low "+uTemp(m.lo)+" · "+Math.round(m.wetDays)+" wet days · "+uPrecip(m.rain)+" rain"}</span>:<span style={{color:C.textMuted}}>Move along the chart to read a month.</span>}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",fontSize:11.5,color:C.textSub,marginTop:6}}>{[["prime","Prime"],["good","Good"],["off","Off season"]].map(function(p: string[]){return <span key={p[0]} style={{display:"inline-flex",alignItems:"center",gap:5}}><span aria-hidden="true" style={{width:9,height:9,borderRadius:3,background:fitCol[p[0]]}}/>{p[1]}</span>;})}<span>Shaded band: your ideal temperature</span></div>
    <div style={condNote}>{"Averages for "+clim.years+" at the crag — a guide to the season, not a forecast."}</div>
  </div>;
}
