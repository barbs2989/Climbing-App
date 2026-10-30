import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface PartnerRequirementsPanelProps {
  route: { partnerRequirements?: { experienceLevel?: string | null; fitnessSpec?: string | Record<string, string | number> | null; requiredSkills?: string[] | null; approachTime?: string | null } | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
}

export default function PartnerRequirementsPanel({route, C, ActionIcon}: PartnerRequirementsPanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><Head C={C} style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={14} color={C.text}/>PARTNER REQUIREMENTS</span></Head>{experienceLevel?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.onSolid,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{approachTime?<div><div style={{...LBL,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}
