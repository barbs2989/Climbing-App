import { tx } from "../../lib/tapWords.js";
import { useState, useRef, useEffect } from "react";
import { useImgAspect, PIN_CATEGORIES, zoomTopoView, ZOOM_MAX, clampTopoView, TAP_SLOP, pinNums, pinLabel, TOPO_RED, TOPO_VAR, TOPO_IMG, pinColor, LOUPE_Z } from "../../lib/topoMarks.jsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { CHIP } from "../../lib/buttonStyles.js";
import { boxZoom } from "../../lib/wideLayout.js";
import { C } from "../../ClimbMatchCore.jsx";
import type { KeyboardEvent, ChangeEvent, PointerEvent } from "react";
import GradeTag from "./GradeTag.tsx";
import PinIcon from "./PinIcon.tsx";
import PinNum from "./PinNum.tsx";
import TopoSwatch from "./TopoSwatch.tsx";
import TopoLineOverlay from "./TopoLineOverlay.tsx";
import TopoStroke from "./TopoStroke.tsx";
import type { TopoPoint } from "./TopoLineOverlay.tsx";

/** A marker as the editor holds it: its note is always a string (empty until typed). */
export interface TopoDrawerPin extends TopoPoint {
  category: string;
  note: string;
}
/** What Save hands back. */
export interface TopoDrawerResult {
  points: TopoPoint[];
  variants: TopoPoint[][];
  variantLabels: string[];
  pins: TopoDrawerPin[];
  /** The line's optional name; null when left blank. */
  label: string | null;
}
/** The drawing as it first opens (a new topo passes only the photo). */
export interface TopoDrawerInitial {
  photoUrl?: string | null;
  points?: TopoPoint[] | null;
  variants?: TopoPoint[][] | null;
  variantLabels?: (string | null)[] | null;
  pins?: TopoDrawerPin[] | null;
  label?: string | null;
}
export interface TopoDrawerProps {
  initial?: TopoDrawerInitial | null;
  onCancel: () => void;
  onSubmit: (result: TopoDrawerResult) => void;
  /** Written with whether the drawing has unsaved work, so the sheet around the editor can ask before closing. */
  dirtyRef?: { current: boolean } | null;
  /** Ask with this copy on Cancel even when nothing is drawn: the photo itself was just posted, so cancelling takes it down. */
  discardAsk?: {title: string; body: string; confirmLabel: string} | null;
}
/** The handle under edit, or being dragged. */
type Handle = {kind: "point"; l: number; i: number} | {kind: "pin"; i: number};
type View = {z: number; tx: number; ty: number};
type DrawGesture = Handle | {kind: "pinch"; d0: number; m0: TopoPoint; base: View} | {kind: "tap"; sx: number; sy: number; base: View; moved: boolean} | {kind: "aim"};
/** The magnifier: the photo point under the finger, the magnified photo's size in px, which corner it sits in,
    and whether it is aiming a new point (vs. a dot being dragged) and whether the finger has left the photo. */
type Loupe = {p: TopoPoint; W: number; H: number; left: boolean; aim: boolean; off: boolean};
/* HOLD TO AIM (owner, 2026-11-14: "when you hold to see the zoom in, it adds dots. It should only put a
   dot when you release the screen or click"). A press that stays still this long opens the magnifier
   instead of waiting to be a tap; the finger then slides to aim and the point lands where it LIFTS. */
const HOLD_MS = 280;
const LOUPE_PX = 112;

/* Exported for lib/LogAscent.jsx, which lets a climber draw a topo while logging the climb (lazy import, so the
   log form does not pull this file into its chunk until the control is tapped).
   Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function TopoDrawer({initial,onCancel,onSubmit,dirtyRef,discardAsk}: TopoDrawerProps){
  // lines[0] is the route line; lines[1..] are its variations.
  const [lines,setLines]=useState<TopoPoint[][]>(function(){return [((initial&&initial.points)||[]).slice()].concat(((initial&&initial.variants)||[]).map(function(v){return v.slice();}));});
  const [act,setAct]=useState(0);         // which line a tap extends
  // varLabels[l-1] is what variation l is ("5.10a direct start"); saved as topo_lines.variant_labels (0362).
  const [varLabels,setVarLabels]=useState<string[]>(function(){return ((initial&&initial.variants)||[]).map(function(_v,i){return String(((initial&&initial.variantLabels)||[])[i]||"");});});
  const [pins,setPins]=useState<TopoDrawerPin[]>((initial&&initial.pins)||[]);const [ar,arOnLoad]=useImgAspect();
  const [mode,setMode]=useState("line");const [pinCat,setPinCat]=useState(PIN_CATEGORIES[0][0]);
  const [label,setLabel]=useState((initial&&initial.label)||"");  // optional: which line this is, when a wall holds several
  const [sel,setSel]=useState<Handle|null>(null);      // {kind:"point", l, i} | {kind:"pin", i} — the handle under edit
  const [loupe,setLoupe]=useState<Loupe|null>(null);  // while a press is aiming a point or a handle is being dragged
  const holdT=useRef<ReturnType<typeof setTimeout>|null>(null);
  const stopHold=function(){if(holdT.current){clearTimeout(holdT.current);holdT.current=null;}};
  useEffect(function(){return stopHold;},[]);
  const [kb,setKb]=useState<TopoPoint|null>(null);        // the keyboard cross {x,y}, shown while the photo has keyboard focus
  const [kbMsg,setKbMsg]=useState("");    // what the last key did, read out (aria-live) and shown
  const [view,setViewState]=useState<View>({z:1,tx:0,ty:0});
  const viewRef=useRef(view);
  const setView=function(v: View){viewRef.current=v;setViewState(v);};
  const vpRef=useRef<HTMLDivElement>(null);               // the fixed frame on screen
  const frameRef=useRef<HTMLDivElement>(null);            // the zoomed layer: the photo and everything on it
  const ptrs=useRef(new Map<number,TopoPoint>());           // pointerId -> {x,y}, for pinch
  const gest=useRef<DrawGesture|null>(null);                // {kind:"tap"|"pinch"|"point"|"pin", …}
  const focusPin=useRef<number|null>(null);            // a new Grade marker's input takes focus, to type the grade
  const photo=initial&&initial.photoUrl;
  const points=lines[0];
  /* UNSAVED WORK IS ASKED ABOUT, NOT DROPPED (topo audit, 2026-10-24). Cancel, the sheet's ✕ and a
     stray tap on the dark backdrop all threw away every point and marker without a word — minutes of
     zoomed-in placing gone to one mis-tap. The drawing as it first opened is the baseline; anything
     different is unsaved, and dirtyRef lets the sheet around the editor ask before closing too. */
  const snapNow=JSON.stringify([lines,varLabels,pins,label]);const [snap0]=useState(snapNow);const dirty=snapNow!==snap0;
  useEffect(function(){if(dirtyRef)dirtyRef.current=dirty;},[dirty,dirtyRef]);
  const cancel=function(){if(!dirty&&!discardAsk)return onCancel();askConfirm(discardAsk||{title:"Discard this drawing?",body:"The points and markers you placed are not saved.",confirmLabel:"Discard"}).then(function(ok){if(ok)onCancel();});};

  /* SCROLLING PAST THE PHOTO (owner, 2026-11-14: "difficult to navigate the page and scroll without dots
     or lines being drawn"). The photo fills most of a phone's sheet, and it used to swallow every touch
     and every wheel turn, so a climber could not scroll down to Save or the marker notes without
     drawing on it. Now, as in the topo viewer: at 1x the frame is touch-action pan-y, so a vertical
     swipe scrolls the sheet (the browser cancels the pointer and nothing is placed), and a plain wheel
     scrolls the page; ctrl/trackpad-pinch wheel zooms, and once zoomed the wheel zooms as before.
     While a press is aiming, dragging a dot or pinching, touchmove is cancelled so the sheet holds still.
     Both registered by hand: React's wheel and touch listeners are passive. */
  useEffect(function(){
    const el=vpRef.current;if(!el)return undefined;
    const onWheel=function(e: WheelEvent){
      if(!e.ctrlKey&&!e.metaKey&&viewRef.current.z<=1)return;
      e.preventDefault();
      const r=el.getBoundingClientRect();const b=viewRef.current;const q=boxZoom(el);
      const v=zoomTopoView(b,b.z*Math.exp(-e.deltaY*0.0015),(e.clientX-r.left)/q-el.clientLeft,(e.clientY-r.top)/q-el.clientTop,el.clientWidth,el.clientHeight);
      viewRef.current=v;setViewState(v);
    };
    const onTouchMove=function(e: TouchEvent){const g=gest.current;if(g&&g.kind!=="tap"&&e.cancelable)e.preventDefault();};
    el.addEventListener("wheel",onWheel,{passive:false});
    el.addEventListener("touchmove",onTouchMove,{passive:false});
    return function(){el.removeEventListener("wheel",onWheel);el.removeEventListener("touchmove",onTouchMove);};
  },[]);

  // Clamped so a drag that leaves the frame parks the handle on the edge rather than storing
  // a coordinate that is not on the photo.
  const at=function(cx: number,cy: number){
    const r=(frameRef.current as HTMLDivElement).getBoundingClientRect();
    const c=(v: number,size: number)=>Math.min(100,Math.max(0,Math.round((v/size)*1000)/10));
    return {x:c(cx-r.left,r.width),y:c(cy-r.top,r.height)};
  };
  const local=function(cx: number,cy: number){const el=vpRef.current as HTMLDivElement;const r=el.getBoundingClientRect();const q=boxZoom(el);return {x:(cx-r.left)/q-el.clientLeft,y:(cy-r.top)/q-el.clientTop};};
  const zoomBy=function(f: number){const el=vpRef.current;if(!el)return;const b=viewRef.current;setView(zoomTopoView(b,b.z*f,el.clientWidth/2,el.clientHeight/2,el.clientWidth,el.clientHeight));};
  const two=function(){const a=Array.from(ptrs.current.values());return {d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,m:local((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2)};};
  const setLine=function(l: number,fn: (q: TopoPoint[])=>TopoPoint[]){setLines(function(ls){return ls.map(function(q,qi){return qi===l?fn(q):q;});});};
  const moveTo=function(g: Handle,p: TopoPoint){
    if(g.kind==="point")setLine(g.l,function(a){return a.map(function(q,qi){return qi===g.i?{x:p.x,y:p.y}:q;});});
    else setPins(function(a){return a.map(function(q,qi){return qi===g.i?Object.assign({},q,{x:p.x,y:p.y}):q;});});
  };
  const place=function(p: TopoPoint){
    if(mode==="line"){
      const l=act<lines.length?act:0;
      setSel({kind:"point",l:l,i:lines[l].length});
      setLine(l,function(a){return a.concat([p]);});
    }else{
      if(pinCat==="grade")focusPin.current=pins.length;
      setSel({kind:"pin",i:pins.length});
      setPins(function(a){return a.concat([{x:p.x,y:p.y,category:pinCat,note:""}]);});
    }
  };
  /* THE MAGNIFIER SHOWS THE TRUTH. It used to size the photo against its own 104px circle
     (background-size 300%), so on a phone it showed the photo at about 0.9x, not 3x, and its centre
     ring sat on the point only when that point was mid-photo: at 10% across, the ring was ~20px off
     the spot the dot landed on. It now lays the photo (and the line drawn so far) out at LOUPE_Z
     times its size on screen, placed so the point under the finger is exactly under the crosshair.
     It moves to the left corner when the finger is under it. */
  const showLoupe=function(cx: number,cy: number,aim: boolean){
    const vp=vpRef.current,fr=frameRef.current;if(!vp||!fr)return;
    const r=vp.getBoundingClientRect(),f=fr.getBoundingClientRect(),q=boxZoom(vp);
    const off=cx<r.left||cx>r.right||cy<r.top||cy>r.bottom;
    const mag=viewRef.current.z>=3?2:LOUPE_Z;
    const lx=(cx-r.left)/q,ly=(cy-r.top)/q;
    setLoupe({p:at(cx,cy),W:f.width/q*mag,H:f.height/q*mag,left:lx>r.width/q-LOUPE_PX-28&&ly<LOUPE_PX+28,aim:aim,off:off});
  };
  const onDown=function(e: PointerEvent<HTMLDivElement>){
    if(!frameRef.current||!vpRef.current)return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_e){/* capture is a nicety; a pointer already gone is fine */}
    stopHold();
    if(ptrs.current.size>=2){                // a second finger: pinch, and nothing gets marked
      const t=two();gest.current={kind:"pinch",d0:t.d,m0:t.m,base:viewRef.current};setLoupe(null);
      return;
    }
    const h=e.target&&(e.target as HTMLElement).dataset&&(e.target as HTMLElement).dataset.h;   // "point:0:3" / "pin:1"
    if(h){
      const parts=h.split(":");
      if(parts[0]==="point"){gest.current={kind:"point",l:+parts[1],i:+parts[2]};setSel({kind:"point",l:+parts[1],i:+parts[2]});setAct(+parts[1]);}
      else{gest.current={kind:"pin",i:+parts[1]};setSel({kind:"pin",i:+parts[1]});}
      showLoupe(e.clientX,e.clientY,false);
      return;
    }
    gest.current={kind:"tap",sx:e.clientX,sy:e.clientY,base:viewRef.current,moved:false};
    const id=e.pointerId;
    holdT.current=setTimeout(function(){
      holdT.current=null;const g=gest.current;const p=ptrs.current.get(id);
      if(!g||g.kind!=="tap"||g.moved||!p||ptrs.current.size!==1)return;
      gest.current={kind:"aim"};showLoupe(p.x,p.y,true);
    },HOLD_MS);
  };
  const onMove=function(e: PointerEvent<HTMLDivElement>){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gest.current;const el=vpRef.current;if(!g||!el||!frameRef.current)return;
    if(g.kind==="pinch"){
      if(ptrs.current.size<2)return;
      const t=two();const b=g.base;const nz=Math.min(ZOOM_MAX,Math.max(1,b.z*t.d/g.d0));
      setView(clampTopoView({z:nz,tx:t.m.x-(g.m0.x-b.tx)*nz/b.z,ty:t.m.y-(g.m0.y-b.ty)*nz/b.z},el.clientWidth,el.clientHeight));
      return;
    }
    if(g.kind==="tap"){
      const dx=e.clientX-g.sx,dy=e.clientY-g.sy;
      if(!g.moved&&Math.hypot(dx,dy)<TAP_SLOP)return;
      g.moved=true;stopHold();
      const q=boxZoom(el);setView(clampTopoView({z:g.base.z,tx:g.base.tx+dx/q,ty:g.base.ty+dy/q},el.clientWidth,el.clientHeight));
      return;
    }
    if(g.kind==="aim"){showLoupe(e.clientX,e.clientY,true);return;}
    showLoupe(e.clientX,e.clientY,false);moveTo(g,at(e.clientX,e.clientY));
  };
  const onUp=function(e: PointerEvent<HTMLDivElement>){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.delete(e.pointerId);
    stopHold();
    const g=gest.current;
    if(g&&g.kind==="pinch"){
      // Lifting one finger of a pinch leaves a pan, never a tap: that finger never "tapped".
      if(ptrs.current.size===1){const r=Array.from(ptrs.current.values())[0];gest.current={kind:"tap",sx:r.x,sy:r.y,base:viewRef.current,moved:true};}
      else if(!ptrs.current.size)gest.current=null;
      return;
    }
    if(ptrs.current.size)return;
    gest.current=null;setLoupe(null);
    if(e.type!=="pointerup"||!g||!frameRef.current||!vpRef.current)return;
    // A quick tap places where it lands; an aimed press places where it lifts, unless it lifted off the photo (that cancels).
    if(g.kind==="tap"&&!g.moved)place(at(e.clientX,e.clientY));
    else if(g.kind==="aim"){const r=vpRef.current.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)place(at(e.clientX,e.clientY));}
  };

  const delSel=function(){
    if(!sel)return;
    if(sel.kind==="point")setLine(sel.l,function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    else setPins(function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    setSel(null);
  };
  const lineName=function(l: number){return l===0?"Route line":(lines.length>2?"Variation "+l:"Variation");};
  /* KEYBOARD DRAWING (WCAG 2.1.1). The photo used to take pointer input only, so a climber who cannot
     use a pointer could correct a line (Undo, Delete) but never draw one. The photo frame now takes
     focus: the arrow keys move a cross over the photo (Shift for bigger steps) and Enter or Space
     places a point or marker there; [ and ] select the previous or next point, the arrow keys then
     move it, Delete removes it and Escape lets it go. Each key says what it did in the line under
     the photo, which is a live region, so a screen reader hears it too. */
  const kbPos=function(){
    if(sel&&sel.kind==="point")return lines[sel.l]&&lines[sel.l][sel.i];
    if(sel&&sel.kind==="pin")return pins[sel.i];
    return kb||{x:50,y:50};
  };
  const pct=function(v: number){return Math.round(v)+"%";};
  const onKey=function(e: KeyboardEvent<HTMLDivElement>){
    const k=e.key;const step=e.shiftKey?5:1;
    const d=({ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]} as Record<string,number[]|undefined>)[k];
    if(d){
      e.preventDefault();
      const q=kbPos();if(!q)return;
      const n={x:Math.min(100,Math.max(0,Math.round((q.x+d[0])*10)/10)),y:Math.min(100,Math.max(0,Math.round((q.y+d[1])*10)/10))};
      if(sel){moveTo(sel,n);setKbMsg((sel.kind==="point"?lineName(sel.l)+", point "+(sel.i+1):"Marker "+(sel.i+1))+" moved to "+pct(n.x)+" across, "+pct(n.y)+" down.");}
      else{setKb(n);setKbMsg("Cross at "+pct(n.x)+" across, "+pct(n.y)+" down.");}
      return;
    }
    if(k==="Enter"||k===" "){
      e.preventDefault();
      if(sel){setSel(null);setKbMsg("Done moving. Arrow keys move the cross again.");return;}
      const q=kb||{x:50,y:50};place(q);
      setKbMsg(mode==="line"?("Point "+((lines[act<lines.length?act:0]||[]).length+1)+" added to the "+lineName(act<lines.length?act:0).toLowerCase()+"."):((pinText(pinCat)||"Marker")+" placed."));
      return;
    }
    if(k==="["||k==="]"){
      e.preventDefault();
      const list=mode==="line"?(lines[act]||[]):pins;if(!list.length){setKbMsg("Nothing to select yet.");return;}
      const cur=sel&&(mode==="line"?(sel.kind==="point"&&sel.l===act):sel.kind==="pin")?sel.i:(k==="]"?-1:list.length);
      const i=(cur+(k==="]"?1:-1)+list.length)%list.length;
      setSel(mode==="line"?{kind:"point",l:act,i:i}:{kind:"pin",i:i});
      setKbMsg((mode==="line"?lineName(act)+", point "+(i+1):"Marker "+(i+1))+" of "+list.length+" selected. Arrow keys move it.");
      return;
    }
    if((k==="Delete"||k==="Backspace")&&sel){e.preventDefault();delSel();setKbMsg("Deleted.");return;}
    // Escape lets go of a selection (data-keeps-escape holds the dialog's own Escape back while one is
    // held); with nothing selected it reaches the dialog, which closes as usual.
    if(k==="Escape"&&sel){e.preventDefault();setSel(null);setKbMsg("Selection cleared.");}
  };
  const sm=(on: boolean)=>({...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub});
  const btn={flex:1,padding:8,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,cursor:"pointer"};
  const nums=pinNums(pins);
  const inv="translate(-50%,-50%) scale("+(1/view.z)+")";   // handles keep their size while the photo zooms
  const handle=function(kind: "point"|"pin",l: number,i: number,x: number,y: number,col: string,cat?: string){
    const on=!!sel&&sel.kind===kind&&sel.i===i&&(kind!=="point"||(sel as Extract<Handle,{kind:"point"}>).l===l);
    if(kind==="pin"){
      if(cat==="grade")return <span key={"pin"+i} data-h={"pin:"+i} title="Grade — drag to move"
        style={{position:"absolute",left:x+"%",top:y+"%",transform:inv,lineHeight:0,cursor:"grab",touchAction:"none",padding:6}}><GradeTag text={pins[i].note||"Grade?"} size={11} on={on}/></span>;
      /* SMALL MARKER, BIG TARGET (owner, 2026-11-14: "pins are a little too large when adding topo
         photos"). Same rule as the line dots below: the icon a climber sees is 14px (18 selected) so it
         covers the bolt or ledge it marks, and the 28px transparent box around it is what a finger grabs.
         The inner icon ignores the pointer, so the handle's data-h is what onDown reads. */
      const sz=on?18:14;return <span key={"pin"+i} data-h={"pin:"+i} title={pinLabel(cat)+" — drag to move"}
      style={{position:"absolute",left:x+"%",top:y+"%",width:28,height:28,transform:inv,lineHeight:0,cursor:"grab",touchAction:"none"}}><span style={{position:"absolute",left:"50%",top:"50%",width:sz,height:sz,marginLeft:-sz/2,marginTop:-sz/2,pointerEvents:"none"}}><PinIcon cat={cat as string} size={sz} on={on}/><PinNum n={nums[i]} style={{position:"absolute",right:-9,bottom:-7,transform:"scale(0.85)"}}/></span></span>;}
    /* SMALL DOT, BIG TARGET (owner, 2026-10-23: "make the dots smaller and more precise"). The dot a
       climber sees is 7px (11 when selected, with a white ring) so it covers the hold it marks rather
       than the ledge around it; the 28px transparent box around it is what a finger grabs, so it is
       no harder to pick up. Its centre is the stored point. The inner dot ignores the pointer, so the
       handle's data-h is what onDown reads. */
    const dim=l!==act;const dd=on?11:7;
    return <span key={"pt"+l+":"+i} data-h={"point:"+l+":"+i} title={lineName(l)+", point "+(i+1)+" — drag to move"}
      style={{position:"absolute",left:x+"%",top:y+"%",width:28,height:28,marginLeft:-14,marginTop:-14,transform:"scale("+(1/view.z)+")",transformOrigin:"50% 50%",cursor:"grab",touchAction:"none"}}>
      <span style={{position:"absolute",left:"50%",top:"50%",width:dd,height:dd,marginLeft:-dd/2,marginTop:-dd/2,boxSizing:"border-box",pointerEvents:"none",
        borderRadius:"50%",background:col,opacity:dim&&!on?0.6:1,border:(on?2:1)+"px solid "+(on?C.onSolid:"rgba(0,0,0,0.85)"),
        boxShadow:on?"0 0 0 2px "+C.blue+"99":"0 0 0 1px rgba(255,255,255,0.35)"}}/>
    </span>;
  };
  const pinText=function(cat: string){return (PIN_CATEGORIES.find(function(c){return c[0]===cat;})||[])[1];};
  // A Grade marker nobody typed a grade into is dropped on save rather than stored as "?".
  const cleanPins=function(){return pins.filter(function(p){return p.category!=="grade"||(p.note||"").trim();}).map(function(p){return p.category==="grade"?Object.assign({},p,{note:p.note.trim()}):p;});};
  // A variation with fewer than two points is not a line and is dropped; its label goes with it, so the two arrays stay aligned.
  const keptVar=lines.slice(1).map(function(v,i){return {v:v,t:String(varLabels[i]||"").trim()};}).filter(function(o){return o.v.length>=2;});
  const variants=keptVar.map(function(o){return o.v;});
  const canSave=points.length>=2||variants.length>0||cleanPins().length>0;
  const lastEmpty=lines.length>1&&!lines[lines.length-1].length;
  const swatch=function(col: string,dashed: boolean){return <TopoSwatch color={col} dashed={dashed}/>;};
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:8}}>{[["line","Draw line"],["pin","Add pins"]].map(function(m){return <button key={m[0]} onClick={function(){setMode(m[0]);setSel(null);}} style={sm(mode===m[0])}>{m[1]}</button>;})}</div>
    {mode==="line"?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
      {lines.map(function(_l,l){const on=act===l;const col=l===0?TOPO_RED:TOPO_VAR;const vl=l>0?String(varLabels[l-1]||"").trim():"";return <button key={l} onClick={function(){setAct(l);setSel(null);}} aria-current={on?"true":undefined} style={{...CHIP,border:"1px solid "+(on?col:C.border),background:on?col+"22":C.surface,color:on?C.text:C.textSub,display:"inline-flex",alignItems:"center",gap:6,maxWidth:"100%"}}>{swatch(col,l>0)}<span style={{overflowWrap:"anywhere"}}>{lineName(l)+(vl?" · "+vl:"")}</span></button>;})}
      {lines.length<6?<button onClick={function(){if(lastEmpty){setAct(lines.length-1);}else{setLines(function(ls){return ls.concat([[]]);});setVarLabels(function(a){const n=a.slice();while(n.length<lines.length)n.push("");return n;});setAct(lines.length);}setSel(null);}} style={{...CHIP,border:"1px dashed "+C.border,background:C.surface,color:C.textSub}}>+ Variation</button>:null}
    </div>:null}
    {/* The caption that tells a reader what this yellow line IS. No cap: a variation's reason can take a sentence ("goes left at the roof to avoid the wet chimney — 5.10a, runout"). */}
    {(mode==="line"&&act>0)?<input aria-label={"What is "+lineName(act).toLowerCase()+"? (optional)"} value={varLabels[act-1]||""} onChange={function(e: ChangeEvent<HTMLInputElement>){const v=e.target.value;setVarLabels(function(a){const n=a.slice();while(n.length<act)n.push("");n[act-1]=v;return n;});}} placeholder="What is this variation? e.g. 5.10a direct start (optional)" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid "+TOPO_VAR+"88",background:C.card,color:C.text,fontSize:13,outline:"none",marginBottom:8}}/>:null}
    {mode==="pin"?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{PIN_CATEGORIES.map(function(c){return <button key={c[0]} onClick={function(){setPinCat(c[0]);}} aria-current={pinCat===c[0]?"true":undefined} style={{...CHIP,border:"1px solid "+(pinCat===c[0]?c[2]:C.border),background:pinCat===c[0]?c[2]+"22":C.surface,color:pinCat===c[0]?(c[0]==="grade"?C.text:c[2]):C.textSub,display:"inline-flex",alignItems:"center",gap:6}}><PinIcon cat={c[0]} size={16}/>{c[1]}</button>;})}</div>:null}
    <div style={{fontSize:11.5,color:C.textMuted,marginBottom:6,lineHeight:1.45}}>{mode==="line"?(tx("Tap the photo to add a point to the ")+(act===0?"route line (red)":"variation (yellow, dashed)")+". Drag a dot to move it."):(pinCat==="grade"?tx("Tap beside a pitch, then type its grade — e.g. 5.10-. Drag a marker to move it."):tx("Pick a marker — belay station, rappel station… — then tap where it is on the rock. Drag a marker to move it."))}</div>
    {/* The hold-to-aim gesture said out loud (owner, 2026-11-14: "make it clear they can zoom in to an exact
        point by clicking and holding"): a gesture nobody is told about is one nobody uses. */}
    <div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:C.text,background:C.blueBg+"55",border:"1px solid "+C.blueDim,borderRadius:9,padding:"7px 10px",marginBottom:8,lineHeight:1.4}}>
      <svg aria-hidden="true" viewBox="0 0 16 16" width={16} height={16} style={{flexShrink:0,marginTop:1}}><circle cx="6.5" cy="6.5" r="4.6" fill="none" stroke={C.blue} strokeWidth="1.8"/><path d="M10 10 L14.5 14.5" stroke={C.blue} strokeWidth="2" strokeLinecap="round"/><path d="M6.5 4.4 V8.6 M4.4 6.5 H8.6" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round"/></svg>
      <span><b>{tx("Press and hold")}</b>{tx(" to zoom in on an exact spot — slide to aim, then lift to place it. Lift off the photo to cancel. Swipe up or down to scroll; pinch or + to zoom the photo.")}</span>
    </div>
    <div style={{display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center",marginBottom:6}}>
      {view.z>1?<span style={{fontSize:11.5,color:C.textMuted,marginRight:"auto"}}>{(Math.round(view.z*10)/10)+"×"}</span>:null}
      <button onClick={function(){zoomBy(1/1.6);}} disabled={view.z<=1} aria-label="Zoom out" style={Object.assign(sm(false),{minWidth:34,opacity:view.z<=1?0.45:1})}>−</button>
      <button onClick={function(){zoomBy(1.6);}} disabled={view.z>=ZOOM_MAX} aria-label="Zoom in" style={Object.assign(sm(false),{minWidth:34,opacity:view.z>=ZOOM_MAX?0.45:1})}>+</button>
      <button onClick={function(){setView({z:1,tx:0,ty:0});}} disabled={view.z<=1} aria-label="Fit the whole photo" style={Object.assign(sm(false),{opacity:view.z<=1?0.45:1})}>Fit</button>
    </div>
    {/* touchAction:"none" is load-bearing: without it the browser claims the gesture for
        scrolling and pinching, and neither ever reaches these handlers on a touch screen.

        HONEST NOTE ON check:clickable: this surface used to be a <div onClick> and was counted
        in that guard's mouse-only baseline. Pointer handlers are not onClick, so the scanner no
        longer sees it and the baseline drops by one — that is the guard losing sight of a
        control, NOT the control becoming keyboard-operable. Placing points on a photo has no
        sensible key-by-key equivalent, so it stayed pointer-driven -- until 2026-10-23, when the
        accessibility audit counted it as the one thing in the app a keyboard user could not do.
        The frame now takes focus and its own keys (onKey above): a cross to place points, [ and ]
        to select one, arrows to move it. Undo last point, Delete selected, Clear all and the zoom
        buttons are real <button>s, as are the mode, line and category chips. */}
    <div ref={vpRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      tabIndex={0} role="application" aria-label={"Topo photo. "+(mode==="line"?"Drawing the "+lineName(act).toLowerCase():"Placing "+((pinText(pinCat)||"markers").toLowerCase()))} aria-describedby="topo-kb-help"
      onKeyDown={onKey} data-keeps-escape={sel?"true":undefined} onFocus={function(){if(!kb&&!sel)setKb({x:50,y:50});}} onBlur={function(){setKb(null);}}
      style={{position:"relative",width:"100%",aspectRatio:ar||"4 / 3",background:C.card,borderRadius:9,overflow:"hidden",cursor:view.z>1?"grab":"crosshair",marginBottom:9,border:"1px solid "+C.border,touchAction:view.z>1?"none":"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"}}>
      <div ref={frameRef} style={{position:"absolute",inset:0,transformOrigin:"0 0",transform:"translate("+view.tx+"px,"+view.ty+"px) scale("+view.z+")"}}>
        {photo?<img loading="lazy" decoding="async" src={photo} alt="Photo to draw the topo line on" onLoad={arOnLoad} draggable={false} style={TOPO_IMG}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.textMuted}}>{tx("Tap to place points")}</div>}
        {/* The zoom is a CSS scale on this layer, which non-scaling-stroke does not undo: divide it out so the line stays a thin line at 6x. */}<TopoLineOverlay points={points} variants={lines.slice(1)} lineW={2/view.z}/>
        {/* The line's dots are handles only on the Draw line tab: on Add pins they hid the rock a marker
            goes on and a tap meant for a marker grabbed a dot instead. The line itself stays drawn. */}
        {mode==="line"?lines.map(function(ln,l){return ln.map(function(p,i){return handle("point",l,i,p.x,p.y,l===0?TOPO_RED:TOPO_VAR);});}):null}
        {(loupe&&loupe.aim&&!loupe.off)?<span aria-hidden="true" style={{position:"absolute",left:loupe.p.x+"%",top:loupe.p.y+"%",width:22,height:22,transform:inv,pointerEvents:"none",boxSizing:"border-box",border:"2px solid #fff",borderRadius:"50%",boxShadow:"0 0 0 1.5px rgba(0,0,0,0.8)"}}/>:null}
        {kb&&!sel?<span aria-hidden="true" style={{position:"absolute",left:kb.x+"%",top:kb.y+"%",width:26,height:26,transform:inv,pointerEvents:"none",boxSizing:"border-box",border:"2px solid #fff",borderRadius:"50%",boxShadow:"0 0 0 2px rgba(0,0,0,0.75)"}}><span style={{position:"absolute",left:"50%",top:-6,bottom:-6,width:2,marginLeft:-1,background:C.onSolid}}/><span style={{position:"absolute",top:"50%",left:-6,right:-6,height:2,marginTop:-1,background:C.onSolid}}/></span>:null}
        {pins.map(function(p,i){return handle("pin",0,i,p.x,p.y,pinColor(p.category),p.category);})}
      </div>
      {(loupe&&photo)?(function(){
        const L=LOUPE_PX;const p=loupe.p;
        // The segment the lift would add: from the active line's last point to the aim.
        const al=act<lines.length?lines[act]:lines[0];const last=al[al.length-1];
        const nextSeg=(loupe.aim&&mode==="line"&&last)?[last,p]:null;
        return <div aria-hidden="true" style={{position:"absolute",top:8,[loupe.left?"left":"right"]:8,width:L,pointerEvents:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{position:"relative",width:L,height:L,borderRadius:"50%",overflow:"hidden",border:"2px solid "+(loupe.off?C.textMuted:C.blue),boxShadow:"0 6px 18px rgba(0,0,0,0.55)",background:"#000",opacity:loupe.off?0.55:1}}>
            <div style={{position:"absolute",left:L/2-p.x/100*loupe.W,top:L/2-p.y/100*loupe.H,width:loupe.W,height:loupe.H}}>
              <img src={photo} alt="" draggable={false} style={TOPO_IMG}/>
              <TopoLineOverlay points={points} variants={lines.slice(1)} pins={mode==="pin"?pins:null} pinSize={12} lineW={2}/>
              {nextSeg?<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}><TopoStroke points={nextSeg} color={act===0?TOPO_RED:TOPO_VAR} w={1.6} dashed/></svg>:null}
            </div>
            {/* A crosshair with an open centre: the exact spot stays visible, which a filled ring hid. */}
            <span style={{position:"absolute",left:L/2-1,top:L/2-15,width:2,height:9,background:"#fff",boxShadow:"0 0 0 1px rgba(0,0,0,0.7)"}}/>
            <span style={{position:"absolute",left:L/2-1,top:L/2+6,width:2,height:9,background:"#fff",boxShadow:"0 0 0 1px rgba(0,0,0,0.7)"}}/>
            <span style={{position:"absolute",top:L/2-1,left:L/2-15,height:2,width:9,background:"#fff",boxShadow:"0 0 0 1px rgba(0,0,0,0.7)"}}/>
            <span style={{position:"absolute",top:L/2-1,left:L/2+6,height:2,width:9,background:"#fff",boxShadow:"0 0 0 1px rgba(0,0,0,0.7)"}}/>
          </div>
          {loupe.aim?<span style={{fontSize:11,fontWeight:700,color:"#fff",background:"rgba(0,0,0,0.72)",borderRadius:7,padding:"2px 7px",whiteSpace:"nowrap"}}>{loupe.off?"Lift to cancel":(mode==="line"?"Lift to place point":"Lift to place marker")}</span>:null}
        </div>;
      })():null}
    </div>
    <div id="topo-kb-help" style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:4}}>Keyboard: Tab to the photo, then arrow keys move the cross (Shift for bigger steps) and Enter places a point. [ and ] select a point, the arrow keys move it, Delete removes it, Esc lets go.</div>
    <div role="status" aria-live="polite" style={{fontSize:12,color:C.textSub,minHeight:kbMsg?17:0,marginBottom:kbMsg?6:0}}>{kbMsg}</div>
    <div style={{display:"flex",gap:12,marginBottom:9}}>
      <button onClick={function(){if(mode==="line")setLine(act,function(p){return p.slice(0,-1);});else setPins(function(p){return p.slice(0,-1);});setSel(null);}} style={btn}>{mode==="line"?"Undo last point":"Undo last marker"}</button>
      <button onClick={delSel} disabled={!sel} style={Object.assign({},btn,{opacity:sel?1:0.45,cursor:sel?"pointer":"default"})}>{sel?("Delete "+(sel.kind==="point"?"point "+(sel.i+1):"marker")):"Delete selected"}</button>
      <button onClick={function(){const _clr=function(){setLines([[]]);setVarLabels([]);setAct(0);setPins([]);setSel(null);};if(!lines.some(function(l){return l.length;})&&!pins.length)return _clr();askConfirm({title:"Clear the whole topo?",body:"Every line, point and marker you have drawn is removed.",confirmLabel:"Clear all"}).then(function(ok){if(ok)_clr();});}} style={btn}>Clear all</button>
    </div>
    {pins.length?<div style={{marginBottom:9}}>{pins.map(function(pn,i){const g=pn.category==="grade";const ph=g?"Grade — e.g. 5.10-":pinText(pn.category)+" — note (optional)";return <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>{nums[i]!=null?<PinNum n={nums[i]}/>:null}<PinIcon cat={pn.category} size={18}/><input ref={function(el: HTMLInputElement|null){if(el&&focusPin.current===i){focusPin.current=null;el.focus({preventScroll:true});}}} aria-label={ph} value={pn.note} maxLength={g?14:undefined} onChange={function(e: ChangeEvent<HTMLInputElement>){const v=e.target.value;setPins(function(p){return p.map(function(x,xi){return xi===i?Object.assign({},x,{note:v}):x;});});}} onFocus={function(){setSel({kind:"pin",i:i});}} placeholder={ph} style={{flex:1,padding:"6px 9px",borderRadius:8,border:"1px solid "+((sel&&sel.kind==="pin"&&sel.i===i)?C.blue:C.border),background:C.surface,color:C.text,fontSize:12,boxSizing:"border-box",outline:"none"}}/></div>;})}</div>:null}
    {/* Two topos of one wall used to be "Latest" and "Alt 1": nothing said which drew the direct start and which the ramp. Optional, 60 characters, stored in topo_lines.label, shown on the thumbnail and as the line's chip in the viewer. */}
    {/* On the Draw line tab only (owner, 2026-11-14: "Variant line shouldn't be on pins. It should be on the
        draw line tab"): its "left-hand variation" example sat under the marker notes on Add pins. */}
    {mode==="line"?<input aria-label="Name this line (optional)" value={label} maxLength={60} onChange={function(e: ChangeEvent<HTMLInputElement>){setLabel(e.target.value);}} placeholder="Name this line (optional) — e.g. direct start, left-hand variation" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:13,outline:"none",marginBottom:10}}/>:null}
    <div style={{display:"flex",gap:12}}>
      <button onClick={cancel} style={{flex:1,padding:9,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
      <button disabled={!canSave} onClick={function(){onSubmit({points:points,variants:variants,variantLabels:keptVar.map(function(o){return o.t;}),pins:cleanPins(),label:label.trim()||null});}} style={{flex:2,padding:9,background:canSave?C.blueSolid:C.border,color:C.onSolid,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save topo</button>
    </div>
  </div>;
}
