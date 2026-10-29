import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { clockHr, TileGrid } from "../../lib/HourTiles.jsx";
import type { PointerEvent, MouseEvent, ReactNode } from "react";

/** One forecast hour. Readings are null where the forecast did not carry them. */
export interface HourRow {
  utc: string;
  hr: number;
  past?: boolean | null;
  temp: number | null;
  feels: number | null;
  dew: number | null;
  precip: number | null;
  rh: number | null;
  pop: number | null;
  cloud: number | null;
  wind: number | null;
  gust: number | null;
  windDir: number | null;
}
/** One line on the chart: a value per hour (null = no reading). */
export interface HourSeries { name: string; vals: (number | null)[]; color: string; dash?: string }
/** Bars drawn along the bottom of the chart. */
export interface HourBars { name: string; vals: (number | null)[]; color: string }
/** The map from a value to its y position, handed to `extra`. */
export type HourY = (v: number) => number;
/** A line's label at its right-hand end. */
interface EndLabel { s: { name: string }; y: number }

export interface HourChartCardProps {
  all: HourRow[];
  /** The hour picked in the chips; the chart follows it until you drag this chart. */
  selIdx: number;
  title: string;
  series: HourSeries[];
  lo: number;
  hi: number;
  axisFmt: (v: number) => string;
  bars?: HourBars | null;
  /** Extra SVG drawn over the lines, given the y mapping. */
  extra?: ((y: HourY) => ReactNode) | null;
  /** The tiles for the hour under the cursor. */
  readout: (h: HourRow) => ReactNode;
}

/* One hourly chart, in its OWN card with its OWN scrubber: its readout (the boxes for the hour under your finger)
   sits directly ABOVE the line it describes, so dragging a chart never moves a number somewhere off screen.
   `selIdx` is the hour picked in the chips; a chart follows it until you drag that chart, and snaps back when the
   chips move.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function HourChartCard({all,selIdx,title,series,lo,hi,axisFmt,bars,extra,readout}: HourChartCardProps){
  const [hv,setHv]=useState<number|null>(null),[hf,setHf]=useState<number|null>(null);
  const [pin,setPin]=useState<number|null>(null);useEffect(function(){setPin(null);setHv(null);setHf(null);},[selIdx]);
  const downRef=useRef<{x:number;y:number;scrub:boolean}|null>(null);
  const W=340,PH=130,L=34,R=58,n=all.length,xw=(W-L-R)/(n-1),x=function(i: number){return L+i*xw;};
  const at=hv!=null&&hv<n?hv:(pin!=null&&pin<n?pin:(selIdx>=0?selIdx:0));const a=all[at];
  const fAt=function(e: PointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();if(!r.width)return null;const px=(e.clientX-r.left)/r.width*W;return Math.max(0,Math.min(n-1,(px-L)/xw));};
  const idxAt=function(e: PointerEvent<HTMLDivElement>){const f=fAt(e);return f==null?null:Math.round(f);};
  const read=function(e: PointerEvent<HTMLDivElement>){const f=fAt(e);if(f==null)return;setHf(f);setHv(Math.round(f));};
  const unread=function(){setHv(null);setHf(null);};
  /* A POINTER DOWN ONLY REMEMBERS WHERE IT STARTED. Pinning the hour there (#2357) moved the readout under every thumb
     that was only scrolling the page past a chart. A finger moving mostly up or down is a scroll (the browser takes it
     and sends pointercancel); one moving ACROSS at least 8 px scrubs; a tap (under 8 px) or a released scrub pins its
     hour. A mouse still reads by hovering. */
  /* ...AND A SCRUB HOLDS ON (owner, 2026-10-15: the wind and humidity charts "don't scroll nicely"). Once a drag is a
     scrub the pointer is CAPTURED, so it keeps reading when a finger or mouse runs off the chart's edge instead of
     dropping back to the picked hour; it starts after 6 px, not 8; the axis text can no longer be selected by the drag;
     and the readout above never SHRINKS mid-drag (a shorter tile pulled the chart up under the finger). */
  /* ...AND A PASSING THUMB NEVER READS (owner, 2026-10-21: on a phone "you can see the boxes above you as you scroll"
     and "it's sticky to scroll"). The 6 px sideways rule above still claimed every swipe that STARTED a little
     diagonal: the boxes above changed under a thumb that was only scrolling, and the page stopped moving. Safari also
     ignores touch-action on an <svg>, so the pan-y on it bound nothing there. On touch the chart now asks what the
     Stocks app asks: TOUCH AND HOLD (350 ms, finger still within 10 px) to scrub, then slide; a tap reads one hour; any
     swipe is the page's, untouched. While a hold-scrub runs the page is held still (a non-passive touchmove on the
     HTML wrapper, which also carries the touch-action). A mouse still reads by hovering and dragging. */
  /* ...AND A SIDEWAYS DRAG SCRUBS AT ONCE, WITH THE CURSOR UNDER THE FINGER (owner, 2026-10-24: the hour by hour graph
     "feels sticky when I move it left and right"). Hold-to-scrub made every plain left/right drag do NOTHING (the
     10 px rule dropped it), and once a scrub ran the cursor jumped hour to hour 120 ms behind the finger. Weather apps
     (widget weather, Magic Weather) scrub on a plain sideways drag with the marker following the finger, so: a touch
     that moves at least 8 px ACROSS and more than twice as far across as up or down scrubs straight away (the hold
     still works too). That ratio keeps the #2526 promise: a scroll that starts a little diagonal is the page's, and
     touch-action pan-y lets the browser take it (pointercancel puts the boxes back). While a finger or mouse is on the
     chart the line and dots sit exactly under it, with no glide; the boxes above read the nearest whole hour; on
     release the cursor glides onto that hour. */
  const cap=function(e: PointerEvent<HTMLDivElement>){try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){/* capture is best-effort */}};
  const holdT=useRef<ReturnType<typeof setTimeout>|null>(null),wrapRef=useRef<HTMLDivElement>(null);
  const unhold=function(){if(holdT.current){clearTimeout(holdT.current);holdT.current=null;}};
  useEffect(function(){const el=wrapRef.current;if(!el)return;const tm=function(e: TouchEvent){const d=downRef.current;if(d&&d.scrub&&e.cancelable)e.preventDefault();};el.addEventListener("touchmove",tm,{passive:false});return function(){el.removeEventListener("touchmove",tm);unhold();};},[]);
  const down=function(e: PointerEvent<HTMLDivElement>){unhold();const d={x:e.clientX,y:e.clientY,scrub:false};downRef.current=d;if(e.pointerType==="mouse"){d.scrub=true;cap(e);read(e);return;}const t=e.currentTarget,pid=e.pointerId,f0=fAt(e);holdT.current=setTimeout(function(){holdT.current=null;if(downRef.current!==d)return;d.scrub=true;try{t.setPointerCapture(pid);}catch(_){/* capture is best-effort */}if(f0!=null){setHf(f0);setHv(Math.round(f0));}try{if(navigator.vibrate)navigator.vibrate(8);}catch(_){/* capture is best-effort */}},350);};
  const move=function(e: PointerEvent<HTMLDivElement>){const d=downRef.current;if(e.pointerType==="mouse"){read(e);return;}if(!d)return;if(!d.scrub){const dx=Math.abs(e.clientX-d.x),dy=Math.abs(e.clientY-d.y);if(dx>=8&&dx>2*dy){unhold();d.scrub=true;cap(e);}else{if(dy>10){unhold();downRef.current=null;}return;}}read(e);};
  const up=function(e: PointerEvent<HTMLDivElement>){unhold();const d=downRef.current;downRef.current=null;if(!d)return;if(d.scrub||(Math.abs(e.clientX-d.x)<8&&Math.abs(e.clientY-d.y)<8)){const i=idxAt(e);if(i!=null){setPin(i);unread();}}};
  const cancel=function(){unhold();downRef.current=null;unread();};
  const readRef=useRef<HTMLDivElement>(null),readMax=useRef(0);
  useLayoutEffect(function(){readMax.current=0;if(readRef.current)readRef.current.style.minHeight="";},[all]);
  useLayoutEffect(function(){const el=readRef.current;if(!el)return;const h=el.offsetHeight;if(h>readMax.current){readMax.current=h;el.style.minHeight=h+"px";}});
  // The cursor and its dots GLIDE to the next hour rather than teleport; the values themselves stay whole hours.
  const glide=hf==null?{transition:"transform .12s ease-out"}:{};
  const cx=hf!=null?L+hf*xw:x(at);
  const vAt=function(vals: (number|null)[]){if(hf==null)return vals[at];const i0=Math.floor(hf),i1=Math.min(n-1,i0+1),v0=vals[i0],v1=vals[i1];return v0==null||v1==null?vals[at]:v0+(v1-v0)*(hf-i0);};
  const lastPast=all.reduce(function(m: number,h: HourRow,i: number){return h.past?i:m;},-1);
  const path=function(vals: (number|null)[],y: HourY){let d="",pen=false;vals.forEach(function(v: number|null,i: number){if(v==null){pen=false;return;}d+=(pen?"L":"M")+x(i).toFixed(1)+","+y(v).toFixed(1);pen=true;});return d;};
  if(hi-lo<1e-9)hi=lo+1;
  const y=function(v: number){return 8+(1-(v-lo)/(hi-lo))*(PH-16);};
  const ends=(series.map(function(s: HourSeries){let li=-1;s.vals.forEach(function(v: number|null,i: number){if(v!=null)li=i;});return li<0?null:{s:s,y:y(s.vals[li] as number)};}).filter(Boolean) as EndLabel[]).concat(bars?[{s:{name:bars.name},y:PH-8}]:[]).sort(function(p: EndLabel,q: EndLabel){return p.y-q.y;});
  for(let k=1;k<ends.length;k++)if(ends[k].y-ends[k-1].y<14)ends[k].y=ends[k-1].y+14;
  for(let k2=ends.length-1;k2>=0;k2--)ends[k2].y=Math.min(ends[k2].y,k2===ends.length-1?PH-8:ends[k2+1].y-14);
  const axis=all.map(function(h: HourRow,i: number){return h.hr%3===0?<text key={i} x={x(i)} y={PH+14} fontSize="11" fill={C.textMuted} textAnchor="middle">{h.hr===0?"12A":h.hr===12?"12P":(h.hr%12)+(h.hr<12?"A":"P")}</text>:null;});
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 12px",marginTop:12}}>
    <div style={{fontSize:14.5,fontWeight:800,color:C.text}}>{title}</div>
    <div style={{marginTop:2}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minHeight:44,marginBottom:3}}><div style={{flex:1,minWidth:0,fontSize:12.5,fontWeight:700,color:C.textSub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{clockHr(a.hr)}{a.past?<span style={{color:C.textMuted,fontWeight:600}}>{"  ·  already past"}</span>:null}</div>{at!==selIdx&&selIdx>=0?<button onClick={function(){setPin(null);setHv(null);}} style={{flexShrink:0,minHeight:44,padding:"0 12px",borderRadius:22,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{"Back to "+clockHr(all[selIdx].hr)}</button>:null}</div>
      <div ref={readRef}><TileGrid min={104}>{readout(a)}</TileGrid></div>
    </div>
    <div ref={wrapRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onPointerLeave={function(e: PointerEvent<HTMLDivElement>){if(e.pointerType==="mouse")unread();}} onContextMenu={function(e: MouseEvent<HTMLDivElement>){e.preventDefault();}} style={{marginTop:8,touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",WebkitTapHighlightColor:"transparent",cursor:"ew-resize"}}><svg width="100%" viewBox={"0 0 "+W+" "+(PH+20)} style={{display:"block"}} role="img" aria-label={title+" through the day; tap an hour, or slide along it, to read each hour"}>
      {lastPast>=0?<rect x={L} y={0} width={Math.max(0,x(lastPast)-L)} height={PH} fill={C.borderHi} opacity={0.35}/>:null}
      {lastPast>=0&&x(lastPast)-L>40?<text x={L+4} y={PH-4} fontSize="10.5" fill={C.textMuted}>already past</text>:null}
      <line x1={L} x2={W-R} y1={y(lo)} y2={y(lo)} stroke={C.borderLight}/><line x1={L} x2={W-R} y1={y(hi)} y2={y(hi)} stroke={C.borderLight}/>
      <text x={L-4} y={y(hi)+4} fontSize="11" fill={C.textMuted} textAnchor="end">{axisFmt(hi)}</text><text x={L-4} y={y(lo)+4} fontSize="11" fill={C.textMuted} textAnchor="end">{axisFmt(lo)}</text>
      {bars?bars.vals.map(function(v: number|null,i: number){if(v==null||v<=0)return null;const top=y(Math.min(hi,v)),x0=Math.max(L,x(i)-xw*0.85),x1=Math.max(L,x(i)-xw*0.15);if(x1<=x0)return null;return <rect key={i} x={x0} y={top} width={Math.max(0.8,x1-x0)} height={Math.max(0.8,y(lo)-top)} rx={2} fill={bars.color} opacity={0.65}/>;}):null}
      {series.map(function(s: HourSeries){return <path key={s.name} d={path(s.vals,y)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash||undefined} strokeLinejoin="round"/>;})}
      {extra?extra(y):null}
      <line x1={0} x2={0} y1={0} y2={PH} stroke={C.text} strokeWidth="1.25" style={Object.assign({transform:"translate("+cx.toFixed(1)+"px,0px)"},glide)}/>
      {series.map(function(s: HourSeries){const v=vAt(s.vals);return v==null?null:<circle key={s.name} cx={0} cy={0} r={4.5} fill={s.color} stroke={C.card} strokeWidth="2" style={Object.assign({transform:"translate("+cx.toFixed(1)+"px,"+y(v).toFixed(1)+"px)"},glide)}/>;})}
      {ends.map(function(e: EndLabel){return <text key={e.s.name} x={W-R+6} y={e.y+4} fontSize="11.5" fill={C.textSub}>{e.s.name}</text>;})}
      {axis}
    </svg></div>
  </div>;
}
