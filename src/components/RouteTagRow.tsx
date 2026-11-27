import { useState } from "react";
import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { routeTags } from "../../lib/routeTags.js";
import TagChip from "./TagChip.tsx";

export interface RouteTagRowProps {
  /** The route; routeTags() reads the lists it is on. */
  route: Parameters<typeof routeTags>[0];
  /** Drawn first in the same wrapping row: the header's Classic / discipline / grade pills (the chips moved into the
      header beside them, owner note 2026-11-26: "put that chip in the header"). With no tags only the lead draws. */
  lead?: ReactNode;
}

/**
 * The route's tag chips in one wrapping row, and the blurb of the one that is open beneath it. Reads `C` at render
 * time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function RouteTagRow({route,lead}: RouteTagRowProps){const tags=routeTags(route);const [open,setOpen]=useState<number|null>(null);
  if(!tags.length)return lead?<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>{lead}</div>:null;
  const shown=open!=null?tags[open]:null;
  return <div>
    <div style={{display:"flex",alignItems:"center",columnGap:lead?4:7,rowGap:0,flexWrap:"wrap"}}>{lead}{tags.map(function(t,i){return <TagChip key={t.kind+":"+t.slug} t={t} open={open===i} onToggle={function(){setOpen(open===i?null:i);}}/>;})}</div>
    {shown&&shown.blurb?<div style={{marginTop:8,background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"8px 11px",fontSize:12,color:C.textSub,lineHeight:1.5}}>{shown.blurb}</div>:null}
  </div>;}
