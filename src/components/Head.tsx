

/* = core's CardHead, drawn from this file's own C prop: core imports this file, so importing
   CardHead back would be circular. Keep the two in step. */
import type { CSSProperties, ReactNode } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { FONT_DISPLAY } from "../../lib/fonts.js";

export interface HeadProps {
  C: typeof Palette;
  /** Layout only (margin). */
  style?: CSSProperties;
  children?: ReactNode;
}

export default function Head({C,style,children}: HeadProps){return <div role="heading" aria-level={2} data-card-head="" style={Object.assign({display:"flex",alignItems:"center",gap:7,minWidth:0,fontFamily:FONT_DISPLAY,fontSize:16,fontWeight:600,lineHeight:1.15,color:C.text,letterSpacing:0.7,textTransform:"uppercase"},style)}><span style={{minWidth:0}}>{children}</span></div>;}
