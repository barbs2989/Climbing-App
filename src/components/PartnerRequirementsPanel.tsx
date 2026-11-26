import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { SKILLS, skillKeyOf } from "../../ClimbMatchCore.jsx";
import { requiredSkillKeys, splitSkillList } from "../../lib/requiredSkills.js";
import type ActionIconType from "./ActionIcon.tsx";
import SkillGuideLink from "./SkillGuideLink.tsx";
import EditIconButton from "./EditIconButton.tsx";

export interface PartnerRequirementsPanelProps {
  route: { partnerRequirements?: { experienceLevel?: string | null; fitnessSpec?: string | Record<string, string | number> | null; requiredSkills?: string[] | string | null; approachTime?: string | null } | null; skills?: ReadonlyArray<string> | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** The viewer's profile skills (labels, as profiles.skills stores them). Omitted = no "Your skills" comparison. */
  mySkills?: ReadonlyArray<string> | null;
  /** Opens the route edit sheet at What a partner needs. The edit sheet offers it on every discipline (lib/fieldScope.js), so the card that shows it carries its pencil. Omitted = no pencil. */
  onEdit?: (() => void) | null;
}

/* A stored FIELD NAME is not words (owner check 2026-11-18): Baker's North Ridge printed "packWeight: 35-45 lb" in Fitness specs.
   A spec stored as fields gets one line per field under a readable label (packWeight -> Pack weight, hiking -> Hiking), and a
   camelCase label written inside a plain-text spec is turned into words the same way. */
function fieldLabel(k: string): string { const w = String(k).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase(); return w ? w.charAt(0).toUpperCase() + w.slice(1) : k; }
function fitnessText(t: string): string { return String(t).replace(/\b([a-z]+[A-Z][A-Za-z]*):/g, function (_m: string, k: string) { return fieldLabel(k) + ":"; }); }

export default function PartnerRequirementsPanel({route, C, ActionIcon, mySkills, onEdit}: PartnerRequirementsPanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.label,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  if (!route.partnerRequirements) return null;
  const {experienceLevel, fitnessSpec, approachTime} = route.partnerRequirements;
  /* A list on every stored row, a string after a climber's edit typed before the sheet split it: one reader (lib/requiredSkills.js). */
  const requiredSkills = splitSkillList(route.partnerRequirements.requiredSkills);
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
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10}}><Head C={C} style={{marginBottom:0}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="partners" size={14} color={C.text}/>PARTNER REQUIREMENTS</span></Head>{onEdit?<EditIconButton onClick={onEdit} title="Edit partner requirements"/>:null}</div>{experienceLevel?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Experience level</div><div style={{fontSize:13,color:C.textSub}}>{experienceLevel}</div></div>:null}{fitnessSpec?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:2}}>Fitness specs</div>{typeof fitnessSpec==="string"?<div style={{fontSize:13,color:C.textSub}}>{fitnessText(fitnessSpec)}</div>:<div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{Object.entries(fitnessSpec).filter(([,v])=>v!=null&&String(v).trim()!=="").map(([k,v])=><div key={k}><span style={{fontWeight:700,color:C.text}}>{fieldLabel(k)}</span>{" "+fitnessText(String(v))}</div>)}</div>}</div>:null}{requiredSkills&&requiredSkills.length?<div style={{marginBottom:10}}><div style={{...LBL,marginBottom:3}}>Required skills</div>{/* A LIST, not chips (audit 2026-11-26): 828 of the 2,145 stored phrases run past 60 characters (up to 224), so a "chip" held a wrapped sentence. One phrase per line reads as what it is. */}<ul style={{margin:0,paddingLeft:18}}>{requiredSkills.map(s=><li key={s} style={{fontSize:13,color:C.textSub,lineHeight:1.5,marginBottom:3}}>{s}</li>)}</ul></div>:null}{skillCheck}{approachTime?<div><div style={{...LBL,marginBottom:2}}>Approach time</div><div style={{fontSize:13,color:C.textSub}}>{approachTime}</div></div>:null}</div>;
}
