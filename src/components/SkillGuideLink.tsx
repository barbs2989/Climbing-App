import { useState, type CSSProperties, type ReactNode } from "react";
import SkillGuideSheet from "./SkillGuideSheet.tsx";
import { skillGuide } from "../../lib/skillGuides.js";

export interface SkillGuideLinkProps {
  /** A SKILLS key. A skill with no guide draws `children` as plain text, with nothing to tap. */
  skillKey?: string;
  /** A CHECKLISTS key: the link opens that checklist instead. */
  checklistKey?: string;
  /** The words to draw (the skill's label, or a checklist name). */
  children: ReactNode;
  /** The accessible name, e.g. "Guide: Crevasse rescue". */
  label: string;
  style?: CSSProperties;
}

/* A tappable skill name or checklist that opens its card (SkillGuideSheet). It keeps its own open state, so any
   surface that names a skill (a profile, the route's Partners panel, the Safety tab) can offer the guide without
   threading state through App. */
export default function SkillGuideLink({skillKey, checklistKey, children, label, style}: SkillGuideLinkProps){
  const [open, setOpen] = useState(false);
  if (!checklistKey && !skillGuide(skillKey)) return <span style={style}>{children}</span>;
  return <><button type="button" aria-label={label} onClick={() => setOpen(true)} style={{background:"none",border:"none",padding:0,font:"inherit",color:"inherit",textDecoration:"underline",textUnderlineOffset:2,cursor:"pointer",...style}}>{children}</button>{open ? <SkillGuideSheet skillKey={skillKey} checklistKey={checklistKey} onClose={() => setOpen(false)}/> : null}</>;
}
