import EmptyPanel from "./EmptyPanel.tsx";
import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface CrowdsPanelReported { value: string; n: number; of: number; when?: string | null; stale?: boolean }
export interface CrowdsPanelProps {
  route: { crowds?: { estimatePerSeason?: number | string | null; peakTraffic?: string | null; solitudeRating?: number | string | null } | null };
  /** What climbers who logged it said about the crowds; null when no report says. */
  reported?: CrowdsPanelReported | null;
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** Opens the form to add what you know; absent hides the empty-state prompt. */
  onAdd?: () => void;
}

// `reported` is what climbers who logged it said about the crowds ({value, n, of, when, stale}),
// computed in App from every trip report. It renders even where the catalog has no crowd
// estimate at all -- that is most routes, and a real party's word is the better answer anyway.
export default function CrowdsPanel({route, reported, C, ActionIcon, onAdd}: CrowdsPanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  if (!route.crowds && !reported) return onAdd ? <EmptyPanel C={C} ActionIcon={ActionIcon} icon="user" title="CROWDS & SOLITUDE" what="No crowd reports for this climb yet" cta="Add what you know" onAdd={onAdd}/> : null;
  const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds || {};
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><Head C={C} style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="user" size={14} color={C.text}/>CROWDS & SOLITUDE</span></Head>{reported?<div style={{background:reported.stale?C.amberBg:C.blueBg,border:"1px solid "+(reported.stale?C.amber+"55":C.blueDim),borderRadius:9,padding:"9px 11px",marginBottom:10}}><div style={{fontSize:11.5,fontWeight:700,color:reported.stale?C.amber:C.blue,marginBottom:2}}>{reported.stale?"Last reported by climbers":"Climbers report"}</div><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{reported.value}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{reported.n+" of "+reported.of+(reported.of===1?" report":" reports")+(reported.when?" · newest "+reported.when:"")}</div></div>:null}{estimatePerSeason?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Parties per season</div><div style={{fontSize:typeof estimatePerSeason==="number"?14:13,fontWeight:typeof estimatePerSeason==="number"?700:400,color:typeof estimatePerSeason==="number"?C.text:C.textSub,lineHeight:1.5}}>{typeof estimatePerSeason==="number"?estimatePerSeason+"+":estimatePerSeason}</div></div>:null}{peakTraffic?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Peak traffic</div><div style={{fontSize:13,color:C.textSub}}>{peakTraffic}</div></div>:null}{solitudeRating?(()=>{const _sr=Math.max(0,Math.min(5,Math.round(Number(solitudeRating))||0));return _sr?<div><div style={{...LBL,marginBottom:3}}>Solitude rating</div><div style={{fontSize:16}}>{'★'.repeat(_sr)+'☆'.repeat(5-_sr)}</div></div>:null;})():null}</div>;
}
