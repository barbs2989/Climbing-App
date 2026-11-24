import { useContext, useEffect, useId, useRef } from "react";
import { C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import { HelpFillApi } from "../../lib/helpFill.js";
import EditIconButton from "./EditIconButton.tsx";
import GapNote from "./GapNote.tsx";

export interface EmptySectionProps {
  /** The section's heading. */
  title: string;
  /** What is missing, and why it matters (see GapNote). */
  what: string;
  why?: string | null;
  cta?: string | null;
  /** Opens the editor; it also puts a pencil on the heading. */
  onFix?: (() => void) | null;
  /** The pencil's name (default the call to action). */
  editTitle?: string | null;
}

/** A route-page section with nothing in it yet. Under a HelpFillProvider (the route page) it draws nothing in place and becomes a row of the "Help fill this in" list, with the same add action (lib/helpFill.js); anywhere else it is its heading and the note saying what to add. Reads `C` at render time. */
export default function EmptySection({title,what,why,cta,onFix,editTitle}: EmptySectionProps){
  const api=useContext(HelpFillApi);const id=useId();const mark=useRef<HTMLSpanElement>(null);const fixRef=useRef(onFix);const hasFix=!!onFix;
  /* The newest onFix, read when the row's button is tapped: the caller passes a fresh closure every render, and re-registering on each would loop. */
  useEffect(function(){fixRef.current=onFix;});
  useEffect(function(){if(!api)return;api.set({id:id,title:title,what:what,why:why||null,cta:cta||null,fix:hasFix?function(){const f=fixRef.current;if(f)f();}:null,mark:mark.current});},[api,id,title,what,why,cta,hasFix]);
  useEffect(function(){if(!api)return;return function(){api.remove(id);};},[api,id]);
  if(api)return <span ref={mark} data-help-fill={title} data-help-fill-what={what} hidden/>;
  return <div style={{marginBottom:ROUTE_GAP}}><SL action={onFix?<EditIconButton onClick={onFix} title={editTitle||cta||"Add what you know"}/>:null}>{title}</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px 1px",border:`1px solid ${C.border}`}}><GapNote what={what} why={why} cta={cta} onFix={onFix}/></div></div>;}
