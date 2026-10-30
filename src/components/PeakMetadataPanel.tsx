import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface PeakMetadataPanelProps {
  route: { peakMetadata?: { county?: string | null; range?: string | null; firstAscent?: { date?: string | null; climbers?: string[] | null; notes?: string | null } | null } | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
}

export default function PeakMetadataPanel({route, C, ActionIcon}: PeakMetadataPanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  if (!route.peakMetadata) return null;
  const {county, range, firstAscent} = route.peakMetadata;
  // Only surface facts that actually have data — county in particular is populated
  // for a handful of hand-curated peaks but has no DB source for most of the catalog,
  // so a permanent "—" placeholder there was misleading rather than informative.
  // Elevation and prominence are intentionally omitted here — TechStats' "High point"
  // and "Prominence" stats right above already show the same figures for peak routes.
  const meta = [
    range ? ["Range", range] : null,
    county ? ["County", county] : null,
  ].filter(Boolean) as string[][];
  // `geology` is deliberately NOT rendered here any more — it is the "About this peak"
  // prose, and it now sits in the route's top description card so all the narrative on the
  // page is in one place. It stays destructured only so this comment has something to point
  // at; the panel is range/county/first-ascent. If you re-add it here it will render twice.
  if (!meta.length && !firstAscent) return null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}>
    <Head C={C} style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="mountain" size={14} color={C.text}/>PEAK</span></Head>
    {meta.length?<div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:firstAscent?12:0}}>{meta.map(([label,val])=><div key={label} style={{fontSize:12.5,color:C.textSub}}><span style={{color:C.textMuted}}>{label}: </span>{val}</div>)}</div>:null}
    {firstAscent?<div style={{paddingTop:meta.length?11:0,borderTop:meta.length?"1px solid "+C.borderLight:"none"}}><div style={{...LBL,marginBottom:3}}>First Ascent</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{firstAscent.date||""}{ firstAscent.date?" by ":""}{(firstAscent.climbers||[]).join(", ")}{firstAscent.notes?<div style={{marginTop:4,fontSize:12,color:C.textMuted,fontStyle:"italic"}}>{firstAscent.notes}</div>:null}</div></div>:null}
  </div>;
}
