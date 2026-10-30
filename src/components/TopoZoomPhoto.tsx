import { useState, useRef, useEffect } from "react";
import type { PointerEvent, KeyboardEvent, SyntheticEvent } from "react";
import { photoAlt } from "../../ClimbMatchCore.jsx";
import { TOPO_IMG, ZOOM_MAX, TAP_SLOP, clampTopoView, zoomTopoView } from "../../lib/topoMarks.jsx";
import MediaImg from "./MediaImg.tsx";
import TopoLineOverlay, { type TopoLine } from "./TopoLineOverlay.tsx";

export interface TopoZoomPhotoProps {
  photo: { url: string; alt?: string | null };
  /** The line drawn over the photo (the latest, or the alternative picked); none draws the photo alone. */
  active: TopoLine | null;
}
/** The frame's position and size: z is the zoom, (tx, ty) the layer's offset, W and H the frame's pixels. */
interface ZoomView { z: number; tx: number; ty: number; W: number; H: number }
interface ZoomTarget { z: number; tx: number; ty: number }
interface Pt { x: number; y: number }
/** The gesture in progress: one finger or the mouse dragging, or two fingers pinching. */
type Gesture =
  | { kind: "pinch"; d0: number; m0: Pt; base: ZoomView }
  | { kind: "drag"; sx: number; sy: number; base: ZoomView; moved: boolean };

/** THE ENLARGED TOPO ZOOMS AND PANS (owner's note, 2026-10-28: "Will uploaded topos be scrollable?").
   It used to be a still image capped at 58vh: a tall wall photo of a multi-pitch line shrank until
   the belays could not be read, and nothing let a climber look closer. Climbers complain of the
   same thing on the big sites (a ~2.5x cap, lines that vanish when the photo is enlarged, no pan),
   so this goes to the editor's 6x and keeps the line on. Pinch, ctrl/trackpad wheel, double-tap or
   − / + zoom; a drag, a wheel or the arrow keys move around once zoomed. At 1x a swipe still
   scrolls the sheet (touch-action pan-y), so the caption and key below stay reachable.
   The zoomed layer is SIZED (W*z by H*z), not CSS-scaled: the overlay's percentages land on the
   same rock at every zoom, its markers keep their size, and the strokes' non-scaling-stroke holds
   against the viewBox stretch, which it cannot do against a transform (see TopoDrawer).
 *
 * Moved verbatim from RouteDetail.jsx; only the types were added. `local` reads the frame's ref where the original did, so it throws the same TypeError before the frame has mounted.
 */
export default function TopoZoomPhoto({photo,active}: TopoZoomPhotoProps){
  const [ar,setAr]=useState<number | null>(null);
  const [view,setViewState]=useState<ZoomView>({z:1,tx:0,ty:0,W:0,H:0});
  const viewRef=useRef<ZoomView>(view);
  const vpRef=useRef<HTMLDivElement>(null);const ptrs=useRef(new Map<number,Pt>());const gest=useRef<Gesture | null>(null);const lastTap=useRef<{t:number;x:number;y:number} | null>(null);
  const dims=function(){const el=vpRef.current;return el?{W:el.clientWidth,H:el.clientHeight}:{W:1,H:1};};
  // The frame's size travels with the view, so the render never reads a ref.
  const setView=function(v: ZoomTarget){const d=dims();const n={z:v.z,tx:v.tx,ty:v.ty,W:d.W,H:d.H};viewRef.current=n;setViewState(n);};
  const fit=function(){setView({z:1,tx:0,ty:0});};
  const local=function(cx: number,cy: number){const fr=vpRef.current;if(!fr)throw new TypeError("Cannot read properties of null (reading 'getBoundingClientRect')");const r=fr.getBoundingClientRect();return {x:cx-r.left,y:cy-r.top};};
  const zoomAt=function(z: number,px: number,py: number){const d=dims();setView(zoomTopoView(viewRef.current,z,px,py,d.W,d.H));};
  const zoomBy=function(f: number){const d=dims();zoomAt(viewRef.current.z*f,d.W/2,d.H/2);};
  const panBy=function(dx: number,dy: number){const d=dims();const b=viewRef.current;setView(clampTopoView({z:b.z,tx:b.tx+dx,ty:b.ty+dy},d.W,d.H));};
  useEffect(function(){
    const el=vpRef.current;if(!el)return undefined;
    // Registered by hand: React's onWheel is passive, so it could not stop the sheet scrolling too.
    // A plain wheel at 1x is left alone, so the sheet still scrolls past the photo.
    const onWheel=function(e: WheelEvent){
      const b=viewRef.current;
      if(e.ctrlKey){e.preventDefault();const p=local(e.clientX,e.clientY);zoomAt(b.z*Math.exp(-e.deltaY*0.01),p.x,p.y);}
      else if(b.z>1){e.preventDefault();panBy(-e.deltaX,-e.deltaY);}
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    return function(){el.removeEventListener("wheel",onWheel);};
  },[]); // eslint-disable-line react-hooks/exhaustive-deps -- registered once; every helper it calls reads the view through viewRef
  const two=function(){const a=Array.from(ptrs.current.values());return {d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,m:local((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2)};};
  const onDown=function(e: PointerEvent<HTMLDivElement>){
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_e){/* capture only keeps a drag that leaves the frame */}
    if(ptrs.current.size===2){const t=two();gest.current={kind:"pinch",d0:t.d,m0:t.m,base:viewRef.current};return;}
    gest.current={kind:"drag",sx:e.clientX,sy:e.clientY,base:viewRef.current,moved:false};
  };
  const onMove=function(e: PointerEvent<HTMLDivElement>){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gest.current;if(!g)return;const d=dims();
    if(g.kind==="pinch"&&ptrs.current.size===2){const t=two();const nz=Math.min(ZOOM_MAX,Math.max(1,g.base.z*t.d/g.d0));setView(clampTopoView({z:nz,tx:t.m.x-(g.m0.x-g.base.tx)*nz/g.base.z,ty:t.m.y-(g.m0.y-g.base.ty)*nz/g.base.z},d.W,d.H));return;}
    if(g.kind==="drag"){const dx=e.clientX-g.sx,dy=e.clientY-g.sy;if(Math.hypot(dx,dy)>TAP_SLOP)g.moved=true;if(g.moved&&g.base.z>1)setView(clampTopoView({z:g.base.z,tx:g.base.tx+dx,ty:g.base.ty+dy},d.W,d.H));}
  };
  const onUp=function(e: PointerEvent<HTMLDivElement>){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.delete(e.pointerId);const g=gest.current;
    // Lifting one finger of a pinch carries on as a drag from where the other finger is.
    if(g&&g.kind==="pinch"){const r=Array.from(ptrs.current.values())[0];gest.current=r?{kind:"drag",sx:r.x,sy:r.y,base:viewRef.current,moved:true}:null;return;}
    gest.current=null;
    if(e.type!=="pointerup"||!g||g.moved)return;
    // A double tap zooms in on the spot tapped, or back out to the whole photo.
    const now=Date.now();const p=local(e.clientX,e.clientY);const lt=lastTap.current;
    if(lt&&now-lt.t<320&&Math.hypot(p.x-lt.x,p.y-lt.y)<30){lastTap.current=null;if(viewRef.current.z>1)fit();else zoomAt(2.5,p.x,p.y);}
    else lastTap.current={t:now,x:p.x,y:p.y};
  };
  const onKey=function(e: KeyboardEvent<HTMLDivElement>){
    const k=e.key;const step=48;
    if(k==="+"||k==="=")zoomBy(1.6);else if(k==="-"||k==="_")zoomBy(1/1.6);else if(k==="0")fit();
    else if(viewRef.current.z>1&&(k==="ArrowLeft"||k==="ArrowRight"||k==="ArrowUp"||k==="ArrowDown"))panBy(k==="ArrowLeft"?step:k==="ArrowRight"?-step:0,k==="ArrowUp"?step:k==="ArrowDown"?-step:0);
    else return;
    e.preventDefault();
  };
  const zoomed=view.z>1.001;
  const zb={minWidth:34,height:32,padding:"0 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.35)",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"};
  return <div style={{background:"#000",position:"relative"}}>
    <div ref={vpRef} tabIndex={0} role="group" aria-label="Topo photo. Plus and minus zoom in and out; arrow keys move around once zoomed" onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{position:"relative",overflow:"hidden",width:"100%",maxWidth:ar?"calc(58vh * "+ar+")":"100%",aspectRatio:ar?String(ar):"4 / 3",margin:"0 auto",touchAction:zoomed?"none":"pan-y",cursor:zoomed?"grab":"zoom-in",userSelect:"none",WebkitUserSelect:"none"}}>
      <div style={zoomed?{position:"absolute",left:view.tx,top:view.ty,width:view.W*view.z,height:view.H*view.z}:{position:"absolute",inset:0}}>
        <MediaImg decoding="async" draggable={false} src={photo.url} alt={photoAlt(photo.alt,"Topo photo, enlarged")} onLoad={function(e: SyntheticEvent<HTMLImageElement>){const t=e.currentTarget;if(t&&t.naturalWidth&&t.naturalHeight)setAr(t.naturalWidth/t.naturalHeight);}} style={TOPO_IMG}/>
        {active?<TopoLineOverlay points={active.points} variants={active.variants} pins={active.pins} pinSize={20} numbered/>:null}
      </div>
    </div>
    <div style={{position:"absolute",right:8,bottom:8,display:"flex",gap:6}}>
      <button onClick={function(){zoomBy(1/1.6);}} disabled={!zoomed} aria-label="Zoom out" style={Object.assign({},zb,{opacity:zoomed?1:0.45})}>−</button>
      <button onClick={function(){zoomBy(1.6);}} disabled={view.z>=ZOOM_MAX} aria-label="Zoom in" style={Object.assign({},zb,{opacity:view.z>=ZOOM_MAX?0.45:1})}>+</button>
      {/* Always drawn, disabled at 1x: if it appeared on the first zoom, + would slide left and a second tap on the same spot would hit Fit. */}
      <button onClick={fit} disabled={!zoomed} aria-label="Fit the whole photo" style={Object.assign({},zb,{opacity:zoomed?1:0.45})}>Fit</button>
    </div>
  </div>;
}
