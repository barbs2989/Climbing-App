

/* = core's CardHead, drawn from this file's own C prop: core imports this file, so importing
   CardHead back would be circular. Keep the two in step. */
import type { CSSProperties, ReactNode } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface HeadProps {
  C: typeof Palette;
  /** Layout only (margin). */
  style?: CSSProperties;
  children?: ReactNode;
}

export default function Head({C,style,children}: HeadProps){return <div role="heading" aria-level={2} style={Object.assign({display:"flex",alignItems:"center",gap:7,minWidth:0,fontSize:12,fontWeight:800,color:C.text,letterSpacing:0.5,textTransform:"uppercase"},style)}><span aria-hidden="true" style={{width:3,height:12,borderRadius:2,background:C.blueSolid,flexShrink:0}}/><span style={{minWidth:0}}>{children}</span></div>;}
