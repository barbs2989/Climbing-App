import { useRef, useState, useEffect, useLayoutEffect } from "react";
import type { FocusEvent, ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import Chevron from "./Chevron.tsx";

/* A long section is CAPPED, so one section cannot take the whole screen. Every section on the
   route tabs mounts inside one of these; it measures its own content and does nothing until that
   content is taller than CAP_AT, at which point it shows the first CAP_SHOW px under a fade and a
   "Show more" control. The threshold is deliberately well above CAP_SHOW: collapsing a section to
   hide its last three lines costs a tap and saves nothing. The INNER box is what is observed —
   the outer one is the clipped one, so its height would only ever report the cap.
   Clipped content stays in the accessibility tree, so a screen reader reads all of it; a keyboard
   user who tabs onto a control below the fold opens the section rather than focusing something
   they cannot see. Collapsing again brings the section's top back into view if it scrolled off,
   or "Show less" would drop the reader somewhere in the NEXT section.
   Two ways the button could VANISH after "Show less" (reported 2026-10-07, not reproduced):
   - The scroll ran inside the click handler, BEFORE React drew the collapse, so it measured the
     expanded layout. It now runs in a layout effect AFTER the collapse is drawn, and checks that
     the BUTTON is on screen, not just the section's top.
   - The threshold had no memory. A section whose height drifts after mount (the forecast loads,
     fails or re-wraps: 628px on one load, 1680px on another) could dip under CAP_AT and take the
     button with it. Once a section has the button it KEEPS it while collapsing would still hide
     something (more than CAP_SHOW + CAP_SLACK). A 0 height is a hidden ancestor, not an empty
     section, so it is ignored.
   A section can also CROSS the cap because the climber opened something in it: ROUTE BREAKDOWN is
   short until a box is tapped, and the opened box pushed it past CAP_AT, so the section folded and
   hid the very box just opened (measured 2026-10-29 on Big Four's Tower Route, P2). A tap inside a
   section that has not folded yet marks it open, so growth the climber caused never folds on them. */
export interface CappedProps {
  /** The section; capped only once it is taller than CAP_AT. */
  children?: ReactNode;
}
const CAP_AT=620,CAP_SHOW=400,CAP_SLACK=60,NAV_CLEAR=80;/* NAV_CLEAR: the fixed bottom nav covers the last ~70px of the screen */
/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function Capped({children}: CappedProps){const outer=useRef<HTMLDivElement>(null);const inner=useRef<HTMLDivElement>(null);const btn=useRef<HTMLButtonElement>(null);const closing=useRef(false);const [tall,setTall]=useState(false);const [open,setOpen]=useState(false);
  useEffect(function(){const el=inner.current;if(!el)return;function measure(){const h=(el as HTMLDivElement).offsetHeight;/* a hoisted function does not keep the null check above */if(!h)return;setTall(function(t){return h>(t?CAP_SHOW+CAP_SLACK:CAP_AT);});}measure();if(typeof ResizeObserver==="undefined")return;const ro=new ResizeObserver(measure);ro.observe(el);return function(){ro.disconnect();};},[]);
  const shut=tall&&!open;
  function onFocusIn(e: FocusEvent<HTMLDivElement>){if(!shut||!outer.current)return;const top=outer.current.getBoundingClientRect().top;if((e.target as HTMLElement).getBoundingClientRect().bottom>top+CAP_SHOW)setOpen(true);}
  useLayoutEffect(function(){if(open||!closing.current)return;closing.current=false;const o=outer.current,b=btn.current;if(!o)return;const r=b?b.getBoundingClientRect():null;if(o.getBoundingClientRect().top<0||!r||r.top<0||r.bottom>window.innerHeight-NAV_CLEAR)o.scrollIntoView({block:"start"});},[open]);
  function toggle(){if(open){closing.current=true;setOpen(false);}else setOpen(true);}
  return <div>
    <div ref={outer} onFocus={onFocusIn} onClickCapture={function(){if(!tall&&!open)setOpen(true);}} style={{position:"relative",maxHeight:shut?CAP_SHOW:"none",overflow:shut?"hidden":"visible"}}>
      <div ref={inner}>{children}</div>
      {shut?<div aria-hidden="true" style={{position:"absolute",left:0,right:0,bottom:0,height:72,background:"linear-gradient(to bottom, transparent, "+C.bg+")",pointerEvents:"none"}}/>:null}
    </div>
    {tall?<button ref={btn} onClick={toggle} aria-expanded={open} style={{minHeight:44,display:"block",width:"100%",margin:"6px 0 14px",padding:"8px",background:"transparent",color:C.blue,border:"1px solid "+C.border,borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>{open?"Show less ":"Show more "}<Chevron inline open={open} size={14} color={C.blue}/></button>:null}
  </div>;
}
