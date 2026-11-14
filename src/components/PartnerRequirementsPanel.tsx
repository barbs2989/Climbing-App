import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { SKILLS, skillKeyOf } from "../../ClimbMatchCore.jsx";
import { requiredSkillKeys } from "../../lib/requiredSkills.js";
import type ActionIconType from "./ActionIcon.tsx";
import SkillGuideLink from "./SkillGuideLink.tsx";

export interface PartnerRequirementsPanelProps {
  route: { partnerRequirements?: { experienceLevel?: string | null; fitnessSpec?: string | Record<string, string | number> | null; requiredSkills?: string[] | null; approachTime?: string | null } | null; skills?: ReadonlyArray<string> | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** The viewer's profile skills (labels, as profiles.skills stores them). Omitted = no "Your skills" comparison. */
  mySkills?: ReadonlyArray<string> | null;
}

export default function PartnerRequirementsPanel({route, C, ActionIcon, mySkills}: PartnerRequirementsPanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.label,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = route.partnerRequirements;
  /* The required-skills prose held up against the viewer's profile (owner, 2026-11-14). The phrases stay as written
     above; this only names the profile skills they plainly ask for (lib/requiredSkills.js), plus the seed routes'
     `skills` keys, and says which are on your profile. SKILLS is read HERE, at render time, never at module scope
     (check:no-module-scope-core-reads). No `mySkills` (a guard rendering the panel bare) = no comparison. */
  const SKILL_TABLE: Record<string, { label: string }> = SKILLS;
  const keys = requiredSkillKeys(requiredSkills);
  for (const s of route.skills || []) { const k = skillKeyOf(s); if (k && !keys.includes(k)) keys.push(k); }
  const mine = new Set((mySkills || []).map(skillKeyOf).filter((k): k is string => !!k));
  const have = keys.filter(k => mine.has(k)), lack = keys.filter(k => !mine.has(k));
  const skillRow = (label: string, ks: string[], color: string) => ks.length ? <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginTop:3}}><span style={{fontWeight:700,color}}>{label}</span> {ks.map((k, i) => { const name = SKILL_TABLE[k] ? SKILL_TABLE[k].label : k; return <span key={k}>{i ? " · " : ""}<SkillGuideLink skillKey={k} label={"Guide: "+name}>{name}</SkillGuideLink></span>; })}</div> : null;
  const skillCheck = mySkills && keys.length ? <div style={{marginBottom:10}}><div style={{...LBL,marginBottom:1}}>Your skills</div>{skillRow("On your profile:", have, C.green)}{skillRow(have.length ? "Not on your profile yet:" : "None of these are on your profile yet:", lack, C.amber)}</div> : null;
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><Head C={C} style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={14} color={C.text}/>PARTNER REQUIREMENTS</span></Head>{experienceLevel?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessSpec}</div>:<div style={{fontSize:12.5,color:C.textSub}}>{Object.entries(fitnessSpec).map(([k,v])=>k+": "+v).join(" · ")}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:3}}>Required skills</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{requiredSkills.map(s=><span key={s} style={{fontSize:11.5,color:C.onSolid,background:C.blueBg,padding:"3px 8px",borderRadius:6}}>{s}</span>)}</div></div>:null}{skillCheck}{approachTime?<div><div style={{...LBL,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}
